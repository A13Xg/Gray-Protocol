# Gray Protocol: Full Project Description

This document is intended to give an agentic AI enough context to work productively in this repository without having to rediscover the project structure, runtime model, or core data definitions from scratch.

## 1. Project Purpose

Gray Protocol is a small browser-based incremental/idle game built with Vue 3, TypeScript, and Vite. The theme is cyber-operations with whitehat and blackhat paths. The player interacts with:

- manual actions,
- manual/passive/timed generators,
- crypto conversion,
- talent upgrades,
- prestige/meta-progression,
- save/load/export/import.

The project is currently in a "core scaling" phase. The active game loop and economy are relatively compact, but the codebase is already structured as if more systems will be added later.

Core design characteristics:

- single reactive game state object,
- content-driven generator/talent definitions,
- deterministic Decimal arithmetic via `break_eternity.js`,
- validation around content and serialization,
- lightweight headless tests and sanity scripts.

## 2. Tech Stack and Build Model

### Runtime stack

- Vue 3
- TypeScript
- Vite
- `break_eternity.js` for large-number and safe economy math

### Test/dev stack

- Vitest
- `tsx` for running TypeScript utility scripts directly

### Important package scripts

```json
{
  "dev": "vite",
  "build": "vue-tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "sanity:economy": "tsx src/dev/sanity.ts",
  "healthcheck": "npm run test && npm run sanity:economy && npx tsx src/dev/simulate.ts && npm run build"
}
```

### Deployment/build notes

- Vite `base` is configured to `/Gray-Protocol/`.
- Production output goes to `dist/`.
- There is also a `docs/` folder in the repo that appears to be a generated/static deploy artifact snapshot.
- Static assets intended to ship directly are stored under `public/`.

## 3. Repository Layout

Top-level structure, with the most important directories called out:

```text
Gray-Protocol/
  dist/                  Generated build output
  docs/                  Prebuilt static site artifact
  public/                Static files copied through Vite
    branding/            GrayProtocol-Hat.png, GrayProtocol-Logo.png
  referenceMaterial/     Human reference docs / design notes
  src/                   Actual application source
    assets/              Bundled source-side assets
    components/          Currently minimal
    core/                Game logic, models, persistence, scaling
    dev/                 Headless simulation/sanity tooling
    utils/               Formatting utilities
  index.html             Vite HTML entry
  vite.config.ts         Vite configuration
  vitest.config.ts       Vitest configuration
  tsconfig*.json         TypeScript project configuration
```

### Top-level folders in practice

- `src/` is the real source of truth for behavior.
- `public/` is for static deploy-time assets. The branding PNGs live here now.
- `docs/` and `dist/` are outputs, not primary authoring locations.
- `referenceMaterial/` is useful for design/background context but not required for runtime understanding.

## 4. Startup and Runtime Flow

The application runtime is simple and centralized.

### Startup sequence

1. `src/main.ts` imports global CSS and `App.vue`.
2. `assertContentDefinitions()` runs before mounting the app.
3. Vue mounts `App.vue` into `#app`.
4. In `App.vue`, `onMounted()` performs:
   - `loadGame()`
   - `startGameLoop()`
5. In `onUnmounted()`, the app does:
   - `saveGame()`
   - `stopGameLoop()`

### Main runtime loop

The game loop lives in `src/core/engine.ts` and uses `requestAnimationFrame`.

Conceptually:

```ts
function loop(timestamp: number): void {
  const deltaMs = timestamp - lastTimestamp;
  tick(state, deltaMs);
  requestAnimationFrame(loop);
}
```

The `tick()` function currently does two things:

- `tickPassiveGenerators(gs, deltaMs)`
- `tickTimedGenerators(gs, deltaMs)`

There is no separate scheduler, ECS, store library, or server sync layer. Everything is local and stateful in-browser.

## 5. UI Structure

The UI is concentrated in `src/App.vue`.

### What `App.vue` is responsible for

- app boot/unboot behavior,
- save/load/import/export buttons,
- rendering resources,
- rendering manual action buttons,
- rendering generator panels,
- rendering crypto conversion controls,
- rendering debug information,
- rendering recent log entries,
- displaying the branding header and favicon-linked assets.

