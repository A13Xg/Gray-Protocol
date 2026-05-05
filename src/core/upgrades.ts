// src/core/upgrades.ts
import Decimal from "break_eternity.js";
import type { GameState, ResourceKey, UpgradeDefinition } from "./types";
import { GAME_CONFIG } from "./config";
import { canAccessReputationGate } from "./reputation";
import { canAffordResources, applyResourceCost } from "./resources";
import { scaleExponential, scaleLinear } from "./math";
import { ACTIVITY_DEFINITIONS } from "./activities";
import { isUpgradeUnlockedByResearch } from "./research";

export const UPGRADE_DEFINITIONS: Record<string, UpgradeDefinition> = {
  // --- Shared: basicCryptoMining ---
  miningFirmwareOptimization: {
    id: "miningFirmwareOptimization",
    name: "Mining Firmware Optimization",
    description: "Optimized firmware increases crypto yield per mining cycle.",
    scope: GAME_CONFIG.upgrades.miningFirmwareOptimization.scope,
    activityId: GAME_CONFIG.upgrades.miningFirmwareOptimization.activityId,
    cost: GAME_CONFIG.upgrades.miningFirmwareOptimization.cost,
    costScaling: GAME_CONFIG.upgrades.miningFirmwareOptimization.costScaling,
    costScalingRate: GAME_CONFIG.upgrades.miningFirmwareOptimization.costScalingRate,
    maxLevel: GAME_CONFIG.upgrades.miningFirmwareOptimization.maxLevel,
    effects: [...GAME_CONFIG.upgrades.miningFirmwareOptimization.effects],
  },
  thermalLoadBalancing: {
    id: "thermalLoadBalancing",
    name: "Thermal Load Balancing",
    description: "Thermal management improves compute efficiency for all allocation-based activities.",
    scope: GAME_CONFIG.upgrades.thermalLoadBalancing.scope,
    activityId: GAME_CONFIG.upgrades.thermalLoadBalancing.activityId,
    cost: GAME_CONFIG.upgrades.thermalLoadBalancing.cost,
    costScaling: GAME_CONFIG.upgrades.thermalLoadBalancing.costScaling,
    costScalingRate: GAME_CONFIG.upgrades.thermalLoadBalancing.costScalingRate,
    maxLevel: GAME_CONFIG.upgrades.thermalLoadBalancing.maxLevel,
    effects: [...GAME_CONFIG.upgrades.thermalLoadBalancing.effects],
  },
  // --- Shared: computeLeasing ---
  leaseContractAutomation: {
    id: "leaseContractAutomation",
    name: "Lease Contract Automation",
    description: "Automated contract management increases leasing revenue.",
    scope: GAME_CONFIG.upgrades.leaseContractAutomation.scope,
    activityId: GAME_CONFIG.upgrades.leaseContractAutomation.activityId,
    cost: GAME_CONFIG.upgrades.leaseContractAutomation.cost,
    costScaling: GAME_CONFIG.upgrades.leaseContractAutomation.costScaling,
    costScalingRate: GAME_CONFIG.upgrades.leaseContractAutomation.costScalingRate,
    maxLevel: GAME_CONFIG.upgrades.leaseContractAutomation.maxLevel,
    effects: [...GAME_CONFIG.upgrades.leaseContractAutomation.effects],
  },
  // --- Shared: dataIndexing ---
  indexCompression: {
    id: "indexCompression",
    name: "Index Compression",
    description: "Compressed indexes reduce compute overhead across allocation-based activities.",
    scope: GAME_CONFIG.upgrades.indexCompression.scope,
    activityId: GAME_CONFIG.upgrades.indexCompression.activityId,
    cost: GAME_CONFIG.upgrades.indexCompression.cost,
    costScaling: GAME_CONFIG.upgrades.indexCompression.costScaling,
    costScalingRate: GAME_CONFIG.upgrades.indexCompression.costScalingRate,
    maxLevel: GAME_CONFIG.upgrades.indexCompression.maxLevel,
    effects: [...GAME_CONFIG.upgrades.indexCompression.effects],
  },
  // --- Whitehat: bugBountyHunting ---
  reconAutomation: {
    id: "reconAutomation",
    name: "Recon Automation",
    description: "Automated reconnaissance tools improve bug bounty discovery rates.",
    scope: GAME_CONFIG.upgrades.reconAutomation.scope,
    activityId: GAME_CONFIG.upgrades.reconAutomation.activityId,
    cost: GAME_CONFIG.upgrades.reconAutomation.cost,
    costScaling: GAME_CONFIG.upgrades.reconAutomation.costScaling,
    costScalingRate: GAME_CONFIG.upgrades.reconAutomation.costScalingRate,
    maxLevel: GAME_CONFIG.upgrades.reconAutomation.maxLevel,
    effects: [...GAME_CONFIG.upgrades.reconAutomation.effects],
  },
  responsibleDisclosurePipeline: {
    id: "responsibleDisclosurePipeline",
    name: "Responsible Disclosure Pipeline",
    description: "Streamlined disclosure process increases all bug bounty yields, including reputation.",
    scope: GAME_CONFIG.upgrades.responsibleDisclosurePipeline.scope,
    activityId: GAME_CONFIG.upgrades.responsibleDisclosurePipeline.activityId,
    cost: GAME_CONFIG.upgrades.responsibleDisclosurePipeline.cost,
    costScaling: GAME_CONFIG.upgrades.responsibleDisclosurePipeline.costScaling,
    costScalingRate: GAME_CONFIG.upgrades.responsibleDisclosurePipeline.costScalingRate,
    maxLevel: GAME_CONFIG.upgrades.responsibleDisclosurePipeline.maxLevel,
    effects: [...GAME_CONFIG.upgrades.responsibleDisclosurePipeline.effects],
    reputationGate: GAME_CONFIG.upgrades.responsibleDisclosurePipeline.reputationGate,
  },
  // --- Whitehat: defensiveAudit ---
  auditToolchain: {
    id: "auditToolchain",
    name: "Audit Toolchain",
    description: "A professional toolchain improves audit thoroughness and billing rates.",
    scope: GAME_CONFIG.upgrades.auditToolchain.scope,
    activityId: GAME_CONFIG.upgrades.auditToolchain.activityId,
    cost: GAME_CONFIG.upgrades.auditToolchain.cost,
    costScaling: GAME_CONFIG.upgrades.auditToolchain.costScaling,
    costScalingRate: GAME_CONFIG.upgrades.auditToolchain.costScalingRate,
    maxLevel: GAME_CONFIG.upgrades.auditToolchain.maxLevel,
    effects: [...GAME_CONFIG.upgrades.auditToolchain.effects],
  },
  // --- Whitehat: threatIntelAnalysis ---
  signatureCorrelation: {
    id: "signatureCorrelation",
    name: "Signature Correlation",
    description: "Advanced signature matching increases threat intel value and client payments.",
    scope: GAME_CONFIG.upgrades.signatureCorrelation.scope,
    activityId: GAME_CONFIG.upgrades.signatureCorrelation.activityId,
    cost: GAME_CONFIG.upgrades.signatureCorrelation.cost,
    costScaling: GAME_CONFIG.upgrades.signatureCorrelation.costScaling,
    costScalingRate: GAME_CONFIG.upgrades.signatureCorrelation.costScalingRate,
    maxLevel: GAME_CONFIG.upgrades.signatureCorrelation.maxLevel,
    effects: [...GAME_CONFIG.upgrades.signatureCorrelation.effects],
    requiresResearchUnlock: GAME_CONFIG.upgrades.signatureCorrelation.requiresResearchUnlock,
  },
  // --- Blackhat: passwordCracking ---
  gpuCrackingRig: {
    id: "gpuCrackingRig",
    name: "GPU Cracking Rig",
    description: "Dedicated GPU hardware dramatically increases password cracking output.",
    scope: GAME_CONFIG.upgrades.gpuCrackingRig.scope,
    activityId: GAME_CONFIG.upgrades.gpuCrackingRig.activityId,
    cost: GAME_CONFIG.upgrades.gpuCrackingRig.cost,
    costScaling: GAME_CONFIG.upgrades.gpuCrackingRig.costScaling,
    costScalingRate: GAME_CONFIG.upgrades.gpuCrackingRig.costScalingRate,
    maxLevel: GAME_CONFIG.upgrades.gpuCrackingRig.maxLevel,
    effects: [...GAME_CONFIG.upgrades.gpuCrackingRig.effects],
  },
  credentialStuffingScripts: {
    id: "credentialStuffingScripts",
    name: "Credential Stuffing Scripts",
    description: "Automated scripts increase monetization yields from cracked credentials.",
    scope: GAME_CONFIG.upgrades.credentialStuffingScripts.scope,
    activityId: GAME_CONFIG.upgrades.credentialStuffingScripts.activityId,
    cost: GAME_CONFIG.upgrades.credentialStuffingScripts.cost,
    costScaling: GAME_CONFIG.upgrades.credentialStuffingScripts.costScaling,
    costScalingRate: GAME_CONFIG.upgrades.credentialStuffingScripts.costScalingRate,
    maxLevel: GAME_CONFIG.upgrades.credentialStuffingScripts.maxLevel,
    effects: [...GAME_CONFIG.upgrades.credentialStuffingScripts.effects],
  },
  // --- Blackhat: botnetExpansion ---
  botnetCommandLayer: {
    id: "botnetCommandLayer",
    name: "Botnet Command Layer",
    description: "An optimized C2 layer improves the compute efficiency of the botnet.",
    scope: GAME_CONFIG.upgrades.botnetCommandLayer.scope,
    activityId: GAME_CONFIG.upgrades.botnetCommandLayer.activityId,
    cost: GAME_CONFIG.upgrades.botnetCommandLayer.cost,
    costScaling: GAME_CONFIG.upgrades.botnetCommandLayer.costScaling,
    costScalingRate: GAME_CONFIG.upgrades.botnetCommandLayer.costScalingRate,
    maxLevel: GAME_CONFIG.upgrades.botnetCommandLayer.maxLevel,
    effects: [...GAME_CONFIG.upgrades.botnetCommandLayer.effects],
  },
  // --- Blackhat: zeroDayResearch ---
  exploitPrototypeKit: {
    id: "exploitPrototypeKit",
    name: "Exploit Prototype Kit",
    description: "A curated exploit kit doubles zero-day research output.",
    scope: GAME_CONFIG.upgrades.exploitPrototypeKit.scope,
    activityId: GAME_CONFIG.upgrades.exploitPrototypeKit.activityId,
    cost: GAME_CONFIG.upgrades.exploitPrototypeKit.cost,
    costScaling: GAME_CONFIG.upgrades.exploitPrototypeKit.costScaling,
    costScalingRate: GAME_CONFIG.upgrades.exploitPrototypeKit.costScalingRate,
    maxLevel: GAME_CONFIG.upgrades.exploitPrototypeKit.maxLevel,
    effects: [...GAME_CONFIG.upgrades.exploitPrototypeKit.effects],
    requiresResearchUnlock: GAME_CONFIG.upgrades.exploitPrototypeKit.requiresResearchUnlock,
  },
  // --- Global ---
  encryptedChannels: {
    id: "encryptedChannels",
    name: "Encrypted Channels",
    description: "Secure channel infrastructure improves compute efficiency globally.",
    scope: GAME_CONFIG.upgrades.encryptedChannels.scope,
    cost: GAME_CONFIG.upgrades.encryptedChannels.cost,
    costScaling: GAME_CONFIG.upgrades.encryptedChannels.costScaling,
    costScalingRate: GAME_CONFIG.upgrades.encryptedChannels.costScalingRate,
    maxLevel: GAME_CONFIG.upgrades.encryptedChannels.maxLevel,
    effects: [...GAME_CONFIG.upgrades.encryptedChannels.effects],
  },
  networkOptimizer: {
    id: "networkOptimizer",
    name: "Network Optimizer",
    description: "Low-latency routing improves compute efficiency for all operations.",
    scope: GAME_CONFIG.upgrades.networkOptimizer.scope,
    cost: GAME_CONFIG.upgrades.networkOptimizer.cost,
    costScaling: GAME_CONFIG.upgrades.networkOptimizer.costScaling,
    costScalingRate: GAME_CONFIG.upgrades.networkOptimizer.costScalingRate,
    maxLevel: GAME_CONFIG.upgrades.networkOptimizer.maxLevel,
    effects: [...GAME_CONFIG.upgrades.networkOptimizer.effects],
  },
};

