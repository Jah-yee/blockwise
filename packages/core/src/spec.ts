// Spec of record: docs/architecture.md section 1. Must agree with contracts/src/Evaluator.sol.

export const SPEC_VERSION = 1;
export const LAGS = 6;
export const PARAMS = 7;
export const COST_BPS = 3;
export const FIRST_EARN = 6;
export const W_MIN = -64;
export const W_MAX = 63;
export const THR_MAX = 8191;

/** [w0..w5, thr], all integers. */
export type Spec = readonly number[];

/** Returns null when valid, otherwise the first problem. Mirrors Evaluator._validate (which reverts). */
export function validate(p: Spec): string | null {
  if (p.length !== PARAMS) return `expected ${PARAMS} params, got ${p.length}`;
  for (let k = 0; k < PARAMS; k++) {
    const v = p[k]!;
    if (!Number.isInteger(v)) return `param ${k} is not an integer`;
  }
  for (let k = 0; k < LAGS; k++) {
    if (p[k]! < W_MIN || p[k]! > W_MAX) return `param ${k} out of [${W_MIN}, ${W_MAX}]`;
  }
  if (p[LAGS]! < 0 || p[LAGS]! > THR_MAX) return `param ${LAGS} out of [0, ${THR_MAX}]`;
  return null;
}

export function isValid(p: Spec): boolean {
  return validate(p) === null;
}

/** Stable identity for a spec (dedupe, archive keys). */
export function specId(p: Spec): string {
  return p.join(",");
}

export function clampSpec(p: readonly number[]): number[] {
  return p.map((v, k) => {
    const x = Math.round(v);
    return k < LAGS ? Math.min(W_MAX, Math.max(W_MIN, x)) : Math.min(THR_MAX, Math.max(0, x));
  });
}
