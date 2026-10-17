import { COST_BPS, FIRST_EARN, LAGS, type Spec, validate } from "./spec";

export interface RunResult {
  pnl: number; // basis points
  trades: number;
}

/**
 * Walk-forward over earn range [lo, hi): the decision at t uses r[t-5..t] and earns r[t+1].
 * Exact mirror of Evaluator._run. Integer arithmetic only.
 */
export function run(p: Spec, r: readonly number[], lo: number, hi: number): RunResult {
  const bad = validate(p);
  if (bad) throw new Error(`invalid spec: ${bad}`);
  if (lo < FIRST_EARN) throw new Error(`lo must be >= ${FIRST_EARN}`);
  if (hi > r.length) throw new Error("hi beyond series");

  const thr = p[LAGS]!;
  let prev = 0;
  let acc = 0;
  let trades = 0;
  for (let t = lo - 1; t + 1 < hi; t++) {
    let s = 0;
    for (let k = 0; k < LAGS; k++) s += p[k]! * r[t - k]!;
    const pos = s > thr ? 1 : s < -thr ? -1 : 0;
    acc += pos * r[t + 1]!;
    if (pos !== prev) {
      acc -= COST_BPS * Math.abs(pos - prev);
      trades++;
      prev = pos;
    }
  }
  return { pnl: acc, trades };
}

export interface Roles {
  devEnd: number;
  confirmEnd: number;
}

export function dev(p: Spec, r: readonly number[], roles: Roles): RunResult {
  return run(p, r, FIRST_EARN, roles.devEnd);
}
export function confirm(p: Spec, r: readonly number[], roles: Roles): RunResult {
  return run(p, r, roles.devEnd, roles.confirmEnd);
}
export function sealed(p: Spec, r: readonly number[], roles: Roles): RunResult {
  return run(p, r, roles.confirmEnd, r.length);
}
