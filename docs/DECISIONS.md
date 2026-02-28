# Architecture Decision Log

All decisions made during the project are recorded here.

## D001: Fixed Supply (No Minting After Deploy)

**Date:** 2026-02-28
**Decision:** All 1,000,000 BOTKKas tokens are minted at deployment time. No further minting is possible.
**Rationale:** Simpler contract, more predictable economics for a bootcamp. Participants know the total supply is fixed.
**Consequence:** If more tokens are needed, a new contract must be deployed.

## D002: Zero Decimals

**Date:** 2026-02-28
**Decision:** Token has 0 decimal places — only whole tokens exist.
**Rationale:** Bootcamp currency doesn't need fractional amounts. Simpler UX — "you have 50 BOTKKas" is clearer than "you have 50.000000000 BOTKKas".
**Consequence:** Minimum transferable amount is 1 token.

## D003: Testnet First

**Date:** 2026-02-28
**Decision:** Deploy and validate on TON Testnet before going to Mainnet.
**Rationale:** Standard practice. Allows testing with real network conditions without risking real TON.

## D004: Test-Heavy Approach

**Date:** 2026-02-28
**Decision:** Every contract feature must be covered by tests. No code merges without tests.
**Rationale:** Smart contracts handle value and are immutable once deployed. Bugs are expensive. Tests are cheap.

## D005: Tact Language (Not FunC)

**Date:** 2026-02-28
**Decision:** Use Tact as the smart contract language instead of FunC.
**Rationale:**
- FunC is officially deprecated by TON Foundation (July 2025)
- Tact has lower entry barrier (TypeScript-like syntax)
- Blueprint auto-generates TypeScript wrappers for Tact contracts — critical for our test-heavy approach
- 33% of mainnet contracts are written in Tact, production-ready
- CertiK audited the language (Dec 2024)
**Consequence:** We depend on Tact compiler ecosystem. Contract code is more readable but less low-level control.

## D006: Blueprint Toolchain

**Date:** 2026-02-28
**Decision:** Use Blueprint as the build/test/deploy toolchain with Jest + @ton/sandbox for testing.
**Rationale:** Official TON toolchain. Handles compilation, wrapper generation, deployment scripts, and testing setup out of the box.
**Stack:** Tact 1.6.x + Blueprint 0.43.x + Jest 29.x + @ton/sandbox 0.25.x
