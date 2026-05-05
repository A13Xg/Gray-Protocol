// src/core/research.ts
import Decimal from "break_eternity.js";
import type { ResearchNodeDefinition, GameState, ResourceKey } from "./types";
import { GAME_CONFIG } from "./config";
import { canAccessReputationGate } from "./reputation";
import { canAffordResources, applyResourceCost } from "./resources";

export const RESEARCH_DEFINITIONS: Record<string, ResearchNodeDefinition> = {
  parallelProcessing: {
    id: "parallelProcessing",
    name: "Parallel Processing",
    description: "Improve compute efficiency for all allocation-based activities.",
    path: GAME_CONFIG.research.parallelProcessing.path,
    cost: GAME_CONFIG.research.parallelProcessing.cost,
    prerequisites: GAME_CONFIG.research.parallelProcessing.prerequisites,
    position: GAME_CONFIG.research.parallelProcessing.position,
    effects: [...GAME_CONFIG.research.parallelProcessing.effects],
  },
  distributedSchedulers: {
    id: "distributedSchedulers",
    name: "Distributed Schedulers",
    description: "Schedule workloads across distributed compute pools for stronger shared throughput.",
    path: GAME_CONFIG.research.distributedSchedulers.path,
    cost: GAME_CONFIG.research.distributedSchedulers.cost,
    prerequisites: GAME_CONFIG.research.distributedSchedulers.prerequisites,
    position: GAME_CONFIG.research.distributedSchedulers.position,
    effects: [...GAME_CONFIG.research.distributedSchedulers.effects],
  },
  protocolOptimization: {
    id: "protocolOptimization",
    name: "Protocol Optimization",
    description: "Optimize protocol overhead to improve core resource yields.",
    path: GAME_CONFIG.research.protocolOptimization.path,
    cost: GAME_CONFIG.research.protocolOptimization.cost,
    prerequisites: GAME_CONFIG.research.protocolOptimization.prerequisites,
    position: GAME_CONFIG.research.protocolOptimization.position,
    effects: [...GAME_CONFIG.research.protocolOptimization.effects],
  },
  responsibleDisclosure: {
    id: "responsibleDisclosure",
    name: "Responsible Disclosure",
    description: "Improve bug bounty yields and positive reputation through ethical practices.",
    path: GAME_CONFIG.research.responsibleDisclosure.path,
    cost: GAME_CONFIG.research.responsibleDisclosure.cost,
    prerequisites: GAME_CONFIG.research.responsibleDisclosure.prerequisites,
    reputationGate: GAME_CONFIG.research.responsibleDisclosure.reputationGate,
    position: GAME_CONFIG.research.responsibleDisclosure.position,
    effects: [...GAME_CONFIG.research.responsibleDisclosure.effects],
  },
  defensiveAutomation: {
    id: "defensiveAutomation",
    name: "Defensive Automation",
    description: "Automate defensive operations to increase whitehat output.",
    path: GAME_CONFIG.research.defensiveAutomation.path,
    cost: GAME_CONFIG.research.defensiveAutomation.cost,
    prerequisites: GAME_CONFIG.research.defensiveAutomation.prerequisites,
    reputationGate: GAME_CONFIG.research.defensiveAutomation.reputationGate,
    position: GAME_CONFIG.research.defensiveAutomation.position,
    effects: [...GAME_CONFIG.research.defensiveAutomation.effects],
  },
  trustedResearchNetwork: {
    id: "trustedResearchNetwork",
    name: "Trusted Research Network",
    description: "Build a trusted whitehat network that unlocks advanced operations.",
    path: GAME_CONFIG.research.trustedResearchNetwork.path,
    cost: GAME_CONFIG.research.trustedResearchNetwork.cost,
    prerequisites: GAME_CONFIG.research.trustedResearchNetwork.prerequisites,
    reputationGate: GAME_CONFIG.research.trustedResearchNetwork.reputationGate,
    position: GAME_CONFIG.research.trustedResearchNetwork.position,
    effects: [...GAME_CONFIG.research.trustedResearchNetwork.effects],
  },
  exploitAutomation: {
    id: "exploitAutomation",
    name: "Exploit Automation",
    description: "Automate exploit discovery to improve blackhat yields.",
    path: GAME_CONFIG.research.exploitAutomation.path,
    cost: GAME_CONFIG.research.exploitAutomation.cost,
    prerequisites: GAME_CONFIG.research.exploitAutomation.prerequisites,
    reputationGate: GAME_CONFIG.research.exploitAutomation.reputationGate,
    position: GAME_CONFIG.research.exploitAutomation.position,
    effects: [...GAME_CONFIG.research.exploitAutomation.effects],
  },
  distributedIntrusionTooling: {
    id: "distributedIntrusionTooling",
    name: "Distributed Intrusion Tooling",
    description: "Scale intrusion infrastructure across distributed toolchains.",
    path: GAME_CONFIG.research.distributedIntrusionTooling.path,
    cost: GAME_CONFIG.research.distributedIntrusionTooling.cost,
    prerequisites: GAME_CONFIG.research.distributedIntrusionTooling.prerequisites,
    reputationGate: GAME_CONFIG.research.distributedIntrusionTooling.reputationGate,
    position: GAME_CONFIG.research.distributedIntrusionTooling.position,
    effects: [...GAME_CONFIG.research.distributedIntrusionTooling.effects],
  },
  zeroDaySupplyChain: {
    id: "zeroDaySupplyChain",
    name: "Zero-Day Supply Chain",
    description: "Establish exploit supply chains to unlock and amplify zero-day operations.",
    path: GAME_CONFIG.research.zeroDaySupplyChain.path,
    cost: GAME_CONFIG.research.zeroDaySupplyChain.cost,
    prerequisites: GAME_CONFIG.research.zeroDaySupplyChain.prerequisites,
    reputationGate: GAME_CONFIG.research.zeroDaySupplyChain.reputationGate,
    position: GAME_CONFIG.research.zeroDaySupplyChain.position,
    effects: [...GAME_CONFIG.research.zeroDaySupplyChain.effects],
  },
};

