import { shallowReactive } from "vue";
import Decimal from "break_eternity.js";
import { INITIAL_RESOURCES, VERSION } from "./config";

export interface ComputeState {
  total: Decimal;
  used: Decimal;
}

export interface NodeAllocation {
  [nodeId: string]: Decimal;
}

export interface GameState {
  // Resources
  money: Decimal;
  crypto: Decimal;
  parity: Decimal;
  compute: ComputeState;

  // Progress
  nodes: Map<string, number>; // nodeId → level
  upgrades: Set<string>; // unlocked perk IDs

  // Allocation map (how much compute each node is using)
  nodeAllocations: NodeAllocation;

  // Meta
  lastSaveTime: number; // Unix timestamp in ms
  version: string;

  // System log
  log: string[];
}

export const state: GameState = shallowReactive<GameState>({
  money: new Decimal(INITIAL_RESOURCES.money),
  crypto: new Decimal(INITIAL_RESOURCES.crypto),
  parity: new Decimal(INITIAL_RESOURCES.parity),
  compute: {
    total: new Decimal(INITIAL_RESOURCES.computeTotal),
    used: new Decimal(INITIAL_RESOURCES.computeUsed),
  },

  nodes: new Map(),
  upgrades: new Set(),
  nodeAllocations: {},

  lastSaveTime: Date.now(),
  version: VERSION,

  log: [],
});

export function pushLog(message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  state.log = [`[${timestamp}] ${message}`, ...state.log.slice(0, 99)];
}
