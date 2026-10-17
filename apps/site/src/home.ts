import { L, GITHUB } from "./layout";
import { fmt, sgn, type Stats } from "./data";

const hist = (s: Stats) => {
  const h = s.gens[0].hist, max = Math.max(...h), W = 520, H = 190, bw = 46, gap = (W - 40 - h.length * bw) / (h.length - 1);
  const bars = h.map((v, i) => {
    const x = 20 + i * (bw + gap), bh = Math.round((v / max) * 120), y = 140 - bh;
    return `<rect class="acc" x="${x.toFixed(1)}" y="${y}" width="${bw}" height="${bh}"/><text x="${(x + bw / 2).toFixed(1)}" y="${y - 6}" text-anchor="middle">${v}</text><text x="${(x + bw / 2).toFixed(1)}" y="160" text-anchor="middle">+${i}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Generation 1: ${s.perGeneration} evaluations landed across ${h.length} consecutive blocks, ${h.join(", ")} per block"><line class="mute-s" x1="14" y1="140" x2="${W - 10}" y2="140"/>${bars}<text x="20" y="183">${L("block offset from", "区块偏移，起点")} ${fmt(s.gens[0].first)}</text></svg>`;
};

const dots = (cols: number, rows: number, hot: number[]) => {
  let o = "";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const i = r * cols + c; o += `<circle cx="${14 + c * 22}" cy="${14 + r * 22}" r="5" class="${hot.includes(i) ? "acc" : "mute"}"/>`; }
  return o;
};

const d1 = `<svg viewBox="0 0 180 96" aria-hidden="true">${dots(8, 4, [3, 12, 21, 30])}</svg>`;
const d2 = (s: Stats) => { const h = s.gens[0].hist, m = Math.max(...h); return `<svg viewBox="0 0 180 96" aria-hidden="true"><line class="mute-s" x1="6" y1="84" x2="174" y2="84"/>${h.map((v, i) => { const bh = Math.round(v / m * 66); return `<rect class="acc" x="${10 + i * 20.5}" y="${84 - bh}" width="14" height="${bh}"/>`; }).join("")}</svg>`; };
const d3 = `<svg viewBox="0 0 180 96" aria-hidden="true">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<circle cx="${14 + i * 10}" cy="18" r="3.5" class="${i === 4 ? "acc" : "mute"}"/>`).join("")}<path class="mute-s" d="M10 30 L170 30 L112 62 L72 62 Z"/><circle cx="92" cy="76" r="6" class="acc"/><text x="112" y="80">1</text></svg>`;
const d4 = `<svg viewBox="0 0 180 96" aria-hidden="true"><rect class="mute" x="8" y="30" width="96" height="22"/><rect fill="var(--accent-t)" x="104" y="30" width="30" height="22"/><rect class="acc" x="134" y="30" width="30" height="22"/><text x="8" y="68">dev</text><text x="104" y="68">conf</text><text x="134" y="84">sealed</text><path class="ink" d="M149 26 v-8"/><text x="152" y="16">1×</text></svg>`;

export function home(s: Stats, thumbs: Record<string, boolean>): string {
  const c = s.champ!;
  const tx = `${s.explorer}/tx/${c.sealedTx}`;
  const ladderMax = Math.max(c.dev, c.confirm, c.sealed);
  const h = (v: number) => `${Math.round((v / ladderMax) * 140)}px`;
  const shot = (k: string, label: string) => thumbs[k] ? `<img src="/assets/thumb-${k}.png" alt="${label} screenshot" loading="lazy">` : `<span class="ph">${label}</span>`;
  const faq: [string, string, string, string][] = [
    ["Why is the judge on a blockchain? A laptop scores seven integers in microseconds.", "为什么把评审放在区块链上？笔记本几微秒就能给七个整数打分。",
     "It is not faster, and we do not claim it is. Three other things are true: only the bound Evaluator can write the Ledger, so “whoever proposes does not score” is a permission anyone can check; the evidence is public and ordered; and a generation of evaluations is a measurable demonstration of Monad’s parallel execution.",
     "它并不更快，我们也没有这样声称。成立的是另外三点：只有绑定的 Evaluator 能写入 Ledger，所以“提议者不评分”是任何人都能检查的权限；证据公开且有序；一代评估本身就是对 Monad 并行执行的可度量展示。"],
    ["Are the strategies profitable?", "这些策略赚钱吗？",
     "No claim. The series is synthetic, the family is seven integers, costs are a fixed 3 bp, and the money is test MON. The point is the process and its honesty, including the sealed score shown next to dev.",
     "不作任何声称。序列是合成的，策略族只有七个整数，成本固定为 3 个基点，资金是测试 MON。重点是流程及其诚实，包括把封存分数放在开发分数旁边。"],
    ["Is the sealed segment secret?", "封存段是秘密吗？",
     "No. It is on a public chain. “Look once” means one recorded look per candidate, not secrecy. Commit-reveal is on the roadmap; until then do not read the sealed score as a secret held-out test.",
     "不是。它在公开链上。“只看一次”指每个候选只有一次被记录的查看，而不是保密。承诺-揭示方案在路线图上；在此之前，请不要把封存分数当作保密的留出测试。"],
    ["Does the colony beat random search?", "群体搜索能胜过随机搜索吗？",
     "Not in our offline benchmark. Over 12 seeds the portfolio beat random 2x on the sealed segment in 1 of 12 paired seeds (median sealed 179 against 220). The space is seven integers, and random search is hard to beat in it. We report it as a null result.",
     "在我们的离线基准中没有。12 个种子里，组合策略在封存段上只有 1 次胜过 2 倍预算的随机搜索（封存分数中位数 179 对 220）。空间只有七个整数，随机搜索很难被击败。我们把它作为零结果报告。"],
    ["What does the Jev judge do here?", "Jev 评审在这里做什么？",
     "It is a shadow judge: it predicts whether a candidate will beat the current best, and the prediction is scored afterwards. In every recorded run on this site the judge is a labelled deterministic stand-in, so nothing here says anything about Jev. Jev Trader itself has no contracts, no subagents and no allocation; we do not speak for it.",
     "它是影子评审：预测候选是否会超过当前最佳，事后给预测打分。本站所有记录的运行里，评审都是明确标注的确定性替身，所以这里的任何内容都不代表 Jev。Jev Trader 本身没有合约、没有子代理、没有资金分配；我们不代表它发言。"],
    ["Can I put real money behind a strategy?", "我能为某个策略投入真钱吗？",
     "No. Funding is a tested escrow that is not deployed, and any return shown is virtual, computed from a synthetic series. Real funds would need a real market, settlement, an independent audit and risk limits. Those are roadmap items, not promises.",
     "不能。资金托管合约经过测试但尚未部署，所展示的收益均为虚拟，由合成序列计算。真实资金需要真实市场、结算、独立审计和风险限额，这些是路线图项目，而不是承诺。"],
  ];
  const road: [string, string, string, string, boolean][] = [
    ["now", "Contracts on testnet, parallel landing measured, sealed look reported, replay terminal and dashboard.", "合约已部署测试网，并行落块已测量，封存结果已报告，提供回放终端和仪表盘。", "", true],
    ["v0.2", "Honest statistics: benchmark harness with 20+ seeds, leave-one-operator-out, shuffled-series negative control.", "诚实统计：20 个以上种子的基准、逐个去除算子、打乱序列的负对照。", "", false],
    ["v0.3", "Commit-reveal for the sealed segment, so that it is actually sealed.", "封存段采用承诺-揭示，使其真正被封存。", "", false],
    ["v0.4", "Judges earn authority through measured calibration, not by default.", "评审通过可度量的校准获得权限，而非默认拥有。", "", false],
    ["v0.5+", "Real return series, an agent proposer, an arena in dry-run. Real funds only after a market, an audit and risk limits.", "真实收益序列、智能体提议者、干跑竞技场。只有在有市场、审计和风险限额之后才考虑真实资金。", "", false],
  ];

  return `
