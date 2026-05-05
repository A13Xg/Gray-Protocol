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

## Save System Summary

- Save envelope: `{ version, createdAt, updatedAt, payload }`
- `payload` is codec-encoded JSON (default codec uses Base64 obfuscation)
- Numeric values in decoded payload are scientific-notation strings (or `"0"`)
- Runtime values are always `Decimal`
- Legacy resource keys (`cryptoCurrency`, `computePower`, `reputationStanding`) are migrated on load when possible

Base64 is obfuscation only, not security.

## Current Implemented Systems

- Deterministic headless `tick(state, deltaMs)` engine path
- Batched offline progress via `calculateOfflineProgress(state, elapsedMs)`
- Canonical resource map utilities
- Compute allocation by absolute amounts (`allocations.computeByActivityId`)
- Config-driven starter activities:
  - `basicCryptoMining`
  - `bugBountyHunting`
  - `passwordCracking`
- Config-driven starter research:
  - `parallelProcessing`
  - `responsibleDisclosure`
  - `exploitAutomation`
- Single prestige foundation layer:
  - `protocolReset`
- Save validation and serialized payload validation
- Dev simulation harness in `src/dev/simulate.ts`
