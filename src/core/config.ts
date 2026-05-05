// src/core/config.ts
import Decimal from "break_eternity.js";

export const VERSION = "1.1.0-alpha";

export const GAME_CONFIG = {
  tickRate: 100,        // ms per tick (10 FPS)
  offlineCapMs: 86_400_000, // 24 hours in ms

  resources: {
    starting: {
      money: new Decimal(10),
      cryptoCurrency: new Decimal(0),
      computePower: new Decimal(10),
      reputationStanding: new Decimal(0),
    },
  },

  reputation: {
    whitehatThreshold: new Decimal(100),
    blackhatThreshold: new Decimal(-100),
  },

  activities: {
    basicCryptoMining: {
      baseCost: { computePower: new Decimal(1) },
      baseYieldPerSecond: { cryptoCurrency: new Decimal(0.5) },
      levelCostScaling: "exponential" as const,
      yieldScaling: "linear" as const,
      costScalingRate: new Decimal(1.15),
      yieldScalingRate: new Decimal(0.1),
      maxLevel: 100,
    },
    bugBountyHunting: {
      baseCost: { money: new Decimal(5) },
      baseYieldPerSecond: { money: new Decimal(2), reputationStanding: new Decimal(0.1) },
      levelCostScaling: "exponential" as const,
      yieldScaling: "linear" as const,
      costScalingRate: new Decimal(1.2),
      yieldScalingRate: new Decimal(0.15),
      maxLevel: 100,
      reputationGate: { min: new Decimal(-100) }, // greyhat or higher = not full blackhat
    },
    passwordCracking: {
      baseCost: { computePower: new Decimal(2) },
      baseYieldPerSecond: { money: new Decimal(1), cryptoCurrency: new Decimal(0.3), reputationStanding: new Decimal(-0.2) },
      consumesPerSecond: { computePower: new Decimal(0.01) },
      levelCostScaling: "exponential" as const,
      yieldScaling: "linear" as const,
      costScalingRate: new Decimal(1.18),
      yieldScalingRate: new Decimal(0.12),
      maxLevel: 100,
      reputationGate: { max: new Decimal(100) }, // not full whitehat
    },
  },

  research: {
    parallelProcessing: {
      cost: { computePower: new Decimal(20) },
      prerequisites: [] as string[],
      effects: [{ type: "computeEfficiencyMultiplier" as const, value: new Decimal(1.5) }],
    },
    responsibleDisclosure: {
      cost: { money: new Decimal(50) },
      prerequisites: [] as string[],
      reputationGate: { min: new Decimal(0) },
      effects: [{ type: "activityYieldMultiplier" as const, target: "bugBountyHunting", value: new Decimal(2) }],
    },
    exploitAutomation: {
      cost: { cryptoCurrency: new Decimal(10) },
      prerequisites: [] as string[],
      reputationGate: { max: new Decimal(0) },
      effects: [{ type: "activityYieldMultiplier" as const, target: "passwordCracking", value: new Decimal(2) }],
    },
  },

  prestige: {
    protocolReset: {
      requirement: { cryptoCurrency: new Decimal(1000) },
      resetsResources: ["money", "cryptoCurrency", "computePower"] as const,
      preservesResearch: false,
      rewardResource: "computePower" as const,
      rewardAmount: new Decimal(25),
    },
  },

  scaling: {
    softcapThreshold: new Decimal("1e100"),
    softcapPower: new Decimal(0.5),
  },
} as const;

// Legacy compat exports
export const TICK_RATE = GAME_CONFIG.tickRate;
export const OFFLINE_CAP = GAME_CONFIG.offlineCapMs / 1000;
