# Gray Protocol — Project Knowledge

## Architecture
Gray Protocol is a Vue 3 + TypeScript idle game using `break_eternity.js` for all resource math.

## Module Map
| File | Role |
|---|---|
| `src/core/types.ts` | All shared TypeScript types/interfaces |
| `src/core/config.ts` | `GAME_CONFIG` — single source of truth for all balance values |
| `src/core/math.ts` | Pure Decimal math utilities (scaling, softcap, multipliers) |
| `src/core/resources.ts` | ResourceMap helpers (create, add, subtract, validate, repair) |
| `src/core/reputation.ts` | Alignment computation and gate checks |
| `src/core/activities.ts` | Activity definitions, yield/cost calculation, delta computation |
| `src/core/research.ts` | Research definitions, purchase logic, effect multipliers |
| `src/core/prestige.ts` | Prestige layer definitions and reset logic |
| `src/core/validation.ts` | ValidationResult helpers for state, save files, IDs |
| `src/core/state.ts` | `shallowReactive` singleton GameState + `createInitialGameState` |
| `src/core/engine.ts` | `tick()`, game loop, offline catch-up, compute allocation |
| `src/core/persistence.ts` | save/load/export/import with Base64 SaveFile wrapper |
| `src/utils/formatter.ts` | `format`, `formatShort`, `formatScientific` display helpers |
| `src/dev/simulate.ts` | Headless simulation harness for sanity-checking engine logic |
| `agents/` | Agent constraint and domain docs for AI-assisted development |

## Key Conventions
- All resource math uses `Decimal` from `break_eternity.js`. Raw `number` is only for timing/indexes.
- No Vue/DOM imports inside `src/core/` or `src/dev/`.
- No persistence calls inside `tick()`.
- All balance values live in `GAME_CONFIG` — never hardcoded in logic modules.
- `tick(state, deltaMs)` is deterministic — no randomness.

## Resources
`ResourceKey`: `"money" | "cryptoCurrency" | "computePower" | "reputationStanding"`

## Reputation Alignment
- `reputationStanding > 100` → whitehat
- `reputationStanding < -100` → blackhat
- Otherwise → greyhat

## Save Format
Saves use a `SaveFile` wrapper with `version`, `createdAt`, `updatedAt`, and a Base64-encoded `payload` (JSON of `SerializedGameState`). Decimal values inside the payload are also Base64-encoded via `base64Codec`.

## Build
```
npm run build   # vue-tsc -b && vite build
```
