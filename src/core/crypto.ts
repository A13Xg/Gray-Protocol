import Decimal from "break_eternity.js";
import type { GameState, CryptoConversionResult } from "./types";
import { GAME_CONFIG } from "./config";
import { getCryptoEfficiencyMultiplier } from "./upgrades";
import { recordResourceGain } from "./progression";

function deterministicNoise01(bucket: number, seed: number): number {
  const x = Math.sin(bucket * 12.9898 + seed * 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * Returns current crypto price as a Decimal.
 * price = basePrice * 10^(amplitude * sin(2pi*t/period) + optionalNoise)
 * Always clamped to [base*0.1, base*10] by config bounds.
 */
export function getCryptoPrice(elapsedMs: number): Decimal {
  const { basePrice, fluctuationAmplitude, pricePeriodMs, minMultiplier, maxMultiplier, noise } =
    GAME_CONFIG.cryptoConversion;

  const phase = (2 * Math.PI * elapsedMs) / pricePeriodMs;
  const wave = new Decimal(fluctuationAmplitude).mul(Math.sin(phase));

  let noiseTerm = new Decimal(0);
  if (noise.enabled) {
    const bucket = Math.floor(elapsedMs / noise.bucketMs);
    const centered = deterministicNoise01(bucket, noise.seed) * 2 - 1;
    noiseTerm = new Decimal(noise.amplitude).mul(centered);
  }

  const logMultiplier = wave.add(noiseTerm);
  const raw = new Decimal(basePrice).mul(Decimal.pow(10, logMultiplier));

  const minPrice = new Decimal(basePrice).mul(minMultiplier);
  const maxPrice = new Decimal(basePrice).mul(maxMultiplier);
  return raw.max(minPrice).min(maxPrice);
}

/**
 * Convert moneyAmount of $Money into Crypto at the current fluctuating price.
 * If elapsedMs is omitted, engine time (lastTickAt-createdAt) is used for deterministic behavior.
 */
export function convertMoneyToCrypto(
  gs: GameState,
  moneyAmount: Decimal,
  elapsedMs?: number
): CryptoConversionResult | null {
  if (!moneyAmount.isFinite() || moneyAmount.lte(0)) return null;
  if (gs.resources.money.lt(moneyAmount)) return null;

  const elapsed = elapsedMs ?? Math.max(0, gs.timestamps.lastTickAt - gs.timestamps.createdAt);
  const price = getCryptoPrice(elapsed);
  const efficiencyMultiplier = getCryptoEfficiencyMultiplier(gs);
  const received = moneyAmount.div(price).mul(efficiencyMultiplier);

  gs.resources = {
    ...gs.resources,
    money: gs.resources.money.sub(moneyAmount),
    crypto: gs.resources.crypto.add(received),
  };

  recordResourceGain(gs, { crypto: received });

  return { paid: moneyAmount, received, pricePerUnit: price, efficiencyMultiplier };
}
