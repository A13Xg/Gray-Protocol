import Decimal from "break_eternity.js";

export type ResourceKey = "money" | "crypto" | "compute" | "reputation";

export type ResourceMap = Record<ResourceKey, Decimal>;
export type SerializedResourceMap = Record<ResourceKey, string>;

export type ReputationAlignment = "whitehat" | "greyhat" | "blackhat";

export type ActionPath = "whitehat" | "blackhat" | "shared";

export type NodeKind = "clickable" | "passive" | "timedTask";

export interface NodeUnlockRequirements {
  minReputation?: Decimal;
  maxReputation?: Decimal;
  minResources?: Partial<Record<ResourceKey, Decimal>>;
  requiredNodeLevels?: Record<string, number>;
}

export interface NodeUpgradeConfig {
  startingLevel: number;
  maxLevel: number;
  // Per-level growth in percent. Example: 100 => x2 each level.
  levelMultiplierPct: Decimal;
  // Used by timed task input cost scaling.
  timedInputCostGrowthPct?: Decimal;
}

export interface NodeComputeScaling {
  enabled: boolean;
  baselineCompute: Decimal;
  exponent: Decimal;
}

export interface NodeRuntimeConfig {
  tickIntervalMs?: number;
  durationMs?: number;
  allowAutoRun?: boolean;
}

export interface NodeConfig {
  id: string;
  name: string;
  description: string;
  kind: NodeKind;
  path: ActionPath;
  enabled: boolean;
  aliases: string[];
  inputResources: Partial<Record<ResourceKey, Decimal>>;
  outputResources: Partial<Record<ResourceKey, Decimal>>;
  defaultMultiplierPct: Decimal;
  reputationEffect: Decimal;
  unlock: NodeUnlockRequirements;
  upgrade: NodeUpgradeConfig;
  computeScaling: NodeComputeScaling;
  runtime: NodeRuntimeConfig;
  tags: string[];
}

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  path: ActionPath;
  generatorId: string;
  baseReward: Decimal;
  reputationDelta: Decimal;
}

export interface ActionOutcome {
  actionId: string;
  generatorId: string;
  level: number;
  rewardApplied: Decimal;
  reputationDelta: Decimal;
}

export interface ManualClickAction {
  definition: ActionDefinition;
  currentLevel(gs: GameState): number;
  getYield(gs: GameState): Decimal;
  execute(gs: GameState): ActionOutcome | null;
  levelUp(gs: GameState): boolean;
}

export interface NodeState {
  levels: Record<string, number>;
}

export interface GameState {
  version: string;
  resources: ResourceMap;
  timestamps: {
    createdAt: number;
    lastSavedAt: number;
    lastTickAt: number;
  };
  log: string[];
  nodes: NodeState;
}

export interface SerializedGameState {
  version: string;
  resources: SerializedResourceMap;
  timestamps: {
    createdAt: number;
    lastSavedAt: number;
    lastTickAt: number;
  };
  nodes?: {
    levels: Record<string, string>;
  };
}

export interface SaveFile {
  version: string;
  createdAt: number;
  updatedAt: number;
  payload: string;
}
