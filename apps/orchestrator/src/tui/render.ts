// Pure frame rendering: ViewState -> lines. No clock, no terminal access, so a frame is a string you can snapshot.
// Five pages (number keys) and a help page. One accent colour; bold is kept for the numbers that matter.
import { clip, makeStyle, padL, padR, vlen, type Style, type TermEnv } from "./ansi";
import { blockRows, blockStats, generalization, latencyPct, shares } from "./derive";
import { championView, explorerTx, OP_KEYS, signed, type CellState, type ViewState } from "./state";
import { columns, fit, G_ASC, G_UNI, hbar, int, table, title, trimNum, type Col, type Glyphs } from "./ui";

export type Page = 1 | 2 | 3 | 4 | 5 | "help";
export const PAGES: { key: Page; name: string }[] = [
  { key: 1, name: "overview" }, { key: 2, name: "blocks" }, { key: 3, name: "generalisation" }, { key: 4, name: "operators" }, { key: 5, name: "cost & health" },
];

export interface RenderOpts extends TermEnv {
  width: number;
  height: number;
  /** which page; default 1 */
  page?: Page;
  /** the source is a recording: the badge says REPLAY whatever mode the recording was made in */
  replay?: boolean;
  /** right side of the footer, e.g. "event 1523/4225  x16" */
  status?: string;
  /** keys to show in the footer; the source decides which exist */
  keys?: string;
}

const STYLES = ["reversion", "neutral", "momentum"] as const;
const ACTIVITIES = ["low", "mid", "high"] as const;
const NICHE_LABEL = { young: "young", leader: "leader", riser: "riser", stalled: "stalled" } as const;
const OP_NAMES = ["random", "mutate", "crossover", "sweep"] as const;

function cellGlyph(st: Style, g: Glyphs, c: CellState, dev: number | undefined, maxDev: number): string {
  switch (c) {
    case 0: return st.dim(g.q);
    case 1: return g.sent;
    case 3: return g.rev;
    case 4: return g.lost;
    default: {
      if (dev === undefined || dev <= 0 || maxDev <= 0) return st.dim(g.lv[0]);
      const r = dev / maxDev;
      return r <= 0.34 ? g.lv[1] : r <= 0.67 ? g.lv[2] : st.acc(g.lv[3]);
    }
  }
}

function badge(st: Style, color: boolean, text: string, hot = false): string {
  return color ? (hot ? st.hot(st.inv(` ${text} `)) : st.inv(` ${text} `)) : `[${text}]`;
}

/** The full URL when it fits; else host + /tx/ + as much of the hash as fits (the terminal link, when enabled, still carries the whole URL). */
export function fitUrl(url: string, hash: string, room: number, ell: string): string {
  if (url.length <= room) return url;
  let prefix = url.replace(/^https?:\/\//, "").replace(/\/tx\/.*$/, "");
  if (prefix.length > room - 24) prefix = prefix.split("/")[0]!;
  const keep = Math.max(6, room - prefix.length - 4 - 1 - 4);
  return `${prefix}/tx/${hash.slice(0, Math.min(keep, 66))}${ell}${hash.slice(-4)}`;
}

export function wrap(text: string, w: number): string[] {
  const out: string[] = []; let cur = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (cur && vlen(cur) + 1 + vlen(word) > w) { out.push(cur); cur = word; } else cur = cur ? cur + " " + word : word;
  }
  if (cur) out.push(cur);
  return out;
}

