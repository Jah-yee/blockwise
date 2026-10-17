import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { askJev, jevConfigFromEnv, parseAnswer, type JevConfig, type JevInput } from "../src/judge/jev";
import { judgeGenerationJev, newStats } from "../src/judge/gen";
import { cmdInit } from "../src/init";
import { cmdReport } from "../src/tui/commands";

const KEY = "sk-test-SECRET-123";
let srv: ReturnType<typeof Bun.serve>; let mode = "ok"; let calls = 0; const bodies: string[] = []; let lastAuth = "";
const ans = (p: number, extra: any = {}) => Response.json({ model: "jev-1.14.0", answers: { beats: { type: "choice", choice: "yes", probabilities: { yes: p, no: 1 - p } } }, usage: { input_tokens: 1000, output_tokens: 10 }, ...extra });
beforeAll(() => {
  srv = Bun.serve({ port: 0, async fetch(req) {
    calls++; lastAuth = req.headers.get("authorization") ?? ""; bodies.push(await req.text());
    if (!req.url.endsWith("/systemone")) return new Response("no", { status: 404 });
    if (mode === "hang") return new Promise(() => {});
    if (mode === "500") return new Response("x", { status: 500 });
    if (mode === "flaky") return calls % 3 === 0 ? ans(0.7) : new Response("x", { status: 503 });
    if (mode === "401") return new Response("{}", { status: 401 });
    if (mode === "junk") return Response.json({ answers: { beats: { type: "choice", probabilities: { yes: "high" } } } });
    if (mode === "one") return ans(1);
    return ans(0.62);
  } });
});
afterAll(() => srv.stop(true));
const cfg = (o: Partial<JevConfig> = {}): JevConfig => ({ ...jevConfigFromEnv({ TYPESAFE_AI_API_KEY: KEY, TYPESAFE_AI_BASE_URL: `http://127.0.0.1:${srv.port}`, JEV_MODEL_ID: "jev-test" })!, timeoutMs: 1500, backoffMs: 5, ...o });
const input: JevInput = { spec: [1, 2, 3, 4, 5, 6, 7], operator: 2, threshold: 10, championDev: 10, recentBest: [1, 5, 10], archiveSize: null };
const reset = (m: string) => { mode = m; calls = 0; bodies.length = 0; };

