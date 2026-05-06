import Decimal from "break_eternity.js";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createInitialGameState } from "../state";
import { executeManualGenerator, startTimedGenerator, tickTimedGenerators, GENERATORS } from "../generators";
import { previewSerializedState } from "../persistence";
import { validateSerializedGameState, validateGameState } from "../validation";
import { getGeneratorMultiplierStack } from "../scaling";
import { applyPrestige } from "../prestige";
import { setNowProvider, resetNowProvider } from "../clock";
import { assertContentDefinitions } from "../content/validation";

describe("core invariants", () => {
  beforeEach(() => {
    let t = 1_000_000;
    setNowProvider(() => {
      t += 50;
      return t;
    });
  });

  afterEach(() => {
    resetNowProvider();
  });

  it("content definitions are valid", () => {
    expect(() => assertContentDefinitions()).not.toThrow();
  });

  it("applies multiplier stack in expected order", () => {
    const gs = createInitialGameState();
    const stack = getGeneratorMultiplierStack(gs, GENERATORS.hardenDevice.config, "money");
    const expected = stack.base
      .mul(stack.level)
      .mul(stack.talentUpgrade)
      .mul(stack.prestige)
      .mul(stack.reputationCompute);
    expect(stack.total.eq(expected)).toBe(true);
  });

  it("manual generator updates money and reputation", () => {
    const gs = createInitialGameState();
    const beforeMoney = gs.resources.money;
    const beforeRep = gs.resources.reputation;
    const result = executeManualGenerator(gs, "hardenDevice");

    expect(result).not.toBeNull();
    expect(gs.resources.money.gt(beforeMoney)).toBe(true);
    expect(gs.resources.reputation.gt(beforeRep)).toBe(true);
  });

  it("passive generator split-step deterministic output remains equal", () => {
    const a = createInitialGameState();
    const b = createInitialGameState();
    GENERATORS.antiVirus.executePassive(a, 1000);
    for (let i = 0; i < 10; i++) GENERATORS.antiVirus.executePassive(b, 100);
    expect(a.resources.reputation.eq(b.resources.reputation)).toBe(true);
  });

  it("timed generator only completes after duration", () => {
    const gs = createInitialGameState();
    gs.resources = {
      ...gs.resources,
      money: new Decimal(100),
      crypto: new Decimal(20),
    };

    expect(startTimedGenerator(gs, "buildDevice")).toBe(true);
    expect(tickTimedGenerators(gs, 30_000)).toHaveLength(0);
    expect(tickTimedGenerators(gs, 31_000).length).toBeGreaterThan(0);
  });

  it("prestige resets run resources and increases multiplier when eligible", () => {
    const gs = createInitialGameState();
    gs.prestige.cumulativeResources = {
      ...gs.prestige.cumulativeResources,
      money: new Decimal(2_000),
    };

    const beforeMultiplier = gs.prestige.multiplier;
    const beforeLevel = gs.prestige.level;

    expect(applyPrestige(gs)).toBe(true);
    expect(gs.prestige.level.gt(beforeLevel)).toBe(true);
    expect(gs.prestige.multiplier.gt(beforeMultiplier)).toBe(true);
    expect(gs.resources.money.eq(0)).toBe(true);
  });

  it("serialized game state remains scientific notation compatible", () => {
    const gs = createInitialGameState();
    executeManualGenerator(gs, "hardenDevice");
    const serialized = previewSerializedState(gs);

    const result = validateSerializedGameState(serialized);
    expect(result.valid).toBe(true);
    expect(validateGameState(gs).valid).toBe(true);
  });
});