/** What the numbers allow us to say about the run, in one or two plain sentences. Pure; one branch per state of the evidence. */
export function verdictOf(s: ViewState): string {
  const c = championView(s);
  const planned = s.hello?.config.generations, done = s.gensDone.length;
  if (!s.hello && !s.events) return "Waiting for the first event.";
  if (!c) {
    return s.bestDev
      ? `Searching: best dev score so far is ${signed(s.bestDev.dev)} bp. Nothing is confirmed yet, so this is a selected number, not a result.`
      : "Searching: no generation has finished yet, so there is no score to judge.";
  }
  if (!s.sealed) {
    return `Best confirm so far ${signed(c.confirm)} bp (dev ${signed(c.dev)}). The sealed look has not been spent, so nothing here is out-of-sample yet${planned && done < planned ? `; ${done} of ${planned} generations done` : ""}.`;
  }
  const sc = s.sealed.score, dev = s.sealed.dev;
  const kept = dev > 0 ? Math.round((Math.max(0, sc) / dev) * 100) : null;
  const head = sc > 0
    ? `Held up on the sealed look: ${signed(sc)} bp after dev ${signed(dev)}${kept !== null ? `, about ${kept}% of the dev score survived` : ""}.`
    : `Did not hold on the sealed look: ${signed(sc)} bp after dev ${signed(dev)}. The search fitted the dev window.`;
  return `${head} One seed, testnet, ${s.sealed.trades} trades: a lead worth testing, not a proven edge.`;
}

function header(s: ViewState, st: Style, g: Glyphs, o: RenderOpts, cw: number): string {
  const mode = o.replay ? "replay" : (s.hello?.mode ?? null);
  const left = [
    st.bold("BLOCKWISE"),
    mode ? badge(st, o.color, mode.toUpperCase(), mode === "live") : badge(st, o.color, "WAITING"),
    s.hello?.model === "stand-in" ? st.dim("stand-in judge") : "",
  ].filter(Boolean).join("  ");
  const total = s.hello?.config.generations, done = s.gensDone.length;
  const parts = [
    s.gen !== null ? `gen ${s.gen}` : "",
    total ? `${done} of ${total} done` : done ? `${done} done` : "",
    s.block !== null ? `block ${s.block}` : "",
  ].filter(Boolean);
  const sep = `  ${st.dim(g.sep)}  `;
  while (parts.length > 1 && vlen(left) + 2 + vlen(parts.join(sep)) > cw) parts.pop();
  const right = parts.join(sep);
  return left + " ".repeat(Math.max(2, cw - vlen(left) - vlen(right))) + right;
}

function tabs(st: Style, page: Page, cw: number): string {
  const long = PAGES.map((p) => ({ p, label: `${p.key} ${p.name}` }));
  const total = long.reduce((a, x) => a + x.label.length + 2, 0) + 2;
  const help = page === "help" ? st.acc("[? help]") : st.dim(" ? help ");
  const room = cw - 9;
  if (total <= room) return long.map(({ p, label }) => (p.key === page ? st.acc(`[${label}]`) : st.dim(` ${label} `))).join("") + " ".repeat(Math.max(1, room - total + 2)) + help;
  return PAGES.map((p) => (p.key === page ? st.acc(`[${p.key} ${p.name}]`) : st.dim(` ${p.key} `))).join("") + " " + (page === "help" ? st.acc("[?]") : st.dim(" ? "));
}

// ---------- page 1: overview ----------

function counters(s: ViewState, st: Style, cw: number): string[] {
  const t = s.totalsEvent;
  const items: [string, string][] = [
    [int(s.landed), "evals landed"],
    [t ? int(t.blocksSpanned) : "-", "blocks spanned"],
    [t ? t.gasMon.toFixed(2) + " MON" : "-", "gas, test MON"],
  ];
  const colw = Math.floor((cw - 2) / 3);
  if (colw < 18) { items[0]![1] = "evals"; items[1]![1] = "blocks"; items[2]![1] = "gas, MON"; if (t) items[2]![0] = t.gasMon.toFixed(2); }
  return [
    "  " + items.map(([v]) => padR(st.bold(v), colw)).join("").replace(/\s+$/, ""),
    "  " + items.map(([, l]) => padR(st.dim(l), colw)).join("").replace(/\s+$/, ""),
  ];
}