### UI architecture note

`App.vue` is currently a large single-file component rather than a heavily componentized interface. That means:

- feature work often touches `App.vue` directly,
- logic is thin in the view and mostly delegated into `src/core/`,
- future refactors could split the UI into components, but that has not happened yet.

## 6. Core State Model

The root data shape is in `src/core/types.ts`, and the live reactive state is created in `src/core/state.ts`.

### Important design choice

All economy values are `Decimal` instances from `break_eternity.js`, not primitive numbers.

That matters for all code changes. Arithmetic should use Decimal methods like:

- `.add()`
- `.sub()`
- `.mul()`
- `.div()`
- `.pow()`
- `.lt()` / `.lte()` / `.gt()` / `.gte()`

Do not treat resource values as plain numbers unless explicitly converting for display or input parsing.

### Root `GameState`

```ts
interface GameState {
  version: string;
  resources: ResourceMap;
  timestamps: {
    createdAt: number;
    lastSavedAt: number;
    lastTickAt: number;
  };
  log: string[];
  generators: GeneratorState;
  talents: TalentState;
  prestige: PrestigeState;
}
```

### Resource model

```ts
type ResourceKey = "money" | "crypto" | "compute" | "reputation";
type ResourceMap = Record<ResourceKey, Decimal>;
```

Semantics of each resource:

- `money`: main spendable and earned currency.
- `crypto`: secondary currency acquired through conversion.
- `compute`: capability/scaling resource, not a standard spend-down currency in the active baseline.
- `reputation`: signed alignment value. It can be negative.

### Generator state

```ts
interface GeneratorState {
  levels: Record<string, number>;
  timedProgress: Record<string, TimedGeneratorProgress>;
  passiveRemainderMs: Record<string, number>;
}
```

Key behaviors:

- `levels` stores player-specific generator upgrades.
- `timedProgress` tracks in-flight timed jobs.
- `passiveRemainderMs` preserves fractional tick remainder for deterministic passive behavior across uneven frame sizes.

### Talent state

```ts
interface TalentState {
  runUnlockedById: Record<string, boolean>;
  permanentUnlockedById: Record<string, boolean>;
}
```

The game distinguishes between:

- talents that reset on prestige (`run`),
- talents that persist permanently (`permanent`).

### Prestige state

```ts
interface PrestigeState {
  level: Decimal;
  multiplier: Decimal;
  cumulativeResources: ResourceMap;
}
```

`cumulativeResources` is important: prestige eligibility is not based only on current inventory, but on tracked total gains.

## 7. Initial State and Config

### Initial state creation

`createInitialGameState()` in `src/core/state.ts` sets up:

- empty/starting resources,
- generator state dictionaries,
- empty talent unlock records,
- initial prestige state,
- timestamps based on `nowMs()`.

### Config file

`src/core/config.ts` is the main static config surface.

Important config areas:

- serialization save version,
- starting resources,
- resource display labels,
- scaling rules,
- reputation thresholds,
- crypto price behavior,
- prestige requirement and multiplier behavior,
- action baseline config.

Current notable values:

- app version: `3.0.0-core-scaling`
- save version: `3.0.0`
- starting compute: `10`
- starting money/crypto/reputation: `0`
- whitehat threshold: `100`
- blackhat threshold: `-100`
- base prestige requirement: `1000 money`
- prestige growth factor: `2x` per prestige level

## 8. Resource and Math Helpers

### `src/core/resources.ts`

This file provides canonical resource utilities:

- create empty resource maps,
- create initial resource maps,
- add/subtract resource maps,
- multiply all resources by a multiplier,
- affordability checks,
- cost application,
- map validation/repair.

Important caveat:

- `compute` is skipped in `canAffordResources()` and `applyResourceCost()`, which reflects its current role as a scaling/capability resource rather than a normal consumable.

### `src/core/math.ts`

This is the low-level Decimal and serialization helper layer.

Important functions:

- `safeDecimal()`
- `serializeDecimal()`
- `deserializeDecimal()`
- `serializeResourceMap()`
- `deserializeResourceMap()`

