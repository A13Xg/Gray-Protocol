import Decimal from "break_eternity.js";
import type { ActivityDefinition, ActivityState, GameState, ResourceDelta, ResourceKey } from "./types";
import { GAME_CONFIG } from "./config";
import { canAccessReputationGate } from "./reputation";
import { applyMultiplier, scaleExponential, scaleLinear } from "./math";
import { applyResourceCost, canAffordResources, createEmptyResourceMap } from "./resources";

export const ACTIVITY_DEFINITIONS: Record<string, ActivityDefinition> = {
  basicCryptoMining: {
    id: "basicCryptoMining",
    name: "Basic Crypto Mining",
    path: "shared",
    description: "Mine cryptocurrency using allocated compute.",
    baseCost: GAME_CONFIG.activities.basicCryptoMining.baseCost,
    baseYieldPerSecond: GAME_CONFIG.activities.basicCryptoMining.baseYieldPerSecond,
    costScalingRate: GAME_CONFIG.activities.basicCryptoMining.costScalingRate,
    yieldScalingRate: GAME_CONFIG.activities.basicCryptoMining.yieldScalingRate,
    levelCostScaling: GAME_CONFIG.activities.basicCryptoMining.levelCostScaling,
    yieldScaling: GAME_CONFIG.activities.basicCryptoMining.yieldScaling,
    maxLevel: GAME_CONFIG.activities.basicCryptoMining.maxLevel,
    usesComputeAllocation: true,
  },
  bugBountyHunting: {
    id: "bugBountyHunting",
    name: "Bug Bounty Hunting",
    path: "whitehat",
    description: "Earn money and trust through responsible security work.",
    baseCost: GAME_CONFIG.activities.bugBountyHunting.baseCost,
    baseYieldPerSecond: GAME_CONFIG.activities.bugBountyHunting.baseYieldPerSecond,
    costScalingRate: GAME_CONFIG.activities.bugBountyHunting.costScalingRate,
    yieldScalingRate: GAME_CONFIG.activities.bugBountyHunting.yieldScalingRate,
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
    description: "Extract value from compromised targets while harming reputation.",
    baseCost: GAME_CONFIG.activities.passwordCracking.baseCost,
    baseYieldPerSecond: GAME_CONFIG.activities.passwordCracking.baseYieldPerSecond,
    consumesPerSecond: GAME_CONFIG.activities.passwordCracking.consumesPerSecond,
    costScalingRate: GAME_CONFIG.activities.passwordCracking.costScalingRate,
    yieldScalingRate: GAME_CONFIG.activities.passwordCracking.yieldScalingRate,
    levelCostScaling: GAME_CONFIG.activities.passwordCracking.levelCostScaling,
    yieldScaling: GAME_CONFIG.activities.passwordCracking.yieldScaling,
    maxLevel: GAME_CONFIG.activities.passwordCracking.maxLevel,
    reputationGate: GAME_CONFIG.activities.passwordCracking.reputationGate,
    usesComputeAllocation: true,
  },
};

export function getActivityDefinition(activityId: string): ActivityDefinition | undefined {
  return ACTIVITY_DEFINITIONS[activityId];
}

export function getActivityState(state: GameState, activityId: string): ActivityState | undefined {
  return state.activities[activityId];
}

export function getActivityLevelCost(activityId: string, currentLevel: number): Partial<Record<ResourceKey, Decimal>> {
  const def = getActivityDefinition(activityId);
  if (!def) return {};

  const result: Partial<Record<ResourceKey, Decimal>> = {};
  for (const [key, base] of Object.entries(def.baseCost) as Array<[ResourceKey, Decimal]>) {
    result[key] =
      def.levelCostScaling === "exponential"
        ? scaleExponential(base, currentLevel, def.costScalingRate)
        : scaleLinear(base, currentLevel, def.costScalingRate);
  }
  return result;
}

export function canUnlockActivity(state: GameState, activityId: string): boolean {
  const def = getActivityDefinition(activityId);
  if (!def) return false;

  if (def.reputationGate && !canAccessReputationGate(state.resources.reputation, def.reputationGate)) {
    return false;
  }

  if (def.unlockRequirements) {
    for (const requirement of def.unlockRequirements) {
      if (!state.research.completed.has(requirement)) return false;
    }
  }

  return true;
}

