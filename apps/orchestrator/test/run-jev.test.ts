// End to end on a local anvil: run with the real Jev client against a mock HTTP server. Not run: the real Jev API.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ANVIL_DEV_MNEMONIC, RpcPool, Wallets, connect, deployAll, loadSeries } from "@blockwise/chain";
import { Bus } from "../src/bus";
import { runLoop } from "../src/run";
import { jevConfigFromEnv } from "../src/judge/jev";
import { standInColony } from "./standin-colony";

const has = Bun.which("anvil") !== null;
const t = has ? test : test.skip;
let stop = () => {}; let mock: ReturnType<typeof Bun.serve>;
const KEY = "sk-e2e-SECRET";
beforeAll(async () => {
  if (!has) return;
  const p = Bun.spawn(["anvil", "--chain-id", "31337", "--port", "18548", "--silent"], { stdout: "ignore", stderr: "ignore" });
  stop = () => p.kill();
  for (let i = 0; i < 100; i++) { try { await fetch("http://127.0.0.1:18548", { method: "POST", body: "{}" }); break; } catch { await Bun.sleep(100); } }
  process.env.BLOCKWISE_ALLOW_OTHER_CHAIN = "1";
  process.env.BLOCKWISE_CONFIG_ROOT = mkdtempSync(join(tmpdir(), "bw-jev-"));
  let n = 0;
  mock = Bun.serve({ port: 0, fetch: () => (++n % 4 === 0 ? new Promise(() => {}) : Response.json({ model: "jev-mock", answers: { beats: { type: "choice", choice: "yes", probabilities: { yes: 0.4, no: 0.6 } } }, usage: { input_tokens: 500, output_tokens: 5 } })) });
});
afterAll(() => { stop(); mock?.stop(true); });

t("run --judge jev: real-call events labelled jev with model id, jevUsd in totals, hung calls are counted misses and do not block", async () => {
  const wallets = new Wallets(ANVIL_DEV_MNEMONIC);
  const ctx = await connect(new RpcPool(["http://127.0.0.1:18548"]));
  await deployAll(ctx, wallets.deployer, 2_000_000_000n);
  const file = join(process.env.BLOCKWISE_CONFIG_ROOT!, "run.jsonl");
  const logs: string[] = []; const bus = new Bus({ file });
  const jev = jevConfigFromEnv({ TYPESAFE_AI_API_KEY: KEY, TYPESAFE_AI_BASE_URL: `http://127.0.0.1:${mock.port}` }, { timeoutMs: 400, backoffMs: 5 })!;
  const t0 = Date.now();
  expect(await runLoop(ctx, wallets, bus, { gens: 2, perGen: 12, workers: 4, confirmK: 3, seed: 1, gasPrice: 2_000_000_000n, series: loadSeries(), makeColony: standInColony, judge: "jev", jev, log: (s) => logs.push(s) })).toBe("done");
  expect(Date.now() - t0).toBeLessThan(60_000);
  const ev = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const j = ev.filter((e) => e.type === "judge");
  expect(j.length).toBeGreaterThan(5); expect(j.every((e) => e.model === "jev" && e.modelId === "jev-mock" && e.pBps === 4000)).toBe(true);
  expect(ev.find((e) => e.type === "hello").model).toBe("jev");
  const totals = ev.filter((e) => e.type === "totals").pop();
  expect(totals.jevUsd).toBeCloseTo((j.length * (500 * 0.042 + 5 * 0.042)) / 1e6, 10);
  expect(ev.some((e) => e.type === "error" && e.scope === "judge" && /missed/.test(e.message))).toBe(true);
  expect(ev.filter((e) => e.type === "tx_landed" && e.status === "success").length).toBe(24);
  expect(JSON.stringify(ev) + logs.join("\n")).not.toContain(KEY);
}, 120_000);
