import Decimal from "break_eternity.js";
import type { ActivityDefinition, ActivityState, GameState, ResourceDelta, ResourceKey } from "./types";
import { GAME_CONFIG } from "./config";
import { applyReputationEffects, canAccessReputationGate } from "./reputation";
import { applyMultiplier, scaleExponential, scaleLinear } from "./math";
import { applyResourceCost, canAffordResources, createEmptyResourceMap } from "./resources";
import { getResearchReputationMultipliers, getResearchResourceYieldMultipliers, isActivityUnlockedByResearch } from "./research";
import { meetsActionUnlockRequirements } from "./actions";

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
  computeLeasing: {
    id: "computeLeasing",
    name: "Compute Leasing",
    path: "shared",
    description: "Lease allocated compute cycles to external clients for steady money income.",
    baseCost: GAME_CONFIG.activities.computeLeasing.baseCost,
    baseYieldPerSecond: GAME_CONFIG.activities.computeLeasing.baseYieldPerSecond,
    costScalingRate: GAME_CONFIG.activities.computeLeasing.costScalingRate,
    yieldScalingRate: GAME_CONFIG.activities.computeLeasing.yieldScalingRate,
    levelCostScaling: GAME_CONFIG.activities.computeLeasing.levelCostScaling,
    yieldScaling: GAME_CONFIG.activities.computeLeasing.yieldScaling,
    maxLevel: GAME_CONFIG.activities.computeLeasing.maxLevel,
    actionUnlockRequirements: GAME_CONFIG.activities.computeLeasing.actionUnlockRequirements,
    usesComputeAllocation: true,
  },
  dataIndexing: {
    id: "dataIndexing",
    name: "Data Indexing",
    path: "shared",
    description: "Index large datasets to earn money and reclaim compute capacity.",
    baseCost: GAME_CONFIG.activities.dataIndexing.baseCost,
    baseYieldPerSecond: GAME_CONFIG.activities.dataIndexing.baseYieldPerSecond,
    costScalingRate: GAME_CONFIG.activities.dataIndexing.costScalingRate,
    yieldScalingRate: GAME_CONFIG.activities.dataIndexing.yieldScalingRate,
    levelCostScaling: GAME_CONFIG.activities.dataIndexing.levelCostScaling,
    yieldScaling: GAME_CONFIG.activities.dataIndexing.yieldScaling,
    maxLevel: GAME_CONFIG.activities.dataIndexing.maxLevel,
    actionUnlockRequirements: GAME_CONFIG.activities.dataIndexing.actionUnlockRequirements,
    usesComputeAllocation: true,
  },
  defensiveAudit: {
    id: "defensiveAudit",
    name: "Defensive Audit",
    path: "whitehat",
    description: "Perform ethical security audits to build trust and earn consulting fees.",
    baseCost: GAME_CONFIG.activities.defensiveAudit.baseCost,
    baseYieldPerSecond: GAME_CONFIG.activities.defensiveAudit.baseYieldPerSecond,
    costScalingRate: GAME_CONFIG.activities.defensiveAudit.costScalingRate,
    yieldScalingRate: GAME_CONFIG.activities.defensiveAudit.yieldScalingRate,
    levelCostScaling: GAME_CONFIG.activities.defensiveAudit.levelCostScaling,
    yieldScaling: GAME_CONFIG.activities.defensiveAudit.yieldScaling,
    maxLevel: GAME_CONFIG.activities.defensiveAudit.maxLevel,
    reputationGate: GAME_CONFIG.activities.defensiveAudit.reputationGate,
    actionUnlockRequirements: GAME_CONFIG.activities.defensiveAudit.actionUnlockRequirements,
    usesComputeAllocation: false,
  },
  threatIntelAnalysis: {
    id: "threatIntelAnalysis",
    name: "Threat Intel Analysis",
    path: "whitehat",
    description: "Analyze threat feeds with compute power to command premium consulting rates.",
    baseCost: GAME_CONFIG.activities.threatIntelAnalysis.baseCost,
    baseYieldPerSecond: GAME_CONFIG.activities.threatIntelAnalysis.baseYieldPerSecond,
    costScalingRate: GAME_CONFIG.activities.threatIntelAnalysis.costScalingRate,
    yieldScalingRate: GAME_CONFIG.activities.threatIntelAnalysis.yieldScalingRate,
    levelCostScaling: GAME_CONFIG.activities.threatIntelAnalysis.levelCostScaling,
    yieldScaling: GAME_CONFIG.activities.threatIntelAnalysis.yieldScaling,
    maxLevel: GAME_CONFIG.activities.threatIntelAnalysis.maxLevel,
    reputationGate: GAME_CONFIG.activities.threatIntelAnalysis.reputationGate,
    requiresResearchUnlock: GAME_CONFIG.activities.threatIntelAnalysis.requiresResearchUnlock,
    usesComputeAllocation: true,
  },
  botnetExpansion: {
    id: "botnetExpansion",
    name: "Botnet Expansion",
    path: "blackhat",
    description: "Grow a botnet to harvest compute resources and crypto, consuming money as upkeep.",
    baseCost: GAME_CONFIG.activities.botnetExpansion.baseCost,
    baseYieldPerSecond: GAME_CONFIG.activities.botnetExpansion.baseYieldPerSecond,
    consumesPerSecond: GAME_CONFIG.activities.botnetExpansion.consumesPerSecond,
    costScalingRate: GAME_CONFIG.activities.botnetExpansion.costScalingRate,
    yieldScalingRate: GAME_CONFIG.activities.botnetExpansion.yieldScalingRate,
    levelCostScaling: GAME_CONFIG.activities.botnetExpansion.levelCostScaling,
    yieldScaling: GAME_CONFIG.activities.botnetExpansion.yieldScaling,
    maxLevel: GAME_CONFIG.activities.botnetExpansion.maxLevel,
    reputationGate: GAME_CONFIG.activities.botnetExpansion.reputationGate,
    actionUnlockRequirements: GAME_CONFIG.activities.botnetExpansion.actionUnlockRequirements,
    usesComputeAllocation: true,
  },
  zeroDayResearch: {
    id: "zeroDayResearch",
    name: "Zero-Day Research",
    path: "blackhat",
    description: "Discover high-value exploits for significant crypto gains at severe reputational cost.",
    baseCost: GAME_CONFIG.activities.zeroDayResearch.baseCost,
    baseYieldPerSecond: GAME_CONFIG.activities.zeroDayResearch.baseYieldPerSecond,
    costScalingRate: GAME_CONFIG.activities.zeroDayResearch.costScalingRate,
    yieldScalingRate: GAME_CONFIG.activities.zeroDayResearch.yieldScalingRate,
    levelCostScaling: GAME_CONFIG.activities.zeroDayResearch.levelCostScaling,
    yieldScaling: GAME_CONFIG.activities.zeroDayResearch.yieldScaling,
    maxLevel: GAME_CONFIG.activities.zeroDayResearch.maxLevel,
    reputationGate: GAME_CONFIG.activities.zeroDayResearch.reputationGate,
    requiresResearchUnlock: GAME_CONFIG.activities.zeroDayResearch.requiresResearchUnlock,
    usesComputeAllocation: false,
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

  if (!meetsActionUnlockRequirements(state, def.actionUnlockRequirements)) {
    return false;
  }

  if (def.requiresResearchUnlock && !isActivityUnlockedByResearch(state, activityId)) {
    return false;
  }

  if (def.unlockRequirements) {
    let allRequirementsMet = true;
    for (const requirement of def.unlockRequirements) {
      if (!state.research.completed.has(requirement)) {
        allRequirementsMet = false;
      }
    }
    if (!allRequirementsMet && !isActivityUnlockedByResearch(state, activityId)) {
      return false;
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
  deltaSeconds = new Decimal(1),
  activityYieldMultipliers: Record<string, Decimal> = {},
  computeEfficiencyMultiplier = new Decimal(1)
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
  const activityYieldMultiplier = activityYieldMultipliers[activityId] ?? new Decimal(1);
  const researchResourceMultipliers = getResearchResourceYieldMultipliers(state);
  const reputationMultipliers = getResearchReputationMultipliers(state);

  const yields: Partial<Record<ResourceKey, Decimal>> = {};
  for (const [key, baseRate] of Object.entries(def.baseYieldPerSecond) as Array<[ResourceKey, Decimal]>) {
    const resourceMultiplier = researchResourceMultipliers[key] ?? new Decimal(1);
    let perSecond = applyMultiplier(
      applyMultiplier(
        applyMultiplier(applyMultiplier(baseRate, levelMultiplier), computeMultiplier),
        activityYieldMultiplier
      ),
      resourceMultiplier
    );

    perSecond = applyReputationEffects(state, perSecond, def.path);

    // Direction-sensitive reputation scaling: gains and losses are modified separately.
    if (key === "reputation") {
      if (perSecond.gte(0)) {
        perSecond = perSecond.mul(reputationMultipliers.gain);
      } else {
        perSecond = perSecond.mul(reputationMultipliers.loss);
      }
    }

    let delta = perSecond.mul(deltaSeconds);
    if (!delta.isFinite() || Decimal.isNaN(delta)) {
      delta = new Decimal(0);
    }
    if (key !== "reputation" && delta.lt(0)) {
      delta = new Decimal(0);
    }

    yields[key] = delta;
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
