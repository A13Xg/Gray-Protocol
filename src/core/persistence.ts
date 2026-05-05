// src/core/persistence.ts
import Decimal from "break_eternity.js";
import { state, pushLog, createInitialGameState } from "./state";
import { VERSION } from "./config";
import type { GameState, SaveFile } from "./types";
import { validateSaveFile } from "./validation";
import { repairResourceMap } from "./resources";

const SAVE_KEY = "gray_protocol_save_v2";

// ─── Codec ───────────────────────────────────────────────────────────────────

export interface SaveCodec {
  encodeValue(value: Decimal): string;
  decodeValue(encoded: string): Decimal;
}

export const base64Codec: SaveCodec = {
  encodeValue(value: Decimal): string {
    return btoa(value.toString());
  },
  decodeValue(encoded: string): Decimal {
    try {
      return new Decimal(atob(encoded));
    } catch {
      return new Decimal(0);
    }
  },
};

let activeCodec: SaveCodec = base64Codec;

export function setSaveCodec(codec: SaveCodec): void {
  activeCodec = codec;
}

// ─── Serialisation ───────────────────────────────────────────────────────────

interface SerializedResources {
  money: string;
  cryptoCurrency: string;
  computePower: string;
  reputationStanding: string;
}

interface SerializedActivityState {
  id: string;
  level: number;
  unlocked: boolean;
  active: boolean;
}

interface SerializedPrestigeLayerState {
  id: string;
  timesCompleted: number;
  totalRewardsEarned: string;
}

interface SerializedGameState {
  version: string;
  resources: SerializedResources;
  activities: Record<string, SerializedActivityState>;
  researchCompleted: string[];
  prestigeLayers: Record<string, SerializedPrestigeLayerState>;
  allocations: Record<string, string>;
  timestamps: {
    createdAt: number;
    lastSavedAt: number;
    lastTickAt: number;
  };
}

function serializeState(gs: GameState): SerializedGameState {
  return {
    version: gs.version,
    resources: {
      money: activeCodec.encodeValue(gs.resources.money),
      cryptoCurrency: activeCodec.encodeValue(gs.resources.cryptoCurrency),
      computePower: activeCodec.encodeValue(gs.resources.computePower),
      reputationStanding: activeCodec.encodeValue(gs.resources.reputationStanding),
    },
    activities: Object.fromEntries(
      Object.entries(gs.activities).map(([id, a]) => [id, { ...a }])
    ),
    researchCompleted: Array.from(gs.research.completed),
    prestigeLayers: Object.fromEntries(
      Object.entries(gs.prestige.layers).map(([id, p]) => [
        id,
        {
          id: p.id,
          timesCompleted: p.timesCompleted,
          totalRewardsEarned: activeCodec.encodeValue(p.totalRewardsEarned),
        },
      ])
    ),
    allocations: Object.fromEntries(
      Object.entries(gs.allocations.computePowerByActivityId).map(([id, v]) => [
        id,
        activeCodec.encodeValue(v),
      ])
    ),
    timestamps: { ...gs.timestamps, lastSavedAt: Date.now() },
  };
}

function deserializeState(data: SerializedGameState, target: GameState): void {
  target.version = data.version ?? VERSION;

  target.resources = {
    money: activeCodec.decodeValue(data.resources.money),
    cryptoCurrency: activeCodec.decodeValue(data.resources.cryptoCurrency),
    computePower: activeCodec.decodeValue(data.resources.computePower),
    reputationStanding: activeCodec.decodeValue(data.resources.reputationStanding),
  };
  target.resources = repairResourceMap(target.resources);

  const initialActs = createInitialGameState().activities;
  target.activities = { ...initialActs };
  for (const [id, a] of Object.entries(data.activities ?? {})) {
    const sa = a as SerializedActivityState;
    target.activities[id] = {
      id: sa.id,
      level: typeof sa.level === "number" ? sa.level : 0,
      unlocked: Boolean(sa.unlocked),
      active: Boolean(sa.active),
    };
  }

  target.research.completed = new Set(data.researchCompleted ?? []);

  target.prestige.layers = {};
  for (const [id, p] of Object.entries(data.prestigeLayers ?? {})) {
    const sp = p as SerializedPrestigeLayerState;
    target.prestige.layers[id] = {
      id: sp.id,
      timesCompleted: typeof sp.timesCompleted === "number" ? sp.timesCompleted : 0,
      totalRewardsEarned: activeCodec.decodeValue(sp.totalRewardsEarned),
    };
  }

  target.allocations.computePowerByActivityId = {};
  for (const [id, v] of Object.entries(data.allocations ?? {})) {
    target.allocations.computePowerByActivityId[id] = activeCodec.decodeValue(v as string);
  }

  target.timestamps = {
    createdAt: data.timestamps?.createdAt ?? Date.now(),
    lastSavedAt: data.timestamps?.lastSavedAt ?? Date.now(),
    lastTickAt: data.timestamps?.lastTickAt ?? Date.now(),
  };
}

function wrapSaveFile(serialized: SerializedGameState): SaveFile {
  const now = Date.now();
  return {
    version: VERSION,
    createdAt: serialized.timestamps.createdAt,
    updatedAt: now,
    payload: btoa(JSON.stringify(serialized)),
  };
}

function unwrapSaveFile(saveFile: SaveFile): SerializedGameState {
  return JSON.parse(atob(saveFile.payload)) as SerializedGameState;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function saveGame(): void {
  try {
    const serialized = serializeState(state);
    const saveFile = wrapSaveFile(serialized);
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveFile));
    state.timestamps.lastSavedAt = Date.now();
    pushLog("💾 Game saved.");
  } catch (err) {
    pushLog(`⚠ Save failed: ${String(err)}`);
  }
}

export function loadGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    const saveFile = JSON.parse(raw) as unknown;
    const vr = validateSaveFile(saveFile);
    if (!vr.valid) {
      pushLog(`⚠ Save invalid: ${vr.errors.join(", ")}`);
      return false;
    }

    const serialized = unwrapSaveFile(saveFile as SaveFile);
    deserializeState(serialized, state);
    pushLog("📂 Game loaded.");
    return true;
  } catch (err) {
    pushLog(`⚠ Load failed: ${String(err)}`);
    return false;
  }
}

export function exportSave(): string {
  const serialized = serializeState(state);
  const saveFile = wrapSaveFile(serialized);
  return btoa(JSON.stringify(saveFile));
}

export function importSave(raw: string): boolean {
  try {
    const saveFile = JSON.parse(atob(raw.trim())) as unknown;
    const vr = validateSaveFile(saveFile);
    if (!vr.valid) {
      pushLog(`⚠ Import invalid: ${vr.errors.join(", ")}`);
      return false;
    }
    const serialized = unwrapSaveFile(saveFile as SaveFile);
    deserializeState(serialized, state);
    pushLog("📥 Save imported successfully.");
    return true;
  } catch (err) {
    pushLog(`⚠ Import failed: ${String(err)}`);
    return false;
  }
}

export function validateSave(raw: unknown): boolean {
  const vr = validateSaveFile(raw);
  return vr.valid;
}
