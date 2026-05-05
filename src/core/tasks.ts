import Decimal from "break_eternity.js";
import type { GameState, TaskDefinition, TaskType } from "./types";
import { GAME_CONFIG } from "./config";
import { getActionExecutionCount } from "./actions";
import { getReputationAlignment } from "./reputation";

export const TASK_DEFINITIONS: Record<string, TaskDefinition> = {
  earnSeedMoney: {
    id: "earnSeedMoney",
    name: "Build A Cash Buffer",
    description: "Accumulate enough money to fund your first real operations.",
    type: GAME_CONFIG.tasks.earnSeedMoney.type,
    requirement: GAME_CONFIG.tasks.earnSeedMoney.requirement,
    reward: GAME_CONFIG.tasks.earnSeedMoney.reward,
    recommended: GAME_CONFIG.tasks.earnSeedMoney.recommended,
    pathHint: GAME_CONFIG.tasks.earnSeedMoney.pathHint,
  },
  mineSeedCrypto: {
    id: "mineSeedCrypto",
    name: "Bootstrap Crypto",
    description: "Reach a healthy crypto reserve from manual and passive methods.",
    type: GAME_CONFIG.tasks.mineSeedCrypto.type,
    requirement: GAME_CONFIG.tasks.mineSeedCrypto.requirement,
    reward: GAME_CONFIG.tasks.mineSeedCrypto.reward,
    recommended: GAME_CONFIG.tasks.mineSeedCrypto.recommended,
    pathHint: GAME_CONFIG.tasks.mineSeedCrypto.pathHint,
  },
  whitehatCredibility: {
    id: "whitehatCredibility",
    name: "Earn Whitehat Credibility",
    description: "Push your reputation into trusted positive territory.",
    type: GAME_CONFIG.tasks.whitehatCredibility.type,
    requirement: GAME_CONFIG.tasks.whitehatCredibility.requirement,
    reward: GAME_CONFIG.tasks.whitehatCredibility.reward,
    recommended: GAME_CONFIG.tasks.whitehatCredibility.recommended,
    pathHint: GAME_CONFIG.tasks.whitehatCredibility.pathHint,
  },
  blackhatNotoriety: {
    id: "blackhatNotoriety",
    name: "Build Notoriety",
    description: "Drive reputation deeply negative to specialize in blackhat operations.",
    type: GAME_CONFIG.tasks.blackhatNotoriety.type,
    requirement: GAME_CONFIG.tasks.blackhatNotoriety.requirement,
    reward: GAME_CONFIG.tasks.blackhatNotoriety.reward,
    recommended: GAME_CONFIG.tasks.blackhatNotoriety.recommended,
    pathHint: GAME_CONFIG.tasks.blackhatNotoriety.pathHint,
  },
  passwordPractice: {
    id: "passwordPractice",
    name: "Practice Intrusions",
    description: "Perform repeated password attempts to understand risk/reward patterns.",
    type: GAME_CONFIG.tasks.passwordPractice.type,
    requirement: GAME_CONFIG.tasks.passwordPractice.requirement,
    reward: GAME_CONFIG.tasks.passwordPractice.reward,
    recommended: GAME_CONFIG.tasks.passwordPractice.recommended,
    pathHint: GAME_CONFIG.tasks.passwordPractice.pathHint,
  },
  firstActivityLevel: {
    id: "firstActivityLevel",
    name: "Automate The First Loop",
    description: "Buy your first activity level and start passive progress.",
    type: GAME_CONFIG.tasks.firstActivityLevel.type,
    requirement: GAME_CONFIG.tasks.firstActivityLevel.requirement,
    reward: GAME_CONFIG.tasks.firstActivityLevel.reward,
    recommended: GAME_CONFIG.tasks.firstActivityLevel.recommended,
    pathHint: GAME_CONFIG.tasks.firstActivityLevel.pathHint,
  },
  firstUpgrade: {
    id: "firstUpgrade",
    name: "Fund Compute Research",
    description: "Complete initial compute research to multiply future output.",
    type: GAME_CONFIG.tasks.firstUpgrade.type,
    requirement: GAME_CONFIG.tasks.firstUpgrade.requirement,
    reward: GAME_CONFIG.tasks.firstUpgrade.reward,
    recommended: GAME_CONFIG.tasks.firstUpgrade.recommended,
    pathHint: GAME_CONFIG.tasks.firstUpgrade.pathHint,
  },
};

export function getTaskDefinition(taskId: string): TaskDefinition | undefined {
  return TASK_DEFINITIONS[taskId];
}

function isResourceThresholdComplete(state: GameState, task: TaskDefinition): boolean {
  const resource = task.requirement.resource;
  const amount = task.requirement.amount;
  if (!resource || !amount) return false;
  return state.resources[resource].gte(amount);
}

function isReputationThresholdComplete(state: GameState, task: TaskDefinition): boolean {
  const amount = task.requirement.amount;
  if (!amount) return false;
  if (amount.gte(0)) {
    return state.resources.reputation.gte(amount);
  }
  return state.resources.reputation.lte(amount);
}

function isActionCountComplete(state: GameState, task: TaskDefinition): boolean {
  const actionId = task.requirement.actionId;
  const count = task.requirement.count;
  if (!actionId || count === undefined) return false;
  return getActionExecutionCount(state, actionId) >= count;
}

