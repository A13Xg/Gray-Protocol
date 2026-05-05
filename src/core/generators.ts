import Decimal from "break_eternity.js";
import type {
  GameState,
  ResourceKey,
  ResourceGeneratorConfig,
  TimedGeneratorProgress,
  GeneratorExecuteResult,
} from "./types";
import { getGeneratorMultiplierStack } from "./scaling";
import { recordResourceGain } from "./progression";

// ── Config Registry ───────────────────────────────────────────────────────────

export const GENERATOR_CONFIGS: Record<string, ResourceGeneratorConfig> = {
  // ── Manual ────────────────────────────────────────────────────────────────
  hackDevice: {
    id: "hackDevice",
    name: "Hack Device",
    description: "Exploit a target device for quick money. Damages reputation.",
    type: "manual",
    path: "blackhat",
    outputResources: { money: new Decimal(1) },
    reputationEffect: new Decimal(-1),
    level: 1,
    maxLevel: 10,
    levelScaling: 1.5,
  },
  hardenDevice: {
    id: "hardenDevice",
    name: "Harden Device",
    description: "Secure a device for a client. Earns money and builds reputation.",
    type: "manual",
    path: "whitehat",
    outputResources: { money: new Decimal(1) },
    reputationEffect: new Decimal(1),
    level: 1,
    maxLevel: 10,
    levelScaling: 1.5,
  },

  // ── Passive ───────────────────────────────────────────────────────────────
  payloadScript: {
    id: "payloadScript",
    name: "Payload Script",
    description: "A background script that passively erodes reputation each second.",
    type: "passive",
    path: "blackhat",
    tickIntervalMs: 1000,
    outputResources: { reputation: new Decimal(-0.1) },
    level: 1,
    maxLevel: 10,
    levelScaling: 1.2,
    computeScaling: {
      enabled: true,
      baselineCompute: new Decimal(10),
      exponent: new Decimal(0.25),
    },
  },
  antiVirus: {
    id: "antiVirus",
    name: "Anti-Virus Software",
    description: "A background process that passively builds reputation each second.",
    type: "passive",
    path: "whitehat",
    tickIntervalMs: 1000,
    outputResources: { reputation: new Decimal(0.1) },
    level: 1,
    maxLevel: 10,
    levelScaling: 1.2,
    computeScaling: {
      enabled: true,
      baselineCompute: new Decimal(10),
      exponent: new Decimal(0.25),
    },
  },

  // ── Timed ─────────────────────────────────────────────────────────────────
  buildDevice: {
    id: "buildDevice",
    name: "Build Device",
    description: "Invest money and crypto to construct a device that yields double the investment.",
    type: "timed",
    path: "shared",
    durationMs: 60_000,
    inputResources: { money: new Decimal(10), crypto: new Decimal(5) },
    outputResources: { money: new Decimal(20) },
    level: 1,
    maxLevel: 5,
    levelScaling: 2.0,
    computeScaling: {
      enabled: true,
      baselineCompute: new Decimal(10),
      exponent: new Decimal(0.2),
    },
  },
};

function canAffordInputs(gs: GameState, config: ResourceGeneratorConfig): boolean {
  if (!config.inputResources) return true;
  for (const [k, amount] of Object.entries(config.inputResources) as [ResourceKey, Decimal][]) {
    if (gs.resources[k].lt(amount)) return false;
  }
  return true;
}

function applyInputCosts(gs: GameState, config: ResourceGeneratorConfig): void {
  if (!config.inputResources) return;
  const next = { ...gs.resources };
  for (const [k, amount] of Object.entries(config.inputResources) as [ResourceKey, Decimal][]) {
    next[k] = next[k].sub(amount);
  }
  gs.resources = next;
}

function applyScaledOutputs(
  gs: GameState,
  config: ResourceGeneratorConfig,
  tickCount: number
): { outputs: Partial<Record<ResourceKey, Decimal>>; stack: GeneratorExecuteResult["multiplierStack"] } {
  const next = { ...gs.resources };
  const outputs: Partial<Record<ResourceKey, Decimal>> = {};
  let stack: GeneratorExecuteResult["multiplierStack"];

  for (const [k, amount] of Object.entries(config.outputResources) as [ResourceKey, Decimal][]) {
    const multiplier = getGeneratorMultiplierStack(gs, config, k);
    stack = stack ?? multiplier;
    const scaled = amount.mul(multiplier.total).mul(tickCount);
    next[k] = next[k].add(scaled);
    outputs[k] = scaled;
  }

  gs.resources = next;
  recordResourceGain(gs, outputs);
  return { outputs, stack };
}

