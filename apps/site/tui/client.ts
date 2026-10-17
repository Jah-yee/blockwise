// Browser side of the terminal demo. The frames are drawn by the real TUI renderer (apps/orchestrator/src/tui/render.ts, pure string
// rendering, no node imports): the page folds the recorded events into the same view model and asks it for lines, then maps ANSI SGR to spans.
import { renderFrame, type Page } from "../../orchestrator/src/tui/render";
import { initState, reduce, type Ev, type ViewState } from "../../orchestrator/src/tui/state";

declare const __EVENTS__: Ev[];
const EVENTS: Ev[] = __EVENTS__;
const END = Math.max(...EVENTS.map((e) => e.t ?? 0)) + 1500;
const ROWS = 32;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// ---- ANSI SGR -> HTML. The renderer only emits 0, 1, 2, 7, 22, 27, 39 and 38;5;N (one accent), so a tiny state machine is enough. ----
function ansiToHtml(line: string): string {
  let bold = false, dim = false, inv = false, acc = false;
  let out = "", run = "", cls = "";
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const flush = () => { if (run) { out += cls ? `<span class="${cls}">${esc(run)}</span>` : esc(run); run = ""; } };
  const re = /\x1b\[([0-9;]*)m/g;
  let last = 0, m: RegExpExecArray | null;
  const apply = (codes: string) => {
    const c = codes === "" ? [0] : codes.split(";").map(Number);
    for (let i = 0; i < c.length; i++) {
      const k = c[i]!;
      if (k === 0) { bold = dim = inv = acc = false; }
      else if (k === 1) bold = true; else if (k === 2) dim = true; else if (k === 7) inv = true;
      else if (k === 22) { bold = false; dim = false; } else if (k === 27) inv = false; else if (k === 39) acc = false;
      else if (k === 38 && c[i + 1] === 5) { acc = true; i += 2; }
    }
    cls = [bold && "b", dim && "d", inv && "i", acc && "a"].filter(Boolean).join(" ");
  };
  while ((m = re.exec(line))) { run += line.slice(last, m.index); flush(); apply(m[1]!); last = m.index + m[0].length; }
  run += line.slice(last); flush();
  return out;
}

// ---- state ----
let state: ViewState = initState();
let cursor = 0;            // next event to fold
let pos = 0;               // playhead, recorded ms
let playing = true;
let speed = 24;
let page: Page = 1;
let lastPage: Page = 1;
let cols = 100;
let dirty = true;
let prev = performance.now();

const term = $<HTMLPreElement>("term");
const meter = $<HTMLSpanElement>("meter");
const scrub = $<HTMLInputElement>("scrub");
scrub.max = String(END);

function seek(to: number) {
  to = Math.max(0, Math.min(END, to));
  if (to < pos) { state = initState(); cursor = 0; }
  pos = to;
  while (cursor < EVENTS.length && (EVENTS[cursor]!.t ?? 0) <= pos) reduce(state, EVENTS[cursor++]!);
  dirty = true;
}

function measure(): number {
  const probe = $<HTMLSpanElement>("probe");
  const cw = probe.getBoundingClientRect().width / 10 || 8;
  const avail = $("screen").clientWidth - 2 * 14;
  return Math.max(46, Math.min(100, Math.floor(avail / cw)));
}

function draw() {
  const status = cols >= 70 ? `x${speed}  ${cursor}/${EVENTS.length}` : `x${speed}`;
  const lines = renderFrame(state, { width: cols, height: ROWS, color: true, ascii: false, links: false, page, replay: true, keys: cols >= 70 ? "1-5 pages  ? help  space pause  +/- speed" : "1-5 pages  ? help", status });
  term.innerHTML = lines.map(ansiToHtml).join("\n");
  const s = Math.floor(pos / 1000);
  meter.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  scrub.value = String(pos);
  $("title-size").textContent = `${cols}×${ROWS}`;
  dirty = false;
}

function setPage(p: Page) {
  if (p === "help" && page === "help") p = lastPage;
  if (p !== "help") lastPage = p;
  page = p;
  document.querySelectorAll<HTMLButtonElement>("[data-page]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.page === String(page))));
  dirty = true;
}
function setPlaying(v: boolean) {
  if (v && pos >= END) seek(0);
  playing = v;
  const b = $<HTMLButtonElement>("play");
  b.setAttribute("aria-pressed", String(playing));
  b.querySelector(".e")!.textContent = playing ? "Pause" : pos >= END ? "Replay" : "Play";
  b.querySelector(".z")!.textContent = playing ? "暂停" : pos >= END ? "重播" : "播放";
  b.dataset.state = playing ? "pause" : "play";
}
function setSpeed(v: number) {
  speed = Math.max(4, Math.min(192, v));
  document.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.speed) === speed)));
  dirty = true;
}

function tick(now: number) {
  const dt = now - prev; prev = now;
  if (playing) {
    seek(pos + dt * speed);
    if (pos >= END) setPlaying(false);
  }
  if (dirty) draw();
  requestAnimationFrame(tick);
}

document.querySelectorAll<HTMLButtonElement>("[data-page]").forEach((b) => b.addEventListener("click", () => setPage(b.dataset.page === "help" ? "help" : (Number(b.dataset.page) as Page))));
document.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach((b) => b.addEventListener("click", () => setSpeed(Number(b.dataset.speed))));
$("play").addEventListener("click", () => setPlaying(!playing));
scrub.addEventListener("input", () => { seek(Number(scrub.value)); });
document.addEventListener("keydown", (e) => {
  const t = e.target as HTMLElement;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (k >= "1" && k <= "5") setPage(Number(k) as Page);
  else if (k === "?") setPage("help");
  else if ((k === " " || k === "Spacebar") && !/^(BUTTON|INPUT|A)$/.test(t.tagName)) { e.preventDefault(); setPlaying(!playing); }
  else if (k === "+" || k === "=") setSpeed(speed * 2);
  else if (k === "-" || k === "_") setSpeed(speed / 2);
  else if ((k === "ArrowRight" || k === "ArrowLeft") && t.tagName !== "INPUT") {
    const cur = Number(page === "help" ? lastPage : page);
    setPage((((cur - 1 + (k === "ArrowRight" ? 1 : 4)) % 5) + 1) as Page);
    e.preventDefault();
  }
});
const copyBtn = $<HTMLButtonElement>("copy");
copyBtn.addEventListener("click", async () => {
  const text = $("cmd").textContent ?? "";
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand("copy"); } catch { ok = false; } ta.remove();
  }
  copyBtn.dataset.done = ok ? "1" : "0";
  $("copy-note").textContent = "";
  setTimeout(() => { delete copyBtn.dataset.done; }, 1800);
});
new ResizeObserver(() => { const c = measure(); if (c !== cols) { cols = c; dirty = true; } }).observe($("screen"));

cols = measure();
setPage(1); setSpeed(24); setPlaying(true);
seek(0);
requestAnimationFrame((t) => { prev = t; tick(t); });
// test hook: jump to a time and page without waiting
(window as unknown as { __demo: unknown }).__demo = { seek, setPage, setPlaying, END };