Serialization format choice:

- non-zero values are stored in scientific notation via `toExponential(12)`.

This is why validation and tests check for scientific notation strings in serialized state.

## 9. Actions System

`src/core/actions.ts` defines the visible manual actions in the UI.

Current actions:

- `pentestSystem`
- `exploitSystem`

Each action has:

- `id`
- `name`
- `description`
- `path`
- `baseReward`
- `reputationDelta`

However, there is an important architectural detail:

### Actions are wrappers over manual generators

The file maps actions to generator IDs:

```ts
const ACTION_TO_GENERATOR_ID = {
  pentestSystem: "hardenDevice",
  exploitSystem: "hackDevice",
};
```

So the real reward application flows through generator execution, not through a separate action reward engine.

That means if action balance changes, the real controlling code is often the generator config + scaling stack, not just `ACTION_DEFINITIONS`.

### Reputation alignment helper

`getReputationAlignment(rep)` returns one of:

- `whitehat`
- `greyhat`
- `blackhat`

based on thresholds in `GAME_CONFIG.reputation`.

## 10. Generator System

The generator system is the most central gameplay abstraction. It lives in:

- `src/core/generators.ts`
- `src/core/content/generators.ts`

### Generator definition model

```ts
interface ResourceGeneratorConfig {
  id: string;
  name: string;
  description: string;
  type: "manual" | "passive" | "timed";
  path: "whitehat" | "blackhat" | "shared";
  inputResources?: Partial<Record<ResourceKey, Decimal>>;
  outputResources: Partial<Record<ResourceKey, Decimal>>;
  tickIntervalMs?: number;
  durationMs?: number;
  level: number;
  maxLevel: number;
  levelScaling: number;
  computeScaling?: {
    enabled: boolean;
    baselineCompute: Decimal;
    exponent: Decimal;
  };
  reputationEffect?: Decimal;
  unlock?: {
    minReputation?: Decimal;
    maxReputation?: Decimal;
  };
}
```

### Active generator content

Current registry entries in `src/core/content/generators.ts`:

- `hackDevice`
  - manual
  - blackhat
  - outputs money
  - negative reputation effect
- `hardenDevice`
  - manual
  - whitehat
  - outputs money
  - positive reputation effect
- `payloadScript`
  - passive
  - blackhat
  - outputs negative reputation over time
  - compute-scaled
- `antiVirus`
  - passive
  - whitehat
  - outputs positive reputation over time
  - compute-scaled
- `buildDevice`
  - timed
  - shared path
  - costs money + crypto
  - outputs money after a duration

### Generator runtime architecture

`createGeneratorInstance(config)` returns a small object with methods:

- `executeManual()`
- `executePassive()`
- `executeTimed()`
- `upgrade()`
- `currentLevel()`
- `isUnlocked()`

The registry of instances is built eagerly:

```ts
export const GENERATORS = Object.fromEntries(
  Object.values(GENERATOR_CONFIGS).map((cfg) => [cfg.id, createGeneratorInstance(cfg)])
)
```

### How generator outputs are applied

All output math routes through `applyScaledOutputs()`, which:

1. computes a multiplier stack for each resource,
2. multiplies configured outputs by the stack and tick count,
3. updates `gs.resources`,
4. records gains into prestige progression.

### Passive generator determinism

Passive generators use remainder carry-over:

- carried remainder + elapsed frame time,
- integer number of intervals applied,
- remainder saved for later.

This allows a 1000 ms tick and ten 100 ms ticks to produce the same result.

### Timed generator lifecycle

Starting a timed generator:

- checks config and unlock status,
- rejects if one is already in progress,
- checks input affordability,
- applies input costs,
- writes a `TimedGeneratorProgress` record.

Ticking timed generators:

- increments `progressMs`,
- executes output only when duration has been met,
- marks the job completed.

## 11. Scaling Model

Scaling logic lives in `src/core/scaling.ts`.

This is one of the most important files for balancing.

### Multiplier stack components

For a generator/resource pair, the total multiplier is:

```ts
total = base
  * level
  * talentUpgrade
  * prestige
  * reputationCompute
```

