# 0005 Stack: Foundry + Bun/TypeScript + viem + SSE

**Status:** accepted

**Context.** Four hours of build, several contributors, a live demo. Jev Trader uses Bun, TypeScript, ethers v5, the AI SDK and a Next.js dashboard fed by SSE.

**Decision.** Contracts in Solidity 0.8.28 with Foundry (`via_ir`, evm `cancun`). Everything else in strict TypeScript on Bun (runtime, tests, bundling). viem (not ethers) for chain access. The orchestrator serves SSE and the UI is React served by Bun; no Next.js, so there is one process and no CORS. A pure `packages/core` with no I/O so it runs in tests and the browser. AI SDK + `@ai-sdk/typesafe-ai` are optional dependencies for the real Jev judge.

**Consequences.** (+) One language off-chain, fast tests, minimal setup. (+) UI and engine are decoupled by the event stream, so replay is free. (−) Not deployable as a static Vercel site unless we serve recorded JSONL; acceptable for a demo, revisit for a hosted replay.
