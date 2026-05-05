import Decimal, { type DecimalSource } from "break_eternity.js";

const COMPACT_SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No"];

function normalizeDecimal(value: DecimalSource | Decimal | unknown): Decimal | null {
  try {
    const decimal = value instanceof Decimal ? value : new Decimal(value as DecimalSource);
    if (!decimal.isFinite() || Decimal.isNaN(decimal)) return null;
    return decimal;
  } catch {
    return null;
  }
}

export function formatScientific(value: DecimalSource | Decimal | unknown, precision = 6): string {
  const decimal = normalizeDecimal(value);
  if (!decimal) return "Invalid";
  if (decimal.eq(0)) return "0";
  return decimal.toExponential(Math.max(0, precision));
}

export function formatCompact(value: DecimalSource | Decimal | unknown, precision = 2): string {
  const decimal = normalizeDecimal(value);
  if (!decimal) return "Invalid";

  if (decimal.lt(0)) return `-${formatCompact(decimal.neg(), precision)}`;
  if (decimal.lt(1000)) return decimal.toFixed(Math.max(0, precision));

  const exponent = Math.floor(decimal.log10().toNumber());
  const tier = Math.floor(exponent / 3);

  if (tier < COMPACT_SUFFIXES.length) {
    const scaled = decimal.div(new Decimal(10).pow(tier * 3));
    return `${scaled.toFixed(Math.max(0, precision))}${COMPACT_SUFFIXES[tier]}`;
  }

  return formatScientific(decimal, precision);
}

export function format(value: DecimalSource | Decimal | unknown, precision = 2): string {
  const decimal = normalizeDecimal(value);
  if (!decimal) return "Invalid";

  if (decimal.abs().gte("1e15") || (decimal.abs().lt("1e-3") && !decimal.eq(0))) {
    return formatScientific(decimal, Math.max(2, precision + 2));
  }

  return formatCompact(decimal, precision);
}
