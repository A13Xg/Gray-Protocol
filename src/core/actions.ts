// src/core/actions.ts
import Decimal from "break_eternity.js";
import type { GameState, ActionDefinition, ActionOutcome } from "./types";
import { GAME_CONFIG } from "./config";

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

export function executeAction(gs: GameState, actionId: string): ActionOutcome | null {
  const def = ACTION_DEFINITIONS[actionId];
  if (!def) return null;

  gs.resources = {
    ...gs.resources,
    money: gs.resources.money.add(def.baseReward),
    reputation: gs.resources.reputation.add(def.reputationDelta),
  };

  return {
    actionId,
    rewardApplied: def.baseReward,
    reputationDelta: def.reputationDelta,
  };
}

export function getReputationAlignment(rep: Decimal): "whitehat" | "greyhat" | "blackhat" {
  const { whitehatThreshold, blackhatThreshold } = GAME_CONFIG.reputation;
  if (rep.gt(whitehatThreshold)) return "whitehat";
  if (rep.lt(blackhatThreshold)) return "blackhat";
  return "greyhat";
}
