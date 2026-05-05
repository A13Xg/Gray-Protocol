import Decimal from "break_eternity.js";
import type { GameState, ResourceKey } from "./types";
import { createInitialCumulativeResources, calculatePrestigeMultiplier } from "./prestige";

export function createInitialPrestigeState() {
  const level = new Decimal(0);
  return {
    level,
    multiplier: calculatePrestigeMultiplier(level),
    cumulativeResources: createInitialCumulativeResources(),
  };
}

export function recordResourceGain(gs: GameState, gains: Partial<Record<ResourceKey, Decimal>>): void {
  const next = { ...gs.prestige.cumulativeResources };
  for (const [key, value] of Object.entries(gains) as [ResourceKey, Decimal][]) {
    if (!value || value.lte(0)) continue;
    next[key] = next[key].add(value);
  }
  gs.prestige.cumulativeResources = next;
}