function championBlock(s: ViewState, st: Style, g: Glyphs, cw: number): string[] {
  const c = championView(s);
  const out = [title(st, "CHAMPION", c ? `gen ${c.gen}, candidate ${c.idx}${s.sealed ? "" : st.dim("  best confirm so far")}` : st.dim("no confirm yet"))];
  const vals = [c?.dev, c?.confirm, s.sealed?.score].filter((x): x is number => x !== undefined);
  const scale = Math.max(1, ...vals.map(Math.abs));
  const note = cw >= 72 ? 22 : 0;
  const barW = Math.max(6, Math.min(36, cw - 2 - 9 - 6 - 2 - 1 - note));
  const row = (label: string, v: number | undefined, why: string, hot = false) => {
    const num = v === undefined ? st.dim(padL(label === "sealed" ? "unopened" : "-", 8)) : (hot ? st.hot(padL(signed(v), 8)) : st.bold(padL(signed(v), 8)));
    const bar = v === undefined ? "" : v >= 0 ? st.acc(hbar(g, v / scale, barW)) : st.dim(hbar(g, -v / scale, barW));
    return `  ${padR(st.dim(label), 9)}${num}  ${padR(bar, barW)}${note ? " " + st.dim(why) : ""}`.replace(/\s+$/, "");
  };
  out.push(row("dev", c?.dev, "searched on"));
  out.push(row("confirm", c?.confirm, "held-out, by chain"));
  out.push(row("sealed", s.sealed?.score, s.sealed ? "opened once" : "one look, unspent", true));
  if (s.baseline) out.push(...wrap(`random search, ${s.baseline.seeds} seeds: best ${signed(s.baseline.bestRandom1x)} at 1x, ${signed(s.baseline.bestRandom2xMedian)} at 2x budget (dev scale)`, cw - 2).map((l) => st.dim("  " + l)));
  return out;
}

function populationBlock(s: ViewState, st: Style, g: Glyphs, cw: number): string[] {
  const planned = s.cells.length, landed = s.cells.filter((c) => c >= 2).length;
  const out = [title(st, "THIS GENERATION", planned ? `gen ${s.gen}: ${landed} of ${planned} landed${s.maxDev > 0 && cw >= 64 ? st.dim(`  best dev ${signed(s.maxDev)}`) : ""}` : st.dim("waiting for the first generation"))];
  if (!planned) return out;
  const per = cw >= 64 ? 50 : 30;
  for (let r = 0; r * per < planned; r++) {
    let line = "  ";
    for (let i = r * per; i < Math.min(planned, (r + 1) * per); i++) { if (i > r * per && (i - r * per) % 10 === 0) line += " "; line += cellGlyph(st, g, s.cells[i]!, s.cellDev[i], s.maxDev); }
    out.push(line);
  }
  out.push(...wrap(`${g.q} queued  ${g.sent} sent  ${g.lv.join("")} landed, by dev  ${g.rev} reverted  ${g.lost} lost`, cw - 2).map((l) => st.dim("  " + l)));
  return out;
}

function overview(s: ViewState, st: Style, g: Glyphs, cw: number): string[] {
  const out: string[] = [""];
  out.push(...counters(s, st, cw), "", ...championBlock(s, st, g, cw), "");
  out.push(title(st, "VERDICT"), ...wrap(verdictOf(s), cw - 2).map((l) => "  " + l), "");
  out.push(...populationBlock(s, st, g, cw));
  return out;
}

// ---------- page 2: blocks ----------

