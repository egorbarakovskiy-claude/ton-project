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

## M2: Jetton Master Contract
**Goal:** Implement the Jetton Master contract with fixed supply.

- [ ] Implement Jetton Master contract (TEP-74 compliant)
- [ ] Implement metadata (name: BOTKKas, decimals: 0, total supply: 1,000,000)
- [ ] Implement `get_jetton_data()` getter
- [ ] Tests: deployment, metadata correctness, supply validation
- [ ] Tests: reject any mint attempts after deploy

**Exit criteria:** Master contract deployed in local sandbox, all tests pass.

---

## M3: Jetton Wallet Contract
**Goal:** Implement the Jetton Wallet contract for token holders.

- [ ] Implement Jetton Wallet contract (TEP-74 compliant)
- [ ] Implement `transfer` (send tokens to another address)
- [ ] Implement `burn` (destroy tokens)
- [ ] Implement `get_wallet_data()` getter
- [ ] Tests: transfer between wallets
- [ ] Tests: insufficient balance rejection
- [ ] Tests: burn reduces supply correctly
- [ ] Tests: unauthorized transfer rejection

**Exit criteria:** Wallet contract works in sandbox, full transfer lifecycle tested.

---

## M4: Integration Testing
**Goal:** End-to-end flow in local sandbox.

- [ ] Test: deploy master → mint to admin → transfer to participant → participant transfers to another
- [ ] Test: total supply consistency after multiple transfers
- [ ] Test: edge cases (zero transfer, self-transfer, max balance)
- [ ] Test: multiple wallets interacting simultaneously
- [ ] Gas consumption analysis

**Exit criteria:** All integration tests pass, no edge case failures.

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