export function getResearchDefinition(nodeId: string): ResearchNodeDefinition | undefined {
  return RESEARCH_DEFINITIONS[nodeId];
}

export function canResearchNode(state: GameState, nodeId: string): boolean {
  const def = getResearchDefinition(nodeId);
  if (!def) return false;
  if (state.research.completed.has(nodeId)) return false;
  if (!hasResearchPrerequisites(state, nodeId)) return false;
  if (!passesResearchReputationGate(state, nodeId)) return false;
  if (!canAffordResearchNode(state, nodeId)) return false;
  return true;
}

export function hasResearchPrerequisites(state: GameState, nodeId: string): boolean {
  const def = getResearchDefinition(nodeId);
  if (!def) return false;
  for (const prerequisite of def.prerequisites) {
    if (!state.research.completed.has(prerequisite)) return false;
  }
  return true;
}

export function passesResearchReputationGate(state: GameState, nodeId: string): boolean {
  const def = getResearchDefinition(nodeId);
  if (!def) return false;
  if (!def.reputationGate) return true;
  return canAccessReputationGate(state.resources.reputation, def.reputationGate);
}

export function canAffordResearchNode(state: GameState, nodeId: string): boolean {
  const def = getResearchDefinition(nodeId);
  if (!def) return false;
  return canAffordResources(state.resources, def.cost);
}

export function purchaseResearchNode(state: GameState, nodeId: string): boolean {
  if (!canResearchNode(state, nodeId)) return false;
  const def = getResearchDefinition(nodeId);
  if (!def) return false;
  state.resources = applyResourceCost(state.resources, def.cost);
  state.research.completed.add(nodeId);
  return true;
}

export function getActiveResearchEffects(state: GameState) {
  const effects: Array<{ nodeId: string; effect: ResearchNodeDefinition["effects"][0] }> = [];
  for (const nodeId of state.research.completed) {
    const def = getResearchDefinition(nodeId);
    if (!def) continue;
    for (const effect of def.effects) {
      effects.push({ nodeId, effect });
    }
  }
  return effects;
}

export function getResearchResourceYieldMultipliers(state: GameState): Partial<Record<ResourceKey, Decimal>> {
  const multipliers: Partial<Record<ResourceKey, Decimal>> = {};
  for (const { effect } of getActiveResearchEffects(state)) {
    if (effect.type !== "resourceMultiplier" || !effect.target) continue;
    const key = effect.target as ResourceKey;
    multipliers[key] = (multipliers[key] ?? new Decimal(1)).mul(effect.value);
  }
  return multipliers;
}

export function getResearchActivityYieldMultipliers(state: GameState): Record<string, Decimal> {
  const multipliers: Record<string, Decimal> = {};
  for (const { effect } of getActiveResearchEffects(state)) {
    if (effect.type === "activityYieldMultiplier" && effect.target) {
      multipliers[effect.target] = (multipliers[effect.target] ?? new Decimal(1)).mul(effect.value);
    }
  }
  return multipliers;
}

export function getResearchComputeEfficiencyMultiplier(state: GameState): Decimal {
  let mult = new Decimal(1);
  for (const { effect } of getActiveResearchEffects(state)) {
    if (effect.type === "computeEfficiencyMultiplier") {
      mult = mult.mul(effect.value);
    }
  }
  return mult;
}

export function getResearchReputationMultipliers(state: GameState): { gain: Decimal; loss: Decimal } {
  let gain = new Decimal(1);
  let loss = new Decimal(1);
  for (const { effect } of getActiveResearchEffects(state)) {
    if (effect.type === "reputationGainMultiplier") {
      gain = gain.mul(effect.value);
    }
    if (effect.type === "reputationLossMultiplier") {
      loss = loss.mul(effect.value);
    }
  }
  return { gain, loss };
}

export function isActivityUnlockedByResearch(state: GameState, activityId: string): boolean {
  for (const { effect } of getActiveResearchEffects(state)) {
    if (effect.type === "activityUnlock" && effect.target === activityId) {
      return true;
    }
  }
  return false;
}

export function isUpgradeUnlockedByResearch(state: GameState, upgradeId: string): boolean {
  for (const { effect } of getActiveResearchEffects(state)) {
    if (effect.type === "upgradeUnlock" && effect.target === upgradeId) {
      return true;
    }
  }
  return false;
}

export function applyResearchEffectsToYield(
  baseYield: Decimal,
  activityId: string,
  state: GameState
): Decimal {
  const multipliers = getResearchActivityYieldMultipliers(state);
  const activityMultiplier = multipliers[activityId] ?? new Decimal(1);
  return baseYield.mul(activityMultiplier);
}
