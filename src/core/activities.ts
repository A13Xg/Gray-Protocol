// src/core/activities.ts
import Decimal from "break_eternity.js";
import type {
  ActivityDefinition,
  GameState,
  ResourceDelta,
} from "./types";
import { GAME_CONFIG } from "./config";
import { canAccessReputationGate } from "./reputation";
import { scaleExponential, scaleLinear, applyMultiplier } from "./math";
import { createEmptyResourceMap } from "./resources";

export const ACTIVITY_DEFINITIONS: Record<string, ActivityDefinition> = {
  basicCryptoMining: {
    id: "basicCryptoMining",
    name: "Basic Crypto Mining",
    path: "shared",
    description: "Mine cryptocurrency using available compute power.",
    baseCost: GAME_CONFIG.activities.basicCryptoMining.baseCost,
    baseYieldPerSecond: GAME_CONFIG.activities.basicCryptoMining.baseYieldPerSecond,
    levelCostScaling: GAME_CONFIG.activities.basicCryptoMining.levelCostScaling,
    yieldScaling: GAME_CONFIG.activities.basicCryptoMining.yieldScaling,
    maxLevel: GAME_CONFIG.activities.basicCryptoMining.maxLevel,
    usesComputeAllocation: true,
  },
  bugBountyHunting: {
    id: "bugBountyHunting",
    name: "Bug Bounty Hunting",
    path: "whitehat",
    description: "Find vulnerabilities ethically for bounties and positive reputation.",
    baseCost: GAME_CONFIG.activities.bugBountyHunting.baseCost,
    baseYieldPerSecond: GAME_CONFIG.activities.bugBountyHunting.baseYieldPerSecond,
    levelCostScaling: GAME_CONFIG.activities.bugBountyHunting.levelCostScaling,
    yieldScaling: GAME_CONFIG.activities.bugBountyHunting.yieldScaling,
    maxLevel: GAME_CONFIG.activities.bugBountyHunting.maxLevel,
    reputationGate: GAME_CONFIG.activities.bugBountyHunting.reputationGate,
    usesComputeAllocation: false,
  },
  passwordCracking: {
    id: "passwordCracking",
    name: "Password Cracking",
    path: "blackhat",
    description: "Crack passwords for profit at the cost of reputation.",
    baseCost: GAME_CONFIG.activities.passwordCracking.baseCost,
    baseYieldPerSecond: GAME_CONFIG.activities.passwordCracking.baseYieldPerSecond,
    consumesPerSecond: GAME_CONFIG.activities.passwordCracking.consumesPerSecond,
    levelCostScaling: GAME_CONFIG.activities.passwordCracking.levelCostScaling,
    yieldScaling: GAME_CONFIG.activities.passwordCracking.yieldScaling,
    maxLevel: GAME_CONFIG.activities.passwordCracking.maxLevel,
    reputationGate: GAME_CONFIG.activities.passwordCracking.reputationGate,
    usesComputeAllocation: true,
  },
};

export function getActivityLevelCost(activityId: string, currentLevel: number): Partial<Record<string, Decimal>> {
  const def = ACTIVITY_DEFINITIONS[activityId];
  if (!def) return {};
  const cfgActivity = (GAME_CONFIG.activities as Record<string, { costScalingRate: Decimal }>)[activityId];
  const scalingRate = cfgActivity?.costScalingRate ?? new Decimal(1.15);

  const result: Partial<Record<string, Decimal>> = {};
  for (const [key, base] of Object.entries(def.baseCost)) {
    if (base === undefined) continue;
    if (def.levelCostScaling === "exponential") {
      result[key] = scaleExponential(base, currentLevel, scalingRate);
    } else {
      result[key] = scaleLinear(base, currentLevel, scalingRate);
    }
  }
  return result;
}

export function getActivityYieldPerSecond(
  activityId: string,
  level: number,
  computeAllocated: Decimal,
  researchMultipliers: Record<string, Decimal>
): Partial<Record<string, Decimal>> {
  const def = ACTIVITY_DEFINITIONS[activityId];
  if (!def) return {};
  const cfgActivity = (GAME_CONFIG.activities as Record<string, { yieldScalingRate: Decimal }>)[activityId];
  const scalingRate = cfgActivity?.yieldScalingRate ?? new Decimal(0.1);

  const levelMult = def.yieldScaling === "linear"
    ? scaleLinear(new Decimal(1), level, scalingRate)
    : scaleExponential(new Decimal(1), level, scalingRate);

  const computeMult = def.usesComputeAllocation && computeAllocated.gt(0)
    ? computeAllocated.add(1)
    : new Decimal(1);

  const researchMult = researchMultipliers[activityId] ?? new Decimal(1);

  const result: Partial<Record<string, Decimal>> = {};
  for (const [key, base] of Object.entries(def.baseYieldPerSecond)) {
    if (base === undefined) continue;
    result[key] = applyMultiplier(applyMultiplier(applyMultiplier(base, levelMult), computeMult), researchMult);
  }
  return result;
}

export function isActivityUnlocked(state: GameState, activityId: string): boolean {
  const def = ACTIVITY_DEFINITIONS[activityId];
  if (!def) return false;
  if (def.reputationGate) {
    if (!canAccessReputationGate(state.resources.reputationStanding, def.reputationGate)) return false;
  }
  if (def.unlockRequirements) {
    for (const req of def.unlockRequirements) {
      if (!state.research.completed.has(req)) return false;
    }
  }
  return true;
}

export function calculateActivityDelta(
  state: GameState,
  activityId: string,
  deltaSeconds: number,
  researchMultipliers: Record<string, Decimal>
): ResourceDelta {
  const emptyYields = createEmptyResourceMap();
  const emptyCosts = createEmptyResourceMap();
  const noOp: ResourceDelta = { yields: emptyYields, costs: emptyCosts };

  const actState = state.activities[activityId];
  const def = ACTIVITY_DEFINITIONS[activityId];
  if (!actState || !def || !actState.active || actState.level <= 0) return noOp;
  if (!isActivityUnlocked(state, activityId)) return noOp;

  const computeAllocated = state.allocations.computePowerByActivityId[activityId] ?? new Decimal(0);
  const yieldPerSec = getActivityYieldPerSecond(activityId, actState.level, computeAllocated, researchMultipliers);

  const yields = { ...emptyYields };
  for (const [key, rate] of Object.entries(yieldPerSec)) {
    if (rate === undefined) continue;
    const rk = key as keyof typeof yields;
    yields[rk] = yields[rk].add(rate.mul(deltaSeconds));
  }

  const costs = { ...emptyCosts };
  if (def.consumesPerSecond) {
    for (const [key, rate] of Object.entries(def.consumesPerSecond)) {
      if (rate === undefined) continue;
      const rk = key as keyof typeof costs;
      costs[rk] = costs[rk].add(new Decimal(rate).mul(deltaSeconds));
    }
  }

  return { yields, costs };
}