<section class="hero"><div class="wrap">
<p class="lab kicker">${L("Open lab notebook · Monad testnet", "公开实验记录 · Monad 测试网")}</p>
<h1>${L("A lab bench for trading strategies.", "交易策略的实验台。")}</h1>
<p class="lede">${L("Hundreds of candidates are scored in parallel, in a few Monad blocks, by an on-chain contract the searcher cannot touch. The held-out result is reported even when it is bad.",
  "数百个候选策略，在几个 Monad 区块内，由搜索者无法触碰的链上合约并行打分。留出集的结果，即使很差，也照样报告。")}</p>
<div class="stats" role="list">
 <div class="stat" role="listitem"><span class="lab">${L("Evaluations landed", "已落块评估")}</span><span class="big">${fmt(s.landed)}<small> / ${fmt(s.sent)}</small></span><p>${L(`${s.generations} generations of ${s.perGeneration}, ${s.wallets} wallets. ${s.lost} lost, counted.`, `${s.generations} 代，每代 ${s.perGeneration} 个，${s.wallets} 个钱包。丢失 ${s.lost} 个，已计入。`)}</p></div>
 <div class="stat" role="listitem"><span class="lab">${L("Blocks per generation", "每代区块数")}</span><span class="big">${s.medianSpan}<small> ${L("median", "中位数")}</small></span><p>${L(`Generation 1: ${s.perGeneration} in ${s.gens[0].span} blocks. Generations ${s.spreadGens.map((g) => g.gen).join(" and ")} spread over ${s.spreadGens.map((g) => g.span).join(" and ")} blocks.`, `第 1 代：${s.perGeneration} 个在 ${s.gens[0].span} 个区块内。第 ${s.spreadGens.map((g) => g.gen).join("、")} 代分散在 ${s.spreadGens.map((g) => g.span).join("、")} 个区块。`)}</p></div>
 <div class="stat" role="listitem"><span class="lab">${L("Champion: dev → confirm → sealed", "冠军：开发 → 确认 → 封存")}</span><span class="big trio">${sgn(c.dev)}<small> → </small>${sgn(c.confirm)}<small> → </small>${sgn(c.sealed)}</span><p>${L("Score in basis points on a synthetic series. It falls at each look.", "合成序列上的分数，单位为基点。每次查看都在下降。")}</p></div>
