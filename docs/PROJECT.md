# BOTKKas — Bootcamp Jetton on TON

## Overview

BOTKKas is a Jetton (fungible token) on the TON blockchain, designed to serve as the internal currency of an offline bootcamp. Participants use BOTKKas tokens to transact within the bootcamp ecosystem — purchasing merch, unlocking bonuses, accessing premium content, and more.

## Token Specification

| Parameter       | Value               |
|-----------------|---------------------|
| Token Name      | BOTKKas             |
| Standard        | TEP-74 (TON Jetton) |
| Total Supply    | 1,000,000           |
| Decimals        | 0 (whole tokens only)|
| Mintable        | No (fixed supply)   |
| Network         | TON Testnet → Mainnet |

## Target Audience

- Offline bootcamp with 10–50 participants
- Organizers / admins who distribute and manage tokens

## Use Cases

- **Internal currency** — participants spend tokens on merch, bonuses, and access within the bootcamp
- **Rewards** — organizers distribute tokens for completing tasks, challenges, and activities
- **Gamification** — leaderboard rankings based on token balances

## Architecture (High Level)

```
┌─────────────────────────────────────────────┐
│              TON Blockchain                 │
│                                             │
│  ┌──────────────┐    ┌──────────────────┐   │
│  │ Jetton Master │───▶│ Jetton Wallet(s) │   │
│  │  (BOTKKas)    │    │  (per participant)│   │
│  └──────────────┘    └──────────────────┘   │
│         │                                   │
│         │ deploy + initial mint              │
│         ▼                                   │
│  ┌──────────────┐                           │
│  │ Admin Wallet  │                           │
│  │ (organizer)   │                           │
│  └──────────────┘                           │
└─────────────────────────────────────────────┘
```

### How Jettons Work on TON

- **Jetton Master** — the main contract that defines the token (name, symbol, supply). Deployed once.
- **Jetton Wallet** — a personal wallet contract for each holder. Created automatically when tokens are transferred to a new address.
- All 1,000,000 tokens are minted at deploy time to the admin wallet. The admin then distributes them to participants.

## Tech Stack

| Component       | Technology                  |
|-----------------|-----------------------------|
| Smart Contracts | Tact 1.6.x                  |
| Testing         | @ton/sandbox 0.25 + Jest 29 |
| Toolchain       | Blueprint 0.43 (TON CLI)    |
| SDK             | @ton/core                   |
| Network         | TON Testnet → Mainnet       |

## Quality Policy

- **Every contract feature must have tests** — no code ships without corresponding test coverage
- **Test-first approach** — write tests before or alongside implementation
- **Sequential bug fixing** — fix bugs one at a time, verify each fix with a test before moving on
- **Security audit** before any mainnet deployment
