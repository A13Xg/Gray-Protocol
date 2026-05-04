export const TICK_RATE = 100; // ms per tick (10 FPS)
export const OFFLINE_CAP = 86400; // seconds (24 hours)

export const INITIAL_RESOURCES = {
  money: 1,
  crypto: 0,
  parity: 0,
  computeTotal: 0,
  computeUsed: 0,
} as const;

export const VERSION = "1.0.0-alpha";