</div>
<p class="cap">${L(`Computed at build time from <code>fixtures/testnet-run-2.jsonl</code>, a recorded run on Monad testnet (chain ${s.chainId}). A replay is not a new run, one run is one seed, and the judge in it is a stand-in.`,
  `构建时由 <code>fixtures/testnet-run-2.jsonl</code> 计算，这是 Monad 测试网（链 ${s.chainId}）上的一次记录运行。回放不是新的运行，一次运行只是一个种子，其中的评审是替身。`)}</p>
</div></section>

<section id="how"><div class="wrap">
<p class="lab kicker">${L("How it works", "工作方式")}</p>
<h2>${L("Four steps, and the searcher touches none of the scoring.", "四个步骤，搜索者不碰任何评分。")}</h2>
<ol class="steps">
 <li><span class="n">01</span>${d1}<h3>${L("Propose", "提议")}</h3><p>${L("Operators (random, mutate, crossover, sweep) emit candidates: seven integers each. A bandit shifts effort toward operators that earn credit.", "算子（随机、变异、交叉、扫描）产生候选，每个是七个整数。多臂老虎机把精力转向有贡献的算子。")}</p></li>
 <li><span class="n">02</span>${d2(s)}<h3>${L("Score in parallel", "并行打分")}</h3><p>${L("Each candidate is a transaction to the Evaluator contract, which scores it on the dev segment and writes the Ledger. The proposer cannot write a score.", "每个候选是发给 Evaluator 合约的一笔交易，合约在开发段上打分并写入 Ledger。提议者无法写入分数。")}</p></li>
 <li><span class="n">03</span>${d3}<h3>${L("Confirm", "确认")}</h3><p>${L("The best of each generation is scored again on a second segment it was not tuned on. Many candidates in, one champion out.", "每代最佳者在未经调参的第二段上再次打分。多个候选进入，一个冠军产出。")}</p></li>
 <li><span class="n">04</span>${d4}<h3>${L("Seal, once", "封存，仅一次")}</h3><p>${L("The champion gets one recorded look at the sealed segment. The number is reported whatever it is.", "冠军只在封存段上有一次被记录的查看。无论结果如何，数字都会被报告。")}</p></li>
</ol>
</div></section>

