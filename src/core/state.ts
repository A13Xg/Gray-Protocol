// src/core/state.ts
import { shallowReactive } from "vue";
import type { GameState, ActivityState, PrestigeLayerState } from "./types";
import { VERSION } from "./config";
import { createInitialResourceMap } from "./resources";
import { ACTIVITY_DEFINITIONS } from "./activities";

function createInitialActivities(): Record<string, ActivityState> {
  const activities: Record<string, ActivityState> = {};
  for (const id of Object.keys(ACTIVITY_DEFINITIONS)) {
    activities[id] = { id, level: 0, unlocked: false, active: false };
  }
  return activities;
}

function createInitialPrestigeLayers(): Record<string, PrestigeLayerState> {
  return {};
}

export function createInitialGameState(): GameState {
  return {
    version: VERSION,
    resources: createInitialResourceMap(),
    activities: createInitialActivities(),
    research: { completed: new Set() },
    prestige: { layers: createInitialPrestigeLayers() },
    allocations: { computeByActivityId: {} },
    upgrades: { levelsById: {} },
    timestamps: {
      createdAt: Date.now(),
      lastSavedAt: Date.now(),
      lastTickAt: Date.now(),
    },
    log: [],
  };
}

export const state: GameState = shallowReactive<GameState>(createInitialGameState());

export function pushLog(message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  state.log = [`[${timestamp}] ${message}`, ...state.log.slice(0, 99)];
}
