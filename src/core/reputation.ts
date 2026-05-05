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

export function getPathReputationMultiplier(reputation: Decimal, path: "shared" | "whitehat" | "blackhat" | "greyhat"): Decimal {
  if (path === "shared" || path === "greyhat") {
    return new Decimal(1);
  }

  const scaling = GAME_CONFIG.manualActionScaling.reputation;
  const absRep = reputation.abs();
  if (absRep.lt(scaling.greyNeutralThreshold)) {
    return new Decimal(1);
  }

  const alignment = getReputationAlignment(reputation);
  const intensity = Decimal.min(new Decimal(1), absRep.div(scaling.curveReputationForMax));
  const boostSpan = scaling.maxBoostMultiplier.sub(1);
  const penaltySpan = new Decimal(1).sub(scaling.maxPenaltyMultiplier);

  if (path === "whitehat") {
    if (alignment === "whitehat") {
      return new Decimal(1).add(boostSpan.mul(intensity));
    }
    if (alignment === "blackhat") {
      return new Decimal(1).sub(penaltySpan.mul(intensity));
    }
    return new Decimal(1);
  }

  if (path === "blackhat") {
    if (alignment === "blackhat") {
      return new Decimal(1).add(boostSpan.mul(intensity));
    }
    if (alignment === "whitehat") {
      return new Decimal(1).sub(penaltySpan.mul(intensity));
    }
    return new Decimal(1);
  }

  return new Decimal(1);
}

export function applyReputationEffects(
  state: GameState,
  value: Decimal,
  path: "shared" | "whitehat" | "blackhat" | "greyhat"
): Decimal {
  const multiplier = getPathReputationMultiplier(state.resources.reputation, path);
  const result = value.mul(multiplier);
  if (!result.isFinite() || Decimal.isNaN(result)) return new Decimal(0);
  return result;
}

export function applyReputationDelta(state: GameState, delta: Decimal): GameState {
  const next = state.resources.reputation.add(delta);
  state.resources.reputation = !next.isFinite() || Decimal.isNaN(next) ? new Decimal(0) : next;
  return state;
}
