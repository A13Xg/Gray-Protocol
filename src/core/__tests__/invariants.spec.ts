import Decimal from "break_eternity.js";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createInitialGameState } from "../state";
import { executeAction, getActionLevel, getActionYield, getReputationAlignment, levelUpAction } from "../actions";
import { tick } from "../engine";
import { previewSerializedState } from "../persistence";
import { validateSerializedGameState, validateGameState } from "../validation";
import { setNowProvider, resetNowProvider } from "../clock";

describe("core invariants (manual actions only)", () => {
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

  it("hardenSystem grants money and positive reputation", () => {
    const gs = createInitialGameState();
    const beforeMoney = gs.resources.money;
    const beforeRep = gs.resources.reputation;

    const result = executeAction(gs, "hardenSystem");

    expect(result).not.toBeNull();
    expect(result?.rewardApplied.eq(1)).toBe(true);
    expect(result?.reputationDelta.eq(1)).toBe(true);
    expect(gs.resources.money.eq(beforeMoney.add(1))).toBe(true);
    expect(gs.resources.reputation.eq(beforeRep.add(1))).toBe(true);
  });

  it("hackSystem grants money and negative reputation", () => {
    const gs = createInitialGameState();
    const beforeMoney = gs.resources.money;
    const beforeRep = gs.resources.reputation;

    const result = executeAction(gs, "hackSystem");

    expect(result).not.toBeNull();
    expect(result?.rewardApplied.eq(1)).toBe(true);
    expect(result?.reputationDelta.eq(-1)).toBe(true);
    expect(gs.resources.money.eq(beforeMoney.add(1))).toBe(true);
    expect(gs.resources.reputation.eq(beforeRep.sub(1))).toBe(true);
  });

  it("legacy aliases still resolve to the two manual actions", () => {
    const gs = createInitialGameState();

    const pentest = executeAction(gs, "pentestSystem");
    const exploit = executeAction(gs, "exploitSystem");

    expect(pentest?.actionId).toBe("hardenSystem");
    expect(exploit?.actionId).toBe("hackSystem");
  });

  it("manual action levels remain fixed and non-upgradeable", () => {
    const gs = createInitialGameState();

    expect(getActionLevel(gs, "hardenSystem")).toBe(1);
    expect(getActionYield(gs, "hardenSystem").eq(1)).toBe(true);
    expect(levelUpAction(gs, "hardenSystem")).toBe(false);
    expect(getActionLevel(gs, "hardenSystem")).toBe(1);
  });

  it("reputation alignment thresholds remain correct", () => {
    expect(getReputationAlignment(new Decimal(101))).toBe("whitehat");
    expect(getReputationAlignment(new Decimal(-101))).toBe("blackhat");
    expect(getReputationAlignment(new Decimal(100))).toBe("greyhat");
    expect(getReputationAlignment(new Decimal(-100))).toBe("greyhat");
  });

  it("engine tick only advances timestamp in manual-only mode", () => {
    const gs = createInitialGameState();
    const beforeTickAt = gs.timestamps.lastTickAt;
    const beforeMoney = gs.resources.money;
    const beforeCrypto = gs.resources.crypto;

    tick(gs, 250);

    expect(gs.timestamps.lastTickAt).toBe(beforeTickAt + 250);
    expect(gs.resources.money.eq(beforeMoney)).toBe(true);
    expect(gs.resources.crypto.eq(beforeCrypto)).toBe(true);
  });

  it("serialized state remains valid scientific notation", () => {
    const gs = createInitialGameState();
    executeAction(gs, "hardenSystem");
    executeAction(gs, "hackSystem");

    const serialized = previewSerializedState(gs);
    const result = validateSerializedGameState(serialized);

    expect(result.valid).toBe(true);
    expect(serialized.resources.money).toBe("2.000000000000e+0");
    expect(serialized.resources.reputation).toBe("0");
    expect(validateGameState(gs).valid).toBe(true);
  });
});
