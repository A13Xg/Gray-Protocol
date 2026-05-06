import Decimal from "break_eternity.js";
import type { TalentNodeDefinition } from "../types";

export const TALENT_NODES: Record<string, TalentNodeDefinition> = {
  manualProtocols: {
    id: "manualProtocols",
    name: "Manual Protocols",
    description: "Improve manual execution throughput.",
    scope: "run",
    costs: { money: new Decimal(25) },
    effects: {
      generatorMultipliers: [
        { mode: "multiplicative", value: new Decimal(0.2), generatorTypes: ["manual"] },
      ],
    },
  },
  persistentAutomation: {
    id: "persistentAutomation",
    name: "Persistent Automation",
    description: "Permanent passive process tuning.",
    scope: "permanent",
    costs: { crypto: new Decimal(3) },
    prerequisites: {
      minReputation: new Decimal(5),
    },
    effects: {
      generatorMultipliers: [
        { mode: "multiplicative", value: new Decimal(0.15), generatorTypes: ["passive"] },
      ],
    },
  },
  marketMakers: {
    id: "marketMakers",
    name: "Market Makers",
    description: "Improves money->crypto conversion efficiency.",
    scope: "run",
    costs: { money: new Decimal(40), reputation: new Decimal(3) },
    effects: {
      cryptoEfficiency: {
        mode: "multiplicative",
        value: new Decimal(0.1),
      },
    },
  },
};
