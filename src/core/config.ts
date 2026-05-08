import Decimal from "break_eternity.js";

export const VERSION = "4.0.0-node-manual-only";

export const GAME_CONFIG = {
  serialization: {
    saveVersion: VERSION,
  },

  resources: {
    starting: {
      money: new Decimal(0),
      crypto: new Decimal(0),
      compute: new Decimal(0),
      reputation: new Decimal(0),
    },
    display: {
      money: { label: "$Money", shortLabel: "$" },
      crypto: { label: "Crypto", shortLabel: "CR" },
      compute: { label: "Compute (Tflops)", shortLabel: "TF" },
      reputation: { label: "Reputation", shortLabel: "REP" },
    },
  },

  scaling: {
    baseRewardByGeneratorType: {
      manual: new Decimal(1),
      passive: new Decimal(1),
      timed: new Decimal(1),
    },
    level: {
      exponentOffset: 1,
    },
    reputation: {
      enabled: true,
      influenceStrength: new Decimal(0.25),
      floorMultiplier: new Decimal(0.1),
      normalizationRange: new Decimal(100),
    },
  },

  reputation: {
    whitehatThreshold: new Decimal(100),
    blackhatThreshold: new Decimal(-100),
  },
} as const;
