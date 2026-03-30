<div align="center">

# Paluwagan Go

### Soroban Smart Contract — On-Chain Paluwagan Coordination

<p>
  <img src="https://img.shields.io/badge/Rust-Stable-000000?style=for-the-badge&logo=rust&logoColor=white" />
  <img src="https://img.shields.io/badge/Soroban-Smart%20Contract-7B2D8B?style=for-the-badge&logo=stellar&logoColor=white" />
  <img src="https://img.shields.io/badge/Stellar-Testnet-0000FF?style=for-the-badge&logo=stellar&logoColor=white" />
  <img src="https://img.shields.io/badge/Tests-32%20Passing-2ea44f?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Status-Completed-2ea44f?style=for-the-badge" />
</p>

<p>
  A Soroban-based <strong>paluwagan</strong> coordination contract with immutable group rules,<br/>
  dual-confirmation payment tracking, deterministic cycle progression,<br/>
  and trust and reliability scoring.
</p>

<p>
  <a href="#overview">Overview</a> &nbsp;|&nbsp;
  <a href="#prerequisites--build">Build</a> &nbsp;|&nbsp;
  <a href="#example-walkthrough">Walkthrough</a> &nbsp;|&nbsp;
  <a href="#contract-methods">Methods</a> &nbsp;|&nbsp;
  <a href="#test-coverage">Tests</a>
</p>

</div>

<br/>

## Overview

**Paluwagan** is a traditional Filipino rotating savings system where a group of members each contribute a fixed amount per cycle, and one member receives the full pooled amount each round. This contract brings that system on-chain using **Soroban** on the Stellar network.

| Feature | Description |
|:---:|---|
| **Immutable group rules** | Contribution amount, schedule, and member cap are locked at group creation |
| **Dual-confirmation payments** | Both sender and receiver must confirm each payment before release |
| **Deterministic cycle progression** | Payout order is either join-order or verifiably randomized |
| **Trust scoring** | Per-user reliability scores track on-time, late, and missed payments |

> [!NOTE]
> This contract is designed for the **Stellar testnet**. All walkthroughs below use `--network testnet`. Replace `<CONTRACT_ID>`, `<GROUP_ID>`, and address placeholders with your actual values.

<br/>

## Prerequisites & Build

### Prerequisites

<kbd>Rust (stable)</kbd> &nbsp; <kbd>wasm32-unknown-unknown target</kbd> &nbsp; <kbd>Stellar CLI with Soroban support</kbd>

**Install the wasm target:**

```bash
rustup target add wasm32-unknown-unknown
```

**Verify Stellar CLI installation:**

```bash
stellar --version
```

### Build

```bash
cargo build --target wasm32-unknown-unknown --release
```

Output artifact:

```
target/wasm32-unknown-unknown/release/paluwagan_go.wasm
```

### Run Tests

```bash
cargo test
```

Expected output:

```
running 32 tests
...
test result: ok. 32 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

<br/>

## Example Walkthrough

A full lifecycle from contract deployment to group completion across multiple cycles.

---

### Step 1 — Deploy the contract

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/paluwagan_go.wasm \
  --source deployer \
  --network testnet
```

> Save the returned contract ID as `<CONTRACT_ID>`.

---

### Step 2 — Create a group

```bash
stellar contract invoke \
  --id <CONTRACT_ID> --source creator --network testnet \
  -- create_group \
  --creator <CREATOR_ADDRESS> \
  --organizer_role org_only \
  --payout_order_mode join_order \
  --contribution_amount 1000 \
  --max_members 3 \
  --schedule weekly \
  --payout_type cash \
  --is_public true \
  --interest_bps 0 \
  --custom_cycle_ledger_gap 0
```

> Save the returned value as `<GROUP_ID>`. In this example the organizer is **not** a member — only managing the group.

---

### Step 3 — Members join

```bash
stellar contract invoke \
  --id <CONTRACT_ID> --source alice --network testnet \
  -- join_group --group_id <GROUP_ID> --user <ALICE_ADDRESS>

stellar contract invoke \
  --id <CONTRACT_ID> --source bob --network testnet \
  -- join_group --group_id <GROUP_ID> --user <BOB_ADDRESS>

stellar contract invoke \
  --id <CONTRACT_ID> --source carol --network testnet \
  -- join_group --group_id <GROUP_ID> --user <CAROL_ADDRESS>
```

---

### Step 4 — Lock group and generate payout order

```bash
stellar contract invoke \
  --id <CONTRACT_ID> --source creator --network testnet \
  -- lock_group --group_id <GROUP_ID> --creator <CREATOR_ADDRESS>

stellar contract invoke \
  --id <CONTRACT_ID> --source creator --network testnet \
  -- generate_payout_order --group_id <GROUP_ID> --creator <CREATOR_ADDRESS>
```

> [!IMPORTANT]
> `lock_group` requires the group to be **at full capacity**. No new members can join after locking. Payout order can only be generated **once**.

---

### Step 5 — Confirm cycle payments

Both the **sender** and the **receiver** must confirm each payment independently.

