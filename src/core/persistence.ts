// src/core/persistence.ts
import { state, createInitialGameState, pushLog } from "./state";
import { VERSION, GAME_CONFIG } from "./config";
import type { GameState, SaveFile, SerializedGameState } from "./types";
import { deserializeResourceMap, serializeResourceMap, deserializeDecimal, serializeDecimal } from "./math";
import { repairResourceMap } from "./resources";
import { nowMs } from "./clock";
import { migrateSaveEnvelope, migrateSerializedPayload } from "./migrations";

const SAVE_KEY = "gray_protocol_save_v1";

function serializeNodeLevels(levels: GameState["nodes"]["levels"]): Record<string, string> {
  return Object.fromEntries(
    Object.entries(levels).map(([id, level]) => [id, serializeDecimal(deserializeDecimal(String(level)))])
  );
}

function deserializeNodeLevels(levels: Record<string, string | number> | undefined): Record<string, number> {
  if (!levels) return {};
  return Object.fromEntries(
    Object.entries(levels).map(([id, level]) => {
      const parsed = typeof level === "number" ? level : deserializeDecimal(level).toNumber();
      return [id, Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1];
    })
  );
}

function serializeState(gs: GameState): SerializedGameState {
  const saveTime = nowMs();
  return {
    version: gs.version,
    resources: serializeResourceMap(gs.resources),
    timestamps: { ...gs.timestamps, lastSavedAt: saveTime },
    nodes: {
      levels: serializeNodeLevels(gs.nodes.levels),
    },
  };
}

function deserializeState(serialized: SerializedGameState, target: GameState): void {
  const currentTime = nowMs();
  target.version = typeof serialized.version === "string" ? serialized.version : VERSION;
  target.resources = repairResourceMap(deserializeResourceMap(serialized.resources));
  target.timestamps = {
    createdAt: serialized.timestamps?.createdAt ?? currentTime,
    lastSavedAt: serialized.timestamps?.lastSavedAt ?? currentTime,
    lastTickAt: serialized.timestamps?.lastTickAt ?? currentTime,
  };
  target.nodes = {
    levels: deserializeNodeLevels(serialized.nodes?.levels),
  };
}

export function saveGame(): void {
  try {
    const currentTime = nowMs();
    const payload = JSON.stringify(serializeState(state));
    const file: SaveFile = {
      version: GAME_CONFIG.serialization.saveVersion,
      createdAt: state.timestamps.createdAt,
      updatedAt: currentTime,
      payload: btoa(payload),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(file));
    state.timestamps.lastSavedAt = currentTime;
    pushLog("Game saved");
  } catch (e) {
    pushLog(`Save failed: ${String(e)}`);
  }
}

export function loadGame(): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const file = migrateSaveEnvelope(JSON.parse(raw) as SaveFile);
    if (!file?.payload) return;
    const serialized = migrateSerializedPayload(JSON.parse(atob(file.payload)));
    deserializeState(serialized, state);
    pushLog("Game loaded");
  } catch (e) {
    pushLog(`Load failed: ${String(e)}`);
  }
}

export function exportSave(): string {
  const currentTime = nowMs();
  const payload = JSON.stringify(serializeState(state));
  const file: SaveFile = {
    version: GAME_CONFIG.serialization.saveVersion,
    createdAt: state.timestamps.createdAt,
    updatedAt: currentTime,
    payload: btoa(payload),
  };
  return btoa(JSON.stringify(file));
}

export function importSave(encoded: string): boolean {
  try {
    const file = migrateSaveEnvelope(JSON.parse(atob(encoded)) as SaveFile);
    if (!file?.payload) return false;
    const serialized = migrateSerializedPayload(JSON.parse(atob(file.payload)));
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
