#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, Address, Env, String,
    Symbol, Vec,
};

#[contract]
pub struct PaluwaganContract;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    GroupNotFound = 1,
    Unauthorized = 2,
    GroupLocked = 3,
    GroupFull = 4,
    AlreadyMember = 5,
    NotInvited = 6,
    InvalidGroupStatus = 7,
    PaymentNotConfirmed = 8,
    AlreadyReceivedPayout = 9,
    InvalidCycle = 10,
    AlreadyConfirmed = 11,
    PayoutOrderAlreadyGenerated = 12,
    GroupNotFull = 13,
    InvalidPayoutRecipient = 14,
    InvalidOrganizerRole = 15,
    InvalidPayoutOrderMode = 16,
    InvalidCycleGap = 17,
    CycleNotOverdue = 18,
    InvalidGroupName = 19,
    PayoutNotReleased = 20,
    PayoutRecipientNotConfirmed = 21,
    InvalidUsername = 22,
    UsernameTaken = 23,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum GroupStatus {
    WaitingForMembers,
    Active,
    Completed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum GroupVisibility {
    Public,
    Private,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OrganizerRole {
    OrganizerOnly,
    OrganizerAsMember,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PaymentState {
    Unpaid,
    PendingConfirmation,
    Confirmed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PayoutOrderMode {
    JoinOrder,
    Randomized,
}

/// Payout handoff state for the active round (UI / future dual-ack flows).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PayoutState {
    NotReleased,
    ReleasedByOrganizer,
    ReceivedConfirmedByRecipient,
}

/// Arguments for [`PaluwaganContract::create_group`] (bundled so the host stays within
/// Soroban's per-function parameter limit).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CreateGroupParams {
    pub name: String,
    pub organizer_role: Symbol,
    pub payout_order_mode: Symbol,
    pub contribution_amount: i128,
    pub max_members: u32,
    pub schedule: Symbol,
    pub payout_type: Symbol,
    pub is_public: bool,
    pub interest_bps: u32,
    pub custom_cycle_ledger_gap: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Group {
    pub creator: Address,
    pub name: String,
    pub organizer_role: OrganizerRole,
    pub payout_order_mode: PayoutOrderMode,
    pub contribution_amount: i128,
    pub max_members: u32,
    pub current_members: u32,
    pub schedule: Symbol,
    pub payout_type: Symbol,
    pub visibility: GroupVisibility,
    pub status: GroupStatus,
    pub current_cycle: u32,
    pub total_cycles: u32,
    pub locked: bool,
    pub interest_bps: u32,
    pub cycle_ledger_gap: u32,
    pub cycle_due_ledger: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserTrust {
    pub joined_groups: u32,
    pub completed_groups: u32,
    pub missed_payments: u32,
    pub late_payments: u32,
    pub defaulted_groups: u32,
    pub reliability_score: Option<u32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ListedGroup {
    pub id: u32,
    pub group: Group,
}

impl Default for UserTrust {
    fn default() -> Self {
        Self {
            joined_groups: 0,
            completed_groups: 0,
            missed_payments: 0,
            late_payments: 0,
            defaulted_groups: 0,
            reliability_score: None,
        }
    }
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    NextGroupId,
    Group(u32),
    GroupMembers(u32),
    GroupInvites(u32),
    GroupPayoutOrder(u32),
    /// Organizer marked funds as sent for this cycle (recipient must still ack).
    PayoutReleased(u32, u32),
    /// Recipient confirmed receiving payout for their turn (`true` permanently for that address in the group).
    ReceivedPayout(u32, Address),
    SenderConfirmed(u32, u32, Address),
    ReceiverConfirmed(u32, u32, Address),
    LateMarked(u32, u32, Address),
    MissedMarked(u32, u32, Address),
    UserTrust(Address),
    Username(Address),
    UsernameOwner(String),
}

fn validate_username(env: &Env, username: &String) {
    let len = username.len();
    // 3..=20 chars
    if len < 3 || len > 20 {
        panic_with_error!(env, ContractError::InvalidUsername);
    }

    // Only lowercase letters, digits, underscore.
    let len_usize = len as usize;
    let mut buf = [0u8; 20];
    username.copy_into_slice(&mut buf[..len_usize]);

    let mut i = 0usize;
    while i < len_usize {
        let b = buf[i];
        let ok = (b >= b'a' && b <= b'z')
            || (b >= b'0' && b <= b'9')
            || (b == b'_');
        if !ok {
            panic_with_error!(env, ContractError::InvalidUsername);
        }
        i += 1;
    }
}

fn get_username(env: &Env, user: &Address) -> Option<String> {
    env.storage()
        .persistent()
        .get::<_, String>(&DataKey::Username(user.clone()))
}

fn set_username(env: &Env, user: &Address, username: &String) {
    env.storage()
        .persistent()
        .set(&DataKey::Username(user.clone()), username);
}

fn get_username_owner(env: &Env, username: &String) -> Option<Address> {
    env.storage()
        .persistent()
        .get::<_, Address>(&DataKey::UsernameOwner(username.clone()))
}

fn set_username_owner(env: &Env, username: &String, owner: &Address) {
    env.storage()
        .persistent()
        .set(&DataKey::UsernameOwner(username.clone()), owner);
}

fn remove_username_owner(env: &Env, username: &String) {
    env.storage()
        .persistent()
        .remove(&DataKey::UsernameOwner(username.clone()));
}

fn get_next_group_id(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::NextGroupId)
        .unwrap_or(1_u32)
}

fn set_next_group_id(env: &Env, next_id: u32) {
    env.storage().instance().set(&DataKey::NextGroupId, &next_id);
}

fn get_group_or_panic(env: &Env, group_id: u32) -> Group {
    match env.storage().persistent().get(&DataKey::Group(group_id)) {
        Some(group) => group,
        None => panic_with_error!(env, ContractError::GroupNotFound),
    }
}

fn set_group(env: &Env, group_id: u32, group: &Group) {
    env.storage().persistent().set(&DataKey::Group(group_id), group);
}

fn get_members(env: &Env, group_id: u32) -> Vec<Address> {
    env.storage()
        .persistent()
        .get(&DataKey::GroupMembers(group_id))
        .unwrap_or(Vec::new(env))
}

fn set_members(env: &Env, group_id: u32, members: &Vec<Address>) {
    env.storage()
        .persistent()
        .set(&DataKey::GroupMembers(group_id), members);
}

fn get_invites(env: &Env, group_id: u32) -> Vec<Address> {
    env.storage()
        .persistent()
        .get(&DataKey::GroupInvites(group_id))
        .unwrap_or(Vec::new(env))
}

fn set_invites(env: &Env, group_id: u32, invites: &Vec<Address>) {
    env.storage()
        .persistent()
        .set(&DataKey::GroupInvites(group_id), invites);
}

fn get_payout_order_internal(env: &Env, group_id: u32) -> Vec<Address> {
    env.storage()
        .persistent()
        .get(&DataKey::GroupPayoutOrder(group_id))
        .unwrap_or(Vec::new(env))
}

fn set_payout_order(env: &Env, group_id: u32, order: &Vec<Address>) {
    env.storage()
        .persistent()
        .set(&DataKey::GroupPayoutOrder(group_id), order);
}

fn get_user_trust_or_default(env: &Env, user: &Address) -> UserTrust {
    env.storage()
        .persistent()
        .get(&DataKey::UserTrust(user.clone()))
        .unwrap_or(UserTrust::default())
}

fn set_user_trust(env: &Env, user: &Address, trust: &UserTrust) {
    env.storage()
        .persistent()
        .set(&DataKey::UserTrust(user.clone()), trust);
}

fn contains_address(list: &Vec<Address>, user: &Address) -> bool {
    let len = list.len();
    let mut i = 0;
    while i < len {
        if let Some(addr) = list.get(i) {
            if addr == *user {
                return true;
            }
        }
        i += 1;
    }
    false
}

fn require_creator(env: &Env, group: &Group, caller: &Address) {
    caller.require_auth();
    if *caller != group.creator {
        panic_with_error!(env, ContractError::Unauthorized);
    }
}

fn ensure_not_locked(env: &Env, group: &Group) {
    if group.locked {
        panic_with_error!(env, ContractError::GroupLocked);
    }
}

fn current_recipient(env: &Env, group_id: u32, cycle: u32) -> Address {
    let order = get_payout_order_internal(env, group_id);
    if cycle == 0 || cycle > order.len() {
        panic_with_error!(env, ContractError::InvalidCycle);
    }
    match order.get(cycle - 1) {
        Some(addr) => addr,
        None => panic_with_error!(env, ContractError::InvalidCycle),
    }
}

fn is_payment_confirmed(env: &Env, group_id: u32, cycle: u32, sender: &Address) -> bool {
    let group = get_group_or_panic(env, group_id);
    let sender_ok = env
        .storage()
        .persistent()
        .get::<_, bool>(&DataKey::SenderConfirmed(group_id, cycle, sender.clone()))
        .unwrap_or(false);

    // Creator collects the pool; their own contribution does not need a second "receiver" ack.
    if sender == &group.creator {
        return sender_ok;
    }

    let receiver_ok = env
        .storage()
        .persistent()
        .get::<_, bool>(&DataKey::ReceiverConfirmed(group_id, cycle, sender.clone()))
        .unwrap_or(false);

    sender_ok && receiver_ok
}

fn all_cycle_payments_confirmed(env: &Env, group_id: u32, cycle: u32) -> bool {
    let members = get_members(env, group_id);
    let len = members.len();

    let mut i = 0;
    while i < len {
        let member = match members.get(i) {
            Some(m) => m,
            None => return false,
        };

        if !is_payment_confirmed(env, group_id, cycle, &member) {
            return false;
        }

        i += 1;
    }

    true
}

fn was_missed_marked(env: &Env, group_id: u32, cycle: u32, user: &Address) -> bool {
    env.storage()
        .persistent()
        .get::<_, bool>(&DataKey::MissedMarked(group_id, cycle, user.clone()))
        .unwrap_or(false)
}

fn was_late_marked(env: &Env, group_id: u32, cycle: u32, user: &Address) -> bool {
    env.storage()
        .persistent()
        .get::<_, bool>(&DataKey::LateMarked(group_id, cycle, user.clone()))
        .unwrap_or(false)
}

fn mark_missed_once(env: &Env, group_id: u32, cycle: u32, user: &Address) {
    if was_missed_marked(env, group_id, cycle, user) {
        return;
    }

    let mut trust = get_user_trust_or_default(env, user);
    trust.missed_payments += 1;
    recalculate_reliability(&mut trust);
    set_user_trust(env, user, &trust);

    env.storage()
        .persistent()
        .set(&DataKey::MissedMarked(group_id, cycle, user.clone()), &true);
}

fn mark_late_once(env: &Env, group_id: u32, cycle: u32, user: &Address) {
    if was_late_marked(env, group_id, cycle, user) || was_missed_marked(env, group_id, cycle, user) {
        return;
    }

    let mut trust = get_user_trust_or_default(env, user);
    trust.late_payments += 1;
    recalculate_reliability(&mut trust);
    set_user_trust(env, user, &trust);

    env.storage()
        .persistent()
        .set(&DataKey::LateMarked(group_id, cycle, user.clone()), &true);
}

fn recalculate_reliability(trust: &mut UserTrust) {
    // No participation and no penalty history => no rating yet
    if trust.completed_groups == 0
        && trust.missed_payments == 0
        && trust.late_payments == 0
        && trust.defaulted_groups == 0
    {
        trust.reliability_score = None;
        return;
    }

    let penalty = trust.missed_payments + trust.late_payments + (trust.defaulted_groups * 2);
    let mut score: i32 = 5 - (penalty as i32);

    if score < 1 {
        score = 1;
    }
    if score > 5 {
        score = 5;
    }

    trust.reliability_score = Some(score as u32);
}

fn parse_organizer_role(env: &Env, organizer_role: &Symbol) -> OrganizerRole {
    if *organizer_role == Symbol::new(env, "org_member") {
        OrganizerRole::OrganizerAsMember
    } else if *organizer_role == Symbol::new(env, "org_only") {
        OrganizerRole::OrganizerOnly
    } else {
        panic_with_error!(env, ContractError::InvalidOrganizerRole);
    }
}

fn parse_payout_order_mode(env: &Env, payout_order_mode: &Symbol) -> PayoutOrderMode {
    if *payout_order_mode == Symbol::new(env, "join_order") {
        PayoutOrderMode::JoinOrder
    } else if *payout_order_mode == Symbol::new(env, "randomized") {
        PayoutOrderMode::Randomized
    } else {
        panic_with_error!(env, ContractError::InvalidPayoutOrderMode);
    }
}

fn derive_cycle_gap(env: &Env, schedule: &Symbol, custom_gap: u32) -> u32 {
    if *schedule == Symbol::new(env, "weekly") {
        100
    } else if *schedule == Symbol::new(env, "monthly") {
        400
    } else if *schedule == Symbol::new(env, "quarterly") {
        1200
    } else if *schedule == Symbol::new(env, "yearly") {
        4800
    } else if *schedule == Symbol::new(env, "custom") {
        if custom_gap == 0 {
            panic_with_error!(env, ContractError::InvalidCycleGap);
        }
        custom_gap
    } else {
        if custom_gap == 0 {
            panic_with_error!(env, ContractError::InvalidCycleGap);
        }
        custom_gap
    }
}

fn pseudo_randomize_members(env: &Env, group_id: u32, members: &Vec<Address>) -> Vec<Address> {
    let len = members.len();
    if len <= 1 {
        return members.clone();
    }

    let seed = env.ledger().sequence() + group_id;
    let offset = seed % len;

    let mut result = Vec::new(env);
    let mut i = 0;
    while i < len {
        let idx = (offset + i) % len;
        if let Some(member) = members.get(idx) {
            result.push_back(member);
        }
        i += 1;
    }

    result
}

#[contractimpl]
impl PaluwaganContract {
    /// Creates a new paluwagan group with fixed rules.
    /// organizer_role:
    /// - "org_only"
    /// - "org_member"
    ///
    /// payout_order_mode:
    /// - "join_order"
    /// - "randomized"
    pub fn create_group(env: Env, creator: Address, params: CreateGroupParams) -> u32 {
        creator.require_auth();

        let CreateGroupParams {
            name,
            organizer_role,
            payout_order_mode,
            contribution_amount,
            max_members,
            schedule,
            payout_type,
            is_public,
            interest_bps,
            custom_cycle_ledger_gap,
        } = params;

        if name.is_empty() || name.len() > 50 {
            panic_with_error!(env, ContractError::InvalidGroupName);
        }

        let role = parse_organizer_role(&env, &organizer_role);
        let payout_mode = parse_payout_order_mode(&env, &payout_order_mode);

        let visibility = if is_public {
            GroupVisibility::Public
        } else {
            GroupVisibility::Private
        };

        let cycle_gap = derive_cycle_gap(&env, &schedule, custom_cycle_ledger_gap);

        let group_id = get_next_group_id(&env);
        set_next_group_id(&env, group_id + 1);

        let mut members = Vec::new(&env);
        let mut current_members = 0_u32;

        // If organizer is also a member, include them in the member count immediately.
        if role == OrganizerRole::OrganizerAsMember {
            members.push_back(creator.clone());
            current_members = 1;

            let mut trust = get_user_trust_or_default(&env, &creator);
            trust.joined_groups += 1;
            recalculate_reliability(&mut trust);
            set_user_trust(&env, &creator, &trust);
        }

        let group = Group {
            creator: creator.clone(),
            name,
            organizer_role: role,
            payout_order_mode: payout_mode,
            contribution_amount,
            max_members,
            current_members,
            schedule,
            payout_type,
            visibility,
            status: GroupStatus::WaitingForMembers,
            current_cycle: 0,
            total_cycles: max_members,
            locked: false,
            interest_bps,
            cycle_ledger_gap: cycle_gap,
            cycle_due_ledger: 0,
        };

        set_group(&env, group_id, &group);
        set_members(&env, group_id, &members);
        set_invites(&env, group_id, &Vec::new(&env));
        set_payout_order(&env, group_id, &Vec::new(&env));

        group_id
    }

    /// Invites a user to a private group. Public groups do not require invites.
    pub fn invite_user(env: Env, group_id: u32, creator: Address, user: Address) {
        let group = get_group_or_panic(&env, group_id);
        require_creator(&env, &group, &creator);
        ensure_not_locked(&env, &group);

        let mut invites = get_invites(&env, group_id);
        if !contains_address(&invites, &user) {
            invites.push_back(user);
            set_invites(&env, group_id, &invites);
        }
    }

    /// Allows a user to join a public group, or a private group if invited.
    pub fn join_group(env: Env, group_id: u32, user: Address) {
        user.require_auth();

        let mut group = get_group_or_panic(&env, group_id);
        ensure_not_locked(&env, &group);

        if group.current_members >= group.max_members {
            panic_with_error!(&env, ContractError::GroupFull);
        }

        let mut members = get_members(&env, group_id);

        if contains_address(&members, &user) {
            panic_with_error!(&env, ContractError::AlreadyMember);
        }

        if group.visibility == GroupVisibility::Private {
            let invites = get_invites(&env, group_id);
            if !contains_address(&invites, &user) {
                panic_with_error!(&env, ContractError::NotInvited);
            }
        }

        members.push_back(user.clone());
        set_members(&env, group_id, &members);

        group.current_members += 1;
        set_group(&env, group_id, &group);

        let mut trust = get_user_trust_or_default(&env, &user);
        trust.joined_groups += 1;
        recalculate_reliability(&mut trust);
        set_user_trust(&env, &user, &trust);
    }

    /// Locks a full group so no further rule/member changes can be made.
    pub fn lock_group(env: Env, group_id: u32, creator: Address) {
        let mut group = get_group_or_panic(&env, group_id);
        require_creator(&env, &group, &creator);

        if group.current_members != group.max_members {
            panic_with_error!(&env, ContractError::GroupNotFull);
        }

        group.locked = true;
        group.status = GroupStatus::Active;
        group.current_cycle = 1;
        group.cycle_due_ledger = env.ledger().sequence() + group.cycle_ledger_gap;
        set_group(&env, group_id, &group);
    }

    /// Generates payout order using either join order or a pseudo-randomized order.
    pub fn generate_payout_order(env: Env, group_id: u32, creator: Address) {
        let group = get_group_or_panic(&env, group_id);
        require_creator(&env, &group, &creator);

        if !group.locked || group.status != GroupStatus::Active {
            panic_with_error!(&env, ContractError::InvalidGroupStatus);
        }

        let existing = get_payout_order_internal(&env, group_id);
        if existing.len() > 0 {
            panic_with_error!(&env, ContractError::PayoutOrderAlreadyGenerated);
        }

        let members = get_members(&env, group_id);

        if members.len() != group.max_members {
            panic_with_error!(&env, ContractError::GroupNotFull);
        }

        let order = if group.payout_order_mode == PayoutOrderMode::JoinOrder {
            members
        } else {
            pseudo_randomize_members(&env, group_id, &members)
        };

        set_payout_order(&env, group_id, &order);
    }

    /// Sender confirms they have paid into the current cycle.
    pub fn confirm_payment_sender(env: Env, group_id: u32, cycle: u32, sender: Address) {
        sender.require_auth();

        let group = get_group_or_panic(&env, group_id);
        if group.status != GroupStatus::Active {
            panic_with_error!(&env, ContractError::InvalidGroupStatus);
        }

        if cycle != group.current_cycle {
            panic_with_error!(&env, ContractError::InvalidCycle);
        }

        let members = get_members(&env, group_id);
        if !contains_address(&members, &sender) {
            panic_with_error!(&env, ContractError::Unauthorized);
        }

        let key = DataKey::SenderConfirmed(group_id, cycle, sender.clone());
        if env.storage().persistent().get::<_, bool>(&key).unwrap_or(false) {
            panic_with_error!(&env, ContractError::AlreadyConfirmed);
        }

        env.storage().persistent().set(&key, &true);

        // Same late-payment trust signal as `confirm_payment_receiver` (organizer has no separate receipt step).
        if sender == group.creator && env.ledger().sequence() > group.cycle_due_ledger {
            mark_late_once(&env, group_id, cycle, &sender);
        }
    }

    /// Receiver confirms receipt from a sender for the current cycle.
    /// MVP rule: the creator is the collector/receiver.
    /// The creator's own contribution is fully confirmed after `confirm_payment_sender` only.
    pub fn confirm_payment_receiver(
        env: Env,
        group_id: u32,
        cycle: u32,
        receiver: Address,
        sender: Address,
    ) {
        receiver.require_auth();

        let group = get_group_or_panic(&env, group_id);

        if group.status != GroupStatus::Active {
            panic_with_error!(&env, ContractError::InvalidGroupStatus);
        }

        if cycle != group.current_cycle {
            panic_with_error!(&env, ContractError::InvalidCycle);
        }

        if receiver != group.creator {
            panic_with_error!(&env, ContractError::Unauthorized);
        }

        let members = get_members(&env, group_id);
        if !contains_address(&members, &sender) {
            panic_with_error!(&env, ContractError::Unauthorized);
        }

        let key = DataKey::ReceiverConfirmed(group_id, cycle, sender.clone());

        if env.storage().persistent().get::<_, bool>(&key).unwrap_or(false) {
            panic_with_error!(&env, ContractError::AlreadyConfirmed);
        }

        // If payment is confirmed after the cycle due ledger, mark as late once.
        if env.ledger().sequence() > group.cycle_due_ledger {
            mark_late_once(&env, group_id, cycle, &sender);
        }

        env.storage().persistent().set(&key, &true);
    }

    /// Marks all currently unpaid users as missed for the current cycle after the due ledger passes.
    pub fn mark_missed_payments(env: Env, group_id: u32, creator: Address) {
        let group = get_group_or_panic(&env, group_id);
        require_creator(&env, &group, &creator);

        if group.status != GroupStatus::Active {
            panic_with_error!(&env, ContractError::InvalidGroupStatus);
        }

        if env.ledger().sequence() <= group.cycle_due_ledger {
            panic_with_error!(&env, ContractError::CycleNotOverdue);
        }

        let members = get_members(&env, group_id);
        let len = members.len();

        let mut i = 0;
        while i < len {
            let member = match members.get(i) {
                Some(m) => m,
                None => panic_with_error!(&env, ContractError::InvalidGroupStatus),
            };

            if !is_payment_confirmed(&env, group_id, group.current_cycle, &member) {
                mark_missed_once(&env, group_id, group.current_cycle, &member);
            }

            i += 1;
        }
    }

    /// Returns true only when both sender and receiver have confirmed.
    pub fn verify_payment(env: Env, group_id: u32, cycle: u32, sender: Address) -> bool {
        is_payment_confirmed(&env, group_id, cycle, &sender)
    }

    /// Returns the payment state for a single member in a cycle.
    pub fn get_payment_status(
        env: Env,
        group_id: u32,
        cycle: u32,
        sender: Address,
    ) -> PaymentState {
        let group = get_group_or_panic(&env, group_id);
        let sender_ok = env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::SenderConfirmed(group_id, cycle, sender.clone()))
            .unwrap_or(false);

        let receiver_ok = env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::ReceiverConfirmed(group_id, cycle, sender.clone()))
            .unwrap_or(false);

        let organizer_done = sender == group.creator && sender_ok;

        if organizer_done || (sender_ok && receiver_ok) {
            PaymentState::Confirmed
        } else if sender_ok || receiver_ok {
            PaymentState::PendingConfirmation
        } else {
            PaymentState::Unpaid
        }
    }

    /// Marks the current cycle payout as released by the organizer (off-chain handoff).
    /// The round recipient must call `confirm_payout_received` before the cycle can advance.
    /// Each address may only go through this flow once per group (enforced via `ReceivedPayout`).
    pub fn release_cycle_payout(env: Env, group_id: u32, creator: Address) -> Address {
        let group = get_group_or_panic(&env, group_id);
        require_creator(&env, &group, &creator);

        if group.status != GroupStatus::Active {
            panic_with_error!(&env, ContractError::InvalidGroupStatus);
        }

        let order = get_payout_order_internal(&env, group_id);
        if order.len() == 0 {
            panic_with_error!(&env, ContractError::InvalidGroupStatus);
        }

        if !all_cycle_payments_confirmed(&env, group_id, group.current_cycle) {
            panic_with_error!(&env, ContractError::PaymentNotConfirmed);
        }

        let current = group.current_cycle;
        let released_key = DataKey::PayoutReleased(group_id, current);
        if env
            .storage()
            .persistent()
            .get::<_, bool>(&released_key)
            .unwrap_or(false)
        {
            panic_with_error!(&env, ContractError::AlreadyReceivedPayout);
        }

        let recipient = current_recipient(&env, group_id, current);

        env.storage().persistent().set(&released_key, &true);
        recipient
    }

    /// Payout handoff: not released → released by organizer → recipient confirmed.
    pub fn get_payout_state(env: Env, group_id: u32, cycle: u32) -> PayoutState {
        let group = get_group_or_panic(&env, group_id);
        if group.status != GroupStatus::Active || cycle == 0 || cycle != group.current_cycle {
            return PayoutState::NotReleased;
        }
        let released = env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::PayoutReleased(group_id, cycle))
            .unwrap_or(false);
        if !released {
            return PayoutState::NotReleased;
        }
        let recipient = current_recipient(&env, group_id, cycle);
        let recipient_confirmed = env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::ReceivedPayout(group_id, recipient.clone()))
            .unwrap_or(false);
        if recipient_confirmed {
            PayoutState::ReceivedConfirmedByRecipient
        } else {
            PayoutState::ReleasedByOrganizer
        }
    }

    /// Round recipient confirms they received the payout. Requires `release_cycle_payout` for this round first. Idempotent.
    pub fn confirm_payout_received(env: Env, group_id: u32, cycle: u32, recipient: Address) {
        recipient.require_auth();
        let group = get_group_or_panic(&env, group_id);
        if group.status != GroupStatus::Active {
            panic_with_error!(&env, ContractError::InvalidGroupStatus);
        }
        if cycle == 0 || cycle != group.current_cycle {
            panic_with_error!(&env, ContractError::InvalidCycle);
        }
        let expected = current_recipient(&env, group_id, cycle);
        if expected != recipient {
            panic_with_error!(&env, ContractError::InvalidPayoutRecipient);
        }
        let released = env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::PayoutReleased(group_id, cycle))
            .unwrap_or(false);
        if !released {
            panic_with_error!(&env, ContractError::PayoutNotReleased);
        }
        let ack_key = DataKey::ReceivedPayout(group_id, recipient.clone());
        if env.storage().persistent().get::<_, bool>(&ack_key).unwrap_or(false) {
            return;
        }
        env.storage().persistent().set(&ack_key, &true);
    }

    /// Advances to the next cycle only after the round recipient has confirmed payout receipt.
    /// If all cycles are complete, marks the group as completed and updates completed_groups for all members.
    pub fn advance_cycle(env: Env, group_id: u32, creator: Address) {
        let mut group = get_group_or_panic(&env, group_id);
        require_creator(&env, &group, &creator);

        if group.status != GroupStatus::Active {
            panic_with_error!(&env, ContractError::InvalidGroupStatus);
        }

        let recipient = current_recipient(&env, group_id, group.current_cycle);

        let released = env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::PayoutReleased(group_id, group.current_cycle))
            .unwrap_or(false);
        if !released {
            panic_with_error!(&env, ContractError::PayoutNotReleased);
        }

        let recipient_confirmed = env
            .storage()
            .persistent()
            .get::<_, bool>(&DataKey::ReceivedPayout(group_id, recipient.clone()))
            .unwrap_or(false);

        if !recipient_confirmed {
            panic_with_error!(&env, ContractError::PayoutRecipientNotConfirmed);
        }

        if group.current_cycle >= group.total_cycles {
            group.status = GroupStatus::Completed;

            let members = get_members(&env, group_id);
            let len = members.len();

            let mut i = 0;
            while i < len {
                let member = match members.get(i) {
                    Some(m) => m,
                    None => panic_with_error!(&env, ContractError::InvalidGroupStatus),
                };

                let mut trust = get_user_trust_or_default(&env, &member);
                trust.completed_groups += 1;
                recalculate_reliability(&mut trust);
                set_user_trust(&env, &member, &trust);

                i += 1;
            }
        } else {
            group.current_cycle += 1;
            group.cycle_due_ledger = env.ledger().sequence() + group.cycle_ledger_gap;
        }

        set_group(&env, group_id, &group);
    }

    pub fn get_group(env: Env, group_id: u32) -> Group {
        get_group_or_panic(&env, group_id)
    }

    pub fn get_group_members(env: Env, group_id: u32) -> Vec<Address> {
        get_members(&env, group_id)
    }

    pub fn get_payout_order(env: Env, group_id: u32) -> Vec<Address> {
        get_payout_order_internal(&env, group_id)
    }

    pub fn get_user_trust(env: Env, user: Address) -> UserTrust {
        get_user_trust_or_default(&env, &user)
    }

    /// Sets or updates the caller's username (public, unique).
    /// Rules: 3..=20 chars, only [a-z0-9_].
    pub fn set_username(env: Env, user: Address, username: String) {
        user.require_auth();
        validate_username(&env, &username);

        // Enforce uniqueness
        if let Some(owner) = get_username_owner(&env, &username) {
            if owner != user {
                panic_with_error!(env, ContractError::UsernameTaken);
            }
        }

        // If renaming, free the old username
        if let Some(old) = get_username(&env, &user) {
            if old != username {
                remove_username_owner(&env, &old);
            }
        }

        set_username(&env, &user, &username);
        set_username_owner(&env, &username, &user);
    }

    pub fn get_username(env: Env, user: Address) -> Option<String> {
        get_username(&env, &user)
    }

    pub fn get_username_owner(env: Env, username: String) -> Option<Address> {
        validate_username(&env, &username);
        get_username_owner(&env, &username)
    }

    /// Lists public groups by scanning a range of IDs.
    /// Note: Soroban contracts can't iterate storage keys directly, so callers page by ID range.
    pub fn list_public_groups(env: Env, start_id: u32, limit: u32) -> Vec<ListedGroup> {
        let mut out: Vec<ListedGroup> = Vec::new(&env);
        if limit == 0 {
            return out;
        }

        let mut id = start_id;
        let end = start_id.saturating_add(limit);
        while id < end {
            if let Some(group) = env
                .storage()
                .persistent()
                .get::<_, Group>(&DataKey::Group(id))
            {
                if group.visibility == GroupVisibility::Public && group.status != GroupStatus::Completed {
                    out.push_back(ListedGroup { id, group });
                }
            }
            id += 1;
        }

        out
    }
}

#[cfg(test)]
mod test;
