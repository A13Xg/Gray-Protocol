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

## Compute Allocation

State path:
- allocations.computeByActivityId: Record<string, Decimal>

Behavior:
- setComputeAllocation clamps to available compute
- activities with usesComputeAllocation apply multiplier: allocatedCompute * computeEfficiency + 1
- compute efficiency combines research and upgrades multiplicatively

## Tick Yield Order

For each active activity in tick:
1. Base activity yield
2. Activity level scaling
3. Compute allocation scaling (if enabled)
4. Upgrade and research yield multipliers
5. Consumption costs (activity deactivates if unaffordable)

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
- activity purchases and activation
- upgrade purchases and effect multipliers
- compute allocation impact
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

## Current Next Step

Prestige expansion and deeper task content on top of the hybrid idle + manual action loop.
