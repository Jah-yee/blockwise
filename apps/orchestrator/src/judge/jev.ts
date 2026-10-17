// Real Jev judge (shadow only). Same API the Jev Trader repo uses through @ai-sdk/typesafe-ai: POST {base}/systemone
// with a Bearer key, one typed `choice` question, probabilities back. We call it with plain fetch (wire format read from
// the SDK source, @ai-sdk/typesafe-ai 3.0.21) so the packaged CLI has no SDK dependency and each call can be aborted.
// Authority: shadow. This module has no import from the chain package and holds no wallet; the key is read from the
// environment, sent only in the Authorization header, and never placed in a prompt, an event, a log line or an error.
export const DEFAULT_BASE_URL = "https://api.typesafe.ai/v1";
export const DEFAULT_MODEL = "jev-latest";
// Price assumption: docs/jev.md quotes about $0.042 per million input tokens. The output rate is NOT published there;
// we assume the same number and say so. Override with JEV_USD_PER_MTOK_IN / JEV_USD_PER_MTOK_OUT.
export const DEFAULT_USD_PER_MTOK = 0.042;

export interface JevConfig {
  apiKey: string; baseUrl: string; model: string; timeoutMs: number; retries: number; backoffMs: number;
  usdPerMtokIn: number; usdPerMtokOut: number; fetch?: typeof fetch;
}
export interface JevInput { spec: readonly number[]; operator: string | number; threshold: number; championDev: number | null; recentBest: readonly number[]; archiveSize: number | null }
export interface JevOk { ok: true; threshold: number; pBps: number; latencyMs: number; usd: number; model: "jev"; modelId: string; inputTokens: number; outputTokens: number; attempts: number }
export type MissReason = "timeout" | "http" | "network" | "invalid" | "aborted";
export interface JevMiss { ok: false; reason: MissReason; detail: string; latencyMs: number; attempts: number }

const num = (v: string | undefined, d: number) => { const n = v === undefined || v === "" ? NaN : Number(v); return Number.isFinite(n) && n >= 0 ? n : d; };

/** Read the config from env; null when no key (the caller then says so and uses the labelled stand-in). */
export function jevConfigFromEnv(env: Record<string, string | undefined> = process.env, over: Partial<JevConfig> = {}): JevConfig | null {
  const apiKey = (env.TYPESAFE_AI_API_KEY ?? "").trim();
  if (!apiKey) return null;
  return {
    apiKey, baseUrl: (env.TYPESAFE_AI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ""), model: env.JEV_MODEL_ID?.trim() || DEFAULT_MODEL,
    timeoutMs: 8000, retries: 2, backoffMs: 300,
    usdPerMtokIn: num(env.JEV_USD_PER_MTOK_IN, DEFAULT_USD_PER_MTOK), usdPerMtokOut: num(env.JEV_USD_PER_MTOK_OUT, DEFAULT_USD_PER_MTOK), ...over,
  };
}

const INSTR = {
  question: "Will this candidate trading strategy's score on the development segment exceed the threshold?",
  goal: "Estimate the probability that the candidate's dev score (basis points of simulated return on a fixed synthetic series) is above the threshold. Calibration matters more than confidence.",
  timing: "The candidate has not been evaluated yet. You are asked before its result exists.",
  inputs: "state: seven integer parameters of the candidate, the operator that produced it, the threshold (the current champion's dev score), the champion's score, the best dev score of recent generations, the archive size.",
};
export const QUESTIONS = { beats: { type: "choice", instructions: INSTR, criteria: { yes: "The dev score will exceed the threshold.", no: "The dev score will not exceed the threshold." } } } as const;

/** The state sent to the model. Only numbers and the operator name; nothing from the environment can get in. */
export function buildState(i: JevInput) {
  return { candidate: { params: [...i.spec], operator: i.operator }, threshold: i.threshold, champion_dev: i.championDev, recent_best_dev: [...i.recentBest].slice(-5), archive_size: i.archiveSize };
}

