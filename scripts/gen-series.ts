// Generates data/series/v1.json (deterministic from the committed seed). Run: bun run gen:series
import { DEFAULT_CONFIG, generateSeries } from "../packages/core/src/series";
import { createHash } from "node:crypto";

const s = generateSeries(DEFAULT_CONFIG);
const body = JSON.stringify(s, null, 2) + "\n";
const sha256 = createHash("sha256").update(JSON.stringify(s.returns)).digest("hex");
await Bun.write("data/series/v1.json", body);
console.log(`wrote data/series/v1.json  n=${s.n} devEnd=${s.devEnd} confirmEnd=${s.confirmEnd}  returns sha256=${sha256}`);
