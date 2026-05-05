# PROJECT_KNOWLEDGE

## Project Overview

Gray Protocol is a static, deterministic, headless-first incremental game engine with a thin Vue UI layer.

## Architecture Map

- `src/core/config.ts`: all balance/config constants and metadata
- `src/core/types.ts`: canonical domain types
- `src/core/math.ts`: Decimal-safe math and scientific serialization helpers
- `src/core/resources.ts`: canonical resource map helpers
- `src/core/activities.ts`: activity definitions and delta/cost/yield logic
- `src/core/research.ts`: research eligibility, purchases, and effects
- `src/core/prestige.ts`: protocol reset foundation layer
- `src/core/engine.ts`: deterministic tick + offline batching + compute allocation
- `src/core/persistence.ts`: save/load/export/import + migration + codec
- `src/core/validation.ts`: runtime/save validation rules
- `src/dev/simulate.ts`: no-framework simulation harness

## Resource Model

Canonical resource keys only:

- `money`
- `crypto`
- `compute`
- `reputation`

All runtime resource values are `Decimal`.

## Numeric / Scientific Storage Model

- Runtime math uses `Decimal` (break_eternity.js)
- Save payload uses scientific string values via:
  - `serializeDecimal`
  - `deserializeDecimal`
  - `serializeResourceMap`
  - `deserializeResourceMap`
- Decoded payload numbers are never localized or UI-formatted strings

## Reputation Model

- `reputation` is signed and additive
- Alignment thresholds come from config:
  - `> whitehatThreshold`: `whitehat`
  - `< blackhatThreshold`: `blackhat`
  - otherwise: `greyhat`
- Alignment is derived, not stored
- Reputation gates support `min`, `max`, and `alignment`

## Activity Model

Config-driven starter activities:

1. `basicCryptoMining` (shared, compute allocation)
2. `bugBountyHunting` (whitehat, money + positive reputation)
3. `passwordCracking` (blackhat, compute allocation, money/crypto + negative reputation)

Implemented helper surface:

- `getActivityDefinition`
- `getActivityState`
- `canUnlockActivity`
- `canAffordActivityLevel`
- `purchaseActivityLevel`
- `calculateActivityYield`
- `calculateActivityDelta`
- `getActiveActivityDeltas`

Activities return deltas; engine applies deltas.

## Compute Allocation

State path:

- `allocations.computeByActivityId`

Behavior:

- Absolute allocation values (not percentages)
- Clamped to available total compute
- Per-activity allocation getters/setters in engine
- Serialized as scientific strings in save payload

## Research Foundation

Config-driven starter nodes:

1. `parallelProcessing`
2. `responsibleDisclosure`
3. `exploitAutomation`

Implemented helper surface:

- `canResearchNode`
- `purchaseResearchNode`
- `getActiveResearchEffects`
- `applyResearchEffectsToYield`
- prerequisite checks
- reputation gate checks
- affordability checks

## Prestige Foundation

Single layer: `protocolReset`

Implemented helper surface:

- `canPrestige`
- `previewPrestigeGain`
- `performPrestige`

Behavior is config-driven for requirements, reset lists, reward resource/value, and research preservation.

## Persistence / Save Format

Top-level save envelope:

- `version`
- `createdAt`
- `updatedAt`
- `payload`

Payload contains serialized game state with scientific-string numbers and canonical resources.

Migration support includes legacy keys:

- `cryptoCurrency` -> `crypto`
- `computePower` -> `compute`
- `reputationStanding` -> `reputation`

Unknown legacy keys like `parity` are dropped.

## Validation Rules

Validation enforces:

- canonical resource key set
- Decimal validity in runtime state
- scientific-string validity in serialized payload
- valid activity/research/prestige IDs
- allocation total <= available compute
- save envelope integrity

## Simulation Harness

`src/dev/simulate.ts` demonstrates:

- fresh state creation
- canonical resources
- scientific serialization preview
- compute allocation
- activity ticking
- additive reputation change
- research purchase attempt
- prestige preview
- offline progress
- validation pass/fail logging

## Known Limitations

- No formal automated test framework yet
- Save codec is obfuscation-focused (Base64), not cryptographic encryption
- UI still includes simple action buttons that bypass richer progression surfaces

## Recommended Next Implementation Steps

1. Add deterministic unit tests around `tick`, serialization, and migrations.
2. Add activity/research unlock progression UI that uses existing headless APIs.
3. Expand validation repair logic for corrupted payload subsections.
4. Add explicit save migration versioning table for future schema evolution.