export function getUpgradeDefinition(upgradeId: string): UpgradeDefinition | undefined {
  return UPGRADE_DEFINITIONS[upgradeId];
}

export function getUpgradeLevel(state: GameState, upgradeId: string): number {
  return state.upgrades.levelsById[upgradeId] ?? 0;
}

export function getUpgradeCost(upgradeId: string, currentLevel: number): Partial<Record<ResourceKey, Decimal>> {
  const def = UPGRADE_DEFINITIONS[upgradeId];
  if (!def) return {};

  const result: Partial<Record<ResourceKey, Decimal>> = {};
  for (const [key, base] of Object.entries(def.cost) as Array<[ResourceKey, Decimal]>) {
    result[key] =
      def.costScaling === "exponential"
        ? scaleExponential(base, currentLevel, def.costScalingRate)
        : scaleLinear(base, currentLevel, def.costScalingRate);
  }
  return result;
}

export function canPurchaseUpgrade(state: GameState, upgradeId: string): boolean {
  const def = UPGRADE_DEFINITIONS[upgradeId];
  if (!def) return false;

  const currentLevel = getUpgradeLevel(state, upgradeId);
  if (currentLevel >= def.maxLevel) return false;

  if (def.reputationGate && !canAccessReputationGate(state.resources.reputation, def.reputationGate)) {
    return false;
  }

  if (def.requiresResearchUnlock && !isUpgradeUnlockedByResearch(state, upgradeId)) {
    return false;
  }

  if (def.prerequisites) {
    for (const prereq of def.prerequisites) {
      if (getUpgradeLevel(state, prereq) <= 0) return false;
    }
  }

  // Activity-scoped upgrades require the activity to have at least level 1
  if (def.activityId) {
    const actState = state.activities[def.activityId];
    if (!actState || actState.level <= 0) return false;
  }

  const cost = getUpgradeCost(upgradeId, currentLevel);
  return canAffordResources(state.resources, cost);
}