Those components come from:

- `getBaseRewardMultiplier(config)`
- `getLevelMultiplier(gs, config)`
- `getTalentUpgradeMultiplier(gs, config, resource)`
- `getPrestigeMultiplier(gs)`
- `getReputationComputeMultiplier(gs, config)`

### Reputation-path scaling

Reputation modifies output differently by path:

- whitehat path benefits from positive reputation,
- blackhat path benefits from negative reputation,
- shared path ignores this modifier.

The effect is clamped through config-driven normalization and a floor multiplier.

### Compute scaling

If a generator has `computeScaling.enabled`, compute contributes a multiplicative factor based on:

- current compute / baseline compute,
- raised to the configured exponent.

Compute is therefore a throughput amplifier, not just a displayed stat.

## 12. Talent System

Talent logic lives in:

- `src/core/upgrades.ts`
- `src/core/content/talents.ts`

### Talent definition model

```ts
interface TalentNodeDefinition {
  id: string;
  name: string;
  description: string;
  scope: "run" | "permanent";
  costs: Partial<Record<ResourceKey, Decimal>>;
  prerequisites?: {
    allTalentNodeIds?: string[];
    minReputation?: Decimal;
    minResources?: Partial<Record<ResourceKey, Decimal>>;
    requiredGeneratorLevels?: Record<string, number>;
  };
  effects: {
    generatorMultipliers?: GeneratorModifierEffect[];
    cryptoEfficiency?: CryptoModifierEffect;
  };
}
```

### Active talents

Current content entries:

- `manualProtocols`
  - run-scoped
  - improves manual generator throughput
- `persistentAutomation`
  - permanent
  - improves passive generator throughput
- `marketMakers`
  - run-scoped
  - improves money-to-crypto conversion efficiency

### How purchase works

`purchaseTalentNode(gs, nodeId)` does:

1. existence check,
2. affordability check,
3. prerequisite check,
4. cost subtraction from resources,
5. unlock write into either `runUnlockedById` or `permanentUnlockedById`.

### How talent effects are applied

Generator multipliers are filtered by whether the effect matches:

- generator type,
- generator id,
- path,
- resource key.

The final talent contribution supports:

- additive stacking,
- multiplicative stacking.

Crypto efficiency uses a similar additive/multiplicative accumulation model.

## 13. Crypto System

Crypto logic lives in `src/core/crypto.ts`.

### Price model

Crypto price is a deterministic function of elapsed time:

- sinusoidal wave over time,
- optional deterministic pseudo-random noise bucketed by time,
- clamped min/max bounds.

Conceptually:

```ts
price = basePrice * 10^(wave + noise)
```

with final clamp to config bounds.

### Conversion behavior

`convertMoneyToCrypto(gs, moneyAmount, elapsedMs?)`:

- rejects non-positive or unaffordable conversions,
- computes current price,
- applies talent-based crypto efficiency,
- subtracts money,
- adds crypto,
- records gained crypto into prestige progression.

### Determinism note

If `elapsedMs` is omitted, conversion uses:

```ts
gs.timestamps.lastTickAt - gs.timestamps.createdAt
```

This keeps price evaluation tied to game time rather than arbitrary wall clock calls.

## 14. Prestige and Progression

Prestige logic lives in `src/core/prestige.ts`.
Progression tracking lives in `src/core/progression.ts`.

### Prestige requirement

Requirement is exponential:

```ts
requirement = baseRequirement * growth^level
```

with current config roughly meaning:

- level 0 -> 1000
- level 1 -> 2000
- level 2 -> 4000

### Prestige multiplier

The multiplier is calculated from config. In the current multiplicative mode:

```ts
multiplier = base * (1 + perLevel)^level
```

### What resets on prestige

`applyPrestige(gs)`:

- increments prestige level,
- recalculates prestige multiplier,
- resets current-run resources,
- resets generator levels and timed/passive generator state,
- resets run-scoped talents,
- resets run timestamps.

### What persists on prestige

- `prestige.level`
- `prestige.multiplier`
- `prestige.cumulativeResources`
- permanent talents

