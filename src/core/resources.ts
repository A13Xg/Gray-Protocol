// src/core/resources.ts
import Decimal from "break_eternity.js";
import type { ResourceKey, ResourceMap } from "./types";
import { GAME_CONFIG } from "./config";
import { safeDecimal } from "./math";

export const RESOURCE_DISPLAY_METADATA = GAME_CONFIG.resources.display;

export const ALL_RESOURCE_KEYS: ResourceKey[] = [
  "money",
  "crypto",
  "compute",
  "reputation",
];

export function createEmptyResourceMap(): ResourceMap {
  return {
    money: new Decimal(0),
    crypto: new Decimal(0),
    compute: new Decimal(0),
    reputation: new Decimal(0),
  };
}

export function createInitialResourceMap(): ResourceMap {
  const s = GAME_CONFIG.resources.starting;
  return {
    money: new Decimal(s.money),
    crypto: new Decimal(s.crypto),
    compute: new Decimal(s.compute),
    reputation: new Decimal(s.reputation),
  };
}

export function addResourceMaps(a: ResourceMap, b: Partial<ResourceMap>): ResourceMap {
  const result = { ...a };
  for (const key of ALL_RESOURCE_KEYS) {
    const bVal = b[key];
    if (bVal !== undefined) {
      result[key] = a[key].add(bVal);
    }
  }
  return result;
}

export function subtractResourceMaps(a: ResourceMap, b: Partial<ResourceMap>): ResourceMap {
  const result = { ...a };
  for (const key of ALL_RESOURCE_KEYS) {
    const bVal = b[key];
    if (bVal !== undefined) {
      result[key] = a[key].sub(bVal);
    }
  }
  return result;
}

export function multiplyResourceMap(map: ResourceMap, multiplier: Decimal): ResourceMap {
  const result = {} as ResourceMap;
  for (const key of ALL_RESOURCE_KEYS) {
    result[key] = map[key].mul(multiplier);
  }
  return result;
}

export function canAffordResources(resources: ResourceMap, cost: Partial<ResourceMap>): boolean {
  for (const key of ALL_RESOURCE_KEYS) {
    const c = cost[key];
    if (c !== undefined && new Decimal(c).gt(0) && resources[key].lt(c)) return false;
  }
  return true;
}

export function applyResourceCost(resources: ResourceMap, cost: Partial<ResourceMap>): ResourceMap {
  if (!canAffordResources(resources, cost)) {
    throw new Error("Cannot afford resource cost");
  }
  return subtractResourceMaps(resources, cost);
}

export function validateResourceMap(map: Partial<ResourceMap>): boolean {
  for (const key of ALL_RESOURCE_KEYS) {
    const v = map[key];
    if (v === undefined) continue;
    const d = new Decimal(v);
    if (Decimal.isNaN(d) || !d.isFinite()) return false;
  }
  return true;
}

export function repairResourceMap(map: ResourceMap): ResourceMap {
  const result = {} as ResourceMap;
  for (const key of ALL_RESOURCE_KEYS) {
    result[key] = safeDecimal(map[key], 0);
  }
  return result;
}