function isActivityLevelComplete(state: GameState, task: TaskDefinition): boolean {
  const activityId = task.requirement.activityId;
  const level = task.requirement.level;
  if (!activityId || level === undefined) return false;
  return (state.activities[activityId]?.level ?? 0) >= level;
}

function isResearchCompletionComplete(state: GameState, task: TaskDefinition): boolean {
  const researchId = task.requirement.researchId;
  if (!researchId) return false;
  return state.research.completed.has(researchId);
}

export function isTaskComplete(state: GameState, taskId: string): boolean {
  const task = TASK_DEFINITIONS[taskId];
  if (!task) return false;

  const handlers: Record<TaskType, (s: GameState, t: TaskDefinition) => boolean> = {
    resourceThreshold: isResourceThresholdComplete,
    reputationThreshold: isReputationThresholdComplete,
    actionCount: isActionCountComplete,
    activityLevel: isActivityLevelComplete,
    researchCompletion: isResearchCompletionComplete,
  };

  return handlers[task.type](state, task);
}

function getTaskProgressRatio(state: GameState, task: TaskDefinition): Decimal {
  if (task.type === "resourceThreshold") {
    const resource = task.requirement.resource;
    const amount = task.requirement.amount;
    if (!resource || !amount || amount.lte(0)) return new Decimal(0);
    return Decimal.min(new Decimal(1), state.resources[resource].div(amount));
  }

  if (task.type === "reputationThreshold") {
    const amount = task.requirement.amount;
    if (!amount || amount.eq(0)) return new Decimal(0);
    if (amount.gt(0)) {
      return Decimal.min(new Decimal(1), Decimal.max(new Decimal(0), state.resources.reputation.div(amount)));
    }
    return Decimal.min(new Decimal(1), Decimal.max(new Decimal(0), state.resources.reputation.abs().div(amount.abs())));
  }

  if (task.type === "actionCount") {
    const actionId = task.requirement.actionId;
    const count = task.requirement.count;
    if (!actionId || count === undefined || count <= 0) return new Decimal(0);
    return Decimal.min(new Decimal(1), new Decimal(getActionExecutionCount(state, actionId)).div(count));
  }

  if (task.type === "activityLevel") {
    const activityId = task.requirement.activityId;
    const level = task.requirement.level;
    if (!activityId || level === undefined || level <= 0) return new Decimal(0);
    const current = state.activities[activityId]?.level ?? 0;
    return Decimal.min(new Decimal(1), new Decimal(current).div(level));
  }

  if (task.type === "researchCompletion") {
    const researchId = task.requirement.researchId;
    if (!researchId) return new Decimal(0);
    return state.research.completed.has(researchId) ? new Decimal(1) : new Decimal(0);
  }

  return new Decimal(0);
}

function isTaskLikelyImpossibleForCurrentPath(state: GameState, task: TaskDefinition): boolean {
  if (task.type !== "reputationThreshold") return false;
  const amount = task.requirement.amount;
  if (!amount) return false;

  const alignment = getReputationAlignment(state.resources.reputation);
  const extremeWhitehat = state.resources.reputation.gte(GAME_CONFIG.reputation.whitehatThreshold.mul(2));
  const extremeBlackhat = state.resources.reputation.lte(GAME_CONFIG.reputation.blackhatThreshold.mul(2));

  if (amount.gt(0) && alignment === "blackhat" && extremeBlackhat) return true;
  if (amount.lt(0) && alignment === "whitehat" && extremeWhitehat) return true;
  return false;
}

export function getRecommendedTasks(state: GameState): TaskDefinition[] {
  const candidates = Object.values(TASK_DEFINITIONS)
    .filter((task) => !isTaskComplete(state, task.id))
    .filter((task) => !isTaskLikelyImpossibleForCurrentPath(state, task));

  candidates.sort((a, b) => {
    const aProgress = getTaskProgressRatio(state, a);
    const bProgress = getTaskProgressRatio(state, b);

    if (a.recommended !== b.recommended) {
      return a.recommended ? -1 : 1;
    }

    if (!aProgress.eq(bProgress)) {
      return bProgress.gt(aProgress) ? 1 : -1;
    }

    return a.id.localeCompare(b.id);
  });

  return candidates.slice(0, 5);
}

export function getTaskProgressPercent(state: GameState, taskId: string): string {
  const task = TASK_DEFINITIONS[taskId];
  if (!task) return "0%";
  const ratio = getTaskProgressRatio(state, task);
  const percent = ratio.mul(100).toFixed(0);
  return `${percent}%`;
}

export function isTaskClaimed(state: GameState, taskId: string): boolean {
  return state.tasks.claimedById[taskId] === true;
}

export function canClaimTask(state: GameState, taskId: string): boolean {
  return !isTaskClaimed(state, taskId) && isTaskComplete(state, taskId);
}

export function claimTask(state: GameState, taskId: string): boolean {
  const task = TASK_DEFINITIONS[taskId];
  if (!task) return false;
  if (!canClaimTask(state, taskId)) return false;

  for (const [resourceKey, amount] of Object.entries(task.reward)) {
    state.resources[resourceKey as keyof typeof state.resources] = state.resources[
      resourceKey as keyof typeof state.resources
    ].add(amount as Decimal);
  }

  state.tasks.claimedById[taskId] = true;
  return true;
}

export function getCompletedUnclaimedTasks(state: GameState): TaskDefinition[] {
  return Object.values(TASK_DEFINITIONS).filter((task) => canClaimTask(state, task.id));
}
