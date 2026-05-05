import Decimal from "break_eternity.js";
import { state, pushLog, createInitialGameState } from "./state";
import { GAME_CONFIG, VERSION } from "./config";
import type { GameState, SaveFile, SerializedGameState, SerializedResourceMap } from "./types";
import { deserializeDecimal, deserializeResourceMap, serializeDecimal, serializeResourceMap } from "./math";
import { repairResourceMap } from "./resources";
import { validateSaveFile, validateSerializedGameState } from "./validation";
import { UPGRADE_DEFINITIONS } from "./upgrades";
import { RESEARCH_DEFINITIONS } from "./research";

const SAVE_KEY = "gray_protocol_save_v3";
const LEGACY_SAVE_KEYS = ["gray_protocol_save_v2"];

export interface SaveCodec {
  encodePayload(payload: string): string;
  decodePayload(payload: string): string;
}

export const base64PayloadCodec: SaveCodec = {
  encodePayload(payload: string): string {
    return btoa(payload);
  },
  decodePayload(payload: string): string {
    return atob(payload);
  },
};

let activeCodec: SaveCodec = base64PayloadCodec;

export function setSaveCodec(codec: SaveCodec): void {
  activeCodec = codec;
}

function serializeState(gs: GameState): SerializedGameState {
  return {
    version: gs.version,
    resources: serializeResourceMap(gs.resources),
    activities: Object.fromEntries(Object.entries(gs.activities).map(([id, activity]) => [id, { ...activity }])),
    researchCompleted: Array.from(gs.research.completed),
    prestigeLayers: Object.fromEntries(
      Object.entries(gs.prestige.layers).map(([id, layer]) => [
        id,
        {
          id: layer.id,
          timesCompleted: layer.timesCompleted,
          totalRewardsEarned: serializeDecimal(layer.totalRewardsEarned),
        },
      ])
    ),
    allocations: {
      computeByActivityId: Object.fromEntries(
        Object.entries(gs.allocations.computeByActivityId).map(([activityId, amount]) => [
          activityId,
          serializeDecimal(amount),
        ])
      ),
    },
    upgrades: {
      levelsById: { ...gs.upgrades.levelsById },
    },
    timestamps: {
      ...gs.timestamps,
      lastSavedAt: Date.now(),
    },
  };
}

function migrateLegacyResourceKeys(raw: Record<string, unknown>): SerializedResourceMap {
  const fromLegacy = (legacyKey: string): string | undefined => {
    const candidate = raw[legacyKey];
    return typeof candidate === "string" ? candidate : undefined;
  };

  return {
    money: typeof raw["money"] === "string" ? (raw["money"] as string) : "0",
    crypto:
      typeof raw["crypto"] === "string"
        ? (raw["crypto"] as string)
        : fromLegacy("cryptoCurrency") ?? "0",
    compute:
      typeof raw["compute"] === "string"
        ? (raw["compute"] as string)
        : fromLegacy("computePower") ?? "0",
    reputation:
      typeof raw["reputation"] === "string"
        ? (raw["reputation"] as string)
        : fromLegacy("reputationStanding") ?? "0",
  };
}

function repairSerializedState(raw: SerializedGameState): SerializedGameState {
  const repairedResources = migrateLegacyResourceKeys(raw.resources as unknown as Record<string, unknown>);

  const allocationsRaw = raw.allocations?.computeByActivityId;
  let repairedAllocations: Record<string, string> = {};

  if (allocationsRaw && typeof allocationsRaw === "object") {
    repairedAllocations = Object.fromEntries(
      Object.entries(allocationsRaw).map(([activityId, amount]) => {
        const serialized = typeof amount === "string" ? amount : "0";
        return [activityId, serializeDecimal(deserializeDecimal(serialized))];
      })
    );
  }

  return {
    ...raw,
    version: typeof raw.version === "string" ? raw.version : VERSION,
    resources: {
      money: serializeDecimal(deserializeDecimal(repairedResources.money)),
      crypto: serializeDecimal(deserializeDecimal(repairedResources.crypto)),
      compute: serializeDecimal(deserializeDecimal(repairedResources.compute)),
      reputation: serializeDecimal(deserializeDecimal(repairedResources.reputation)),
    },
    activities: raw.activities ?? {},
    researchCompleted: Array.isArray(raw.researchCompleted)
      ? raw.researchCompleted.filter((id) => typeof id === "string" && id in RESEARCH_DEFINITIONS)
      : [],
    prestigeLayers: raw.prestigeLayers ?? {},
    allocations: { computeByActivityId: repairedAllocations },
    upgrades: {
      levelsById: repairUpgradeLevels(raw.upgrades?.levelsById),
    },
    timestamps: {
      createdAt: raw.timestamps?.createdAt ?? Date.now(),
      lastSavedAt: raw.timestamps?.lastSavedAt ?? Date.now(),
      lastTickAt: raw.timestamps?.lastTickAt ?? Date.now(),
    },
  };
}
function repairUpgradeLevels(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!(id in UPGRADE_DEFINITIONS)) continue;
    const level = typeof value === "number" ? Math.floor(value) : 0;
    const def = UPGRADE_DEFINITIONS[id];
    result[id] = Math.max(0, Math.min(level, def.maxLevel));
  }
  return result;
}

