// CLI metadata kept out of cli.ts: help text, which flags each command accepts, and the error helpers.
// Principle: an error says what happened and what to do next; a typo'd flag is an error, not a silent default.
export const BOOL_FLAGS = new Set(["json", "yes", "hold", "local", "write", "loop", "no-serve", "help", "version", "lines", "frame", "ascii", "color", "no-color", "exit", "md", "save-key", "key-stdin"]);

export const COMMANDS: Record<string, { summary: string; flags: string[]; usage: string; example: string }> = {
  deploy: { summary: "deploy Ledger, Evaluator, bind, JudgeLog; write config/deployments.<network>.json", flags: ["local", "json", "artifacts"], usage: "deploy [--local]", example: "bun run orch deploy" },
  smoke: { summary: "measure gas and the landing-block histogram; --write saves config/gas.<network>.json", flags: ["local", "txs", "workers", "write", "json", "artifacts", "series"], usage: "smoke [--txs 20] [--workers 10] [--write] [--json]", example: "bun run orch smoke --txs 20 --workers 10 --write" },
  run: { summary: "the generation loop; prints the budget first; events on stdout (JSONL), runs/<ts>.jsonl and SSE", flags: ["local", "gens", "per-gen", "workers", "confirm-k", "seed", "port", "judge", "yes", "hold", "no-serve", "timeout", "judge-timeout", "artifacts", "series"], usage: "run [--gens 10] [--per-gen 200] [--workers 20] [--confirm-k 8] [--seed 1] [--port 8787] [--judge stand-in|jev|off] [--judge-timeout 8]|off] [--yes] [--hold]", example: "bun run orch run --gens 10 --per-gen 200 --workers 20 --yes" },
  init: { summary: "write ~/.blockwise/config.json (RPC, Jev settings); optional, interactive on a TTY", flags: ["rpc", "jev-model", "judge", "key-stdin", "save-key", "yes"], usage: "init [--rpc URL] [--jev-model ID] [--judge jev|stand-in|off] [--key-stdin] [--save-key] [--yes]", example: "printf '%s' \"$KEY\" | blockwise init --key-stdin --save-key --yes" },
  serve: { summary: "serve a recording through the SSE endpoint, labelled replay", flags: ["replay", "port", "speed", "loop"], usage: "serve --replay FILE [--port 8787] [--speed 1] [--loop]", example: "bun run orch serve --replay fixtures/events.sample.jsonl" },
  watch: { summary: "watch the event stream in the terminal (full screen on a TTY, line log otherwise)", flags: ["replay", "live", "speed", "lines", "frame", "at", "width", "height", "color", "no-color", "ascii", "exit"], usage: "watch (--replay FILE | --live URL) [--speed 16|max] [--lines] [--frame [--at N --width 120 --height 34]] [--ascii] [--no-color] [--exit]", example: "bun run orch watch --replay fixtures/events.sample.jsonl --speed 16" },
  report: { summary: "plain-text summary of a recorded run: what we may and may not claim (--md for a markdown file)", flags: ["json", "md"], usage: "report FILE [--json | --md]", example: "bun run orch report fixtures/events.sample.jsonl" },
};

export const EXIT = { ok: 0, usage: 1, budget: 4, chain: 5 } as const;

const PROG = () => ((globalThis as any).__BLOCKWISE_PKG__ ? "blockwise" : "bun run orch");
export function usage(): string {
  const w = Math.max(...Object.keys(COMMANDS).map((k) => k.length));
  return [
    "blockwise: run, record and watch a colony on Monad testnet",
    "",
    "usage: bun run orch <command> [flags]",
    "",
    ...Object.entries(COMMANDS).map(([k, v]) => `  ${k.padEnd(w)}  ${v.summary}`),
    "",
    "  help [command]   this text, or the flags of one command (also: <command> --help)",
    "  --version",
    "",
    "common: --local (allow chain id != 10143, anvil dev mnemonic fallback)",
    "env:    RPC_URL / RPC_URLS, TYPESAFE_AI_API_KEY + JEV_MODEL_ID (optional Jev judge, never printed), MNEMONIC or ~/.blockwise/testnet.json (never printed), GAS_PRICE_GWEI, NO_COLOR, BLOCKWISE_NO_TUI=1",
    "exit:   0 ok, 1 usage or not found, 4 budget or missing --yes, 5 wrong chain id",
    "docs:   docs/cli.md, docs/jev-key.md",
  ].join("\n").replaceAll("bun run orch", PROG());
}

export function commandHelp(cmd: string): string {
  const c = COMMANDS[cmd]!;
  return `${cmd}: ${c.summary}\n\nusage:   bun run orch ${c.usage}\nexample: ${c.example}\n`.replaceAll("bun run orch", PROG());
}

export function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}

export function nearest(word: string, options: string[]): string | null {
  let best: string | null = null, bd = 3;
  for (const o of options) { const d = distance(word, o); if (d < bd) { bd = d; best = o; } }
  return best;
}

/** First problem with the flags given to `cmd`, as a message that says what to do; null when fine. */
export function checkFlags(cmd: string, flags: Record<string, string | true>): string | null {
  const c = COMMANDS[cmd];
  if (!c) return null;
  const allowed = [...c.flags, "help", "version"];
  for (const f of Object.keys(flags)) {
    if (allowed.includes(f)) continue;
    const near = nearest(f, c.flags);
    return `unknown flag --${f} for ${cmd}.${near ? ` Did you mean --${near}?` : ""} Flags: ${c.flags.map((x) => "--" + x).join(" ")}`;
  }
  return null;
}

/** Parse a numeric flag; a non-number is an error with the flag name, not a silent NaN. */
export function numFlag(flags: Record<string, string | true>, k: string, d: number): number {
  const v = flags[k];
  if (v === undefined) return d;
  const n = v === true ? NaN : Number(v);
  if (!Number.isFinite(n)) throw new UsageError(`--${k} needs a number (got ${v === true ? "nothing" : `"${v}"`}). Example: --${k} ${d}`);
  return n;
}

export class UsageError extends Error {}
