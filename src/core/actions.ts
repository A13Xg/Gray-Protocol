// src/core/actions.ts
import Decimal from "break_eternity.js";
import type { GameState, ActionDefinition, ActionOutcome, ManualClickAction } from "./types";
import { GAME_CONFIG } from "./config";
import { executeManualGenerator } from "./generators";
import { GENERATOR_CONFIGS } from "./content/generators";
import { upgradeGenerator, GENERATORS } from "./generators";
import { getManualClickMultiplierStack } from "./scaling";

export const ACTION_DEFINITIONS: Record<string, ActionDefinition> = {
  hardenComputer: {
    id: "hardenComputer",
    name: "Harden Computer",
    description: "Secure a computer for a client. Earn money and improve reputation.",
    path: "whitehat",
    generatorId: "hardenDevice",
    baseReward: new Decimal(GAME_CONFIG.actions.hardenComputer.baseReward),
    reputationDelta: new Decimal(GAME_CONFIG.actions.hardenComputer.reputationDelta),
  },
  hackComputer: {
    id: "hackComputer",
    name: "Hack Computer",
    description: "Hack a computer for quick cash at the cost of reputation.",
    path: "blackhat",
    generatorId: "hackDevice",
    baseReward: new Decimal(GAME_CONFIG.actions.hackComputer.baseReward),
    reputationDelta: new Decimal(GAME_CONFIG.actions.hackComputer.reputationDelta),
  },
};

const ACTION_ALIASES: Record<string, string> = {
  pentestSystem: "hardenComputer",
  exploitSystem: "hackComputer",
};

function resolveActionId(actionId: string): string {
  return ACTION_ALIASES[actionId] ?? actionId;
}

function createManualClickAction(def: ActionDefinition): ManualClickAction {
  return {
    definition: def,

    currentLevel(gs: GameState): number {
      return GENERATORS[def.generatorId]?.currentLevel(gs) ?? GENERATOR_CONFIGS[def.generatorId]?.level ?? 1;
    },

    getYield(gs: GameState): Decimal {
      const config = GENERATOR_CONFIGS[def.generatorId];
      if (!config) return def.baseReward;
      // Uses manual-only stack so current behavior is base x level while
      // preserving extension points for later progression systems.
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
