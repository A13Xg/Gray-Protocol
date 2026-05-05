# Core Constraints

- Runtime game-scale math must use `Decimal` from break_eternity.js.
- Serialized numeric storage must use scientific-notation strings (or `"0"`).
- Canonical resource keys are fixed: `money`, `crypto`, `compute`, `reputation`.
- Balance values belong in `src/core/config.ts`, not logic modules.
- Core engine modules must remain headless (no DOM/Vue dependencies inside core logic functions).
- `tick` must not perform persistence side effects.
- Engine behavior must remain deterministic for identical state + `deltaMs` inputs.
- Validation must enforce payload integrity, canonical keys, ID validity, Decimal validity, and allocation constraints.
