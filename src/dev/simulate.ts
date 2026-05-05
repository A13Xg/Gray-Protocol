// src/dev/simulate.ts
import Decimal from "break_eternity.js";
import { createInitialGameState } from "../core/state";
import { tick, setComputeAllocation } from "../core/engine";
import { getReputationAlignment } from "../core/reputation";
import { validateGameState } from "../core/validation";

function log(label: string, value: unknown): void {
  console.log(`[sim] ${label}:`, value);
}

export function runSimulation(): void {
  console.log("=== Gray Protocol Simulation ===");

  const gs = createInitialGameState();

  // Activate activities
  gs.activities["basicCryptoMining"].unlocked = true;
  gs.activities["basicCryptoMining"].active = true;
  gs.activities["basicCryptoMining"].level = 1;

  gs.activities["bugBountyHunting"].unlocked = true;
  gs.activities["bugBountyHunting"].active = true;
  gs.activities["bugBountyHunting"].level = 1;

  gs.activities["passwordCracking"].unlocked = true;
  gs.activities["passwordCracking"].active = true;
  gs.activities["passwordCracking"].level = 1;

  // Allocate compute
  setComputeAllocation(gs, "basicCryptoMining", new Decimal(5));
  setComputeAllocation(gs, "passwordCracking", new Decimal(3));

  log("Initial resources", {
    money: gs.resources.money.toString(),
    crypto: gs.resources.cryptoCurrency.toString(),
    compute: gs.resources.computePower.toString(),
    reputation: gs.resources.reputationStanding.toString(),
    alignment: getReputationAlignment(gs.resources.reputationStanding),
  });

  // Simulate 10 seconds (100 ticks of 100ms)
  for (let i = 0; i < 100; i++) {
    tick(gs, 100);
  }

  log("After 10s simulation", {
    money: gs.resources.money.toString(),
    crypto: gs.resources.cryptoCurrency.toString(),
    compute: gs.resources.computePower.toString(),
    reputation: gs.resources.reputationStanding.toString(),
    alignment: getReputationAlignment(gs.resources.reputationStanding),
  });

  // Simulate offline progress case (1 hour)
  const gs2 = createInitialGameState();
  gs2.activities["basicCryptoMining"].unlocked = true;
  gs2.activities["basicCryptoMining"].active = true;
  gs2.activities["basicCryptoMining"].level = 1;
  setComputeAllocation(gs2, "basicCryptoMining", new Decimal(5));

  const oneHourMs = 3_600_000;
  const ticks = Math.floor(oneHourMs / 100);
  for (let i = 0; i < ticks; i++) {
    tick(gs2, 100);
  }
  log("After 1h offline (basicCryptoMining)", {
    crypto: gs2.resources.cryptoCurrency.toString(),
  });

  // Validate no NaN
  const validation = validateGameState(gs);
  if (validation.valid) {
    console.log("[sim] ✅ No validation errors after simulation");
  } else {
    console.error("[sim] ❌ Validation errors:", validation.errors);
  }

  // Reputation additive check
  const gs3 = createInitialGameState();
  gs3.resources.reputationStanding = new Decimal(500);
  gs3.activities["passwordCracking"].active = true;
  gs3.activities["passwordCracking"].unlocked = true;
  gs3.activities["passwordCracking"].level = 1;
  tick(gs3, 10000); // 10s
  log("Reputation delta test (started +500, ran passwordCracking 10s)", {
    reputation: gs3.resources.reputationStanding.toString(),
    alignment: getReputationAlignment(gs3.resources.reputationStanding),
  });

  console.log("=== Simulation Complete ===");
}
