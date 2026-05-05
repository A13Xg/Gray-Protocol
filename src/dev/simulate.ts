import Decimal from "break_eternity.js";
import { createInitialGameState } from "../core/state";
import {
  calculateOfflineProgress,
  getAvailableCompute,
  getComputeAllocationForActivity,
  setComputeAllocation,
  tick,
} from "../core/engine";
import { canUnlockActivity, purchaseActivityLevel } from "../core/activities";
import { getReputationAlignment } from "../core/reputation";
import {
  canResearchNode,
  getResearchComputeEfficiencyMultiplier,
  getResearchDefinition,
  getResearchResourceYieldMultipliers,
  purchaseResearchNode,
} from "../core/research";
import { canPrestige, previewPrestigeGain } from "../core/prestige";
import { previewSerializedState } from "../core/persistence";
import {
  validateGameState,
  validateResearchDefinitions,
  validateResearchGraph,
  validateSerializedGameState,
  validateUpgradeDefinitions,
} from "../core/validation";
import {
  canPurchaseUpgrade,
  getUpgradeComputeEfficiencyMultiplier,
  getUpgradeLevel,
  getUpgradeYieldMultipliers,
  purchaseUpgrade,
  UPGRADE_DEFINITIONS,
} from "../core/upgrades";

function log(label: string, value: unknown): void {
  console.log(`[sim] ${label}:`, value);
}

