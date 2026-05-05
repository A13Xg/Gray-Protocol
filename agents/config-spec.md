# Config Spec

Primary balance/config source: `src/core/config.ts`

## GAME_CONFIG Structure

- `serialization.saveVersion`
- `tickRate`
- `offlineCapMs`
- `resources.starting`
- `resources.display`
- `reputation` thresholds
- `activities` definitions + scaling rates
- `research` definitions + effects
- `prestige` definitions
- global scaling knobs

## Resource Display Metadata

Use `GAME_CONFIG.resources.display` for labels/short labels.

Core resource identity is always `ResourceKey`; display metadata is presentation-only.

## Adding Activities

1. Add activity values to `GAME_CONFIG.activities`.
2. Ensure all costs/yields use canonical resource keys.
3. Wire into `ACTIVITY_DEFINITIONS` in `src/core/activities.ts`.
4. Keep balance data in config; do not hardcode in engine logic.

## Adding Research

1. Add node in `GAME_CONFIG.research` with cost, prerequisites, effects.
2. Add entry in `RESEARCH_DEFINITIONS`.
3. Keep effect behavior config-driven and reused by helper functions.

## Adding Prestige

1. Add layer in `GAME_CONFIG.prestige`.
2. Add layer mapping in `PRESTIGE_DEFINITIONS`.
3. Use `performPrestige` reset/reward flow; avoid direct reset logic in unrelated modules.

## Balance Placement Rules

- Costs, yields, rates, gates, thresholds, reward amounts, and caps belong in config.
- Logic modules should consume config values, not define balance constants inline.
