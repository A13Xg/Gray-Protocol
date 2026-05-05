// src/core/persistence.ts
import { state, createInitialGameState, pushLog } from "./state";
import { VERSION, GAME_CONFIG } from "./config";
import type { GameState, SaveFile, SerializedGameState } from "./types";
import { deserializeResourceMap, serializeResourceMap } from "./math";
import { repairResourceMap } from "./resources";

const SAVE_KEY = "gray_protocol_save_v1";

function serializeState(gs: GameState): SerializedGameState {
  return {
    version: gs.version,
    resources: serializeResourceMap(gs.resources),
    timestamps: { ...gs.timestamps, lastSavedAt: Date.now() },
  };
}

function deserializeState(serialized: SerializedGameState, target: GameState): void {
  target.version = typeof serialized.version === "string" ? serialized.version : VERSION;
  target.resources = repairResourceMap(deserializeResourceMap(serialized.resources));
  target.timestamps = {
    createdAt: serialized.timestamps?.createdAt ?? Date.now(),
    lastSavedAt: serialized.timestamps?.lastSavedAt ?? Date.now(),
    lastTickAt: serialized.timestamps?.lastTickAt ?? Date.now(),
  };
}

export function saveGame(): void {
  try {
    const payload = JSON.stringify(serializeState(state));
    const file: SaveFile = {
      version: GAME_CONFIG.serialization.saveVersion,
      createdAt: state.timestamps.createdAt,
      updatedAt: Date.now(),
      payload: btoa(payload),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(file));
    state.timestamps.lastSavedAt = Date.now();
    pushLog("Game saved");
  } catch (e) {
    pushLog(`Save failed: ${String(e)}`);
  }
}

export function loadGame(): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const file = JSON.parse(raw) as SaveFile;
    if (!file?.payload) return;
    const serialized = JSON.parse(atob(file.payload)) as SerializedGameState;
    deserializeState(serialized, state);
    pushLog("Game loaded");
  } catch (e) {
    pushLog(`Load failed: ${String(e)}`);
  }
}

export function exportSave(): string {
  const payload = JSON.stringify(serializeState(state));
  const file: SaveFile = {
    version: GAME_CONFIG.serialization.saveVersion,
    createdAt: state.timestamps.createdAt,
    updatedAt: Date.now(),
    payload: btoa(payload),
  };
  return btoa(JSON.stringify(file));
}

export function importSave(encoded: string): boolean {
  try {
    const file = JSON.parse(atob(encoded)) as SaveFile;
    if (!file?.payload) return false;
    const serialized = JSON.parse(atob(file.payload)) as SerializedGameState;
    deserializeState(serialized, state);
    pushLog("Save imported");
    return true;
  } catch {
    pushLog("Import failed: invalid save data");
    return false;
  }
}

export function hasSavedData(): boolean {
  return typeof localStorage !== "undefined" && localStorage.getItem(SAVE_KEY) !== null;
}

export function forceDeleteAllSavedData(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(SAVE_KEY);
  }
  const fresh = createInitialGameState();
  Object.assign(state, fresh);
  pushLog("Save data deleted, state reset");
}

export function previewSerializedState(gs: GameState): SerializedGameState {
  return serializeState(gs);
}