export function canAffordActivityLevel(state: GameState, activityId: string): boolean {
  const activity = getActivityState(state, activityId);
  const def = getActivityDefinition(activityId);
  if (!activity || !def) return false;
  if (activity.level >= def.maxLevel) return false;

  const levelCost = getActivityLevelCost(activityId, activity.level);
  return canAffordResources(state.resources, levelCost);
}

export function purchaseActivityLevel(state: GameState, activityId: string): boolean {
  const activity = getActivityState(state, activityId);
  if (!activity) return false;
  if (!canUnlockActivity(state, activityId)) return false;
  if (!canAffordActivityLevel(state, activityId)) return false;

  const levelCost = getActivityLevelCost(activityId, activity.level);
  state.resources = applyResourceCost(state.resources, levelCost);
  activity.unlocked = true;
  activity.level += 1;
  return true;
}

export function calculateActivityYield(
  state: GameState,
  activityId: string,
  deltaSeconds: Decimal,
  researchMultipliers: Record<string, Decimal>,
  computeEfficiencyMultiplier: Decimal
): Partial<Record<ResourceKey, Decimal>> {
  const activity = getActivityState(state, activityId);
  const def = getActivityDefinition(activityId);
  if (!activity || !def || activity.level <= 0 || !activity.active) return {};

  const levelMultiplier =
    def.yieldScaling === "exponential"
      ? scaleExponential(1, activity.level, def.yieldScalingRate)
      : scaleLinear(1, activity.level, def.yieldScalingRate);

  const allocatedCompute = state.allocations.computeByActivityId[activityId] ?? new Decimal(0);
  const computeMultiplier = def.usesComputeAllocation
    ? Decimal.max(new Decimal(0), allocatedCompute.mul(computeEfficiencyMultiplier).add(1))
    : new Decimal(1);
  const researchMultiplier = researchMultipliers[activityId] ?? new Decimal(1);

  const yields: Partial<Record<ResourceKey, Decimal>> = {};
  for (const [key, baseRate] of Object.entries(def.baseYieldPerSecond) as Array<[ResourceKey, Decimal]>) {
    const perSecond = applyMultiplier(applyMultiplier(applyMultiplier(baseRate, levelMultiplier), computeMultiplier), researchMultiplier);
    yields[key] = perSecond.mul(deltaSeconds);
  }

  return yields;
}

export function calculateActivityDelta(
  state: GameState,
  activityId: string,
  deltaSeconds: Decimal,
  researchMultipliers: Record<string, Decimal>,
  computeEfficiencyMultiplier: Decimal
): ResourceDelta {
  const yields = createEmptyResourceMap();
  const costs = createEmptyResourceMap();

  const activity = getActivityState(state, activityId);
  const def = getActivityDefinition(activityId);
  if (!activity || !def || !activity.active || activity.level <= 0) return { yields, costs };
  if (!canUnlockActivity(state, activityId)) return { yields, costs };

  const calculatedYield = calculateActivityYield(
    state,
    activityId,
    deltaSeconds,
    researchMultipliers,
    computeEfficiencyMultiplier
  );
  for (const [key, value] of Object.entries(calculatedYield) as Array<[ResourceKey, Decimal]>) {
    yields[key] = yields[key].add(value);
  }

  if (def.consumesPerSecond) {
    for (const [key, value] of Object.entries(def.consumesPerSecond) as Array<[ResourceKey, Decimal]>) {
      costs[key] = costs[key].add(value.mul(deltaSeconds));
    }
  }

  return { yields, costs };
}

export function getActiveActivityDeltas(
  state: GameState,
  deltaSeconds: Decimal,
  researchMultipliers: Record<string, Decimal>,
  computeEfficiencyMultiplier: Decimal
): Record<string, ResourceDelta> {
  const deltas: Record<string, ResourceDelta> = {};
  for (const activityId of Object.keys(state.activities)) {
    deltas[activityId] = calculateActivityDelta(
      state,
      activityId,
      deltaSeconds,
      researchMultipliers,
      computeEfficiencyMultiplier
    );
  }
  return deltas;
}
