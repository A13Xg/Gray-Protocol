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
- `manualActionScaling` (alignment/reputation-based action multipliers)
- `actions` definitions + action-specific balance knobs
- `tasks` definitions + requirement/reward data
- `upgrades` definitions + scaling/effect data
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

Current baseline has 9 activities across shared/whitehat/blackhat paths.

## Adding Manual Actions

1. Add action values to `GAME_CONFIG.actions`.
2. Keep action balance in config only (costs, rewards, variance, success chance, scaling).
3. Wire into `ACTION_DEFINITIONS` in `src/core/actions.ts`.
4. Keep execution deterministic for stochastic outcomes.

## Adding Tasks

1. Add task values to `GAME_CONFIG.tasks`.
2. Use one of supported task types (`resourceThreshold`, `reputationThreshold`, `actionCount`, `activityLevel`, `researchCompletion`).
3. Wire into `TASK_DEFINITIONS` in `src/core/tasks.ts`.
4. Keep rewards and requirements config-driven.

## Adding Upgrades

1. Add upgrade values to `GAME_CONFIG.upgrades`.
2. Keep costs/effect values in config only.
3. Wire into `UPGRADE_DEFINITIONS` in `src/core/upgrades.ts`.
4. Keep upgrade state level-based (`levelsById`) and bounded by `maxLevel`.
5. Use supported effect types safely; prefer deterministic multipliers.

## Adding Research

1. Add node in `GAME_CONFIG.research` with cost, prerequisites, effects.
2. Add entry in `RESEARCH_DEFINITIONS`.
3. Keep effect behavior config-driven and reused by helper functions.

Current baseline has 9 research nodes across shared/whitehat/blackhat paths.

Research nodes support:
- `path`
- `prerequisites`
- optional `reputationGate`
- optional `position`
- effects including yield multipliers, compute efficiency, reputation gain/loss, and unlock effects (`activityUnlock`, `upgradeUnlock`).

## Adding Prestige

1. Add layer in `GAME_CONFIG.prestige`.
2. Add layer mapping in `PRESTIGE_DEFINITIONS`.
3. Use `performPrestige` reset/reward flow; avoid direct reset logic in unrelated modules.

## Balance Placement Rules

- Costs, yields, rates, gates, thresholds, reward amounts, and caps belong in config.
- Logic modules should consume config values, not define balance constants inline.
- Upgrade values, scaling, and effect strengths also belong in config.
