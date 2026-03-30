#![cfg(test)]

extern crate std;

mod tests {
    use soroban_sdk::{
        symbol_short,
        testutils::{Address as _, Ledger, LedgerInfo},
        Address, Env, String, Symbol, Vec,
    };

    use crate::{
        CreateGroupParams, GroupStatus, GroupVisibility, OrganizerRole, PaluwaganContract,
        PaluwaganContractClient, PaymentState, PayoutState,
    };

    struct TestCtx {
        env: Env,
        client: PaluwaganContractClient<'static>,
        creator: Address,
        alice: Address,
        bob: Address,
        carol: Address,
        dave: Address,
        outsider: Address,
    }

    fn setup_ctx() -> TestCtx {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(PaluwaganContract, ());
        let client = PaluwaganContractClient::new(&env, &contract_id);

        TestCtx {
            env,
            client,
            creator: Address::generate(&Env::default()),
            alice: Address::generate(&Env::default()),
            bob: Address::generate(&Env::default()),
            carol: Address::generate(&Env::default()),
            dave: Address::generate(&Env::default()),
            outsider: Address::generate(&Env::default()),
        }
    }

    fn fix_ctx_addresses(ctx: &mut TestCtx) {
        // Address::generate must be tied to the same env used by the contract.
        ctx.creator = Address::generate(&ctx.env);
        ctx.alice = Address::generate(&ctx.env);
        ctx.bob = Address::generate(&ctx.env);
        ctx.carol = Address::generate(&ctx.env);
        ctx.dave = Address::generate(&ctx.env);
        ctx.outsider = Address::generate(&ctx.env);
    }

    fn set_ledger_sequence(env: &Env, sequence_number: u32) {
        env.ledger().set(LedgerInfo {
            timestamp: 0,
            protocol_version: 22,
            sequence_number,
            network_id: [0; 32],
            base_reserve: 10,
            min_temp_entry_ttl: 16,
            min_persistent_entry_ttl: 16,
            max_entry_ttl: 6_312_000,
        });
    }

    fn create_group(
        ctx: &TestCtx,
        organizer_role: &str,
        payout_order_mode: &str,
        is_public: bool,
        max_members: u32,
    ) -> u32 {
        ctx.client.create_group(
            &ctx.creator,
            &CreateGroupParams {
                name: String::from_str(&ctx.env, "Test Group"),
                organizer_role: Symbol::new(&ctx.env, organizer_role),
                payout_order_mode: Symbol::new(&ctx.env, payout_order_mode),
                contribution_amount: 1000_i128,
                max_members,
                schedule: symbol_short!("weekly"),
                payout_type: symbol_short!("cash"),
                is_public,
                interest_bps: 0_u32,
                custom_cycle_ledger_gap: 0_u32,
            },
        )
    }

    fn create_group_custom_gap(
        ctx: &TestCtx,
        organizer_role: &str,
        payout_order_mode: &str,
        is_public: bool,
        max_members: u32,
        custom_gap: u32,
    ) -> u32 {
        ctx.client.create_group(
            &ctx.creator,
            &CreateGroupParams {
                name: String::from_str(&ctx.env, "Test Group"),
                organizer_role: Symbol::new(&ctx.env, organizer_role),
                payout_order_mode: Symbol::new(&ctx.env, payout_order_mode),
                contribution_amount: 1000_i128,
                max_members,
                schedule: Symbol::new(&ctx.env, "custom"),
                payout_type: symbol_short!("cash"),
                is_public,
                interest_bps: 0_u32,
                custom_cycle_ledger_gap: custom_gap,
            },
        )
    }

    fn fill_public_group(ctx: &TestCtx, group_id: u32, members: &[Address]) {
        for m in members {
            ctx.client.join_group(&group_id, m);
        }
    }

    fn lock_and_generate(ctx: &TestCtx, group_id: u32) {
        ctx.client.lock_group(&group_id, &ctx.creator);
        ctx.client.generate_payout_order(&group_id, &ctx.creator);
    }

