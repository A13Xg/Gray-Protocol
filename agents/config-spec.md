# Gray Protocol — Config Spec

## GAME_CONFIG Location
`src/core/config.ts` exports `GAME_CONFIG` as the single source of truth for all balance values.

## Structure
```
GAME_CONFIG {
  tickRate: number          // ms per tick
  offlineCapMs: number      // max offline time ms
  resources.starting        // initial ResourceMap values
  reputation.whithatThreshold / blackhatThreshold
  activities.<id> {
    baseCost, baseYieldPerSecond, levelCostScaling, yieldScaling,
    costScalingRate, yieldScalingRate, maxLevel, reputationGate?
  }
  research.<id> {
    cost, prerequisites, reputationGate?, effects[]
  }
  prestige.<id> {
    requirement, resetsResources, preservesResearch,
    rewardResource, rewardAmount
  }
  scaling { softcapThreshold, softcapPower }
}
```

## Adding a New Activity
1. Add entry to `GAME_CONFIG.activities` with all balance values.
2. Add `ActivityDefinition` to `ACTIVITY_DEFINITIONS` in `src/core/activities.ts` referencing config.
3. Do NOT hardcode any numbers inside activities.ts.

## Adding a New Research Node
1. Add entry to `GAME_CONFIG.research`.
2. Add `ResearchNodeDefinition` to `RESEARCH_DEFINITIONS` in `src/core/research.ts`.

## Adding a New Prestige Layer
1. Add entry to `GAME_CONFIG.prestige`.
2. Add `PrestigeLayerDefinition` to `PRESTIGE_DEFINITIONS` in `src/core/prestige.ts`.

## Rule
Gameplay values (costs, yields, thresholds, rewards, scaling constants) must NEVER be hardcoded inside logic modules. They must always reference `GAME_CONFIG`.
