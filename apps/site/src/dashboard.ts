import { L } from "./layout";
export function dashboard(): string {
  return `<section class="hero"><div class="wrap">
<p class="lab kicker">${L("Dashboard", "仪表盘")}</p>
<h1 style="max-width:18ch">${L("The instrument, replaying a real run.", "仪表，回放一次真实运行。")}</h1>
<p class="lede">${L("This is the actual web app, not a mock-up. It replays the recorded Monad testnet run from a file; nothing here is live and no wallet is involved.", "这是真实的网页应用，不是示意图。它从文件回放记录的 Monad 测试网运行；这里没有实时数据，也不涉及钱包。")}</p>
<div class="device"><div class="bar"><i></i><i></i><i></i><span style="margin-left:8px">blockwise / replay · testnet-run-2.jsonl</span></div>
<iframe src="/dashboard/app.html" title="Blockwise dashboard (replay)" loading="lazy"></iframe></div>
<div class="notes">
 <div><b>${L("The grid", "网格")}</b>${L("Every candidate of the current generation as it lands. Reverted and lost transactions are shown, not hidden.", "当前一代的每个候选在落块时的状态。回滚和丢失的交易会显示，而不是隐藏。")}</div>
 <div><b>${L("The champion", "冠军")}</b>${L("Dev, confirm and sealed side by side, with the transaction on the explorer.", "开发、确认、封存并排显示，并附浏览器中的交易。")}</div>
 <div><b>${L("The honest panel", "诚实面板")}</b>${L("What the run may not claim: a replay is not a new run, the judge is a stand-in, the series is synthetic.", "这次运行不得声称的内容：回放不是新运行，评审是替身，序列是合成的。")}</div>
</div>
<p class="cap"><a href="/dashboard/app.html">${L("Open the dashboard on its own page", "在独立页面打开仪表盘")}</a></p>
</div></section>`;
}