### Progression accumulation

`recordResourceGain()` only accumulates positive gains into `prestige.cumulativeResources`.

That means costs and negative flows do not reduce lifetime progression tracking.

## 15. Persistence and Migration

Persistence logic is in `src/core/persistence.ts`.
Migration logic is in `src/core/migrations.ts`.

### Save format

The game stores one localStorage entry under:

```ts
const SAVE_KEY = "gray_protocol_save_v1";
```

The outer save envelope is:

```ts
interface SaveFile {
  version: string;
  createdAt: number;
  updatedAt: number;
  payload: string;
}
```

`payload` is base64-encoded JSON of the serialized game state.

### Serialization responsibilities

`serializeState(gs)` converts:

- Decimal resource maps -> string maps,
- prestige Decimal fields -> strings,
- copies generator/talent state,
- updates `lastSavedAt`.

### Deserialization responsibilities

`deserializeState(serialized, target)`:

- restores resources through Decimal deserialization,
- repairs invalid resource maps,
- restores timestamps,
- restores generator/talent state,
- restores prestige state with defaults if absent.

### Migrations

The migration layer upgrades older payloads to the current shape.

Current logic includes:

- V1 -> V2 adds generator scaffolding.
- V2 -> V3 adds talent and prestige scaffolding.
- envelope version is normalized to `3.0.0` when needed.

This is important if future work changes save shape again: update both type definitions and migrations.

## 16. Validation Boundaries

There are two distinct kinds of validation in the project.

### A. Content validation

`src/core/content/validation.ts` validates definitions in content registries.

It checks:

- IDs are present,
- name strings are non-empty,
- resource keys are valid,
- generator type-specific required fields are present,
- Decimal values are finite,
- talent prerequisites reference existing nodes,
- talent prerequisite cycles do not exist.

`assertContentDefinitions()` is called during startup, so bad content definitions should fail fast.

### B. Runtime/serialized-state validation

`src/core/validation.ts` validates:

- game state resource validity,
- timestamp sanity,
- prestige Decimal validity,
- crypto price bounds,
- serialized game state shape and scientific-notation format.

This file is used primarily by tests and dev scripts rather than the live UI loop.

## 17. Dev and Test Tooling

### Test configuration

`vitest.config.ts` runs tests in a Node environment and includes `src/**/*.spec.ts`.

### Current tests

Tests are under `src/core/__tests__/`.

#### `invariants.spec.ts`

Verifies things like:

- content definitions load cleanly,
- multiplier stack order is correct,
- manual generators update money/reputation,
- passive generators are deterministic across split steps,
- timed generators only complete after sufficient duration,
- prestige resets resources and increases multiplier,
- serialized game state remains valid.

#### `scenarios.spec.ts`

Runs scripted progression scenarios and verifies outputs are finite and structurally sane.

### Dev scripts

#### `src/dev/scenarios.ts`

Provides three headless progression paths:

- whitehat
- blackhat
- balanced

These are useful when validating economy changes without the UI.

#### `src/dev/sanity.ts`

Runs coarse economic guardrail checks such as:

- manual reward bounds,
- timed duration bounds,
- crypto efficiency bounds,
- finite scenario outputs.

#### `src/dev/simulate.ts`

This is a richer scripted walkthrough of the core systems. It exercises:

- generator stack behavior,
- upgrades and level scaling,
- talent purchasing,
- prestige application,
- timed generator progression,
- crypto pricing/conversion,
- serialization validation,
- passive determinism checks.

If you are changing multiple economy systems at once, this file is one of the fastest ways to understand whether the system still behaves coherently.

## 18. Generated vs Source Directories

This distinction matters when editing.

### Edit normally

- `src/`
- `public/`
- config files
- reference docs

### Usually do not hand-edit as source of truth

- `dist/`
- `docs/assets/` generated asset bundles

The `docs/` folder may be committed for deployment purposes, but behavior changes should still originate from `src/` and then be rebuilt.

## 19. Static Assets and Branding

Branding is now organized under:

```text
public/branding/
  GrayProtocol-Hat.png
  GrayProtocol-Logo.png
```

