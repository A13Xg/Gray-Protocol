// src/core/engine.ts
import Decimal, { type DecimalSource } from "break_eternity.js";
import { state, pushLog } from "./state";
import { GAME_CONFIG } from "./config";
import type { GameState, ResourceKey } from "./types";
import { canAffordResources, applyResourceCost, addResourceMaps, subtractResourceMaps } from "./resources";
import { calculateActivityDelta, ACTIVITY_DEFINITIONS } from "./activities";
import { getResearchActivityYieldMultipliers } from "./research";

// ─── Legacy compat types (used by persistence and UI) ────────────────────────
export type { ResourceKey };
export type MultiCost = Partial<Record<ResourceKey, DecimalSource>>;

// ─── Compute Allocation ───────────────────────────────────────────────────────

export function getTotalAllocatedCompute(gs: GameState): Decimal {
  let total = new Decimal(0);
  for (const v of Object.values(gs.allocations.computePowerByActivityId)) {
    total = total.add(v);
  }
  return total;
}

export function getAvailableCompute(gs: GameState): Decimal {
  return gs.resources.computePower.sub(getTotalAllocatedCompute(gs));
}

export function getComputeAllocationForActivity(gs: GameState, activityId: string): Decimal {
  return gs.allocations.computePowerByActivityId[activityId] ?? new Decimal(0);
}

export function setComputeAllocation(gs: GameState, activityId: string, amount: Decimal): boolean {
  if (!(activityId in ACTIVITY_DEFINITIONS)) return false;
  const current = getComputeAllocationForActivity(gs, activityId);
  const diff = amount.sub(current);
  const available = getAvailableCompute(gs);
  if (diff.gt(available)) return false;
  gs.allocations.computePowerByActivityId[activityId] = Decimal.max(new Decimal(0), amount);
  return true;
}

// ─── Legacy compat helpers (used by old persistence) ─────────────────────────

export function canAfford(costs: MultiCost): boolean {
  const mapped: Partial<Record<ResourceKey, Decimal>> = {};
  for (const [k, v] of Object.entries(costs)) {
    mapped[k as ResourceKey] = new Decimal(v as DecimalSource);
  }
  return canAffordResources(state.resources, mapped);
}

export function purchase(costs: MultiCost): boolean {
  const mapped: Partial<Record<ResourceKey, Decimal>> = {};
  for (const [k, v] of Object.entries(costs)) {
    mapped[k as ResourceKey] = new Decimal(v as DecimalSource);
  }
  if (!canAffordResources(state.resources, mapped)) return false;
  state.resources = applyResourceCost(state.resources, mapped);
  return true;
}

// ─── Tick ─────────────────────────────────────────────────────────────────────

export function tick(gs: GameState, deltaMs: number): void {
  const deltaSeconds = deltaMs / 1000;
  const researchMults = getResearchActivityYieldMultipliers(gs);

  for (const activityId of Object.keys(gs.activities)) {
    const actState = gs.activities[activityId];
    if (!actState.active) continue;

    const delta = calculateActivityDelta(gs, activityId, deltaSeconds, researchMults);

    // Apply yields
    gs.resources = addResourceMaps(gs.resources, delta.yields as Record<string, Decimal>);

    // Apply costs/consumption
    for (const [key, amount] of Object.entries(delta.costs)) {
      const rk = key as ResourceKey;
      const cost = new Decimal(amount);
      if (cost.gt(0)) {
        if (gs.resources[rk].lt(cost)) {
          // Can't afford consumption, deactivate
          actState.active = false;
          pushLog(`⚠ ${activityId} deactivated: insufficient ${key}`);
          break;
        }
        gs.resources = subtractResourceMaps(gs.resources, { [rk]: cost } as Partial<Record<ResourceKey, Decimal>>);
      }
    }
  }

  gs.timestamps.lastTickAt = Date.now();
}

// ─── Offline Progress ─────────────────────────────────────────────────────────

export function calculateOfflineProgress(gs: GameState, elapsedMs: number): void {
  const cappedMs = Math.min(elapsedMs, GAME_CONFIG.offlineCapMs);
  if (cappedMs < 1000) return;

  const ticks = Math.floor(cappedMs / GAME_CONFIG.tickRate);
  const deltaPerTick = GAME_CONFIG.tickRate;
  for (let i = 0; i < ticks; i++) {
    tick(gs, deltaPerTick);
  }
  pushLog(`⚡ Offline catch-up: ${Math.floor(cappedMs / 1000)}s (${ticks} ticks)`);
}

// ─── Compat wrapper for old processOffline signature ─────────────────────────

export function processOffline(): void {
  const now = Date.now();
  const elapsed = now - state.timestamps.lastSavedAt;
  calculateOfflineProgress(state, elapsed);
  state.timestamps.lastSavedAt = now;
}

// ─── Game Loop ────────────────────────────────────────────────────────────────

let lastTimestamp = 0;
let accumulated = 0;
let rafHandle = 0;

function loop(timestamp: number): void {
  if (lastTimestamp === 0) lastTimestamp = timestamp;
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  accumulated += delta;

  while (accumulated >= GAME_CONFIG.tickRate) {
    try {
      tick(state, GAME_CONFIG.tickRate);
    } catch (err) {
      pushLog(`⛔ Game loop halted: ${String(err)}`);
      return;
    }
    accumulated -= GAME_CONFIG.tickRate;
  }

  rafHandle = requestAnimationFrame(loop);
}

export function startGameLoop(): void {
  if (rafHandle) return;
  processOffline();
  rafHandle = requestAnimationFrame(loop);
  pushLog("▶ Gray Protocol engine started.");
}

export function stopGameLoop(): void {
  if (rafHandle) {
    cancelAnimationFrame(rafHandle);
    rafHandle = 0;
    lastTimestamp = 0;
    accumulated = 0;
  }
}

// ─── Free/assign compute legacy shim ─────────────────────────────────────────

export function freeCompute(): Decimal {
  return getAvailableCompute(state);
}

export function assignCompute(nodeId: string, amount: DecimalSource): boolean {
  return setComputeAllocation(state, nodeId, new Decimal(amount));
}

export function unassignCompute(nodeId: string, amount?: DecimalSource): boolean {
  const current = getComputeAllocationForActivity(state, nodeId);
  if (current.lte(0)) return false;
  const toRemove = amount !== undefined ? new Decimal(amount) : current;
  const clamped = Decimal.min(toRemove, current);
  state.allocations.computePowerByActivityId[nodeId] = current.sub(clamped);
  return true;
}
