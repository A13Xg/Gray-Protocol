# Core Constraints

- Runtime game-scale math must use `Decimal` from break_eternity.js.
- Serialized numeric storage must use scientific-notation strings (or `"0"`).
- Canonical resource keys are fixed: `money`, `crypto`, `compute`, `reputation`.
- Balance values belong in `src/core/config.ts`, not logic modules.
- Core engine modules must remain headless (no DOM/Vue dependencies inside core logic functions).
- `tick` must not perform persistence side effects.
- Engine behavior must remain deterministic for identical state + `deltaMs` inputs.
- Activity and upgrade systems must remain config-driven.
- Research tree definitions and progression must remain config-driven.
- Upgrade state is level-based: `state.upgrades.levelsById` (integers, bounded by definition max level).
- Validation must enforce payload integrity, canonical keys, ID validity, Decimal validity, allocation constraints, upgrade level bounds, and research graph integrity.
- GitHub Pages deployment is workflow-driven; do not require committed static output directories as a deployment source.
- Documentation changes that affect setup/deploy behavior must update both repo docs and wiki docs in the same pass.
