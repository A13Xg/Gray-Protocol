// src/core/state.ts
import { shallowReactive } from "vue";
import type { GameState } from "./types";
import { VERSION } from "./config";
import { createInitialResourceMap } from "./resources";
import { createInitialPrestigeState } from "./progression";
import { nowMs } from "./clock";

export function createInitialGameState(): GameState {
  const t0 = nowMs();
  return {
    version: VERSION,
    resources: createInitialResourceMap(),
    timestamps: {
      createdAt: t0,
      lastSavedAt: t0,
      lastTickAt: t0,
    },
    log: [],
    generators: {
      levels: {},
      timedProgress: {},
      passiveRemainderMs: {},
    },
    talents: {
      runUnlockedById: {},
      permanentUnlockedById: {},
    },
    prestige: createInitialPrestigeState(),
  };
}

export const state: GameState = shallowReactive<GameState>(createInitialGameState());

export function pushLog(message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  state.log = [`[${timestamp}] ${message}`, ...state.log.slice(0, 99)];
}
