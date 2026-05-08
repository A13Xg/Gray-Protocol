import Decimal from "break_eternity.js";
import type { GameState, ActionDefinition, ActionOutcome } from "./types";
import { GAME_CONFIG } from "./config";
import { NODE_CONFIGS, NODE_LIST, resolveNodeId } from "./content/nodes";

function buildActionDefinitions(): Record<string, ActionDefinition> {
  const entries = NODE_LIST
    .filter((node) => node.kind === "clickable" && node.enabled)
    .flatMap((node) => {
      const outputMoney = node.outputResources.money ?? new Decimal(0);
      const ids = [node.id, ...node.aliases];
      return ids.map((id) => [
        id,
        {
          id,
          name: node.name,
          description: node.description,
          path: node.path,
          generatorId: node.id,
          baseReward: outputMoney,
          reputationDelta: node.reputationEffect,
        } as ActionDefinition,
      ] as const);
    });

  return Object.fromEntries(entries) as Record<string, ActionDefinition>;
}

export const ACTION_DEFINITIONS: Record<string, ActionDefinition> = buildActionDefinitions();

function getNodeLevel(gs: GameState, nodeId: string): number {
  const node = NODE_CONFIGS[nodeId];
  if (!node) return 1;
  return gs.nodes.levels[nodeId] ?? node.upgrade.startingLevel;
}

function getLevelMultiplier(gs: GameState, nodeId: string): Decimal {
  const node = NODE_CONFIGS[nodeId];
  if (!node) return new Decimal(1);
  const level = getNodeLevel(gs, nodeId);
  const exponent = Math.max(0, level - node.upgrade.startingLevel);
  return Decimal.pow(new Decimal(1).add(node.upgrade.levelMultiplierPct.div(100)), exponent);
}

function getDefaultMultiplier(nodeId: string): Decimal {
  const node = NODE_CONFIGS[nodeId];
  if (!node) return new Decimal(1);
  return new Decimal(1).add(node.defaultMultiplierPct.div(100));
}

function resolveActionId(actionId: string): string {
  if (ACTION_DEFINITIONS[actionId]) return actionId;
  const resolvedNodeId = resolveNodeId(actionId);
  return ACTION_DEFINITIONS[resolvedNodeId] ? resolvedNodeId : actionId;
}

export function executeAction(gs: GameState, actionId: string): ActionOutcome | null {
  const resolvedId = resolveActionId(actionId);
  const action = ACTION_DEFINITIONS[resolvedId];
  if (!action) return null;

  const nodeId = action.generatorId;
  const multiplier = getLevelMultiplier(gs, nodeId).mul(getDefaultMultiplier(nodeId));
  const outputs = Object.fromEntries(
    Object.entries(NODE_CONFIGS[nodeId].outputResources).map(([resource, amount]) => [resource, amount.mul(multiplier)])
  ) as Record<string, Decimal>;

  gs.resources = {
    ...gs.resources,
    money: gs.resources.money.add(outputs.money ?? new Decimal(0)),
    reputation: gs.resources.reputation.add(action.reputationDelta),
  };

  return {
    actionId: nodeId,
    generatorId: nodeId,
    level: getNodeLevel(gs, nodeId),
    rewardApplied: outputs.money ?? new Decimal(0),
    reputationDelta: action.reputationDelta,
  };
}

export function getActionLevel(gs: GameState, actionId: string): number {
  const resolvedId = resolveActionId(actionId);
  const action = ACTION_DEFINITIONS[resolvedId];
  return action ? getNodeLevel(gs, action.generatorId) : 0;
}

export function getActionYield(gs: GameState, actionId: string): Decimal {
  const resolvedId = resolveActionId(actionId);
  const action = ACTION_DEFINITIONS[resolvedId];
  if (!action) return new Decimal(0);
  return action.baseReward.mul(getLevelMultiplier(gs, action.generatorId)).mul(getDefaultMultiplier(action.generatorId));
}

export function levelUpAction(_gs: GameState, _actionId: string): boolean {
  return false;
}

export function getReputationAlignment(rep: Decimal): "whitehat" | "greyhat" | "blackhat" {
  const { whitehatThreshold, blackhatThreshold } = GAME_CONFIG.reputation;
  if (rep.gt(whitehatThreshold)) return "whitehat";
  if (rep.lt(blackhatThreshold)) return "blackhat";
  return "greyhat";
}
