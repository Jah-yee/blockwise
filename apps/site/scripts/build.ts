// Static site build: apps/site -> apps/site/dist. Also invokes the sim and tui builders when present.
import { existsSync, mkdirSync, writeFileSync, copyFileSync, rmSync, readdirSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadStats } from "../src/data";
import { page } from "../src/layout";
import { home } from "../src/home";
import { dashboard } from "../src/dashboard";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = resolve(SITE, "../..");
const DIST = join(SITE, "dist");
const FIXTURE = join(ROOT, "fixtures/testnet-run-2.jsonl");

// Other builders may write into dist, so only clear what this script owns.
for (const p of ["index.html", "shared.css", "dashboard", "assets"]) rmSync(join(DIST, p), { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const stats = loadStats(FIXTURE);
const assetsSrc = join(SITE, "src/assets");
const thumbs: Record<string, boolean> = {};
if (existsSync(assetsSrc)) {
  cpSync(assetsSrc, join(DIST, "assets"), { recursive: true });
  for (const k of ["dashboard", "tui", "sim"]) thumbs[k] = existsSync(join(assetsSrc, `thumb-${k}.png`));
}

writeFileSync(join(DIST, "index.html"), page({
  dir: SITE, active: "home", title: "Blockwise — a lab bench for trading strategies",
  desc: "Hundreds of trading-strategy candidates scored in parallel in a few Monad blocks by an on-chain contract the searcher cannot touch. The held-out result is reported even when it is bad.",
  body: home(stats, thumbs),
}));

mkdirSync(join(DIST, "dashboard"), { recursive: true });
writeFileSync(join(DIST, "dashboard/index.html"), page({
  dir: SITE, active: "dashboard", title: "Blockwise — Dashboard",
  desc: "The real Blockwise dashboard replaying a recorded Monad testnet run.", body: dashboard(),
}));
const webDist = join(ROOT, "apps/web/dist/index.html");
if (existsSync(webDist)) copyFileSync(webDist, join(DIST, "dashboard/app.html"));
else console.warn("WARN: apps/web/dist/index.html missing; run `bun run --cwd apps/web build --replay fixtures/testnet-run-2.jsonl` first. Dashboard iframe will be empty.");
copyFileSync(join(SITE, "shared.css"), join(DIST, "shared.css"));

for (const sub of ["sim", "tui"]) {
  const b = join(SITE, sub, "build.ts");
  if (!existsSync(b)) { console.warn(`WARN: apps/site/${sub}/build.ts not present; skipping`); continue; }
  const r = Bun.spawnSync(["bun", "run", b], { cwd: ROOT, stdout: "inherit", stderr: "inherit" });
  if (r.exitCode !== 0) console.warn(`WARN: apps/site/${sub}/build.ts exited ${r.exitCode}; continuing`);
}
console.log(`site built: ${readdirSync(DIST).join(", ")} (landed ${stats.landed}/${stats.sent}, median span ${stats.medianSpan}, champion ${stats.champ?.dev}/${stats.champ?.confirm}/${stats.champ?.sealed})`);
