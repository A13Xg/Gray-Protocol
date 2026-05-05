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

export function getComputeMultiplier(gs: GameState, config: ResourceGeneratorConfig): Decimal {
  if (!config.computeScaling?.enabled) return new Decimal(1);
  const baseline = config.computeScaling.baselineCompute;
  if (baseline.lte(0)) return new Decimal(1);
  const ratio = gs.resources.compute.div(baseline).max(0);
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

export function getReputationComputeMultiplier(gs: GameState, config: ResourceGeneratorConfig): Decimal {
  return getReputationPathMultiplier(gs, config.path).mul(getComputeMultiplier(gs, config));
}

export function getGeneratorMultiplierStack(
  gs: GameState,
  config: ResourceGeneratorConfig,
  resource: ResourceKey
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
  const reputationCompute = getReputationComputeMultiplier(gs, config);
  const total = base.mul(level).mul(talentUpgrade).mul(prestige).mul(reputationCompute);

  return { base, level, talentUpgrade, prestige, reputationCompute, total };
}
