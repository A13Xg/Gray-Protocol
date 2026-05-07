import Decimal from "break_eternity.js";
import type {
  GameState,
  ResourceKey,
  ResourceGeneratorConfig,
  TimedGeneratorProgress,
  GeneratorExecuteResult,
  TimedActivityNode,
} from "./types";
import { getGeneratorMultiplierStack, getManualClickMultiplierStack } from "./scaling";
import { recordResourceGain } from "./progression";
import { GENERATOR_CONFIGS, NODE_CONFIGS, NODE_LIST, resolveNodeId } from "./content/nodes";

export { GENERATOR_CONFIGS } from "./content/nodes";

function getNodeDefaultMultiplier(configId: string): Decimal {
  const node = NODE_CONFIGS[configId];
  if (!node) return new Decimal(1);
  return new Decimal(1).add(node.defaultMultiplierPct.div(100));
}

function canAffordInputs(
  gs: GameState,
  config: ResourceGeneratorConfig,
  inputResourcesOverride?: Partial<Record<ResourceKey, Decimal>>
): boolean {
  const inputs = inputResourcesOverride ?? config.inputResources;
  if (!inputs) return true;
  for (const [k, amount] of Object.entries(inputs) as [ResourceKey, Decimal][]) {
    if (gs.resources[k].lt(amount)) return false;
  }
  return true;
}

function applyInputCosts(
  gs: GameState,
  config: ResourceGeneratorConfig,
  inputResourcesOverride?: Partial<Record<ResourceKey, Decimal>>
): void {
  const inputs = inputResourcesOverride ?? config.inputResources;
  if (!inputs) return;
  const next = { ...gs.resources };
  for (const [k, amount] of Object.entries(inputs) as [ResourceKey, Decimal][]) {
    next[k] = next[k].sub(amount);
  }
  gs.resources = next;
}

function getGeneratorLevel(gs: GameState, config: ResourceGeneratorConfig): number {
  return gs.generators.levels[config.id] ?? config.level;
}

export function getTimedActivityCostMultiplier(gs: GameState, config: ResourceGeneratorConfig): Decimal {
  if (config.type !== "timed") return new Decimal(1);
  const node = NODE_CONFIGS[config.id];
  const growthPct = node?.upgrade.timedInputCostGrowthPct ?? new Decimal(5);
  const level = getGeneratorLevel(gs, config);
  const exponent = Math.max(0, level - 1);
  const growthMultiplier = new Decimal(1).add(growthPct.div(100));
  return Decimal.pow(growthMultiplier, exponent);
}

export function getTimedActivityInputCosts(
  gs: GameState,
  config: ResourceGeneratorConfig
): Partial<Record<ResourceKey, Decimal>> {
  if (config.type !== "timed" || !config.inputResources) return config.inputResources ?? {};
  const multiplier = getTimedActivityCostMultiplier(gs, config);
  return Object.fromEntries(
    Object.entries(config.inputResources).map(([k, amount]) => [k, amount.mul(multiplier)])
  ) as Partial<Record<ResourceKey, Decimal>>;
}

function applyScaledOutputs(
  gs: GameState,
  config: ResourceGeneratorConfig,
  tickCount: number,
  getMultiplier = getGeneratorMultiplierStack
): { outputs: Partial<Record<ResourceKey, Decimal>>; stack: GeneratorExecuteResult["multiplierStack"] } {
  const next = { ...gs.resources };
  const outputs: Partial<Record<ResourceKey, Decimal>> = {};
  const defaultNodeMultiplier = getNodeDefaultMultiplier(config.id);
  let stack: GeneratorExecuteResult["multiplierStack"];

  for (const [k, amount] of Object.entries(config.outputResources) as [ResourceKey, Decimal][]) {
    const multiplier = getMultiplier(gs, config, k);
    stack = stack ?? multiplier;
    const scaled = amount.mul(defaultNodeMultiplier).mul(multiplier.total).mul(tickCount);
    next[k] = next[k].add(scaled);
    outputs[k] = scaled;
  }

  gs.resources = next;
  recordResourceGain(gs, outputs);
  return { outputs, stack };
}

