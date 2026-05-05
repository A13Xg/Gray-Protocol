import Decimal, { type DecimalSource } from "break_eternity.js";
import { state, pushLog } from "./state";
import { TICK_RATE, OFFLINE_CAP } from "./config";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ResourceKey = "money" | "crypto" | "parity";

export type MultiCost = Partial<Record<ResourceKey, DecimalSource>>;

// ─── NaN Guard ───────────────────────────────────────────────────────────────

function assertNotNaN(value: Decimal, context: string): void {
  if (Decimal.isNaN(value)) {
    pushLog(`⛔ ENGINE HALT: NaN detected in ${context}`);
    throw new Error(`NaN detected in ${context}`);
  }
}

// ─── Resource Helpers ────────────────────────────────────────────────────────

function getResource(key: ResourceKey): Decimal {
  return state[key] as Decimal;
}

function setResource(key: ResourceKey, value: Decimal): void {
  assertNotNaN(value, `setResource(${key})`);
  (state as Record<ResourceKey, Decimal>)[key] = value;
}

// ─── Consumable Cost Logic ────────────────────────────────────────────────────

/** Returns true if the state has enough of every resource in the cost map. */
export function canAfford(costs: MultiCost): boolean {
  for (const [key, amount] of Object.entries(costs) as [ResourceKey, DecimalSource][]) {
    const cost = new Decimal(amount);
    if (cost.gt(0) && getResource(key).lt(cost)) return false;
  }
  return true;
}

/**
 * Deduct (or add, for negative costs) each resource in the cost map.
 * Returns false without modifying state if the player cannot afford it.
 */
export function purchase(costs: MultiCost): boolean {
  if (!canAfford(costs)) return false;

  for (const [key, amount] of Object.entries(costs) as [ResourceKey, DecimalSource][]) {
    const cost = new Decimal(amount);
    const current = getResource(key);
    const next = current.sub(cost);
    assertNotNaN(next, `purchase(${key})`);
    setResource(key, next);
  }
  return true;
}

// ─── Compute Allocation ───────────────────────────────────────────────────────

/** Free compute available for assignment. */
export function freeCompute(): Decimal {
  return state.compute.total.sub(state.compute.used);
}

/**
 * Assign `amount` compute to `nodeId`.
 * Returns false if not enough free compute.
 */
export function assignCompute(nodeId: string, amount: DecimalSource): boolean {
  const requested = new Decimal(amount);
  if (freeCompute().lt(requested)) return false;

  const current = new Decimal(state.nodeAllocations[nodeId] ?? 0);
  const next = current.add(requested);
  assertNotNaN(next, `assignCompute(${nodeId})`);

  state.nodeAllocations[nodeId] = next;
  state.compute.used = state.compute.used.add(requested);
  return true;
}

/**
 * Unassign `amount` compute from `nodeId` (or all if amount omitted).
 */
export function unassignCompute(nodeId: string, amount?: DecimalSource): boolean {
  const current = new Decimal(state.nodeAllocations[nodeId] ?? 0);
  if (current.lte(0)) return false;

  const toRemove = amount !== undefined ? new Decimal(amount) : current;
  const clamped = Decimal.min(toRemove, current);

  state.nodeAllocations[nodeId] = current.sub(clamped);
  state.compute.used = Decimal.max(new Decimal(0), state.compute.used.sub(clamped));
  return true;
}

// ─── Tick Logic ──────────────────────────────────────────────────────────────

/** One game tick: passive income etc. */
function tick(_deltaSeconds: number): void {
  // Placeholder: passive income can be wired here per-node in the future.
}

// ─── Offline Catch-up ─────────────────────────────────────────────────────────

export function processOffline(): void {
  const now = Date.now();
  const elapsedMs = now - state.lastSaveTime;
  const elapsedSec = Math.min(elapsedMs / 1000, OFFLINE_CAP);

  if (elapsedSec >= 1) {
    const ticks = Math.floor((elapsedSec * 1000) / TICK_RATE);
    const deltaPerTick = TICK_RATE / 1000;
    for (let i = 0; i < ticks; i++) {
      tick(deltaPerTick);
    }
    pushLog(`⚡ Offline catch-up: ${Math.floor(elapsedSec)}s (${ticks} ticks)`);
  }

  state.lastSaveTime = now;
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

  while (accumulated >= TICK_RATE) {
    try {
      tick(TICK_RATE / 1000);
    } catch (err) {
      pushLog(`⛔ Game loop halted: ${String(err)}`);
      return; // halt the loop on NaN or other engine errors
    }
    accumulated -= TICK_RATE;
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
