import Decimal from "break_eternity.js";
import type {
  GameState,
  GeneratorModifierEffect,
  ResourceGeneratorConfig,
  ResourceKey,
  TalentNodeDefinition,
} from "./types";

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

function isNodeUnlocked(gs: GameState, node: TalentNodeDefinition): boolean {
  const prereq = node.prerequisites;
  if (!prereq) return true;

  if (prereq.minReputation && gs.resources.reputation.lt(prereq.minReputation)) return false;

  if (prereq.minResources) {
    for (const [resource, required] of Object.entries(prereq.minResources) as [ResourceKey, Decimal][]) {
      if (gs.resources[resource].lt(required)) return false;
    }
  }

  if (prereq.requiredGeneratorLevels) {
    for (const [generatorId, minLevel] of Object.entries(prereq.requiredGeneratorLevels)) {
      const level = gs.generators.levels[generatorId] ?? 1;
      if (level < minLevel) return false;
    }
  }

  if (prereq.allTalentNodeIds && prereq.allTalentNodeIds.length > 0) {
    for (const id of prereq.allTalentNodeIds) {
      if (!isTalentNodePurchased(gs, id)) return false;
    }
  }

  return true;
}

export function isTalentNodePurchased(gs: GameState, nodeId: string): boolean {
  return !!gs.talents.runUnlockedById[nodeId] || !!gs.talents.permanentUnlockedById[nodeId];
}

export function canPurchaseTalentNode(gs: GameState, nodeId: string): boolean {
  const node = TALENT_NODES[nodeId];
  if (!node) return false;
  if (isTalentNodePurchased(gs, nodeId)) return false;
  if (!isNodeUnlocked(gs, node)) return false;

  for (const [resource, cost] of Object.entries(node.costs) as [ResourceKey, Decimal][]) {
    if (gs.resources[resource].lt(cost)) return false;
  }

  return true;
}

export function purchaseTalentNode(gs: GameState, nodeId: string): boolean {
  const node = TALENT_NODES[nodeId];
  if (!node || !canPurchaseTalentNode(gs, nodeId)) return false;

  const nextResources = { ...gs.resources };
  for (const [resource, cost] of Object.entries(node.costs) as [ResourceKey, Decimal][]) {
    nextResources[resource] = nextResources[resource].sub(cost);
  }
  gs.resources = nextResources;

  if (node.scope === "permanent") {
    gs.talents.permanentUnlockedById = {
      ...gs.talents.permanentUnlockedById,
      [nodeId]: true,
    };
  } else {
    gs.talents.runUnlockedById = {
      ...gs.talents.runUnlockedById,
      [nodeId]: true,
    };
  }

  return true;
}

function effectMatches(
  effect: GeneratorModifierEffect,
  generatorConfig: ResourceGeneratorConfig,
  resource: ResourceKey
): boolean {
  if (effect.generatorTypes && !effect.generatorTypes.includes(generatorConfig.type)) return false;
  if (effect.generatorIds && !effect.generatorIds.includes(generatorConfig.id)) return false;
  if (effect.paths && !effect.paths.includes(generatorConfig.path)) return false;
  if (effect.resources && !effect.resources.includes(resource)) return false;
  return true;
}

export function getGeneratorTalentMultiplier(
  gs: GameState,
  generatorConfig: ResourceGeneratorConfig,
  resource: ResourceKey
): Decimal {
  let additive = new Decimal(0);
  let multiplicative = new Decimal(1);

  for (const [nodeId, node] of Object.entries(TALENT_NODES)) {
    if (!isTalentNodePurchased(gs, nodeId)) continue;
    for (const effect of node.effects.generatorMultipliers ?? []) {
      if (!effectMatches(effect, generatorConfig, resource)) continue;
      if (effect.mode === "additive") {
        additive = additive.add(effect.value);
      } else {
        multiplicative = multiplicative.mul(new Decimal(1).add(effect.value));
      }
    }
  }

  return new Decimal(1).add(additive).mul(multiplicative);
}

export function getCryptoEfficiencyMultiplier(gs: GameState): Decimal {
  let additive = new Decimal(0);
  let multiplicative = new Decimal(1);

  for (const [nodeId, node] of Object.entries(TALENT_NODES)) {
    if (!isTalentNodePurchased(gs, nodeId)) continue;
    const effect = node.effects.cryptoEfficiency;
    if (!effect) continue;
    if (effect.mode === "additive") {
      additive = additive.add(effect.value);
    } else {
      multiplicative = multiplicative.mul(new Decimal(1).add(effect.value));
    }
  }

  return new Decimal(1).add(additive).mul(multiplicative);
}

export function resetRunTalents(gs: GameState): void {
  gs.talents.runUnlockedById = {};
}