    fn confirm_full_cycle(ctx: &TestCtx, group_id: u32, cycle: u32, members: &[Address]) {
        for m in members {
            ctx.client.confirm_payment_sender(&group_id, &cycle, m);
        }
        for m in members {
            ctx.client
                .confirm_payment_receiver(&group_id, &cycle, &ctx.creator, m);
        }
    }

    /// Organizer releases payout for `current_cycle`, then the round recipient confirms receipt (required before `advance_cycle`).
    fn release_and_confirm_payout(ctx: &TestCtx, group_id: u32) -> Address {
        let g = ctx.client.get_group(&group_id);
        let cycle = g.current_cycle;
        let recipient = ctx.client.release_cycle_payout(&group_id, &ctx.creator);
        ctx.client
            .confirm_payout_received(&group_id, &cycle, &recipient);
        recipient
    }

    fn soroban_vec_contains(v: &Vec<Address>, a: &Address) -> bool {
        let mut i = 0;
        while i < v.len() {
            if v.get(i) == Some(a.clone()) {
                return true;
            }
            i += 1;
        }
        false
    }

    #[test]
    fn test_create_group_org_only() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 3);
        let g = ctx.client.get_group(&gid);
        let members = ctx.client.get_group_members(&gid);

        assert_eq!(g.name, String::from_str(&ctx.env, "Test Group"));
        assert_eq!(g.organizer_role, OrganizerRole::OrganizerOnly);
        assert_eq!(g.current_members, 0);
        assert_eq!(members.len(), 0);
        assert_eq!(g.visibility, GroupVisibility::Public);
    }

    #[test]
    fn test_create_group_org_member() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_member", "join_order", true, 3);
        let g = ctx.client.get_group(&gid);

        assert_eq!(g.organizer_role, OrganizerRole::OrganizerAsMember);
        assert_eq!(g.current_members, 1);
    }

    #[test]
    fn test_organizer_auto_added_when_org_member() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_member", "join_order", true, 3);
        let members = ctx.client.get_group_members(&gid);

        assert_eq!(members.len(), 1);
        assert_eq!(members.get(0), Some(ctx.creator.clone()));
    }

    #[test]
    fn test_public_group_join_success() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 3);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);

        let g = ctx.client.get_group(&gid);
        let members = ctx.client.get_group_members(&gid);

        assert_eq!(g.current_members, 2);
        assert_eq!(members.len(), 2);
        assert_eq!(members.get(0), Some(ctx.alice.clone()));
        assert_eq!(members.get(1), Some(ctx.bob.clone()));
    }

    #[test]
    #[should_panic]
    fn test_private_group_requires_invite() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", false, 2);
        ctx.client.join_group(&gid, &ctx.alice);
    }

    #[test]
    fn test_private_group_join_succeeds_after_invite() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", false, 2);
        ctx.client.invite_user(&gid, &ctx.creator, &ctx.alice);
        ctx.client.join_group(&gid, &ctx.alice);

        let g = ctx.client.get_group(&gid);
        assert_eq!(g.current_members, 1);
    }

    #[test]
    #[should_panic]
    fn test_group_cannot_exceed_max_members() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        ctx.client.join_group(&gid, &ctx.carol);
    }

    #[test]
    #[should_panic]
    fn test_group_cannot_be_joined_after_lock() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        ctx.client.lock_group(&gid, &ctx.creator);

        // Locked groups should reject additional joins.
        ctx.client.join_group(&gid, &ctx.carol);
    }

    #[test]
    #[should_panic]
    fn test_group_cannot_be_locked_unless_full() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 3);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        ctx.client.lock_group(&gid, &ctx.creator);
    }

    #[test]
    fn test_payout_order_generation_join_order() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 3);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone(), ctx.carol.clone()]);
        lock_and_generate(&ctx, gid);

        let order = ctx.client.get_payout_order(&gid);
        assert_eq!(order.len(), 3);
        assert_eq!(order.get(0), Some(ctx.alice.clone()));
        assert_eq!(order.get(1), Some(ctx.bob.clone()));
        assert_eq!(order.get(2), Some(ctx.carol.clone()));
    }

    #[test]
    fn test_payout_order_generation_randomized() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        set_ledger_sequence(&ctx.env, 1);

        let gid = create_group(&ctx, "org_only", "randomized", true, 3);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone(), ctx.carol.clone()]);
        lock_and_generate(&ctx, gid);

        let order = ctx.client.get_payout_order(&gid);
        assert_eq!(order.len(), 3);

        // Strong check for current implementation: randomized order is a rotation/permutation.
        assert!(soroban_vec_contains(&order, &ctx.alice));
        assert!(soroban_vec_contains(&order, &ctx.bob));
        assert!(soroban_vec_contains(&order, &ctx.carol));

        // With sequence=1 and first group id, offset is non-zero, so order should differ from join order.
        // Limitation: if the randomization algorithm changes, this exact expectation may need updating.
        assert_ne!(order.get(0), Some(ctx.alice.clone()));
    }

    #[test]
    #[should_panic]
    fn test_payout_order_cannot_be_generated_twice() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);
        ctx.client.generate_payout_order(&gid, &ctx.creator);
    }

    #[test]
    fn test_sender_payment_confirmation_works() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        ctx.client.confirm_payment_sender(&gid, &1, &ctx.alice);
        assert_eq!(
            ctx.client.get_payment_status(&gid, &1, &ctx.alice),
            PaymentState::PendingConfirmation
        );
    }

    #[test]
    fn test_organizer_member_does_not_need_receiver_confirm_for_own_payment() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_member", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone()]);
        lock_and_generate(&ctx, gid);

        ctx.client.confirm_payment_sender(&gid, &1, &ctx.creator);
        assert_eq!(
            ctx.client.get_payment_status(&gid, &1, &ctx.creator),
            PaymentState::Confirmed
        );
        assert!(ctx.client.verify_payment(&gid, &1, &ctx.creator));

        ctx.client.confirm_payment_sender(&gid, &1, &ctx.alice);
        ctx.client
            .confirm_payment_receiver(&gid, &1, &ctx.creator, &ctx.alice);

        let rid = ctx.client.release_cycle_payout(&gid, &ctx.creator);
        ctx.client.confirm_payout_received(&gid, &1, &rid);
    }

    #[test]
    fn test_receiver_confirmation_works() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        ctx.client.confirm_payment_sender(&gid, &1, &ctx.alice);
        ctx.client
            .confirm_payment_receiver(&gid, &1, &ctx.creator, &ctx.alice);

        assert_eq!(ctx.client.verify_payment(&gid, &1, &ctx.alice), true);
    }

    #[test]
    fn test_payment_stays_pending_if_only_sender_confirms() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        ctx.client.confirm_payment_sender(&gid, &1, &ctx.alice);
        assert_eq!(
            ctx.client.get_payment_status(&gid, &1, &ctx.alice),
            PaymentState::PendingConfirmation
        );
    }

    #[test]
    fn test_payment_becomes_confirmed_after_both_confirmations() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        ctx.client.confirm_payment_sender(&gid, &1, &ctx.alice);
        ctx.client
            .confirm_payment_receiver(&gid, &1, &ctx.creator, &ctx.alice);

        assert_eq!(
            ctx.client.get_payment_status(&gid, &1, &ctx.alice),
            PaymentState::Confirmed
        );
    }

    #[test]
    #[should_panic]
    fn test_non_member_cannot_confirm_payment() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        ctx.client
            .confirm_payment_sender(&gid, &1, &ctx.outsider);
    }

    #[test]
    #[should_panic]
    fn test_non_creator_cannot_confirm_as_receiver() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        ctx.client.confirm_payment_sender(&gid, &1, &ctx.alice);
        ctx.client
            .confirm_payment_receiver(&gid, &1, &ctx.bob, &ctx.alice);
    }

    #[test]
    #[should_panic]
    fn test_cannot_release_payout_if_any_member_unconfirmed() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        ctx.client.confirm_payment_sender(&gid, &1, &ctx.alice);
        ctx.client
            .confirm_payment_receiver(&gid, &1, &ctx.creator, &ctx.alice);

        ctx.client.release_cycle_payout(&gid, &ctx.creator);
    }

    #[test]
    fn test_payout_succeeds_when_all_payments_confirmed() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        confirm_full_cycle(&ctx, gid, 1, &[ctx.alice.clone(), ctx.bob.clone()]);
        let recipient = ctx.client.release_cycle_payout(&gid, &ctx.creator);

        assert_eq!(recipient, ctx.alice);
        assert_eq!(
            ctx.client.get_payout_state(&gid, &1),
            PayoutState::ReleasedByOrganizer
        );
        ctx.client.confirm_payout_received(&gid, &1, &recipient);
        assert_eq!(
            ctx.client.get_payout_state(&gid, &1),
            PayoutState::ReceivedConfirmedByRecipient
        );
    }

    #[test]
    #[should_panic]
    fn test_same_user_cannot_receive_payout_twice() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        // Single-member group is the strongest direct way to test duplicate payout prevention.
        let gid = create_group(&ctx, "org_member", "join_order", true, 1);
        lock_and_generate(&ctx, gid);

        confirm_full_cycle(&ctx, gid, 1, &[ctx.creator.clone()]);
        let _ = ctx.client.release_cycle_payout(&gid, &ctx.creator);

        // Same cycle and same recipient, second release must fail with AlreadyReceivedPayout.
        let _ = ctx.client.release_cycle_payout(&gid, &ctx.creator);
    }

    #[test]
    #[should_panic]
    fn test_cycle_cannot_advance_without_organizer_release() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        ctx.client.advance_cycle(&gid, &ctx.creator);
    }

    #[test]
    #[should_panic]
    fn test_cycle_cannot_advance_after_release_until_recipient_confirms() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        confirm_full_cycle(&ctx, gid, 1, &[ctx.alice.clone(), ctx.bob.clone()]);
        let _ = ctx.client.release_cycle_payout(&gid, &ctx.creator);
        ctx.client.advance_cycle(&gid, &ctx.creator);
    }

    #[test]
    fn test_group_completes_only_after_final_cycle() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        confirm_full_cycle(&ctx, gid, 1, &[ctx.alice.clone(), ctx.bob.clone()]);
        let _ = release_and_confirm_payout(&ctx, gid);
        ctx.client.advance_cycle(&gid, &ctx.creator);

        let g_mid = ctx.client.get_group(&gid);
        assert_eq!(g_mid.status, GroupStatus::Active);
        assert_eq!(g_mid.current_cycle, 2);

        confirm_full_cycle(&ctx, gid, 2, &[ctx.alice.clone(), ctx.bob.clone()]);
        let _ = release_and_confirm_payout(&ctx, gid);
        ctx.client.advance_cycle(&gid, &ctx.creator);

        let g_end = ctx.client.get_group(&gid);
        assert_eq!(g_end.status, GroupStatus::Completed);
        assert_eq!(g_end.current_cycle, 2);
    }

    #[test]
    fn test_members_must_still_pay_after_already_receiving_payout() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        confirm_full_cycle(&ctx, gid, 1, &[ctx.alice.clone(), ctx.bob.clone()]);
        let first_recipient = release_and_confirm_payout(&ctx, gid);
        assert_eq!(first_recipient, ctx.alice);
        ctx.client.advance_cycle(&gid, &ctx.creator);

        // Alice already got payout in cycle 1, but still must pay in cycle 2.
        assert_eq!(
            ctx.client.get_payment_status(&gid, &2, &ctx.alice),
            PaymentState::Unpaid
        );

        ctx.client.confirm_payment_sender(&gid, &2, &ctx.alice);
        assert_eq!(
            ctx.client.get_payment_status(&gid, &2, &ctx.alice),
            PaymentState::PendingConfirmation
        );
    }

    #[test]
    fn test_completed_groups_updates_only_when_group_fully_completed() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        assert_eq!(ctx.client.get_user_trust(&ctx.alice).completed_groups, 0);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        confirm_full_cycle(&ctx, gid, 1, &[ctx.alice.clone(), ctx.bob.clone()]);
        let _ = release_and_confirm_payout(&ctx, gid);
        ctx.client.advance_cycle(&gid, &ctx.creator);

        assert_eq!(ctx.client.get_user_trust(&ctx.alice).completed_groups, 0);

        confirm_full_cycle(&ctx, gid, 2, &[ctx.alice.clone(), ctx.bob.clone()]);
        let _ = release_and_confirm_payout(&ctx, gid);
        ctx.client.advance_cycle(&gid, &ctx.creator);

        assert_eq!(ctx.client.get_user_trust(&ctx.alice).completed_groups, 1);
        assert_eq!(ctx.client.get_user_trust(&ctx.bob).completed_groups, 1);
    }

    #[test]
    fn test_new_user_trust_score_is_none() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let trust = ctx.client.get_user_trust(&ctx.outsider);
        assert_eq!(trust.reliability_score, None);
    }

    #[test]
    fn test_successful_member_gets_reliability_score_some_5() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        confirm_full_cycle(&ctx, gid, 1, &[ctx.alice.clone(), ctx.bob.clone()]);
        let _ = release_and_confirm_payout(&ctx, gid);
        ctx.client.advance_cycle(&gid, &ctx.creator);

        confirm_full_cycle(&ctx, gid, 2, &[ctx.alice.clone(), ctx.bob.clone()]);
        let _ = release_and_confirm_payout(&ctx, gid);
        ctx.client.advance_cycle(&gid, &ctx.creator);

        assert_eq!(ctx.client.get_user_trust(&ctx.alice).reliability_score, Some(5));
        assert_eq!(ctx.client.get_user_trust(&ctx.bob).reliability_score, Some(5));
    }

    #[test]
    fn test_late_payment_updates_trust_correctly() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        set_ledger_sequence(&ctx.env, 10);

        let gid = create_group_custom_gap(&ctx, "org_only", "join_order", true, 2, 1);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        // Mark Alice's sender confirmation in cycle 1.
        ctx.client.confirm_payment_sender(&gid, &1, &ctx.alice);

        // Move ledger past due so receiver confirmation marks payment as late.
        let group = ctx.client.get_group(&gid);
        set_ledger_sequence(&ctx.env, group.cycle_due_ledger + 1);

        ctx.client
            .confirm_payment_receiver(&gid, &1, &ctx.creator, &ctx.alice);

        let trust = ctx.client.get_user_trust(&ctx.alice);
        assert_eq!(trust.late_payments, 1);
    }

    #[test]
    fn test_missed_payment_updates_trust_correctly() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        set_ledger_sequence(&ctx.env, 100);

        let gid = create_group_custom_gap(&ctx, "org_only", "join_order", true, 2, 1);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        // Alice fully confirms, Bob remains unpaid and should be marked missed.
        ctx.client.confirm_payment_sender(&gid, &1, &ctx.alice);
        ctx.client
            .confirm_payment_receiver(&gid, &1, &ctx.creator, &ctx.alice);

        let group = ctx.client.get_group(&gid);
        set_ledger_sequence(&ctx.env, group.cycle_due_ledger + 1);
        ctx.client.mark_missed_payments(&gid, &ctx.creator);

        let bob_trust = ctx.client.get_user_trust(&ctx.bob);
        assert_eq!(bob_trust.missed_payments, 1);
    }

    #[test]
    #[should_panic]
    fn test_mark_missed_payments_fails_if_cycle_not_overdue() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        set_ledger_sequence(&ctx.env, 100);

        let gid = create_group_custom_gap(&ctx, "org_only", "join_order", true, 2, 100);
        fill_public_group(&ctx, gid, &[ctx.alice.clone(), ctx.bob.clone()]);
        lock_and_generate(&ctx, gid);

        // Due ledger is still in the future, so this should panic with CycleNotOverdue.
        ctx.client.mark_missed_payments(&gid, &ctx.creator);
    }

    #[test]
    #[should_panic]
    fn test_creator_unauthorized_actions_rejected_for_non_creator() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 2);

        // Non-creator cannot call creator-only function.
        ctx.client.invite_user(&gid, &ctx.outsider, &ctx.alice);
    }

    #[test]
    #[should_panic]
    fn test_duplicate_membership_rejected() {
        let mut ctx = setup_ctx();
        fix_ctx_addresses(&mut ctx);

        let gid = create_group(&ctx, "org_only", "join_order", true, 3);
        ctx.client.join_group(&gid, &ctx.alice);
        ctx.client.join_group(&gid, &ctx.alice);
    }
}