function tapeBlock(s: ViewState, st: Style, g: Glyphs, o: RenderOpts, width: number, rows: number): string[] {
  const out = [title(st, "LATEST TRANSACTIONS", st.dim(s.hello?.explorer ? "explorer links" : ""))];
  const lines = s.tape.slice(-rows);
  if (!lines.length) out.push(st.dim("  none yet"));
  for (const l of lines) {
    if (l.kind === "error") { out.push(clip(`  ${st.dim("error")}  ${l.message}`, width)); continue; }
    let head: string;
    if (l.kind === "landed") {
      const status = l.status === "success" ? "ok" : l.status === "reverted" ? "reverted" : "lost";
      head = `${padL(String(l.block ?? "-"), 9)}  ${padR(`${l.gen}:${l.idx}`, 7)}${padL(signed(l.dev), 6)}  ${padL(l.latencyMs !== undefined ? (l.latencyMs / 1000).toFixed(1) + " s" : "-", 6)}  ${padR(status, 8)}`;
    } else {
      const tag = l.kind === "sealed" ? st.hot("sealed") : st.acc("confirm");
      head = `${padL(tag, 9)}  ${padR(`${l.gen}:${l.idx}`, 7)}${padL(signed(l.score), 6)}  ${padL(`${l.trades ?? "-"} tr`, 6)}  ${padR("", 8)}`;
    }
    const url = l.txHash ? explorerTx(s, l.txHash) : "";
    const room = width - 2 - vlen(head) - 2;
    let tail = "";
    if (url && room >= 20) { const text = fitUrl(url, l.txHash!, room, g.ell); tail = o.links && text !== url ? st.link(text, url) : text; }
    out.push(clip(`  ${head}  ${tail}`, width).replace(/\s+$/, ""));
  }
  return out;
}

function blocksPage(s: ViewState, st: Style, g: Glyphs, o: RenderOpts, cw: number, h: number): string[] {
  const bs = blockStats(s), all = blockRows(s).filter((r) => r.evals > 0);
  const stats = [`${int(all.length)} blocks carried evaluations`, bs.median !== null ? `median ${trimNum(bs.median)} per block, most ${bs.max}` : "", bs.intervalMs !== null ? `about ${(bs.intervalMs / 1000).toFixed(2)} s per block` : ""].filter(Boolean);
  const out = ["", title(st, "BLOCKS", stats.join(st.dim("  " + g.sep + "  "))), ""];
  const tapeRows = h >= 26 ? 4 : h >= 20 ? 2 : 0;
  const tapeH = tapeRows ? tapeRows + 2 : 0;
  const nrows = Math.max(3, h - out.length - 2 - tapeH - 1);
  const shown = all.slice(-nrows);
  const max = Math.max(1, ...shown.map((r) => r.evals));
  const cols: Col[] = [
    { key: "block", title: "block", w: 9, prio: 0 }, { key: "gen", title: "gen", w: 4, align: "r", prio: 2 },
    { key: "bar", title: "evaluations", w: 10, flex: true, minFlex: 10, maxFlex: 40, prio: 1 },
    { key: "n", title: "evals", w: 6, align: "r", prio: 0 }, { key: "rev", title: "rev", w: 4, align: "r", prio: 3 }, { key: "gap", title: "jump", w: 5, align: "r", prio: 4 },
  ];
  const t = table(cols, shown.map((r) => ({
    block: String(r.block), gen: String(r.gen), n: String(r.evals), rev: r.reverted ? String(r.reverted) : st.dim("0"), gap: r.dBlk !== undefined && r.dBlk > 1 ? `+${r.dBlk}` : st.dim("-"),
    bar: (w: number) => st.acc(hbar(g, r.evals / max, w)),
  })), cw - 2, st);
  out.push("  " + t.head, ...t.rows.map((r) => "  " + r));
  if (all.length > shown.length) out.push(st.dim(`  ${g.up} ${all.length - shown.length} earlier blocks`));
  if (tapeRows) { while (out.length < h - 2 - tapeH) out.push(""); out.push(...tapeBlock(s, st, g, o, cw, tapeRows)); }
  return out;
}

// ---------- page 3: generalisation ----------

