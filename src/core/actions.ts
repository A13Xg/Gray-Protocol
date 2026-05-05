import Decimal from "break_eternity.js";
import type {
  GameState,
  ManualActionDefinition,
  ManualActionExecutionOutcome,
  ResourceKey,
} from "./types";
import { GAME_CONFIG } from "./config";
import { canAffordResources, applyResourceCost, createEmptyResourceMap } from "./resources";
import { applyReputationDelta, getPathReputationMultiplier } from "./reputation";
import { getResearchReputationMultipliers } from "./research";

export const ACTION_DEFINITIONS: Record<string, ManualActionDefinition> = {
  scanNetwork: {
    id: "scanNetwork",
    name: "Scan Network",
    description: "Run a quick network scan for low-risk leads.",
    type: GAME_CONFIG.actions.scanNetwork.type,
    path: GAME_CONFIG.actions.scanNetwork.path,
    baseCost: GAME_CONFIG.actions.scanNetwork.baseCost,
    baseReward: GAME_CONFIG.actions.scanNetwork.baseReward,
    reputationEffect: GAME_CONFIG.actions.scanNetwork.reputationEffect,
    reputationScaling: GAME_CONFIG.actions.scanNetwork.reputationScaling,
    rewardVariance: GAME_CONFIG.actions.scanNetwork.rewardVariance,
    cooldownMs: GAME_CONFIG.actions.scanNetwork.cooldownMs,
  },
  mineLocally: {
    id: "mineLocally",
    name: "Mine Locally",
    description: "Run local mining jobs that scale with your free compute capacity.",
    type: GAME_CONFIG.actions.mineLocally.type,
    path: GAME_CONFIG.actions.mineLocally.path,
    durationMs: GAME_CONFIG.actions.mineLocally.durationMs,
    baseCost: GAME_CONFIG.actions.mineLocally.baseCost,
    baseReward: GAME_CONFIG.actions.mineLocally.baseReward,
    reputationEffect: GAME_CONFIG.actions.mineLocally.reputationEffect,
    reputationScaling: GAME_CONFIG.actions.mineLocally.reputationScaling,
    computeScaling: GAME_CONFIG.actions.mineLocally.computeScaling,
    rewardVariance: GAME_CONFIG.actions.mineLocally.rewardVariance,
    cooldownMs: GAME_CONFIG.actions.mineLocally.cooldownMs,
  },
  bugBounty: {
    id: "bugBounty",
    name: "Bug Bounty",
    description: "Submit a vetted vulnerability report for a direct payout.",
    type: GAME_CONFIG.actions.bugBounty.type,
    path: GAME_CONFIG.actions.bugBounty.path,
    baseCost: GAME_CONFIG.actions.bugBounty.baseCost,
    baseReward: GAME_CONFIG.actions.bugBounty.baseReward,
    reputationEffect: GAME_CONFIG.actions.bugBounty.reputationEffect,
    reputationScaling: GAME_CONFIG.actions.bugBounty.reputationScaling,
    rewardVariance: GAME_CONFIG.actions.bugBounty.rewardVariance,
    cooldownMs: GAME_CONFIG.actions.bugBounty.cooldownMs,
  },
  passwordAttempt: {
    id: "passwordAttempt",
    name: "Password Attempt",
    description: "Attempt a credential crack. Success is probabilistic and reputation is harmed.",
    type: GAME_CONFIG.actions.passwordAttempt.type,
    path: GAME_CONFIG.actions.passwordAttempt.path,
    baseCost: GAME_CONFIG.actions.passwordAttempt.baseCost,
    baseReward: GAME_CONFIG.actions.passwordAttempt.baseReward,
    reputationEffect: GAME_CONFIG.actions.passwordAttempt.reputationEffect,
    successChance: GAME_CONFIG.actions.passwordAttempt.successChance,
    rewardVariance: GAME_CONFIG.actions.passwordAttempt.rewardVariance,
    failureRewardMultiplier: GAME_CONFIG.actions.passwordAttempt.failureRewardMultiplier,
    reputationScaling: GAME_CONFIG.actions.passwordAttempt.reputationScaling,
    computeScaling: GAME_CONFIG.actions.passwordAttempt.computeScaling,
    cooldownMs: GAME_CONFIG.actions.passwordAttempt.cooldownMs,
  },
};

