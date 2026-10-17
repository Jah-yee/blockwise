# 0004 Jev is a shadow judge with an authority ladder

**Status:** accepted

**Context.** Jev returns typed probabilistic answers in ~100 ms. Jev Trader uses one such answer per block to trade, with no way to know if the answers are good. ants' authority ladder says a non-deterministic judge starts in shadow and earns authority by measured calibration.

**Decision.** Jev predicts P(candidate dev score > threshold) before evaluation; the prediction is logged in `JudgeLog` (refused once the result exists). Calibration (Brier, reliability, lift over base rate) is computed from `JudgeLog` + `Ledger`. During v0 it is shadow only, and all candidates are evaluated (so skipping cannot bias the measurement).

**Consequences.** (+) A real, measurable role for the AI judge; a null result is displayable. (+) Reuses Jev's strength (calibrated typed output). (−) Needs an API key; a labelled stand-in keeps everything working without it. (−) The task may be near base rate for a numeric prompt; we say so.
