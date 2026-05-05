// src/core/config.ts
import Decimal from "break_eternity.js";

export const VERSION = "2.0.0-baseline";

export const GAME_CONFIG = {
  serialization: {
    saveVersion: "1.0.0",
  },

  tickRate: 100,

  resources: {
    starting: {
      money: new Decimal(0),
      crypto: new Decimal(0),
      compute: new Decimal(10),
      reputation: new Decimal(0),
    },
    display: {
      money: { label: "$Money", shortLabel: "$" },
      crypto: { label: "Crypto", shortLabel: "CR" },
      compute: { label: "Compute (Tflops)", shortLabel: "TF" },
      reputation: { label: "Reputation", shortLabel: "REP" },
    },
  },

  reputation: {
    whitehatThreshold: new Decimal(100),
    blackhatThreshold: new Decimal(-100),
  },

  cryptoConversion: {
    basePrice: new Decimal(1),
    fluctuationAmplitude: new Decimal(0.9),
    pricePeriodMs: 60_000,
    minMultiplier: new Decimal(0.1),
    maxMultiplier: new Decimal(10),
  },

  actions: {
    pentestSystem: {
      baseReward: new Decimal(1),
      reputationDelta: new Decimal(1),
      path: "whitehat" as const,
    },
    exploitSystem: {
      baseReward: new Decimal(1),
      reputationDelta: new Decimal(-1),
      path: "blackhat" as const,
    },
  },
} as const;
