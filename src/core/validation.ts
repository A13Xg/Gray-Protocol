// src/core/validation.ts
import Decimal from "break_eternity.js";
import type { GameState, ResourceMap } from "./types";
import { ALL_RESOURCE_KEYS } from "./resources";
import { ACTIVITY_DEFINITIONS } from "./activities";
import { RESEARCH_DEFINITIONS } from "./research";
import { PRESTIGE_DEFINITIONS } from "./prestige";
import { isValidDecimal } from "./math";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDecimalValue(value: unknown, label: string): ValidationResult {
  const errors: string[] = [];
  if (!isValidDecimal(value)) {
    errors.push(`${label}: invalid Decimal value (${String(value)})`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateResourceMap(map: ResourceMap): ValidationResult {
  const errors: string[] = [];
  for (const key of ALL_RESOURCE_KEYS) {
    const v = map[key];
    if (!isValidDecimal(v)) {
      errors.push(`Resource ${key}: invalid value`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateActivityId(id: string): ValidationResult {
  const valid = id in ACTIVITY_DEFINITIONS;
  return {
    valid,
    errors: valid ? [] : [`Unknown activity id: ${id}`],
  };
}

export function validateResearchId(id: string): ValidationResult {
  const valid = id in RESEARCH_DEFINITIONS;
  return {
    valid,
    errors: valid ? [] : [`Unknown research id: ${id}`],
  };
}

export function validatePrestigeId(id: string): ValidationResult {
  const valid = id in PRESTIGE_DEFINITIONS;
  return {
    valid,
    errors: valid ? [] : [`Unknown prestige id: ${id}`],
  };
}

export function validateAllocationTotals(state: GameState): ValidationResult {
  const errors: string[] = [];
  let total = new Decimal(0);
  for (const [, amount] of Object.entries(state.allocations.computePowerByActivityId)) {
    total = total.add(amount);
  }
  if (total.gt(state.resources.computePower)) {
    errors.push(`Allocation total (${total.toString()}) exceeds available computePower (${state.resources.computePower.toString()})`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateGameState(state: GameState): ValidationResult {
  const errors: string[] = [];
  const resResult = validateResourceMap(state.resources);
  errors.push(...resResult.errors);
  const allocResult = validateAllocationTotals(state);
  errors.push(...allocResult.errors);
  return { valid: errors.length === 0, errors };
}

export function validateSaveFile(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Save file is not an object"] };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj["version"] !== "string") errors.push("Missing or invalid version");
  if (typeof obj["createdAt"] !== "number") errors.push("Missing or invalid createdAt");
  if (typeof obj["updatedAt"] !== "number") errors.push("Missing or invalid updatedAt");
  if (typeof obj["payload"] !== "string") errors.push("Missing or invalid payload");
  return { valid: errors.length === 0, errors };
}