function isNodeUnlocked(gs: GameState, id: string): boolean {
  const node = NODE_CONFIGS[id];
  if (!node || !node.enabled) return false;
  if (node.unlock.minReputation && gs.resources.reputation.lt(node.unlock.minReputation)) return false;
  if (node.unlock.maxReputation && gs.resources.reputation.gt(node.unlock.maxReputation)) return false;

  for (const [resource, required] of Object.entries(node.unlock.minResources ?? {}) as [ResourceKey, Decimal][]) {
    if (gs.resources[resource].lt(required)) return false;
  }

  for (const [requiredId, requiredLevel] of Object.entries(node.unlock.requiredNodeLevels ?? {})) {
    const level = gs.generators.levels[requiredId] ?? NODE_CONFIGS[requiredId]?.upgrade.startingLevel ?? 1;
    if (level < requiredLevel) return false;
  }

  return true;
}

function isPassiveEnabled(gs: GameState, id: string): boolean {
  return gs.generators.passiveEnabledById[id] ?? true;
}

export function setPassiveNodeEnabled(gs: GameState, id: string, enabled: boolean): boolean {
  const resolved = resolveNodeId(id);
  const config = GENERATOR_CONFIGS[resolved];
  if (!config || config.type !== "passive") return false;
  gs.generators.passiveEnabledById = {
    ...gs.generators.passiveEnabledById,
    [resolved]: enabled,
  };
  return true;
}

export function createGeneratorInstance(config: ResourceGeneratorConfig) {
  return {
    config,

    executeManual(gs: GameState): GeneratorExecuteResult | null {
      if (config.type !== "manual") return null;
      if (!canAffordInputs(gs, config)) return null;
      applyInputCosts(gs, config);

      const { outputs, stack } = applyScaledOutputs(gs, config, 1, () => getManualClickMultiplierStack(gs, config));

      let repDelta = new Decimal(0);
      if (config.reputationEffect) {
        repDelta = config.reputationEffect;
        gs.resources = {
          ...gs.resources,
          reputation: gs.resources.reputation.add(repDelta),
        };
        recordResourceGain(gs, { reputation: repDelta });
      }

      return {
        generatorId: config.id,
        outputs,
        reputationDelta: repDelta.eq(0) ? undefined : repDelta,
        multiplierStack: stack,
      };
    },

    executePassive(gs: GameState, elapsedMs: number, assignedCompute?: Decimal): GeneratorExecuteResult | null {
      if (config.type !== "passive") return null;
      const interval = config.tickIntervalMs ?? 1000;
      const carried = gs.generators.passiveRemainderMs[config.id] ?? 0;
      const totalMs = carried + elapsedMs;
      const ticks = Math.floor(totalMs / interval);
      const remainder = totalMs - ticks * interval;

      gs.generators.passiveRemainderMs = {
        ...gs.generators.passiveRemainderMs,
        [config.id]: remainder,
      };
      if (ticks === 0) return null;

      const assigned = assignedCompute ?? gs.resources.compute;
      const { outputs, stack } = applyScaledOutputs(
        gs,
        config,
        ticks,
        (state, generatorConfig, resource) => getGeneratorMultiplierStack(state, generatorConfig, resource, assigned)
      );

      return {
        generatorId: config.id,
        outputs,
        multiplierStack: stack,
      };
    },

    executeTimed(gs: GameState, progressMs: number, assignedCompute?: Decimal): GeneratorExecuteResult | null {
      if (config.type !== "timed" || !config.durationMs) return null;
      if (progressMs < config.durationMs) return null;

      const assigned = assignedCompute ?? gs.resources.compute;
      const { outputs, stack } = applyScaledOutputs(
        gs,
        config,
        1,
        (state, generatorConfig, resource) => getGeneratorMultiplierStack(state, generatorConfig, resource, assigned)
      );
      return {
        generatorId: config.id,
        outputs,
        multiplierStack: stack,
      };
    },

    upgrade(gs: GameState): boolean {
      const current = gs.generators.levels[config.id] ?? config.level;
      if (current >= config.maxLevel) return false;
      gs.generators.levels[config.id] = current + 1;
      return true;
    },

    currentLevel(gs: GameState): number {
      return gs.generators.levels[config.id] ?? config.level;
    },

    isUnlocked(gs: GameState): boolean {
      return isNodeUnlocked(gs, config.id);
    },
  };
}

