import { describe, expect, it } from "vitest";
import { runAllScenarios } from "../../dev/scenarios";

describe("headless progression scenarios", () => {
  it("produces finite and deterministic-friendly outputs", () => {
    const results = runAllScenarios();

    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(Number.isFinite(Number(result.resources.money))).toBe(true);
      expect(Number.isFinite(Number(result.resources.crypto))).toBe(true);
      expect(Number.isFinite(Number(result.resources.compute))).toBe(true);
      expect(Number.isFinite(Number(result.resources.reputation))).toBe(true);
      expect(result.notes.length).toBeGreaterThan(0);
    }
  });
});
