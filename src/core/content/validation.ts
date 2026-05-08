import Decimal from "break_eternity.js";
import { ALL_RESOURCE_KEYS } from "../resources";
import type { NodeConfig, ResourceKey } from "../types";
import { NODE_CONFIGS } from "./nodes";

const RESOURCE_KEYS = new Set<ResourceKey>(ALL_RESOURCE_KEYS);

function isDecimalPositiveOrZero(v: Decimal): boolean {
  return v.isFinite() && !Decimal.isNaN(v) && v.gte(0);
}

function validateNodeConfig(cfg: NodeConfig): string[] {
  const errors: string[] = [];

  if (cfg.id.trim().length === 0) errors.push("empty id");
  if (cfg.name.trim().length === 0) errors.push("empty name");
  if (cfg.upgrade.maxLevel < cfg.upgrade.startingLevel) errors.push("maxLevel must be >= startingLevel");
  if (cfg.upgrade.startingLevel < 1) errors.push("startingLevel must be >= 1");
  if (!cfg.upgrade.levelMultiplierPct.isFinite() || Decimal.isNaN(cfg.upgrade.levelMultiplierPct)) {
    errors.push("upgrade.levelMultiplierPct must be finite");
  }

  if (!cfg.defaultMultiplierPct.isFinite() || Decimal.isNaN(cfg.defaultMultiplierPct)) {
    errors.push("defaultMultiplierPct must be finite");
  }

  if (!cfg.reputationEffect.isFinite() || Decimal.isNaN(cfg.reputationEffect)) {
    errors.push("reputationEffect must be finite");
  }

  const outputKeys = Object.keys(cfg.outputResources) as ResourceKey[];
  if (outputKeys.length === 0) errors.push("must define at least one output resource");

  for (const key of outputKeys) {
    if (!RESOURCE_KEYS.has(key)) errors.push(`invalid output resource key: ${key}`);
    const val = cfg.outputResources[key];
    if (!val || !val.isFinite() || Decimal.isNaN(val)) {
      errors.push(`output resource ${key} must be finite`);
      continue;
    }
    if (key !== "reputation" && val.lt(0)) {
      errors.push(`output resource ${key} must be >= 0`);
    }
  }

  for (const [key, val] of Object.entries(cfg.inputResources ?? {}) as [ResourceKey, Decimal][]) {
    if (!RESOURCE_KEYS.has(key)) errors.push(`invalid input resource key: ${key}`);
    if (!isDecimalPositiveOrZero(val)) errors.push(`input resource ${key} must be finite and >= 0`);
  }

  if (cfg.kind === "passive") {
    if (!cfg.runtime.tickIntervalMs || cfg.runtime.tickIntervalMs <= 0) {
      errors.push("passive node must have runtime.tickIntervalMs > 0");
    }
  }
  if (cfg.kind === "timedTask") {
    if (!cfg.runtime.durationMs || cfg.runtime.durationMs <= 0) {
      errors.push("timedTask node must have runtime.durationMs > 0");
    }
  }

  if (cfg.computeScaling.enabled) {
    if (!isDecimalPositiveOrZero(cfg.computeScaling.baselineCompute) || cfg.computeScaling.baselineCompute.eq(0)) {
      errors.push("computeScaling.baselineCompute must be > 0");
    }
    if (!cfg.computeScaling.exponent.isFinite() || Decimal.isNaN(cfg.computeScaling.exponent)) {
      errors.push("computeScaling.exponent must be finite");
    }
  }

  if (cfg.kind === "timedTask" && cfg.upgrade.timedInputCostGrowthPct !== undefined) {
    if (!cfg.upgrade.timedInputCostGrowthPct.isFinite() || Decimal.isNaN(cfg.upgrade.timedInputCostGrowthPct)) {
      errors.push("upgrade.timedInputCostGrowthPct must be finite");
    }
  }

  return errors;
}

export function validateContentDefinitions(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const nodeIds = new Set<string>();
  for (const [key, cfg] of Object.entries(NODE_CONFIGS)) {
    if (nodeIds.has(cfg.id)) {
      errors.push(`duplicate node id: ${cfg.id}`);
    }
    nodeIds.add(cfg.id);
    if (cfg.id !== key) {
      errors.push(`node key/id mismatch: key=${key}, id=${cfg.id}`);
    }
    for (const e of validateNodeConfig(cfg)) {
      errors.push(`node ${cfg.id}: ${e}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function assertContentDefinitions(): void {
  const result = validateContentDefinitions();
  if (!result.valid) {
    throw new Error(`Content definition validation failed:\n${result.errors.join("\n")}`);
  }
}
