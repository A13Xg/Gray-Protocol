import Decimal from "break_eternity.js";
import nodeCatalog from "./nodeCatalog.json";
import type { ActionPath, NodeConfig, NodeKind, ResourceKey } from "../types";

interface RawNodeConfig {
  id: string;
  name: string;
  description: string;
  kind: NodeKind;
  path: ActionPath;
  enabled: boolean;
  aliases?: string[];
  inputResources?: Partial<Record<ResourceKey, string | number>>;
  outputResources: Partial<Record<ResourceKey, string | number>>;
  defaultMultiplierPct?: string | number;
  reputationEffect?: string | number;
  unlock?: {
    minReputation?: string | number;
    maxReputation?: string | number;
    minResources?: Partial<Record<ResourceKey, string | number>>;
    requiredNodeLevels?: Record<string, number>;
  };
  upgrade: {
    startingLevel: number;
    maxLevel: number;
    levelMultiplierPct: string | number;
    timedInputCostGrowthPct?: string | number;
  };
  computeScaling?: {
    enabled?: boolean;
    baselineCompute?: string | number;
    exponent?: string | number;
  };
  runtime?: {
    tickIntervalMs?: number;
    durationMs?: number;
    allowAutoRun?: boolean;
  };
  tags?: string[];
}

interface RawCatalog {
  nodes: RawNodeConfig[];
}

function toDecimal(value: string | number | undefined, fallback: string): Decimal {
  try {
    return new Decimal(value ?? fallback);
  } catch {
    return new Decimal(fallback);
  }
}

function toResourceMap(
  map: Partial<Record<ResourceKey, string | number>> | undefined
): Partial<Record<ResourceKey, Decimal>> {
  if (!map) return {};
  const entries = Object.entries(map).map(([key, value]) => [key, toDecimal(value, "0")]);
  return Object.fromEntries(entries) as Partial<Record<ResourceKey, Decimal>>;
}

function parseNode(raw: RawNodeConfig): NodeConfig {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    kind: raw.kind,
    path: raw.path,
    enabled: raw.enabled,
    aliases: raw.aliases ?? [],
    inputResources: toResourceMap(raw.inputResources),
    outputResources: toResourceMap(raw.outputResources),
    defaultMultiplierPct: toDecimal(raw.defaultMultiplierPct, "0"),
    reputationEffect: toDecimal(raw.reputationEffect, "0"),
    unlock: {
      minReputation: raw.unlock?.minReputation !== undefined ? toDecimal(raw.unlock.minReputation, "0") : undefined,
      maxReputation: raw.unlock?.maxReputation !== undefined ? toDecimal(raw.unlock.maxReputation, "0") : undefined,
      minResources: toResourceMap(raw.unlock?.minResources),
      requiredNodeLevels: raw.unlock?.requiredNodeLevels ?? {},
    },
    upgrade: {
      startingLevel: Math.max(1, Math.floor(raw.upgrade.startingLevel)),
      maxLevel: Math.max(1, Math.floor(raw.upgrade.maxLevel)),
      levelMultiplierPct: toDecimal(raw.upgrade.levelMultiplierPct, "0"),
      timedInputCostGrowthPct:
        raw.upgrade.timedInputCostGrowthPct !== undefined
          ? toDecimal(raw.upgrade.timedInputCostGrowthPct, "0")
          : undefined,
    },
    computeScaling: {
      enabled: raw.computeScaling?.enabled ?? false,
      baselineCompute: toDecimal(raw.computeScaling?.baselineCompute, "1"),
      exponent: toDecimal(raw.computeScaling?.exponent, "0"),
    },
    runtime: {
      tickIntervalMs: raw.runtime?.tickIntervalMs,
      durationMs: raw.runtime?.durationMs,
      allowAutoRun: raw.runtime?.allowAutoRun ?? false,
    },
    tags: raw.tags ?? [],
  };
}

const rawCatalog = nodeCatalog as RawCatalog;

export const NODE_CONFIGS: Record<string, NodeConfig> = Object.fromEntries(
  rawCatalog.nodes.map((raw) => {
    const parsed = parseNode(raw);
    return [parsed.id, parsed];
  })
) as Record<string, NodeConfig>;

export const NODE_LIST: NodeConfig[] = Object.values(NODE_CONFIGS);

export const NODE_ALIASES: Record<string, string> = Object.fromEntries(
  NODE_LIST.flatMap((node) => node.aliases.map((alias) => [alias, node.id]))
);

export function resolveNodeId(idOrAlias: string): string {
  return NODE_CONFIGS[idOrAlias] ? idOrAlias : (NODE_ALIASES[idOrAlias] ?? idOrAlias);
}