function deserializeState(serialized: SerializedGameState, target: GameState): void {
  const repaired = repairSerializedState(serialized);
  target.version = repaired.version;
  target.resources = repairResourceMap(deserializeResourceMap(repaired.resources));

  const initialActivities = createInitialGameState().activities;
  target.activities = { ...initialActivities, ...repaired.activities };

  target.research.completed = new Set(repaired.researchCompleted);
  target.prestige.layers = Object.fromEntries(
    Object.entries(repaired.prestigeLayers).map(([id, layer]) => [
      id,
      {
        id: layer.id,
        timesCompleted: layer.timesCompleted,
        totalRewardsEarned: deserializeDecimal(layer.totalRewardsEarned),
      },
    ])
  );

  target.allocations.computeByActivityId = Object.fromEntries(
    Object.entries(repaired.allocations.computeByActivityId).map(([activityId, amount]) => [
      activityId,
      deserializeDecimal(amount),
    ])
  );

  target.upgrades.levelsById = { ...repaired.upgrades.levelsById };

  target.timestamps = {
    ...repaired.timestamps,
  };
}

function wrapSaveFile(serialized: SerializedGameState): SaveFile {
  const now = Date.now();
  return {
    version: GAME_CONFIG.serialization.saveVersion,
    createdAt: serialized.timestamps.createdAt,
    updatedAt: now,
    payload: activeCodec.encodePayload(JSON.stringify(serialized)),
  };
}

function unwrapSaveFile(saveFile: SaveFile): SerializedGameState {
  return JSON.parse(activeCodec.decodePayload(saveFile.payload)) as SerializedGameState;
}

export function saveGame(): void {
  try {
    const serialized = serializeState(state);
    const validation = validateSerializedGameState(serialized);
    if (!validation.valid) {
      pushLog(`Save aborted: ${validation.errors.join(", ")}`);
      return;
    }

    const saveFile = wrapSaveFile(serialized);
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveFile));
    state.timestamps.lastSavedAt = Date.now();
    pushLog("Game saved");
  } catch (error) {
    pushLog(`Save failed: ${String(error)}`);
  }
}

export function loadGame(): boolean {
  try {
    let raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_SAVE_KEYS) {
        raw = localStorage.getItem(legacyKey);
        if (raw) break;
      }
    }
    if (!raw) return false;

    const parsed = JSON.parse(raw) as unknown;
    const fileValidation = validateSaveFile(parsed);
    if (!fileValidation.valid) {
      pushLog(`Save invalid: ${fileValidation.errors.join(", ")}`);
      return false;
    }

    const serialized = unwrapSaveFile(parsed as SaveFile);
    const validation = validateSerializedGameState(serialized);
    if (!validation.valid) {
      pushLog(`Save payload invalid: ${validation.errors.join(", ")}`);
      return false;
    }

    deserializeState(serialized, state);
    pushLog("Game loaded");
    return true;
  } catch (error) {
    pushLog(`Load failed: ${String(error)}`);
    return false;
  }
}

export function exportSave(): string {
  const serialized = serializeState(state);
  const wrapped = wrapSaveFile(serialized);
  return btoa(JSON.stringify(wrapped));
}

export function importSave(raw: string): boolean {
  try {
    const wrapped = JSON.parse(atob(raw.trim())) as unknown;
    const fileValidation = validateSaveFile(wrapped);
    if (!fileValidation.valid) {
      pushLog(`Import invalid: ${fileValidation.errors.join(", ")}`);
      return false;
    }

    const serialized = unwrapSaveFile(wrapped as SaveFile);
    const validation = validateSerializedGameState(serialized);
    if (!validation.valid) {
      pushLog(`Import payload invalid: ${validation.errors.join(", ")}`);
      return false;
    }

    deserializeState(serialized, state);
    pushLog("Save imported");
    return true;
  } catch (error) {
    pushLog(`Import failed: ${String(error)}`);
    return false;
  }
}

export function validateSave(raw: unknown): boolean {
  const fileValidation = validateSaveFile(raw);
  if (!fileValidation.valid) return false;

  try {
    const serialized = unwrapSaveFile(raw as SaveFile);
    return validateSerializedGameState(serialized).valid;
  } catch {
    return false;
  }
}

export function previewSerializedState(gs: GameState): SerializedGameState {
  return serializeState(gs);
}

export function serializeDecimalForDebug(value: Decimal): string {
  return serializeDecimal(value);
}
