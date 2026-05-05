// src/core/types.ts
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
  baseReward: Decimal;
  reputationDelta: Decimal;
}

export interface ActionOutcome {
  actionId: string;
  rewardApplied: Decimal;
  reputationDelta: Decimal;
}

export interface CryptoConversionResult {
  paid: Decimal;
  received: Decimal;
  pricePerUnit: Decimal;
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
}

export interface SerializedGameState {
  version: string;
  resources: SerializedResourceMap;
  timestamps: {
    createdAt: number;
    lastSavedAt: number;
    lastTickAt: number;
  };
}

export interface SaveFile {
  version: string;
  createdAt: number;
  updatedAt: number;
  payload: string;
}
