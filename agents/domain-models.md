# Gray Protocol — Domain Models

## Resources
Four Decimal-backed resources live in `state.resources: ResourceMap`:
- `money` — general currency
- `cryptoCurrency` — earned from mining/cracking
- `computePower` — allocatable capacity
- `reputationStanding` — signed additive; drives alignment

## Reputation
- Derived from `reputationStanding` Decimal.
- `> +100` → whitehat, `< -100` → blackhat, otherwise → greyhat.
- Never clamped. Never stored as an enum. Alignment computed on demand via `getReputationAlignment()`.
- Gates: `{ min?, max?, alignment? }` — any combination supported.

## Activities
- Idle production channels with `id, name, path, level, active, unlocked`.
- Paths: shared, whitehat, blackhat, greyhat.
- Each tick calculates a `ResourceDelta` (yields + costs) without mutating state directly.
- Engine aggregates deltas into `state.resources`.
- `usesComputeAllocation: true` activities are boosted by allocated `computePower`.
- Sample: `basicCryptoMining`, `bugBountyHunting`, `passwordCracking`.

## ComputePower Allocation
- `state.allocations.computePowerByActivityId: Record<string, Decimal>`
- Total allocations cannot exceed `state.resources.computePower`.
- Set via `setComputeAllocation(state, activityId, amount)`.
- Allocation boosts yield of compatible activities multiplicatively.

## Research
- Nodes with `id, cost, prerequisites, reputationGate, effects`.
- One-time purchase; stored as `state.research.completed: Set<string>`.
- Effects: `activityYieldMultiplier`, `computeEfficiencyMultiplier`, etc.
- Sample: `parallelProcessing`, `responsibleDisclosure`, `exploitAutomation`.

## Prestige
- Reset layers defined in `PRESTIGE_DEFINITIONS`.
- One layer: `protocolReset` — requires cryptoCurrency, resets resources, awards computePower bonus.
- Tracked in `state.prestige.layers: Record<string, PrestigeLayerState>`.
- Not part of the tick loop; triggered explicitly.

## State Shape
```
GameState {
  version: string
  resources: ResourceMap
  activities: Record<string, ActivityState>
  research: { completed: Set<string> }
  prestige: { layers: Record<string, PrestigeLayerState> }
  allocations: { computePowerByActivityId: Record<string, Decimal> }
  timestamps: { createdAt, lastSavedAt, lastTickAt }
  log: string[]
}
```
