// `blockwise init`: write ~/.blockwise/config.json (0600) with RPC and Jev settings. Interactive only on a TTY and only without --yes.
// The Jev key is read from TYPESAFE_AI_API_KEY or, with --key-stdin, from stdin; it is never echoed, never put in config.json,
// and saved (to ~/.blockwise/jev.key, 0600) only with --save-key. No wallet or mnemonic is touched here.
import { createInterface } from "node:readline";
import { UsageError } from "./cli-meta";
import { configFile, keyFile, readConfig, writeConfig, writeKeyFile, type FileConfig } from "./home";

type Flags = Record<string, string | true>;
export interface InitIO { isTTY: boolean; env: Record<string, string | undefined>; say: (s: string) => void; readStdin: () => Promise<string>; ask: (q: string, secret?: boolean) => Promise<string> }

export function processInitIO(): InitIO {
  const say = (s: string) => process.stderr.write(s + "\n");
  return {
    isTTY: !!process.stdin.isTTY && !!process.stderr.isTTY, env: process.env, say,
    readStdin: async () => { let s = ""; for await (const c of process.stdin) s += c; return s; },
    ask: (q, secret) => new Promise((res) => {
      const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
      if (secret) (rl as any)._writeToOutput = (t: string) => { if (t.includes(q)) process.stderr.write(t); }; // prompt shown, typed characters not
      rl.question(q, (a) => { rl.close(); if (secret) process.stderr.write("\n"); res(a); });
    }),
  };
}

const validUrl = (u: string) => { try { const p = new URL(u); return p.protocol === "http:" || p.protocol === "https:"; } catch { return false; } };

export async function cmdInit(flags: Flags, io: InitIO = processInitIO()): Promise<number> {
  const interactive = io.isTTY && !flags.yes && !flags["key-stdin"];
  const cur = readConfig();
  const cfg: FileConfig = { ...cur, jev: { ...cur.jev } };

  let rpc = typeof flags.rpc === "string" ? flags.rpc : undefined;
  if (rpc === undefined && interactive) rpc = (await io.ask(`RPC URL [${cur.rpcUrl ?? "Monad testnet default"}]: `)).trim() || undefined;
  if (rpc) { if (!validUrl(rpc)) throw new UsageError(`--rpc must be an http(s) URL (got "${rpc}")`); cfg.rpcUrl = rpc; }

  let model = typeof flags["jev-model"] === "string" ? flags["jev-model"] : undefined;
  if (model === undefined && interactive) model = (await io.ask(`Jev model id [${cur.jev?.model ?? "jev-latest"}]: `)).trim() || undefined;
  if (model) cfg.jev!.model = model;

  if (flags.judge !== undefined) {
    if (flags.judge !== "jev" && flags.judge !== "stand-in" && flags.judge !== "off") throw new UsageError("--judge must be jev, stand-in or off");
    cfg.jev!.judge = flags.judge;
  }

  let key = (io.env.TYPESAFE_AI_API_KEY ?? "").trim();
  if (flags["key-stdin"]) key = (await io.readStdin()).trim();
  else if (!key && interactive) key = (await io.ask("Jev API key (input hidden, Enter to skip): ", true)).trim();
  if (flags["key-stdin"] && !key) throw new UsageError("--key-stdin read nothing. Example: printf '%s' \"$KEY\" | blockwise init --key-stdin --save-key");

  const file = writeConfig(cfg);
  io.say(`wrote ${file} (mode 0600)`);
  if (rpc) io.say(`  rpc: ${cfg.rpcUrl}`);
  io.say(`  jev model: ${cfg.jev?.model ?? "jev-latest (default)"}${cfg.jev?.judge ? `, default judge: ${cfg.jev.judge}` : ""}`);
  if (key && flags["save-key"]) io.say(`  jev key: saved to ${writeKeyFile(key)} (mode 0600, not in config.json)`);
  else if (key) io.say(`  jev key: found (${flags["key-stdin"] ? "stdin" : "TYPESAFE_AI_API_KEY"}), NOT saved. Use --save-key to keep it in ${keyFile()}, or export it in your shell profile.`);
  else io.say("  jev key: none. The judge will be the labelled stand-in until TYPESAFE_AI_API_KEY is set. See docs/jev-key.md");
  io.say("  next: blockwise watch --replay <file> | blockwise run --judge jev --yes");
  return 0;
}