<section id="chain"><div class="wrap">
<p class="lab kicker">${L("What the chain gives you", "链提供了什么")}</p>
<h2>${L(`${s.perGeneration} evaluations in ${s.gens[0].span} blocks.`, `${s.gens[0].span} 个区块内完成 ${s.perGeneration} 次评估。`)}</h2>
<div class="two">
 <div>
  <p>${L(`In generation 1 of the recorded run, ${s.perGeneration} evaluation transactions from ${s.wallets} wallets landed across ${s.gens[0].span} consecutive blocks, ${fmt(s.gens[0].first)} to ${fmt(s.gens[0].last)}. Parallel execution is what makes a whole generation a single short event.`, `在记录运行的第 1 代中，来自 ${s.wallets} 个钱包的 ${s.perGeneration} 笔评估交易，落在 ${s.gens[0].span} 个连续区块内，区块 ${fmt(s.gens[0].first)} 至 ${fmt(s.gens[0].last)}。并行执行使得整整一代成为一个短暂的事件。`)}</p>
  <p>${L(`Not every generation was that tidy. Generations ${s.spreadGens.map((g) => g.gen).join(" and ")} spread over ${s.spreadGens.map((g) => g.span).join(" and ")} blocks, and we show them as they happened.`, `并非每一代都这么整齐。第 ${s.spreadGens.map((g) => g.gen).join("、")} 代分散在 ${s.spreadGens.map((g) => g.span).join("、")} 个区块，我们如实展示。`)}</p>
  <p><b>${L("A Monad detail that matters:", "一个重要的 Monad 细节：")}</b> ${L(`gas is charged on the limit, not on gas used. Receipts report <code>gasUsed</code> equal to the limit${s.gasUsedAllEqual ? `: all ${fmt(s.landed)} receipts in this run say ${fmt(s.gasUsedValues[0])}` : ""}. A receipt is therefore not a measurement; the cost of one <code>evaluate</code> was taken from <code>eth_estimateGas</code> (about 177k to 183k) and Foundry (145k).`, `Gas 按限额而非实际用量收费。收据里的 <code>gasUsed</code> 等于限额${s.gasUsedAllEqual ? `：本次运行全部 ${fmt(s.landed)} 张收据都是 ${fmt(s.gasUsedValues[0])}` : ""}。因此收据不是测量值；一次 <code>evaluate</code> 的成本取自 <code>eth_estimateGas</code>（约 177k 至 183k）与 Foundry（145k）。`)}</p>
 </div>
 <figure class="fig">${hist(s)}<figcaption class="cap">${L("Evaluations landed per block, generation 1. The bars are the fixture’s own histogram.", "第 1 代每个区块落块的评估数。柱状图直接取自样本的直方图。")}</figcaption></figure>
</div>
</div></section>

<section id="results"><div class="wrap">
<p class="lab kicker">${L("Honest results", "诚实的结果")}</p>
<h2>${L("The number falls at every look. That is the point.", "每次查看，数字都在下降。这正是重点。")}</h2>
<div class="ladder" role="img" aria-label="Champion scores: dev ${c.dev}, confirm ${c.confirm}, sealed ${c.sealed} basis points">
 <div class="rung dev"><span class="v">${sgn(c.dev)}</span><div class="bar" style="--h:${h(c.dev)}"></div><span class="k">dev</span></div>
 <div class="rung conf"><span class="v">${sgn(c.confirm)}</span><div class="bar" style="--h:${h(c.confirm)}"></div><span class="k">confirm</span></div>
 <div class="rung"><span class="v">${sgn(c.sealed)}</span><div class="bar" style="--h:${h(c.sealed)}"></div><span class="k">sealed</span></div>
