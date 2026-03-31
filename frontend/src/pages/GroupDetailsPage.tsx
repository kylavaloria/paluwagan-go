import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useToast } from "../hooks/useToast";
import { useTranslation } from "react-i18next";
import {
  getGroup,
  getGroupMembers,
  getPayoutOrder,
  getPayoutState,
  getPaymentStatus,
  getUserTrust,
  getUsername,
  listPublicGroups,
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
  type UserTrust,
  type ListedGroup,
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
  const { t } = useTranslation();

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
  const [trustByAddress, setTrustByAddress] = useState<Record<string, UserTrust | null>>({});
  const [trustLoading, setTrustLoading] = useState(false);
  const [usernameByAddress, setUsernameByAddress] = useState<Record<string, string | null>>({});
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [publicGroups, setPublicGroups] = useState<ListedGroup[]>([]);
  const [publicGroupsLoading, setPublicGroupsLoading] = useState(false);
  const [publicGroupsError, setPublicGroupsError] = useState<string | null>(null);
  const [publicGroupsHasMore, setPublicGroupsHasMore] = useState(true);
  const publicGroupsLoadingRef = useRef(false);
  const publicGroupsNextStartRef = useRef(1);

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

  useEffect(() => {
    if (route.kind !== "group" || members.length === 0) {
      setTrustByAddress({});
      setTrustLoading(false);
      return;
    }

    const unique = Array.from(new Set(members));
    let cancelled = false;
    setTrustLoading(true);

    (async () => {
      const results = await Promise.all(
        unique.map(async (addr) => {
          try {
            const trust = await getUserTrust(addr);
            return [addr, trust] as const;
          } catch {
            return [addr, null] as const;
          }
        }),
      );

      if (cancelled) return;
      setTrustByAddress(Object.fromEntries(results));
      setTrustLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [route.kind, members]);

  useEffect(() => {
    if (route.kind !== "group" || members.length === 0) {
      setUsernameByAddress({});
      setUsernameLoading(false);
      return;
    }

    const unique = Array.from(new Set(members));
    let cancelled = false;
    setUsernameLoading(true);

    (async () => {
      const results = await Promise.all(
        unique.map(async (addr) => {
          try {
            const uname = await getUsername(addr);
            return [addr, uname] as const;
          } catch {
            return [addr, null] as const;
          }
        }),
      );

      if (cancelled) return;
      setUsernameByAddress(Object.fromEntries(results));
      setUsernameLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [route.kind, members]);

  const loadPublicGroups = useCallback(async (opts?: { reset?: boolean }) => {
    const pageSize = 25;
    if (publicGroupsLoadingRef.current) return;
    publicGroupsLoadingRef.current = true;
    setPublicGroupsLoading(true);
    setPublicGroupsError(null);

    try {
      const start = opts?.reset ? 1 : publicGroupsNextStartRef.current;
      const page = await listPublicGroups(start, pageSize);

      setPublicGroups((prev) => (opts?.reset ? page : [...prev, ...page]));
      const nextStart = start + pageSize;
      publicGroupsNextStartRef.current = nextStart;
      setPublicGroupsHasMore(page.length === pageSize);
    } catch (err) {
      setPublicGroupsError(friendlyError(err));
    } finally {
      publicGroupsLoadingRef.current = false;
      setPublicGroupsLoading(false);
    }
  }, [listPublicGroups]);

  useEffect(() => {
    if (route.kind !== "hub") {
      setPublicGroups([]);
      setPublicGroupsError(null);
      setPublicGroupsLoading(false);
      setPublicGroupsHasMore(true);
      publicGroupsLoadingRef.current = false;
      publicGroupsNextStartRef.current = 1;
      return;
    }
    publicGroupsNextStartRef.current = 1;
    loadPublicGroups({ reset: true });
  }, [route.kind, loadPublicGroups]);

  const openGroupFromInput = async () => {
    const cleaned = joinIdInput.trim().replace(/.*\/group\//, "").replace(/^#/, "");
    const id = parseInt(cleaned, 10);

    if (isNaN(id) || id < 1) {
      showToast("error", t("group.invalidGroupNumberTitle"), t("group.invalidGroupNumberMsg"));
      return;
    }

    setOpeningGroup(true);
    try {
      await getGroup(id);
      navigate(`/group/${id}`);
    } catch (err) {
      showToast("error", t("group.groupNotFoundTitle"), friendlyError(err));
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
      showToast("error", t("group.actionFailedTitle"), friendlyError(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleJoin = () =>
    runAction("join", () => {
      return joinGroup(groupId, address!).then(() => {
        addMyGroup(address!, groupId, "member");
      });
    }, t("group.joinedToast"));

  const handleLock = () =>
    runAction("lock", () => lockGroup(groupId, address!), t("group.startedToast"));

  const handleGenerateOrder = () =>
    runAction("generateOrder", () => generatePayoutOrder(groupId, address!), t("group.payoutOrderSetToast"));

  const handleConfirmSender = () =>
    runAction("confirmSender", () => confirmPaymentSender(groupId, group!.current_cycle, address!), t("group.paymentConfirmedToast"));

  const handleConfirmReceiver = (sender: string) =>
    runAction(`confirmReceiver-${sender}`, () => confirmPaymentReceiver(groupId, group!.current_cycle, address!, sender), t("group.memberPaymentConfirmedToast"));

  const handleReleasePayout = () =>
    runAction(
      "release",
      () => releaseCyclePayout(groupId, address!),
      t("group.payoutReleasedToast"),
    );

  const handleConfirmPayoutReceived = () =>
    runAction(
      "confirmPayoutReceived",
      () => confirmPayoutReceived(groupId, group!.current_cycle, address!),
      t("group.receiptConfirmedToast"),
    );

  const handleAdvanceCycle = () =>
    runAction("advance", () => advanceCycle(groupId, address!), t("group.nextRoundToast"));

  const handleMarkMissed = () =>
    runAction("markMissed", () => markMissedPayments(groupId, address!), t("group.missedMarkedToast"));

  const handleInvite = () => {
    if (!inviteAddress.trim()) return;
    runAction("invite", () => inviteUser(groupId, address!, inviteAddress.trim()).then(() => {
      setInviteAddress("");
    }), t("group.inviteSentToast"));
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
        {dense ? t("groupHub.openAnother") : t("groupHub.findTitle")}
      </h2>
      {!dense && (
        <p className="text-sm text-muted mb-4">
          {t("groupHub.findDesc")}
        </p>
      )}
      <div className="inline-form" style={{ maxWidth: dense ? "100%" : 560, flexWrap: "wrap", gap: "var(--space-2)" }}>
        <input
          className="form-input"
          placeholder={t("groupHub.placeholder")}
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
          {t("common.open")}
        </ActionButton>
        <ActionButton variant="secondary" onClick={() => navigate("/create")}>
          <Plus size={18} />
          {t("common.newGroup")}
        </ActionButton>
      </div>
    </div>
  );

  if (route.kind === "hub") {
    if (!address) return null;
    return (
      <div className="container container--wide" style={{ paddingTop: "var(--space-3)", paddingBottom: "var(--space-16)" }}>
        <div className="page-header">
          <h1 className="page-title">{t("groupHub.title")}</h1>
          <p className="page-subtitle">{t("groupHub.subtitle")}</p>
        </div>
        <div className="page-grid group-hub-grid">
          <div>
            <GroupQuickNav />
            <div className="panel">
              <h2 className="panel-title">
                <Users size={18} />
                {t("groupHub.publicGroups")}
              </h2>
              <div className="card">
                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {publicGroupsError ? (
                    <div className="text-sm" style={{ color: "var(--danger)" }}>
                      {publicGroupsError}
                    </div>
                  ) : null}

                  {publicGroups.length === 0 && !publicGroupsLoading ? (
                    <div className="text-sm text-muted">
                      {t("groupHub.noneFound")}
                    </div>
                  ) : null}

                  {publicGroups.map(({ id, group }) => (
                    <div key={id} className="payment-row">
                      <div className="payment-row-member" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                          <span style={{ fontWeight: 700, color: "var(--text-heading)" }}>
                            {group.name ? group.name : `Group #${id}`}
                          </span>
                          <StatusBadge status={group.status} />
                          <span className="badge badge--neutral">
                            {group.current_members}/{group.max_members}
                          </span>
                        </div>
                        <div className="text-sm text-muted">
                          <span style={{ fontWeight: 600 }}>#{id}</span>
                          {" · "}
                          {group.schedule}
                          {" · "}
                          {group.payout_type}
                        </div>
                      </div>
                      <div className="payment-row-actions">
                        <ActionButton
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/group/${id}`)}
                        >
                          {t("common.open")}
                        </ActionButton>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between" style={{ marginTop: "var(--space-2)" }}>
                    <ActionButton
                      variant="ghost"
                      size="sm"
                      onClick={() => loadPublicGroups({ reset: true })}
                      loading={publicGroupsLoading}
                    >
                      {t("common.refresh")}
                    </ActionButton>
                    {publicGroupsHasMore ? (
                      <ActionButton
                        variant="secondary"
                        size="sm"
                        onClick={() => loadPublicGroups()}
                        loading={publicGroupsLoading}
                        disabled={publicGroupsLoading}
                      >
                        {t("common.loadMore")}
                      </ActionButton>
                    ) : (
                      <span className="text-sm text-muted"> </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="group-hub-sidebar">
            <div className="panel">
              <h2 className="panel-title">
                <Shield size={18} />
                {t("groupHub.quickTips")}
              </h2>
              <div className="card">
                <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-4)" }}>
                  <div>
                    <p className="text-sm font-semibold mb-2">{t("groupHub.tipPublicTitle")}</p>
                    <p className="text-sm text-muted">{t("groupHub.tipPublicDesc")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-2">{t("groupHub.tipPrivateTitle")}</p>
                    <p className="text-sm text-muted">{t("groupHub.tipPrivateDesc")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-2">{t("groupHub.tipShareTitle")}</p>
                    <p className="text-sm text-muted">{t("groupHub.tipShareDesc")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (route.kind === "invalid") {
    return (
      <div className="container container--narrow" style={{ paddingTop: "var(--space-3)", paddingBottom: "var(--space-16)" }}>
        <div className="empty-state" style={{ paddingTop: "var(--space-16)" }}>
          <div className="empty-state-icon">
            <AlertTriangle size={28} />
          </div>
          <div className="empty-state-title">{t("groupDetails.invalidTitle")}</div>
          <p className="empty-state-desc">
            {t("groupDetails.invalidDesc")} <code>#/group/1</code>.
          </p>
        </div>
        {address ? <GroupQuickNav /> : (
          <p className="text-sm text-muted text-center">{t("groupDetails.connectWalletHint")}</p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "var(--space-3)" }}>
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>{t("groupDetails.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="container container--narrow" style={{ paddingTop: "var(--space-3)" }}>
        <div className="empty-state" style={{ paddingTop: "var(--space-16)" }}>
          <div className="empty-state-icon">
            <AlertTriangle size={28} />
          </div>
          <div className="empty-state-title">{t("groupDetails.notFoundTitle")}</div>
          <p className="empty-state-desc">{error || t("groupDetails.notFoundDesc")}</p>
          {address ? <GroupQuickNav /> : null}
          <ActionButton variant="ghost" onClick={() => navigate("/group")}>
            {t("groupDetails.backToFind")}
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
    <div className="container" style={{ paddingTop: "var(--space-3)", paddingBottom: "var(--space-16)" }}>
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
            {group.current_members}/{group.max_members} {t("groupDetails.members")}
            {group.status === "Active" && (
              <>
                {" · "}
                {t("groupDetails.roundOf", { current: group.current_cycle, total: group.total_cycles })}
              </>
            )}
          </p>
        </div>
        <ActionButton variant="ghost" size="sm" onClick={copyLink}>
          {linkCopied ? <Check size={14} /> : <Copy size={14} />}
          {linkCopied ? t("groupDetails.copied") : t("groupDetails.shareLink")}
        </ActionButton>
      </div>

      {/* Status Flow */}
      <div className="status-flow">
        {[t("groupDetails.status.waiting"), t("groupDetails.status.active"), t("groupDetails.status.completed")].map((label, i) => (
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
          {t("groupDetails.bannerOpen")}
        </div>
      )}

      {isCreator && group.status === "WaitingForMembers" && group.current_members === group.max_members && !group.locked && (
        <div className="banner banner--success">
          <CheckCircle size={18} />
          {t("groupDetails.bannerAllSpots")}
        </div>
      )}

      {isCreator && group.status === "Active" && payoutOrder.length === 0 && (
        <div className="banner banner--warning">
          <AlertTriangle size={18} />
          {t("groupDetails.bannerPayoutOrderMissing")}
        </div>
      )}

      {isCreator && isOverdue && group.status === "Active" && (
        <div className="banner banner--warning">
          <Clock size={18} />
          {t("groupDetails.bannerOverdue")}
        </div>
      )}

      {group.status === "Active" && payoutState === "ReleasedByOrganizer" && (
        <div className="banner banner--info">
          <CheckCircle size={18} />
          {t("groupDetails.bannerReleased")}
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
            {t("groupDetails.joinThisGroup")}
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
            {t("groupDetails.receivedPayout")}
          </ActionButton>
        </div>
      )}

      {/* Group Summary */}
      <div className="panel">
        <h2 className="panel-title">
          <Shield size={18} />
          {t("groupDetails.title")}
        </h2>
        <div className="card">
          <div className="card-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", fontSize: "var(--font-size-sm)" }}>
              <span className="text-muted">{t("groupDetails.contribution")}:</span>
              <span className="font-semibold">
                {Number(group.contribution_amount) / 1e7} {t("groupDetails.xlmPerRound")}
              </span>
              <span className="text-muted">{t("groupDetails.schedule")}:</span>
              <span style={{ textTransform: "capitalize" }}>{group.schedule}</span>
              <span className="text-muted">{t("groupDetails.payoutType")}:</span>
              <span style={{ textTransform: "capitalize" }}>{group.payout_type}</span>
              <span className="text-muted">{t("groupDetails.payoutOrder")}:</span>
              <span>
                {group.payout_order_mode === "JoinOrder"
                  ? t("groupDetails.payoutOrderJoin")
                  : t("groupDetails.payoutOrderRandom")}
              </span>
              <span className="text-muted">{t("groupDetails.visibility")}:</span>
              <span>
                {group.visibility === "Public"
                  ? t("groupDetails.visibilityPublic")
                  : t("groupDetails.visibilityPrivate")}
              </span>
              <span className="text-muted">{t("groupDetails.organizerRole")}:</span>
              <span>
                {group.organizer_role === "OrganizerAsMember"
                  ? t("groupDetails.organizerRoleMember")
                  : t("groupDetails.organizerRoleOnly")}
              </span>
              {group.interest_bps > 0 && (
                <>
                  <span className="text-muted">{t("groupDetails.interest")}:</span>
                  <span>{(group.interest_bps / 100).toFixed(2)}%</span>
                </>
              )}
              {group.status === "Active" && group.cycle_due_ledger > 0 && (
                <>
                  <span className="text-muted">{t("groupDetails.roundDeadline")}:</span>
                  <span>
                    {t("groupDetails.ledgerNum", { num: group.cycle_due_ledger })}
                    {isOverdue ? (
                      <span className="badge badge--danger" style={{ marginLeft: 8 }}>{t("groupDetails.overdue")}</span>
                    ) : (
                      <span className="badge badge--active" style={{ marginLeft: 8 }}>
                        {t("groupDetails.ledgersLeft", { count: Math.max(0, group.cycle_due_ledger - currentLedger) })}
                      </span>
                    )}
                  </span>
                </>
              )}
              {currentRecipient && (
                <>
                  <span className="text-muted">{t("groupDetails.thisRecipient")}:</span>
                  <span className="address">
                    {currentRecipient.slice(0, 6)}...{currentRecipient.slice(-4)}
                    {currentRecipient === address && (
                      <span className="badge badge--success" style={{ marginLeft: 8 }}>{t("groupDetails.you")}</span>
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
          {t("groupDetails.membersTitle", { current: members.length, max: group.max_members })}
        </h2>
        {members.length === 0 ? (
          <div className="card">
            <div className="card-body text-center text-muted">
              {t("groupDetails.noMembers")}
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
                trustScores={Object.fromEntries(
                  members.map((m) => [m, trustByAddress[m]?.reliability_score]),
                )}
                trustLoading={trustLoading}
                usernames={Object.fromEntries(members.map((m) => [m, usernameByAddress[m]]))}
                usernamesLoading={usernameLoading}
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
            {t("groupDetails.paymentStatusTitle", { round: group.current_cycle })}
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
                    {t("groupDetails.sentMyPayment")}
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
                    {t("groupDetails.confirmReceipt")}
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
            {t("groupDetails.organizerActions")}
            <span className="panel-admin-badge">{t("groupDetails.organizerBadge")}</span>
          </h2>
          <div className="card">
            <div className="card-body">
              <div className="flex flex-col gap-3">
                {group.visibility === "Private" && !group.locked && (
                  <div>
                    <p className="text-sm font-semibold mb-2">{t("groupDetails.inviteMember")}</p>
                    <div className="inline-form">
                      <input
                        className="form-input"
                        placeholder={t("groupDetails.invitePlaceholder")}
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
                        {t("groupDetails.invite")}
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
                    title={group.current_members !== group.max_members ? t("groupDetails.allSpotsFirst") : ""}
                    fullWidth
                  >
                    <Lock size={16} />
                    {t("groupDetails.startGroup")}
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
                    {t("groupDetails.setPayoutOrder")}
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
                    {t("groupDetails.releasePayoutTo", {
                      recipient: currentRecipient ? `${currentRecipient.slice(0, 6)}...` : t("groupDetails.recipientFallback"),
                    })}
                  </ActionButton>
                )}

                {group.status === "Active" && payoutOrder.length > 0 && (
                  <ActionButton
                    variant="secondary"
                    onClick={handleAdvanceCycle}
                    loading={actionLoading === "advance"}
                    disabled={!canAdvance}
                    title={!canAdvance ? t("groupDetails.waitingRecipientReceipt") : ""}
                    fullWidth
                  >
                    <ArrowRight size={16} />
                    {t("groupDetails.nextRound")}
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
                    {t("groupDetails.markMissed")}
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
          {t("groupDetails.completedBanner")}
        </div>
      )}
    </div>
  );
}
