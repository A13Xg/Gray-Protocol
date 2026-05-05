# Gray Protocol

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

The app builds to static assets with Vite (`dist/`) and is suitable for GitHub Pages style deployment.
To deploy on a repo-scoped GitHub Pages URL, set `base: '/Gray-Protocol/'` in `vite.config.ts`.

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
- Tick yield order: base yield → level scaling → compute allocation → upgrade effects → research effects

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

### Minimal UI Exposure

- Activity controls
- Upgrade list + purchase buttons
- Research list + purchase buttons + path label + cost line + completion status
