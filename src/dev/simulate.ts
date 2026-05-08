import { createInitialGameState } from "../core/state";
import { previewSerializedState } from "../core/persistence";
import { validateGameState, validateSerializedGameState } from "../core/validation";
import { executeAction, getActionYield } from "../core/actions";
import { assertContentDefinitions } from "../core/content/validation";

function log(label: string, value: unknown): void {
  console.log(`[sim] ${label}:`, value);
}

function snapshot(gs: ReturnType<typeof createInitialGameState>): Record<string, string> {
  return {
    money: gs.resources.money.toString(),
    crypto: gs.resources.crypto.toString(),
    compute: gs.resources.compute.toString(),
    reputation: gs.resources.reputation.toString(),
  };
}

export function runSimulation(): void {
  assertContentDefinitions();
  console.log("=== Gray Protocol Simulation — Manual Node Foundation ===");

  const gs = createInitialGameState();
  log("Initial state", snapshot(gs));

  executeAction(gs, "hardenSystem");
  executeAction(gs, "hackSystem");
  executeAction(gs, "pentestSystem");

  log("Post-action state", snapshot(gs));
  log("Current yields", {
    hardenSystem: getActionYield(gs, "hardenSystem").toString(),
    hackSystem: getActionYield(gs, "hackSystem").toString(),
  });

  const serialized = previewSerializedState(gs);
  log("Serialized state", serialized);
  log("Serialized valid", validateSerializedGameState(serialized).valid);
  log("Game state valid", validateGameState(gs).valid);
}

runSimulation();
