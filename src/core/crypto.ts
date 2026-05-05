// src/core/crypto.ts
import Decimal from "break_eternity.js";
import type { GameState, CryptoConversionResult } from "./types";
import { GAME_CONFIG } from "./config";

/**
 * Returns current crypto price as a Decimal.
 * Uses a log-space sine wave for smooth predictable fluctuation.
 *   price = basePrice * 10^(amplitude * sin(2pi * t / period))
 * Range after clamping: [basePrice * minMultiplier, basePrice * maxMultiplier]
 */
export function getCryptoPrice(elapsedMs: number): Decimal {
  const { basePrice, fluctuationAmplitude, pricePeriodMs, minMultiplier, maxMultiplier } =
    GAME_CONFIG.cryptoConversion;
  const phase = (2 * Math.PI * elapsedMs) / pricePeriodMs;
  const logMultiplier = new Decimal(fluctuationAmplitude).mul(Math.sin(phase));
  const raw = new Decimal(basePrice).mul(Decimal.pow(10, logMultiplier));
  return raw.max(new Decimal(minMultiplier)).min(new Decimal(maxMultiplier));
}

/**
 * Convert moneyAmount of $Money into Crypto at the current fluctuating price.
 * Deducts $Money and credits Crypto. Returns null if insufficient or invalid amount.
 */
export function convertMoneyToCrypto(
  gs: GameState,
  moneyAmount: Decimal
): CryptoConversionResult | null {
  if (!moneyAmount.isFinite() || moneyAmount.lte(0)) return null;
  if (gs.resources.money.lt(moneyAmount)) return null;

  const elapsed = Date.now() - gs.timestamps.createdAt;
  const price = getCryptoPrice(elapsed);
  const received = moneyAmount.div(price);

  gs.resources = {
    ...gs.resources,
    money: gs.resources.money.sub(moneyAmount),
    crypto: gs.resources.crypto.add(received),
  };

  return { paid: moneyAmount, received, pricePerUnit: price };
}
