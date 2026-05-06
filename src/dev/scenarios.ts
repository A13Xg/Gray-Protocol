import Decimal from "break_eternity.js";
import { createInitialGameState } from "../core/state";
import { executeAction } from "../core/actions";
import { executeManualGenerator, startTimedGenerator, tickTimedGenerators, tickPassiveGenerators } from "../core/generators";
import { convertMoneyToCrypto } from "../core/crypto";
import { getCryptoEfficiencyMultiplier, purchaseTalentNode } from "../core/upgrades";
import { canPrestige } from "../core/prestige";

export interface ScenarioResult {
  name: string;
  resources: {
    money: string;
    crypto: string;
    compute: string;
    reputation: string;
  };
  canPrestige: boolean;
  notes: string[];
}

function snapshot(name: string, gs: ReturnType<typeof createInitialGameState>, notes: string[]): ScenarioResult {
  return {
    name,
    resources: {
      money: gs.resources.money.toString(),
      crypto: gs.resources.crypto.toString(),
      compute: gs.resources.compute.toString(),
      reputation: gs.resources.reputation.toString(),
    },
    canPrestige: canPrestige(gs),
    notes,
  };
}

export function runWhitehatScenario(): ScenarioResult {
  const gs = createInitialGameState();
  const notes: string[] = [];

  for (let i = 0; i < 30; i++) executeAction(gs, "pentestSystem");
  executeManualGenerator(gs, "hardenDevice");

  notes.push("Ran 30 whitehat manual actions + hardenDevice generator.");
  return snapshot("whitehat", gs, notes);
}

export function runBlackhatScenario(): ScenarioResult {
  const gs = createInitialGameState();
  const notes: string[] = [];

  for (let i = 0; i < 30; i++) executeAction(gs, "exploitSystem");
  executeManualGenerator(gs, "hackDevice");

  notes.push("Ran 30 blackhat manual actions + hackDevice generator.");
  return snapshot("blackhat", gs, notes);
}

export function runBalancedScenario(): ScenarioResult {
  const gs = createInitialGameState();
  const notes: string[] = [];

  for (let i = 0; i < 20; i++) executeAction(gs, i % 2 === 0 ? "pentestSystem" : "exploitSystem");

  gs.resources = {
    ...gs.resources,
    money: gs.resources.money.add(new Decimal(50)),
    crypto: gs.resources.crypto.add(new Decimal(10)),
  };

  purchaseTalentNode(gs, "manualProtocols");
  purchaseTalentNode(gs, "marketMakers");

  const efficiency = getCryptoEfficiencyMultiplier(gs);
  notes.push(`Crypto efficiency multiplier: ${efficiency.toString()}`);

  startTimedGenerator(gs, "buildDevice");
  tickTimedGenerators(gs, 61_000);

  tickPassiveGenerators(gs, 10_000);

  convertMoneyToCrypto(gs, new Decimal(5), 20_000);
  notes.push("Ran timed + passive + conversion flow.");

  return snapshot("balanced", gs, notes);
}

export function runAllScenarios(): ScenarioResult[] {
  return [runWhitehatScenario(), runBlackhatScenario(), runBalancedScenario()];
}
