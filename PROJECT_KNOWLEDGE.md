# PROJECT_KNOWLEDGE

## Project Overview

Gray Protocol is a static, deterministic, headless-first incremental game engine with a thin Vue UI layer.

## Architecture Map

- src/core/config.ts: all balance/config constants (activities, upgrades, research, prestige, resources)
- src/core/types.ts: canonical domain types
- src/core/math.ts: Decimal-safe math and scientific serialization helpers
- src/core/resources.ts: canonical resource map helpers
- src/core/activities.ts: activity definitions and delta/cost/yield logic
- src/core/upgrades.ts: upgrade definitions, purchase logic, and multiplier helpers
- src/core/research.ts: research eligibility, purchases, and effects
- src/core/actions.ts: manual action definitions, unlock checks, execution outcomes
- src/core/tasks.ts: task definitions, completion checks, recommendation and claim flow
- src/core/prestige.ts: protocol reset foundation layer
- src/core/engine.ts: deterministic tick, offline batching, compute allocation
- src/core/persistence.ts: save/load/export/import, migration, codec
- src/core/validation.ts: runtime/save validation rules
- src/core/state.ts: reactive singleton GameState
- src/dev/simulate.ts: no-framework simulation harness
- src/App.vue: thin Vue UI (resources, activities, upgrades, research, actions, tasks, save, log)

## Deployment Model

- GitHub Pages deployment uses GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.
- Vite output directory is `dist/`.
- Repo-scoped Pages base path is `/Gray-Protocol/`.

## Documentation Model

- `README.md` is the operational quick-start and deployment source of truth.
- `PROJECT_KNOWLEDGE.md` captures implementation and architecture context.
- Project wiki is used for longer tutorials and evolving design rationale.

## Resource Model

Canonical resource keys only: money, crypto, compute, reputation.

All runtime resource values are Decimal.

**Compute is a pool resource (not consumable)**:
- Compute has a cap that increases only through prestige layer completion
- Compute is never spent/subtracted from total resources
- Compute can be allocated to activities via `allocations.computeByActivityId`
- Allocation is a reservation mechanism: declaring "X compute is dedicated to activity Y"
- Free compute = total compute - sum of allocations
- Activities can scale yields based on their compute allocation without consuming it
- Costs for activities, research, upgrades, and actions never include compute
- Validation prevents any compute costs from being added to config

**Money and Crypto are consumable resources**:
- Can be spent on activities (baseCost)
- Can be spent on research (cost)
- Can be spent on upgrades (cost)
- Can be spent on actions (cost)
- Consumed as activity maintenance (consumesPerSecond)
- All resource application subtracts from these pools

**Reputation is a signed additive resource**:
- Affected by actions and activities
- Used for path gating (alignment-based access)
- Never directly consumed, only modified upward/downward

## Numeric / Scientific Storage Model

- Runtime math uses Decimal (break_eternity.js)
- Save payload uses scientific strings via serializeDecimal / deserializeDecimal
- Decoded payload numbers are never localized/UI-formatted strings
- Upgrade levels are plain number values (integers bounded by maxLevel)

## Reputation Model

- reputation is signed and additive
- Alignment thresholds from config:
  - reputation > whitehatThreshold -> whitehat
  - reputation < blackhatThreshold -> blackhat
  - otherwise -> greyhat
- Alignment is derived, never stored
- Reputation gates support min, max, and alignment
- Path multiplier model is multiplicative and smooth:
  - whitehat path gets boosted by positive alignment and penalized by negative alignment
  - blackhat path gets boosted by negative alignment and penalized by positive alignment
  - shared/greyhat paths are neutral (multiplier 1)
- `applyReputationEffects(state, value, path)` is the shared helper for path-aware scaling

## Activity Model

There are 9 config-driven activities:

Shared:
- basicCryptoMining
- computeLeasing
- dataIndexing

Whitehat:
- bugBountyHunting
- defensiveAudit
- threatIntelAnalysis

Blackhat:
- passwordCracking
- botnetExpansion
- zeroDayResearch

Each activity supports level scaling, optional reputation gates, optional resource consumption, and optional compute allocation usage.

Advanced activities can opt into research-based unlock gating via `requiresResearchUnlock`, resolved through active `activityUnlock` research effects.

Activities return deltas; engine applies deltas.

## Upgrade Model

There are 14 config-driven upgrades:
- 12 activity-specific upgrades (1-2 per activity)
- 2 global upgrades

UpgradeDefinition fields:
- id, name, description, scope (activity/path/global)
- activityId?, path?
- cost, maxLevel, costScaling, costScalingRate
- effects
- reputationGate?
- prerequisites?

Upgrade state:
- state.upgrades.levelsById: Record<string, number>

Manual action state:
- state.manualActions.executedById: Record<string, number>
- state.manualActions.totalExecutions: number
- state.manualActions.lastExecutedAtById: Record<string, number>

Task state:
- state.tasks.claimedById: Record<string, boolean>

