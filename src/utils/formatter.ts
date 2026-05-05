import Decimal, { type DecimalSource } from "break_eternity.js";

const STANDARD_SUFFIXES = ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No"];
const LETTER_CHARS = "abcdefghijklmnopqrstuvwxyz";

/** Generate letter-notation suffix for indices >= 11 (i.e., 1aa, 1ab … 1zz, 1aaa …) */
function letterSuffix(index: number): string {
  // index 0 → "aa", 1 → "ab", …
  let result = "";
  let n = index;
  do {
    result = LETTER_CHARS[n % 26] + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  // Ensure at least two characters (minimum "aa")
  if (result.length < 2) result = "a" + result;
  return result;
}

/**
 * Format a DecimalSource value into a human-readable string.
 *  - < 1e15  : standard abbreviations (1k, 1M … 1No)
 *  - >= 1e15 : letter notation (1aa, 1ab, …)
 */
export function format(value: DecimalSource, digits = 3): string {
  const d = new Decimal(value);

  if (Decimal.isNaN(d)) return "NaN";
  if (!d.isFinite()) return d.sign >= 0 ? "∞" : "-∞";
  if (d.lt(0)) return "-" + format(d.neg(), digits);
  if (d.lt(1000)) return d.toNumber().toFixed(digits === 3 ? 2 : digits);

  // Standard abbreviations up to 1e15
  const THRESHOLD = new Decimal("1e15");
  if (d.lt(THRESHOLD)) {
    for (let i = STANDARD_SUFFIXES.length - 1; i >= 1; i--) {
      const threshold = new Decimal(10).pow(i * 3);
      if (d.gte(threshold)) {
        const mantissa = d.div(threshold).toNumber();
        return mantissa.toFixed(2) + STANDARD_SUFFIXES[i];
      }
    }
  }

  // Letter notation: each step represents 1e3 (3 orders of magnitude)
  // "aa" starts at 1e15 (index 0 of letter pairs, step 5 after "No")
  // Layer 0: e = d.log10().toNumber()
  const e = d.log10().toNumber();
  const step = Math.floor(e / 3); // which power-of-1000 group
  // step 5 = 1e15 → "aa" (letter index 0)
  const letterIndex = step - 5;
  const suffix = letterSuffix(letterIndex);
  const mantissa = d.div(new Decimal(10).pow(step * 3)).toNumber();
  return mantissa.toFixed(2) + suffix;
}

/** Short format (no decimals for whole numbers < 1000) */
export function formatShort(value: DecimalSource): string {
  const d = new Decimal(value);
  if (d.lt(1000) && d.gte(0)) {
    const n = d.toNumber();
    return Number.isInteger(n) ? n.toString() : n.toFixed(1);
  }
  return format(value);
}

/** Force scientific notation for very large values */
export function formatScientific(value: DecimalSource): string {
  const d = new Decimal(value);
  if (Decimal.isNaN(d)) return "NaN";
  if (!d.isFinite()) return d.sign >= 0 ? "∞" : "-∞";
  return d.toExponential(3);
}
