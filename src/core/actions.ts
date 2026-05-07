import Decimal from "break_eternity.js";
import type { GameState, ActionDefinition, ActionOutcome, ManualClickAction } from "./types";
import { GAME_CONFIG } from "./config";
import { executeManualGenerator, GENERATOR_CONFIGS, upgradeGenerator, GENERATORS } from "./generators";
import { getManualClickMultiplierStack } from "./scaling";
import { NODE_LIST, resolveNodeId } from "./content/nodes";

function buildActionDefinitions(): Record<string, ActionDefinition> {
  const entries = NODE_LIST
    .filter((node) => node.kind === "clickable" && node.enabled)
    .flatMap((node) => {
      const outputMoney = node.outputResources.money ?? new Decimal(0);
      const primaryId = node.aliases[0] ?? node.id;
      const allIds = [primaryId, ...node.aliases.slice(1)];
      return allIds.map((alias) => [
        alias,
        {
          id: alias,
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

function createManualClickAction(def: ActionDefinition): ManualClickAction {
  return {
    definition: def,

    currentLevel(gs: GameState): number {
      return GENERATORS[def.generatorId]?.currentLevel(gs) ?? GENERATOR_CONFIGS[def.generatorId]?.level ?? 1;
    },

    getYield(gs: GameState): Decimal {
      const config = GENERATOR_CONFIGS[def.generatorId];
      if (!config) return def.baseReward;
      const stack = getManualClickMultiplierStack(gs, config);
      return def.baseReward.mul(stack.total);
    },

    execute(gs: GameState): ActionOutcome | null {
      const result = executeManualGenerator(gs, def.generatorId);
      if (!result) return null;

      return {
        actionId: def.id,
        generatorId: def.generatorId,
        level: this.currentLevel(gs),
        rewardApplied: result.outputs.money ?? new Decimal(0),
        reputationDelta: result.reputationDelta ?? new Decimal(0),
      };
    },

    levelUp(gs: GameState): boolean {
      return upgradeGenerator(gs, def.generatorId);
    },
  };
}

export const MANUAL_CLICK_ACTIONS: Record<string, ManualClickAction> = Object.fromEntries(
  Object.values(ACTION_DEFINITIONS).map((def) => [def.id, createManualClickAction(def)])
) as Record<string, ManualClickAction>;

function resolveActionId(actionId: string): string {
  const resolvedNodeId = resolveNodeId(actionId);
  if (ACTION_DEFINITIONS[actionId]) return actionId;
  if (!GENERATOR_CONFIGS[resolvedNodeId]) return actionId;
  const fromNode = Object.values(ACTION_DEFINITIONS).find((a) => a.generatorId === resolvedNodeId);
  return fromNode?.id ?? actionId;
}

export function executeAction(gs: GameState, actionId: string): ActionOutcome | null {
  const resolvedId = resolveActionId(actionId);
  const action = MANUAL_CLICK_ACTIONS[resolvedId];
  if (!action) return null;
  return action.execute(gs);
}

export function getActionLevel(gs: GameState, actionId: string): number {
  const resolvedId = resolveActionId(actionId);
  return MANUAL_CLICK_ACTIONS[resolvedId]?.currentLevel(gs) ?? 0;
}

export function getActionYield(gs: GameState, actionId: string): Decimal {
  const resolvedId = resolveActionId(actionId);
  return MANUAL_CLICK_ACTIONS[resolvedId]?.getYield(gs) ?? new Decimal(0);
}

export function levelUpAction(gs: GameState, actionId: string): boolean {
  const resolvedId = resolveActionId(actionId);
  return MANUAL_CLICK_ACTIONS[resolvedId]?.levelUp(gs) ?? false;
}

export function getReputationAlignment(rep: Decimal): "whitehat" | "greyhat" | "blackhat" {
  const { whitehatThreshold, blackhatThreshold } = GAME_CONFIG.reputation;
  if (rep.gt(whitehatThreshold)) return "whitehat";
  if (rep.lt(blackhatThreshold)) return "blackhat";
  return "greyhat";
}
