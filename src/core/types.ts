// src/core/types.ts
import Decimal from "break_eternity.js";

export type ResourceKey = "money" | "crypto" | "compute" | "reputation";

export type ResourceMap = Record<ResourceKey, Decimal>;
export type SerializedResourceMap = Record<ResourceKey, string>;

export type ReputationAlignment = "whitehat" | "greyhat" | "blackhat";

export interface ReputationGate {
  min?: Decimal;
  max?: Decimal;
  alignment?: ReputationAlignment;
}

export type ActivityPath = "shared" | "whitehat" | "blackhat" | "greyhat";

export type ScalingType = "linear" | "exponential" | "polynomial";

export interface ActivityDefinition {
  id: string;
  name: string;
  path: ActivityPath;
  description: string;
  baseCost: Partial<ResourceMap>;
  baseYieldPerSecond: Partial<ResourceMap>;
  costScalingRate: Decimal;
  yieldScalingRate: Decimal;
  levelCostScaling: ScalingType;
  yieldScaling: ScalingType;
  maxLevel: number;
  reputationGate?: ReputationGate;
  unlockRequirements?: string[];
  consumesPerSecond?: Partial<ResourceMap>;
  usesComputeAllocation: boolean;
}

export interface ActivityState {
  id: string;
  level: number;
  unlocked: boolean;
  active: boolean;
}

export type ResearchEffectType =
  | "resourceMultiplier"
  | "activityYieldMultiplier"
  | "activityUnlock"
  | "reputationGainMultiplier"
  | "computeEfficiencyMultiplier";

export interface ResearchEffect {
  type: ResearchEffectType;
  target?: string;       // activityId or resourceKey
  value: Decimal;
}

export interface ResearchNodeDefinition {
  id: string;
  name: string;
  description: string;
  cost: Partial<ResourceMap>;
  prerequisites: string[];
  reputationGate?: ReputationGate;
  effects: ResearchEffect[];
}

export interface PrestigeLayerDefinition {
  id: string;
  name: string;
  description: string;
  requirement: Partial<ResourceMap>;
  resetsResources: ResourceKey[];
  preservesResearch: boolean;
  rewardResource: ResourceKey;
  rewardAmount: Decimal;
}

export interface PrestigeLayerState {
  id: string;
  timesCompleted: number;
  totalRewardsEarned: Decimal;
}

export interface AllocationMap {
  computeByActivityId: Record<string, Decimal>;
}

export interface SerializedAllocationMap {
  computeByActivityId: Record<string, string>;
}

export interface ResourceDelta {
  yields: Partial<ResourceMap>;
  costs: Partial<ResourceMap>;
}

export interface GameState {
  version: string;
  resources: ResourceMap;
  activities: Record<string, ActivityState>;
  research: {
    completed: Set<string>;
  };
  prestige: {
    layers: Record<string, PrestigeLayerState>;
  };
  allocations: AllocationMap;
  timestamps: {
    createdAt: number;
    lastSavedAt: number;
    lastTickAt: number;
  };
  log: string[];
}

export interface SaveFile {
  version: string;
  createdAt: number;
  updatedAt: number;
  payload: string;
}

export interface SerializedGameState {
  version: string;
  resources: SerializedResourceMap;
  activities: Record<string, ActivityState>;
  researchCompleted: string[];
  prestigeLayers: Record<
    string,
    {
      id: string;
      timesCompleted: number;
      totalRewardsEarned: string;
    }
  >;
  allocations: SerializedAllocationMap;
  timestamps: {
    createdAt: number;
    lastSavedAt: number;
    lastTickAt: number;
  };
}