export function runSimulation(): void {
  console.log("=== Gray Protocol Simulation ===");

  const researchDefinitionsValidation = validateResearchDefinitions();
  const researchGraphValidation = validateResearchGraph();
  if (!researchDefinitionsValidation.valid || !researchGraphValidation.valid) {
    console.error("[sim] ❌ Research configuration invalid", {
      definitions: researchDefinitionsValidation.errors,
      graph: researchGraphValidation.errors,
    });
  } else {
    console.log("[sim] ✅ Research definitions + graph validation passed");
  }

  const upgradeDefinitionValidation = validateUpgradeDefinitions();
  if (!upgradeDefinitionValidation.valid) {
    console.error("[sim] ❌ Upgrade configuration invalid", upgradeDefinitionValidation.errors);
  } else {
    console.log("[sim] ✅ Upgrade configuration validation passed");
  }

  const gs = createInitialGameState();
  log("Fresh canonical resources", {
    money: gs.resources.money.toString(),
    crypto: gs.resources.crypto.toString(),
    compute: gs.resources.compute.toString(),
    reputation: gs.resources.reputation.toString(),
  });

  // Unlock and buy a level in accessible activities.
  const startableActivities = ["basicCryptoMining", "computeLeasing", "dataIndexing", "bugBountyHunting", "defensiveAudit", "passwordCracking", "botnetExpansion"];
  for (const activityId of startableActivities) {
    gs.activities[activityId].unlocked = true;
    gs.activities[activityId].active = true;
    purchaseActivityLevel(gs, activityId);
  }
  log("Activities purchased", startableActivities);

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
  log("Reputation alignment after blackhat activity", getReputationAlignment(gs.resources.reputation));

  gs.resources.money = gs.resources.money.add(new Decimal(1_000));
  gs.resources.compute = gs.resources.compute.add(new Decimal(1_000));
  gs.resources.crypto = gs.resources.crypto.add(new Decimal(1_000));

  // Move into whitehat alignment so whitehat path gates can be tested.
  gs.resources.reputation = new Decimal(130);

  // --- Upgrade demonstrations ---
  log("Upgrade definitions count", Object.keys(UPGRADE_DEFINITIONS).length);

  log("canPurchase miningFirmwareOptimization", canPurchaseUpgrade(gs, "miningFirmwareOptimization"));
  const purchasedMining = purchaseUpgrade(gs, "miningFirmwareOptimization");
  log("purchaseUpgrade miningFirmwareOptimization", purchasedMining);
  log("miningFirmwareOptimization level", getUpgradeLevel(gs, "miningFirmwareOptimization"));

  const yieldMults = getUpgradeYieldMultipliers(gs);
  log("Upgrade yield multipliers after purchase", {
    basicCryptoMining: yieldMults["basicCryptoMining"]?.toString() ?? "1",
  });

  // Purchase compute efficiency upgrade
  const purchasedThermal = purchaseUpgrade(gs, "thermalLoadBalancing");
  log("purchaseUpgrade thermalLoadBalancing", purchasedThermal);
  log("Upgrade compute efficiency multiplier", getUpgradeComputeEfficiencyMultiplier(gs).toString());

  // Tick to observe upgrade effect on yields
  const cryptoBefore = gs.resources.crypto;
  tick(gs, 10_000);
  log("Crypto gained in 10s with upgrade active", gs.resources.crypto.sub(cryptoBefore).toString());

  // Whitehat produces positive reputation
  gs.resources.reputation = new Decimal(0);
  tick(gs, 5_000);
  log("Reputation after 5s whitehat (defensiveAudit + bugBounty active)", gs.resources.reputation.toString());
  log("Alignment", getReputationAlignment(gs.resources.reputation));

  log("Research affordability", {
    parallelProcessing: canResearchNode(gs, "parallelProcessing"),
    distributedSchedulers: canResearchNode(gs, "distributedSchedulers"),
    protocolOptimization: canResearchNode(gs, "protocolOptimization"),
    responsibleDisclosure: canResearchNode(gs, "responsibleDisclosure"),
    defensiveAutomation: canResearchNode(gs, "defensiveAutomation"),
    trustedResearchNetwork: canResearchNode(gs, "trustedResearchNetwork"),
    exploitAutomation: canResearchNode(gs, "exploitAutomation"),
  });

  // Shared branch
  purchaseResearchNode(gs, "parallelProcessing");
  purchaseResearchNode(gs, "distributedSchedulers");
  purchaseResearchNode(gs, "protocolOptimization");

  // Whitehat branch
  purchaseResearchNode(gs, "responsibleDisclosure");
  purchaseResearchNode(gs, "defensiveAutomation");

  // Show unlock impact before and after trustedResearchNetwork
  log("Can unlock threatIntelAnalysis before trustedResearchNetwork", canUnlockActivity(gs, "threatIntelAnalysis"));
  purchaseResearchNode(gs, "trustedResearchNetwork");
  log("Can unlock threatIntelAnalysis after trustedResearchNetwork", canUnlockActivity(gs, "threatIntelAnalysis"));

  // Research effect snapshots
  log("Research compute efficiency multiplier", getResearchComputeEfficiencyMultiplier(gs).toString());
  log("Research resource multipliers", Object.fromEntries(
    Object.entries(getResearchResourceYieldMultipliers(gs)).map(([key, value]) => [key, value?.toString() ?? "1"])
  ));

  // Demonstrate activity yield change from research
  const miningBeforeResearchTick = gs.resources.crypto;
  tick(gs, 10_000);
  log("Crypto gained in 10s with research multipliers", gs.resources.crypto.sub(miningBeforeResearchTick).toString());

  // Blackhat branch (requires negative reputation)
  gs.resources.reputation = new Decimal(-150);
  purchaseResearchNode(gs, "exploitAutomation");
  purchaseResearchNode(gs, "distributedIntrusionTooling");
  log("Can unlock zeroDayResearch before zeroDaySupplyChain", canUnlockActivity(gs, "zeroDayResearch"));
  purchaseResearchNode(gs, "zeroDaySupplyChain");
  log("Can unlock zeroDayResearch after zeroDaySupplyChain", canUnlockActivity(gs, "zeroDayResearch"));

  log("Completed research count", gs.research.completed.size);
  log("Completed research nodes", Array.from(gs.research.completed));
  log("Research node position metadata sample", getResearchDefinition("parallelProcessing")?.position ?? null);

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

  // --- Save/export/import round-trip: upgrades preserved ---
  const serialized = previewSerializedState(gs);
  log("Serialized upgrade levels", serialized.upgrades.levelsById);
  log("Serialized scientific resources", serialized.resources);

  const encodedPayload = btoa(JSON.stringify(serialized));
  const decodedPayload = JSON.parse(atob(encodedPayload)) as typeof serialized;
  const upgradeLevelsPreserved = JSON.stringify(decodedPayload.upgrades.levelsById) === JSON.stringify(serialized.upgrades.levelsById);
  const completedResearchPreserved =
    JSON.stringify((decodedPayload.researchCompleted ?? []).slice().sort()) ===
    JSON.stringify((serialized.researchCompleted ?? []).slice().sort());
  log("Serialized upgrade levels preserved through export/import payload round-trip", upgradeLevelsPreserved);
  log("Serialized completed research preserved through export/import payload round-trip", completedResearchPreserved);

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