Supported implemented effects:
- activityYieldMultiplier
- computeEfficiencyMultiplier

Defined but not yet used in content:
- activityCostMultiplier
- reputationGainMultiplier
- reputationLossMultiplier

Advanced upgrades can opt into research-based unlock gating via `requiresResearchUnlock`, resolved through active `upgradeUnlock` research effects.

## Compute Allocation (Pool-Based Model)

**Storage**:
- `state.resources.compute`: Total compute pool (cap)
- `allocations.computeByActivityId`: Record<string, Decimal> for reservations

**Semantics**:
- Compute is created only at game start (initial 10) or via prestige layer completion
- Allocating compute to an activity is a reservation: "dedicate X of my compute cap to Y"
- Total allocation cannot exceed total compute (validated by `validateAllocationTotals`)
- Compute never decreases through resource costs or activity consumption
- Prestige can increase compute permanently and irreversibly

**Activity Usage**:
- Activities with `usesComputeAllocation: true` apply compute scaling multiplier
- Multiplier formula: `allocatedCompute * computeEfficiency + 1`
- Example: if activity has 3 compute allocated and computeEfficiency is 0.5, multiplier = 3 * 0.5 + 1 = 2.5x
- Compute efficiency is aggregated from research and upgrade effects

**Validation**:
- Cannot appear in any baseCost for activities, research, or upgrades
- Cannot appear in consumesPerSecond for activities
- Cannot be offered as reward in tasks or actions
- Only prestige can create new compute
- All config validates via `validateActivityDefinitions()`, `validateResearchDefinitions()`, `validateUpgradeDefinitions()`

## Tick Yield Order

For each active activity in tick:
1. Base activity yield
2. Activity level scaling
3. Compute allocation scaling (if enabled)
4. Upgrade/research activity multipliers
5. Research resource multipliers
6. Path reputation multiplier
7. Direction-aware research reputation gain/loss multipliers for reputation resource
8. Consumption costs (activity deactivates if unaffordable)

Yield sanitization rules:
- NaN/non-finite values are replaced with zero
- Non-reputation negative yields are clamped to zero

Order is deterministic for identical state + deltaMs.

## Research Foundation

Research tree has 9 nodes:

Shared path:
- parallelProcessing
- distributedSchedulers
- protocolOptimization

Whitehat path:
- responsibleDisclosure
- defensiveAutomation
- trustedResearchNetwork

Blackhat path:
- exploitAutomation
- distributedIntrusionTooling
- zeroDaySupplyChain

Research effects implemented in runtime:
- resourceMultiplier
- activityYieldMultiplier
- computeEfficiencyMultiplier
- reputationGainMultiplier
- reputationLossMultiplier
- activityUnlock
- upgradeUnlock

Research definitions include optional `position` metadata for future graphical tree rendering.

## Prestige Foundation

Starter layer:
- protocolReset

## Persistence Format

- Save key: gray_protocol_save_v3
- Legacy key fallback: gray_protocol_save_v2
- Save envelope: SaveFile { version, createdAt, updatedAt, payload }
- Payload is Base64-obfuscated JSON by default codec
- Resource/Decimal values are scientific strings in payload
- Upgrade levels are numeric in payload
- Missing/invalid upgrade state is repaired (unknown IDs dropped, levels clamped)

## Validation Rules

- Canonical resource keys enforced
- Decimal validity checks for runtime state
- Scientific-string checks for serialized numeric fields
- Activity/research/prestige/upgrade ID validation
- Upgrade level bounds [0, maxLevel]
- Allocation totals must not exceed available compute
- Research definition integrity validation
  - missing prerequisite IDs
  - self-dependencies
  - circular dependencies
  - invalid effect references (activity/upgrade/resource targets)
  - invalid Decimal costs/effect values

## Simulation Harness

src/dev/simulate.ts demonstrates:
- manual action execution outcomes and deterministic success/failure behavior
- free-compute scaling behavior for mineLocally
- repeated per-action checks with projected reward vs applied reward logging
- per-action resource delta and reputation delta tracing
- activity purchases and activation
- upgrade purchases and effect multipliers
- compute allocation impact
- compute requirement enforcement for manual actions that spend compute
- compute scaling comparison checks for low vs high allocation
- positive and negative reputation drift
- research graph validation
- shared + whitehat + blackhat research purchases under path gates
- research unlock effects on activity availability
- research-driven compute/resource yield changes
- prestige preview
- serialization with upgrade levels
- serialization with completed research IDs
- task progress/recommendation and one-time claims
- validateGameState and validateSerializedGameState pass

## Known Limitations

- activityCostMultiplier and reputation gain/loss upgrade effects are defined but not yet wired to runtime content
- path-scoped upgrade content is not yet present (logic support exists)
- no full research tree UI
- no automation system
- `npm run build` can fail in environments missing optional rolldown native bindings; run `npx vue-tsc -b` to validate TypeScript when this occurs

## Current Next Step

Prestige expansion and deeper task content on top of the hybrid idle + manual action loop.
