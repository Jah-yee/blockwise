import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { init, reduce, type State, type Cell } from "./state";
import { pickSource } from "./source";
import { DICT, SDICT, pickLang, type Dict, type Lang, type SD } from "./i18n";
import { lanes, coarseTs, opStats, planGens, generalization, health, cost, bestSoFar } from "./derive";

// Active dictionary; assigned in App before children render.
let T: Dict = DICT.en;

const fmt = (n: number | undefined, d = 0) => (n === undefined || !isFinite(n) ? "n/a" : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }));
const sgn = (n: number | undefined, d = 1) => (n === undefined ? "n/a" : (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n), d));
const short = (h: string) => (h.length > 14 ? h.slice(0, 6) + "…" + h.slice(-4) : h);
// Score scale: seven steps from paper tint to blue-black ink. Varies in lightness, not hue.
const SCALE = ["#c3d2cd", "#9fbdb8", "#7aa7a3", "#568e8e", "#3a7377", "#265a5f", "#143a3e"];
const stepIdx = (v: number, lo: number, hi: number) => Math.max(0, Math.min(6, Math.round(((v - lo) / Math.max(1e-9, hi - lo)) * 6)));
const step = (v: number, lo: number, hi: number) => SCALE[stepIdx(v, lo, hi)]!;
const ROWS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COLS = 20;

function safeExplorer(u: string | undefined) {
  try { if (!u) return ""; const x = new URL(u); return x.protocol.startsWith("http") ? x.origin + x.pathname.replace(/\/$/, "") : ""; } catch { return ""; }
}
function Lk({ href, children, title }: { href: string; children: React.ReactNode; title?: string }) {
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" title={title}>{children}</a> : <span>{children}</span>;
}
function Head({ n, title, sub }: { n: number; title: string; sub?: React.ReactNode }) {
  return (
    <div className="ph">
      <h2><span className="fig">{T.fig} {n}</span>{title}</h2>
      {sub !== undefined && <span className="cap">{sub}</span>}
    </div>
  );
}

const OPC = ["#a4a69c", "#1f5b60", "#41423d", "#7a3f08"];
const LX = {
  en: { run_t: "run time", gen: "gen", per: "per eval", live: "live", lost_rev: "reverted / lost", shares: "Operator shares", shares_sub: "slots per generation, and discovery rate (latest gen)", cal_stand: "stand-in, not a model", cal_n: "predictions logged", timeline: "Block timeline", tl_sub: "evals landed per block", tl_ms: "mean ms between blocks (burst)", tl_coarse: "block ts are whole seconds: ms is a mean, not per block", stat_hint: "space pause · 1 4 6 speed · ← → generation", ok: "ok", run: "Run", sample: "events.sample.jsonl: synthetic fallback", mpe: "MON per eval", pause: "pause", resume: "play", prev: "gen −", next: "gen +", no_ts: "n/a", dev_l: "dev", conf_l: "confirm", seal_l: "sealed", proves_no_conf: "no confirm in this recording", top: "top", of: "of" },
  zh: { run_t: "运行时长", gen: "世代", per: "每次评估", live: "实时", lost_rev: "回滚 / 丢失", shares: "算子占比", shares_sub: "每代名额,及最新一代发现率", cal_stand: "占位实现,不是模型", cal_n: "已记录预测", timeline: "区块时间线", tl_sub: "每个区块落链的评估数", tl_ms: "区块平均间隔毫秒(突发段)", tl_coarse: "区块时间戳只精确到秒:毫秒是平均值,不是逐块测量", stat_hint: "空格 暂停 · 1 4 6 速度 · ← → 世代", ok: "成功", run: "运行", sample: "events.sample.jsonl:合成备用数据", mpe: "每次评估 MON", pause: "暂停", resume: "播放", prev: "世代 −", next: "世代 +", no_ts: "n/a", dev_l: "开发", conf_l: "确认", seal_l: "封存", proves_no_conf: "本次录制没有确认得分", top: "前列", of: "/" },
};
let X: typeof LX.en = LX.en;
const mmss = (ms: number | undefined) => { if (ms === undefined) return "-"; const t = Math.floor(ms / 1000); return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };

function Tile({ cls, title, sub, pulse, children }: { cls: string; title: string; sub?: React.ReactNode; pulse?: number; children: React.ReactNode }) {
  return (
    <section className={"tile " + cls}>
      <div className="th"><h2>{title}</h2>{sub !== undefined && <span className="sub">{sub}</span>}{pulse !== undefined && <i key={pulse} className="pl" aria-hidden="true" />}</div>
      <div className="tb">{children}</div>
    </section>
  );
}

function Stats({ s }: { s: State }) {
  const t = s.totals; const h = s.hello; const N = h?.config.generations;
  const landed = Object.values(s.cands).filter((c) => c.status).length;
  const rev = t?.reverted ?? Object.values(s.cands).filter((c) => c.status === "reverted").length;
  const lost = t?.lost ?? Object.values(s.cands).filter((c) => c.status === "lost").length;
  const items: [string, React.ReactNode, boolean?][] = [
    [T.block, s.block ? fmt(s.block) : "-"],
    [T.generation, s.count ? `${s.gen - s.base + 1} / ${N ?? "?"}` : "-"],
    [T.epoch, h ? short(h.epoch) : "-"],
    [T.evals, fmt(t?.evals ?? landed)],
    [X.lost_rev, <span key="r"><span className={rev ? "revert" : ""}>{fmt(rev)}</span> / <span className={lost ? "revert" : ""}>{fmt(lost)}</span></span>],
    [T.gas, fmt(t?.gasMon ?? 0, 3)],
    [X.run_t, mmss(s.t0 !== undefined && s.tLast !== undefined ? s.tLast - s.t0 : undefined)],
  ];
  return (
    <section className="tile stats" aria-label="stats">
      {items.map(([k, v]) => <div key={k} className="st"><span className="lbl">{k}</span><b className="num" key={k === T.block ? s.blockSeq : undefined}>{v}</b></div>)}
    </section>
  );
}