function sanitizeResourceDelta(key: ResourceKey, value: Decimal): Decimal {
  if (!value.isFinite() || Decimal.isNaN(value)) return new Decimal(0);
  if (key !== "reputation" && value.lt(0)) return new Decimal(0);
  return value;
}

function getFreeCompute(state: GameState): Decimal {
  let allocated = new Decimal(0);
  for (const amount of Object.values(state.allocations.computeByActivityId)) {
    allocated = allocated.add(amount);
  }
  return Decimal.max(new Decimal(0), state.resources.compute.sub(allocated));
}

function deterministicRoll(state: GameState, actionId: string): Decimal {
  let hash = 2166136261;
  const key = `${actionId}:${state.manualActions.totalExecutions}:${state.resources.reputation.toString()}`;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = (hash >>> 0) / 4294967296;
  return new Decimal(normalized);
}

function applyVariance(base: Decimal, variance: Decimal, roll: Decimal): Decimal {
  if (variance.lte(0)) return base;
  const range = variance.mul(2);
  const varianceMultiplier = new Decimal(1).add(roll.mul(range).sub(variance));
  return Decimal.max(new Decimal(0), base.mul(varianceMultiplier));
}

export function getReputationMultiplier(
  actionPath: ManualActionDefinition["path"],
  _playerAlignment: "whitehat" | "greyhat" | "blackhat",
  reputationValue: Decimal
): Decimal {
  return getPathReputationMultiplier(reputationValue, actionPath);
}

export function getReputationActionMultiplier(state: GameState, action: ManualActionDefinition): Decimal {
  if (!action.reputationScaling) return new Decimal(1);
  return getPathReputationMultiplier(state.resources.reputation, action.path);
}

function getActionComputeMultiplier(state: GameState, action: ManualActionDefinition): Decimal {
  if (!action.computeScaling?.enabled) {
    return new Decimal(1);
  }

  const freeCompute = getFreeCompute(state);
  const linear = new Decimal(1).add(freeCompute.mul(action.computeScaling.freeComputeSlope));
  return Decimal.min(action.computeScaling.maxMultiplier, Decimal.max(new Decimal(1), linear));
}

function getActionDurationMultiplier(action: ManualActionDefinition): Decimal {
  if (action.type !== "duration") return new Decimal(1);
  const durationMs = action.durationMs ?? 60_000;
  return new Decimal(durationMs).div(60_000);
}

function calculateActionRewardInternal(
  state: GameState,
  action: ManualActionDefinition,
  success: boolean,
  roll: Decimal
): Partial<Record<ResourceKey, Decimal>> {
  const result: Partial<Record<ResourceKey, Decimal>> = {};
  const reputationMultiplier = getReputationActionMultiplier(state, action);
  const computeMultiplier = getActionComputeMultiplier(state, action);
  const durationMultiplier = getActionDurationMultiplier(action);
  const variance = action.rewardVariance ?? new Decimal(0);

  for (const [key, base] of Object.entries(action.baseReward) as Array<[ResourceKey, Decimal]>) {
    let reward = base.mul(reputationMultiplier).mul(computeMultiplier).mul(durationMultiplier);

    if (!success) {
      const failureMult = action.failureRewardMultiplier ?? new Decimal(0);
      reward = reward.mul(failureMult);
    }

    reward = applyVariance(reward, variance, roll);
    result[key] = sanitizeResourceDelta(key, reward);
  }

  return result;
}

export function calculateActionReward(
  state: GameState,
  actionId: string
): Partial<Record<ResourceKey, Decimal>> {
  const action = ACTION_DEFINITIONS[actionId];
  if (!action) return {};
  const roll = deterministicRoll(state, action.id);
  const successChance = action.successChance ?? new Decimal(1);
  const success = roll.lte(successChance);
  return calculateActionRewardInternal(state, action, success, roll);
}

