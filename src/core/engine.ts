import Decimal, { type DecimalSource } from "break_eternity.js";
import { state, pushLog } from "./state";
import { GAME_CONFIG } from "./config";
import type { GameState, ResourceKey } from "./types";
import { addResourceMaps, applyResourceCost, canAffordResources, createEmptyResourceMap, subtractResourceMaps } from "./resources";
import { ACTIVITY_DEFINITIONS, getActiveActivityDeltas } from "./activities";
import { getResearchActivityYieldMultipliers, getResearchComputeEfficiencyMultiplier } from "./research";
import { getUpgradeComputeEfficiencyMultiplier, getUpgradeYieldMultipliers } from "./upgrades";

export type { ResourceKey };
export type MultiCost = Partial<Record<ResourceKey, DecimalSource>>;

export function getTotalAllocatedCompute(gs: GameState): Decimal {
  let total = new Decimal(0);
  for (const amount of Object.values(gs.allocations.computeByActivityId)) {
    total = total.add(amount);
  }
  return total;
}

export function getAvailableCompute(gs: GameState): Decimal {
  return Decimal.max(new Decimal(0), gs.resources.compute.sub(getTotalAllocatedCompute(gs)));
}

export function getComputeAllocationForActivity(gs: GameState, activityId: string): Decimal {
  return gs.allocations.computeByActivityId[activityId] ?? new Decimal(0);
}

export function setComputeAllocation(gs: GameState, activityId: string, amount: Decimal): boolean {
  if (!(activityId in ACTIVITY_DEFINITIONS)) return false;

  const sanitizedTarget = Decimal.max(new Decimal(0), amount);
  const current = getComputeAllocationForActivity(gs, activityId);
  const totalWithoutCurrent = getTotalAllocatedCompute(gs).sub(current);
  const maxAllowed = Decimal.max(new Decimal(0), gs.resources.compute.sub(totalWithoutCurrent));
  const clamped = Decimal.min(sanitizedTarget, maxAllowed);

  gs.allocations.computeByActivityId[activityId] = clamped;
  return clamped.eq(sanitizedTarget);
}

export function canAfford(costs: MultiCost): boolean {
  const mapped: Partial<Record<ResourceKey, Decimal>> = {};
  for (const [key, value] of Object.entries(costs)) {
    mapped[key as ResourceKey] = new Decimal(value as DecimalSource);
  }
  return canAffordResources(state.resources, mapped);
}

export function purchase(costs: MultiCost): boolean {
  const mapped: Partial<Record<ResourceKey, Decimal>> = {};
  for (const [key, value] of Object.entries(costs)) {
    mapped[key as ResourceKey] = new Decimal(value as DecimalSource);
  }
  if (!canAffordResources(state.resources, mapped)) return false;
  state.resources = applyResourceCost(state.resources, mapped);
  return true;
}

export function tick(gs: GameState, deltaMs: number): void {
  const deltaSeconds = new Decimal(deltaMs).div(1000);
  // Yield multipliers order: base/level/compute in activity -> upgrades -> research.
  const upgradeYieldMults = getUpgradeYieldMultipliers(gs);
  const researchYieldMults = getResearchActivityYieldMultipliers(gs);
  const combinedYieldMults: Record<string, Decimal> = { ...upgradeYieldMults };
  for (const [actId, mult] of Object.entries(researchYieldMults)) {
    combinedYieldMults[actId] = (combinedYieldMults[actId] ?? new Decimal(1)).mul(mult);
  }
  // Compute efficiency: research × upgrade
  const combinedComputeEfficiency = getResearchComputeEfficiencyMultiplier(gs)
    .mul(getUpgradeComputeEfficiencyMultiplier(gs));
  const activityDeltas = getActiveActivityDeltas(gs, deltaSeconds, combinedYieldMults, combinedComputeEfficiency);

  for (const activityId of Object.keys(activityDeltas)) {
    const activityState = gs.activities[activityId];
    const delta = activityDeltas[activityId];
    if (!activityState?.active) continue;

    if (!canAffordResources(gs.resources, delta.costs)) {
      activityState.active = false;
      continue;
    }

    gs.resources = addResourceMaps(gs.resources, delta.yields);
    gs.resources = subtractResourceMaps(gs.resources, delta.costs);
  }

  gs.timestamps.lastTickAt += deltaMs;
}

