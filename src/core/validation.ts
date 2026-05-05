import Decimal from "break_eternity.js";
import type { GameState, SaveFile, SerializedGameState } from "./types";
import { ACTIVITY_DEFINITIONS } from "./activities";
import { PRESTIGE_DEFINITIONS } from "./prestige";
import { ALL_RESOURCE_KEYS } from "./resources";
import { RESEARCH_DEFINITIONS } from "./research";
import { isValidDecimal } from "./math";

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

export function validatePrestigeId(id: string): ValidationResult {
  if (!(id in PRESTIGE_DEFINITIONS)) {
    return { valid: false, errors: [`Unknown prestige id: ${id}`] };
  }
  return success();
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
