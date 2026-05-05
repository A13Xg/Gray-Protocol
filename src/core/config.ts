// src/core/config.ts
import Decimal from "break_eternity.js";

export const VERSION = "1.1.0-alpha";

export const GAME_CONFIG = {
  serialization: {
    saveVersion: "2.0.0",
  },

  tickRate: 100,
  offlineCapMs: 86_400_000,

  resources: {
    starting: {
      money: new Decimal(10),
      crypto: new Decimal(0),
      compute: new Decimal(10),
      reputation: new Decimal(0),
    },
    display: {
      money: { label: "$Money", shortLabel: "$" },
      crypto: { label: "Crypto Coins", shortLabel: "CR" },
      compute: { label: "Compute Resources", shortLabel: "CPU" },
      reputation: { label: "Reputation", shortLabel: "REP" },
    },
  },

  reputation: {
    whitehatThreshold: new Decimal(100),
    blackhatThreshold: new Decimal(-100),
  },

  activities: {
    basicCryptoMining: {
      baseCost: { compute: new Decimal(1) },
      baseYieldPerSecond: { crypto: new Decimal(0.5) },
      levelCostScaling: "exponential" as const,
      yieldScaling: "linear" as const,
      costScalingRate: new Decimal(1.15),
      yieldScalingRate: new Decimal(0.1),
      maxLevel: 100,
    },
    bugBountyHunting: {
      baseCost: { money: new Decimal(5) },
      baseYieldPerSecond: { money: new Decimal(2), reputation: new Decimal(0.1) },
      levelCostScaling: "exponential" as const,
      yieldScaling: "linear" as const,
      costScalingRate: new Decimal(1.2),
      yieldScalingRate: new Decimal(0.15),
      maxLevel: 100,
      reputationGate: { min: new Decimal(-100) },
    },
    passwordCracking: {
      baseCost: { compute: new Decimal(2) },
      baseYieldPerSecond: { money: new Decimal(1), crypto: new Decimal(0.3), reputation: new Decimal(-0.2) },
      consumesPerSecond: { compute: new Decimal(0.01) },
      levelCostScaling: "exponential" as const,
      yieldScaling: "linear" as const,
      costScalingRate: new Decimal(1.18),
      yieldScalingRate: new Decimal(0.12),
      maxLevel: 100,
      reputationGate: { max: new Decimal(100) },
    },
  },

  research: {
    parallelProcessing: {
      cost: { compute: new Decimal(20) },
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
      cost: { crypto: new Decimal(10) },
      prerequisites: [] as string[],
      reputationGate: { max: new Decimal(0) },
      effects: [{ type: "activityYieldMultiplier" as const, target: "passwordCracking", value: new Decimal(2) }],
    },
  },

  prestige: {
    protocolReset: {
      requirement: { crypto: new Decimal(1000) },
      resetsResources: ["money", "crypto", "compute"] as const,
      preservesResearch: false,
      rewardResource: "compute" as const,
      rewardAmount: new Decimal(25),
    },
  },

  scaling: {
    softcapThreshold: new Decimal("1e100"),
    softcapPower: new Decimal(0.5),
  },
} as const;
