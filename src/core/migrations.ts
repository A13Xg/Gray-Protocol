import { VERSION } from "./config";
import type { SaveFile, SerializedGameState } from "./types";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function migrateToManualNodeState(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    version: VERSION,
    resources: isObject(payload.resources)
      ? payload.resources
      : {
          money: "0",
          crypto: "0",
          compute: "0",
          reputation: "0",
        },
    timestamps: isObject(payload.timestamps)
      ? payload.timestamps
      : {
          createdAt: 0,
          lastSavedAt: 0,
          lastTickAt: 0,
        },
    nodes: isObject(payload.nodes)
      ? payload.nodes
      : {
          levels: {},
        },
  };
}

export function migrateSerializedPayload(payload: unknown): SerializedGameState {
  if (!isObject(payload)) {
    throw new Error("Serialized payload is not an object");
  }

  return migrateToManualNodeState(payload as Record<string, unknown>) as unknown as SerializedGameState;
}

export function migrateSaveEnvelope(file: SaveFile): SaveFile {
  if (!file.version || file.version === VERSION) return file;
  return {
    ...file,
    version: VERSION,
  };
}