export function calculateOfflineProgress(gs: GameState, elapsedMs: number): void {
  const cappedMs = Math.min(elapsedMs, GAME_CONFIG.offlineCapMs);
  if (cappedMs <= 0) return;
  tick(gs, cappedMs);
}

export function processOffline(): void {
  const now = Date.now();
  const elapsedMs = now - state.timestamps.lastSavedAt;
  calculateOfflineProgress(state, elapsedMs);
  state.timestamps.lastSavedAt = now;
}

let lastTimestamp = 0;
let accumulatedMs = 0;
let rafHandle = 0;

function loop(timestamp: number): void {
  if (lastTimestamp === 0) {
    lastTimestamp = timestamp;
  }

  const frameDelta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  accumulatedMs += frameDelta;

  while (accumulatedMs >= GAME_CONFIG.tickRate) {
    tick(state, GAME_CONFIG.tickRate);
    accumulatedMs -= GAME_CONFIG.tickRate;
  }

  rafHandle = requestAnimationFrame(loop);
}

export function startGameLoop(): void {
  if (rafHandle) return;
  processOffline();
  rafHandle = requestAnimationFrame(loop);
  pushLog("Engine started");
}

export function stopGameLoop(): void {
  if (!rafHandle) return;
  cancelAnimationFrame(rafHandle);
  rafHandle = 0;
  lastTimestamp = 0;
  accumulatedMs = 0;
}

export function freeCompute(): Decimal {
  return getAvailableCompute(state);
}

export function assignCompute(nodeId: string, amount: DecimalSource): boolean {
  return setComputeAllocation(state, nodeId, new Decimal(amount));
}

export function unassignCompute(nodeId: string, amount?: DecimalSource): boolean {
  const current = getComputeAllocationForActivity(state, nodeId);
  if (current.lte(0)) return false;

  const toRemove = amount === undefined ? current : new Decimal(amount);
  const clampedRemove = Decimal.min(current, Decimal.max(new Decimal(0), toRemove));
  gsUnassign(state, nodeId, clampedRemove);
  return true;
}

function gsUnassign(gs: GameState, nodeId: string, amount: Decimal): void {
  const current = getComputeAllocationForActivity(gs, nodeId);
  gs.allocations.computeByActivityId[nodeId] = Decimal.max(new Decimal(0), current.sub(amount));
}

export function tickPreview(gs: GameState, deltaMs: number): GameState {
  const cloned: GameState = {
    ...gs,
    resources: createEmptyResourceMap(),
    activities: structuredClone(gs.activities),
    research: { completed: new Set(gs.research.completed) },
    prestige: {
      layers: Object.fromEntries(
        Object.entries(gs.prestige.layers).map(([id, layer]) => [
          id,
          {
            id: layer.id,
            timesCompleted: layer.timesCompleted,
            totalRewardsEarned: new Decimal(layer.totalRewardsEarned),
          },
        ])
      ),
    },
    allocations: {
      computeByActivityId: Object.fromEntries(
        Object.entries(gs.allocations.computeByActivityId).map(([id, value]) => [id, new Decimal(value)])
      ),
    },
    timestamps: { ...gs.timestamps },
    log: [...gs.log],
  };
  cloned.resources.money = new Decimal(gs.resources.money);
  cloned.resources.crypto = new Decimal(gs.resources.crypto);
  cloned.resources.compute = new Decimal(gs.resources.compute);
  cloned.resources.reputation = new Decimal(gs.resources.reputation);

  tick(cloned, deltaMs);
  return cloned;
}
