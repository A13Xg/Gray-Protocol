// src/core/validation.ts
import Decimal from "break_eternity.js";
import type { GameState } from "./types";
import { ALL_RESOURCE_KEYS } from "./resources";
import { isValidDecimal } from "./math";
import { GAME_CONFIG } from "./config";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function success(): ValidationResult {
  return { valid: true, errors: [] };
}

function fail(error: string): ValidationResult {
  return { valid: false, errors: [error] };
}

export function validateResourceMap(resources: GameState["resources"]): ValidationResult {
  const errors: string[] = [];
  for (const key of ALL_RESOURCE_KEYS) {
    const value = resources[key];
    if (!isValidDecimal(value)) {
      errors.push(`Resource ${key} is not a valid Decimal`);
      continue;
    }
    if (Decimal.isNaN(value as Decimal)) {
      errors.push(`Resource ${key} is NaN`);
      continue;
    }
    // Only non-reputation consumable resources must be non-negative
    if (key !== "reputation" && (value as Decimal).lt(0)) {
      errors.push(`Resource ${key} is negative`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateGameState(gs: GameState): ValidationResult {
  const errors: string[] = [];

  const resourceCheck = validateResourceMap(gs.resources);
  if (!resourceCheck.valid) errors.push(...resourceCheck.errors);

  if (!Number.isFinite(gs.timestamps.createdAt) || gs.timestamps.createdAt < 0) {
    errors.push("timestamps.createdAt is invalid");
  }
  if (!Number.isFinite(gs.timestamps.lastSavedAt) || gs.timestamps.lastSavedAt < 0) {
    errors.push("timestamps.lastSavedAt is invalid");
  }
  if (!Number.isFinite(gs.timestamps.lastTickAt) || gs.timestamps.lastTickAt < 0) {
    errors.push("timestamps.lastTickAt is invalid");
  }

  if (!isValidDecimal(gs.prestige.level)) {
    errors.push("prestige.level is invalid");
  }
  if (!isValidDecimal(gs.prestige.multiplier)) {
    errors.push("prestige.multiplier is invalid");
  }

  const cumulativeCheck = validateResourceMap(gs.prestige.cumulativeResources);
  if (!cumulativeCheck.valid) {
    errors.push(...cumulativeCheck.errors.map((e) => `prestige.cumulativeResources: ${e}`));
  }

  return { valid: errors.length === 0, errors };
}

export function validateCryptoPrice(price: unknown): ValidationResult {
  const { basePrice, minMultiplier, maxMultiplier } = GAME_CONFIG.cryptoConversion;
  if (!isValidDecimal(price)) return fail("Crypto price is not a valid Decimal");
  const p = new Decimal(price as Decimal);
  const minPrice = new Decimal(basePrice).mul(minMultiplier);
  const maxPrice = new Decimal(basePrice).mul(maxMultiplier);
  if (p.lt(minPrice) || p.gt(maxPrice)) {
    return fail(`Crypto price ${p.toFixed(4)} is outside bounds [${minPrice}, ${maxPrice}]`);
  }
  return success();
}

export function validateSerializedGameState(serialized: unknown): ValidationResult {
  if (!serialized || typeof serialized !== "object") {
    return fail("Serialized state must be an object");
  }
  const s = serialized as Record<string, unknown>;

  if (typeof s.version !== "string") {
    return fail("version must be a string");
  }

  const resources = s.resources as Record<string, unknown> | undefined;
  if (!resources || typeof resources !== "object") {
    return fail("resources must be an object");
  }

  const SCIENTIFIC_OR_ZERO = /^-?(?:0|\d+(?:\.\d+)?e[+-]?\d+)$/i;
  for (const key of ALL_RESOURCE_KEYS) {
    const val = resources[key];
    if (typeof val !== "string") {
      return fail(`resources.${key} must be a string`);
    }
    if (val !== "0" && !SCIENTIFIC_OR_ZERO.test(val.trim())) {
      return fail(`resources.${key} is not in scientific notation`);
    }
    try {
      const d = new Decimal((val as string).trim());
      if (!d.isFinite() || Decimal.isNaN(d)) {
        return fail(`resources.${key} is not a valid number`);
      }
    } catch {
      return fail(`resources.${key} is not parseable`);
    }
  }

  if (s.prestige && typeof s.prestige === "object") {
    const prestige = s.prestige as Record<string, unknown>;
    for (const field of ["level", "multiplier"]) {
      const val = prestige[field];
      if (typeof val !== "string") return fail(`prestige.${field} must be a string`);
      if (val !== "0" && !SCIENTIFIC_OR_ZERO.test(val.trim())) {
        return fail(`prestige.${field} is not in scientific notation`);
      }
    }

    const cumulative = prestige.cumulativeResources as Record<string, unknown> | undefined;
    if (!cumulative || typeof cumulative !== "object") {
      return fail("prestige.cumulativeResources must be an object");
    }
    for (const key of ALL_RESOURCE_KEYS) {
      const val = cumulative[key];
      if (typeof val !== "string") {
        return fail(`prestige.cumulativeResources.${key} must be a string`);
      }
      if (val !== "0" && !SCIENTIFIC_OR_ZERO.test(val.trim())) {
        return fail(`prestige.cumulativeResources.${key} is not in scientific notation`);
      }
      try {
        const d = new Decimal((val as string).trim());
        if (!d.isFinite() || Decimal.isNaN(d)) {
          return fail(`prestige.cumulativeResources.${key} is not a valid number`);
        }
      } catch {
        return fail(`prestige.cumulativeResources.${key} is not parseable`);
      }
    }
  }

  return success();
}
