// src/dev/simulate.ts — Core Scaling / Talent / Prestige Simulation
import Decimal from "break_eternity.js";
import { createInitialGameState } from "../core/state";
import { previewSerializedState } from "../core/persistence";
import { validateCryptoPrice, validateGameState, validateSerializedGameState } from "../core/validation";
import {
  executeManualGenerator,
  GENERATOR_CONFIGS,
  upgradeGenerator,
  startTimedGenerator,
  tickTimedGenerators,
  GENERATORS,
} from "../core/generators";
import { getCryptoPrice, convertMoneyToCrypto } from "../core/crypto";
import {
  TALENT_NODES,
  canPurchaseTalentNode,
  purchaseTalentNode,
  getGeneratorTalentMultiplier,
  getCryptoEfficiencyMultiplier,
} from "../core/upgrades";
import { applyPrestige, canPrestige, getPrestigeRequirement } from "../core/prestige";
import { getGeneratorMultiplierStack } from "../core/scaling";

function log(label: string, value: unknown): void {
  console.log(`[sim] ${label}:`, value);
}

function snap(gs: ReturnType<typeof createInitialGameState>): Record<string, string> {
  return {
    money: gs.resources.money.toString(),
    crypto: gs.resources.crypto.toString(),
    compute: gs.resources.compute.toString(),
    reputation: gs.resources.reputation.toString(),
    prestigeLevel: gs.prestige.level.toString(),
    prestigeMultiplier: gs.prestige.multiplier.toString(),
  };
}

