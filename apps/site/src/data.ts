// Numbers shown on the site are computed here from fixtures/testnet-run-2.jsonl at build time.
import { readFileSync } from "node:fs";

export type Stats = {
  sent: number; landed: number; lost: number; distinctBlocks: number;
  gens: { gen: number; span: number; first: number; last: number; hist: number[] }[];
  medianSpan: number; spreadGens: { gen: number; span: number }[];
  gasUsedValues: number[]; gasUsedAllEqual: boolean;
  champ: { gen: number; idx: number; dev: number; confirm: number; sealed: number; sealedTrades: number; sealedTx: string } | null;
  confirmErrors: number; confirmsLanded: number; generations: number; perGeneration: number; wallets: number;
  config: any; contracts: any; explorer: string; chainId: number; judgeModel: string;
};

export function loadStats(path: string): Stats {
  const L = readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const by = (t: string) => L.filter((d) => d.type === t);
  const hello = by("hello")[0];
  const landed = by("tx_landed").filter((d) => d.status === "success");
  const gens = by("generation_end").map((g) => {
    const h = g.blocks.histogram as Record<string, number>;
    const keys = Object.keys(h).map(Number).sort((a, b) => a - b);
    return { gen: g.gen, span: g.blocks.span as number, first: g.blocks.first as number, last: g.blocks.last as number, hist: keys.map((k) => h[String(k)]) };
  });
  const spans = gens.map((g) => g.span).sort((a, b) => a - b);
  const median = spans[Math.floor(spans.length / 2) - 1] ?? spans[0];
  const gasVals = [...new Set(landed.map((d) => d.gasUsed))];
  const s = by("sealed")[0];
  return {
    sent: by("tx_sent").length, landed: landed.length, lost: by("tx_landed").filter((d) => d.status !== "success").length,
    distinctBlocks: new Set(landed.map((d) => d.block)).size, gens,
    medianSpan: median, spreadGens: gens.filter((g) => g.span > 20).map((g) => ({ gen: g.gen, span: g.span })),
    gasUsedValues: gasVals, gasUsedAllEqual: gasVals.length === 1,
    champ: s ? { gen: s.gen, idx: s.idx, dev: s.dev, confirm: s.confirm, sealed: s.score, sealedTrades: s.trades, sealedTx: s.txHash } : null,
    confirmErrors: by("error").filter((e) => e.scope === "confirm").length, confirmsLanded: by("confirm").length,
    generations: hello.config.generations, perGeneration: hello.config.perGeneration, wallets: hello.config.workers,
    config: hello.config, contracts: hello.contracts, explorer: hello.explorer, chainId: hello.chainId, judgeModel: hello.model,
  };
}
export const fmt = (n: number) => n.toLocaleString("en-US");
export const sgn = (n: number) => (n >= 0 ? "+" : "−") + Math.abs(n).toLocaleString("en-US");