export function purchaseUpgrade(state: GameState, upgradeId: string): boolean {
  if (!canPurchaseUpgrade(state, upgradeId)) return false;

  const currentLevel = getUpgradeLevel(state, upgradeId);
  const cost = getUpgradeCost(upgradeId, currentLevel);
  state.resources = applyResourceCost(state.resources, cost);
  state.upgrades.levelsById[upgradeId] = currentLevel + 1;
  return true;
}

/**
 * Returns a merged activityId → yield multiplier map from all purchased upgrades.
 * Only considers activityYieldMultiplier effects.
 * Multiplier stacks per level: effectiveMult = value^level.
 */
export function getUpgradeYieldMultipliers(state: GameState): Record<string, Decimal> {
  const multipliers: Record<string, Decimal> = {};

  for (const [upgradeId, level] of Object.entries(state.upgrades.levelsById)) {
    if (level <= 0) continue;
    const def = UPGRADE_DEFINITIONS[upgradeId];
    if (!def) continue;

    for (const effect of def.effects) {
      if (effect.type !== "activityYieldMultiplier") continue;

      let targetActivities: string[] = [];
      if (def.scope === "activity" && def.activityId) {
        targetActivities = [def.activityId];
      } else if (def.scope === "path" && def.path) {
        targetActivities = Object.values(ACTIVITY_DEFINITIONS)
          .filter((a) => a.path === def.path)
          .map((a) => a.id);
      } else if (def.scope === "global") {
        targetActivities = Object.keys(ACTIVITY_DEFINITIONS);
      }

      const effectiveMult = effect.value.pow(level);
      for (const actId of targetActivities) {
        multipliers[actId] = (multipliers[actId] ?? new Decimal(1)).mul(effectiveMult);
      }
    }
  }

  return multipliers;
}

