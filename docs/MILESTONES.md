# Milestones

## M1: Project Setup & Research
**Goal:** Set up the development environment, understand TON Jetton standard (TEP-74).

- [x] Initialize project with Blueprint (TON CLI scaffolding)
- [x] Research TEP-74 Jetton standard (master + wallet contracts)
- [x] Research FunC vs Tact — choose language for contracts → **Tact**
- [x] Set up testing framework (@ton/sandbox + Jest)
- [x] Document architecture decisions (D005, D006)

**Exit criteria:** Project compiles, empty test suite runs green. **DONE**

---

## M2+M3: Jetton Master + Wallet Contracts (merged)
**Goal:** Implement both Jetton contracts with fixed supply — Master and Wallet are tightly coupled in TEP-74.

### Master Contract
- [x] Implement Jetton Master contract (TEP-74 compliant)
- [x] Implement metadata (name: BOTKKas, decimals: 0, total supply: 1,000,000)
- [x] Implement `get_jetton_data()` getter
- [x] Implement TEP-89 wallet discovery (`ProvideWalletAddress`)
- [x] Implement admin controls (CloseMinting, ChangeOwner, UpdateContent)
- [x] Tests: deployment, metadata correctness, supply validation (6 tests)
- [x] Tests: reject mint from non-admin, close minting, reject after close (3 tests)
- [x] Tests: admin controls — change owner, update content (3 tests)

### Wallet Contract
- [x] Implement Jetton Wallet contract (TEP-74 compliant)
- [x] Implement `transfer` (send tokens to another address)
- [x] Implement `burn` (destroy tokens)
- [x] Implement `get_wallet_data()` getter
- [x] Implement bounced handlers (rollback on failure)
- [x] Tests: transfer between wallets (2 tests)
- [x] Tests: insufficient balance rejection (1 test)
- [x] Tests: burn reduces supply correctly (1 test)
- [x] Tests: unauthorized transfer/burn rejection (2 tests)
- [x] Tests: TEP-89 wallet discovery (1 test)
- [x] Tests: full lifecycle — mint → close → transfer → burn (1 test)

**Total: 21 tests, all passing**

**Exit criteria:** Both contracts work in sandbox, full lifecycle tested. **DONE**

---

## M4: Integration Testing
**Goal:** End-to-end flow in local sandbox.

- [x] Test: deploy → mint → distribute to 3 participants → they trade between each other
- [x] Test: total supply consistency after multiple transfers (sum of balances = supply)
- [x] Test: total supply reduces only on burn, not on transfer
- [x] Test: edge cases — transfer entire balance (max), self-transfer, 1 token (min), multiple sequential transfers
- [x] Test: multiple wallets interacting simultaneously
- [x] Gas consumption analysis: transfer ~0.009 TON, burn ~0.007 TON

**Total: 29 tests (21 from M2+M3 + 8 new), all passing**

**Exit criteria:** All integration tests pass, no edge case failures. **DONE**

---

## M5: Testnet Deployment
**Goal:** Deploy to TON Testnet and verify real-world behavior.

- [ ] Deploy Jetton Master to TON Testnet
- [ ] Mint all tokens to admin wallet
- [ ] Test transfer via TON Explorer / Tonkeeper
- [ ] Verify token shows up in wallets correctly
- [ ] Document deployment process (addresses, txns)

**Exit criteria:** Token visible and transferable on TON Testnet.

---

## M6: Security Audit
**Goal:** Review contracts for vulnerabilities before mainnet.

- [ ] OWASP-style review adapted for smart contracts
- [ ] Check for reentrancy / unexpected message handling
- [ ] Check access control (only admin can do admin things)
- [ ] Check integer overflow/underflow
- [ ] Check gas limit attacks
- [ ] Review against known TON contract vulnerabilities

**Exit criteria:** No critical or high-severity issues found.

---

## M7: Mainnet Deployment
**Goal:** Deploy to TON Mainnet for production use.

- [ ] Final code freeze
- [ ] Deploy Jetton Master to TON Mainnet
- [ ] Distribute tokens to organizer wallet
- [ ] Verify on TON Explorer
- [ ] Document final addresses and instructions for organizers

**Exit criteria:** BOTKKas live on TON Mainnet, ready for bootcamp use.
