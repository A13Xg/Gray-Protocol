import Decimal from "break_eternity.js";
import { createInitialGameState } from "../core/state";
import {
  calculateOfflineProgress,
  getAvailableCompute,
  getComputeAllocationForActivity,
  setComputeAllocation,
  tick,
} from "../core/engine";
import { ACTIVITY_DEFINITIONS, purchaseActivityLevel } from "../core/activities";
import { getReputationAlignment } from "../core/reputation";
import { canResearchNode, purchaseResearchNode } from "../core/research";
import { canPrestige, previewPrestigeGain } from "../core/prestige";
import { previewSerializedState } from "../core/persistence";
import { validateGameState, validateSerializedGameState } from "../core/validation";

function log(label: string, value: unknown): void {
  console.log(`[sim] ${label}:`, value);
}

export function runSimulation(): void {
  console.log("=== Gray Protocol Simulation ===");

  const gs = createInitialGameState();
  log("Fresh canonical resources", {
    money: gs.resources.money.toString(),
    crypto: gs.resources.crypto.toString(),
    compute: gs.resources.compute.toString(),
    reputation: gs.resources.reputation.toString(),
  });

  for (const activityId of Object.keys(ACTIVITY_DEFINITIONS)) {
    gs.activities[activityId].unlocked = true;
    gs.activities[activityId].active = true;
    purchaseActivityLevel(gs, activityId);
  }

  setComputeAllocation(gs, "basicCryptoMining", new Decimal(5));
  setComputeAllocation(gs, "passwordCracking", new Decimal(3));

  log("Compute allocation", {
    available: getAvailableCompute(gs).toString(),
    mining: getComputeAllocationForActivity(gs, "basicCryptoMining").toString(),
    cracking: getComputeAllocationForActivity(gs, "passwordCracking").toString(),
  });

  tick(gs, 10_000);
  log("After 10s activity tick", {
    money: gs.resources.money.toString(),
    crypto: gs.resources.crypto.toString(),
    compute: gs.resources.compute.toString(),
    reputation: gs.resources.reputation.toString(),
    alignment: getReputationAlignment(gs.resources.reputation),
  });

  gs.resources.money = gs.resources.money.add(new Decimal(1_000));
  gs.resources.compute = gs.resources.compute.add(new Decimal(1_000));
  gs.resources.crypto = gs.resources.crypto.add(new Decimal(1_000));

  log("Research affordability", {
    parallelProcessing: canResearchNode(gs, "parallelProcessing"),
    responsibleDisclosure: canResearchNode(gs, "responsibleDisclosure"),
    exploitAutomation: canResearchNode(gs, "exploitAutomation"),
  });

  purchaseResearchNode(gs, "parallelProcessing");

  calculateOfflineProgress(gs, 3_600_000);
  log("After offline progress", {
    money: gs.resources.money.toString(),
    crypto: gs.resources.crypto.toString(),
    reputation: gs.resources.reputation.toString(),
  });

  log("Prestige preview", {
    canPrestige: canPrestige(gs, "protocolReset"),
    gain: previewPrestigeGain(gs, "protocolReset").toString(),
  });

  const serialized = previewSerializedState(gs);
  log("Serialized scientific resources", serialized.resources);

  const validation = validateGameState(gs);
  const serializedValidation = validateSerializedGameState(serialized);

  if (validation.valid && serializedValidation.valid) {
    console.log("[sim] ✅ State and serialized payload validation passed");
  } else {
    console.error("[sim] ❌ Validation errors", {
      gameState: validation.errors,
      serialized: serializedValidation.errors,
    });
  }

  console.log("=== Simulation Complete ===");
}
