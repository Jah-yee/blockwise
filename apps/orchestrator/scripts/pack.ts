// Build the two distributables into apps/orchestrator/dist-pack/:
//   blockwise-cli-<version>.tgz   npm tarball (one bundled file; needs Bun >= 1.1 on PATH, see README)
//   blockwise-<platform>          single-file binary from `bun build --compile` (needs nothing installed)
// Both embed the contract artifacts (Ledger, Evaluator, JudgeLog) and the series, so `deploy` and `run` work outside a checkout.
// Usage: bun run --cwd apps/orchestrator pack [--targets bun-linux-x64,bun-darwin-arm64,...] [--no-binary]
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const APP = resolve(import.meta.dir, "..");
const OUT = join(APP, "dist-pack"), BUILD = join(OUT, ".build"), STAGE = join(OUT, ".stage");
const pkg = JSON.parse(readFileSync(join(APP, "package.json"), "utf8"));
const argv = process.argv.slice(2);
const opt = (k: string) => { const i = argv.indexOf("--" + k); return i >= 0 ? argv[i + 1] : undefined; };
const run = (cmd: string[], cwd = APP) => { const r = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" }); if (r.exitCode !== 0) throw new Error(`${cmd.join(" ")} failed:\n${r.stderr.toString()}${r.stdout.toString()}`); return r.stdout.toString(); };

for (const d of [BUILD, STAGE]) rmSync(d, { recursive: true, force: true });
mkdirSync(BUILD, { recursive: true }); mkdirSync(join(STAGE, "dist"), { recursive: true }); mkdirSync(join(STAGE, "docs"), { recursive: true });
for (const f of readdirSync(OUT)) if (/^(blockwise-cli-.*\.tgz|blockwise-.*|SHA256SUMS)$/.test(f) && statSync(join(OUT, f)).isFile()) rmSync(join(OUT, f));

// 1. embed artifacts + series (ABI and creation bytecode only)
const artifacts: Record<string, unknown> = {};
for (const n of ["Ledger", "Evaluator", "JudgeLog"]) {
  const f = join(ROOT, "contracts/out", `${n}.sol`, `${n}.json`);
  if (!existsSync(f)) throw new Error(`missing ${f}. Run: cd contracts && forge build`);
  const j = JSON.parse(readFileSync(f, "utf8"));
  artifacts[n] = { abi: j.abi, bytecode: { object: j.bytecode.object } };
}
const series = JSON.parse(readFileSync(join(ROOT, "data/series/v1.json"), "utf8"));
writeFileSync(join(BUILD, "embedded.ts"), `globalThis.__BLOCKWISE_PKG__ = true;\nglobalThis.__BLOCKWISE_EMBEDDED__ = ${JSON.stringify({ artifacts, series })} as any;\nprocess.env.BLOCKWISE_VERSION ??= ${JSON.stringify(pkg.version)};\nexport {};\n`);
writeFileSync(join(BUILD, "entry.ts"), `import "./embedded";\nimport "../../src/cli";\n`);

// 2. npm tarball: one bundled file, no source, no tests, no runs, no config
run(["bun", "build", join(BUILD, "entry.ts"), "--target=bun", "--outfile", join(STAGE, "dist/blockwise.js")]);
const js = readFileSync(join(STAGE, "dist/blockwise.js"), "utf8");
writeFileSync(join(STAGE, "dist/blockwise.js"), js.startsWith("#!") ? js : "#!/usr/bin/env bun\n" + js, { mode: 0o755 });
cpSync(join(ROOT, "docs/cli.md"), join(STAGE, "docs/cli.md")); cpSync(join(ROOT, "docs/jev-key.md"), join(STAGE, "docs/jev-key.md"));
const sample = join(ROOT, "fixtures/events.sample.jsonl");
mkdirSync(join(STAGE, "fixtures")); cpSync(sample, join(STAGE, "fixtures/events.sample.jsonl"));
writeFileSync(join(STAGE, "README.md"), `# blockwise-cli

Terminal instrument and CLI for Blockwise (Monad testnet). Needs **Bun >= 1.1** on PATH (https://bun.sh); the single-file binary needs nothing.

\`\`\`bash
npm i -g ./blockwise-cli-${pkg.version}.tgz     # or: bun add -g ./blockwise-cli-${pkg.version}.tgz
blockwise --version
blockwise watch --replay "$(npm root -g)/blockwise-cli/fixtures/events.sample.jsonl" --speed 16
blockwise init                                  # optional: RPC and Jev settings, see docs/jev-key.md
\`\`\`

Docs: docs/cli.md, docs/jev-key.md. The Jev judge is optional and shadow-only; without TYPESAFE_AI_API_KEY the judge is the labelled stand-in.
`);
writeFileSync(join(STAGE, "package.json"), JSON.stringify({
  name: "blockwise-cli", version: pkg.version, description: "Blockwise: run, record and watch a colony of strategy candidates on Monad testnet (terminal instrument, report, optional Jev shadow judge)", license: pkg.license, type: "module",
  bin: { blockwise: "dist/blockwise.js" }, files: ["dist/blockwise.js", "docs/cli.md", "docs/jev-key.md", "fixtures/events.sample.jsonl", "README.md"],
  engines: pkg.engines, os: ["linux", "darwin"], keywords: ["blockwise", "monad", "tui"],
}, null, 2) + "\n");
const dry = run(["npm", "pack", "--dry-run", "--json"], STAGE);
const listed = (JSON.parse(dry)[0].files as { path: string }[]).map((f) => f.path);
const bad = listed.filter((p) => /\.env|\.key|mnemonic|testnet\.json|runs\/|test\/|\.test\.|config\//.test(p));
if (bad.length) throw new Error(`refusing to pack unexpected files: ${bad.join(", ")}`);
run(["npm", "pack", "--pack-destination", OUT], STAGE);
console.log("tarball files:\n  " + listed.join("\n  "));

// 3. single-file binary
const out: string[] = [];
if (!argv.includes("--no-binary")) {
  const targets = (opt("targets") ?? "").split(",").filter(Boolean);
  const plat = `${process.platform}-${process.arch === "x64" ? "x64" : process.arch}`;
  for (const t of targets.length ? targets : [""]) {
    const name = t ? `blockwise-${t.replace(/^bun-/, "")}${t.includes("windows") ? ".exe" : ""}` : `blockwise-${plat}`;
    run(["bun", "build", "--compile", ...(t ? [`--target=${t}`] : []), "--minify", join(BUILD, "entry.ts"), "--outfile", join(OUT, name)]);
    out.push(name);
  }
}

// 4. checksums
const files = readdirSync(OUT).filter((f) => /^(blockwise-.*)$/.test(f) && statSync(join(OUT, f)).isFile()).sort();
const sums = files.map((f) => `${createHash("sha256").update(readFileSync(join(OUT, f))).digest("hex")}  ${f}`);
writeFileSync(join(OUT, "SHA256SUMS"), sums.join("\n") + "\n");
rmSync(STAGE, { recursive: true, force: true }); rmSync(BUILD, { recursive: true, force: true });
for (const f of files) console.log(`${String(statSync(join(OUT, f)).size).padStart(10)}  ${f}`);
console.log(sums.join("\n"));