/**
 * Returns the combined compute efficiency multiplier from all purchased upgrades.
 * Stacks multiplicatively: effectiveMult = value^level per upgrade.
 */
export function getUpgradeComputeEfficiencyMultiplier(state: GameState): Decimal {
  let mult = new Decimal(1);

  for (const [upgradeId, level] of Object.entries(state.upgrades.levelsById)) {
    if (level <= 0) continue;
    const def = UPGRADE_DEFINITIONS[upgradeId];
    if (!def) continue;

    for (const effect of def.effects) {
      if (effect.type === "computeEfficiencyMultiplier") {
        mult = mult.mul(effect.value.pow(level));
      }
    }
  }

  return mult;
}

/**
 * Returns all active upgrade effects across all purchased upgrades.
 */
export function getActiveUpgradeEffects(state: GameState) {
  const results: Array<{ upgradeId: string; level: number; effect: UpgradeDefinition["effects"][0] }> = [];
  for (const [upgradeId, level] of Object.entries(state.upgrades.levelsById)) {
    if (level <= 0) continue;
    const def = UPGRADE_DEFINITIONS[upgradeId];
    if (!def) continue;
    for (const effect of def.effects) {
      results.push({ upgradeId, level, effect });
    }
  }
  return results;
}

/**
 * Returns all upgrade definitions that are scoped to a specific activity.
 */
