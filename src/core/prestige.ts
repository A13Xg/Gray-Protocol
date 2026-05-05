// src/core/prestige.ts
import Decimal from "break_eternity.js";
import type { PrestigeLayerDefinition, PrestigeLayerState, GameState } from "./types";
import { GAME_CONFIG } from "./config";
import { canAffordResources, createInitialResourceMap } from "./resources";

export const PRESTIGE_DEFINITIONS: Record<string, PrestigeLayerDefinition> = {
  protocolReset: {
    id: "protocolReset",
    name: "Protocol Reset",
    description: "Wipe your progress and restart with improved starting compute power.",
    requirement: GAME_CONFIG.prestige.protocolReset.requirement,
    resetsResources: [...GAME_CONFIG.prestige.protocolReset.resetsResources],
    preservesResearch: GAME_CONFIG.prestige.protocolReset.preservesResearch,
    rewardResource: GAME_CONFIG.prestige.protocolReset.rewardResource,
    rewardAmount: GAME_CONFIG.prestige.protocolReset.rewardAmount,
  },
};

export function canPrestige(state: GameState, layerId: string): boolean {
  const def = PRESTIGE_DEFINITIONS[layerId];
  if (!def) return false;
  return canAffordResources(state.resources, def.requirement);
}

export function previewPrestigeGain(state: GameState, layerId: string): Decimal {
  const def = PRESTIGE_DEFINITIONS[layerId];
  if (!def) return new Decimal(0);
  const existing = state.prestige.layers[layerId];
  const times = existing ? existing.timesCompleted + 1 : 1;
  return def.rewardAmount.mul(times);
}

export function performPrestige(state: GameState, layerId: string): boolean {
  if (!canPrestige(state, layerId)) return false;
  const def = PRESTIGE_DEFINITIONS[layerId];
  const reward = previewPrestigeGain(state, layerId);

  // Reset resources
  const fresh = createInitialResourceMap();
  for (const key of def.resetsResources) {
    state.resources[key] = fresh[key];
  }

  // Award reward
  state.resources[def.rewardResource] = state.resources[def.rewardResource].add(reward);

  // Reset research if not preserved
  if (!def.preservesResearch) {
    state.research.completed.clear();
  }

  // Reset activities
  for (const actId of Object.keys(state.activities)) {
    state.activities[actId].level = 0;
    state.activities[actId].active = false;
    state.activities[actId].unlocked = false;
  }

  // Update prestige layer state
  if (!state.prestige.layers[layerId]) {
    state.prestige.layers[layerId] = {
      id: layerId,
      timesCompleted: 0,
      totalRewardsEarned: new Decimal(0),
    } as PrestigeLayerState;
  }
  state.prestige.layers[layerId].timesCompleted++;
  state.prestige.layers[layerId].totalRewardsEarned =
    state.prestige.layers[layerId].totalRewardsEarned.add(reward);

  return true;
}
