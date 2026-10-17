import { type Rng, int, mulberry32, normal } from "./rng";

export type Regime = "trend" | "momentum" | "reversion" | "chop";

export interface SeriesConfig {
  seed: number;
  n: number; // number of returns
  devEnd: number;
  confirmEnd: number;
}

export interface Series extends SeriesConfig {
  version: 1;
  generator: "regime-switching-v1";
  returns: number[]; // int16 basis points
  regimes: { from: number; to: number; regime: Regime }[];
}

export const DEFAULT_CONFIG: SeriesConfig = { seed: 20261017, n: 192, devEnd: 128, confirmEnd: 160 };

const REGIMES: Regime[] = ["trend", "momentum", "reversion", "chop"];

/**
 * Synthetic regime-switching returns in basis points. Not market data (docs/decisions/0006).
 * Segments of 20 to 40 steps; trend has a drift of 6 to 14 bp with random sign; momentum/reversion are AR(1) with phi = +/-0.55; chop is wide white noise.
 */
export function generateSeries(cfg: SeriesConfig = DEFAULT_CONFIG): Series {
  const rng: Rng = mulberry32(cfg.seed);
  const returns: number[] = [];
  const regimes: Series["regimes"] = [];
  let last = 0;
  while (returns.length < cfg.n) {
    const regime = REGIMES[int(rng, 0, REGIMES.length - 1)]!;
    const len = Math.min(int(rng, 20, 40), cfg.n - returns.length);
    const from = returns.length;
    const drift = (rng() < 0.5 ? -1 : 1) * int(rng, 6, 14);
    for (let i = 0; i < len; i++) {
      let r: number;
      switch (regime) {
        case "trend": r = drift + 14 * normal(rng); break;
        case "momentum": r = 0.55 * last + 14 * normal(rng); break;
        case "reversion": r = -0.55 * last + 14 * normal(rng); break;
        default: r = 22 * normal(rng);
      }
      const v = Math.max(-300, Math.min(300, Math.round(r)));
      returns.push(v);
      last = v;
    }
    regimes.push({ from, to: returns.length, regime });
  }
  return { ...cfg, version: 1, generator: "regime-switching-v1", returns, regimes };
}