function generalisationPage(s: ViewState, st: Style, g: Glyphs, cw: number, h: number): string[] {
  const gz = generalization(s);
  const out = [""];
  if (!gz.n) return [...out, title(st, "GENERALISATION", st.dim("no candidate has been confirmed yet")), "", ...wrap("A candidate is searched on the dev window, re-scored once on the confirm window, and only the champion is scored on the sealed window. This page fills in as confirms land.", cw - 2).map((l) => "  " + st.dim(l))];
  const sum = [`${gz.n} confirmed`, gz.medianGap !== null ? `median gap ${signed(gz.medianGap)}` : "", `${gz.positive} of ${gz.n} stayed above zero`, gz.rho !== null ? `rank correlation ${gz.rho.toFixed(2)}` : ""].filter(Boolean);
  out.push(title(st, "DEV -> CONFIRM -> SEALED"), ...wrap(sum.join("  " + g.sep + "  "), cw - 2).map((l) => "  " + st.dim(l)), "");
  const rows = [...gz.rows].sort((a, b) => b.confirm! - a.confirm! || a.gen - b.gen || a.idx - b.idx);
  const nrows = Math.max(3, h - out.length - 2 - 5);
  const shown = rows.slice(0, nrows);
  const cols: Col[] = [
    { key: "c", title: "candidate", w: 9, prio: 0 }, { key: "dev", title: "dev", w: 7, align: "r", prio: 0 }, { key: "conf", title: "confirm", w: 7, align: "r", prio: 0 },
    { key: "seal", title: "sealed", w: 7, align: "r", prio: 1 }, { key: "gap", title: "gap", w: 7, align: "r", prio: 2 },
    { key: "bar", title: "dev kept at confirm", w: 12, flex: true, minFlex: 12, maxFlex: 36, prio: 3 },
  ];
  const t = table(cols, shown.map((c) => {
    const kept = c.dev! > 0 ? Math.max(0, c.confirm!) / c.dev! : 0;
    return {
      c: `${c.gen}:${c.idx}`, dev: signed(c.dev), conf: c.confirm! > 0 ? st.bold(signed(c.confirm)) : signed(c.confirm),
      seal: c.sealed !== undefined ? st.hot(signed(c.sealed)) : st.dim("-"), gap: signed(c.confirm! - c.dev!),
      bar: (w: number) => (kept > 0 ? st.acc(hbar(g, kept, w)) : st.dim(g.q.repeat(1))) + (kept > 0 ? "" : ""),
    };
  }), cw - 2, st);
  out.push("  " + t.head, ...t.rows.map((r) => "  " + r));
  if (rows.length > shown.length) out.push(st.dim(`  ${rows.length - shown.length} more not shown`));
  out.push("");
  out.push(...wrap("gap is confirm minus dev: how much of the searched score is lost on data the search never saw. A full bar means all of it survived; an empty bar means it vanished or turned negative.", cw - 2).map((l) => "  " + st.dim(l)));
  return out;
}

// ---------- page 4: operators ----------

