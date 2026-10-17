# Blockwise

**一群可以被资助的交易 agent，由链上合约裁判。**

[从这里开始](#从这里开始) · [它如何运作](#它如何运作) · [你会看到什么](#你会看到什么) · [验证](#验证) · [快速开始](#快速开始) · [文档](#文档) · [路线图](#路线图) · [English](README.md)

状态：**v0，为 Monad Blitz 上海站（2026-10-17）而建。** 只在测试网运行：测试币，无真实资金，不构成投资建议。合约能编译；尚未测试，也尚未部署（见 [surfaces](docs/surfaces.md)）。

> There is a tide in the affairs of men,
> Which, taken at the flood, leads on to fortune;
> Omitted, all the voyage of their life
> Is bound in shallows and in miseries.
> — 莎士比亚，《尤利乌斯·凯撒》第四幕第三场
>
> 乐观时变……趋时若猛兽挚鸟之发。
> — 司马迁，《史记·货殖列传》（白圭）

一个区块就是一次潮水。多数交易 agent 迎接它都太晚：事后回测，由提出策略的同一只手打分。
Blockwise 把一群小而便宜、会出错的 agent 放到潮水面前，由一份合约来记分。这份合约是唯一有权写账本的东西，所以没有任何 agent 能给自己打分。没有人把策略写下来：它们留下或被丢弃，取决于账本记载它们做过什么。
你也可以带一个钱包，把测试币放在你看好的 agent 身后。

"wise" 取两层意思：block-wise，一块一块地；也是审慎之意，这里的每一次裁决都出自一个无法被说服的东西。

## 从这里开始

| 我想 | 去 |
|---|---|
| 了解它是什么、为什么 | [提案](docs/proposal.md) · [FAQ](docs/faq.md) |
| 资助一个 agent（测试网） | [资助](#资助) · [架构 §3b](docs/architecture.md) |
| 了解这群 agent 如何搜索 | [它如何运作](#它如何运作) · [架构 §3a](docs/architecture.md) |
| 了解它坚持的原则 | [原则](docs/principles.md) |
| 知道哪些真的在运行、能信到什么程度 | [surfaces](docs/surfaces.md) |
| 理解各个部分、评分规格和事件流 | [架构](docs/architecture.md) · [合约](docs/contracts.md) |
| 使用 CLI 或终端界面 | [cli](docs/cli.md) · [tui](docs/tui.md) |
| 知道我们对 Monad 依赖什么、怎么验证 | [monad-notes](docs/monad-notes.md) |
| 了解 Jev、Jev Trader 与影子裁判 | [jev](docs/jev.md) |
| 看演示与屏幕 | [presentation](docs/presentation.md) |
| 一起开发 | [路线图](docs/roadmap.md) · [CONTRIBUTING](CONTRIBUTING.md) |

## 它如何运作

四类东西刻意分开：**提议**的、**裁判**的、**保管资金**的、**展示**的。

| | 自己运行的机器人（如 Jev Trader） | Blockwise |
|---|---|---|
| 谁来决策 | 一个模型，每块一次决策，没有记忆 | 一群小 agent；bandit 在它们的提议者之间分配精力；Jev 以*影子*裁判身份加入，直到校准度被测出 |
| 谁来裁判 | 机器人自己，或同一台机器上的脚本 | 提议者碰不到的合约；只有绑定的 Evaluator 能写 Ledger |
| 证据 | 日志 | 只追加、一次写入的 Ledger，记录结果与谱系，带 epoch，说明数据与规则 |
| 答案 | 一个最优 | 一张生态位地图，每个生态位保留自己的精英：多座山，而非一座 |
| 留出数据 | "我们测过了" | dev（多次看）→ confirm（一次）→ sealed（一生一次），并排展示 |
| 你的参与 | 自己运行，看着 | 你用测试币**资助** agent；资助影响下一代的父代；随时可以取回 |
| 失败 | 一个异常 | 正常结果：revert 与丢失的交易会被计数并展示 |
| 对 Monad 的说法 | "10,000 TPS" | 一代评估实际落在哪几个区块，显示在屏幕上，链接到浏览器 |

- **策略**是 7 个小整数：六个对近期收益的权重和一个阈值，小到能在 EVM 里评估。
- **裁判**用整数运算在冻结的收益序列上回放，把分数写进 Ledger。
- **一代**是几百次相互独立的 `evaluate` 调用，从许多钱包同时发出。Monad 并行执行互不冲突的交易，所以一代应当落在寥寥几个区块里。
  这是 [monad-notes](docs/monad-notes.md) 里的假设 A1：**尚未实测**。屏幕上显示的是实测值。
- **Jev**（System One 模型）在结果出现*之前*预测谁会赢，预测记在链上，结果出现后再记会被拒绝。它的权力靠校准度挣来，不是被授予的。

### 层：精力跟着证据走

精力靠"晋升"在层之间流动，不是预先指派。先做便宜的看，只让挣到资格的少数走到更稀少、更贵的那几次。

| 层 | 谁能进 | 代价 | 决定什么 |
|---|---|---|---|
| L0 探索 | 每个候选，每代几百个 | 一次 dev 评估 | 哪些生态位有希望；填充档案 |
| L1 确认 | 每个生态位的精英，各看一次 | 一次 confirm 评估 | 哪些精英能泛化 |
| L2 封存 | 冠军，仅一次 | 一次 sealed 查看 | 可以主张什么 |
| 资助 | *你*从 L1 幸存者里选的 agent | 托管中的测试币 | 影响哪些 agent 成为下一代的父代 |

### 地图

候选按两个粗略特征放到一张地图上：*风格*（权重之和的符号：动量、中性、反转）和*活跃度*（交易频率）。每个格子保留自己的最优者，即**精英**；结果是一组精英，而不是一个赢家。
提议者的预算按**发现率上的 Thompson 采样**分配（子代击败本格精英或开辟新格子即算一次发现），功劳沿谱系回传给产生祖先的算子，并设下限，避免任何算子被饿死。
生态位还会按它的**路径**（最优分数的速度与加速度）评价，只用来决定去哪里探索，绝不用来给答案排序。
我们不假设山顶存在。用 TypeScript 镜像做一次离线大搜索，得到**上限参照**，作为"离山顶还有多远"的高度计，并明确标为参照，不是证明。细节与数学：[架构 §3a](docs/architecture.md)。这些机制改编自 [ants](https://github.com/p-to-q/ants)。

### 资助

在 Monad 测试网上连接钱包，把测试币存入 `Allocator` 托管，再分配给 Ledger 里的 agent。

- **随时可取回。** 托管合约只会把钱付给存款人本人；没有资金池，没有锁定，也不会用别人的存款付款。
- **它起引导作用。** 被资助的 agent 按分配比例成为下一代的父代（占一代的有限比例）。
- **它给建议，你来签名。** 屏幕可以提出一个分配建议（泛化得更好的多分，每个 agent 有上限）；你签名之前什么都不会动。
- **它显示虚拟收益。** 分配额 × 该 agent 的留出分数，标注为*虚拟*：来自合成序列，没有任何支付，测试币也没有价值。
- **真实资金在路线图上，不在 v0。** 真钱需要真实市场、结算、审计和风控。在那之前，这只是测试网上的一个机制，文档里写得很清楚。

## 你会看到什么

一个屏幕，动起来的就是内容（[presentation](docs/presentation.md)）。**下面是计划中屏幕的示意，不是任何一次运行的输出：**

```
 Blockwise  ● live   block 71,750,141   epoch 0x3fa9…   [Jev: stand-in]   gen 6 / 10      wallet 0x7a…c1  funded 12.0
 ┌ population ─────────────────────┐  ┌ map: style × activity ───────────────────────┐
 │ ▒▒▓▓░░▒▒██▒░░▓▒▒░▓▓▒░▒▒▓░░▒▓▒▒░  │  │   low   mid   high    ▲ elite per niche      │
 │ ░▒▒▓▒░▓▓▒▒░▒▒█▓▒░░▒▒▓▒▒░▓▒░░▒▒░  │  │ mom  ▒     ▓▲    ░      ceiling proxy ┄┄ +640│
 └─────────────────────────────────┘  │ rev  ░     █▲    ▒      champion  +412 / +158 / −37│
 landed in blocks  ▮▮▮▮▮▮▮▮▮   N evals in B blocks     └────────────────────────────────────┘
 gas 24.1 MON   Jev $0.0031   Brier 0.19 vs 0.25
 funding  agent 6:12  ▮▮▮▮▮▮ 8.0 (virtual +0.13)   agent 5:07  ▮▮ 4.0 (virtual −0.02)        [fund]
```

- 一格一个候选的网格，**随评估落地而点亮**；
- 生态位地图：每个精英、冠军的 dev / confirm / sealed 并排（若过拟合，你会看见）、以及上限参照；
- 每代最优分数，对比同预算的随机搜索基线；
- 计数器：评估数、跨越的区块数、gas、Jev 花费；以及 Jev 校准表，在它挣到更多之前标注为*影子*；
- 资助面板：谁被资助、多少，以及虚拟收益，并如实标注。

## 验证

先于检查本身写下，使"未运行"成为一个陈述过的事实，而不是沉默。

| 声明 | 由什么检查 | 状态 |
|---|---|---|
| 只有绑定的 Evaluator 能写 Ledger；记录一次写入 | Foundry 测试（见 [合约](docs/contracts.md)"Tests the contracts must pass"） | **未运行** |
| TypeScript 镜像与 Solidity Evaluator 的每个分数一致 | 黄金向量，200 个规格、三种角色 | **未运行** |
| Allocator 托管只会把存款退给存款人本人，且随时可取回 | Foundry 测试，含重入尝试与存取分配序列的模糊测试 | **未编写** |
| 一代落在几个区块里 | `smoke`，20、100、200 次评估（[monad-notes](docs/monad-notes.md) A1） | **未运行** |
| 这群 agent 在同预算下优于随机搜索，且生态位档案优于单一全局精英 | 预注册的 [benchmark](docs/benchmark.md) | **未运行** |
| Jev 优于基准概率 | 影子日志与 Brier 分数（[open](docs/open.md) 第 5 条） | **未运行** |

## 首次测量

还没有。每个数字都会被测量、标注日期，并连同产生它的命令记录在 [monad-notes](docs/monad-notes.md)。目前测过的只有 2026-10-17 测试网的链 ID（10143）、区块 gas 上限（150,000,000）、base fee 下限（100 gwei）和 priority fee（2 gwei）。

## 仓库结构

```
contracts/          Foundry 项目：Ledger、Evaluator、JudgeLog（已写）；Allocator（计划中）
domains/            领域合约（任务声明），见 docs/contracts.md 第 B 部分
config/             各链的部署地址（不含密钥）
fixtures/           示例事件流，无需链即可开发界面
runs/               本地运行目录（镜像数据库、录制），已 gitignore
packages/core/      纯 TypeScript，无 I/O：规格、策略镜像、序列、算子、档案、bandit、事件类型
packages/chain/     viem 胶水：客户端、ABI、多钱包并发发送、账本读取
apps/orchestrator/  Bun 进程：跑每一代、提供 SSE、录制回放
apps/web/           实时展示页与钱包资助（React）
data/               冻结的收益序列与黄金测试向量
docs/               其余一切
```

## 快速开始

需要：[Bun](https://bun.sh) ≥ 1.1、[Foundry](https://getfoundry.sh) ≥ 1.8、git。

```bash
git clone --recurse-submodules <this repo> && cd blockwise
bun install
cd contracts && forge build && forge test && cd ..   # forge-std 是 git 子模块：克隆时加 --recurse-submodules
bun test packages/core
```

测试网钱包（**绝不提交密钥**，见 [SECURITY](SECURITY.md)）：助记词放在 `~/.blockwise/testnet.json`（权限 0600）或未跟踪的 `.env`（`cp .env.example .env`）。
Monad 测试网：链 ID `10143`，公共 RPC `https://testnet-rpc.monad.xyz`，水龙头见活动页。连接网页的钱包请用一次性的小号。

## 文档

| | |
|---|---|
| [原则](docs/principles.md) | 十二条规则，以及各自由什么强制 |
| [架构](docs/architecture.md) | 各部分、评分规格、搜索机制、资助、事件流、成本模型 |
| [合约](docs/contracts.md) | 智能合约与领域合约 |
| [Monad 笔记](docs/monad-notes.md) | 我们依赖什么：实测、文档所述、还是假设 |
| [Jev](docs/jev.md) | 我们对 Jev Trader 的解读，与影子裁判 |
| [展示](docs/presentation.md) | 屏幕与演示脚本 |
| [CLI](docs/cli.md) · [TUI](docs/tui.md) | 先于代码写下的界面 |
| [Surfaces](docs/surfaces.md) · [Changes](docs/changes.md) | 现有什么、能信多少；改了什么 |
| [运维](docs/operations.md) · [数据](docs/DATA.md) | 预算、失败模式、序列 |
| [未决问题](docs/open.md) · [基准](docs/benchmark.md) | 未知的事，以及用来解决它们的协议 |
| [路线图](docs/roadmap.md) · [决策](docs/decisions/README.md) | 计划与理由 |

## 路线图

带日期的计划、工作流和任务清单见 [docs/roadmap.md](docs/roadmap.md)。

- [ ] 合约测试通过、gas 实测、TypeScript 镜像一致性测试
- [ ] 测试网 smoke：20、100、200 次评估，记录落地区块直方图
- [ ] 一代循环、生态位档案、Thompson bandit、confirm 与 sealed、实时界面、回放
- [ ] `Allocator` 托管、钱包连接、资助影响下一代
- [ ] Jev 影子裁判与校准表
- [ ] 生态位的路径潜力；离线搜索得到的上限参照
- [ ] 逐块实盘阶段（每个区块盯市），如果它值得
- [ ] sealed 数据改为 commit-reveal；真实收益序列；多个环境
- [ ] 真实资金：真实市场（Kuru）、结算、审计、风控。**以上全部完成之前不做，v0 不做。**

## 致谢

这群 agent 的机制，以及围绕它的纪律（提议 / 裁判 / 执行分开、对留出数据只看一次、每个聪明方法都要和同预算下更便宜的方法比较），
改编自同一作者的 [ants](https://github.com/p-to-q/ants) 以及 Meta-Harness 一系工作。"每个区块一次类型化、带校准的决策"的想法来自
[Jev Trader](https://github.com/jarrodwatts/jev-trader)（Jarrod Watts）与 TypeSafe 的 Jev 模型。它所立足的地面是 [Monad](https://www.monad.xyz)。
Blockwise 是独立的项目，与它们不共享代码。

## 许可证

Apache-2.0，见 [LICENSE](LICENSE)。文档采用 CC-BY-4.0。

<p align="center"><sub>及时，若账本如此记载。</sub></p>
