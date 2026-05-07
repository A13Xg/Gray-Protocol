import Decimal from "break_eternity.js";
import { GAME_CONFIG } from "./config";
import { createInitialResourceMap } from "./resources";
import type { GameState, ResourceKey, ResourceMap } from "./types";
import { resetRunTalents } from "./upgrades";
import { nowMs } from "./clock";

export function getPrestigeRequirement(level: Decimal): Decimal {
  const base = GAME_CONFIG.prestige.eligibility.baseRequirement;
  const growth = GAME_CONFIG.prestige.eligibility.growth;
  return base.mul(Decimal.pow(growth, level));
}

export function canPrestige(gs: GameState): boolean {
  const tracked = GAME_CONFIG.prestige.eligibility.trackedResource as ResourceKey;
  const requirement = getPrestigeRequirement(gs.prestige.level);
  return gs.prestige.cumulativeResources[tracked].gte(requirement);
}

export function calculatePrestigeMultiplier(level: Decimal): Decimal {
  const { mode, base, perLevel } = GAME_CONFIG.prestige.multiplier;
  if (mode === "additive") {
    return base.add(perLevel.mul(level));
  }
  return base.mul(Decimal.pow(new Decimal(1).add(perLevel), level));
}

function resetForNewRun(gs: GameState): void {
  gs.resources = createInitialResourceMap();
  gs.generators = {
    levels: {},
    timedProgress: {},
    passiveRemainderMs: {},
    timedAutoRunById: {},
    passiveEnabledById: {},
  };
  resetRunTalents(gs);
  gs.timestamps.createdAt = nowMs();
  gs.timestamps.lastTickAt = gs.timestamps.createdAt;
}

export function applyPrestige(gs: GameState): boolean {
  if (!canPrestige(gs)) return false;

  const nextLevel = gs.prestige.level.add(1);
  gs.prestige.level = nextLevel;
  gs.prestige.multiplier = calculatePrestigeMultiplier(nextLevel);

  resetForNewRun(gs);
  return true;
}

export function createInitialCumulativeResources(): ResourceMap {
  return {
    money: new Decimal(0),
    crypto: new Decimal(0),
    compute: new Decimal(0),
    reputation: new Decimal(0),
  };
}
