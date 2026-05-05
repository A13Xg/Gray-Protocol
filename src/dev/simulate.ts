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
import { ACTION_DEFINITIONS, calculateActionReward, canExecuteAction, executeAction } from "../core/actions";
import {
  canClaimTask,
  claimTask,
  getRecommendedTasks,
  getTaskProgressPercent,
  isTaskComplete,
  TASK_DEFINITIONS,
} from "../core/tasks";

function log(label: string, value: unknown): void {
  console.log(`[sim] ${label}:`, value);
}

function resourceSnapshot(gs: ReturnType<typeof createInitialGameState>): Record<string, string> {
  return {
    money: gs.resources.money.toString(),
    crypto: gs.resources.crypto.toString(),
    compute: gs.resources.compute.toString(),
    reputation: gs.resources.reputation.toString(),
  };
}

function resourceSnapshotDecimal(gs: ReturnType<typeof createInitialGameState>): {
  money: Decimal;
  crypto: Decimal;
  compute: Decimal;
  reputation: Decimal;
} {
  return {
    money: new Decimal(gs.resources.money),
    crypto: new Decimal(gs.resources.crypto),
    compute: new Decimal(gs.resources.compute),
    reputation: new Decimal(gs.resources.reputation),
  };
}

function resourceDelta(
  before: { money: Decimal; crypto: Decimal; compute: Decimal; reputation: Decimal },
  after: { money: Decimal; crypto: Decimal; compute: Decimal; reputation: Decimal }
): Record<string, string> {
  return {
    money: after.money.sub(before.money).toString(),
    crypto: after.crypto.sub(before.crypto).toString(),
    compute: after.compute.sub(before.compute).toString(),
    reputation: after.reputation.sub(before.reputation).toString(),
  };
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
  log("Fresh canonical resources", resourceSnapshot(gs));

  const starterActions = ["scanNetwork", "mineLocally", "bugBounty", "passwordAttempt"] as const;
  for (const actionId of starterActions) {
    const actionDef = ACTION_DEFINITIONS[actionId];
    const projected = calculateActionReward(gs, actionId);
    log(`Action config check (${actionId})`, {
      cost: Object.fromEntries(Object.entries(actionDef.baseCost).map(([k, v]) => [k, v.toString()])),
      baseReward: Object.fromEntries(Object.entries(actionDef.baseReward).map(([k, v]) => [k, v.toString()])),
      projectedReward: Object.fromEntries(Object.entries(projected).map(([k, v]) => [k, v?.toString() ?? "0"])),
      durationMs: actionDef.durationMs ?? 0,
      reputationEffect: actionDef.reputationEffect.toString(),
    });
  }

  // Unlock and buy a level in accessible activities.
  const startableActivities = ["basicCryptoMining", "computeLeasing", "dataIndexing", "bugBountyHunting", "defensiveAudit", "passwordCracking", "botnetExpansion"];
  for (const activityId of startableActivities) {
    gs.activities[activityId].unlocked = true;
    gs.activities[activityId].active = true;
    purchaseActivityLevel(gs, activityId);
  }
  log("Activities purchased", startableActivities);

  // Manual actions do not require compute allocation to execute.
  log("Can execute scanNetwork at start", canExecuteAction(gs, "scanNetwork"));
  const firstScan = executeAction(gs, "scanNetwork");
  log("scanNetwork outcome", firstScan ? { success: firstScan.success, reward: firstScan.appliedReward } : null);

  const firstMine = executeAction(gs, "mineLocally");
  log("mineLocally outcome (free compute scaling)", firstMine ? firstMine.appliedReward : null);

  const firstPasswordAttempt = executeAction(gs, "passwordAttempt");
  log(
    "passwordAttempt stochastic outcome",
    firstPasswordAttempt
      ? {
          success: firstPasswordAttempt.success,
          roll: firstPasswordAttempt.roll?.toString() ?? "n/a",
          chance: firstPasswordAttempt.successChance?.toString() ?? "n/a",
          reward: firstPasswordAttempt.appliedReward,
        }
      : null
  );

  const repeatedActionRuns = 4;
  for (const actionId of starterActions) {
    for (let i = 0; i < repeatedActionRuns; i++) {
      const before = resourceSnapshotDecimal(gs);
      const projected = calculateActionReward(gs, actionId);
      const outcome = executeAction(gs, actionId);
      const after = resourceSnapshotDecimal(gs);
      log(`Action repetition ${actionId} #${i + 1}`, {
        executed: outcome !== null,
        projectedReward: Object.fromEntries(Object.entries(projected).map(([k, v]) => [k, v?.toString() ?? "0"])),
        appliedReward: outcome
          ? Object.fromEntries(Object.entries(outcome.appliedReward).map(([k, v]) => [k, v?.toString() ?? "0"]))
          : {},
        reputationDelta: outcome?.reputationDelta.toString() ?? "0",
        resourceDelta: resourceDelta(before, after),
      });
    }
  }

  for (let i = 0; i < 10; i++) {
    executeAction(gs, "scanNetwork");
    executeAction(gs, "bugBounty");
    executeAction(gs, "passwordAttempt");
  }

  setComputeAllocation(gs, "basicCryptoMining", new Decimal(5));
  setComputeAllocation(gs, "passwordCracking", new Decimal(3));

  log("Compute allocation", {
    available: getAvailableCompute(gs).toString(),
    mining: getComputeAllocationForActivity(gs, "basicCryptoMining").toString(),
    cracking: getComputeAllocationForActivity(gs, "passwordCracking").toString(),
  });

  setComputeAllocation(gs, "basicCryptoMining", gs.resources.compute);
  log("Can execute passwordAttempt at 0 free compute", canExecuteAction(gs, "passwordAttempt"));
  setComputeAllocation(gs, "basicCryptoMining", new Decimal(5));

  tick(gs, 10_000);
  log("After 10s activity tick", {
    money: gs.resources.money.toString(),
    crypto: gs.resources.crypto.toString(),
    compute: gs.resources.compute.toString(),
    reputation: gs.resources.reputation.toString(),
    alignment: getReputationAlignment(gs.resources.reputation),
  });
  log("Reputation alignment after blackhat activity", getReputationAlignment(gs.resources.reputation));

  const beforeComputeScale = gs.resources.crypto;
  setComputeAllocation(gs, "basicCryptoMining", new Decimal(1));
  tick(gs, 5_000);
  const lowAllocationGain = gs.resources.crypto.sub(beforeComputeScale);
  setComputeAllocation(gs, "basicCryptoMining", new Decimal(6));
  const beforeHighAllocation = gs.resources.crypto;
  tick(gs, 5_000);
  const highAllocationGain = gs.resources.crypto.sub(beforeHighAllocation);
  log("Compute scaling validation (basicCryptoMining)", {
    lowAllocationGain: lowAllocationGain.toString(),
    highAllocationGain: highAllocationGain.toString(),
    higherAllocationImprovesYield: highAllocationGain.gt(lowAllocationGain),
  });

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

  log("Task completion snapshot", Object.fromEntries(
    Object.keys(TASK_DEFINITIONS).map((taskId) => [
      taskId,
      {
        complete: isTaskComplete(gs, taskId),
        progress: getTaskProgressPercent(gs, taskId),
      },
    ])
  ));

  const recommendedTasks = getRecommendedTasks(gs).map((task) => task.id);
  log("Recommended tasks", recommendedTasks);

  for (const taskId of recommendedTasks) {
    if (canClaimTask(gs, taskId)) {
      claimTask(gs, taskId);
    }
  }
  log("Claimed tasks", gs.tasks.claimedById);

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