export const GENERATORS = Object.fromEntries(
  Object.values(GENERATOR_CONFIGS).map((cfg) => [cfg.id, createGeneratorInstance(cfg)])
) as Record<string, ReturnType<typeof createGeneratorInstance>>;

export function executeManualGenerator(gs: GameState, id: string): GeneratorExecuteResult | null {
  const resolved = resolveNodeId(id);
  const generator = GENERATORS[resolved];
  if (!generator || !generator.isUnlocked(gs)) return null;
  return generator.executeManual(gs);
}

export function allocatePassiveCompute(gs: GameState): Record<string, Decimal> {
  const unlockedPassive = Object.values(GENERATORS).filter(
    (gen) => gen.config.type === "passive" && gen.isUnlocked(gs) && isPassiveEnabled(gs, gen.config.id)
  );
  if (unlockedPassive.length === 0) return {};

  const totalCompute = gs.resources.compute.max(0);
  const equalShare = totalCompute.div(unlockedPassive.length);

  return Object.fromEntries(unlockedPassive.map((gen) => [gen.config.id, equalShare]));
}

export function tickPassiveGenerators(gs: GameState, deltaMs: number): void {
  const allocations = allocatePassiveCompute(gs);
  for (const [id, computeShare] of Object.entries(allocations)) {
    const gen = GENERATORS[id];
    if (gen) {
      gen.executePassive(gs, deltaMs, computeShare);
    }
  }
}

function isTimedGeneratorRunning(gs: GameState, id: string): boolean {
  const progress = gs.generators.timedProgress[id];
  return !!progress && !progress.completed;
}

export function allocateTimedCompute(gs: GameState): Record<string, Decimal> {
  const runningTimed = Object.keys(gs.generators.timedProgress).filter((id) => isTimedGeneratorRunning(gs, id));
  if (runningTimed.length === 0) return {};

  const weighted = runningTimed.map((id) => {
    const config = GENERATOR_CONFIGS[id];
    const weight = config?.computeScaling?.enabled ? config.computeScaling.baselineCompute.max(0) : new Decimal(1);
    return { id, weight };
  });
  const totalWeight = weighted.reduce((sum, entry) => sum.add(entry.weight), new Decimal(0));
  const totalCompute = gs.resources.compute.max(0);

  if (totalWeight.lte(0)) {
    return Object.fromEntries(weighted.map((entry) => [entry.id, new Decimal(0)]));
  }

  return Object.fromEntries(
    weighted.map((entry) => [entry.id, totalCompute.mul(entry.weight.div(totalWeight))])
  );
}

export function startTimedGenerator(gs: GameState, id: string): boolean {
  const resolved = resolveNodeId(id);
  const cfg = GENERATOR_CONFIGS[resolved];
  if (!cfg || cfg.type !== "timed") return false;
  const generator = GENERATORS[resolved];
  if (!generator || !generator.isUnlocked(gs)) return false;

  const existing = gs.generators.timedProgress[resolved];
  if (existing && !existing.completed) return false;
  const inputCosts = getTimedActivityInputCosts(gs, cfg);
  if (!canAffordInputs(gs, cfg, inputCosts)) return false;

  applyInputCosts(gs, cfg, inputCosts);

  const progress: TimedGeneratorProgress = {
    generatorId: resolved,
    startedAt: gs.timestamps.lastTickAt,
    progressMs: 0,
    completed: false,
  };
  gs.generators.timedProgress = { ...gs.generators.timedProgress, [resolved]: progress };
  return true;
}

