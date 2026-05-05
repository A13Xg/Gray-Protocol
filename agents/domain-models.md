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
- `upgrades.levelsById: Record<string, number>`
- `timestamps: { createdAt, lastSavedAt, lastTickAt }`
- `log: string[]`

## ActivityDefinition

- Stable `id`
- `path`
- `baseCost`, `baseYieldPerSecond`
- scaling config (`levelCostScaling`, `yieldScaling`, rates)
- optional `reputationGate`
- optional `unlockRequirements`
- optional `requiresResearchUnlock`
- optional `consumesPerSecond`
- `usesComputeAllocation`

## ResearchNode

`ResearchNodeDefinition` supports:

- id/name/description
- `path`: shared/whitehat/blackhat/greyhat
- cost
- prerequisites
- optional reputation gate
- optional `position`
- config-driven effects

## ResearchEffect

- `resourceMultiplier`
- `activityYieldMultiplier`
- `computeEfficiencyMultiplier`
- `reputationGainMultiplier`
- `reputationLossMultiplier`
- `activityUnlock`
- `upgradeUnlock`

## UpgradeDefinition

- `id`, `name`, `description`
- `scope`: `activity | path | global`
- optional `activityId`
- optional `path`
- `cost: Partial<ResourceMap>`
- `maxLevel: number`
- `costScaling`, `costScalingRate`
- `effects: UpgradeEffect[]`
- optional `reputationGate`
- optional `prerequisites`
- optional `requiresResearchUnlock`

## UpgradeEffect

- `activityYieldMultiplier`
- `activityCostMultiplier`
- `computeEfficiencyMultiplier`
- `reputationGainMultiplier`
- `reputationLossMultiplier`

Only effect types wired into gameplay this layer: `activityYieldMultiplier`, `computeEfficiencyMultiplier`.

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
- activities/research/prestige/allocations/upgrades/timestamps
- `allocations.computeByActivityId` values as scientific strings
- `upgrades.levelsById` values as integers