function Plate({ s }: { s: State }) {
  const devs = s.cells.filter((c) => c.dev !== undefined).map((c) => c.dev!);
  const lo = devs.length ? Math.min(...devs) : 0, hi = devs.length ? Math.max(...devs) : 1;
  const top = new Set((s.ends[s.gen]?.archive ?? []).filter((a) => a.gen === s.gen).map((a) => a.idx));
  const landed = s.cells.filter((c) => c.state === "landed").length;
  const cells = s.cells.length ? s.cells : Array.from({ length: 100 }, () => ({ state: "idle" }) as Cell);
  const rows = Math.ceil(cells.length / COLS);
  const ge = s.ends[s.gen];
  const h = ge ? ge.blocks.histogram : s.liveHist;
  const keys = Object.keys(h).map(Number);
  const total = keys.reduce((a, k) => a + (h[k] ?? 0), 0);
  return (
    <section className="tile hero">
      <div className="th"><h2>{T.plate_title}</h2><span className="sub num">{T.gen_word} {s.count ? s.gen - s.base + 1 : "-"} · {T.plate_sub(landed, s.planned ? String(s.planned) : "?")}</span></div>
      <div className="plate" style={{ ["--rows" as string]: rows }}>
        <div className="collabels">{Array.from({ length: COLS }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
        <div className="rowlabels">{Array.from({ length: rows }, (_, i) => <span key={i}>{ROWS[i]}</span>)}</div>
        <div className="wells">
          {cells.map((c, i) => (
            <div key={i} className={"well " + c.state + (top.has(i) ? " top" : "") + (c.status && c.status !== "success" ? " bad" : "")}
              title={c.dev !== undefined ? `${ROWS[Math.floor(i / COLS)]}${(i % COLS) + 1}  dev ${c.dev}` : `${ROWS[Math.floor(i / COLS)]}${(i % COLS) + 1}`}>
              {c.state === "landed" && c.status === "success" && <i key={c.hash} style={{ background: step(c.dev ?? lo, lo, hi) }} />}
            </div>
          ))}
        </div>
      </div>
      <div className="heroft">
        <div className="legend">
          <span>{T.lg_dev}</span><span>{T.lg_low}</span>{SCALE.map((c) => <i key={c} style={{ background: c }} />)}<span>{T.lg_high}</span>
          <span className="sep" /><span className="ringkey" /><span>{T.lg_top}</span>
          <span className="sep" /><span className="badkey" /><span>{T.lg_bad}</span>
        </div>
      </div>
    </section>
  );
}

function Hist({ s }: { s: State }) {
  const ge = s.ends[s.gen];
  const h = ge ? ge.blocks.histogram : s.liveHist;
  const keys = Object.keys(h).map(Number).sort((a, b) => a - b);
  const mx = Math.max(1, ...keys.map((k) => h[k] ?? 0));
  const ex = safeExplorer(s.hello?.explorer);
  const total = keys.reduce((a, k) => a + (h[k] ?? 0), 0);
  return (
    <Tile cls="hist-t" title={T.blocks_title} sub={`${T.gen_word} ${s.gen - s.base + 1}${ge ? "" : " · " + X.live}`} pulse={s.count && !ge ? s.blockSeq : undefined}>
      <div className="claim2 num"><b>{fmt(total)}</b> {T.evals_in_blocks("", "")[1]!.trim()} <b>{fmt(keys.length)}</b> {T.evals_in_blocks("", "")[3]!.trim()}</div>
      <div className="hist">
        {keys.map((k) => (
          <div key={k} className="hb"><span className="num hv">{fmt(h[k])}</span><div className="bar"><i style={{ transform: `scaleY(${(h[k] ?? 0) / mx})` }} /></div>
            <Lk href={ex ? `${ex}/block/${k}` : ""}>{String(k).slice(-3)}</Lk></div>
        ))}
        {!keys.length && <span className="cap">{T.blocks_wait}</span>}
      </div>
    </Tile>
  );
}

function Timeline({ s }: { s: State }) {
  const ls = lanes(s); const cur = ls[ls.length - 1];
  const rows = (cur?.rows ?? []).slice(-60);
  const mx = Math.max(1, ...rows.map((r) => r.evals));
  const ms = cur?.burst?.msApart;
  return (
    <Tile cls="tl" title={X.timeline} sub={X.tl_sub} pulse={s.count ? s.blockSeq : undefined}>
      <div className="spark">{rows.map((r, i) => <i key={r.number + ":" + i} style={{ height: `${Math.max(4, (r.evals / mx) * 100)}%` }} className={cur!.gaps[cur!.rows.length - rows.length + i]! > 2 ? "gap" : ""} title={`${r.number}: ${r.evals}`} />)}{!rows.length && <span className="cap">{T.lane_none}</span>}</div>
      <div className="kv"><span className="lbl">{X.tl_ms}</span><b className="num">{ms !== undefined ? fmt(ms) : "-"}</b></div>
      {cur?.burst && <div className="cap num">{T.h1_where(fmt(cur.burst.first), fmt(cur.burst.last))} · {cur.burst.blocks} {T.block}</div>}
      {cur && cur.strag.blocks > 0 && <div className="cap">{T.h1_strag(cur.strag.evals, cur.strag.blocks, cur.strag.lateBlocks)}</div>}
      {coarseTs(s) && <div className="cap">{X.tl_coarse}</div>}
    </Tile>
  );
}

function Tape({ s }: { s: State }) {
  const ex = safeExplorer(s.hello?.explorer);
  return (
    <Tile cls="tape" title={T.tape_title} sub={T.tape_sub} pulse={s.count ? s.tape[0]?.key.length : undefined}>
      <div className="trows">
        {s.tape.map((t) => (
          <div key={t.key} className={"tr num " + t.kind}>
            <span className="tk">{t.kind === "eval" ? `g${t.gen}·${t.idx}` : t.kind === "confirm" ? T.kind_confirm : T.kind_sealed}</span>
            <span className={"tv" + (t.status && t.status !== "success" ? " revert" : "")}>{t.kind === "eval" ? (t.status !== "success" ? (T.st[t.status ?? ""] ?? t.status) : T.op[t.op ?? 0]) : `g${t.gen}·${t.idx}`}</span>
            <span className="tn">{t.status === "success" || t.kind !== "eval" ? sgn(t.value, 0) : "-"}</span>
            <Lk href={ex ? `${ex}/tx/${t.hash}` : ""}>{short(t.hash)}</Lk>
          </div>
        ))}
        {!s.tape.length && <span className="cap">{T.tape_wait}</span>}
      </div>
    </Tile>
  );
}

function Champion({ s }: { s: State }) {
  const lastEnd = s.ends[Math.max(0, ...Object.keys(s.ends).map(Number))];
  const sealed = s.sealed;
  const c = sealed ? { dev: sealed.dev, confirm: sealed.confirm, idx: sealed.idx, gen: sealed.gen, params: lastEnd?.archive.find((a) => a.gen === sealed.gen && a.idx === sealed.idx)?.params ?? [] }
    : lastEnd ? (() => { const t = lastEnd.archive[0] ?? { ...lastEnd.best, gen: lastEnd.gen }; const cf = s.confirms[`${t.gen}:${t.idx}`]; return { dev: t.dev, confirm: cf?.score, idx: t.idx, gen: t.gen, params: t.params }; })() : undefined;
  const sv = sealed?.score;
  const scale = Math.max(1, c?.dev ?? 0, c?.confirm ?? 0, sv ?? 0);
  const w = (v: number | undefined) => (v === undefined ? 0 : Math.max(0, Math.min(1, v / scale)) * 100);
  const sealedCls = sv === undefined ? "" : sv > 0 ? " pass" : " overfit";
  let verdict = "";
  if (c && c.dev > 0) {
    if (sv !== undefined) verdict = sv > 0 ? T.kept_sealed(fmt((sv / c.dev) * 100)) : T.kept_sealed_neg;
    else if (c.confirm !== undefined) verdict = T.kept_confirm(fmt((c.confirm / c.dev) * 100));
  }
  return (
    <Tile cls="champ" title={T.champ_title} sub={c ? `${T.gen_word} ${c.gen} #${c.idx}` : T.champ_none}>
      <div className="trio">
        <div><div className="lbl">{T.dev}</div><div className="big num">{sgn(c?.dev, 0)}</div><div className="meter"><i style={{ width: w(c?.dev) + "%" }} /></div><div className="cap">{T.dev_note}</div></div>
        <div><div className="lbl">{T.confirm}</div><div className={"big num" + (c?.confirm === undefined ? " unseen" : "")}>{c?.confirm === undefined ? "n/a" : sgn(c.confirm, 0)}</div><div className="meter"><i style={{ width: w(c?.confirm) + "%" }} /></div><div className="cap">{c?.confirm === undefined ? X.proves_no_conf : T.confirm_note}</div></div>
        <div className={"sealedcol" + sealedCls}><div className="lbl">{T.sealed}</div><div className={"big num" + (sealed ? "" : " unseen")}>{sealed ? sgn(sv, 0) : T.unseen}</div><div className="meter"><i style={{ width: w(sv) + "%" }} /></div><div className="cap">{T.sealed_note}</div></div>
      </div>
      {verdict && <p className={"verdict" + sealedCls}>{verdict}</p>}
      {c && c.params.length > 0 && <div className="spec num">{T.spec} [ {c.params.join("  ")} ]</div>}
    </Tile>
  );
}

function Curve({ s }: { s: State }) {
  const gens = Object.keys(s.ends).map(Number).sort((a, b) => a - b);
  const N = s.hello?.config.generations ?? Math.max(10, gens.length);
  const best = gens.map((g) => ({ g, v: s.ends[g]!.best.dev }));
  const bg = Object.keys(s.baselines).map(Number).sort((a, b) => a - b);
  const b1 = bg.map((g) => ({ g, v: s.baselines[g]!.b1 }));
  const b2 = bg.map((g) => ({ g, v: s.baselines[g]!.b2 }));
  const all = [...best, ...b1, ...b2].map((p) => p.v);
  const lo = Math.min(0, ...all), hi = Math.max(1, ...all);
  const W = 600, H = 230, P = { l: 52, r: 16, t: 14, b: 30 };
  const x = (g: number) => P.l + ((g - s.base) / Math.max(1, N - 1)) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - ((v - lo) / (hi - lo)) * (H - P.t - P.b);
  const path = (a: { g: number; v: number }[]) => a.map((p, i) => `${i ? "L" : "M"}${x(p.g).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const last = best[best.length - 1], l1 = b1[b1.length - 1], l2 = b2[b2.length - 1];
  const behind = last && l1 && l2 && last.v < Math.max(l1.v, l2.v);
  return (
    <Tile cls="curve" title={T.curve_title} sub={T.curve_sub}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={T.curve_title}>
        {[0, 0.5, 1].map((f) => { const v = lo + (hi - lo) * f; return <g key={f}><line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="gl" /><text x={P.l - 8} y={y(v) + 5} textAnchor="end" className="ax">{fmt(v)}</text></g>; })}
        {Array.from({ length: N }, (_, i) => i + s.base).filter((g) => g === s.base || (g - s.base + 1) % 2 === 0).map((g) => <text key={g} x={x(g)} y={H - 9} textAnchor="middle" className="ax">{g - s.base + 1}</text>)}
        <path d={path(b2)} className="ln l2" /><path d={path(b1)} className="ln l1" /><path d={path(best)} className="ln lp" />
        {last && <circle cx={x(last.g)} cy={y(last.v)} r="5.5" className="cdot" />}
      </svg>
      <div className="key num">
        <span><i className="k kp" />{T.k_portfolio} {last ? sgn(last.v, 0) : ""}</span>
        <span><i className="k k1" />{T.k_r1} {l1 ? sgn(l1.v, 0) : ""}</span>
        <span><i className="k k2" />{T.k_r2} {l2 ? sgn(l2.v, 0) : ""}</span>
      </div>
      {behind && <p className="verdict overfit">{T.curve_behind}</p>}
    </Tile>
  );
}

const STY = ["reversion", "neutral", "momentum"] as const, ACT = ["low", "mid", "high"] as const;
function NicheMap({ s }: { s: State }) {
  const m = s.map;
  const devs = (m?.cells ?? []).map((c) => c.elite?.dev).filter((v): v is number => v !== undefined);
  const lo = Math.min(0, ...devs), hi = Math.max(1, ...devs);
  return (
    <Tile cls="niche" title={T.niche_title} sub={T.niche_sub}>
      <div className="nm">
        <span />{STY.map((x) => <span key={x} className="lbl ctr">{T.sty[x]}</span>)}
        {ACT.map((a) => (
          <React.Fragment key={a}>
            <span className="lbl">{T.act[a]}</span>
            {STY.map((st) => {
              const c = m?.cells.find((q) => q.style === st && q.activity === a);
              const idx = c?.elite ? stepIdx(c.elite.dev, lo, hi) : -1;
              return <div key={st} className={"nc " + (c?.elite ? "" : "empty")} style={c?.elite ? { background: SCALE[idx], color: idx >= 3 ? "#e1e1dc" : "#41423d" } : undefined}>
                <b className="num">{c?.elite ? sgn(c.elite.dev, 0) : T.empty}</b><small>{c ? (T.lab[c.label] ?? c.label) : ""}</small></div>;
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="cap ceil num">{m?.ceilingProxy ? T.ceiling(fmt(m.ceilingProxy.evals), sgn(m.ceilingProxy.dev, 0), sgn(m.ceilingProxy.confirm, 0), sgn(m.ceilingProxy.sealed, 0)) : T.ceiling_none}</div>
    </Tile>
  );
}

function Dumbbell({ s }: { s: State }) {
  const g = generalization(s);
  const rows = g.rows.slice(-10);
  const vals = rows.flatMap((r) => [r.dev, r.confirm, r.sealed]).filter((v): v is number => v !== undefined);
  const lo = Math.min(0, ...vals), hi = Math.max(1, ...vals);
  const W = 600, rh = 26, H = rows.length * rh + 34, L = 70, R = 20;
  const x = (v: number) => L + ((v - lo) / (hi - lo)) * (W - L - R);
  return (
    <Tile cls="gen" title={T.gen_title} sub={T.gen_sub}>
      {!rows.length ? (
        <div className="honest"><b>{T.gen_zero} · {X.proves_no_conf}</b><p>{s.count ? T.gen_zero_d(g.attempts, g.confirmed, s.errLog.filter((e) => e.scope === "confirm" && /revert/i.test(e.message)).length, s.errLog.filter((e) => e.scope === "confirm" && /\blost\b/i.test(e.message)).length) : T.gen_zero_wait}</p></div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={T.gen_title}>
            <line x1={x(0)} x2={x(0)} y1={6} y2={H - 26} className="gl" />
            {rows.map((r, i) => {
              const yy = 16 + i * rh; const pts = [r.dev, r.confirm, r.sealed].filter((v): v is number => v !== undefined);
              return <g key={r.gen + ":" + r.idx}>
                <text x={L - 8} y={yy + 4} textAnchor="end" className="ax">g{r.gen}#{r.idx}</text>
                <line x1={x(Math.min(...pts))} x2={x(Math.max(...pts))} y1={yy} y2={yy} className="dbl" />
                {r.dev !== undefined && <circle cx={x(r.dev)} cy={yy} r="6" className="pd" />}
                {r.confirm !== undefined && <circle cx={x(r.confirm)} cy={yy} r="6" className="pc" />}
                {r.sealed !== undefined && <rect x={x(r.sealed) - 6} y={yy - 6} width="12" height="12" className="ps" />}
              </g>;
            })}
            <text x={x(lo)} y={H - 6} className="ax" textAnchor="start">{fmt(lo)}</text><text x={x(hi)} y={H - 6} className="ax" textAnchor="end">{fmt(hi)}</text>
          </svg>
          <div className="key"><span><i className="k kd" />{T.gen_dev}</span><span><i className="k kc" />{T.gen_confirm}</span><span><i className="k ks" />{T.gen_sealed}</span></div>
        </>
      )}
    </Tile>
  );
}

function Operators({ s }: { s: State }) {
  const pg = planGens(s).slice(-10);
  const ops = opStats(s);
  const lastG = Object.keys(s.discBy).map(Number).sort((a, b) => a - b).pop();
  const disc = lastG !== undefined ? s.discBy[lastG]! : undefined;
  const mx = Math.max(0.01, ...Object.values(disc ?? {}));
  return (
    <Tile cls="ops" title={X.shares} sub={X.shares_sub}>
      <div className="shares">
        {pg.map((g) => <div key={g.gen} className="sh" title={`g${g.gen}: ${g.counts.join("/")}`}><div className="stack">{g.counts.map((c, i) => c ? <i key={i} style={{ height: `${(c / Math.max(1, g.total)) * 100}%`, background: OPC[i] }} /> : null)}</div><span className="num">{g.gen}</span></div>)}
        {!pg.length && <span className="cap">{T.port_none}</span>}
      </div>
      <div className="opl">
        {ops.map((o) => {
          const d = disc?.[["random", "mutate", "crossover", "sweep"][o.op]!];
          return <div key={o.op} className="op"><i className="k" style={{ background: OPC[o.op] }} /><span>{T.op[o.op]}</span>
            <span className="dbar"><i style={{ width: d === undefined ? 0 : `${(d / mx) * 100}%` }} /></span>
            <b className="num">{d === undefined ? "-" : fmt(d * 100, 1) + "%"}</b></div>;
        })}
      </div>
      <div className="cap">{T.port_disc}: {T.port_disc_d}{lastG !== undefined ? ` (${T.gen_word} ${lastG - s.base + 1})` : ""}</div>
    </Tile>
  );
}

function Judge({ s, model }: { s: State; model: string }) {
  const c = s.calib;
  const worse = c ? c.brier > c.brierBaseline : false;
  return (
    <Tile cls="judge" title={T.jev_title} sub={<span className={"tag" + (model === "jev" ? "" : " amber")}>{model === "jev" ? T.model_jev : model === "none" ? T.model_none : T.model_standin}</span>}>
      {model !== "jev" && <div className="cap">{X.cal_stand}</div>}
      {c ? <>
        <div className="cap">{T.authority[c.authority]}: {T.resolved(c.n, s.judges)}</div>
        <div className="brier">
          <span className="cap">{T.brier}</span><div className="bar2"><i style={{ width: `${Math.min(100, c.brier * 200)}%` }} /></div><b className="num">{fmt(c.brier, 3)}</b>
          <span className="cap">{T.brier_base}</span><div className="bar2"><i className="base" style={{ width: `${Math.min(100, c.brierBaseline * 200)}%` }} /></div><b className="num">{fmt(c.brierBaseline, 3)}</b>
        </div>
        <div className={"cap" + (worse ? " overfit" : "")}>{worse ? T.brier_worse : T.brier_better}</div>
      </> : <div className="cap">{T.jev_none}<br /><span className="num">{s.judges} {X.cal_n}</span></div>}
    </Tile>
  );
}

function Cost({ s }: { s: State }) {
  const c = cost(s);
  return (
    <Tile cls="cost" title={T.cost_title} sub={T.cost_sub}>
      {c.gasMon === undefined ? <div className="cap">{T.cost_none}</div> : <>
        <div className="two"><div><div className="lbl">{T.cost_gas}</div><div className="big num">{fmt(c.gasMon, 3)}</div></div>
          <div><div className="lbl">{X.mpe}</div><div className="big num">{fmt(c.perEval, 4)}</div></div></div>
        <div className="cap num">{T.cost_epm}: {fmt(c.evalsPerMon, 1)}</div>
        <div className="cap">{T.cost_n(c.evals ?? 0, c.reverted ?? 0, c.lost ?? 0)}</div>
        {c.gasUsed !== undefined && <div className="cap num">{T.cost_gasused(fmt(c.gasUsed))}</div>}
      </>}
    </Tile>
  );
}

function Health({ s }: { s: State }) {
  const h = health(s);
  const ms = (v: number | undefined) => (v === undefined ? "-" : fmt(v / 1000, 1));
  const items: [string, number, boolean][] = [[T.hl_sent, h.sent, false], [T.hl_ok, h.ok, false], [T.hl_rev, h.rev, h.rev > 0], [T.hl_lost, h.lost, h.lost > 0], [T.hl_pending, h.pending, false]];
  return (
    <Tile cls="health" title={T.hl_title} sub={T.hl_sub}>
      <div className="hl5">{items.map(([k, v, bad]) => <div key={k}><span className="lbl">{k}</span><b className={"num" + (bad ? " revert" : "")}>{fmt(v)}</b></div>)}</div>
      {h.median !== undefined && <div className="cap num">{T.hl_lat}: {T.hl_lat_v(ms(h.median), ms(h.p90), ms(h.max))}</div>}
      {h.rows.length === 0 ? <div className="cap">{T.hl_none}</div> : <>
        <div className="lbl">{T.hl_reasons}</div>
        <div className="reasons">
          {h.rows.slice(0, 6).map((r, i) => <div key={i} className="rr"><b className="num revert">{fmt(r.count)}</b><span className="lbl">{T.hl_scope_v[r.scope] ?? r.scope} · {T.hl_cls[r.cls]}</span><span className="cap num">{r.sample}</span></div>)}
        </div>
        <div className="cap">{T.hl_noreason}</div>
      </>}
    </Tile>
  );
}

function Proves({ s, kind, fixture }: { s: State; kind: string; fixture: boolean }) {
  const ls = lanes(s);
  const h = health(s); const g = generalization(s);
  const bs = bestSoFar(s);
  const blocks = new Set(Object.values(s.cands).map((c) => c.block).filter((b): b is number => b !== undefined)).size;
  const landed = Object.values(s.cands).filter((c) => c.status === "success" || c.status === "reverted").length;
  const bl = ls.filter((l) => l.burst).sort((a, b) => b.burst!.evals - a.burst!.evals)[0];
  const ex = safeExplorer(s.hello?.explorer);
  const host = ex ? new URL(ex).host : "-";
  const P: string[] = [], N: string[] = [];
  if (landed && bl?.burst) P.push(T.pf_p_par(landed, blocks, bl.gen - s.base + 1, bl.burst.evals, bl.burst.blocks));
  if (ex && !fixture && kind !== "demo") P.push(T.pf_p_links(host));
  if (bs.best && bs.b1 !== undefined && bs.b2 !== undefined) P.push(bs.best.dev > Math.max(bs.b1, bs.b2) ? T.pf_p_vs_a(fmt(bs.best.dev), fmt(bs.b2), fmt(bs.b1)) : T.pf_p_vs_b(fmt(bs.best.dev), fmt(bs.b2), fmt(bs.b1)));
  if (h.failedTotal) P.push(T.pf_p_fail(h.failedTotal));
  if (s.sealed) N.push(T.pf_n_gen_sealed(fmt(s.sealed.score), fmt(s.sealed.dev)));
  else if (g.confirmed) N.push(T.pf_n_gen_conf(g.confirmed));
  else N.push(T.pf_n_gen_none(g.attempts));
  N.push(T.pf_n_money, T.pf_n_bandit);
  if (bs.seeds) N.push(T.pf_n_seed(bs.seeds));
  const late = ls.filter((l) => l.strag.blocks > 0);
  if (late.length) { const w = late.sort((a, b) => b.strag.lateBlocks - a.strag.lateBlocks)[0]!; N.push(T.pf_n_strag(late.length, w.gen - s.base + 1, w.strag.lateBlocks)); }
  if (coarseTs(s)) N.push(T.pf_n_ts);
  if (fixture) N.push(T.pf_n_fixture);
  if (kind === "demo") N.push(T.pf_n_demo);
  return (
    <Tile cls="proves" title={T.pf_title}>
      <div className="pn">
        <div><div className="lbl pass">{T.pf_proves}</div><ul>{P.map((x, i) => <li key={i}>{x}</li>)}{!P.length && <li className="cap">-</li>}</ul></div>
        <div><div className="lbl overfit">{T.pf_not}</div><ul>{N.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
      </div>
    </Tile>
  );
}

let S: SD = SDICT.en;

function Sec({ id, n, h, q, children }: { id: string; n?: number; h: string; q?: string; children: React.ReactNode }) {
  return (
    <section className="sec" id={id} aria-labelledby={id + "-h"}>
      <div className="sec-in">
        <header className="sh">{n !== undefined && <span className="mono sn">{String(n).padStart(2, "0")}</span>}<h2 id={id + "-h"}>{h}</h2>{q && <p className="q">{q}</p>}</header>
        {children}
      </div>
    </section>
  );
}

const IC = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
function Icon({ i }: { i: number }) {
  return (
    <svg viewBox="0 0 96 64" className="ic" aria-hidden="true" {...IC}>
      {i === 0 && <g>{[14, 30, 46, 62, 78].map((x, k) => <circle key={x} cx={x} cy={k % 2 ? 22 : 38} r="5" />)}<path d="M14 54h68" opacity=".4" /></g>}
      {i === 1 && <g><rect x="34" y="14" width="28" height="36" rx="3" /><path d="M42 26h12M42 34h12M42 42h6" /><path d="M6 32h20m-6-6l6 6-6 6M70 32h20m-6-6l6 6-6 6" /></g>}
      {i === 2 && <g>{[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={r * 3 + c} x={20 + c * 20} y={8 + r * 16} width="14" height="11" rx="2" opacity={r === 1 && c === 1 ? 1 : .35} />))}<path d="M43 38l3 3 7-7" /></g>}
      {i === 3 && <g><path d="M8 48c14-4 20-26 32-24s16 14 24 6" opacity=".5" /><path d="M52 40c8 2 14-6 20-14s10-6 16-4" strokeDasharray="4 5" /><circle cx="52" cy="40" r="3.5" /></g>}
    </svg>
  );
}

function StatusRow({ s, badge, bad }: { s: State; badge: string; bad: boolean }) {
  const t = s.totals; const N = s.hello?.config.generations;
  const landed = Object.values(s.cands).filter((c) => c.status).length;
  const rev = t?.reverted ?? Object.values(s.cands).filter((c) => c.status === "reverted").length;
  const lost = t?.lost ?? Object.values(s.cands).filter((c) => c.status === "lost").length;
  const items: [string, React.ReactNode][] = [
    [S.st_block, s.block ? fmt(s.block) : "-"],
    [S.st_gen, s.count ? `${s.gen - s.base + 1} / ${N ?? "?"}` : "-"],
    [S.st_evals, fmt(t?.evals ?? landed)],
    [S.st_bad, `${fmt(rev)} / ${fmt(lost)}`],
    [S.st_gas, fmt(t?.gasMon ?? 0, 3)],
  ];
  return (
    <div className="status" role="status">
      <dl>{items.map(([k, v]) => <div key={k}><dt className="mono">{k}</dt><dd className="mono">{v}</dd></div>)}</dl>
      <p className={"badge mono" + (bad ? " warn" : "")}><i className="dot" />{badge}</p>
    </div>
  );
}

function Bars({ s }: { s: State }) {
  const ge = s.ends[s.gen];
  const h = ge ? ge.blocks.histogram : s.liveHist;
  const keys = Object.keys(h).map(Number).sort((a, b) => a - b);
  const mx = Math.max(1, ...keys.map((k) => h[k] ?? 0));
  if (!keys.length) return <p className="muted">{S.run_wait}</p>;
  return (
    <div className="bars" role="img" aria-label={T.blocks_title}>
      {keys.map((k) => (
        <div key={k} className="bcol"><span className="mono bv">{fmt(h[k])}</span><div className="bt"><i style={{ height: `${((h[k] ?? 0) / mx) * 100}%` }} /></div><span className="mono bl">{String(k).slice(-3)}</span></div>
      ))}
    </div>
  );
}

function RunBlock({ s }: { s: State }) {
  const t = s.totals;
  const landed = Object.values(s.cands).filter((c) => c.status === "success" || c.status === "reverted").length;
  const blocks = new Set(Object.values(s.cands).map((c) => c.block).filter((b): b is number => b !== undefined)).size;
  return (
    <>
      <div className="big3">
        <div><b className="mono num">{fmt(t?.evals ?? landed)}</b><span>{S.n_evals}</span></div>
        <div><b className="mono num">{fmt(blocks)}</b><span>{S.n_blocks}</span></div>
        <div><b className="mono num">{fmt(t?.gasMon ?? 0, 3)}</b><span>{S.n_gas}</span></div>
      </div>
      <Bars s={s} />
      <p className="cap2">{S.run_sentence(s.gen - s.base + 1)}</p>
    </>
  );
}

function Verdict({ s }: { s: State }) {
  const bs = bestSoFar(s);
  let v = S.v_wait, ok: boolean | undefined;
  if (bs.best && bs.b1 !== undefined && bs.b2 !== undefined) {
    ok = bs.best.dev > Math.max(bs.b1, bs.b2);
    v = (ok ? S.v_beat : S.v_not)(fmt(bs.best.dev), fmt(bs.b2), fmt(bs.b1));
  }
  return <p className={"verdict" + (ok === false ? " warn" : "")}>{v}</p>;
}

function GenBlock({ s }: { s: State }) {
  const g = generalization(s);
  const none = g.rows.length === 0 && s.sealedAll.length === 0;
  const rev = s.errLog.filter((e) => e.scope === "confirm" && /revert/i.test(e.message)).length;
  const lost = s.errLog.filter((e) => e.scope === "confirm" && /\blost\b/i.test(e.message)).length;
  return (
    <>
      <div className="bare"><Champion s={s} /></div>
      {none && <p className="verdict warn">{s.count && s.ends[s.gen] || Object.keys(s.ends).length ? S.g_none(g.attempts, g.confirmed, rev, lost) : S.g_wait}</p>}
    </>
  );
}

function Wrong({ s }: { s: State }) {
  const h = health(s);
  const items: [string, number][] = [[S.w_rev, h.rev], [S.w_lost, h.lost], [S.w_conf, h.confirmRev + h.confirmLost]];
  return (
    <>
      <div className="big3 small">{items.map(([k, v]) => <div key={k}><b className={"mono num" + (v ? " revert" : "")}>{fmt(v)}</b><span>{k}</span></div>)}</div>
      {h.rows.length === 0 ? <p className="muted">{S.w_none}</p> : (
        <div className="reasons2">
          <h3 className="mono lab">{S.w_reasons}</h3>
          <ul>{h.rows.slice(0, 5).map((r, i) => <li key={i}><b className="mono num revert">{fmt(r.count)}</b><span className="mono lab2">{T.hl_scope_v[r.scope] ?? r.scope} · {T.hl_cls[r.cls]}</span><span className="mono small">{r.sample}</span></li>)}</ul>
          <p className="muted">{S.w_noreason}</p>
        </div>
      )}
    </>
  );
}

function Controls({ player, paused, speed, setSpeed, begin, force }: { player: ReturnType<typeof pickSource>; paused: boolean; speed: number; setSpeed: (x: number) => void; begin: () => void; force: React.Dispatch<React.SetStateAction<number>> }) {
  if (!player.setSpeed) return null;
  return (
    <div className="ctl" role="group" aria-label={S.ctrl}>
      <button className="pp" onClick={() => { player.togglePause?.(); force((n) => n + 1); }}>{paused ? X.resume : X.pause}</button>
      {[1, 4, 16].map((x) => <button key={x} className={x === speed ? "on" : ""} aria-pressed={x === speed} onClick={() => setSpeed(x)}>{x}x</button>)}
      <button onClick={() => { player.stepGen?.(-1); force((n) => n + 1); }} aria-label={T.prev_gen}>{X.prev}</button>
      <button onClick={() => { player.stepGen?.(1); force((n) => n + 1); }} aria-label={T.next_gen}>{X.next}</button>
      <button onClick={begin}>{T.restart}</button>
    </div>
  );
}

function App() {
  const player = useMemo(() => pickSource(), []);
  const [lang, setLang] = useState<Lang>(pickLang);
  T = DICT[lang]; X = LX[lang]; S = SDICT[lang];
  const [s, dispatch] = useReducer(reduce, undefined, init);
  const [status, setStatus] = useState("starting");
  const [speed, setSpeedS] = useState(1);
  const [, force] = useState(0);
  const stop = useRef<(() => void) | undefined>();
  const begin = () => { stop.current?.(); dispatch({ type: "__reset" }); stop.current = player.start(dispatch, setStatus); };
  useEffect(() => { begin(); return () => stop.current?.(); }, []);
  useEffect(() => { document.documentElement.lang = lang === "zh" ? "zh-CN" : "en"; }, [lang]);
  const setSpeed = (x: number) => { setSpeedS(x); player.setSpeed?.(x); };
  useEffect(() => {
    const f = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const t = ev.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SUMMARY)$/.test(t.tagName) && ev.key === " ") return;
      const k = ev.key;
      if (k === " ") { ev.preventDefault(); player.togglePause?.(); force((n) => n + 1); }
      else if (k === "1") setSpeed(1); else if (k === "4") setSpeed(4); else if (k === "6") setSpeed(16);
      else if (k === "ArrowRight") { player.stepGen?.(1); force((n) => n + 1); }
      else if (k === "ArrowLeft") { player.stepGen?.(-1); force((n) => n + 1); }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [player]);
  const switchLang = (l: Lang) => {
    setLang(l);
    try { const u = new URL(location.href); u.searchParams.set("lang", l); history.replaceState(null, "", u); } catch { /* ignore */ }
  };
  const h = s.hello;
  const model = s.judgeModel ?? h?.model ?? "none";
  const down = status === "reconnecting";
  const fixture = !!h && /invalid|synthetic/i.test(h.explorer ?? "");
  const k = player.kind;
  const badge = k === "replay" ? (fixture ? S.badge_fixture : S.badge(String(h?.chainId ?? "?"))) : k === "live" ? S.badge_live : S.badge_demo;
  const paused = player.isPaused?.() ?? false;
  const judgeLine = model === "jev" ? S.judge_model("jev") : model === "none" ? S.judge_none : S.judge_standin;
  const lastGen = s.gen - s.base + 1;
  return (
    <div className={"story " + lang}>
      <nav className="navbar"><span className="word">{S.wordmark}</span>
        <div className="seg" role="group" aria-label={T.language}>
          {(["en", "zh"] as Lang[]).map((l) => <button key={l} className={l === lang ? "on" : ""} aria-pressed={l === lang} onClick={() => switchLang(l)}>{l === "en" ? "EN" : "中文"}</button>)}
        </div>
      </nav>
      {down && <div className="banner">{T.banner_down}</div>}
      <section className="hero2">
        <div className="hero-in">
          <h1>{S.hero_line}</h1>
          <StatusRow s={s} badge={badge} bad={fixture || k === "demo"} />
          <div className="plate-wrap"><div className="bare calm"><Plate s={s} /></div><p className="cap2">{S.plate_cap}</p></div>
          <Controls player={player} paused={paused} speed={speed} setSpeed={setSpeed} begin={begin} force={force} />
        </div>
      </section>

      <Sec id="how" n={1} h={S.how_h} q={S.how_q}>
        <ol className="steps">{S.steps.map((st, i) => (
          <li key={i}><Icon i={i} /><span className="mono sn2">{i + 1}</span><h3>{st.t}</h3><p>{st.d}</p></li>
        ))}</ol>
        <p className="mono lab ill">{S.illus}</p>
      </Sec>

      <Sec id="run" n={2} h={S.run_h} q={S.run_q}><RunBlock s={s} /></Sec>
      <Sec id="work" n={3} h={S.work_h} q={S.work_q}><div className="bare chartbox"><Curve s={s} /></div><Verdict s={s} /></Sec>
      <Sec id="gen" n={4} h={S.gen_h} q={S.gen_q}><GenBlock s={s} /></Sec>
      <Sec id="wrong" n={5} h={S.wrong_h} q={S.wrong_q}><Wrong s={s} /></Sec>

      <Sec id="more" n={6} h={S.more_h} q={S.more_q}>
        <details className="more">
          <summary>{S.more_hint}</summary>
          <div className="more-grid">
            <NicheMap s={s} /><Operators s={s} /><Tape s={s} /><Cost s={s} /><Judge s={s} model={model} /><Timeline s={s} />
          </div>
        </details>
      </Sec>

      <Sec id="read" n={7} h={S.read_h}>
        <ul className="plain">{S.read.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <h3 className="h3b">{S.proves_h}</h3>
        <div className="bare"><Proves s={s} kind={k} fixture={fixture} /></div>
        <h3 className="h3b">{S.faq_h}</h3>
        <div className="faq">{S.faq.map((f, i) => (
          <details key={i}><summary>{f.q}</summary><p>{f.a}{i === 3 ? " " + judgeLine : ""}</p></details>
        ))}</div>
      </Sec>

      <footer className="foot">
        <p>{S.disc}</p>
        <p>{T.foot} {k === "demo" ? T.foot_demo : ""} {fixture ? T.foot_fixture : ""}</p>
        <p className="mono small">{X.stat_hint}{player.total ? " · " + T.progress(player.pos?.() ?? 0, player.total) : ""}{s.count ? ` · ${T.gen_word} ${lastGen}` : ""}</p>
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
