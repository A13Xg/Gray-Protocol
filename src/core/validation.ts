import Decimal from "break_eternity.js";
import type { GameState, SaveFile, SerializedGameState } from "./types";
import { ACTIVITY_DEFINITIONS } from "./activities";
import { PRESTIGE_DEFINITIONS } from "./prestige";
import { ALL_RESOURCE_KEYS } from "./resources";
import { RESEARCH_DEFINITIONS } from "./research";
import { isValidDecimal } from "./math";
import { UPGRADE_DEFINITIONS } from "./upgrades";
import { ACTION_DEFINITIONS } from "./actions";
import { TASK_DEFINITIONS } from "./tasks";

const SCIENTIFIC_OR_ZERO = /^-?(?:0|\d+(?:\.\d+)?e[+-]?\d+)$/i;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function success(): ValidationResult {
  return { valid: true, errors: [] };
}

export function validateDecimalValue(value: unknown, label: string): ValidationResult {
  if (!isValidDecimal(value)) {
    return { valid: false, errors: [`${label} has invalid Decimal value`] };
  }
  return success();
}

export function validateScientificString(value: unknown, label: string): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, errors: [`${label} must be a string`] };
  }
  if (!SCIENTIFIC_OR_ZERO.test(value.trim())) {
    return { valid: false, errors: [`${label} must be scientific notation or 0`] };
  }
  return success();
}

