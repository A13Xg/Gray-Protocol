# PROJECT_KNOWLEDGE — Core Baseline (v2.0.0-baseline)

## Project Overview

Gray Protocol is a deterministic, headless-first incremental idle game built with Vue 3 + TypeScript + Vite.
This version is the **core currency and reputation baseline** — a clean foundation before activities,
upgrades, research, prestige, or automation are reintroduced.

## Architecture Map

- src/core/config.ts     — All balance constants (resources, crypto conversion, action definitions)
- src/core/types.ts      — Canonical domain types (ResourceMap, GameState, ActionDefinition, etc.)
- src/core/math.ts       — Decimal-safe helpers, scientific serialization (unchanged)
- src/core/resources.ts  — Resource map operations, affordability, repair (unchanged)
- src/core/state.ts      — Reactive singleton GameState (Vue shallowReactive)
- src/core/actions.ts    — Manual action definitions + executeAction
- src/core/crypto.ts     — Crypto price formula + money→crypto conversion
- src/core/engine.ts     — rAF loop (ticks timestamps; no automated resource changes in baseline)
- src/core/persistence.ts — Save/load/export/import (resources + timestamps only)
- src/core/validation.ts  — Runtime + serialization validation rules
- src/dev/simulate.ts    — Headless simulation harness
- src/App.vue            — Minimal interactive UI (actions, crypto market, save, log, debug)
- src/utils/formatter.ts — Decimal formatting helpers (unchanged)

## Stubbed Modules (not active in this baseline)

The following modules are stubs (export {}) and will be rebuilt in future iterations:
- src/core/activities.ts — Passive income activities
- src/core/upgrades.ts   — Purchasable upgrade tree
- src/core/research.ts   — Research node tree
- src/core/tasks.ts      — Task/achievement system
- src/core/prestige.ts   — Prestige/reset layers
- src/core/reputation.ts — Path-weighted reputation multipliers (logic now inline in actions.ts)

## Resource Model

Four canonical resources — all Decimal at runtime, scientific-string in save files:
- money      — Primary currency. Earned by clicking actions, spent on crypto conversion
- crypto     — Cryptocurrency. Purchased via the conversion market
- compute    — Compute pool (Tflops). Starting cap = 10. Cannot be spent; allocation-only in future
- reputation — Signed numeric value. Positive = whitehat tendency, negative = blackhat tendency

Alignment thresholds (from config):
  reputation > 100  → "whitehat"
  reputation < -100 → "blackhat"
  otherwise         → "greyhat"

## Crypto Conversion

Formula (log-space sine wave, predictable but non-trivial):
  price = basePrice × 10^(amplitude × sin(2π × t / period))

Config:
  basePrice:            1
  fluctuationAmplitude: 0.9
  pricePeriodMs:        60,000  (60 seconds per full cycle)
  minMultiplier:        0.1     ($0.10 / CR floor)
  maxMultiplier:        10      ($10.00 / CR ceiling)

The price is deterministic given elapsed time since session creation.
convertMoneyToCrypto() returns null if funds are insufficient or amount is ≤ 0.

## Manual Actions

Two actions defined in config and ACTION_DEFINITIONS:
  pentestSystem  — +$1 money, +1 REP  (whitehat path)
  exploitSystem  — +$1 money, -1 REP  (blackhat path)

executeAction(state, actionId) applies reward and reputation delta immediately.

## Save / Load

- Save key: gray_protocol_save_v1
- Envelope: { version, createdAt, updatedAt, payload: base64(JSON) }
- Payload: { version, resources: {money/crypto/compute/reputation as scientific strings}, timestamps }
- repairResourceMap() sanitizes NaN/Infinity on load
- Exports/imports round-trip through base64-encoded JSON

## Validation Rules

- All four resource keys must exist and be finite Decimal
- money, crypto, compute must be ≥ 0 (reputation may be negative)
- Serialized resources must be scientific-notation strings
- Crypto price must be within [minMultiplier, maxMultiplier]
- Timestamps must be finite non-negative numbers

## Numeric / Scientific Storage Model

- Runtime: break_eternity.js Decimal
- Serialized: serializeDecimal() → toExponential(12) e.g. "1.000000000000e+1"
- Parsed back via deserializeDecimal()

## Engine Loop

The rAF loop only advances timestamps in this baseline.
No automated resource changes occur — all resource mutations require explicit user actions.
tick() is exported as a no-op stub for future automation wiring.

## Simulation Harness

src/dev/simulate.ts demonstrates:
- Initial resource state
- pentestSystem × 5 (money +5, rep +5)
- exploitSystem × 3 (money +3, rep -3)
- Crypto price curve at 7 time samples across one period
- convertMoneyToCrypto() success path
- convertMoneyToCrypto() failure paths (over-budget, zero amount)
- Reputation alignment thresholds at boundary values
- validateGameState() passes
- validateSerializedGameState() passes
- Scientific notation output of saved resources

## Known Limitations

- No automated income — resources only change via explicit click actions
- Compute is stored but has no gameplay effect in this baseline
- Price fluctuation is purely time-based (wall clock since session creation)
- No prestige, research, activities, or upgrades in this baseline

## Next Implementation Step

Add a passive income tier: one or more manual "queue" or timed activities
(e.g., "run a scan job for 10 seconds") that apply rewards on completion —
building toward the activity/level system while staying grounded on this baseline.
