# Gray Protocol — Master Project Context

> v1.0.0-alpha — Headless, modular, incremental idle game engine

---

## 1. Project Overview

Gray Protocol is a browser-based, static-deployable incremental idle game with a cyberpunk hacking theme. The game combines **manual actions**, **passive activities**, **upgrades**, **research**, **compute allocation**, and **reputation systems**. Core logic is fully **headless**, deterministic, and runs entirely in the browser with persistence through `localStorage` or JSON save files.

**Key Goals:**

- Headless, deterministic engine
- Incremental progression with clicker + idle hybrid mechanics
- Modular and configurable systems
- Path-based reputation and progression (whitehat / blackhat / greyhat)
- Support for upgrades, research, tasks, and talent trees

---

## 2. Architecture

```
src/
  core/
    types.ts          — shared TypeScript types/interfaces
    config.ts         — GAME_CONFIG, balance and scaling
    state.ts          — shallowReactive game state
    math.ts           — Decimal math utilities
    resources.ts      — resource operations, validation, repair
    reputation.ts     — reputation calculation, alignment, gates
    activities.ts     — manual and passive activity definitions
    upgrades.ts       — upgrade definitions and effects
    research.ts       — global research tree definitions and effects
    prestige.ts       — prestige layer foundation
    engine.ts         — deterministic tick loop, integration
    persistence.ts    — save/load/export/import
    validation.ts     — state, save, Decimal, and configuration integrity
  dev/
    simulate.ts       — headless simulation harness
  App.vue             — minimal UI for resources, actions, tasks, upgrades
```

**Principles:**

- Headless core logic decoupled from Vue UI
- Deterministic tick loop
- Decimal-based math (`break_eternity.js`)
- Scientific-notation serialization for all numeric values
- Config-driven balance
- Modularity for future expansion (automation, prestige, talent trees)

---

## 3. Resources

| Key        | Initial Value | Notes |
|------------|---------------|------|
| `money`    | 0             | Base currency from clicks and early actions |
| `crypto`   | 0             | Earned via mining, hacking, or converted from money |
| `compute`  | 10 Tflops     | Allocatable to activities; multiplier or threshold |
| `reputation` | 0           | Positive = whitehat, negative = blackhat, 0 = greyhat |

**Usage Notes:**

- Compute acts as a multiplier or threshold
- Reputation modifies action and activity effectiveness
- All resource math uses `Decimal`
- Saves store scientific-notation strings for numeric values

---

## 4. Reputation System

| Range     | Alignment |
|-----------|-----------|
| > +100    | whitehat  |
| < -100    | blackhat  |
| -100–+100 | greyhat   |

Rules:

- Reputation is **additive**
- Path divergence is gradual: early clicks have small effect
- High positive rep boosts whitehat actions, penalizes blackhat
- High negative rep boosts blackhat, penalizes whitehat
- Reputation feeds back into tasks, upgrades, and scaling
- No hard clamping; values can grow large but are tracked as Decimal

---

## 5. Starter Manual Actions

| ID               | Name           | Path     | Base Reward | Reputation | Compute | Notes |
|-----------------|----------------|----------|------------|-----------|--------|------|
| `pentestSystem` | Pentest System | Whitehat | $1 money   | +1        | 0      | Whitehat clicker starter |
| `exploitSystem` | Exploit System | Blackhat | $1 money   | -1        | 0      | Blackhat clicker starter |
| `mineLocally`   | Mine Locally   | Shared   | Crypto     | 0         | free compute scaling | Duration 60s base, scales with available compute |
| `bugBounty`     | Bug Bounty     | Whitehat | $money     | +rep      | 0      | Introduces positive reputation path |
| `passwordAttempt` | Password Attempt | Blackhat | $/crypto | -rep     | optional compute scaling | Low chance success; variable reward |

**Mechanics:**

- Reputation modifies reward multipliers
- Compute scales `mineLocally` yield
- Actions feed into task completion and activity unlocks
- Tasks and upgrades may later require specific reputation or compute thresholds

---

## 6. Crypto Conversion

- Players can convert `$Money` → `Crypto`
- Conversion price fluctuates predictably: sine-wave + minor noise
- Max price = 10x base, min price = 0.1x base
- Conversion uses Decimal math
- Config-driven: `GAME_CONFIG.cryptoBasePrice`, `fluctuationAmplitude`, `maxMultiplier`, `minMultiplier`

---

## 7. Activities

- Passive, automated operations
- Require **resources**, **compute**, **reputation thresholds**
- Examples: `basicCryptoMining`, `bugBountyHunting`, `passwordCracking`
- Activities integrate upgrade, research, and reputation effects
- Yield calculation order:
  1. Base yield
  2. Level scaling
  3. Compute allocation
  4. Upgrade effects
  5. Research effects
  6. Prestige effects (future)

---

## 8. Upgrades

- Activity-specific or global/path-scoped
- Gated by reputation
- Cost scaling: money → money + crypto
- Effect types:
  - `activityYieldMultiplier`
  - `computeEfficiencyMultiplier`
  - `activityCostMultiplier`
  - `reputationGainMultiplier`
  - `reputationLossMultiplier`
  - `activityUnlock`
  - `upgradeUnlock`

---

## 9. Tasks / Quests

- Guide early player progression
- Requirements: action counts, resource thresholds, reputation, activity/upgrade completion
- Rewards: resources, reputation, unlocks
- Dynamic recommendation based on current state and alignment

---

## 10. Research Tree

- Global, persists through prestiges
- Nodes: shared, whitehat, blackhat
- Effects: yield multipliers, compute efficiency, resource boosts, unlocks
- Prerequisites enforce progression
- Minimal UI shows available/completed nodes

---

## 11. Talent Tree (Future / Per-Run)

- Specialization per run
- Path-based (whitehat/blackhat)
- Unlocks high-level end-of-branch upgrades
- Encourages focused investment

---

## 12. Compute System

- Finite total compute (e.g., 100Tflops)
- Allocatable to activities or optional actions
- Free compute boosts manual action outputs
- Threshold-based requirements for high-level tasks
- Player balances allocation across activities

---

## 13. Early Game Progression Flow

1. Click **Pentest System** / **Exploit System** → earn $1 and +1/-1 rep
2. Mine locally → earn crypto, scaled by free compute
3. Convert $Money → crypto via fluctuating price
4. Complete starter tasks
5. Purchase starter upgrades
6. Unlock early activities
7. Allocate compute strategically
8. Reputation diverges and begins gating path
9. Begin mid-tier actions and upgrades
10. Progress toward research and talent trees

---

## 14. Save & Persistence

- JSON + Base64 for obfuscation
- Decimal stored as scientific notation
- Includes:
  - Resources
  - Reputation
  - Upgrade levels
  - Research completed
  - Task completion
- Validation/repair enforces canonical keys

---

## 15. Headless Engine Rules

- Deterministic tick
- Offline catch-up capped
- No randomness in base calculations
- Activities, upgrades, research, and reputation integrated deterministically

---

## 16. Known Limitations / Scope

- Minimal UI only
- Early-game balance not finalized
- Automation layer not yet implemented
- Prestige layer partially implemented
- Talent tree per-run not yet active

---

## 17. Build / Development

- Dev server: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- TypeScript enforced
- Headless core decoupled from Vue UI

---

## 18. Recommended Next Steps

1. Implement Manual Action + Task System
2. Tune early-game balance
3. Develop Talent Tree / Per-Run Specialization
4. Expand Prestige Layer
5. Introduce Automation Layer
6. Add mid/late-game upgrade content
7. Iterative simulation and validation