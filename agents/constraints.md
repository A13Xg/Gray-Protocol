# Gray Protocol — Agent Constraints

## Decimal-Only Resource Math
- All resource values, costs, yields, multipliers, rates, and progression must use `Decimal` from `break_eternity.js`.
- Raw `number` is only acceptable for: tick timing, array indexes, static enum values, UI display helpers.
- Any use of `number` for resource math is a bug.

## No UI Logic in Core
- Files under `src/core/` and `src/dev/` must not import from Vue components, DOM APIs, or `document`/`window`.
- Engine tick must not reference UI state.

## No Persistence Inside Engine Tick
- `tick()` and `calculateOfflineProgress()` must not call `localStorage`, `saveGame()`, or `loadGame()`.
- Persistence is triggered externally (e.g., on interval, on user action).

## Config-Driven Balance
- No gameplay balance values (costs, yields, thresholds, scaling rates, prestige rewards) may be hardcoded inside logic modules.
- All such values must live in `GAME_CONFIG` in `src/core/config.ts`.

## Deterministic Tick
- `tick(state, deltaMs)` must be a pure function of its inputs.
- No randomness in the tick loop.
- Same input + deltaMs → same output.

## Validation Expectations
- If a resource value becomes NaN, it must be caught and repaired or throw in dev context.
- Invalid allocations (exceeding available computePower) must be rejected or clamped.
- Imported saves that fail validation must not corrupt current state.
