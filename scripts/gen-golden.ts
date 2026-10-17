// Golden vectors for TS <-> Solidity conformance. Run: bun run gen:golden  (after gen:series)
// Output: data/golden.json  { returns, devEnd, confirmEnd, cases: [{ spec, dev, devTrades, confirm, confirmTrades, sealed, sealedTrades }] }
import { mulberry32, int } from "../packages/core/src/rng";
import { W_MAX, W_MIN, THR_MAX } from "../packages/core/src/spec";
import { dev, confirm, sealed } from "../packages/core/src/strategy";

const series = await Bun.file("data/series/v1.json").json();
const roles = { devEnd: series.devEnd, confirmEnd: series.confirmEnd };
const rng = mulberry32(7);
const specs: number[][] = [
  [0, 0, 0, 0, 0, 0, 0],
  [W_MAX, W_MAX, W_MAX, W_MAX, W_MAX, W_MAX, 0],
  [W_MIN, W_MIN, W_MIN, W_MIN, W_MIN, W_MIN, THR_MAX],
  [10, 0, 0, 0, 0, 0, 100],
  [-10, 0, 0, 0, 0, 0, 100],
];
while (specs.length < 200) {
  const p = Array.from({ length: 6 }, () => int(rng, W_MIN, W_MAX));
  const thrBand = rng() < 0.7 ? 3000 : THR_MAX; // most specs trade; some are near-flat
  p.push(Math.floor(rng() * rng() * thrBand));
  specs.push(p);
}
const cases = specs.map((spec) => {
  const d = dev(spec, series.returns, roles), c = confirm(spec, series.returns, roles), s = sealed(spec, series.returns, roles);
  return { spec, dev: d.pnl, devTrades: d.trades, confirm: c.pnl, confirmTrades: c.trades, sealed: s.pnl, sealedTrades: s.trades };
});
await Bun.write("data/golden.json", JSON.stringify({ returns: series.returns, ...roles, cases }) + "\n");
console.log(`wrote data/golden.json with ${cases.length} cases`);
