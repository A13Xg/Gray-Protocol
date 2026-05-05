// src/dev/simulate.ts — Core Baseline Simulation
import Decimal from "break_eternity.js";
import { createInitialGameState } from "../core/state";
import { ACTION_DEFINITIONS, executeAction, getReputationAlignment } from "../core/actions";
import { convertMoneyToCrypto, getCryptoPrice } from "../core/crypto";
import { validateGameState, validateCryptoPrice, validateSerializedGameState } from "../core/validation";
import { previewSerializedState } from "../core/persistence";

function log(label: string, value: unknown): void {
  console.log(`[sim] ${label}:`, value);
}

function snap(gs: ReturnType<typeof createInitialGameState>): Record<string, string> {
  return {
    money: gs.resources.money.toString(),
    crypto: gs.resources.crypto.toFixed(6),
    compute: gs.resources.compute.toString(),
    reputation: gs.resources.reputation.toString(),
    alignment: getReputationAlignment(gs.resources.reputation),
  };
}

export function runSimulation(): void {
  console.log("=== Gray Protocol Simulation — Core Baseline ===");

  const gs = createInitialGameState();
  log("Initial resources", snap(gs));

  // ── Manual Actions ────────────────────────────────────────────────────────
  log("Actions defined", Object.keys(ACTION_DEFINITIONS));

  // pentest x5
  for (let i = 1; i <= 5; i++) {
    const o = executeAction(gs, "pentestSystem");
    log(`pentestSystem #${i}`, {
      reward: o?.rewardApplied.toString(),
      repDelta: o?.reputationDelta.toString(),
      moneyNow: gs.resources.money.toString(),
      repNow: gs.resources.reputation.toString(),
    });
  }

  // exploit x3
  for (let i = 1; i <= 3; i++) {
    const o = executeAction(gs, "exploitSystem");
    log(`exploitSystem #${i}`, {
      reward: o?.rewardApplied.toString(),
      repDelta: o?.reputationDelta.toString(),
      moneyNow: gs.resources.money.toString(),
      repNow: gs.resources.reputation.toString(),
    });
  }

  log("After 5 pentest + 3 exploit", snap(gs));

  // ── Crypto Price Curve ────────────────────────────────────────────────────
  const priceSamples = [0, 10_000, 20_000, 30_000, 40_000, 50_000, 60_000].map((ms) => {
    const price = getCryptoPrice(ms);
    const valid = validateCryptoPrice(price).valid;
    return { ms: `${ms / 1000}s`, price: price.toFixed(4), valid };
  });
  log("Crypto price curve (1-minute period)", priceSamples);

  // ── Crypto Conversion ─────────────────────────────────────────────────────
  // Fund the state so conversion is possible
  for (let i = 0; i < 5; i++) executeAction(gs, "pentestSystem"); // +$5 more

  const result = convertMoneyToCrypto(gs, new Decimal(3));
  log("Convert $3 to crypto", {
    paid: result?.paid.toString(),
    received: result?.received.toFixed(6),
    pricePerUnit: result?.pricePerUnit.toFixed(4),
    moneyNow: gs.resources.money.toString(),
    cryptoNow: gs.resources.crypto.toFixed(6),
  });

  // Over-budget conversion must fail
  const overResult = convertMoneyToCrypto(gs, new Decimal(9999));
  log("Convert $9999 (over budget) → should be null", overResult === null ? "null ✅" : "ERROR: expected null");

  // Zero-amount conversion must fail
  const zeroResult = convertMoneyToCrypto(gs, new Decimal(0));
  log("Convert $0 → should be null", zeroResult === null ? "null ✅" : "ERROR: expected null");

  // ── Reputation Alignment Thresholds ──────────────────────────────────────
  const repTests: number[] = [-150, -100, -50, 0, 50, 100, 150];
  const alignments = repTests.map((r) => ({
    rep: r,
    alignment: getReputationAlignment(new Decimal(r)),
  }));
  log("Reputation alignment thresholds", alignments);

  // ── Validation ────────────────────────────────────────────────────────────
  const stateValidation = validateGameState(gs);
  const serialized = previewSerializedState(gs);
  const serializedValidation = validateSerializedGameState(serialized);

  log("Serialized resources (scientific notation)", serialized.resources);

  if (stateValidation.valid && serializedValidation.valid) {
    console.log("[sim] ✅ All validations passed");
  } else {
    console.error("[sim] ❌ Validation errors", {
      state: stateValidation.errors,
      serialized: serializedValidation.errors,
    });
  }

  console.log("=== Simulation Complete ===");
}

runSimulation();
