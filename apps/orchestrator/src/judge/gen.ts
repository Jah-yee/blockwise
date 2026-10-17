// Per-generation shadow judging: bounded concurrency, a whole-batch deadline, fail-open. Called BEFORE a generation is sent.
import { standInJudge } from "../judge";
import { askJev, type JevConfig, type JevInput, type MissReason } from "./jev";

export interface JudgeStats { asked: number; ok: number; missed: number; reasons: Partial<Record<MissReason, number>>; usd: number }
export const newStats = (): JudgeStats => ({ asked: 0, ok: 0, missed: 0, reasons: {}, usd: 0 });

export interface JudgeCand { idx: number; spec: readonly number[]; operator: string | number }
export interface GenCtx { gen: number; threshold: number; championDev: number | null; recentBest: readonly number[]; archiveSize: number | null }

/** Ask Jev for up to `max` candidates, `concurrency` at a time. Emits one `judge` event per real answer (model "jev", plus modelId).
 *  Misses are counted in `stats` and returned as one message; they never throw and never delay past `batchDeadlineMs`. */
export async function judgeGenerationJev(cfg: JevConfig, cands: readonly JudgeCand[], g: GenCtx, emit: (e: any) => void, stats: JudgeStats, o: { max?: number; concurrency?: number; batchDeadlineMs?: number } = {}): Promise<string | null> {
  const list = cands.slice(0, o.max ?? 20);
  const batch = new AbortController();
  const timer = setTimeout(() => batch.abort(), o.batchDeadlineMs ?? Math.round(cfg.timeoutMs * 1.5));
  let next = 0; let missed = 0; const reasons: Record<string, number> = {};
  const worker = async () => {
    while (next < list.length) {
      const c = list[next++]!;
      const input: JevInput = { spec: c.spec, operator: c.operator, threshold: g.threshold, championDev: g.championDev, recentBest: g.recentBest, archiveSize: g.archiveSize };
      stats.asked++;
      const r = batch.signal.aborted ? ({ ok: false, reason: "aborted", detail: "batch deadline", latencyMs: 0, attempts: 0 } as const) : await askJev(cfg, input, batch.signal);
      if (r.ok) {
        stats.ok++; stats.usd += r.usd;
        emit({ type: "judge", gen: g.gen, idx: c.idx, threshold: r.threshold, pBps: r.pBps, latencyMs: r.latencyMs, usd: r.usd, model: r.model, modelId: r.modelId });
      } else { stats.missed++; missed++; stats.reasons[r.reason] = (stats.reasons[r.reason] ?? 0) + 1; reasons[r.reason] = (reasons[r.reason] ?? 0) + 1; }
    }
  };
  try { await Promise.all(Array.from({ length: Math.max(1, Math.min(o.concurrency ?? 4, list.length)) }, worker)); } finally { clearTimeout(timer); }
  return missed ? `gen ${g.gen}: jev judge missed ${missed}/${list.length} predictions (${Object.entries(reasons).map(([k, v]) => `${k} ${v}`).join(", ")}); counted, generation not delayed further, no prediction recorded for those` : null;
}

/** The labelled stand-in, same shape (kept here so run.ts has one entry point). */
export function judgeGenerationStandIn(cands: readonly JudgeCand[], g: GenCtx, emit: (e: any) => void, returns: readonly number[], devEnd: number) {
  for (const c of cands.slice(0, 20)) emit({ type: "judge", gen: g.gen, idx: c.idx, ...standInJudge(c.spec as number[], returns, devEnd) });
}
