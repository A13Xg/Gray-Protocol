# Domain Models

## ResourceKey

`"money" | "crypto" | "compute" | "reputation"`

## ResourceMap

`Record<ResourceKey, Decimal>`

## GameState

- `version: string`
- `resources: ResourceMap`
- `activities: Record<string, ActivityState>`
- `research.completed: Set<string>`
- `prestige.layers: Record<string, PrestigeLayerState>`
- `allocations.computeByActivityId: Record<string, Decimal>`
- `timestamps: { createdAt, lastSavedAt, lastTickAt }`
- `log: string[]`

## ActivityDefinition

- Stable `id`
- `path`
- `baseCost`, `baseYieldPerSecond`
- scaling config (`levelCostScaling`, `yieldScaling`, rates)
- optional `reputationGate`
- optional `unlockRequirements`
- optional `consumesPerSecond`
- `usesComputeAllocation`

## ResearchNode

`ResearchNodeDefinition` supports:

- id/name/description
- cost
- prerequisites
- optional reputation gate
- config-driven effects

## PrestigeLayer

`PrestigeLayerDefinition` supports:

- id/name/description
- requirement
- reset targets
- research preservation toggle
- reward resource + reward amount

## ReputationGate

Supports optional:

- `min`
- `max`
- `alignment`

## Serialized Save Model

Top-level save envelope:

- `version`
- `createdAt`
- `updatedAt`
- `payload`

Decoded `payload` is `SerializedGameState`:

- canonical `resources` as scientific strings
- activities/research/prestige/allocations/timestamps
- `allocations.computeByActivityId` values as scientific strings
