import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useToast } from "../hooks/useToast";
import {
  getGroup,
  getGroupMembers,
  getPayoutOrder,
  getPayoutState,
  getPaymentStatus,
  joinGroup,
  lockGroup,
  generatePayoutOrder,
  confirmPaymentSender,
  confirmPaymentReceiver,
  releaseCyclePayout,
  confirmPayoutReceived,
  advanceCycle,
  markMissedPayments,
  inviteUser,
  type Group,
  type PayoutState,
} from "../lib/contract";
import { getLatestLedgerSequence } from "../lib/stellar";
import { addMyGroup } from "../lib/store";
import { friendlyError } from "../lib/errors";
import StatusBadge from "../components/StatusBadge";
import MemberList from "../components/MemberList";
import PaymentStatusRow from "../components/PaymentStatusRow";
import ActionButton from "../components/ActionButton";
import {
  Users,
  Lock,
  Shuffle,
  Send,
  CheckCircle,
  ArrowRight,
  AlertTriangle,
  Copy,
  Check,
  UserPlus,
  ChevronRight,
  Clock,
  Award,
  Shield,
  Search,
  Plus,
} from "lucide-react";

interface MemberPayment {
  address: string;
  status: string;
}

type GroupRoute =
  | { kind: "hub" }
  | { kind: "invalid" }
  | { kind: "group"; id: number };

function resolveGroupRouteParam(raw: string | undefined): GroupRoute {
  if (raw == null || raw === "") return { kind: "hub" };
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return { kind: "invalid" };
  const id = parseInt(trimmed, 10);
  if (id < 1) return { kind: "invalid" };
  return { kind: "group", id };
}

