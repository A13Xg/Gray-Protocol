import Decimal from "break_eternity.js";

export const BALANCE_TARGETS = {
  earlyGame: {
    // Expected first manual action reward bounds at level 1.
    manualRewardMin: new Decimal(0.9),
    manualRewardMax: new Decimal(1.5),
    // Expected timed generator completion window.
    timedDurationMsMin: 55_000,
    timedDurationMsMax: 65_000,
    // Baseline conversion efficiency bounds before deep upgrades.
    cryptoEfficiencyMin: new Decimal(1),
    cryptoEfficiencyMax: new Decimal(1.5),
  },
  progression: {
    // Target to make first prestige reachable in early-mid progression.
    firstPrestigeCumulativeMoneyTarget: new Decimal(1_000),
  },
} as const;
