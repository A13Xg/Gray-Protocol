// src/core/state.ts
import { shallowReactive } from "vue";
import type { GameState } from "./types";
import { VERSION } from "./config";
import { createInitialResourceMap } from "./resources";

export function createInitialGameState(): GameState {
  return {
    version: VERSION,
    resources: createInitialResourceMap(),
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