export function getUpgradeEffectsForActivity(state: GameState, activityId: string) {
  return getActiveUpgradeEffects(state).filter(
    ({ upgradeId }) => UPGRADE_DEFINITIONS[upgradeId]?.activityId === activityId
  );
}

export function applyUpgradeEffectsToYield(
  state: GameState,
  activityId: string,
  baseYield = new Decimal(1)
): Decimal {
  if (!baseYield.isFinite() || Decimal.isNaN(baseYield)) return new Decimal(0);
  const activityMult = getUpgradeYieldMultipliers(state)[activityId] ?? new Decimal(1);
  return baseYield.mul(activityMult);
}

export function applyUpgradeEffectsToCost(
  state: GameState,
  activityId: string,
  baseCost: Partial<Record<ResourceKey, Decimal>>
): Partial<Record<ResourceKey, Decimal>> {
  let costMultiplier = new Decimal(1);

  for (const [upgradeId, level] of Object.entries(state.upgrades.levelsById)) {
    if (level <= 0) continue;
    const def = UPGRADE_DEFINITIONS[upgradeId];
    if (!def) continue;

    const affectsActivity =
      (def.scope === "activity" && def.activityId === activityId) ||
      (def.scope === "path" && def.path && ACTIVITY_DEFINITIONS[activityId]?.path === def.path) ||
      def.scope === "global";

    if (!affectsActivity) continue;

    for (const effect of def.effects) {
      if (effect.type === "activityCostMultiplier") {
        costMultiplier = costMultiplier.mul(effect.value.pow(level));
      }
    }
  }

  if (costMultiplier.eq(1)) return { ...baseCost };

  const adjusted: Partial<Record<ResourceKey, Decimal>> = {};
  for (const [resource, amount] of Object.entries(baseCost) as Array<[ResourceKey, Decimal]>) {
    adjusted[resource] = amount.mul(costMultiplier);
  }
  return adjusted;
}