</div>
<p class="cap">${L(`Generation ${c.gen}, candidate ${c.idx}. The sealed look is <a href="${tx}" rel="noopener">on chain</a>.`, `第 ${c.gen} 代，候选 ${c.idx}。封存查看<a href="${tx}" rel="noopener">在链上</a>。`)}</p>
<ul class="facts">
 <li class="pass"><span class="tag pass">${L("Pass", "通过")}</span><strong>${L("Positive sealed score", "封存分数为正")}</strong>${L(`${sgn(c.sealed)} bp after ${c.sealedTrades} trades on the sealed segment. Small, on a short and noisy segment.`, `封存段上 ${c.sealedTrades} 笔交易后为 ${sgn(c.sealed)} 个基点。数值很小，而且封存段短、噪声大。`)}</li>
 <li class="overfit"><span class="tag overfit">${L("Overfit", "过拟合")}</span><strong>${L("Dev overstates by about 3.5x", "开发分数高估约 3.5 倍")}</strong>${L(`${sgn(c.dev)} on dev fell to ${sgn(c.sealed)} sealed. Selecting the best of ${fmt(s.sent)} on dev inflates dev.`, `开发分 ${sgn(c.dev)} 在封存时降到 ${sgn(c.sealed)}。在开发段上从 ${fmt(s.sent)} 个里挑最佳，会抬高开发分。`)}</li>
 <li class="revert"><span class="tag revert">${L("Revert", "回滚")}</span><strong>${L("72 first-run confirm reverts", "首次运行 72 次确认回滚")}</strong>${L("In the first run, 72 of 1,068 evaluation transactions reverted at confirm, so no champion was chosen and the sealed look was not spent. The cause was the gas limit, which is fixed in this run.", "首次运行中，1,068 笔评估交易里有 72 笔在确认阶段回滚，因此没有选出冠军，封存查看也没有使用。原因是 gas 限额，本次运行已修复。")}</li>
 <li class="overfit"><span class="tag overfit">${L("Null result", "零结果")}</span><strong>${L("The colony did not beat random 2x", "群体没有胜过 2 倍随机")}</strong>${L("Offline, 12 seeds: portfolio median sealed 179, random 1x 216, random 2x 220. It won 1 of 12 paired seeds. Random search is hard to beat in seven integers.", "离线 12 个种子：组合策略封存中位数 179，随机 1 倍 216，随机 2 倍 220。配对种子里只赢了 1 次。七个整数的空间里，随机搜索很难被超越。")}</li>
 <li><span class="tag">${L("Stand-in", "替身")}</span><strong>${L("The Jev judge is a labelled stand-in", "Jev 评审是标注的替身")}</strong>${L(`The recorded run says <code>model: ${s.judgeModel}</code>. Jev’s calibration is unmeasured. Jev Trader itself has no contracts, no subagents and no allocation.`, `记录的运行显示 <code>model: ${s.judgeModel}</code>。Jev 的校准未测量。Jev Trader 本身没有合约、子代理和资金分配。`)}</li>
 <li><span class="tag">${L("Scope", "范围")}</span><strong>${L("One run, one seed", "一次运行，一个种子")}</strong>${L("The series is synthetic, and the sealed segment is public. Nothing here is evidence about a real market.", "序列是合成的，封存段是公开的。这里没有任何关于真实市场的证据。")}</li>
</ul>
</div></section>

<section id="inputs"><div class="wrap">
<p class="lab kicker">${L("Inputs and outputs", "输入与输出")}</p>
<h2>${L("What goes in, what comes back.", "输入什么，返回什么。")}</h2>
<div class="scroll-x"><table class="tbl">
<thead><tr><th>${L("Item", "项目")}</th><th class="m">${L("Value", "取值")}</th><th>${L("Meaning", "含义")}</th></tr></thead><tbody>
<tr><td>${L("Candidate", "候选")}</td><td class="m">7 integers</td><td>${L("A strategy from a deliberately tiny grammar. Out-of-range values revert; they are never clamped.", "来自刻意缩小的语法的策略。超出范围的值会回滚，从不截断。")}</td></tr>
<tr><td>${L("Dev segment", "开发段")}</td><td class="m">0–${s.config.devEnd - 1}</td><td>${L("Scored by the whole search. Many looks.", "整个搜索过程都在使用。可多次查看。")}</td></tr>
<tr><td>${L("Confirm segment", "确认段")}</td><td class="m">${s.config.devEnd}–${s.config.confirmEnd - 1}</td><td>${L("Scored for each generation’s best candidate.", "为每代最佳候选打分。")}</td></tr>
<tr><td>${L("Sealed segment", "封存段")}</td><td class="m">${s.config.confirmEnd}–${s.config.n - 1}</td><td>${L("One recorded look per candidate, on a public chain.", "每个候选一次被记录的查看，位于公开链上。")}</td></tr>
<tr><td>${L("Cost", "成本")}</td><td class="m">3 bp</td><td>${L("Fixed per-trade cost.", "固定的单笔交易成本。")}</td></tr>
<tr><td>${L("Output", "输出")}</td><td class="m">score (bp), trades</td><td>${L("Written to the Ledger by the Evaluator, the only account allowed to write.", "由 Evaluator 写入 Ledger；只有它被允许写入。")}</td></tr>
<tr><td>${L("Chain", "链")}</td><td class="m">Monad testnet, ${s.chainId}</td><td>${L("Evaluator, Ledger and JudgeLog are deployed; addresses are in the README.", "Evaluator、Ledger、JudgeLog 已部署；地址见 README。")}</td></tr>
</tbody></table></div>
</div></section>