/** Turn a response body into pBps, or null if it is not a usable probability. Clamped to [1, 9999] bps: a 0 or 10000 is never believable. */
export function parseAnswer(body: unknown): { pBps: number; modelId: string | null; inTok: number; outTok: number } | null {
  const b = body as any;
  const a = b?.answers?.beats;
  if (!a || typeof a !== "object") return null;
  let p: unknown;
  if (a.type === "choice" && a.probabilities && typeof a.probabilities === "object") p = a.probabilities.yes;
  else if (a.type === "noul") p = a.noul;
  if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 1) return null;
  const tok = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
  return { pBps: Math.max(1, Math.min(9999, Math.round(p * 10000))), modelId: typeof b.model === "string" && b.model ? b.model : null, inTok: tok(b.usage?.input_tokens), outTok: tok(b.usage?.output_tokens) };
}

const sleep = (ms: number, s: AbortSignal) => new Promise<void>((res) => { const t = setTimeout(res, ms); s.addEventListener("abort", () => { clearTimeout(t); res(); }, { once: true }); });

/** One prediction with a hard deadline (covers all retries). Never throws; a miss is a value. 429 and 5xx retry with backoff; 4xx and bad bodies do not. */
export async function askJev(cfg: JevConfig, input: JevInput, outer?: AbortSignal): Promise<JevOk | JevMiss> {
  const t0 = Date.now();
  const f = cfg.fetch ?? fetch;
  const dl = AbortSignal.timeout(cfg.timeoutMs);
  const signal = outer ? AbortSignal.any([dl, outer]) : dl;
  const body = JSON.stringify({ model: cfg.model, state: buildState(input), questions: QUESTIONS });
  let last: JevMiss = { reason: "network", detail: "no attempt", latencyMs: 0, attempts: 0, ok: false };
  for (let attempt = 1; attempt <= cfg.retries + 1; attempt++) {
    const miss = (reason: MissReason, detail: string): JevMiss => ({ ok: false, reason, detail, latencyMs: Date.now() - t0, attempts: attempt });
    if (signal.aborted) return miss(outer?.aborted ? "aborted" : "timeout", `deadline ${cfg.timeoutMs} ms`);
    try {
      const r = await f(`${cfg.baseUrl}/systemone`, { method: "POST", signal, headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}`, "user-agent": "blockwise-cli" }, body });
      if (r.status === 429 || r.status >= 500) { last = miss("http", `HTTP ${r.status}`); await r.arrayBuffer().catch(() => {}); }
      else if (!r.ok) { await r.arrayBuffer().catch(() => {}); return miss("http", `HTTP ${r.status}${r.status === 401 || r.status === 403 ? " (check TYPESAFE_AI_API_KEY)" : ""}`); }
      else {
        let j: unknown; try { j = await r.json(); } catch { return miss("invalid", "response is not JSON"); }
        const a = parseAnswer(j);
        if (!a) return miss("invalid", "no usable probability in answers.beats");
        const usd = (a.inTok * cfg.usdPerMtokIn + a.outTok * cfg.usdPerMtokOut) / 1e6;
        return { ok: true, threshold: input.threshold, pBps: a.pBps, latencyMs: Date.now() - t0, usd, model: "jev", modelId: a.modelId ?? cfg.model, inputTokens: a.inTok, outputTokens: a.outTok, attempts: attempt };
      }
    } catch (e) {
      if (signal.aborted) return miss(outer?.aborted && !dl.aborted ? "aborted" : "timeout", `deadline ${cfg.timeoutMs} ms`);
      last = miss("network", (e as Error).name === "TypeError" ? "network error" : String((e as Error).message).slice(0, 80));
    }
    if (attempt <= cfg.retries) await sleep(cfg.backoffMs * 2 ** (attempt - 1), signal);
  }
  return { ...last, latencyMs: Date.now() - t0, attempts: cfg.retries + 1 };
}
