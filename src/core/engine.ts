// src/core/engine.ts
import { state, pushLog } from "./state";
import type { GameState } from "./types";

let rafHandle = 0;
let lastTimestamp = 0;

function loop(timestamp: number): void {
  if (lastTimestamp === 0) lastTimestamp = timestamp;
  const deltaMs = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  tick(state, deltaMs);
  rafHandle = requestAnimationFrame(loop);
}

export function startGameLoop(): void {
  if (rafHandle) return;
  rafHandle = requestAnimationFrame(loop);
  pushLog("Engine started");
}

export function stopGameLoop(): void {
  if (!rafHandle) return;
  cancelAnimationFrame(rafHandle);
  rafHandle = 0;
  lastTimestamp = 0;
}

/** Non-UI tick for simulation/testing. No-op in baseline. */
export function tick(gs: GameState, deltaMs: number): void {
  if (deltaMs <= 0) return;
  gs.timestamps.lastTickAt += deltaMs;
}
