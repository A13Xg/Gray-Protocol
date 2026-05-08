import { createInitialGameState } from "../core/state";
import { executeAction } from "../core/actions";

export interface ScenarioResult {
  name: string;
  resources: {
    money: string;
    crypto: string;
    compute: string;
    reputation: string;
  };
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
    notes,
  };
}

export function runWhitehatScenario(): ScenarioResult {
  const gs = createInitialGameState();
  const notes: string[] = [];

  for (let i = 0; i < 30; i++) executeAction(gs, "hardenSystem");

  notes.push("Ran 30 hardenSystem manual actions.");
  return snapshot("whitehat", gs, notes);
}

export function runBlackhatScenario(): ScenarioResult {
  const gs = createInitialGameState();
  const notes: string[] = [];

  for (let i = 0; i < 30; i++) executeAction(gs, "hackSystem");

  notes.push("Ran 30 hackSystem manual actions.");
  return snapshot("blackhat", gs, notes);
}

export function runBalancedScenario(): ScenarioResult {
  const gs = createInitialGameState();
  const notes: string[] = [];

  for (let i = 0; i < 20; i++) {
    executeAction(gs, i % 2 === 0 ? "hardenSystem" : "hackSystem");
  }

  notes.push("Ran alternating manual actions only.");
  return snapshot("balanced", gs, notes);
}

export function runAllScenarios(): ScenarioResult[] {
  return [runWhitehatScenario(), runBlackhatScenario(), runBalancedScenario()];
}