<section id="try"><div class="wrap">
<p class="lab kicker">${L("Try it", "试一试")}</p>
<h2>${L("Three ways to look at the same run.", "用三种方式查看同一次运行。")}</h2>
<div class="cards">
 <a class="card" href="/dashboard/"><div class="shot">${shot("dashboard", "Dashboard")}</div><div class="body"><h3>${L("Dashboard", "仪表盘")}</h3><p>${L("The real web view, replaying the recorded run: grid, champion, honest panel.", "真实的网页视图，回放记录的运行：网格、冠军、诚实面板。")}</p><span class="go">${L("Open →", "打开 →")}</span></div></a>
 <a class="card" href="/tui/"><div class="shot">${shot("tui", "Terminal")}</div><div class="body"><h3>${L("Terminal", "终端")}</h3><p>${L("The terminal instrument, from a recording.", "来自录像的终端仪表。")}</p><span class="go">${L("Open →", "打开 →")}</span></div></a>
 <a class="card" href="/simulator/"><div class="shot">${shot("sim", "Simulator")}</div><div class="body"><h3>${L("Simulator", "模拟器")}</h3><p>${L("A live simulation you can run in the browser.", "可在浏览器中运行的实时模拟。")}</p><span class="go">${L("Open →", "打开 →")}</span></div></a>
</div>
</div></section>

<section id="install"><div class="wrap">
<p class="lab kicker">${L("Install the CLI", "安装命令行")}</p>
<h2>${L("Watch a replay in your terminal. No wallet needed.", "在终端回放，无需钱包。")}</h2>
<div class="two">
 <div>
  <p>${L("The CLI ships as an npm tarball (needs Bun 1.1 or later) and as a single-file binary. Build either from the repository with <code>pack</code>.", "命令行以 npm 压缩包（需要 Bun 1.1 及以上）和单文件二进制两种形式提供。在仓库里用 <code>pack</code> 构建。")}</p>
  <p>${L("The Jev judge is optional. Without a key everything works and every surface says <code>stand-in</code>. To use Jev, set <code>TYPESAFE_AI_API_KEY</code>; see <a href=\"" + GITHUB + "/blob/main/docs/jev-key.md\">docs/jev-key.md</a>. The key is read from the environment and never written to config.", "Jev 评审是可选的。没有密钥时一切照常运行，各处都显示 <code>stand-in</code>。要使用 Jev，请设置 <code>TYPESAFE_AI_API_KEY</code>，见 <a href=\"" + GITHUB + "/blob/main/docs/jev-key.md\">docs/jev-key.md</a>。密钥从环境变量读取，绝不写入配置。")}</p>
 </div>
 <pre><code># from a clone of the repository
bun install
bun run --cwd apps/orchestrator pack
npm i --ignore-scripts ./apps/orchestrator/dist-pack/blockwise-cli-0.1.0.tgz

# replay the recorded run
blockwise watch --replay fixtures/testnet-run-2.jsonl

# optional: real Jev judge
export TYPESAFE_AI_API_KEY=...
blockwise run --judge jev --yes</code></pre>
</div>
</div></section>

<section id="faq"><div class="wrap">
<p class="lab kicker">FAQ</p>
<h2>${L("Objections we expect.", "我们预期的质疑。")}</h2>
<div class="narrow" style="margin-top:32px;max-width:76ch">
${faq.map(([qe, qz, ae, az]) => `<details><summary>${L(qe, qz)}</summary><p>${L(ae, az)}</p></details>`).join("")}
</div>
</div></section>

<section id="roadmap"><div class="wrap">
<p class="lab kicker">${L("Roadmap", "路线图")}</p>
<h2>${L("What is done, and what is only planned.", "已完成的，与仅在计划中的。")}</h2>
<ul class="road">${road.map(([v, e, z, , d]) => `<li class="${d ? "done" : ""}"><b>${v}</b>${L(e, z)}</li>`).join("")}</ul>
<div class="limits"><p><b>${L("Limits, repeated.", "再次强调局限。")}</b> ${L("Testnet play money. Synthetic return series. One run, one seed. A stand-in judge. A public sealed segment. The colony did not beat random 2x offline. No investment advice.", "测试网的游戏币。合成收益序列。一次运行，一个种子。替身评审。公开的封存段。群体在离线测试中没有胜过 2 倍随机。不构成投资建议。")}</p></div>
</div></section>
`;
}
