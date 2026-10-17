# The terminal interface (manual)

Status: **planned**. Nothing here is implemented. It is the design the code will be written to, after the [ants terminal interface](https://github.com/p-to-q/ants/blob/main/docs/tui.md).
When it ships, [surfaces.md](surfaces.md) records what was actually run.

`blockwise` with no arguments opens it on a terminal. It is how a person watches a run on the machine where it runs: SSH in, type `blockwise`. It is also the fallback demo if the browser is unavailable.

```
blockwise          the interface (a terminal), or the line shell (a pipe, a dumb terminal, BLOCKWISE_NO_TUI=1)
blockwise ui       the interface, with --workdir / --domain / --epoch
blockwise home     print one screen and exit: --screen home|generation|board|candidates|operators|events|judge|health|system --width N --color
```

## What you see first

The home screen has the colony's name and one line of what it is, a two-line introduction, one block per run (live or replay), and the directory. Each run shows a glyph, a short plain-language phrase
and the reason behind it, then the numbers:

```
 ⣾ gen 6/10   200 sent  197 landed  3 pending   blocks 71750141..71750144   dev +412  confirm +158
     Going well  197 of 200 landed within 4 blocks, best improved 2 generations ago
```

| phrase | when | glyph |
|---|---|---|
| Warming up | no transaction has landed yet | loading |
| Going well | most of the generation landed within a few blocks and the best is improving | running |
| Just found something | a new best this generation | burst |
| Steady | landings are normal, the best has not changed for 1 to 2 generations | running |
| Exploring | no new best for 3 or more generations | running |
| Spread out | the generation took more blocks than usual to land (the A1 number is drifting) | running |
| Waiting on the judge | the AI judge's calls are failing; the run carries on without it, labelled `stand-in` | waiting |
| Stuck? | nothing has landed for 30 seconds while transactions are pending | still dot |
| Needs a look | reverts above 5% of a generation, the mirror disagrees with the chain, or the RPC is erroring | – |
| Running low on funds | the wallet cannot cover the next generation's budget | running |
| Paused | the PAUSE flag is set; `p` resumes | still dot |

The phrase always sits next to the numbers it came from and always says why. It cheers only for real events and never jokes about a failure. Rules live in one place, one test per row (as in ants).

## Screens

| key | screen | what is drawn |
|---|---|---|
| 0 | Home | the name, the one line, each run with its phrase and an activity strip, the directory |
| 1 | Generation | **the population grid**: one cell per candidate, dim until its transaction lands, then lit by dev score on a sequential scale; the block number a cell landed in as a column header; a histogram of landing blocks; "N evals in B blocks" |
| 2 | Leaderboard | candidates ranked by confirm (champion), with dev, confirm and sealed side by side and ▲ ▼ for rank changes; Enter opens a candidate |
| 3 | Candidates | a ribbon of the newest candidates coloured by state (landed, pending, reverted, lost), then one row each; filter by state (`s`) and generation (`t`); Enter opens one |
| 4 | Map | the nine niches with each elite and its label (young, leader, riser, stalled), the ceiling proxy, ruggedness and plateau fraction; operator discovery rates and shares; best-so-far curves on one scale with the random 1× / 2× baselines |
| 9 | Funding | the connected wallet's allocations (read-only here; funding is done in the web view), totals per agent, the virtual return |
| 5 | Events | the event stream with a coloured gutter per kind and events per second; filter by kind (`k`) |
| 6 | Judge | the shadow judge: reliability table, Brier vs base rate, authority level, spend; empty with an explanation when no judge is attached |
| 7 | Health | one tile per `doctor` check (■ ok, ▲ warning, ✗ failing) |
| 8 | System | version, wallet balance and per-generation budget, RPC endpoints with latency and error counts, gas spent, mirror age, how many events a rebuild would read |

A candidate opens to its spec (the seven integers), its tx and block with explorer link, its scores per role, its lineage (operator, parent), and the judge's prediction if any.

## Keys

| key | does |
|---|---|
| `1` to `9`, `0` | go to a screen (0 = home); `←` `→` also step |
| `↑` `↓` `PgUp` `PgDn` `g` `G` | move, scroll, top, bottom |
| `Enter` | open the selected candidate, or switch to the selected run |
| `Esc` `b` | back |
| `p` | pause or resume the run on screen (sets or removes its PAUSE flag; the loop finishes its step) |
| `h` | write a hint for the proposers (a suggestion, never a rule; hints change no gate or budget) |
| `[` `]` | previous or next run |
| `space` | freeze or unfreeze the refresh (the age tag turns yellow while frozen) |
| `r` | refresh now (it refreshes by itself every second; block time is documented at about 0.4 s; measure it) |
| `/` | command line: `best --top 3`, `show 6:12`, `diff 5:7 6:12`, `log`, `status`, `sql SELECT …`, `judge`, `doctor`, `hint …`, `pause`, `resume`; output goes to a pager |
| `?` | keys and the words used |
| `q` | quit |

`run`, `deploy`, `smoke`, `wallet`, `seal`, `freeze`, `serve`, `export` and `workspace` are refused on the command line: spending gas, starting a run or writing files is done from a shell on purpose.

## Animation, and turning it down

Frames are computed from the time, never counted, so a slow redraw cannot make an animation lag. One spinner per activity: loading, a run in progress, waiting for the judge, a new best, alive in the status bar.

| to get | set |
|---|---|
| no motion (one still glyph per activity) | `BLOCKWISE_REDUCE_MOTION=1` |
| no colour | `NO_COLOR=1` |
| the line shell instead of the interface | `BLOCKWISE_NO_TUI=1` |
| ASCII glyphs | a locale that is not UTF-8 |

## Troubleshooting

| symptom | cause | do |
|---|---|---|
| it says it is not set up | no config, no wallet, no mirror | `blockwise onboard`, or `blockwise ui --workdir DIR` |
| the grid stays dim | transactions are pending or the RPC is rate-limiting | Health and System screens; `blockwise doctor` |
| the screen says `loading…` for long | the mirror is being rebuilt from the chain | wait; reads never block the run |
| boxes or `?` instead of glyphs | font or locale | `LANG=C.UTF-8`, a font with block and braille glyphs; or `BLOCKWISE_NO_TUI=1` |
| keys do nothing inside tmux or screen | the multiplexer swallows them | `TERM=screen-256color`; tune `escape-time` |

## Design

1. **The interface cannot hurt the thing it watches.** It opens the mirror read-only; the only writes are `p`, `h` and the pause/resume commands, and they go through the ordinary CLI. A test compares the mirror before and after loading every screen.
2. **Views are pure.** A view turns data and a clock into styled lines and imports nothing from the terminal library. The same lines are drawn live, printed by `blockwise home`, written as an image for a screenshot and asserted on in tests.
3. **One event stream.** The terminal, the web view and replay consume the same events ([architecture.md](architecture.md) §5). If the web view can show it, the terminal can, and a replay can drive either.
4. **The loop never waits on data.** One background task loads what the current screen needs; the draw loop shows the last result and its age. A broken source is a row that says why.
5. **It degrades.** No tty or a dumb `TERM`: the line shell. `NO_COLOR`, reduced motion and a non-UTF-8 locale are honoured; lines are cut to the width, never wrapped.
6. **A bug is a line, not a crash.** Exceptions in a view or a load are caught and shown; the terminal is restored in every case. Strings that came from outside are cleaned of control characters before they reach the screen.
7. **One source of numbers.** Everything comes from the functions the CLI already uses; the interface adds layout and the plain-language rules, not logic.

Drawing: the grid is two terminal columns per candidate (a half block pair), 200 candidates fit in 20 rows by 20 columns; scores use a 7-step sequential scale that varies in lightness (colour-blind safe); bars use eighths of a cell, sparklines the eight block heights.

Not here, on purpose: a mouse, anything that spends gas, and anything that changes a run beyond a hint or a pause.