export function validateCanonicalResourceKeys(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Resources must be an object"] };
  }

  const resourceObject = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const requiredKey of ALL_RESOURCE_KEYS) {
    if (!(requiredKey in resourceObject)) {
      errors.push(`Missing canonical resource key: ${requiredKey}`);
    }
  }

  for (const key of Object.keys(resourceObject)) {
    if (!ALL_RESOURCE_KEYS.includes(key as (typeof ALL_RESOURCE_KEYS)[number])) {
      errors.push(`Unexpected resource key: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateResourceMap(resources: GameState["resources"]): ValidationResult {
  const errors: string[] = [];
  for (const key of ALL_RESOURCE_KEYS) {
    const value = resources[key];
    if (!isValidDecimal(value)) {
      errors.push(`Resource ${key} is not a valid Decimal`);
      continue;
    }
    if (Decimal.isNaN(value)) {
      errors.push(`Resource ${key} is NaN`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateActivityId(id: string): ValidationResult {
  if (!(id in ACTIVITY_DEFINITIONS)) {
    return { valid: false, errors: [`Unknown activity id: ${id}`] };
  }
  return success();
}

export function validateResearchId(id: string): ValidationResult {
  if (!(id in RESEARCH_DEFINITIONS)) {
    return { valid: false, errors: [`Unknown research id: ${id}`] };
  }
  return success();
}

function detectResearchCycles(): string[] {
  const cycles: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function dfs(nodeId: string): void {
    if (visited.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      const cycleStart = stack.indexOf(nodeId);
      if (cycleStart >= 0) {
        const cyclePath = [...stack.slice(cycleStart), nodeId].join(" -> ");
        cycles.push(`Research cycle detected: ${cyclePath}`);
      }
      return;
    }

    visiting.add(nodeId);
    stack.push(nodeId);

    const def = RESEARCH_DEFINITIONS[nodeId];
    if (def) {
      for (const prerequisite of def.prerequisites) {
        if (prerequisite in RESEARCH_DEFINITIONS) {
          dfs(prerequisite);
        }
      }
    }

    stack.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  for (const nodeId of Object.keys(RESEARCH_DEFINITIONS)) {
    dfs(nodeId);
  }

  return cycles;
}

export function validateResearchDefinitions(): ValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();
  const defIds = new Set<string>();
  const activityUnlockTargets = new Set<string>();
  const upgradeUnlockTargets = new Set<string>();

  for (const [nodeId, def] of Object.entries(RESEARCH_DEFINITIONS)) {
    if (ids.has(nodeId)) {
      errors.push(`Duplicate research key detected: ${nodeId}`);
    }
    ids.add(nodeId);

    if (defIds.has(def.id)) {
      errors.push(`Duplicate research id field detected: ${def.id}`);
    }
    defIds.add(def.id);

    if (def.id !== nodeId) {
      errors.push(`Research definition id mismatch: key=${nodeId}, id=${def.id}`);
    }

    for (const [resourceKey, costValue] of Object.entries(def.cost)) {
      if (!ALL_RESOURCE_KEYS.includes(resourceKey as (typeof ALL_RESOURCE_KEYS)[number])) {
        errors.push(`Research ${nodeId} cost uses invalid resource key: ${resourceKey}`);
      }
      if (resourceKey === "compute") {
        errors.push(`Research ${nodeId} cost uses compute; compute is allocation-only and cannot be spent`);
      }
      if (!isValidDecimal(costValue)) {
        errors.push(`Research ${nodeId} cost.${resourceKey} has invalid Decimal value`);
      }
    }

    for (const prerequisite of def.prerequisites) {
      if (prerequisite === nodeId) {
        errors.push(`Research ${nodeId} cannot depend on itself`);
      }
      if (!(prerequisite in RESEARCH_DEFINITIONS)) {
        errors.push(`Research ${nodeId} has missing prerequisite: ${prerequisite}`);
      }
    }

    for (const effect of def.effects) {
      if (!isValidDecimal(effect.value)) {
        errors.push(`Research ${nodeId} effect ${effect.type} has invalid Decimal value`);
      }

      if (effect.type === "activityYieldMultiplier" || effect.type === "activityUnlock") {
        if (!effect.target || !(effect.target in ACTIVITY_DEFINITIONS)) {
          errors.push(`Research ${nodeId} effect ${effect.type} references invalid activity: ${String(effect.target)}`);
        } else if (effect.type === "activityUnlock") {
          activityUnlockTargets.add(effect.target);
        }
      }

      if (effect.type === "upgradeUnlock") {
        if (!effect.target || !(effect.target in UPGRADE_DEFINITIONS)) {
          errors.push(`Research ${nodeId} effect upgradeUnlock references invalid upgrade: ${String(effect.target)}`);
        } else {
          upgradeUnlockTargets.add(effect.target);
        }
      }

      if (effect.type === "resourceMultiplier") {
        if (!effect.target || !ALL_RESOURCE_KEYS.includes(effect.target as (typeof ALL_RESOURCE_KEYS)[number])) {
          errors.push(`Research ${nodeId} effect resourceMultiplier uses invalid resource key: ${String(effect.target)}`);
        }
      }
    }
  }

  for (const [activityId, def] of Object.entries(ACTIVITY_DEFINITIONS)) {
    if (def.requiresResearchUnlock && !activityUnlockTargets.has(activityId)) {
      errors.push(`Activity ${activityId} requires research unlock but no activityUnlock effect targets it`);
    }
  }

  for (const [upgradeId, def] of Object.entries(UPGRADE_DEFINITIONS)) {
    if (def.requiresResearchUnlock && !upgradeUnlockTargets.has(upgradeId)) {
      errors.push(`Upgrade ${upgradeId} requires research unlock but no upgradeUnlock effect targets it`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateResearchGraph(): ValidationResult {
  const cycleErrors = detectResearchCycles();
  return { valid: cycleErrors.length === 0, errors: cycleErrors };
}

export function validatePrestigeId(id: string): ValidationResult {
  if (!(id in PRESTIGE_DEFINITIONS)) {
    return { valid: false, errors: [`Unknown prestige id: ${id}`] };
  }
  return success();
}

export function validateUpgradeId(id: string): ValidationResult {
  if (!(id in UPGRADE_DEFINITIONS)) {
    return { valid: false, errors: [`Unknown upgrade id: ${id}`] };
  }
  return success();
}

export function validateActionId(id: string): ValidationResult {
  if (!(id in ACTION_DEFINITIONS)) {
    return { valid: false, errors: [`Unknown action id: ${id}`] };
  }
  return success();
}

export function validateActivityDefinitions(): ValidationResult {
  const errors: string[] = [];

  for (const [activityId, def] of Object.entries(ACTIVITY_DEFINITIONS)) {
    // Check baseCost for compute
    for (const [key, amount] of Object.entries(def.baseCost)) {
      if (key === "compute") {
        errors.push(`Activity ${activityId} baseCost uses compute, which is allocation-only and cannot be spent`);
      }
      if (!isValidDecimal(amount)) {
        errors.push(`Activity ${activityId} baseCost.${key} has invalid Decimal value`);
      }
    }

    // Check consumesPerSecond for compute
    if (def.consumesPerSecond) {
      for (const [key, amount] of Object.entries(def.consumesPerSecond)) {
        if (key === "compute") {
          errors.push(`Activity ${activityId} consumesPerSecond uses compute, which is allocation-only and cannot be spent`);
        }
        if (!isValidDecimal(amount)) {
          errors.push(`Activity ${activityId} consumesPerSecond.${key} has invalid Decimal value`);
        }
      }
    }

    // Check baseYieldPerSecond for valid decimals
    for (const [key, amount] of Object.entries(def.baseYieldPerSecond)) {
      if (!isValidDecimal(amount)) {
        errors.push(`Activity ${activityId} baseYieldPerSecond.${key} has invalid Decimal value`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateTaskId(id: string): ValidationResult {
  if (!(id in TASK_DEFINITIONS)) {
    return { valid: false, errors: [`Unknown task id: ${id}`] };
  }
  return success();
}

export function validateUpgradeDefinitions(): ValidationResult {
  const errors: string[] = [];

  for (const [upgradeId, def] of Object.entries(UPGRADE_DEFINITIONS)) {
    if (def.maxLevel <= 0) {
      errors.push(`Upgrade ${upgradeId} maxLevel must be > 0`);
    }

    if (!isValidDecimal(def.costScalingRate)) {
      errors.push(`Upgrade ${upgradeId} has invalid costScalingRate`);
    }

    if (def.scope === "activity") {
      if (!def.activityId) {
        errors.push(`Upgrade ${upgradeId} has scope=activity but no activityId`);
      } else if (!(def.activityId in ACTIVITY_DEFINITIONS)) {
        errors.push(`Upgrade ${upgradeId} references unknown activityId ${def.activityId}`);
      }
    }

    if (def.scope === "path" && !def.path) {
      errors.push(`Upgrade ${upgradeId} has scope=path but no path`);
    }

    if (def.prerequisites) {
      for (const prerequisite of def.prerequisites) {
        if (!(prerequisite in UPGRADE_DEFINITIONS)) {
          errors.push(`Upgrade ${upgradeId} has unknown prerequisite ${prerequisite}`);
        }
      }
    }

    for (const [key, amount] of Object.entries(def.cost)) {
      if (!ALL_RESOURCE_KEYS.includes(key as (typeof ALL_RESOURCE_KEYS)[number])) {
        errors.push(`Upgrade ${upgradeId} cost uses invalid resource key ${key}`);
      }
      if (key === "compute") {
        errors.push(`Upgrade ${upgradeId} cost uses compute, which is allocation-only and cannot be spent`);
      }
      if (!isValidDecimal(amount)) {
        errors.push(`Upgrade ${upgradeId} cost.${key} has invalid Decimal value`);
      }
    }

    for (const effect of def.effects) {
      if (!isValidDecimal(effect.value)) {
        errors.push(`Upgrade ${upgradeId} effect ${effect.type} has invalid Decimal value`);
      }

      if (effect.type === "activityYieldMultiplier" && def.scope === "activity" && def.activityId) {
        if (!(def.activityId in ACTIVITY_DEFINITIONS)) {
          errors.push(`Upgrade ${upgradeId} activityYieldMultiplier references unknown activity ${def.activityId}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateAllocationTotals(state: GameState): ValidationResult {
  let totalAllocated = new Decimal(0);
  for (const [activityId, amount] of Object.entries(state.allocations.computeByActivityId)) {
    if (!(activityId in ACTIVITY_DEFINITIONS)) {
      return { valid: false, errors: [`Allocation has unknown activity id: ${activityId}`] };
    }
    if (!isValidDecimal(amount)) {
      return { valid: false, errors: [`Allocation for ${activityId} is invalid`] };
    }
    totalAllocated = totalAllocated.add(amount);
  }

  if (totalAllocated.gt(state.resources.compute)) {
    return {
      valid: false,
      errors: [
        `Total compute allocation ${totalAllocated.toString()} exceeds available ${state.resources.compute.toString()}`,
      ],
    };
  }

  return success();
}

export function validateGameState(state: GameState): ValidationResult {
  const errors: string[] = [];

  const researchDefinitionsValidation = validateResearchDefinitions();
  if (!researchDefinitionsValidation.valid) errors.push(...researchDefinitionsValidation.errors);

  const researchGraphValidation = validateResearchGraph();
  if (!researchGraphValidation.valid) errors.push(...researchGraphValidation.errors);

  const upgradeDefinitionValidation = validateUpgradeDefinitions();
  if (!upgradeDefinitionValidation.valid) errors.push(...upgradeDefinitionValidation.errors);

  const activityDefinitionValidation = validateActivityDefinitions();
  if (!activityDefinitionValidation.valid) errors.push(...activityDefinitionValidation.errors);

  const resourceValidation = validateResourceMap(state.resources);
  if (!resourceValidation.valid) errors.push(...resourceValidation.errors);

  for (const activityId of Object.keys(state.activities)) {
    const activityValidation = validateActivityId(activityId);
    if (!activityValidation.valid) errors.push(...activityValidation.errors);
  }

  for (const nodeId of state.research.completed) {
    const researchValidation = validateResearchId(nodeId);
    if (!researchValidation.valid) errors.push(...researchValidation.errors);
  }

  for (const prestigeId of Object.keys(state.prestige.layers)) {
    const prestigeValidation = validatePrestigeId(prestigeId);
    if (!prestigeValidation.valid) errors.push(...prestigeValidation.errors);
  }

  for (const [upgradeId, level] of Object.entries(state.upgrades.levelsById)) {
    const upgradeValidation = validateUpgradeId(upgradeId);
    if (!upgradeValidation.valid) {
      errors.push(...upgradeValidation.errors);
      continue;
    }
    const def = UPGRADE_DEFINITIONS[upgradeId];
    if (level < 0 || level > def.maxLevel) {
      errors.push(`Upgrade ${upgradeId} level ${level} is out of bounds [0, ${def.maxLevel}]`);
    }
  }

  for (const [actionId, count] of Object.entries(state.manualActions.executedById)) {
    const actionValidation = validateActionId(actionId);
    if (!actionValidation.valid) {
      errors.push(...actionValidation.errors);
    }
    if (!Number.isInteger(count) || count < 0) {
      errors.push(`Action ${actionId} executed count must be a non-negative integer`);
    }
  }

  for (const [actionId, lastExecutedAt] of Object.entries(state.manualActions.lastExecutedAtById)) {
    const actionValidation = validateActionId(actionId);
    if (!actionValidation.valid) {
      errors.push(...actionValidation.errors);
    }
    if (!Number.isFinite(lastExecutedAt) || lastExecutedAt < 0) {
      errors.push(`Action ${actionId} lastExecutedAt must be a non-negative number`);
    }
  }

  if (!Number.isInteger(state.manualActions.totalExecutions) || state.manualActions.totalExecutions < 0) {
    errors.push("manualActions.totalExecutions must be a non-negative integer");
  }

  for (const taskId of Object.keys(state.tasks.claimedById)) {
    const taskValidation = validateTaskId(taskId);
    if (!taskValidation.valid) {
      errors.push(...taskValidation.errors);
    }
  }

  const allocationValidation = validateAllocationTotals(state);
  if (!allocationValidation.valid) errors.push(...allocationValidation.errors);

  return { valid: errors.length === 0, errors };
}

export function validateSerializedGameState(serialized: unknown): ValidationResult {
  if (!serialized || typeof serialized !== "object") {
    return { valid: false, errors: ["Serialized payload must be an object"] };
  }

  const payload = serialized as SerializedGameState;
  const errors: string[] = [];

  const resourceKeyValidation = validateCanonicalResourceKeys(payload.resources);
  if (!resourceKeyValidation.valid) errors.push(...resourceKeyValidation.errors);

  if (payload.resources) {
    for (const key of ALL_RESOURCE_KEYS) {
      const scientificValidation = validateScientificString(payload.resources[key], `resources.${key}`);
      if (!scientificValidation.valid) errors.push(...scientificValidation.errors);
    }
  }

  if (!payload.allocations || typeof payload.allocations !== "object") {
    errors.push("allocations is missing");
  } else {
    for (const [activityId, amount] of Object.entries(payload.allocations.computeByActivityId ?? {})) {
      if (!(activityId in ACTIVITY_DEFINITIONS)) {
        errors.push(`allocations has unknown activity id: ${activityId}`);
      }
      const scientificValidation = validateScientificString(amount, `allocations.computeByActivityId.${activityId}`);
      if (!scientificValidation.valid) errors.push(...scientificValidation.errors);
    }
  }

  for (const [layerId, layer] of Object.entries(payload.prestigeLayers ?? {})) {
    if (!(layerId in PRESTIGE_DEFINITIONS)) {
      errors.push(`prestigeLayers has unknown id: ${layerId}`);
    }
    const scientificValidation = validateScientificString(
      layer.totalRewardsEarned,
      `prestigeLayers.${layerId}.totalRewardsEarned`
    );
    if (!scientificValidation.valid) errors.push(...scientificValidation.errors);
  }

  for (const [upgradeId, level] of Object.entries(payload.upgrades?.levelsById ?? {})) {
    if (!(upgradeId in UPGRADE_DEFINITIONS)) {
      errors.push(`upgrades has unknown id: ${upgradeId}`);
      continue;
    }
    if (typeof level !== "number" || !Number.isInteger(level) || level < 0) {
      errors.push(`upgrades.${upgradeId} level must be a non-negative integer`);
    }
  }

  for (const nodeId of payload.researchCompleted ?? []) {
    if (!(nodeId in RESEARCH_DEFINITIONS)) {
      errors.push(`researchCompleted has unknown id: ${nodeId}`);
    }
  }

  for (const [actionId, count] of Object.entries(payload.manualActions?.executedById ?? {})) {
    if (!(actionId in ACTION_DEFINITIONS)) {
      errors.push(`manualActions.executedById has unknown action id: ${actionId}`);
    }
    if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
      errors.push(`manualActions.executedById.${actionId} must be a non-negative integer`);
    }
  }

  for (const [actionId, lastExecutedAt] of Object.entries(payload.manualActions?.lastExecutedAtById ?? {})) {
    if (!(actionId in ACTION_DEFINITIONS)) {
      errors.push(`manualActions.lastExecutedAtById has unknown action id: ${actionId}`);
    }
    if (typeof lastExecutedAt !== "number" || !Number.isFinite(lastExecutedAt) || lastExecutedAt < 0) {
      errors.push(`manualActions.lastExecutedAtById.${actionId} must be a non-negative number`);
    }
  }

  if (
    payload.manualActions &&
    (typeof payload.manualActions.totalExecutions !== "number" ||
      !Number.isInteger(payload.manualActions.totalExecutions) ||
      payload.manualActions.totalExecutions < 0)
  ) {
    errors.push("manualActions.totalExecutions must be a non-negative integer");
  }

  for (const [taskId, claimed] of Object.entries(payload.tasks?.claimedById ?? {})) {
    if (!(taskId in TASK_DEFINITIONS)) {
      errors.push(`tasks.claimedById has unknown task id: ${taskId}`);
    }
    if (typeof claimed !== "boolean") {
      errors.push(`tasks.claimedById.${taskId} must be a boolean`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateSaveFile(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Save file must be an object"] };
  }

  const save = raw as SaveFile;
  const errors: string[] = [];

  if (typeof save.version !== "string") errors.push("Missing or invalid version");
  if (typeof save.createdAt !== "number") errors.push("Missing or invalid createdAt");
  if (typeof save.updatedAt !== "number") errors.push("Missing or invalid updatedAt");
  if (typeof save.payload !== "string" || save.payload.length === 0) {
    errors.push("Missing or invalid payload");
  }

  return { valid: errors.length === 0, errors };
}