export function applyActionReputationDelta(state: GameState, action: ManualActionDefinition): Decimal {
  let delta = action.reputationEffect;
  const repMultipliers = getResearchReputationMultipliers(state);
  if (delta.gte(0)) {
    delta = delta.mul(repMultipliers.gain);
  } else {
    delta = delta.mul(repMultipliers.loss);
  }
  if (!delta.isFinite() || Decimal.isNaN(delta)) {
    return new Decimal(0);
  }
  applyReputationDelta(state, delta);
  return delta;
}

export function resolveActionOutcome(action: ManualActionDefinition, state: GameState): ManualActionExecutionOutcome {
  const roll = deterministicRoll(state, action.id);
  const successChance = action.successChance ?? new Decimal(1);
  const success = roll.lte(successChance);
  const appliedReward = calculateActionRewardInternal(state, action, success, roll);
  const reputationMultiplier = getReputationActionMultiplier(state, action);
  const computeMultiplier = getActionComputeMultiplier(state, action);
  let reputationDelta = action.reputationEffect;
  const repMultipliers = getResearchReputationMultipliers(state);
  if (reputationDelta.gte(0)) {
    reputationDelta = reputationDelta.mul(repMultipliers.gain);
  } else {
    reputationDelta = reputationDelta.mul(repMultipliers.loss);
  }

  return {
    actionId: action.id,
    success,
    appliedCost: { ...action.baseCost },
    appliedReward,
    reputationDelta,
    reputationMultiplier,
    computeMultiplier,
    roll,
    successChance,
  };
}

function applyReward(state: GameState, reward: Partial<Record<ResourceKey, Decimal>>): void {
  for (const [key, amount] of Object.entries(reward) as Array<[ResourceKey, Decimal]>) {
    const sanitized = sanitizeResourceDelta(key, amount);
    state.resources[key] = state.resources[key].add(sanitized);
  }
}

function hasFreeComputeForAction(state: GameState, action: ManualActionDefinition): boolean {
  const computeCost = action.baseCost.compute;
  if (!computeCost || computeCost.lte(0)) return true;
  return getFreeCompute(state).gte(computeCost);
}

export function canExecuteAction(state: GameState, actionId: string): boolean {
  const action = ACTION_DEFINITIONS[actionId];
  if (!action) return false;
  if (!canAffordResources(state.resources, action.baseCost)) return false;
  if (!hasFreeComputeForAction(state, action)) return false;

  const cooldownMs = action.cooldownMs ?? 0;
  if (cooldownMs <= 0) return true;

  const last = state.manualActions.lastExecutedAtById[actionId] ?? 0;
  return new Decimal(state.timestamps.lastTickAt).gte(new Decimal(last + cooldownMs));
}

export function executeAction(state: GameState, actionId: string): ManualActionExecutionOutcome | null {
  if (!canExecuteAction(state, actionId)) return null;

  const action = ACTION_DEFINITIONS[actionId];
  if (!action) return null;

  state.resources = applyResourceCost(state.resources, action.baseCost);
  const outcome = resolveActionOutcome(action, state);
  applyReward(state, outcome.appliedReward);
  outcome.reputationDelta = applyActionReputationDelta(state, action);

  state.manualActions.totalExecutions += 1;
  state.manualActions.executedById[actionId] = (state.manualActions.executedById[actionId] ?? 0) + 1;
  state.manualActions.lastExecutedAtById[actionId] = state.timestamps.lastTickAt;

  return outcome;
}

export function meetsActionUnlockRequirements(
  state: GameState,
  requirements?: Partial<Record<string, number>>
): boolean {
  if (!requirements) return true;
  for (const [actionId, count] of Object.entries(requirements)) {
    if (count === undefined) continue;
    const executed = state.manualActions.executedById[actionId] ?? 0;
    if (executed < count) return false;
  }
  return true;
}

export function getActionExecutionCount(state: GameState, actionId: string): number {
  return state.manualActions.executedById[actionId] ?? 0;
}

export function createEmptyActionRewardMap(): Partial<Record<ResourceKey, Decimal>> {
  return createEmptyResourceMap();
}
