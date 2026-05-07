import Decimal from "break_eternity.js";
import type { ResourceGeneratorConfig } from "../types";

export const GENERATOR_CONFIGS: Record<string, ResourceGeneratorConfig> = {
  // ── Manual ─────────────────────────────────────────────────────────────────
  hackDevice: {
    id: "hackDevice",
    name: "Hack Computer",
    description: "Hack a computer for quick money. Damages reputation.",
    type: "manual",
    path: "blackhat",
    outputResources: { money: new Decimal(1) },
    reputationEffect: new Decimal(-1),
    level: 1,
    maxLevel: 10,
    levelScaling: 2,
    upgradeCost: { money: new Decimal(10) },
    upgradeCostScaling: 2,
  },
  hardenDevice: {
    id: "hardenDevice",
    name: "Harden Computer",
    description: "Secure a computer for a client. Earn money and build reputation.",
    type: "manual",
    path: "whitehat",
    outputResources: { money: new Decimal(1) },
    reputationEffect: new Decimal(1),
    level: 1,
    maxLevel: 10,
    levelScaling: 2,
    upgradeCost: { money: new Decimal(10) },
    upgradeCostScaling: 2,
  },

  // ── Passive ─────────────────────────────────────────────────────────────────
  payloadScript: {
    id: "payloadScript",
    name: "Payload Script",
    description: "A background script that mines low-yield crypto over time.",
    type: "passive",
    path: "blackhat",
    tickIntervalMs: 1000,
    outputResources: { crypto: new Decimal(0.1) },
    level: 1,
    maxLevel: 10,
    levelScaling: 1.2,
    upgradeCost: { money: new Decimal(30), crypto: new Decimal(5) },
    upgradeCostScaling: 1.8,
    computeScaling: {
      enabled: true,
      baselineCompute: new Decimal(10),
      exponent: new Decimal(0.25),
    },
    // Unlocks once the player has upgraded their manual hack tool at least once.
    unlock: {
      minGeneratorLevel: { hackDevice: 2 },
    },
  },
  antiVirus: {
    id: "antiVirus",
    name: "Anti-Virus Software",
    description: "A defense daemon that validates blocks and yields crypto over time.",
    type: "passive",
    path: "whitehat",
    tickIntervalMs: 1000,
    outputResources: { crypto: new Decimal(0.1) },
    level: 1,
    maxLevel: 10,
    levelScaling: 1.2,
    upgradeCost: { money: new Decimal(30), crypto: new Decimal(5) },
    upgradeCostScaling: 1.8,
    computeScaling: {
      enabled: true,
      baselineCompute: new Decimal(10),
      exponent: new Decimal(0.25),
    },
    // Unlocks once the player has upgraded their manual harden tool at least once.
    unlock: {
      minGeneratorLevel: { hardenDevice: 2 },
    },
  },

  // ── Timed ───────────────────────────────────────────────────────────────────
  buildDevice: {
    id: "buildDevice",
    name: "Build Device",
    description: "Invest money and crypto to construct a device that yields double the investment.",
    type: "timed",
    path: "whitehat",
    durationMs: 60_000,
    inputResources: { money: new Decimal(10), crypto: new Decimal(5) },
    outputResources: { money: new Decimal(20) },
    level: 1,
    maxLevel: 5,
    levelScaling: 2.0,
    upgradeCost: { money: new Decimal(50), crypto: new Decimal(15) },
    upgradeCostScaling: 2.0,
    computeScaling: {
      enabled: true,
      baselineCompute: new Decimal(10),
      exponent: new Decimal(0.2),
    },
  },
  marketSkim: {
    id: "marketSkim",
    name: "Market Skim",
    description: "Run an automated skim operation to extract crypto after a timed setup window.",
    type: "timed",
    path: "blackhat",
    durationMs: 45_000,
    inputResources: { money: new Decimal(8), crypto: new Decimal(2) },
    outputResources: { crypto: new Decimal(12) },
    level: 1,
    maxLevel: 5,
    levelScaling: 1.7,
    upgradeCost: { money: new Decimal(40), crypto: new Decimal(10) },
    upgradeCostScaling: 2.0,
    computeScaling: {
      enabled: true,
      baselineCompute: new Decimal(20),
      exponent: new Decimal(0.2),
    },
  },
};