function operatorsPage(s: ViewState, st: Style, g: Glyphs, cw: number): string[] {
  const share = shares(s.bandit, OP_KEYS);
  const out = ["", title(st, "OPERATORS", st.dim("who proposes candidates, and whether they beat their parent")), ""];
  const cols: Col[] = [
    { key: "op", title: "operator", w: 10, prio: 0 }, { key: "sent", title: "sent", w: 6, align: "r", prio: 1 }, { key: "ok", title: "landed", w: 7, align: "r", prio: 2 },
    { key: "mean", title: "mean dev", w: 8, align: "r", prio: 1 }, { key: "best", title: "best", w: 7, align: "r", prio: 0 },
    { key: "beat", title: "beat parent", w: 11, align: "r", prio: 3 }, { key: "share", title: "next share", w: 10, align: "r", prio: 2 },
  ];
  const t = table(cols, OP_NAMES.map((name, i) => {
    const o = s.operators[i]!;
    return {
      op: name, sent: int(o.sent), ok: int(o.ok), mean: o.ok ? signed(Math.round(o.devSum / o.ok)) : "-", best: signed(o.best),
      beat: o.withParent ? `${Math.round((o.improved / o.withParent) * 100)}%` : "-", share: share[i] === null ? "-" : `${Math.round(share[i]! * 100)}%`,
    };
  }), cw - 2, st);
  out.push("  " + t.head, ...t.rows.map((r) => "  " + r), "");
  const map = s.map;
  out.push(title(st, "NICHE MAP", map ? st.dim(`gen ${map.gen}: dev of each niche's best, and its status`) : st.dim("no map event yet")));
  if (map) {
    out.push("  " + padR("", 11) + ACTIVITIES.map((a) => padR(st.dim(a + " activity"), 18)).join("").replace(/\s+$/, ""));
    for (const style of STYLES) {
      let line = "  " + st.dim(padR(style, 11));
      for (const act of ACTIVITIES) {
        const cell = map.cells.find((c) => c.style === style && c.activity === act);
        line += !cell?.elite ? st.dim(padR(g.q, 18)) : padR(`${padL(signed(cell.elite.dev), 5)}  ${st.dim(NICHE_LABEL[cell.label])}`, 18 + (vlen(st.dim("x")) - 1));
      }
      out.push(line.replace(/\s+$/, ""));
    }
  }
  return out;
}

// ---------- page 5: cost & health ----------

function kv(st: Style, label: string, value: string, note = "", lw = 20, vw = 12): string {
  return `  ${padR(st.dim(label), lw)}${padL(value, vw)}${note ? "   " + st.dim(note) : ""}`.replace(/\s+$/, "");
}

function costHealthPage(s: ViewState, st: Style, g: Glyphs, cw: number): string[] {
  const t = s.totalsEvent, bs = blockStats(s);
  const p50 = latencyPct(s, 0.5), p90 = latencyPct(s, 0.9);
  const groups = [...s.errorGroups.values()];
  const cf = (re: RegExp) => groups.filter((x) => x.scope === "confirm" && re.test(x.pattern)).reduce((a, x) => a + x.count, 0);
  const cRev = cf(/reverted/), cLost = cf(/lost/), cOk = s.cands.size ? [...s.cands.values()].filter((c) => c.confirm !== undefined).length : 0;
  const cTotal = cRev + cLost + cOk, cBad = cRev + cLost;
  const evalBad = s.reverted + s.lost;
  const need = cTotal > 0 && cBad / cTotal > 0.2 || (s.landed + s.lost > 0 && evalBad / (s.landed + s.lost) > 0.05);
  const out = ["", title(st, "COST")];
  out.push(kv(st, "gas spent", t ? `${t.gasMon.toFixed(2)} MON` : "-", "test MON, no market value"));
  out.push(kv(st, "per evaluation", s.gasUsedN ? `${int(s.gasUsedSum / s.gasUsedN)} gas` : "-", "mean over landed evaluations"));
  out.push(kv(st, "landing latency", p50 !== null ? `${(p50 / 1000).toFixed(1)} s` : "-", p90 !== null ? `median; 90% within ${(p90 / 1000).toFixed(1)} s` : ""));
  out.push(kv(st, "block interval", bs.intervalMs !== null ? `${(bs.intervalMs / 1000).toFixed(2)} s` : "-", bs.median !== null ? `${trimNum(bs.median)} evaluations per busy block` : ""));
  out.push(kv(st, "judge", s.hello?.model && s.hello.model !== "none" ? s.hello.model : "-", s.judge.n ? `${s.judge.n} calls${s.judge.usd > 0 ? `, $${s.judge.usd.toFixed(3)}` : ", no spend"}` : ""));
  out.push("", title(st, "HEALTH", need ? st.acc("needs a look") : "ok"));
  out.push(kv(st, "evaluations", int(s.sent), `${s.reverted} reverted, ${s.lost} lost${s.sent ? ` (${((evalBad / s.sent) * 100).toFixed(1)}%)` : ""}`));
  out.push(kv(st, "confirm attempts", int(cTotal), `${cOk} landed, ${cRev} reverted, ${cLost} lost${cTotal ? ` (${Math.round((cBad / cTotal) * 100)}% failed)` : ""}`));
  if (cBad > 0) out.push(...wrap("Failed confirms are retried or skipped, never counted as scores. A high failure rate thins the confirmed set, so read page 3 as a small sample.", cw - 2).map((l) => "  " + st.dim(l)));
  const other = groups.filter((x) => x.scope !== "confirm").sort((a, b) => b.count - a.count).slice(0, 3);
  if (other.length) { out.push("", title(st, "OTHER NOTICES")); for (const x of other) out.push(clip(`  ${padL(String(x.count), 4)}  ${st.dim(x.scope)}  ${x.example}`, cw)); }
  void g;
  return out;
}

