// Where a packaged install (npm tarball or compiled binary) keeps its files, and the config file `init` writes.
// A repository checkout is detected by data/series/v1.json + contracts/out beside the sources; then nothing here changes anything.
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const blockwiseHome = () => process.env.BLOCKWISE_HOME ?? join(homedir(), ".blockwise");
export const configFile = () => join(blockwiseHome(), "config.json");

export interface FileConfig { rpcUrl?: string; rpcUrls?: string[]; chainId?: number; jev?: { model?: string; baseUrl?: string; timeoutMs?: number; judge?: "jev" | "stand-in" | "off" } }

/** Config file values (never a key: init refuses to store one in this file; see docs/jev-key.md). */
export function readConfig(): FileConfig {
  try { return JSON.parse(readFileSync(configFile(), "utf8")); } catch { return {}; }
}
export function writeConfig(c: FileConfig): string {
  const f = configFile();
  mkdirSync(dirname(f), { recursive: true, mode: 0o700 });
  writeFileSync(f, JSON.stringify(c, null, 2) + "\n", { mode: 0o600 });
  chmodSync(f, 0o600);
  return f;
}
/** Apply config-file defaults to the environment. Real environment variables always win. */
export function applyConfig(env = process.env) {
  const c = readConfig();
  if (c.rpcUrl && !env.RPC_URL && !env.RPC_URLS) env.RPC_URL = c.rpcUrl;
  if (c.rpcUrls?.length && !env.RPC_URLS && !env.RPC_URL) env.RPC_URLS = c.rpcUrls.join(",");
  if (c.chainId && !env.CHAIN_ID) env.CHAIN_ID = String(c.chainId);
  if (c.jev?.model && !env.JEV_MODEL_ID) env.JEV_MODEL_ID = c.jev.model;
  if (c.jev?.baseUrl && !env.TYPESAFE_AI_BASE_URL) env.TYPESAFE_AI_BASE_URL = c.jev.baseUrl;
  return c;
}

declare global { var __BLOCKWISE_EMBEDDED__: { artifacts: Record<string, unknown>; series: unknown } | undefined }

const isCheckout = (root: string) => existsSync(join(root, "data/series/v1.json")) && existsSync(join(root, "contracts/out"));

/** Point the chain package at the right files. Order: explicit flag, then env, then (outside a checkout) embedded copies written to ~/.blockwise. */
export function setupPaths(repoRoot: string, flags: Record<string, string | true>): void {
  const art = typeof flags.artifacts === "string" ? resolve(flags.artifacts) : undefined;
  const ser = typeof flags.series === "string" ? resolve(flags.series) : undefined;
  if (art) process.env.BLOCKWISE_ARTIFACTS = art;
  if (ser) process.env.BLOCKWISE_SERIES = ser;
  if (isCheckout(repoRoot)) return;
  const home = blockwiseHome();
  if (!process.env.BLOCKWISE_CONFIG_ROOT) process.env.BLOCKWISE_CONFIG_ROOT = home; // config/deployments.<net>.json, gas.<net>.json
  const emb = globalThis.__BLOCKWISE_EMBEDDED__;
  if (!emb) return;
  const put = (f: string, v: unknown) => { mkdirSync(dirname(f), { recursive: true }); const s = JSON.stringify(v); try { if (readFileSync(f, "utf8") === s) return; } catch {} writeFileSync(f, s); };
  if (!process.env.BLOCKWISE_ARTIFACTS) {
    const dir = join(home, "artifacts", "v" + (process.env.BLOCKWISE_VERSION ?? "0"));
    for (const [n, a] of Object.entries(emb.artifacts)) put(join(dir, `${n}.sol`, `${n}.json`), a);
    process.env.BLOCKWISE_ARTIFACTS = dir;
  }
  if (!process.env.BLOCKWISE_SERIES) { const f = join(home, "series", "v1.json"); put(f, emb.series); process.env.BLOCKWISE_SERIES = f; }
}

/** Directory for run recordings: the checkout's runs/ or ~/.blockwise/runs. */
export const runsDir = (repoRoot: string) => (isCheckout(repoRoot) ? join(repoRoot, "runs") : join(blockwiseHome(), "runs"));

export const keyFile = () => join(blockwiseHome(), "jev.key");
/** Fill TYPESAFE_AI_API_KEY from ~/.blockwise/jev.key (mode 0600) when the environment has none. The value is never printed. */
export function applyKeyFile(env = process.env) {
  if (env.TYPESAFE_AI_API_KEY?.trim()) return;
  try { const k = readFileSync(keyFile(), "utf8").trim(); if (k) env.TYPESAFE_AI_API_KEY = k; } catch {}
}
export function writeKeyFile(key: string): string {
  const f = keyFile();
  mkdirSync(dirname(f), { recursive: true, mode: 0o700 });
  writeFileSync(f, key.trim() + "\n", { mode: 0o600 });
  chmodSync(f, 0o600);
  return f;
}
