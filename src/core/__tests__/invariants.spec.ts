import Decimal from "break_eternity.js";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createInitialGameState } from "../state";
import {
  executeManualGenerator,
  startTimedGenerator,
  tickTimedGenerators,
  GENERATORS,
  tickPassiveGenerators,
  allocateTimedCompute,
  getTimedActivityInputCosts,
  setTimedActivityAutoRun,
  upgradeGenerator,
} from "../generators";
import { previewSerializedState } from "../persistence";
import { validateSerializedGameState, validateGameState } from "../validation";
import { getGeneratorMultiplierStack, getManualClickMultiplierStack } from "../scaling";
import { applyPrestige } from "../prestige";
import { setNowProvider, resetNowProvider } from "../clock";
import { assertContentDefinitions } from "../content/validation";
import { executeAction, getActionLevel, getActionYield, levelUpAction } from "../actions";

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

  it("manual click actions scale yield by level with the full multiplier stack", () => {
    const gs = createInitialGameState();
    // rep=0, prestige=1 (defaults) → all bonus multipliers at neutral; yield == level
    gs.resources = { ...gs.resources, money: new Decimal(100) };

    expect(getActionLevel(gs, "hardenComputer")).toBe(1);
    expect(getActionYield(gs, "hardenComputer").eq(1)).toBe(true);

    expect(levelUpAction(gs, "hardenComputer")).toBe(true); // costs $10
    expect(getActionLevel(gs, "hardenComputer")).toBe(2);
    expect(getActionYield(gs, "hardenComputer").eq(2)).toBe(true);

    const result = executeAction(gs, "hardenComputer");
    expect(result).not.toBeNull();
    expect(result?.level).toBe(2);
    expect(result?.rewardApplied.eq(2)).toBe(true);
    expect(result?.reputationDelta.eq(1)).toBe(true);
    // 100 - 10 (upgrade) + 2 (action) = 92
    expect(gs.resources.money.eq(92)).toBe(true);
    expect(gs.resources.reputation.eq(1)).toBe(true);
  });

  it("manual click multiplier stack applies full scaling including prestige and reputation path", () => {
    const gs = createInitialGameState();
    gs.resources = { ...gs.resources, reputation: new Decimal(250) };
    gs.prestige.multiplier = new Decimal(5);

    const stack = getManualClickMultiplierStack(gs, GENERATORS.hardenDevice.config);
    expect(stack.base.eq(1)).toBe(true);
    expect(stack.level.eq(1)).toBe(true);
    // No talents purchased
    expect(stack.talentUpgrade.eq(1)).toBe(true);
    // Prestige multiplier was set to 5
    expect(stack.prestige.eq(5)).toBe(true);
    // whitehat at rep=250: normalized=clamp01(2.5)=1, directional=1+1×0.25=1.25
    // manual has no computeScaling → compute=1 → reputationCompute=1.25
    expect(stack.reputationCompute.eq(new Decimal(1.25))).toBe(true);
    // total = 1 × 1 × 1 × 5 × 1.25 = 6.25
    expect(stack.total.eq(new Decimal(6.25))).toBe(true);
  });

  it("passive generator split-step deterministic output remains equal", () => {
    const a = createInitialGameState();
    const b = createInitialGameState();
    GENERATORS.antiVirus.executePassive(a, 1000);
    for (let i = 0; i < 10; i++) GENERATORS.antiVirus.executePassive(b, 100);
    expect(a.resources.crypto.eq(b.resources.crypto)).toBe(true);
  });

  it("passive generators share compute and do not alter reputation", () => {
    const gs = createInitialGameState();
    gs.resources = {
      ...gs.resources,
      compute: new Decimal(10),
      reputation: new Decimal(500),
    };
    // Unlock both passive generators (payloadScript needs hackDevice≥2, antiVirus needs hardenDevice≥2)
    gs.generators.levels = { hackDevice: 2, hardenDevice: 2 };

    tickPassiveGenerators(gs, 1000);

    // Two passive generators split 10 compute into 5/5 each.
    // Per generator: base 0.1 * compute ratio(5/10)^0.25.
    const perGenerator = new Decimal(0.1).mul(Decimal.pow(new Decimal(0.5), new Decimal(0.25)));
    const expectedCrypto = perGenerator.mul(2);

    expect(gs.resources.crypto.eq(expectedCrypto)).toBe(true);
    expect(gs.resources.reputation.eq(500)).toBe(true);
  });

  it("passive compute multiplier uses assigned over total compute", () => {
    const gs = createInitialGameState();
    gs.resources = {
      ...gs.resources,
      compute: new Decimal(20),
    };
    // Unlock both passive generators
    gs.generators.levels = { hackDevice: 2, hardenDevice: 2 };

    tickPassiveGenerators(gs, 1000);

    // Two passive generators split 20 compute into 10/10.
    // Per generator multiplier should be (10/20)^0.25.
    const perGenerator = new Decimal(0.1).mul(Decimal.pow(new Decimal(0.5), new Decimal(0.25)));
    const expectedCrypto = perGenerator.mul(2);

    expect(gs.resources.crypto.eq(expectedCrypto)).toBe(true);
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

  it("timed activities share compute proportionally by baseline weight", () => {
    const gs = createInitialGameState();
    gs.resources = {
      ...gs.resources,
      money: new Decimal(100),
      crypto: new Decimal(30),
      compute: new Decimal(30),
    };

    expect(startTimedGenerator(gs, "buildDevice")).toBe(true);
    expect(startTimedGenerator(gs, "marketSkim")).toBe(true);

    const allocation = allocateTimedCompute(gs);
    expect(allocation.buildDevice.eq(10)).toBe(true);
    expect(allocation.marketSkim.eq(20)).toBe(true);
  });

  it("timed activity cost increases slightly with level", () => {
    const gs = createInitialGameState();
    const buildDevice = GENERATORS.buildDevice.config;
    // Provide enough resources to pay the buildDevice upgrade cost ($50 + 15 CR)
    gs.resources = { ...gs.resources, money: new Decimal(100), crypto: new Decimal(30) };

    const baseCosts = getTimedActivityInputCosts(gs, buildDevice);
    expect(baseCosts.money?.eq(10)).toBe(true);
    expect(baseCosts.crypto?.eq(5)).toBe(true);

    expect(upgradeGenerator(gs, "buildDevice")).toBe(true);
    const scaledCosts = getTimedActivityInputCosts(gs, buildDevice);
    expect(scaledCosts.money?.eq(new Decimal(10).mul(1.05))).toBe(true);
    expect(scaledCosts.crypto?.eq(new Decimal(5).mul(1.05))).toBe(true);
  });

  it("timed auto-run disables itself when resources are insufficient", () => {
    const gs = createInitialGameState();
    gs.resources = {
      ...gs.resources,
      money: new Decimal(10),
      crypto: new Decimal(5),
    };

    expect(setTimedActivityAutoRun(gs, "buildDevice", true)).toBe(true);
    expect(gs.generators.timedAutoRunById.buildDevice).toBe(true);
    expect(tickTimedGenerators(gs, 60_000)).toHaveLength(1);
    expect(gs.generators.timedAutoRunById.buildDevice).toBe(false);
  });

  it("timed activity output scales with reputation path multiplier", () => {
    const highRep = createInitialGameState();
    const lowRep = createInitialGameState();

    highRep.resources = {
      ...highRep.resources,
      money: new Decimal(100),
      crypto: new Decimal(20),
      reputation: new Decimal(100),
      compute: new Decimal(10),
    };
    lowRep.resources = {
      ...lowRep.resources,
      money: new Decimal(100),
      crypto: new Decimal(20),
      reputation: new Decimal(-100),
      compute: new Decimal(10),
    };

    expect(startTimedGenerator(highRep, "buildDevice")).toBe(true);
    expect(startTimedGenerator(lowRep, "buildDevice")).toBe(true);

    const highResult = tickTimedGenerators(highRep, 60_000)[0];
    const lowResult = tickTimedGenerators(lowRep, 60_000)[0];

    expect(highResult.outputs.money?.gt(lowResult.outputs.money ?? new Decimal(0))).toBe(true);
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
    // Provide money so the hackDevice upgrade ($10) succeeds
    gs.resources = { ...gs.resources, money: new Decimal(100) };
    levelUpAction(gs, "hackComputer");
    executeManualGenerator(gs, "hardenDevice");
    const serialized = previewSerializedState(gs);

    const result = validateSerializedGameState(serialized);
    expect(result.valid).toBe(true);
    expect(serialized.generators?.levels.hackDevice).toBe("2.000000000000e+0");
    expect(validateGameState(gs).valid).toBe(true);
  });
});