export function createGeneratorInstance(config: ResourceGeneratorConfig) {
  return {
    config,

    executeManual(gs: GameState): GeneratorExecuteResult | null {
      if (config.type !== "manual") return null;
      if (!canAffordInputs(gs, config)) return null;
      applyInputCosts(gs, config);

      const { outputs, stack } = applyScaledOutputs(gs, config, 1);

      let repDelta = new Decimal(0);
      if (config.reputationEffect) {
        const repStack = getGeneratorMultiplierStack(gs, config, "reputation");
        repDelta = config.reputationEffect.mul(repStack.total);
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

    executePassive(gs: GameState, elapsedMs: number): GeneratorExecuteResult | null {
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

      const { outputs, stack } = applyScaledOutputs(gs, config, ticks);

      let repDelta = new Decimal(0);
      if (config.reputationEffect) {
        const repStack = getGeneratorMultiplierStack(gs, config, "reputation");
        repDelta = config.reputationEffect.mul(repStack.total).mul(ticks);
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

    executeTimed(gs: GameState, progressMs: number): GeneratorExecuteResult | null {
      if (config.type !== "timed" || !config.durationMs) return null;
      if (progressMs < config.durationMs) return null;

      const { outputs, stack } = applyScaledOutputs(gs, config, 1);
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
      const unlock = config.unlock;
      if (!unlock) return true;
      if (unlock.minReputation && gs.resources.reputation.lt(unlock.minReputation)) return false;
      if (unlock.maxReputation && gs.resources.reputation.gt(unlock.maxReputation)) return false;
      return true;
    },
  };
}

// ── Pre-built Instances ───────────────────────────────────────────────────────

export const GENERATORS = Object.fromEntries(
  Object.values(GENERATOR_CONFIGS).map((cfg) => [cfg.id, createGeneratorInstance(cfg)])
) as Record<string, ReturnType<typeof createGeneratorInstance>>;

// ── Top-level Engine Functions ────────────────────────────────────────────────

export function executeManualGenerator(gs: GameState, id: string): GeneratorExecuteResult | null {
  const generator = GENERATORS[id];
  if (!generator || !generator.isUnlocked(gs)) return null;
  return generator.executeManual(gs);
}

export function tickPassiveGenerators(gs: GameState, deltaMs: number): void {
  for (const gen of Object.values(GENERATORS)) {
    if (gen.config.type === "passive" && gen.isUnlocked(gs)) {
      gen.executePassive(gs, deltaMs);
    }
  }
}

export function startTimedGenerator(gs: GameState, id: string): boolean {
  const cfg = GENERATOR_CONFIGS[id];
  if (!cfg || cfg.type !== "timed") return false;
  const generator = GENERATORS[id];
  if (!generator || !generator.isUnlocked(gs)) return false;

  const existing = gs.generators.timedProgress[id];
  if (existing && !existing.completed) return false;
  if (!canAffordInputs(gs, cfg)) return false;

  applyInputCosts(gs, cfg);

  const progress: TimedGeneratorProgress = {
    generatorId: id,
    startedAt: gs.timestamps.lastTickAt,
    progressMs: 0,
    completed: false,
  };
  gs.generators.timedProgress = { ...gs.generators.timedProgress, [id]: progress };
  return true;
}

export function tickTimedGenerators(gs: GameState, deltaMs: number): GeneratorExecuteResult[] {
  const results: GeneratorExecuteResult[] = [];

  for (const [id, progress] of Object.entries(gs.generators.timedProgress)) {
    if (progress.completed) continue;

    const newProgress = { ...progress, progressMs: progress.progressMs + deltaMs };
    gs.generators.timedProgress = { ...gs.generators.timedProgress, [id]: newProgress };

    const gen = GENERATORS[id];
    if (!gen) continue;

    const result = gen.executeTimed(gs, newProgress.progressMs);
    if (result) {
      gs.generators.timedProgress = {
        ...gs.generators.timedProgress,
        [id]: { ...newProgress, completed: true },
      };
      results.push(result);
    }
  }

  return results;
}

export function upgradeGenerator(gs: GameState, id: string): boolean {
  return GENERATORS[id]?.upgrade(gs) ?? false;
}
