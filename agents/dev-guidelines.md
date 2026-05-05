# Dev Guidelines

## How to Modify Safely

- Keep core changes in `src/core/*` and keep UI in Vue files.
- Preserve canonical resource keys: `money`, `crypto`, `compute`, `reputation`.
- Use `Decimal` for all game-scale values.
- Use scientific-string serialization in save payloads.
- Put balance in `src/core/config.ts`.
- Keep upgrade progression level-based with deterministic multipliers.
- Keep research progression graph-valid (no missing prereqs, self-deps, or cycles).

## Where to Add Features

- Activities: `src/core/activities.ts` + config
- Upgrades: `src/core/upgrades.ts` + config
- Research: `src/core/research.ts` + config
- Prestige: `src/core/prestige.ts` + config
- Engine behavior: `src/core/engine.ts`
- Save/migration: `src/core/persistence.ts`
- Validation: `src/core/validation.ts`

## What Not To Break

- Deterministic `tick(state, deltaMs)` behavior
- Offline batching through `calculateOfflineProgress`
- No persistence side-effects inside tick
- Canonical key serialization compatibility
- Legacy key migration path in persistence
- Upgrade level persistence compatibility (`upgrades.levelsById`)
- Combined multiplier ordering (activity base/level/compute then upgrades/research)
- Research unlock integration (`activityUnlock`/`upgradeUnlock`) in shared helper paths

## Build / Typecheck Expectations

- Run `npm run build` after changes.
- Resolve TypeScript errors before finishing.
- Keep exports/imports synchronized across core modules.

## Documentation Expectations

- If deployment behavior changes, update `README.md`, `PROJECT_KNOWLEDGE.md`, and relevant wiki pages.
- Keep quick-reference instructions in repository docs, and long-form narrative content in wiki pages.