export function tickTimedGenerators(gs: GameState, deltaMs: number): GeneratorExecuteResult[] {
  const results: GeneratorExecuteResult[] = [];
  const computeAllocation = allocateTimedCompute(gs);

  for (const [id, progress] of Object.entries(gs.generators.timedProgress)) {
    if (progress.completed) continue;

    const newProgress = { ...progress, progressMs: progress.progressMs + deltaMs };
    gs.generators.timedProgress = { ...gs.generators.timedProgress, [id]: newProgress };

    const gen = GENERATORS[id];
    if (!gen) continue;

    const assignedCompute = computeAllocation[id] ?? new Decimal(0);
    const result = gen.executeTimed(gs, newProgress.progressMs, assignedCompute);
    if (result) {
      gs.generators.timedProgress = {
        ...gs.generators.timedProgress,
        [id]: { ...newProgress, completed: true },
      };
      results.push(result);

      if (gs.generators.timedAutoRunById[id]) {
        const restarted = startTimedGenerator(gs, id);
        if (!restarted) {
          gs.generators.timedAutoRunById = {
            ...gs.generators.timedAutoRunById,
            [id]: false,
          };
        }
      }
    }
  }

  return results;
}

export function setTimedActivityAutoRun(gs: GameState, id: string, enabled: boolean): boolean {
  const resolved = resolveNodeId(id);
  const cfg = GENERATOR_CONFIGS[resolved];
  if (!cfg || cfg.type !== "timed") return false;
  const node = NODE_CONFIGS[resolved];
  if (!node?.runtime.allowAutoRun) return false;

  const generator = GENERATORS[resolved];
  if (!generator || !generator.isUnlocked(gs)) return false;

  gs.generators.timedAutoRunById = {
    ...gs.generators.timedAutoRunById,
    [resolved]: enabled,
  };

  if (!enabled) return true;
  if (isTimedGeneratorRunning(gs, resolved)) return true;

  const started = startTimedGenerator(gs, resolved);
  if (!started) {
    gs.generators.timedAutoRunById = {
      ...gs.generators.timedAutoRunById,
      [resolved]: false,
    };
  }
  return started;
}

export function createTimedActivityNode(id: string): TimedActivityNode | null {
  const resolved = resolveNodeId(id);
  const cfg = GENERATOR_CONFIGS[resolved];
  if (!cfg || cfg.type !== "timed") return null;

  return {
    id: resolved,
    start(gs: GameState): boolean {
      return startTimedGenerator(gs, resolved);
    },
    setAutoRun(gs: GameState, enabled: boolean): boolean {
      return setTimedActivityAutoRun(gs, resolved, enabled);
    },
    currentLevel(gs: GameState): number {
      return GENERATORS[resolved]?.currentLevel(gs) ?? cfg.level;
    },
    getInputCosts(gs: GameState): Partial<Record<ResourceKey, Decimal>> {
      return getTimedActivityInputCosts(gs, cfg);
    },
    isAutoRunEnabled(gs: GameState): boolean {
      return gs.generators.timedAutoRunById[resolved] ?? false;
    },
    isRunning(gs: GameState): boolean {
      return isTimedGeneratorRunning(gs, resolved);
    },
  };
}

export const TIMED_ACTIVITY_NODES = Object.fromEntries(
  NODE_LIST.filter((node) => node.kind === "timedTask").map((node) => [node.id, createTimedActivityNode(node.id)!])
) as Record<string, TimedActivityNode>;

export function upgradeGenerator(gs: GameState, id: string): boolean {
  const resolved = resolveNodeId(id);
  return GENERATORS[resolved]?.upgrade(gs) ?? false;
}
