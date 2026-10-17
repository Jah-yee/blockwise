// Usage: bun run apps/site/sim/build.ts
// Builds apps/site/dist/simulator/index.html: one self-contained page. Every number comes from
// data/series/v1.json + fixtures/testnet-run-2.jsonl, recomputed with the spec of record (docs/architecture.md section 1).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { run } from "../../../packages/core/src/strategy";
import { COST_BPS, LAGS, FIRST_EARN, type Spec } from "../../../packages/core/src/spec";

const root = resolve(import.meta.dir, "../../..");
const series = JSON.parse(readFileSync(resolve(root, "data/series/v1.json"), "utf8"));
const r: number[] = series.returns;
const devEnd: number = series.devEnd, confirmEnd: number = series.confirmEnd, N = r.length;
const ev = readFileSync(resolve(root, "fixtures/testnet-run-2.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const fail = (m: string): never => { console.error("SIM BUILD FAILED: " + m); process.exit(1); };

/** Per-step walk-forward over earn range [lo,hi), following architecture section 1 exactly. */
function walk(p: Spec, lo: number, hi: number) {
  const thr = p[LAGS]!;
  let prev = 0, acc = 0, trades = 0;
  const steps: { e: number; s: number; pos: number; gross: number; cost: number; net: number; delta: number }[] = [];
  for (let t = lo - 1; t + 1 < hi; t++) {
    let s = 0;
    for (let k = 0; k < LAGS; k++) s += p[k]! * r[t - k]!;
    const pos = s > thr ? 1 : s < -thr ? -1 : 0;
    const gross = pos * r[t + 1]!;
    let cost = 0;
    const delta = pos - prev;
    if (delta !== 0) { cost = COST_BPS * Math.abs(delta); trades++; prev = pos; }
    const net = gross - cost;
    acc += net;
    steps.push({ e: t + 1, s, pos, gross, cost, net, delta });
  }
  return { pnl: acc, trades, steps };
}

const hello = ev.find((e) => e.type === "hello");
if (hello.config.devEnd !== devEnd || hello.config.confirmEnd !== confirmEnd || hello.config.n !== N) fail("config mismatch");
const sealedEv = ev.find((e) => e.type === "sealed");
const champ: Spec = ev.find((e) => e.type === "tx_sent" && e.gen === sealedEv.gen && e.idx === sealedEv.idx).params;
const geEnd = ev.find((e) => e.type === "generation_end" && e.gen === sealedEv.gen);
if (JSON.stringify(geEnd.best.params) !== JSON.stringify(champ)) fail("champion params differ between sealed/tx_sent and generation_end");
const landed = (g: number, i: number) => ev.find((e) => e.type === "tx_landed" && e.gen === g && e.idx === i);
const confirmEv = ev.find((e) => e.type === "confirm" && e.gen === sealedEv.gen && e.idx === sealedEv.idx);

// ---- champion: three segments, each scored from flat as the Evaluator does
const segs = [
  { id: "dev", lo: FIRST_EARN, hi: devEnd, exp: sealedEv.dev, expTrades: landed(sealedEv.gen, sealedEv.idx).trades },
  { id: "confirm", lo: devEnd, hi: confirmEnd, exp: confirmEv.score, expTrades: confirmEv.trades },
  { id: "sealed", lo: confirmEnd, hi: N, exp: sealedEv.score, expTrades: sealedEv.trades },
];
const checks: any[] = [];
const steps: any[] = [], trades: any[] = [];
let eq = 0, holdGross = 0, openCost = 0, k = 0;
for (const sg of segs) {
  const w = walk(champ, sg.lo, sg.hi);
  const lib = run(champ, r, sg.lo, sg.hi);
  const ok = w.pnl === sg.exp && w.trades === sg.expTrades && lib.pnl === w.pnl && lib.trades === w.trades;
  checks.push({ id: sg.id, got: w.pnl, expected: sg.exp, trades: w.trades, expectedTrades: sg.expTrades, ok });
  if (!ok) fail(`champion ${sg.id}: helper ${w.pnl}/${w.trades}, core ${lib.pnl}/${lib.trades}, events ${sg.exp}/${sg.expTrades}`);
  holdGross = 0; openCost = 0; let posNow = 0;
  for (const s of w.steps) {
    eq += s.net;
    const prevPos = s.pos - s.delta;
    if (s.delta !== 0) {
      const closeCost = prevPos !== 0 ? COST_BPS : 0;
      const rt = prevPos !== 0 ? holdGross - openCost - closeCost : null;
      openCost = s.pos !== 0 ? s.cost - closeCost : 0; holdGross = 0;
      trades.push({ k, e: s.e, t: s.e - 1, side: s.delta > 0 ? "BUY" : "SELL", size: Math.abs(s.delta), pos: s.pos, cost: s.cost, rt, eq, seg: sg.id });
    }
    holdGross += s.gross; posNow = s.pos;
    steps.push({ e: s.e, pos: s.pos, gross: s.gross, net: s.net, eq, seg: sg.id });
    k++;
  }
}
const P: number[] = []; { let a = 0; for (const x of r) { a += x; P.push(a); } }

// ---- candidates: all 100/gen, ordered by landing time; recompute every dev score with the mirror
const gens: any[] = [];
const cands: any[] = [];
let mism = 0, checked = 0, lost = 0;
const curveOf = (p: Spec) => { const w = walk(p, FIRST_EARN, devEnd); let a = 0; return { total: w.pnl, curve: [0, ...w.steps.map((s) => (a += s.net))] }; };
let runBest = -Infinity; const records: any[] = [];
for (let g = 1; g <= 10; g++) {
  const sent = ev.filter((e) => e.type === "tx_sent" && e.gen === g);
  const ge = ev.find((e) => e.type === "generation_end" && e.gen === g);
  const gs = ev.find((e) => e.type === "generation_start" && e.gen === g);
  const rows = sent.map((s) => ({ s, l: landed(g, s.idx) })).sort((a, b) => (a.l?.t ?? 1e12) - (b.l?.t ?? 1e12));
  const ops = [0, 0, 0, 0];
  let gbest = -Infinity;
  for (const { s, l } of rows) {
    ops[s.operator]++;
    if (!l || l.status !== "success") { lost++; cands.push({ g, i: s.idx, op: s.operator, dev: null }); continue; }
    const rr = run(s.params, r, FIRST_EARN, devEnd);
    checked++; if (rr.pnl !== l.dev || rr.trades !== l.trades) mism++;
    gbest = Math.max(gbest, l.dev);
    let rec = -1;
    if (l.dev > runBest) { runBest = l.dev; const c = curveOf(s.params); if (c.total !== l.dev) fail("record curve mismatch"); records.push({ g, i: s.idx, dev: l.dev, curve: c.curve }); rec = records.length - 1; }
    cands.push({ g, i: s.idx, op: s.operator, dev: l.dev, rec });
  }
  if (gbest !== ge.best.dev) fail(`gen ${g}: max landed dev ${gbest} != generation_end best ${ge.best.dev}`);
  for (let q = 0; q < 4; q++) if (gs.allocation.find((a: any) => a.operator === q).count !== ops[q] && g > 0) { /* allocation is planned; sent counts are authoritative */ }
  const mp = ev.find((e) => e.type === "map" && e.gen === g);
  const bl = ev.find((e) => e.type === "baseline" && e.gen === g);
  gens.push({ g, best: ge.best.dev, ops, map: mp.cells.map((c: any) => ({ style: c.style, act: c.activity, dev: c.elite ? c.elite.dev : null, label: c.label })), rand: bl.bestRandom1x, randMed2: bl.bestRandom2xMedian });
}
if (mism) fail(`${mism}/${checked} candidate dev scores differ from the mirror`);

const data = {
  n: N, devEnd, confirmEnd, cost: COST_BPS, epoch: hello.epoch, r, P,
  champion: { gen: sealedEv.gen, idx: sealedEv.idx, params: champ },
  steps, trades, checks, gens, cands, records,
  candCheck: { checked, mism, lost },
  confirmAll: { dev: sealedEv.dev, confirm: sealedEv.confirm, sealed: sealedEv.score },
};
const json = JSON.stringify(data).replace(/</g, "\\u003c");
const css = readFileSync(resolve(import.meta.dir, "sim.css"), "utf8");
const js = readFileSync(resolve(import.meta.dir, "sim.js"), "utf8").replace(/<\/script/gi, "<\\/script");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Blockwise · Strategy replay</title><meta name="description" content="A replay of one evolved strategy on a frozen synthetic series. Not live data, not real money."><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600&family=Hanken+Grotesk:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"><style>${css}</style></head><body><div id="app"></div><script>window.__SIM__=${json};</script><script>${js}</script></body></html>`;
const out = resolve(root, "apps/site/dist/simulator/index.html");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`checks ok: ${checks.map((c) => `${c.id} ${c.got}/${c.trades}t`).join(", ")}; candidates ${checked} reproduced, ${lost} lost; wrote ${out} (${(html.length / 1024).toFixed(0)} KiB)`);
