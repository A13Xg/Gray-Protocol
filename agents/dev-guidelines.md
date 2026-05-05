# Gray Protocol — Dev Guidelines

## How to Extend Systems Safely

### Adding an Activity
- Add to GAME_CONFIG first, then ACTIVITY_DEFINITIONS. Never the reverse.
- Set `usesComputeAllocation: true` only if the activity scales with computePower.
- Add a reputation gate if the activity should be path-locked.

### Adding Research
- Add to GAME_CONFIG.research, then RESEARCH_DEFINITIONS.
- Effects must be one of the supported `ResearchEffectType` values.
- Add new effect types to `ResearchEffectType` in types.ts if needed.

### Adding Prestige Layers
- One layer at a time. Test `canPrestige` / `previewPrestigeGain` / `performPrestige` logic first.
- Never add prestige logic to the tick loop.

### Extending State
- Add new fields to `GameState` in `src/core/types.ts`.
- Update `createInitialGameState()` in `src/core/state.ts`.
- Update serialization/deserialization in `src/core/persistence.ts`.

## Where to Add New Features
- New resource types → types.ts, resources.ts, config.ts
- New scaling formulas → math.ts only
- New activity logic → activities.ts (referencing config)
- New research effects → types.ts (ResearchEffectType), research.ts
- New UI components → src/components/ only, must import from core via public API

## Avoiding Core Contract Breaks
- Do not import from Vue or DOM in src/core/*.
- Do not call persistence inside engine tick.
- Do not use raw number for resource math.
- Do not hardcode balance values.

## Build/Validation
- Build: `npm run build` (runs vue-tsc -b && vite build)
- Dev simulation: import and call `runSimulation()` from `src/dev/simulate.ts` in browser console or a dev page.
- No test framework configured. Use the simulation harness for sanity checks.