test("no key means no config (caller falls back to the labelled stand-in)", () => { expect(jevConfigFromEnv({})).toBeNull(); expect(jevConfigFromEnv({ TYPESAFE_AI_API_KEY: "  " })).toBeNull(); });
test("ok: pBps, cost from tokens, model id from the response, key only in the header, never in the body", async () => {
  reset("ok");
  const r = await askJev(cfg(), input);
  expect(r.ok).toBe(true);
  if (r.ok) { expect(r.pBps).toBe(6200); expect(r.model).toBe("jev"); expect(r.modelId).toBe("jev-1.14.0"); expect(r.usd).toBeCloseTo((1000 * 0.042 + 10 * 0.042) / 1e6, 12); }
  expect(lastAuth).toBe(`Bearer ${KEY}`);
  expect(bodies.join("")).not.toContain(KEY);
  expect(JSON.parse(bodies[0]!).model).toBe("jev-test");
});
test("probability is clamped to 1..9999 bps", async () => { reset("one"); const r = await askJev(cfg(), input); expect(r.ok && r.pBps).toBe(9999); });
test("non-numeric answer is rejected", () => { expect(parseAnswer({ answers: { beats: { type: "choice", probabilities: { yes: "high" } } } })).toBeNull(); expect(parseAnswer({ answers: { beats: { type: "choice", probabilities: { yes: 1.5 } } } })).toBeNull(); expect(parseAnswer({ answers: { beats: { type: "choice", probabilities: { yes: NaN } } } })).toBeNull(); });
test("invalid body is a miss without retry", async () => { reset("junk"); const r = await askJev(cfg(), input); expect(r.ok).toBe(false); expect(!r.ok && r.reason).toBe("invalid"); expect(calls).toBe(1); });
test("401 is a miss, not retried, and the message does not contain the key", async () => { reset("401"); const r = await askJev(cfg(), input); expect(!r.ok && r.reason).toBe("http"); expect(calls).toBe(1); expect(JSON.stringify(r)).not.toContain(KEY); });
test("5xx retried with backoff then succeeds", async () => { reset("flaky"); const r = await askJev(cfg({ retries: 3 }), input); expect(r.ok).toBe(true); expect(calls).toBe(3); expect(r.attempts).toBe(3); });
test("hard timeout: a hung server is a miss within the deadline", async () => { reset("hang"); const t = Date.now(); const r = await askJev(cfg({ timeoutMs: 200 }), input); expect(!r.ok && r.reason).toBe("timeout"); expect(Date.now() - t).toBeLessThan(800); });
test("generation batch: bounded concurrency, misses counted, events carry model jev + modelId, usd summed", async () => {
  reset("ok");
  const ev: any[] = []; const st = newStats();
  const cands = Array.from({ length: 10 }, (_, i) => ({ idx: i, spec: [1, 2, 3, 4, 5, 6, 7], operator: 1 }));
  const miss = await judgeGenerationJev(cfg(), cands, { gen: 1, threshold: 0, championDev: null, recentBest: [], archiveSize: null }, (e) => ev.push(e), st, { max: 8, concurrency: 3 });
  expect(miss).toBeNull(); expect(ev.length).toBe(8); expect(ev.every((e) => e.type === "judge" && e.model === "jev" && e.modelId === "jev-1.14.0")).toBe(true);
  expect(st.ok).toBe(8); expect(st.usd).toBeGreaterThan(0);
});
test("generation batch: a dead server never blocks past the batch deadline; misses reported", async () => {
  reset("hang");
  const ev: any[] = []; const st = newStats(); const t = Date.now();
  const cands = Array.from({ length: 6 }, (_, i) => ({ idx: i, spec: [1, 2, 3, 4, 5, 6, 7], operator: 1 }));
  const miss = await judgeGenerationJev(cfg({ timeoutMs: 400 }), cands, { gen: 2, threshold: 0, championDev: null, recentBest: [], archiveSize: null }, (e) => ev.push(e), st, { concurrency: 2, batchDeadlineMs: 500 });
  expect(Date.now() - t).toBeLessThan(1500); expect(ev.length).toBe(0); expect(st.missed).toBe(6); expect(miss).toContain("missed 6/6");
});

test("init: config.json is 0600, holds no key; key only saved with --save-key, from stdin, never printed", async () => {
  const home = mkdtempSync(join(tmpdir(), "bw-home-")); process.env.BLOCKWISE_HOME = home;
  const out: string[] = [];
  const io = { isTTY: false, env: {} as any, say: (s: string) => out.push(s), readStdin: async () => KEY + "\n", ask: async () => "" };
  expect(await cmdInit({ rpc: "http://127.0.0.1:8545", "jev-model": "jev-x", "key-stdin": true, "save-key": true }, io)).toBe(0);
  const cj = join(home, "config.json");
  expect(statSync(cj).mode & 0o777).toBe(0o600);
  expect(readFileSync(cj, "utf8")).not.toContain(KEY);
  expect(JSON.parse(readFileSync(cj, "utf8"))).toMatchObject({ rpcUrl: "http://127.0.0.1:8545", jev: { model: "jev-x" } });
  expect(statSync(join(home, "jev.key")).mode & 0o777).toBe(0o600);
  expect(out.join("\n")).not.toContain(KEY);
  const out2: string[] = [];
  await cmdInit({ yes: true }, { ...io, env: { TYPESAFE_AI_API_KEY: KEY }, say: (s) => out2.push(s) });
  expect(out2.join("\n")).not.toContain(KEY); expect(out2.join("\n")).toContain("NOT saved");
  delete process.env.BLOCKWISE_HOME;
});

test("report --md renders the fixture", () => {
  let s = ""; cmdReport(["report", join(import.meta.dir, "../../../fixtures/events.sample.jsonl")], { md: true }, { out: { write: (x: string) => { s += x; return true; } } as any });
  expect(s).toContain("# Blockwise run report"); expect(s).toContain("## What we may not claim");
});
