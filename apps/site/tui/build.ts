// Builds apps/site/dist/tui/index.html: one self-contained page that replays fixtures/testnet-run-2.jsonl in a simulated terminal.
// The frames are drawn in the browser by the real TUI renderer (bundled from apps/orchestrator/src/tui, which imports nothing from node).
// Usage: bun run apps/site/tui/build.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const HERE = import.meta.dir;
const ROOT = join(HERE, "../../..");
const OUT = join(ROOT, "apps/site/dist/tui/index.html");

/** Keep what the renderer reads; drop genome params, archives and per-call judge payloads (the page only counts judge calls). */
function slim(e: Record<string, unknown>): Record<string, unknown> {
  const o = { ...e };
  if (o.type === "generation_end") { delete o.archive; if (o.best && typeof o.best === "object") { const b = { ...(o.best as object) } as Record<string, unknown>; delete b.params; o.best = b; } }
  if (o.type === "judge") return { type: "judge", usd: o.usd, t: o.t };
  delete o.params;
  return o;
}

const lines = readFileSync(join(ROOT, "fixtures/testnet-run-2.jsonl"), "utf8").split("\n").filter(Boolean);
const events = lines.map((l) => slim(JSON.parse(l)));
const data = JSON.stringify(events).replace(/</g, "\\u003c");

const built = await Bun.build({
  entrypoints: [join(HERE, "client.ts")], target: "browser", format: "iife", minify: true,
  define: { __EVENTS__: "window.__EVENTS__" },
});
if (!built.success) { for (const m of built.logs) console.error(m); process.exit(1); }
const script = (await built.outputs[0]!.text()).replace(/<\/script/gi, "<\\/script");

const html = readFileSync(join(HERE, "page.html"), "utf8").replace("{{DATA}}", () => data).replace("{{SCRIPT}}", () => script);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log(`wrote ${OUT} (${(html.length / 1024).toFixed(0)} KB, ${events.length} events)`);
