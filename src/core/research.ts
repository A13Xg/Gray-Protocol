// src/core/research.ts
import Decimal from "break_eternity.js";
import type { ResearchNodeDefinition, GameState } from "./types";
import { GAME_CONFIG } from "./config";
import { canAccessReputationGate } from "./reputation";
import { canAffordResources, applyResourceCost } from "./resources";

export const RESEARCH_DEFINITIONS: Record<string, ResearchNodeDefinition> = {
  parallelProcessing: {
    id: "parallelProcessing",
    name: "Parallel Processing",
    description: "Improve compute efficiency for all allocation-based activities.",
    cost: GAME_CONFIG.research.parallelProcessing.cost,
    prerequisites: GAME_CONFIG.research.parallelProcessing.prerequisites,
    effects: [...GAME_CONFIG.research.parallelProcessing.effects],
  },
  responsibleDisclosure: {
    id: "responsibleDisclosure",
    name: "Responsible Disclosure",
    description: "Improve bug bounty yields through ethical practices.",
    cost: GAME_CONFIG.research.responsibleDisclosure.cost,
    prerequisites: GAME_CONFIG.research.responsibleDisclosure.prerequisites,
    reputationGate: GAME_CONFIG.research.responsibleDisclosure.reputationGate,
    effects: [...GAME_CONFIG.research.responsibleDisclosure.effects],
  },
  exploitAutomation: {
    id: "exploitAutomation",
    name: "Exploit Automation",
    description: "Automate exploit discovery to improve password cracking yields.",
    cost: GAME_CONFIG.research.exploitAutomation.cost,
    prerequisites: GAME_CONFIG.research.exploitAutomation.prerequisites,
    reputationGate: GAME_CONFIG.research.exploitAutomation.reputationGate,
    effects: [...GAME_CONFIG.research.exploitAutomation.effects],
  },
};

export function canResearchNode(state: GameState, nodeId: string): boolean {
  const def = RESEARCH_DEFINITIONS[nodeId];
  if (!def) return false;
  if (state.research.completed.has(nodeId)) return false;
  if (!hasResearchPrerequisites(state, nodeId)) return false;
  if (!passesResearchReputationGate(state, nodeId)) return false;
  if (!canAffordResearchNode(state, nodeId)) return false;
  return true;
}

export function hasResearchPrerequisites(state: GameState, nodeId: string): boolean {
  const def = RESEARCH_DEFINITIONS[nodeId];
  if (!def) return false;
  for (const prerequisite of def.prerequisites) {
    if (!state.research.completed.has(prerequisite)) return false;
  }
  return true;
}

export function passesResearchReputationGate(state: GameState, nodeId: string): boolean {
  const def = RESEARCH_DEFINITIONS[nodeId];
  if (!def) return false;
  if (!def.reputationGate) return true;
  return canAccessReputationGate(state.resources.reputation, def.reputationGate);
}

export function canAffordResearchNode(state: GameState, nodeId: string): boolean {
  const def = RESEARCH_DEFINITIONS[nodeId];
  if (!def) return false;
  return canAffordResources(state.resources, def.cost);
}

export function purchaseResearchNode(state: GameState, nodeId: string): boolean {
  if (!canResearchNode(state, nodeId)) return false;
  const def = RESEARCH_DEFINITIONS[nodeId];
  state.resources = applyResourceCost(state.resources, def.cost);
  state.research.completed.add(nodeId);
  return true;
}

export function getActiveResearchEffects(state: GameState) {
  const effects: Array<{ nodeId: string; effect: ResearchNodeDefinition["effects"][0] }> = [];
  for (const nodeId of state.research.completed) {
    const def = RESEARCH_DEFINITIONS[nodeId];
    if (!def) continue;
    for (const effect of def.effects) {
      effects.push({ nodeId, effect });
    }
  }
  return effects;
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

export function applyResearchEffectsToYield(
  baseYield: Decimal,
  activityId: string,
  state: GameState
): Decimal {
  const multipliers = getResearchActivityYieldMultipliers(state);
  const activityMultiplier = multipliers[activityId] ?? new Decimal(1);
  return baseYield.mul(activityMultiplier);
}
