// `report --md`: the same Report as markdown, for pasting into a README or a PR. Pure; no I/O.
import { signed } from "./state";
import type { Report } from "./report";

export function formatReportMd(r: Report): string {
  const L: string[] = [];
  L.push(`# Blockwise run report`, "", `Source: \`${r.file}\` (${r.events} events)`, "");
  const ru = r.run;
  L.push("| | |", "|---|---|");
  L.push(`| mode | ${ru.mode ?? "unknown"}${ru.model ? `, judge ${ru.model}` : ""} |`);
  L.push(`| chain | ${ru.chainId ?? "unknown"}${ru.epoch ? `, epoch \`${ru.epoch.slice(0, 10)}..${ru.epoch.slice(-4)}\`` : ""} |`);
  L.push(`| generations | ${ru.generationsComplete}${ru.generationsPlanned ? ` of ${ru.generationsPlanned}` : ""} complete${ru.perGeneration ? `, ${ru.perGeneration} planned each` : ""} |`, "");
  L.push("## Champion (bp)", "");
  const c = r.champion;
  if (!c) L.push("None.");
  else {
    L.push("| candidate | dev | confirm | sealed |", "|---|---:|---:|---:|");
    L.push(`| gen ${c.gen}, idx ${c.idx} | ${signed(c.dev ?? undefined)} | ${signed(c.confirm ?? undefined)} | ${c.sealed === null ? "not opened" : signed(c.sealed)} |`);
    if (c.url) L.push("", `Transaction: ${c.url}`);
  }
  L.push("", "## What we may claim", "", ...r.claims.map((x) => `- ${x}`));
  L.push("", "## What we may not claim", "", ...r.notClaimed.map((x) => `- ${x}`));
  if (r.judge.predictions) L.push("", "## Judge", "", `- ${r.judge.predictions} predictions, model ${r.judge.model ?? "unknown"}, cost $${r.judge.usd.toFixed(4)}${r.judge.brier !== null ? `, Brier ${r.judge.brier.toFixed(4)} vs base rate ${r.judge.brierBaseline?.toFixed(4)}` : ""}.`);
  if (r.errors.length) L.push("", `## Errors seen (${r.errors.length})`, "", ...r.errors.slice(0, 10).map((e) => `- ${e.scope}: ${e.message}`));
  return L.join("\n") + "\n";
}
