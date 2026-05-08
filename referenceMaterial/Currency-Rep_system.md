# Currency & Reputation System

Gray Protocol v2.0.0-baseline

---

## Table of Contents

1. [Resource Units](#1-resource-units)
2. [Currency System — $Money](#2-currency-system--money)
3. [Currency System — Crypto](#3-currency-system--crypto)
4. [Compute Power](#4-compute-power)
5. [Reputation System](#5-reputation-system)
6. [Crypto Conversion Market](#6-crypto-conversion-market)
7. [Serialization & Storage](#7-serialization--storage)
8. [Validation Rules](#8-validation-rules)
9. [Modular JSON Node Examples](#9-modular-json-node-examples)

---

## 1. Resource Units

There are four canonical resources. All share the same internal type (`ResourceMap`) and are stored as `Decimal` values at runtime using [break_eternity.js](https://github.com/Patashu/break_eternity.js).

| Key | Display Label | Short Label | Starting Value | Signed? | Floor |
|---|---|---|---|---|---|
| `money` | $Money | `$` | `0` | No | `0` |
| `crypto` | Crypto | `CR` | `0` | No | `0` |
| `compute` | Compute (Tflops) | `TF` | `10` | No | `0` |
| `reputation` | Reputation | `REP` | `0` | **Yes** | none |

**Source of truth:** `GAME_CONFIG.resources` in `src/core/config.ts`

---

## 2. Currency System — $Money

$Money is the primary spendable currency.

### Earning
- **Pentest System** action: +$1 per click (whitehat path)
- **Exploit System** action: +$1 per click (blackhat path)

### Spending
- Purchasing Crypto via the conversion market (see §6)
- Reserved for future: purchasing activity levels, upgrades

### Constraints
- Cannot go below `0`
- All arithmetic is `Decimal`-safe; NaN or negative results are treated as validation failures

---

## 3. Currency System — Crypto

Crypto (`CR`) is a secondary currency purchased from $Money via the conversion market.

### Earning
- Buying Crypto by spending $Money at the current market price

### Spending
- Reserved for future: blackhat research nodes, late-game purchases

### Constraints
- Cannot go below `0`
- Amount received = `moneyPaid / currentPrice` — varies with market timing

---

## 4. Compute Power

Compute is a **pool resource**, not a spendable currency. It represents available processing capacity in Teraflops (Tflops).

### Mechanics (baseline)
- Starts at `10` Tflops
- Cannot be spent directly
- Used for **allocation** to activities (reserved for future expansion)
- Can only increase through prestige layer rewards

### Why it exists at the baseline
Compute is tracked from day one so that save files, serialization, and state validation stay consistent across versions — even before any allocation gameplay is active.

---

## 5. Reputation System

Reputation is a **signed additive numeric value**. It tracks the player's behavioral alignment over time.

### Alignment Bands

Reputation is always a runtime `Decimal`. Alignment is **derived**, never stored:

```
reputation > 100   →  "whitehat"
reputation < −100  →  "blackhat"
−100 ≤ rep ≤ 100   →  "greyhat"
```

Thresholds are defined in `GAME_CONFIG.reputation` and use exclusive comparison (`>` / `<`), so exactly ±100 is still "greyhat".

### How Reputation Changes

Each manual action carries a fixed `reputationDelta`:

| Action | Reward | Reputation Delta | Path |
|---|---|---|---|
| `pentestSystem` | +$1 | **+1** | whitehat |
| `exploitSystem` | +$1 | **−1** | blackhat |

`executeAction()` applies both the money reward and the reputation delta atomically in a single state update.

### Reputation Is Additive

There is no decay, cap, or floor in the baseline. The value accumulates indefinitely in either direction.

```
rep_new = rep_current + reputationDelta
```

### Future Effects (not yet active)

Reputation is designed to gate access and scale rewards for path-sensitive activities and research:
- **Whitehat** actions and activities become more effective with positive alignment
- **Blackhat** actions and activities become more effective with negative alignment
- **Greyhat / shared** content is neutral to alignment
- Research nodes and upgrades can require minimum or maximum reputation thresholds

These effects exist in the type system and config schema but are not applied in the baseline engine tick.

### Helper — `getReputationAlignment(rep: Decimal)`

Located in `src/core/actions.ts`. Returns `"whitehat"`, `"greyhat"`, or `"blackhat"` for any Decimal reputation value.

---

## 6. Crypto Conversion Market

The conversion market lets players trade $Money for Crypto at a fluctuating price.

### Price Formula

The price follows a **log-space sine wave** — smooth, predictable, and bounded:

```
price = basePrice × 10^( amplitude × sin( 2π × t / period ) )
```

Where `t` is milliseconds elapsed since session creation (`Date.now() - createdAt`).

### Parameters

| Parameter | Value | Effect |
|---|---|---|
| `basePrice` | `1.0` | Midpoint price ($1.00 / CR) |
| `fluctuationAmplitude` | `0.9` | Log-scale swing |
| `pricePeriodMs` | `60,000` ms | Full price cycle = 60 seconds |
| `minMultiplier` | `0.1` | Floor: $0.10 / CR |
| `maxMultiplier` | `10` | Ceiling: $10.00 / CR |

### Price Behaviour Reference

Approximate prices at key points in the 60-second cycle:

| Elapsed | Phase | Price |
|---|---|---|
| 0 s | 0° | ~$1.00 / CR |
| 10 s | 60° | ~$6.02 / CR |
| 15 s | 90° | ~$7.94 / CR (peak) |
| 30 s | 180° | ~$1.00 / CR |
| 45 s | 270° | ~$0.13 / CR (trough) |
| 60 s | 360° | ~$1.00 / CR |

**Buy near the trough (~45s) to maximise Crypto received per dollar.**

### Conversion Logic

`convertMoneyToCrypto(gs, moneyAmount)` in `src/core/crypto.ts`:

1. Rejects if `moneyAmount ≤ 0` or not finite
2. Rejects if `gs.resources.money < moneyAmount`
3. Samples current price from elapsed time
4. Calculates `received = moneyAmount / price`
5. Atomically deducts $Money and credits Crypto
6. Returns `{ paid, received, pricePerUnit }` or `null` on failure

---

## 7. Serialization & Storage

All resource values are stored as **scientific-notation strings** in save files.

### Format

```json
{
  "money":      "1.000000000000e+1",
  "crypto":     "2.997396967638e+0",
  "compute":    "1.000000000000e+1",
  "reputation": "7.000000000000e+0"
}
```

Produced by `serializeDecimal(value)` → `value.toExponential(12)`.  
Parsed by `deserializeDecimal(str)` → `new Decimal(str)` with NaN/Infinity fallback to `0`.

Negative reputation serializes correctly: `"-5.000000000000e+0"`.

### Save Key

`gray_protocol_save_v1` (localStorage)

---

## 8. Validation Rules

Enforced by `validateResourceMap()` and `validateGameState()` in `src/core/validation.ts`:

| Rule | Detail |
|---|---|
| All four resource keys must exist | `money`, `crypto`, `compute`, `reputation` |
| Each value must be a finite, non-NaN Decimal | `isValidDecimal(value)` |
| `money`, `crypto`, `compute` must be ≥ 0 | Reputation is exempt (signed) |
| Serialized values must be scientific-notation strings | Regex + Decimal parse |
| Crypto price must be within `[minMultiplier, maxMultiplier]` | `validateCryptoPrice()` |

Failed validation surfaces via `ValidationResult { valid, errors[] }` — never throws silently.

---

## 9. Modular JSON Node Examples

The runtime now supports content-first configuration through JSON catalogs. Current files:

- `src/core/content/nodeCatalog.json` for clickable/passive/timedTask nodes
- `src/core/content/talents.json` for talent nodes

### Example A: Clickable Node

```json
{
  "id": "hardenDevice",
  "kind": "clickable",
  "path": "whitehat",
  "enabled": true,
  "aliases": ["hardenComputer", "pentestSystem"],
  "inputResources": {},
  "outputResources": { "money": "1" },
  "defaultMultiplierPct": "0",
  "reputationEffect": "1",
  "upgrade": {
    "startingLevel": 1,
    "maxLevel": 10,
    "levelMultiplierPct": "100"
  }
}
```

### Example B: Passive Node

```json
{
  "id": "antiVirus",
  "kind": "passive",
  "path": "whitehat",
  "enabled": true,
  "outputResources": { "crypto": "0.1" },
  "defaultMultiplierPct": "0",
  "computeScaling": {
    "enabled": true,
    "baselineCompute": "10",
    "exponent": "0.25"
  },
  "runtime": {
    "tickIntervalMs": 1000,
    "allowAutoRun": true
  }
}
```

### Example C: Timed Task Node

```json
{
  "id": "buildDevice",
  "kind": "timedTask",
  "path": "whitehat",
  "enabled": true,
  "inputResources": { "money": "10", "crypto": "5" },
  "outputResources": { "money": "20" },
  "computeScaling": {
    "enabled": true,
    "baselineCompute": "10",
    "exponent": "0.2"
  },
  "upgrade": {
    "startingLevel": 1,
    "maxLevel": 5,
    "levelMultiplierPct": "100",
    "timedInputCostGrowthPct": "5"
  },
  "runtime": {
    "durationMs": 60000,
    "allowAutoRun": true
  }
}
```

### Example D: Talent Node

```json
{
  "id": "marketMakers",
  "scope": "run",
  "costs": {
    "money": "40",
    "reputation": "3"
  },
  "effects": {
    "cryptoEfficiency": {
      "mode": "multiplicative",
      "value": "0.1"
    }
  }
}
```

### Practical Notes

- Keep numeric values as strings in JSON for precise Decimal parsing.
- Use aliases on clickable nodes to preserve old action IDs while renaming internals.
- Keep formulas simple and standard:
  - Level output multiplier: `(1 + levelMultiplierPct/100)^(level-1)`
  - Timed input cost multiplier: `(1 + timedInputCostGrowthPct/100)^(level-1)`
  - Default node multiplier: `1 + defaultMultiplierPct/100`
