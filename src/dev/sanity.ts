import Decimal from "break_eternity.js";
import { assertContentDefinitions, validateContentDefinitions } from "../core/content/validation";
import { BALANCE_TARGETS } from "../core/balanceTargets";
import { createInitialGameState } from "../core/state";
import { executeManualGenerator, GENERATOR_CONFIGS } from "../core/generators";
import { getCryptoEfficiencyMultiplier } from "../core/upgrades";
import { runAllScenarios } from "./scenarios";

interface Check {
  name: string;
  ok: boolean;
  details?: string;
}

function checkManualRewardBounds(): Check {
  const gs = createInitialGameState();
  const result = executeManualGenerator(gs, "hardenDevice");
  const reward = result?.outputs.money ?? new Decimal(0);
  const ok = reward.gte(BALANCE_TARGETS.earlyGame.manualRewardMin)
    && reward.lte(BALANCE_TARGETS.earlyGame.manualRewardMax);
  return {
    name: "manual reward within target bounds",
    ok,
    details: `reward=${reward.toString()}`,
  };
}

function checkTimedDurationConfig(): Check {
  const duration = GENERATOR_CONFIGS.buildDevice.durationMs ?? 0;
  const ok = duration >= BALANCE_TARGETS.earlyGame.timedDurationMsMin
    && duration <= BALANCE_TARGETS.earlyGame.timedDurationMsMax;
  return {
    name: "timed duration in target window",
    ok,
    details: `durationMs=${duration}`,
  };
}

function checkCryptoEfficiencyBounds(): Check {
  const gs = createInitialGameState();
  const eff = getCryptoEfficiencyMultiplier(gs);
  const ok = eff.gte(BALANCE_TARGETS.earlyGame.cryptoEfficiencyMin)
    && eff.lte(BALANCE_TARGETS.earlyGame.cryptoEfficiencyMax);
  return {
    name: "base crypto efficiency in target bounds",
    ok,
    details: `eff=${eff.toString()}`,
  };
}

function checkScenarioReachability(): Check {
  const results = runAllScenarios();
  const hasFinite = results.every((r) => {
    const values = Object.values(r.resources).map((v) => new Decimal(v));
    return values.every((d) => d.isFinite() && !Decimal.isNaN(d));
  });
  return {
    name: "headless scenarios produce finite resources",
    ok: hasFinite,
    details: results.map((r) => `${r.name}: money=${r.resources.money}, rep=${r.resources.reputation}`).join(" | "),
  };
}

function runSanityChecks(): Check[] {
  assertContentDefinitions();
  const content = validateContentDefinitions();

  const checks: Check[] = [
    {
      name: "content definitions valid",
      ok: content.valid,
      details: content.valid ? "ok" : content.errors.join("; "),
    },
    checkManualRewardBounds(),
    checkTimedDurationConfig(),
    checkCryptoEfficiencyBounds(),
    checkScenarioReachability(),
  ];

  return checks;
}

const checks = runSanityChecks();
let failed = 0;

for (const c of checks) {
  const icon = c.ok ? "PASS" : "FAIL";
  console.log(`[sanity] ${icon} ${c.name}${c.details ? ` :: ${c.details}` : ""}`);
  if (!c.ok) failed += 1;
}

if (failed > 0) {
  console.error(`[sanity] Failed checks: ${failed}`);
  process.exit(1);
}

console.log("[sanity] All checks passed");
