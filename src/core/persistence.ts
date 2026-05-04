import Decimal from "break_eternity.js";
import { state, pushLog } from "./state";
import { VERSION } from "./config";

const SAVE_KEY = "gray_protocol_save";

// ─── Serialisation helpers ───────────────────────────────────────────────────

interface SaveData {
  version: string;
  lastSaveTime: number;
  money: string;
  crypto: string;
  parity: string;
  computeTotal: string;
  computeUsed: string;
  nodes: [string, number][];
  upgrades: string[];
  nodeAllocations: [string, string][];
}

function serialise(): SaveData {
  return {
    version: state.version,
    lastSaveTime: Date.now(),
    money: state.money.toString(),
    crypto: state.crypto.toString(),
    parity: state.parity.toString(),
    computeTotal: state.compute.total.toString(),
    computeUsed: state.compute.used.toString(),
    nodes: Array.from(state.nodes.entries()),
    upgrades: Array.from(state.upgrades),
    nodeAllocations: Object.entries(state.nodeAllocations).map(
      ([k, v]) => [k, v.toString()] as [string, string]
    ),
  };
}

function hasNaN(data: SaveData): boolean {
  const nums = [data.money, data.crypto, data.parity, data.computeTotal, data.computeUsed];
  for (const s of nums) {
    const d = new Decimal(s);
    if (Decimal.isNaN(d)) return true;
  }
  for (const [, v] of data.nodeAllocations) {
    if (Decimal.isNaN(new Decimal(v))) return true;
  }
  return false;
}

function deserialise(data: SaveData): void {
  state.money = new Decimal(data.money);
  state.crypto = new Decimal(data.crypto);
  state.parity = new Decimal(data.parity);
  state.compute.total = new Decimal(data.computeTotal);
  state.compute.used = new Decimal(data.computeUsed);
  state.nodes = new Map(data.nodes);
  state.upgrades = new Set(data.upgrades);
  state.nodeAllocations = Object.fromEntries(
    data.nodeAllocations.map(([k, v]) => [k, new Decimal(v)])
  );
  state.lastSaveTime = data.lastSaveTime;
  state.version = data.version ?? VERSION;
}

// ─── localStorage save / load ────────────────────────────────────────────────

export function saveGame(): void {
  try {
    const json = JSON.stringify(serialise());
    localStorage.setItem(SAVE_KEY, json);
    pushLog("💾 Game saved.");
  } catch (err) {
    pushLog(`⚠ Save failed: ${String(err)}`);
  }
}

export function loadGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    const data: SaveData = JSON.parse(raw) as SaveData;
    if (hasNaN(data)) {
      pushLog("⚠ Save data contains NaN – load aborted.");
      return false;
    }

    deserialise(data);
    pushLog("📂 Game loaded.");
    return true;
  } catch (err) {
    pushLog(`⚠ Load failed: ${String(err)}`);
    return false;
  }
}

// ─── Base64 export / import ───────────────────────────────────────────────────

export function exportSave(): string {
  const json = JSON.stringify(serialise());
  return btoa(json);
}

export function importSave(encoded: string): boolean {
  try {
    const json = atob(encoded.trim());
    const data: SaveData = JSON.parse(json) as SaveData;

    if (hasNaN(data)) {
      pushLog("⚠ Import contains NaN values – import aborted.");
      return false;
    }

    deserialise(data);
    pushLog("📥 Save imported successfully.");
    return true;
  } catch (err) {
    pushLog(`⚠ Import failed: ${String(err)}`);
    return false;
  }
}