// ---------- help ----------

function helpPage(st: Style, cw: number, live: boolean): string[] {
  const k = (key: string, what: string) => `  ${padR(st.acc(key), 12 + (vlen(st.acc("x")) - 1))}${what}`;
  const out = ["", title(st, "KEYS")];
  out.push(k("1 to 5", "pages: overview, blocks, generalisation, operators, cost & health"));
  out.push(k("left right", "previous or next page"));
  out.push(k("?", "this help; any page key leaves it"));
  if (!live) out.push(k("space", "pause or resume the replay"), k("+  -", "faster or slower"));
  out.push(k("q", "quit"), "", title(st, "WORDS"));
  const w: [string, string][] = [
    ["dev", "score on the window the search is allowed to see (basis points of return)"],
    ["confirm", "the same candidate re-scored on a held-out window, on chain"],
    ["sealed", "the champion scored once on a window nobody has looked at"],
    ["gap", "confirm minus dev: what the search flattered itself with"],
    ["eval", "one candidate scored by one transaction"],
  ];
  for (const [a, b] of w) out.push(...wrap(b, cw - 14).map((l, i) => `  ${padR(i === 0 ? st.dim(a) : "", 10 + (vlen(st.dim("x")) - 1))}  ${l}`));
  return out;
}

// ---------- frame ----------

export function renderFrame(s: ViewState, o: RenderOpts): string[] {
  const st = makeStyle({ color: o.color, links: o.links });
  const g = o.ascii ? G_ASC : G_UNI;
  const W = Math.max(40, o.width);
  const cw = Math.min(W - 2, 118);
  const page: Page = o.page ?? 1;
  const rule = st.dim(g.rule.repeat(cw));
  const head = [header(s, st, g, o, cw), tabs(st, page, cw), rule];
  const bodyH = Math.max(1, o.height - head.length - 2);
  let body: string[];
  switch (page) {
    case 2: body = blocksPage(s, st, g, o, cw, bodyH); break;
    case 3: body = generalisationPage(s, st, g, cw, bodyH); break;
    case 4: body = operatorsPage(s, st, g, cw); break;
    case 5: body = costHealthPage(s, st, g, cw); break;
    case "help": body = helpPage(st, cw, !o.replay && s.hello?.mode === "live" && !o.keys?.includes("space")); break;
    default: body = overview(s, st, g, cw);
  }
  const stat = o.status ? st.dim(o.status) : "";
  const footer = o.keys ? st.dim(vlen(o.keys) + 2 + vlen(stat) > cw ? clip(o.keys, Math.max(0, cw - 2 - vlen(stat))) : o.keys) : "";
  const lines = [...head, ...fit(body, bodyH), rule, footer + " ".repeat(Math.max(2, cw - vlen(footer) - vlen(stat))) + stat];
  return lines.slice(0, o.height).map((l) => " " + clip(l, cw)).map((l) => (vlen(l) > W ? clip(l, W) : l));
}

export { columns };
