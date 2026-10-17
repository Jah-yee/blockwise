// Event stream contract: orchestrator -> web, and the replay (JSONL) format. Human-readable copy: docs/architecture.md section 5.

export type Operator = 0 | 1 | 2 | 3; // random, mutate, crossover, sweep
export const OPERATOR_NAMES = ["random", "mutate", "crossover", "sweep"] as const;

export type Authority = "shadow" | "advisory" | "delegated";
export type ModelKind = "jev" | "stand-in" | "none";

export interface Ref { gen: number; idx: number }

export type BlockwiseEvent =
  | {
      type: "hello";
      epoch: string;
      chainId: number;
      contracts: { evaluator: string; ledger: string; judgeLog?: string };
      config: { n: number; devEnd: number; confirmEnd: number; workers: number; perGeneration: number; generations: number };
      mode: "live" | "replay";
      model: ModelKind;
      explorer: string; // base URL for tx/block links
    }
  | { type: "generation_start"; gen: number; planned: number; allocation: { operator: Operator; count: number }[] }
  | { type: "tx_sent"; gen: number; idx: number; operator: Operator; parent?: Ref; wallet: string; txHash: string; params: number[] }
  | {
      type: "tx_landed";
      gen: number; idx: number; txHash: string; block: number;
      status: "success" | "reverted" | "lost";
      dev?: number; trades?: number; gasUsed?: number; latencyMs?: number;
    }
  | { type: "block"; number: number; ts: number; evalsLanded: number }
  | {
      type: "generation_end";
      gen: number;
      best: { idx: number; dev: number; params: number[] };
      archive: { gen: number; idx: number; dev: number; params: number[] }[];
      bandit: Record<string, number>;
      blocks: { first: number; last: number; span: number; histogram: Record<string, number> };
    }
  | { type: "confirm"; gen: number; idx: number; score: number; trades: number; txHash: string }
  | { type: "sealed"; gen: number; idx: number; dev: number; confirm: number; score: number; trades: number; txHash: string }
  | { type: "judge"; gen: number; idx: number; threshold: number; pBps: number; latencyMs: number; usd: number; model: ModelKind }
  | { type: "calibration"; n: number; brier: number; brierBaseline: number; authority: Authority }
  | { type: "baseline"; gen: number; bestRandom1x: number; bestRandom2xMedian: number; seeds: number }
  | {
      type: "map";
      gen: number;
      cells: { style: "reversion" | "neutral" | "momentum"; activity: "low" | "mid" | "high"; elite: { gen: number; idx: number; dev: number } | null; label: "young" | "leader" | "riser" | "stalled" }[];
      discovery: Record<string, number>;
      diagnostics: { ruggedness: number | null; plateau: number; duplicates: number };
      ceilingProxy?: { dev: number; confirm: number; sealed: number; evals: number };
    }
  | { type: "allocation"; wallet: string; agent: Ref | null; amount: string; txHash: string; funded: { total: string; byAgent: Record<string, string> } }
  | { type: "totals"; evals: number; reverted: number; lost: number; gasMon: number; jevUsd: number; blocksSpanned: number }
  | { type: "error"; scope: string; message: string };

export type EventType = BlockwiseEvent["type"];
