import { VERSION } from "./config";
import type { SaveFile, SerializedGameState } from "./types";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function migrateV1ToV2(payload: Record<string, unknown>): Record<string, unknown> {
  // V1 payload contained only resources/timestamps.
  return {
    ...payload,
    version: "2.0.0",
    generators: payload.generators ?? {
      levels: {},
      timedProgress: {},
      passiveRemainderMs: {},
      timedAutoRunById: {},
    },
  };
}

function migrateV2ToV3(payload: Record<string, unknown>): Record<string, unknown> {
  // V2 introduced generators; V3 introduces talents and prestige scaffolding.
  return {
    ...payload,
    version: VERSION,
    generators: isObject(payload.generators)
      ? {
          ...payload.generators,
          timedAutoRunById: isObject(payload.generators.timedAutoRunById)
            ? payload.generators.timedAutoRunById
            : {},
        }
      : {
          levels: {},
          timedProgress: {},
          passiveRemainderMs: {},
          timedAutoRunById: {},
        },
    talents: payload.talents ?? {
      runUnlockedById: {},
      permanentUnlockedById: {},
    },
    prestige: payload.prestige ?? {
      level: "0",
      multiplier: "1",
      cumulativeResources: {
        money: "0",
        crypto: "0",
        compute: "0",
        reputation: "0",
      },
    },
  };
}

export function migrateSerializedPayload(payload: unknown): SerializedGameState {
  if (!isObject(payload)) {
    throw new Error("Serialized payload is not an object");
  }

  const rawVersion = typeof payload.version === "string" ? payload.version : "1.0.0";
  let migrated = payload as Record<string, unknown>;

  if (rawVersion.startsWith("1.")) {
    migrated = migrateV1ToV2(migrated);
  }

  const versionAfterV1 = typeof migrated.version === "string" ? migrated.version : "2.0.0";
  if (versionAfterV1.startsWith("2.")) {
    migrated = migrateV2ToV3(migrated);
  }

  if (typeof migrated.version !== "string" || !migrated.version.startsWith("3.")) {
    migrated = { ...migrated, version: VERSION };
  }

  return migrated as unknown as SerializedGameState;
}

export function migrateSaveEnvelope(file: SaveFile): SaveFile {
  if (!file.version || file.version.startsWith("3.")) return file;
  return {
    ...file,
    version: "3.0.0",
  };
}
