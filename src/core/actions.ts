// src/core/actions.ts
import Decimal from "break_eternity.js";
import type { GameState, ActionDefinition, ActionOutcome } from "./types";
import { GAME_CONFIG } from "./config";
import { executeManualGenerator } from "./generators";

export const ACTION_DEFINITIONS: Record<string, ActionDefinition> = {
  pentestSystem: {
    id: "pentestSystem",
    name: "Pentest System",
    description: "Probe a target for vulnerabilities. Earns money and improves reputation.",
    path: "whitehat",
    baseReward: new Decimal(GAME_CONFIG.actions.pentestSystem.baseReward),
    reputationDelta: new Decimal(GAME_CONFIG.actions.pentestSystem.reputationDelta),
  },
  exploitSystem: {
    id: "exploitSystem",
    name: "Exploit System",
    description: "Exploit a target for quick money at the cost of reputation.",
    path: "blackhat",
    baseReward: new Decimal(GAME_CONFIG.actions.exploitSystem.baseReward),
    reputationDelta: new Decimal(GAME_CONFIG.actions.exploitSystem.reputationDelta),
  },
};

const ACTION_TO_GENERATOR_ID: Record<string, string> = {
  pentestSystem: "hardenDevice",
  exploitSystem: "hackDevice",
};

export function executeAction(gs: GameState, actionId: string): ActionOutcome | null {
  const def = ACTION_DEFINITIONS[actionId];
  if (!def) return null;

  const generatorId = ACTION_TO_GENERATOR_ID[actionId];
  if (!generatorId) return null;
  const result = executeManualGenerator(gs, generatorId);
  if (!result) return null;

  const reward = result.outputs.money ?? new Decimal(0);
  const reputationDelta = result.reputationDelta ?? new Decimal(0);

  return {
    actionId,
    rewardApplied: reward,
    reputationDelta,
  };
}

export function getReputationAlignment(rep: Decimal): "whitehat" | "greyhat" | "blackhat" {
  const { whitehatThreshold, blackhatThreshold } = GAME_CONFIG.reputation;
  if (rep.gt(whitehatThreshold)) return "whitehat";
  if (rep.lt(blackhatThreshold)) return "blackhat";
  return "greyhat";
}
