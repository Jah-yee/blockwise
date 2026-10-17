# 0006 Synthetic regime-switching series first, real data later

**Status:** accepted

**Context.** Kuru's testnet book is unverified; Jev Trader's is mainnet. We need a deterministic, shared, auditable series today.

**Decision.** A seeded generator produces a regime-switching return series (trend, momentum, mean-reversion, chop), committed as `data/series/v1.json` with its seed and hash, split into dev/confirm/sealed. We state plainly that it is synthetic and not evidence of real-market profit.

**Consequences.** (+) Reproducible, no external dependency. (−) We could, by choosing the seed and regime mix, make the search look good; so the generator and seed are fixed and public, and the sealed score is shown next to dev. Real data is milestone v0.5.
