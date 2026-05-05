// src/core/math.ts
import Decimal, { type DecimalSource } from "break_eternity.js";
import type { ResourceMap, SerializedResourceMap } from "./types";

export function toDecimal(value: DecimalSource): Decimal {
  return new Decimal(value);
}

export function safeDecimal(value: unknown, fallback: DecimalSource = 0): Decimal {
  try {
    const d = new Decimal(value as DecimalSource);
    if (Decimal.isNaN(d) || !d.isFinite()) return new Decimal(fallback);
    return d;
  } catch {
    return new Decimal(fallback);
  }
}

export function isValidDecimal(value: unknown): boolean {
  try {
    const d = new Decimal(value as DecimalSource);
    return !Decimal.isNaN(d) && d.isFinite();
  } catch {
    return false;
  }
}

export function serializeDecimal(value: Decimal): string {
  if (!value.isFinite() || Decimal.isNaN(value)) return "0";
  if (value.eq(0)) return "0";
  return value.toExponential(12);
}

export function deserializeDecimal(value: string): Decimal {
  if (typeof value !== "string" || value.trim().length === 0) return new Decimal(0);
  try {
    const parsed = new Decimal(value.trim());
    if (!parsed.isFinite() || Decimal.isNaN(parsed)) return new Decimal(0);
    return parsed;
  } catch {
    return new Decimal(0);
  }
}

export function serializeResourceMap(resources: ResourceMap): SerializedResourceMap {
  return {
    money: serializeDecimal(resources.money),
    crypto: serializeDecimal(resources.crypto),
    compute: serializeDecimal(resources.compute),
    reputation: serializeDecimal(resources.reputation),
  };
}

export function deserializeResourceMap(resources: SerializedResourceMap): ResourceMap {
  return {
    money: deserializeDecimal(resources.money),
    crypto: deserializeDecimal(resources.crypto),
    compute: deserializeDecimal(resources.compute),
    reputation: deserializeDecimal(resources.reputation),
  };
}

export function scaleLinear(base: DecimalSource, level: DecimalSource, rate: DecimalSource): Decimal {
  const b = new Decimal(base);
  const l = new Decimal(level);
  const r = new Decimal(rate);
  return b.mul(l.mul(r).add(1));
}

export function scaleExponential(base: DecimalSource, level: DecimalSource, rate: DecimalSource): Decimal {
  const b = new Decimal(base);
  const l = new Decimal(level);
  const r = new Decimal(rate);
  return b.mul(r.pow(l));
}

export function scalePolynomial(base: DecimalSource, level: DecimalSource, exponent: DecimalSource): Decimal {
  const b = new Decimal(base);
  const l = new Decimal(level);
  const e = new Decimal(exponent);
  return b.mul(l.add(1).pow(e));
}

export function applySoftcap(value: DecimalSource, threshold: DecimalSource, power: DecimalSource): Decimal {
  const v = new Decimal(value);
  const t = new Decimal(threshold);
  const p = new Decimal(power);
  if (v.lte(t)) return v;
  const excess = v.sub(t);
  return t.add(excess.pow(p));
}

export function applyMultiplier(value: DecimalSource, multiplier: DecimalSource): Decimal {
  return new Decimal(value).mul(new Decimal(multiplier));
}
