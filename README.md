# Gray Protocol

[![Deploy GitHub Pages](https://github.com/a13xg/Gray-Protocol/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/a13xg/Gray-Protocol/actions/workflows/deploy-pages.yml)

Live site: https://a13xg.github.io/Gray-Protocol/
Wiki: https://github.com/A13Xg/Gray-Protocol/wiki

Gray Protocol is a headless-first incremental idle game built with Vue 3, TypeScript, and Vite for static hosting (including GitHub Pages).

## Tech Stack

- Vue 3
- TypeScript
- Vite
- break_eternity.js for all game-scale runtime math

## Canonical Resource Keys

Core engine resource identities are fixed and UI-agnostic:

- `money`
- `crypto`
- `compute`
- `reputation`

Legacy keys are not used by core runtime logic.

## Development Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

## Static Deployment

This project is configured for GitHub Pages deployment through GitHub Actions.

- Vite base path: `/Gray-Protocol/`
- Build output directory: `dist/`
- Workflow: `.github/workflows/deploy-pages.yml`

Deploy steps:

1. In GitHub: Settings → Pages → Build and deployment → Source = GitHub Actions
2. Push to `main` (or run the deploy workflow manually)
3. The workflow builds and deploys `dist/` automatically

## Documentation Surfaces

- README (this file): quick start, architecture summary, deploy setup
- Project knowledge: `PROJECT_KNOWLEDGE.md` for implementation-level notes
- Wiki: long-form guides and evolving design notes

## Save System Summary

- Save key: `gray_protocol_save_v3` (localStorage)
- Save envelope: `{ version, createdAt, updatedAt, payload }`
- `payload` is Base64-encoded JSON (obfuscation only, not security)
- Numeric values in decoded payload are scientific-notation strings (or `"0"`)
- Runtime values are always `Decimal`
- Upgrade levels are persisted as plain numbers
- Legacy resource keys (`cryptoCurrency`, `computePower`, `reputationStanding`) are migrated on load

## Implemented Systems

### Engine

- Deterministic headless `tick(state, deltaMs)` — no Date.now() inside tick
- Batched offline progress via `calculateOfflineProgress(state, elapsedMs)`
- Compute allocation: `allocations.computeByActivityId` (absolute, clamped)
- Tick yield order: base yield → level scaling → compute allocation → upgrade/research activity multipliers → research resource multipliers → path reputation multiplier → direction-aware reputation gain/loss multipliers
- Activity yield sanitization prevents NaN/invalid deltas and clamps non-reputation yields to non-negative values
- Action execution blocks when a compute-cost action does not have enough free (unallocated) compute

### Activities (9 total)

**Shared**
- `basicCryptoMining` — compute → crypto
- `computeLeasing` — compute → money (compute allocation)
- `dataIndexing` — money → money + compute (compute allocation)

**Whitehat**
- `bugBountyHunting` — money → money + reputation gain (rep gate: ≥ -100)
- `defensiveAudit` — money → money + reputation gain (rep gate: ≥ 0)
- `threatIntelAnalysis` — money + compute → money + reputation (rep gate: ≥ 50, compute allocation)

**Blackhat**
- `passwordCracking` — compute → money + crypto − reputation (rep gate: ≤ 100, compute allocation)
- `botnetExpansion` — crypto → compute + crypto, consumes money/s (rep gate: ≤ 0, compute allocation)
- `zeroDayResearch` — money + crypto → crypto − reputation (rep gate: ≤ -50)

### Upgrades (14 total)

12 activity-specific upgrades (1–2 per activity) + 2 global upgrades.
All upgrade costs and effects are config-driven. Per-level multiplier stacks as `value^level`.

**Supported effect types (implemented):**
- `activityYieldMultiplier` — multiplies all yields of a specific activity
- `computeEfficiencyMultiplier` — multiplies global compute efficiency

**Supported scopes:** `activity`, `path`, `global`

### Research Tree (9 nodes)

Shared:
- `parallelProcessing`
- `distributedSchedulers`
- `protocolOptimization`

Whitehat:
- `responsibleDisclosure`
- `defensiveAutomation`
- `trustedResearchNetwork`

Blackhat:
- `exploitAutomation`
- `distributedIntrusionTooling`
- `zeroDaySupplyChain`

Research effects supported in runtime:
- `resourceMultiplier`
- `activityYieldMultiplier`
- `computeEfficiencyMultiplier`
- `reputationGainMultiplier`
- `reputationLossMultiplier`
- `activityUnlock`
- `upgradeUnlock`

Research definitions include optional path positions for future tree UI.

### Prestige (foundation)

- `protocolReset`

### Validation

- Canonical resource key checks
- Scientific-string format validation
- Activity, research, prestige, upgrade ID validation
- Upgrade level bounds checks
- Allocation total constraints
- Research definition validation (costs/effects/IDs)
- Research prerequisite graph validation (missing prereqs, self-deps, cycles)
- Manual action counters and IDs validation
- Task claim-state validation

### Manual Actions (4 total)

- `scanNetwork` — instant, shared, low-risk baseline payout
- `mineLocally` — duration-style shared action; reward scales with free compute
- `bugBounty` — instant whitehat action; positive reputation impact
- `passwordAttempt` — instant blackhat action; deterministic pseudo-random success/failure with variable reward

Key rules:
- Manual actions do not require compute allocation to run.
- Action performance uses config-driven multipliers in this order: reputation alignment, free-compute scaling (if enabled), duration scaling, success/failure branch, and variance.
- `passwordAttempt` uses deterministic outcome resolution (state-seeded roll), not non-deterministic RNG.
- Action reputation deltas are applied through a single path (`applyActionReputationDelta`) and include research gain/loss modifiers.
- Runtime and UI projection use the same helper (`calculateActionReward(state, actionId)`) for reward display consistency.

### Tasks (7 total)

Supported task requirement types:
- `resourceThreshold`
- `reputationThreshold`
- `actionCount`
- `activityLevel`
- `researchCompletion`

Task behavior:
- Completion is dynamic and state-derived.
- Claims are one-time (`state.tasks.claimedById`) and grant config-driven rewards.
- `getRecommendedTasks(state)` returns nearest-progress, non-claimed tasks and filters path-improbable reputation goals.

### Minimal UI Exposure

- Activity controls
- Upgrade list + purchase buttons
- Research list + purchase buttons + path label + cost line + completion status
- Manual action list + execute buttons + lightweight outcome feedback
- Manual action details: cost, base reward, projected reward, duration, reputation effect/multiplier, compute requirement and free compute availability
- Task list + progress + claim buttons + recommended tasks hint

## Resource/Reputation Consistency Notes

- Canonical resource math remains Decimal-based end-to-end (runtime + helper projections).
- Path reputation effects are active for both manual actions and activities:
	- Positive reputation boosts whitehat path and penalizes blackhat path.
	- Negative reputation boosts blackhat path and penalizes whitehat path.
	- Shared and greyhat paths remain neutral.
- Save/load remains scientific-notation based for Decimal values.

## Known Limitations

- `npm run build` can fail in some environments when optional rolldown native bindings are missing; TypeScript still validates with `npx vue-tsc -b`.

## Contributing Docs

- Short operational notes should stay in repository markdown docs.
- Long-form tutorials and design rationale should go to the project wiki.
- If deployment behavior changes, update both this README and wiki deployment pages together.