export default function GroupDetailsPage() {
  const { id: idParam } = useParams<{ id?: string }>();
  const route = useMemo(() => resolveGroupRouteParam(idParam), [idParam]);
  const groupId = route.kind === "group" ? route.id : 0;

  const { address } = useWallet();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [payoutOrder, setPayoutOrder] = useState<string[]>([]);
  const [payments, setPayments] = useState<MemberPayment[]>([]);
  const [payoutState, setPayoutState] = useState<PayoutState>("NotReleased");
  const [loading, setLoading] = useState(() => route.kind === "group");
  const [error, setError] = useState<string | null>(null);
  const [currentLedger, setCurrentLedger] = useState<number>(0);

  const [joinIdInput, setJoinIdInput] = useState("");
  const [openingGroup, setOpeningGroup] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteAddress, setInviteAddress] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const isCreator = address && group?.creator === address;
  const isMember = address ? members.includes(address) : false;
  const canJoin =
    address &&
    !isMember &&
    group?.status === "WaitingForMembers" &&
    !group.locked &&
    (group.current_members < group.max_members);

  useEffect(() => {
    if (route.kind === "group") {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [route.kind]);

  useEffect(() => {
    if (route.kind === "hub" && !address) {
      navigate("/", { replace: true });
    }
  }, [route.kind, address, navigate]);

  const fetchData = useCallback(async () => {
    if (route.kind !== "group") {
      setGroup(null);
      setMembers([]);
      setPayoutOrder([]);
      setPayments([]);
      setPayoutState("NotReleased");
      setCurrentLedger(0);
      setError(null);
      setLoading(false);
      return;
    }

    const gid = route.id;
    setLoading(true);
    try {
      const [g, m, po, ledger] = await Promise.all([
        getGroup(gid),
        getGroupMembers(gid),
        getPayoutOrder(gid),
        getLatestLedgerSequence(),
      ]);
      setGroup(g);
      setMembers(m);
      setPayoutOrder(po);
      setCurrentLedger(ledger);

      if (g.status === "Active" && g.current_cycle > 0) {
        try {
          const ps = await getPayoutState(gid, g.current_cycle);
          setPayoutState(ps);
        } catch {
          setPayoutState("NotReleased");
        }
      } else {
        setPayoutState("NotReleased");
      }

      if (g.status === "Active" && g.current_cycle > 0 && m.length > 0) {
        const paymentPromises = m.map(async (memberAddr) => {
          try {
            const status = await getPaymentStatus(gid, g.current_cycle, memberAddr);
            return { address: memberAddr, status: status as string };
          } catch {
            return { address: memberAddr, status: "Unpaid" };
          }
        });
        const paymentResults = await Promise.all(paymentPromises);
        setPayments(paymentResults);
      } else {
        setPayments([]);
      }

      setError(null);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [route]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (route.kind !== "group" || !address || !group || !members.length) return;
    if (group.creator === address) {
      addMyGroup(address, groupId, "creator");
    } else if (members.includes(address)) {
      addMyGroup(address, groupId, "member");
    }
  }, [address, group, members, groupId, route.kind]);

  const openGroupFromInput = async () => {
    const cleaned = joinIdInput.trim().replace(/.*\/group\//, "").replace(/^#/, "");
    const id = parseInt(cleaned, 10);

    if (isNaN(id) || id < 1) {
      showToast("error", "Invalid group number", "Please enter a valid group number.");
      return;
    }

    setOpeningGroup(true);
    try {
      await getGroup(id);
      navigate(`/group/${id}`);
    } catch (err) {
      showToast("error", "Group not found", friendlyError(err));
    } finally {
      setOpeningGroup(false);
    }
  };

  const runAction = async (key: string, fn: () => Promise<unknown>, successMsg: string) => {
    setActionLoading(key);
    try {
      await fn();
      showToast("success", successMsg);
      await fetchData();
    } catch (err) {
      showToast("error", "Action failed", friendlyError(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleJoin = () =>
    runAction("join", () => {
      return joinGroup(groupId, address!).then(() => {
        addMyGroup(address!, groupId, "member");
      });
    }, "You've joined the group!");

  const handleLock = () =>
    runAction("lock", () => lockGroup(groupId, address!), "Group started! 🎉 Members can now begin contributing.");

  const handleGenerateOrder = () =>
    runAction("generateOrder", () => generatePayoutOrder(groupId, address!), "Payout order has been set!");

  const handleConfirmSender = () =>
    runAction("confirmSender", () => confirmPaymentSender(groupId, group!.current_cycle, address!), "Payment confirmed! Waiting for organizer to verify.");

  const handleConfirmReceiver = (sender: string) =>
    runAction(`confirmReceiver-${sender}`, () => confirmPaymentReceiver(groupId, group!.current_cycle, address!, sender), "Payment from member confirmed!");

  const handleReleasePayout = () =>
    runAction(
      "release",
      () => releaseCyclePayout(groupId, address!),
      "Payout marked as released. The recipient can confirm receipt on-chain.",
    );

  const handleConfirmPayoutReceived = () =>
    runAction(
      "confirmPayoutReceived",
      () => confirmPayoutReceived(groupId, group!.current_cycle, address!),
      "Receipt confirmed! ✅",
    );

  const handleAdvanceCycle = () =>
    runAction("advance", () => advanceCycle(groupId, address!), "Moved to the next round!");

  const handleMarkMissed = () =>
    runAction("markMissed", () => markMissedPayments(groupId, address!), "Missed payments have been marked.");

  const handleInvite = () => {
    if (!inviteAddress.trim()) return;
    runAction("invite", () => inviteUser(groupId, address!, inviteAddress.trim()).then(() => {
      setInviteAddress("");
    }), "Invitation sent!");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/group/${groupId}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  /** Compact “open group / create” row used on the hub and above group details. */
  const GroupQuickNav = ({ dense }: { dense?: boolean }) => (
    <div className="panel" style={dense ? { marginBottom: "var(--space-4)" } : undefined}>
      <h2 className="panel-title" style={dense ? { fontSize: "var(--font-size-base)" } : undefined}>
        <Search size={dense ? 18 : 20} />
        {dense ? "Open another group" : "Find a group"}
      </h2>
      {!dense && (
        <p className="text-sm text-muted mb-4">
          Enter the group number from your organizer. Public groups can be opened by anyone with the link;
          private groups require an on-chain invite.
        </p>
      )}
      <div className="inline-form" style={{ maxWidth: dense ? "100%" : 560, flexWrap: "wrap", gap: "var(--space-2)" }}>
        <input
          className="form-input"
          placeholder="e.g. 42 or #42 or …/group/42"
          value={joinIdInput}
          onChange={(e) => setJoinIdInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && openGroupFromInput()}
          style={{ minWidth: 200 }}
        />
        <ActionButton
          variant="primary"
          onClick={openGroupFromInput}
          loading={openingGroup}
          disabled={!joinIdInput.trim()}
        >
          <Search size={16} />
          Open
        </ActionButton>
        <ActionButton variant="secondary" onClick={() => navigate("/create")}>
          <Plus size={18} />
          New group
        </ActionButton>
      </div>
    </div>
  );

  if (route.kind === "hub") {
    if (!address) return null;
    return (
      <div className="container" style={{ paddingBottom: "var(--space-16)" }}>
        <div className="page-header">
          <h1 className="page-title">Group</h1>
          <p className="page-subtitle">Open a group by number or start a new one.</p>
        </div>
        <GroupQuickNav />
      </div>
    );
  }

  if (route.kind === "invalid") {
    return (
      <div className="container container--narrow" style={{ paddingBottom: "var(--space-16)" }}>
        <div className="empty-state" style={{ paddingTop: "var(--space-16)" }}>
          <div className="empty-state-icon">
            <AlertTriangle size={28} />
          </div>
          <div className="empty-state-title">Invalid group number</div>
          <p className="empty-state-desc">Use a positive whole number in the URL, for example <code>#/group/1</code>.</p>
        </div>
        {address ? <GroupQuickNav /> : (
          <p className="text-sm text-muted text-center">Connect your wallet to open or create a group.</p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading group details...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="container container--narrow">
        <div className="empty-state" style={{ paddingTop: "var(--space-16)" }}>
          <div className="empty-state-icon">
            <AlertTriangle size={28} />
          </div>
          <div className="empty-state-title">Group Not Found</div>
          <p className="empty-state-desc">{error || "We couldn't load this group."}</p>
          {address ? <GroupQuickNav /> : null}
          <ActionButton variant="ghost" onClick={() => navigate("/group")}>
            Back to find group
          </ActionButton>
        </div>
      </div>
    );
  }

  const currentRecipient = payoutOrder.length > 0 && group.current_cycle > 0
    ? payoutOrder[group.current_cycle - 1] || null
    : null;

  const isOverdue = group.cycle_due_ledger > 0 && currentLedger > group.cycle_due_ledger;
  const allConfirmed = payments.length > 0 && payments.every((p) => p.status === "Confirmed");
  const canReleasePayout =
    group.status === "Active" && payoutOrder.length > 0 && (allConfirmed || isOverdue);
  const isCurrentRecipient = Boolean(currentRecipient && address && address === currentRecipient);
  const canConfirmPayoutReceived =
    group.status === "Active"
    && isCurrentRecipient
    && payoutState === "ReleasedByOrganizer";
  const canAdvance =
    group.status === "Active"
    && payoutOrder.length > 0
    && payoutState === "ReceivedConfirmedByRecipient";

  const statusStepIndex = group.status === "WaitingForMembers" ? 0 : group.status === "Active" ? 1 : 2;

  return (
    <div className="container" style={{ paddingBottom: "var(--space-16)" }}>
      {address ? <GroupQuickNav dense /> : null}

      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">
              {group.name ? group.name : `Group #${groupId}`}
            </h1>
            <StatusBadge status={group.status} />
          </div>
          <p className="page-subtitle">
            <span style={{ fontWeight: 600 }}>#{groupId}</span>
            {" · "}
            {group.current_members}/{group.max_members} members
            {group.status === "Active" && ` · Round ${group.current_cycle} of ${group.total_cycles}`}
          </p>
        </div>
        <ActionButton variant="ghost" size="sm" onClick={copyLink}>
          {linkCopied ? <Check size={14} /> : <Copy size={14} />}
          {linkCopied ? "Copied!" : "Share Link"}
        </ActionButton>
      </div>

      {/* Status Flow */}
      <div className="status-flow">
        {["Waiting for Members", "Active", "Completed 🎉"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <ChevronRight size={16} className="status-flow-arrow" />}
            <span
              className={`status-flow-step${i === statusStepIndex ? " status-flow-step--active" : i < statusStepIndex ? " status-flow-step--done" : ""}`}
            >
              {i < statusStepIndex ? <CheckCircle size={14} /> : null}
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Contextual Banners */}
      {canJoin && group.visibility === "Public" && (
        <div className="banner banner--info">
          <Users size={18} />
          This group is open! You can join and start saving together.
        </div>
      )}

      {isCreator && group.status === "WaitingForMembers" && group.current_members === group.max_members && !group.locked && (
        <div className="banner banner--success">
          <CheckCircle size={18} />
          All spots are filled! You can now start the group.
        </div>
      )}

      {isCreator && group.status === "Active" && payoutOrder.length === 0 && (
        <div className="banner banner--warning">
          <AlertTriangle size={18} />
          The group is active but the payout order hasn't been set yet.
        </div>
      )}

      {isCreator && isOverdue && group.status === "Active" && (
        <div className="banner banner--warning">
          <Clock size={18} />
          Round deadline has passed. You can mark missed payments, or release the payout — unpaid members who
          still owe this round will be recorded as missed in trust scores.
        </div>
      )}

      {group.status === "Active" && payoutState === "ReleasedByOrganizer" && (
        <div className="banner banner--info">
          <CheckCircle size={18} />
          Payout has been released by the organizer. Waiting for the recipient to confirm receipt.
        </div>
      )}

      {/* Join Button (visitor) */}
      {canJoin && (
        <div className="action-bar">
          <ActionButton
            variant="primary"
            size="lg"
            onClick={handleJoin}
            loading={actionLoading === "join"}
          >
            <UserPlus size={18} />
            Join This Group
          </ActionButton>
        </div>
      )}

      {/* Recipient receipt confirmation */}
      {canConfirmPayoutReceived && (
        <div className="action-bar">
          <ActionButton
            variant="primary"
            size="lg"
            onClick={handleConfirmPayoutReceived}
            loading={actionLoading === "confirmPayoutReceived"}
          >
            <CheckCircle size={18} />
            I received the payout
          </ActionButton>
        </div>
      )}

      {/* Group Summary */}
      <div className="panel">
        <h2 className="panel-title">
          <Shield size={18} />
          Group Details
        </h2>
        <div className="card">
          <div className="card-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", fontSize: "var(--font-size-sm)" }}>
              <span className="text-muted">Contribution:</span>
              <span className="font-semibold">{Number(group.contribution_amount) / 1e7} XLM per round</span>
              <span className="text-muted">Schedule:</span>
              <span style={{ textTransform: "capitalize" }}>{group.schedule}</span>
              <span className="text-muted">Payout type:</span>
              <span style={{ textTransform: "capitalize" }}>{group.payout_type}</span>
              <span className="text-muted">Payout order:</span>
              <span>{group.payout_order_mode === "JoinOrder" ? "First come, first served" : "Randomized"}</span>
              <span className="text-muted">Visibility:</span>
              <span>{group.visibility === "Public" ? "Public (anyone can join)" : "Private (invite only)"}</span>
              <span className="text-muted">Organizer role:</span>
              <span>{group.organizer_role === "OrganizerAsMember" ? "Organizer & Member" : "Organizer only"}</span>
              {group.interest_bps > 0 && (
                <>
                  <span className="text-muted">Interest:</span>
                  <span>{(group.interest_bps / 100).toFixed(2)}%</span>
                </>
              )}
              {group.status === "Active" && group.cycle_due_ledger > 0 && (
                <>
                  <span className="text-muted">Round deadline:</span>
                  <span>
                    Ledger #{group.cycle_due_ledger}
                    {isOverdue ? (
                      <span className="badge badge--danger" style={{ marginLeft: 8 }}>Overdue</span>
                    ) : (
                      <span className="badge badge--active" style={{ marginLeft: 8 }}>
                        ~{Math.max(0, group.cycle_due_ledger - currentLedger)} ledgers left
                      </span>
                    )}
                  </span>
                </>
              )}
              {currentRecipient && (
                <>
                  <span className="text-muted">This round's recipient:</span>
                  <span className="address">
                    {currentRecipient.slice(0, 6)}...{currentRecipient.slice(-4)}
                    {currentRecipient === address && (
                      <span className="badge badge--success" style={{ marginLeft: 8 }}>You!</span>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="panel">
        <h2 className="panel-title">
          <Users size={18} />
          Members ({members.length}/{group.max_members})
        </h2>
        {members.length === 0 ? (
          <div className="card">
            <div className="card-body text-center text-muted">
              No members yet.
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <MemberList
                members={members}
                payoutOrder={payoutOrder}
                currentCycle={group.current_cycle}
                creatorAddress={group.creator}
                currentUserAddress={address}
              />
            </div>
          </div>
        )}
      </div>

      {/* Payment Status (Active groups only) */}
      {group.status === "Active" && group.current_cycle > 0 && (
        <div className="panel">
          <h2 className="panel-title">
            <Send size={18} />
            Payment Status — Round {group.current_cycle}
          </h2>
          <div className="payment-matrix">
            {payments.map((p) => {
              const isYou = p.address === address;
              const isRecipientThisRound =
                Boolean(currentRecipient && p.address === currentRecipient);
              const displayStatus = isRecipientThisRound ? "RecipientRound" : p.status;
              let actionBtn = null;

              if (isYou && isMember && p.status === "Unpaid") {
                actionBtn = (
                  <ActionButton
                    variant="primary"
                    size="sm"
                    onClick={handleConfirmSender}
                    loading={actionLoading === "confirmSender"}
                  >
                    I've Sent My Payment
                  </ActionButton>
                );
              }

              if (isCreator && !isYou && p.status === "PendingConfirmation") {
                actionBtn = (
                  <ActionButton
                    variant="primary"
                    size="sm"
                    onClick={() => handleConfirmReceiver(p.address)}
                    loading={actionLoading === `confirmReceiver-${p.address}`}
                  >
                    Confirm Receipt
                  </ActionButton>
                );
              }

              return (
                <PaymentStatusRow
                  key={p.address}
                  address={p.address}
                  status={displayStatus}
                  isYou={isYou}
                  actionButton={actionBtn}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Organizer Panel */}
      {isCreator && (
        <div className="panel">
          <h2 className="panel-title">
            <Award size={18} />
            Organizer Actions
            <span className="panel-admin-badge">Organizer</span>
          </h2>
          <div className="card">
            <div className="card-body">
              <div className="flex flex-col gap-3">
                {group.visibility === "Private" && !group.locked && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Invite a member</p>
                    <div className="inline-form">
                      <input
                        className="form-input"
                        placeholder="Paste wallet address (G...)"
                        value={inviteAddress}
                        onChange={(e) => setInviteAddress(e.target.value)}
                      />
                      <ActionButton
                        variant="primary"
                        size="sm"
                        onClick={handleInvite}
                        loading={actionLoading === "invite"}
                        disabled={!inviteAddress.trim()}
                      >
                        <UserPlus size={14} />
                        Invite
                      </ActionButton>
                    </div>
                  </div>
                )}

                {group.status === "WaitingForMembers" && !group.locked && (
                  <ActionButton
                    variant="primary"
                    onClick={handleLock}
                    loading={actionLoading === "lock"}
                    disabled={group.current_members !== group.max_members}
                    title={group.current_members !== group.max_members ? "All spots need to be filled first" : ""}
                    fullWidth
                  >
                    <Lock size={16} />
                    Start the Group
                  </ActionButton>
                )}

                {group.status === "Active" && payoutOrder.length === 0 && (
                  <ActionButton
                    variant="primary"
                    onClick={handleGenerateOrder}
                    loading={actionLoading === "generateOrder"}
                    fullWidth
                  >
                    <Shuffle size={16} />
                    Set Payout Order
                  </ActionButton>
                )}

                {canReleasePayout && payoutState === "NotReleased" && (
                  <ActionButton
                    variant="primary"
                    onClick={handleReleasePayout}
                    loading={actionLoading === "release"}
                    fullWidth
                  >
                    <CheckCircle size={16} />
                    Release Payout to {currentRecipient ? `${currentRecipient.slice(0, 6)}...` : "Recipient"}
                  </ActionButton>
                )}

                {group.status === "Active" && payoutOrder.length > 0 && (
                  <ActionButton
                    variant="secondary"
                    onClick={handleAdvanceCycle}
                    loading={actionLoading === "advance"}
                    disabled={!canAdvance}
                    title={!canAdvance ? "Waiting for recipient to confirm payout receipt" : ""}
                    fullWidth
                  >
                    <ArrowRight size={16} />
                    Move to Next Round
                  </ActionButton>
                )}

                {group.status === "Active" && isOverdue && (
                  <ActionButton
                    variant="danger"
                    onClick={handleMarkMissed}
                    loading={actionLoading === "markMissed"}
                    fullWidth
                  >
                    <AlertTriangle size={16} />
                    Mark Missed Payments
                  </ActionButton>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {group.status === "Completed" && (
        <div className="banner banner--success">
          <CheckCircle size={18} />
          This group has completed all rounds! Everyone has received their payout. 🎉
        </div>
      )}
    </div>
  );
}
