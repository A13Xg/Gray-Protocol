// src/core/reputation.ts
import Decimal from "break_eternity.js";
import type { ReputationAlignment, ReputationGate, GameState } from "./types";
import { GAME_CONFIG } from "./config";

export function getReputationAlignment(rep: Decimal): ReputationAlignment {
  const { whitehatThreshold, blackhatThreshold } = GAME_CONFIG.reputation;
  if (rep.gt(whitehatThreshold)) return "whitehat";
  if (rep.lt(blackhatThreshold)) return "blackhat";
  return "greyhat";
}

export function canAccessReputationGate(rep: Decimal, gate: ReputationGate): boolean {
  if (gate.min !== undefined && rep.lt(gate.min)) return false;
  if (gate.max !== undefined && rep.gt(gate.max)) return false;
  if (gate.alignment !== undefined) {
    const alignment = getReputationAlignment(rep);
    if (alignment !== gate.alignment) return false;
  }
  return true;
}

export function applyReputationDelta(state: GameState, delta: Decimal): void {
  state.resources.reputationStanding = state.resources.reputationStanding.add(delta);
}
