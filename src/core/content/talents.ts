import Decimal from "break_eternity.js";
import talentsJson from "./talents.json";
import type {
  CryptoModifierEffect,
  GeneratorModifierEffect,
  GeneratorType,
  ResourceKey,
  TalentNodeDefinition,
  TalentScope,
} from "../types";

interface RawGeneratorModifierEffect {
  mode: "additive" | "multiplicative";
  value: string | number;
  generatorTypes?: GeneratorType[];
  generatorIds?: string[];
  paths?: Array<"whitehat" | "blackhat" | "shared">;
  resources?: ResourceKey[];
}

interface RawCryptoModifierEffect {
  mode: "additive" | "multiplicative";
  value: string | number;
}

interface RawTalentNode {
  id: string;
  name: string;
  description: string;
  scope: TalentScope;
  costs: Partial<Record<ResourceKey, string | number>>;
  prerequisites?: {
    allTalentNodeIds?: string[];
    minReputation?: string | number;
    minResources?: Partial<Record<ResourceKey, string | number>>;
    requiredGeneratorLevels?: Record<string, number>;
  };
  effects: {
    generatorMultipliers?: RawGeneratorModifierEffect[];
    cryptoEfficiency?: RawCryptoModifierEffect;
  };
}

interface RawTalentCatalog {
  talents: RawTalentNode[];
}

function toDecimal(value: string | number | undefined, fallback: string): Decimal {
  try {
    return new Decimal(value ?? fallback);
  } catch {
    return new Decimal(fallback);
  }
}

function toResourceCostMap(
  map: Partial<Record<ResourceKey, string | number>> | undefined
): Partial<Record<ResourceKey, Decimal>> {
  if (!map) return {};
  const entries = Object.entries(map).map(([key, value]) => [key, toDecimal(value, "0")]);
  return Object.fromEntries(entries) as Partial<Record<ResourceKey, Decimal>>;
}

function parseGeneratorEffect(effect: RawGeneratorModifierEffect): GeneratorModifierEffect {
  return {
    mode: effect.mode,
    value: toDecimal(effect.value, "0"),
    generatorTypes: effect.generatorTypes,
    generatorIds: effect.generatorIds,
    paths: effect.paths,
    resources: effect.resources,
  };
}

function parseCryptoEffect(effect: RawCryptoModifierEffect): CryptoModifierEffect {
  return {
    mode: effect.mode,
    value: toDecimal(effect.value, "0"),
  };
}

function parseTalentNode(raw: RawTalentNode): TalentNodeDefinition {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    scope: raw.scope,
    costs: toResourceCostMap(raw.costs),
    prerequisites: {
      allTalentNodeIds: raw.prerequisites?.allTalentNodeIds,
      minReputation:
        raw.prerequisites?.minReputation !== undefined
          ? toDecimal(raw.prerequisites.minReputation, "0")
          : undefined,
      minResources: toResourceCostMap(raw.prerequisites?.minResources),
      requiredGeneratorLevels: raw.prerequisites?.requiredGeneratorLevels,
    },
    effects: {
      generatorMultipliers: raw.effects.generatorMultipliers?.map(parseGeneratorEffect),
      cryptoEfficiency: raw.effects.cryptoEfficiency ? parseCryptoEffect(raw.effects.cryptoEfficiency) : undefined,
    },
  };
}

const rawCatalog = talentsJson as RawTalentCatalog;

export const TALENT_NODES: Record<string, TalentNodeDefinition> = Object.fromEntries(
  rawCatalog.talents.map((rawNode) => {
    const parsed = parseTalentNode(rawNode);
    return [parsed.id, parsed];
  })
) as Record<string, TalentNodeDefinition>;
