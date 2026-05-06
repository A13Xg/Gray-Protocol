import Decimal from "break_eternity.js";

export type ResourceKey = "money" | "crypto" | "compute" | "reputation";

export type ResourceMap = Record<ResourceKey, Decimal>;
export type SerializedResourceMap = Record<ResourceKey, string>;

export type ReputationAlignment = "whitehat" | "greyhat" | "blackhat";

export type ActionPath = "whitehat" | "blackhat" | "shared";

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

export interface TimedActivityNode {
  id: string;
  start(gs: GameState): boolean;
  setAutoRun(gs: GameState, enabled: boolean): boolean;
  currentLevel(gs: GameState): number;
  getInputCosts(gs: GameState): Partial<Record<ResourceKey, Decimal>>;
  isAutoRunEnabled(gs: GameState): boolean;
  isRunning(gs: GameState): boolean;
}

export interface CryptoConversionResult {
  paid: Decimal;
  received: Decimal;
  pricePerUnit: Decimal;
  efficiencyMultiplier: Decimal;
}

export type GeneratorType = "manual" | "passive" | "timed";

export type GeneratorModifierMode = "additive" | "multiplicative";
export type TalentScope = "run" | "permanent";

export interface ResourceGeneratorConfig {
  id: string;
  name: string;
  description: string;
  type: GeneratorType;
  path: ActionPath;
  inputResources?: Partial<Record<ResourceKey, Decimal>>;
  outputResources: Partial<Record<ResourceKey, Decimal>>;
  tickIntervalMs?: number;
  durationMs?: number;
  level: number;
  maxLevel: number;
  levelScaling: number;
  computeScaling?: {
    enabled: boolean;
    baselineCompute: Decimal;
    exponent: Decimal;
  };
  reputationEffect?: Decimal;
  unlock?: {
    minReputation?: Decimal;
    maxReputation?: Decimal;
  };
}

export interface TimedGeneratorProgress {
  generatorId: string;
  startedAt: number;
  progressMs: number;
  completed: boolean;
}

export interface GeneratorExecuteResult {
  generatorId: string;
  outputs: Partial<Record<ResourceKey, Decimal>>;
  reputationDelta?: Decimal;
  multiplierStack?: {
    base: Decimal;
    level: Decimal;
    talentUpgrade: Decimal;
    prestige: Decimal;
    reputationCompute: Decimal;
    total: Decimal;
  };
}

export interface GeneratorState {
  levels: Record<string, number>;
  timedProgress: Record<string, TimedGeneratorProgress>;
  passiveRemainderMs: Record<string, number>;
  timedAutoRunById: Record<string, boolean>;
}

export interface GeneratorModifierEffect {
  mode: GeneratorModifierMode;
  value: Decimal;
  generatorTypes?: GeneratorType[];
  generatorIds?: string[];
  paths?: ActionPath[];
  resources?: ResourceKey[];
}

export interface CryptoModifierEffect {
  mode: GeneratorModifierMode;
  value: Decimal;
}

export interface TalentNodeDefinition {
  id: string;
  name: string;
  description: string;
  scope: TalentScope;
  costs: Partial<Record<ResourceKey, Decimal>>;
  prerequisites?: {
    allTalentNodeIds?: string[];
    minReputation?: Decimal;
    minResources?: Partial<Record<ResourceKey, Decimal>>;
    requiredGeneratorLevels?: Record<string, number>;
  };
  effects: {
    generatorMultipliers?: GeneratorModifierEffect[];
    cryptoEfficiency?: CryptoModifierEffect;
  };
}

export interface TalentState {
  runUnlockedById: Record<string, boolean>;
  permanentUnlockedById: Record<string, boolean>;
}

export interface PrestigeState {
  level: Decimal;
  multiplier: Decimal;
  cumulativeResources: ResourceMap;
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
  generators: GeneratorState;
  talents: TalentState;
  prestige: PrestigeState;
}

export interface SerializedGameState {
  version: string;
  resources: SerializedResourceMap;
  timestamps: {
    createdAt: number;
    lastSavedAt: number;
    lastTickAt: number;
  };
  generators?: {
    levels: Record<string, string>;
    timedProgress: Record<string, TimedGeneratorProgress>;
    passiveRemainderMs: Record<string, number>;
    timedAutoRunById?: Record<string, boolean>;
  };
  talents?: {
    runUnlockedById: Record<string, boolean>;
    permanentUnlockedById: Record<string, boolean>;
  };
  prestige?: {
    level: string;
    multiplier: string;
    cumulativeResources: SerializedResourceMap;
  };
}

export interface SaveFile {
  version: string;
  createdAt: number;
  updatedAt: number;
  payload: string;
}
