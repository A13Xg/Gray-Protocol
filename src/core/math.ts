// src/core/math.ts
import Decimal, { type DecimalSource } from "break_eternity.js";

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
