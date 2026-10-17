// Usage: bun run --cwd apps/web dev [--port 5173]  -> serves dist/ on http://localhost:5173 (build first with --replay).
import { resolve } from "node:path";
const root = resolve(import.meta.dir, "../dist");
const pi = process.argv.indexOf("--port");
const port = pi > 0 ? Number(process.argv[pi + 1]) : 5173;
Bun.serve({ port, async fetch(req) {
  const u = new URL(req.url);
  const f = Bun.file(resolve(root, u.pathname === "/" ? "index.html" : "." + u.pathname));
  return (await f.exists()) ? new Response(f) : new Response(Bun.file(resolve(root, "index.html")));
} });
console.log(`blockwise dashboard: http://localhost:${port}/  (?lang=zh, ?live=http://localhost:8787)`);
