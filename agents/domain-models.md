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
- `manualActions.executedById: Record<string, number>`
- `manualActions.totalExecutions: number`
- `manualActions.lastExecutedAtById: Record<string, number>`
- `tasks.claimedById: Record<string, boolean>`
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

## Runtime Reputation/Reward Helper Contracts

- `calculateActionReward(state, actionId)` returns projected action rewards using the same deterministic reward math as runtime outcome resolution.
- `getReputationActionMultiplier(state, actionDefinition)` returns path-aware action multiplier from current reputation alignment/value.
- `applyActionReputationDelta(state, actionDefinition)` applies action reputation deltas and research gain/loss modifiers.
- `calculateActivityYield(state, activityId, deltaSeconds?, activityYieldMultipliers?, computeEfficiencyMultiplier?)` supports deterministic runtime and display projections.
- `applyUpgradeEffectsToYield(state, activityId, baseYield?)` and `applyResearchEffectsToYield(state, activityId, baseYield)` are state-first helper APIs.
- `applyReputationEffects(state, value, path)` applies multiplicative path-aware reputation scaling for both actions and activities.

## PrestigeLayer

`PrestigeLayerDefinition` supports:

- id/name/description
- requirement
- reset targets
- research preservation toggle
- reward resource + reward amount

## ManualActionDefinition

- `id`, `name`, `description`
- `type`: `instant | duration`
- `path`: `shared | whitehat | blackhat | greyhat`
- `baseCost`, `baseReward`
- `reputationEffect`
- optional `successChance`, `rewardVariance`, `failureRewardMultiplier`
- optional compute scaling profile
- optional cooldown and duration

## TaskDefinition

- `id`, `name`, `description`
- `type`: `resourceThreshold | reputationThreshold | actionCount | activityLevel | researchCompletion`
- typed requirement payload by task type
- `reward: Partial<ResourceMap>`
- `recommended: boolean`
- optional `pathHint`

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
- activities/research/prestige/allocations/upgrades/manualActions/tasks/timestamps
- `allocations.computeByActivityId` values as scientific strings
- `upgrades.levelsById` values as integers

## Documentation Repositories

- Repository docs live in this repo (`README.md`, `PROJECT_KNOWLEDGE.md`, `agents/*.md`).
- Wiki docs live in the separate wiki git repository (`Gray-Protocol.wiki.git`).