Current usage:

- favicon in `index.html` uses the hat image,
- `App.vue` masthead uses both the hat icon and the full logo,
- asset URLs in the app are composed with `import.meta.env.BASE_URL` so they deploy correctly under `/Gray-Protocol/`.

## 20. Placeholder / Inactive Modules

Some files exist as future scaffolding and are intentionally inactive right now:

- `src/core/activities.ts`
- `src/core/reputation.ts`
- `src/core/research.ts`
- `src/core/tasks.ts`

These currently export nothing except an empty module marker and contain comments saying they are not active in the core baseline.

That means:

- do not assume those systems are live,
- if implementing those features, check whether the intended architecture should integrate through existing content/state/scaling patterns.

## 21. Project Conventions and Practical Rules

### Decimal-first economy code

Any logic touching resources, scaling, prestige, prices, or generator outputs should stay in Decimal space.

### Centralized game logic

Gameplay rules belong in `src/core/`, not inline in the Vue template.

### Registry-driven content

New generators and talents should usually be added in:

- `src/core/content/generators.ts`
- `src/core/content/talents.ts`

and then validated via the existing content validation layer.

### Single-state mutation model

There is one shared reactive `state`. Functions generally mutate slices of that object directly by replacement or assignment.

### Validation is part of the contract

If you change save shape, generator definitions, talent definitions, or serialized formats, update:

- types,
- serializers/deserializers,
- migration logic,
- validation,
- tests when relevant.

## 22. Common Entry Points for Future Agents

If you need to change a specific area, start here:

- UI layout and controls -> `src/App.vue`
- root state shape -> `src/core/types.ts`, `src/core/state.ts`
- balance/config values -> `src/core/config.ts`
- actions -> `src/core/actions.ts`
- generator definitions -> `src/core/content/generators.ts`
- generator runtime behavior -> `src/core/generators.ts`
- talent definitions -> `src/core/content/talents.ts`
- talent application logic -> `src/core/upgrades.ts`
- scaling formulas -> `src/core/scaling.ts`
- crypto behavior -> `src/core/crypto.ts`
- prestige behavior -> `src/core/prestige.ts`, `src/core/progression.ts`
- save/load behavior -> `src/core/persistence.ts`, `src/core/migrations.ts`
- validation -> `src/core/content/validation.ts`, `src/core/validation.ts`
- headless verification -> `src/dev/sanity.ts`, `src/dev/simulate.ts`, tests

## 23. Minimal Mental Model

If an agent needs the shortest accurate model of the project, it is this:

1. Gray Protocol is a Vue incremental game with one shared reactive game state.
2. Most gameplay is controlled by content registries plus core runtime helpers.
3. Actions are mostly wrappers over manual generators.
4. Passive and timed generators are advanced by the RAF-driven engine tick.
5. All resource math uses `Decimal`.
6. Talents and prestige feed into a multiplier stack that controls output.
7. Save data is serialized to scientific-notation strings and version-migrated.
8. Validation and headless scripts are already present and should be used when changing model behavior.

## 24. Recommended Validation Workflow After Changes

For future agents modifying the repo, a sensible validation ladder is:

1. `npm run test`
2. `npm run sanity:economy`
3. `npx tsx src/dev/simulate.ts`
4. `npm run build`

Or just run:

```bash
npm run healthcheck
```

if the change is broad enough to justify the full pass.

## 25. Final Summary

This repository is small enough to understand quickly, but it already has clear boundaries:

- Vue UI at the top,
- content-configured core systems in the middle,
- Decimal-based economy math beneath that,
- persistence/validation/test tooling supporting the whole stack.

The most important files for meaningful project changes are:

- `src/App.vue`
- `src/core/types.ts`
- `src/core/config.ts`
- `src/core/generators.ts`
- `src/core/content/generators.ts`
- `src/core/upgrades.ts`
- `src/core/content/talents.ts`
- `src/core/scaling.ts`
- `src/core/crypto.ts`
- `src/core/prestige.ts`
- `src/core/persistence.ts`

If you understand those files and respect the Decimal-based data model, you understand the active heart of Gray Protocol.