export function runSimulation(): void {
  console.log("=== Gray Protocol Simulation — Core Scaling Foundation ===");

  const gs = createInitialGameState();
  log("Initial state", snap(gs));

  // 1) Verify generator stack ordering output path
  const manualCfg = GENERATOR_CONFIGS.hardenDevice;
  const stackAtStart = getGeneratorMultiplierStack(gs, manualCfg, "money");
  log("Initial hardenDevice multiplier stack", {
    base: stackAtStart.base.toString(),
    level: stackAtStart.level.toString(),
    talentUpgrade: stackAtStart.talentUpgrade.toString(),
    prestige: stackAtStart.prestige.toString(),
    reputationCompute: stackAtStart.reputationCompute.toString(),
    total: stackAtStart.total.toString(),
  });

  const beforeManual = gs.resources.money;
  const m1 = executeManualGenerator(gs, "hardenDevice");
  log("Manual generator execute (hardenDevice)", {
    reward: m1?.outputs.money?.toString(),
    expectedDelta: beforeManual.add(m1?.outputs.money ?? 0).sub(beforeManual).toString(),
    stackTotal: m1?.multiplierStack?.total.toString(),
  });

  // 2) Level scaling
  upgradeGenerator(gs, "hardenDevice"); // lv2
  upgradeGenerator(gs, "hardenDevice"); // lv3
  const level3Stack = getGeneratorMultiplierStack(gs, manualCfg, "money");
  const m2 = executeManualGenerator(gs, "hardenDevice");
  log("Level scaling check (hardenDevice lv3)", {
    stackLevel: level3Stack.level.toString(),
    reward: m2?.outputs.money?.toString(),
  });

  // 3) Talent tree checks
  gs.resources = {
    ...gs.resources,
    money: new Decimal(100),
    crypto: new Decimal(10),
    reputation: new Decimal(10),
  };
  log("Talent nodes", Object.keys(TALENT_NODES));

  const canManualTalent = canPurchaseTalentNode(gs, "manualProtocols");
  const boughtManualTalent = purchaseTalentNode(gs, "manualProtocols");
  log("manualProtocols purchase", { canManualTalent, boughtManualTalent });

  const canPermanent = canPurchaseTalentNode(gs, "persistentAutomation");
  const boughtPermanent = purchaseTalentNode(gs, "persistentAutomation");
  log("persistentAutomation purchase", { canPermanent, boughtPermanent });

  const canMarket = canPurchaseTalentNode(gs, "marketMakers");
  const boughtMarket = purchaseTalentNode(gs, "marketMakers");
  log("marketMakers purchase", { canMarket, boughtMarket });

  const talentMult = getGeneratorTalentMultiplier(gs, manualCfg, "money");
  const cryptoEff = getCryptoEfficiencyMultiplier(gs);
  log("Talent multipliers", {
    manualMoneyMultiplier: talentMult.toString(),
    cryptoEfficiency: cryptoEff.toString(),
  });

  // 4) Prestige checks
  const reqAtLevel0 = getPrestigeRequirement(gs.prestige.level);
  gs.prestige.cumulativeResources = {
    ...gs.prestige.cumulativeResources,
    money: reqAtLevel0,
  };
  log("Prestige eligibility", {
    requirement: reqAtLevel0.toString(),
    canPrestige: canPrestige(gs),
  });

  const prestigeApplied = applyPrestige(gs);
  log("Prestige applied", {
    prestigeApplied,
    level: gs.prestige.level.toString(),
    multiplier: gs.prestige.multiplier.toString(),
    moneyAfterReset: gs.resources.money.toString(),
  });

  // 5) Post-prestige reward check
  const postPrestigeManual = executeManualGenerator(gs, "hardenDevice");
  log("Post-prestige manual reward", {
    reward: postPrestigeManual?.outputs.money?.toString(),
    prestigeMultiplier: gs.prestige.multiplier.toString(),
  });

  // 6) Timed generator check with scaling stack
  gs.resources = { ...gs.resources, money: new Decimal(100), crypto: new Decimal(20) };
  const timedStart = startTimedGenerator(gs, "buildDevice");
  const timedNone = tickTimedGenerators(gs, 30_000);
  const timedDone = tickTimedGenerators(gs, 31_000);
  log("Timed generator progression", {
    started: timedStart,
    partialCompletions: timedNone.length,
    finalCompletions: timedDone.length,
    finalMoney: gs.resources.money.toString(),
    stackTotal: timedDone[0]?.multiplierStack?.total.toString(),
  });

  // 7) Crypto fluctuation bounds and deterministic behavior
  const samples = [0, 5000, 10000, 15000, 20000, 30000, 45000, 60000].map((ms) => {
    const p = getCryptoPrice(ms);
    const valid = validateCryptoPrice(p).valid;
    return { ms, price: p.toFixed(6), valid };
  });
  log("Crypto price samples", samples);

  // Conversion uses deterministic elapsed override + talent efficiency
  gs.resources = { ...gs.resources, money: new Decimal(50) };
  const c1 = convertMoneyToCrypto(gs, new Decimal(10), 15_000);
  log("Crypto conversion at 15s", {
    price: c1?.pricePerUnit.toFixed(6),
    paid: c1?.paid.toString(),
    received: c1?.received.toString(),
    efficiencyMultiplier: c1?.efficiencyMultiplier.toString(),
  });

  // 8) Serialization validation
  const stateValidation = validateGameState(gs);
  const serialized = previewSerializedState(gs);
  const serializedValidation = validateSerializedGameState(serialized);

  log("Serialized resources", serialized.resources);
  log("Serialized prestige", serialized.prestige);

  if (stateValidation.valid && serializedValidation.valid) {
    console.log("[sim] ✅ All validations passed");
  } else {
    console.error("[sim] ❌ Validation errors", {
      state: stateValidation.errors,
      serialized: serializedValidation.errors,
    });
  }

  // 9) Additional deterministic split check for passive generator
  const gsA = createInitialGameState();
  const gsB = createInitialGameState();
  GENERATORS.antiVirus.executePassive(gsA, 1000);
  for (let i = 0; i < 10; i++) GENERATORS.antiVirus.executePassive(gsB, 100);
  log("Passive deterministic split check", {
    oneShot: gsA.resources.reputation.toString(),
    split: gsB.resources.reputation.toString(),
    equal: gsA.resources.reputation.eq(gsB.resources.reputation),
  });

  console.log("=== Simulation Complete ===");
}

runSimulation();