**Sender confirmations:**

```bash
stellar contract invoke \
  --id <CONTRACT_ID> --source alice --network testnet \
  -- confirm_payment_sender --group_id <GROUP_ID> --cycle 1 --sender <ALICE_ADDRESS>

stellar contract invoke \
  --id <CONTRACT_ID> --source bob --network testnet \
  -- confirm_payment_sender --group_id <GROUP_ID> --cycle 1 --sender <BOB_ADDRESS>

stellar contract invoke \
  --id <CONTRACT_ID> --source carol --network testnet \
  -- confirm_payment_sender --group_id <GROUP_ID> --cycle 1 --sender <CAROL_ADDRESS>
```

**Receiver confirmations:**

```bash
stellar contract invoke \
  --id <CONTRACT_ID> --source creator --network testnet \
  -- confirm_payment_receiver \
  --group_id <GROUP_ID> --cycle 1 --receiver <CREATOR_ADDRESS> --sender <ALICE_ADDRESS>

stellar contract invoke \
  --id <CONTRACT_ID> --source creator --network testnet \
  -- confirm_payment_receiver \
  --group_id <GROUP_ID> --cycle 1 --receiver <CREATOR_ADDRESS> --sender <BOB_ADDRESS>

stellar contract invoke \
  --id <CONTRACT_ID> --source creator --network testnet \
  -- confirm_payment_receiver \
  --group_id <GROUP_ID> --cycle 1 --receiver <CREATOR_ADDRESS> --sender <CAROL_ADDRESS>
```

---

### Step 6 — Release payout and advance cycle

```bash
stellar contract invoke \
  --id <CONTRACT_ID> --source creator --network testnet \
  -- release_cycle_payout --group_id <GROUP_ID> --creator <CREATOR_ADDRESS>

stellar contract invoke \
  --id <CONTRACT_ID> --source creator --network testnet \
  -- advance_cycle --group_id <GROUP_ID> --creator <CREATOR_ADDRESS>
```

> Repeat **Steps 5 and 6** for each cycle until the group status becomes `Completed`.

---

### Step 7 — Inspect group and trust state

```bash
# Full group state
stellar contract invoke \
  --id <CONTRACT_ID> --source anyone --network testnet \
  -- get_group --group_id <GROUP_ID>

# Payout order
stellar contract invoke \
  --id <CONTRACT_ID> --source anyone --network testnet \
  -- get_payout_order --group_id <GROUP_ID>

# Per-user trust score
stellar contract invoke \
  --id <CONTRACT_ID> --source anyone --network testnet \
  -- get_user_trust --user <ALICE_ADDRESS>
```

<br/>

## Contract Methods

<details>
<summary><strong>Click to expand full method list</strong></summary>

| Method | Description |
|---|---|
| `create_group` | Initialize a new paluwagan group with immutable parameters |
| `invite_user` | Invite a specific user to a private group |
| `join_group` | Join a public group or accept an invitation |
| `lock_group` | Lock membership — requires full capacity |
| `generate_payout_order` | Determine the cycle recipient order; can only be called once |
| `confirm_payment_sender` | Sender records their contribution for a given cycle |
| `confirm_payment_receiver` | Receiver confirms receipt of each sender's contribution |
| `mark_missed_payments` | Flag overdue payments after the due ledger has passed |
| `verify_payment` | Verify a specific payment record |
| `get_payment_status` | Query the current status of a payment |
| `release_cycle_payout` | Release pooled funds to the cycle recipient after full confirmation |
| `advance_cycle` | Progress the group to the next cycle |
| `get_group` | Read full group state |
| `get_group_members` | List all current group members |
| `get_payout_order` | Read the generated payout sequence |
| `get_user_trust` | Read a user's trust and reliability score |

</details>

<br/>

## Test Coverage

32 tests across 8 categories — all passing.

| Category | Covered Scenarios |
|---|---|
| **Group creation & membership** | Organizer-only vs organizer-as-member, auto-add organizer, public joins, private invite requirement, duplicate membership rejection, max-members enforcement |
| **Access control & immutability** | Non-creator blocked on creator-only actions, lock requires full group, no joins after lock |
| **Payout order** | Join-order generation, randomized generation, cannot generate twice |
| **Payment confirmation flow** | Sender confirmation, receiver confirmation, pending vs confirmed states, non-member and non-creator restrictions |
| **Payout release & cycle progression** | Cannot release with missing confirmations, successful release after full confirmations, no duplicate payout recipient, cannot advance before payout, cycle progression to completion |
| **Trust scoring** | New user has no score, successful completion yields high reliability, late payment tracking, missed payment tracking |
| **Overdue handling** | Missed payments can be marked after due ledger, marking too early fails |
| **End-to-end lifecycle** | Full `active → completed` behavior across multi-cycle groups |

<br/>

---

<div align="center">
  <sub>
    Built with Rust and Soroban &nbsp;&bull;&nbsp; Deployed on Stellar Testnet &nbsp;&bull;&nbsp; Inspired by the Filipino paluwagan tradition
  </sub>
</div>