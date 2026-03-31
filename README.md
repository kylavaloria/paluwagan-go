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
  <a href="#features">Features</a> &nbsp;|&nbsp;
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

## Smart Contract
**Contract ID:** `CAF4AXOJ73T7SGRMY2TCH2SN7QDZD7QEA732G6BQUHDG3G4CJXRACFI7`

**Stellar Expert:** https://stellar.expert/explorer/testnet/contract/CAF4AXOJ73T7SGRMY2TCH2SN7QDZD7QEA732G6BQUHDG3G4CJXRACFI7

<img width="1876" height="867" alt="image" src="https://github.com/user-attachments/assets/27cca7a9-17e4-4efc-bf89-5d98d0fa0868" />

## Features

### Core Features

1. **Wallet & Blockchain Integration**
   - Connect wallet (Stellar/Soroban-based) from the landing page
   - Wallet address displayed in UI
   - Blockchain-powered tracking of:
     - Contributions
     - Payouts
     - Group records

2. **Landing Page / Onboarding**
   - Clear value proposition (trust + transparency via blockchain)
   - Main actions:
     - Create a group
     - Join a group
   - Language selector (e.g., English)

### Group Management Features

3. **Create Group (Multi-step Flow)**

   A structured 3-step wizard:

   - **Step 1: Basics**
     - Group name
     - Organizer participation toggle:
       - Organizer contributes OR only manages
     - Number of members
     - Visibility:
       - Public (anyone can join)
       - Private (invite-only)
   - **Step 2: Contribution Settings**
     - Contribution amount (in XLM)
     - Contribution schedule:
       - Weekly
       - Monthly
       - Quarterly
       - Yearly
       - Custom interval
     - Optional interest rate slider
   - **Step 3: Payout Configuration**
     - Payout order:
       - By join order (first come, first served)
       - Random (fair shuffle)
     - Payout type:
       - Cash (XLM, on-chain)
       - Item / in-kind (off-chain/manual)
     - Final summary view before creation

4. **Group Hub / Discovery**
   - Search group by ID
   - Open existing group
   - Create new group
   - View public groups list
   - Group status indicators:
     - Active
     - Waiting for members
   - Quick tips panel:
     - Public vs invite-only explanation
     - Sharing guidance
     - Member requirements

5. **Group Details Page**
   - Displays:
     - Contribution amount
     - Schedule
     - Payout type
     - Payout order
     - Visibility
     - Organizer role
   - Group status:
     - Waiting for members
     - Active
     - Completed
   - Shareable group link

6. **Join Group**
   - Join button for open groups
   - Real-time member count
   - Notification when group is open to join

### Member & Reputation System

7. **Member Management**
   - Member list with:
     - Wallet IDs
     - Roles (Organizer / Member)
     - Ratings (stars)
   - Tracks participation per group

8. **Reliability Score System**
   - User profile includes:
     - Reliability score (star-based)
     - Based on on-chain activity
   - Metrics tracked:
     - Joined groups
     - Completed cycles
     - Late payments
     - Missed payments
     - Defaulted groups
   - Explanation of how score is calculated

### Payments & Payouts

9. **Payment Tracking**
   - Per-round payment status:
     - Confirmed
     - Pending confirmation
   - Transparent tracking for each member

10. **Payout System**
    - Shows:
      - Current payout recipient
      - Payout order per round
    - Organizer actions:
      - Release payout
      - Move to next round
    - Supports:
      - On-chain payouts (XLM)
      - Off-chain/manual payouts

11. **Round-Based Cycle Management**
    - Tracks:
      - Current round
      - Next round progression
    - Completion state:
      - “All rounds completed” confirmation

### Organizer Controls

12. **Organizer Actions**
    - Start group (once enough members join)
    - Release payouts
    - Advance rounds
    - Manage group lifecycle

### Transparency & Trust Features

13. **Blockchain-backed Transparency**
    - Immutable contribution records
    - Verifiable payouts
    - Public visibility (for public groups)
    - Reliability scoring tied to on-chain history

### Navigation & UI Features

14. **Navigation System**
    - Tabs:
      - Group
      - Create group
      - Profile

15. **Profile Management**
    - Username (public & unique)
    - Wallet address display + copy
    - Personal stats dashboard

## UI Screenshots
### Landing Page (Main CTA + Wallet Connect)
<img width="975" height="430" alt="image" src="https://github.com/user-attachments/assets/b1e2c843-c6f4-445f-9e2e-8697245f3efc" />

### Create Group: Basics Setup
<img width="975" height="754" alt="image" src="https://github.com/user-attachments/assets/17f427b6-0836-41f7-8b4d-a68ede53160f" />

### Create Group: Contribution Settings
<img width="975" height="776" alt="image" src="https://github.com/user-attachments/assets/e16726b3-5c6c-40c0-b424-d1f50d05eb0d" />

### Create Group: Payout Setup & Summary
<img width="975" height="907" alt="image" src="https://github.com/user-attachments/assets/82ce1dfa-b8b2-4425-b83d-7d5d3ea7fc89" />

### Group Dashboard (Waiting for Members)
<img width="975" height="745" alt="image" src="https://github.com/user-attachments/assets/b49a792e-e39f-4061-99cd-41a55b751500" />

### Group Hub / Discovery Page
<img width="975" height="494" alt="image" src="https://github.com/user-attachments/assets/4b1459d3-56a3-41b2-8f74-113dbddcb2d3" />

### Group Open (Join Flow)
<img width="975" height="913" alt="image" src="https://github.com/user-attachments/assets/45963a23-7f5f-497c-8b46-74c380c9b78b" />

### Payment Status (Round 1)
<img width="975" height="404" alt="image" src="https://github.com/user-attachments/assets/08b8994d-791d-49ba-a676-99cea27ddfe5" />

### Payout Order & Active Round
<img width="975" height="568" alt="image" src="https://github.com/user-attachments/assets/4e2ceeb4-621a-4b16-94cc-c612c0cf55f3" />

### Organizer Actions (Payout Execution)
<img width="975" height="521" alt="image" src="https://github.com/user-attachments/assets/bab0f474-a081-4bd5-8f88-e50603aa9012" />

### Group Completion State
<img width="975" height="521" alt="image" src="https://github.com/user-attachments/assets/21d78dd7-2378-4829-bb88-25ab627723da" />

### User Profile & Reliability Score
<img width="975" height="1148" alt="image" src="https://github.com/user-attachments/assets/df65e1fd-8065-4521-a93e-88fd320cbac9" />

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
