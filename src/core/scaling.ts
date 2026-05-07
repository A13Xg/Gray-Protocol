import Decimal from "break_eternity.js";
import { GAME_CONFIG } from "./config";
import type { ActionPath, GameState, ResourceGeneratorConfig, ResourceKey } from "./types";
import { getGeneratorTalentMultiplier } from "./upgrades";

function clamp01Signed(value: Decimal): Decimal {
  return value.max(-1).min(1);
}

export function getBaseRewardMultiplier(config: ResourceGeneratorConfig): Decimal {
  return new Decimal(GAME_CONFIG.scaling.baseRewardByGeneratorType[config.type]);
}

export function getLevelMultiplier(gs: GameState, config: ResourceGeneratorConfig): Decimal {
  const level = gs.generators.levels[config.id] ?? config.level;
  const exponent = Math.max(0, level - GAME_CONFIG.scaling.level.exponentOffset);
  return Decimal.pow(config.levelScaling, exponent);
}

export function getPrestigeMultiplier(gs: GameState): Decimal {
  return gs.prestige.multiplier;
}

export function getComputeMultiplier(
  gs: GameState,
  config: ResourceGeneratorConfig,
  assignedCompute?: Decimal
): Decimal {
  if (!config.computeScaling?.enabled) return new Decimal(1);

  // Passive generators use assigned/total compute ratio by design.
  if (config.type === "passive") {
    const totalCompute = gs.resources.compute.max(0);
    if (totalCompute.lte(0)) return new Decimal(0);
    const assigned = (assignedCompute ?? totalCompute).max(0);
    const ratio = assigned.div(totalCompute).max(0);
    return Decimal.pow(ratio, config.computeScaling.exponent);
  }

  const baseline = config.computeScaling.baselineCompute;
  if (baseline.lte(0)) return new Decimal(1);
  const computePool = assignedCompute ?? gs.resources.compute;
  const ratio = computePool.div(baseline).max(0);
  return Decimal.pow(ratio, config.computeScaling.exponent);
}

export function getReputationPathMultiplier(gs: GameState, path: ActionPath): Decimal {
  if (!GAME_CONFIG.scaling.reputation.enabled || path === "shared") return new Decimal(1);

  const normalized = clamp01Signed(gs.resources.reputation.div(GAME_CONFIG.scaling.reputation.normalizationRange));
  const strength = GAME_CONFIG.scaling.reputation.influenceStrength;

  const directional = path === "whitehat"
    ? new Decimal(1).add(normalized.mul(strength))
    : new Decimal(1).sub(normalized.mul(strength));

  return directional.max(GAME_CONFIG.scaling.reputation.floorMultiplier);
}

export function getTalentUpgradeMultiplier(
  gs: GameState,
  config: ResourceGeneratorConfig,
  resource: ResourceKey
): Decimal {
  return getGeneratorTalentMultiplier(gs, config, resource);
}

export function getReputationComputeMultiplier(
  gs: GameState,
  config: ResourceGeneratorConfig,
  assignedCompute?: Decimal
): Decimal {
  const compute = getComputeMultiplier(gs, config, assignedCompute);
  if (config.type === "passive") {
    // Future hook: passive reputation/path multipliers can be composed here later.
    return compute;
  }
  return getReputationPathMultiplier(gs, config.path).mul(compute);
}

export function getGeneratorMultiplierStack(
  gs: GameState,
  config: ResourceGeneratorConfig,
  resource: ResourceKey,
  assignedCompute?: Decimal
): {
  base: Decimal;
  level: Decimal;
  talentUpgrade: Decimal;
  prestige: Decimal;
  reputationCompute: Decimal;
  total: Decimal;
} {
  const base = getBaseRewardMultiplier(config);
  const level = getLevelMultiplier(gs, config);
  const talentUpgrade = getTalentUpgradeMultiplier(gs, config, resource);
  const prestige = getPrestigeMultiplier(gs);
  const reputationCompute = getReputationComputeMultiplier(gs, config, assignedCompute);
  const total = base.mul(level).mul(talentUpgrade).mul(prestige).mul(reputationCompute);

  return { base, level, talentUpgrade, prestige, reputationCompute, total };
}

export function getManualClickMultiplierStack(
  gs: GameState,
  config: ResourceGeneratorConfig
): {
  base: Decimal;
  level: Decimal;
  talentUpgrade: Decimal;
  prestige: Decimal;
  reputationCompute: Decimal;
  total: Decimal;
} {
  // Manual generators have no computeScaling, so compute factor = 1 and
  // reputationCompute collapses to the reputation-path multiplier only.
  // Delegate to the shared stack so talents and prestige apply consistently.
  const primaryResource = (Object.keys(config.outputResources)[0] as ResourceKey) ?? "money";
  return getGeneratorMultiplierStack(gs, config, primaryResource);
}
