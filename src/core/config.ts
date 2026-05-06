import Decimal from "break_eternity.js";

export const VERSION = "3.0.0-core-scaling";

export const GAME_CONFIG = {
  serialization: {
    saveVersion: "3.0.0",
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

  cryptoConversion: {
    basePrice: new Decimal(1),
    fluctuationAmplitude: new Decimal(0.9),
    pricePeriodMs: 60_000,
    minMultiplier: new Decimal(0.1),
    maxMultiplier: new Decimal(10),
    noise: {
      enabled: true,
      amplitude: new Decimal(0.12),
      bucketMs: 5000,
      seed: 1337,
    },
  },

  prestige: {
    eligibility: {
      trackedResource: "money" as const,
      baseRequirement: new Decimal(1000),
      growth: new Decimal(2),
    },
    multiplier: {
      mode: "multiplicative" as "additive" | "multiplicative",
      base: new Decimal(1),
      perLevel: new Decimal(0.2),
    },
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
