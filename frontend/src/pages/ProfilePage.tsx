import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { getUserTrust, getUsername, setUsername, type UserTrust } from "../lib/contract";
import StarRating from "../components/StarRating";
import ActionButton from "../components/ActionButton";
import { useTranslation } from "react-i18next";
import {
  User,
  CheckCircle,
  Users,
  Clock,
  AlertTriangle,
  Ban,
  Copy,
  Check,
} from "lucide-react";

export default function ProfilePage() {
  const { address } = useWallet();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [trust, setTrust] = useState<UserTrust | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [username, setUsernameValue] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      navigate("/", { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getUserTrust(address).then((t) => t).catch(() => null),
      getUsername(address).then((u) => u).catch(() => null),
    ])
      .then(([t, u]) => {
        if (cancelled) return;
        setTrust(t);
        setUsernameValue(u);
        setUsernameInput(u ?? "");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [address, navigate]);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const normalizeUsername = (raw: string) => raw.trim().toLowerCase();

  const isValidUsername = (name: string) => {
    if (name.length < 3 || name.length > 20) return false;
    return /^[a-z0-9_]+$/.test(name);
  };

  const saveUsername = async () => {
    if (!address) return;
    const next = normalizeUsername(usernameInput);
    setUsernameError(null);

    if (!isValidUsername(next)) {
      setUsernameError(t("profile.usernameInvalid"));
      return;
    }

    setUsernameSaving(true);
    try {
      await setUsername(address, next);
      const u = await getUsername(address);
      setUsernameValue(u);
      setUsernameInput(u ?? next);
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : t("profile.saveUsernameError"));
    } finally {
      setUsernameSaving(false);
    }
  };

  if (!address) return null;

  return (
    <div className="container container--narrow" style={{ paddingBottom: "var(--space-16)" }}>
      <div className="page-header">
        <h1 className="page-title">{t("profile.title")}</h1>
        <p className="page-subtitle">{t("profile.subtitle")}</p>
      </div>

      {/* Username */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex items-center justify-between" style={{ gap: "var(--space-4)" }}>
            <div>
              <div className="text-sm text-muted">{t("profile.username")}</div>
              <div style={{ fontWeight: 700, color: "var(--text-heading)" }}>
                {username ? `@${username}` : <span className="text-muted">{t("profile.notSet")}</span>}
              </div>
            </div>
            <div style={{ minWidth: 260 }}>
              <div className="inline-form">
                <input
                  className={`form-input${usernameError ? " form-input--error" : ""}`}
                  placeholder="hal. kyla_01"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                />
                <ActionButton
                  variant="primary"
                  size="sm"
                  onClick={() => saveUsername()}
                  loading={usernameSaving}
                  disabled={loading}
                >
                  {t("common.save")}
                </ActionButton>
              </div>
              <div className="form-hint">
                {t("profile.usernameHint")}
              </div>
              {usernameError ? (
                <div className="text-sm" style={{ color: "var(--danger)", marginTop: 6 }}>
                  {usernameError}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Address */}
      <div className="card mb-6">
        <div className="card-body flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="stat-icon stat-icon--green">
              <User size={20} />
            </div>
            <div>
              <div className="text-sm text-muted">{t("profile.walletAddress")}</div>
              <div className="address" style={{ fontSize: "var(--font-size-sm)" }}>
                {address.slice(0, 10)}...{address.slice(-6)}
              </div>
            </div>
          </div>
          <button
            className="btn btn--ghost btn--sm"
            onClick={copyAddress}
            title={t("profile.copyFullAddress")}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t("common.copied") : t("common.copy")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>{t("profile.loadingTrust")}</p>
        </div>
      ) : trust ? (
        <>
          {/* Reliability Score */}
          <div className="card mb-6">
            <div className="card-body text-center" style={{ padding: "var(--space-8)" }}>
              <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
                {t("profile.reliabilityScore")}
              </h2>
              <div style={{ marginBottom: "var(--space-3)" }}>
                <StarRating score={trust.reliability_score} size={32} />
              </div>
              <p className="text-sm text-muted" style={{ maxWidth: 360, margin: "0 auto" }}>
                {trust.reliability_score === null
                  ? t("profile.blurbNew")
                  : t("profile.blurbKnown")}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon--blue">
                <Users size={20} />
              </div>
              <div className="stat-value">{trust.joined_groups}</div>
              <div className="stat-label">{t("profile.statsJoined")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--green">
                <CheckCircle size={20} />
              </div>
              <div className="stat-value">{trust.completed_groups}</div>
              <div className="stat-label">{t("profile.statsCompleted")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--yellow">
                <Clock size={20} />
              </div>
              <div className="stat-value">{trust.late_payments}</div>
              <div className="stat-label">{t("profile.statsLate")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--red">
                <AlertTriangle size={20} />
              </div>
              <div className="stat-value">{trust.missed_payments}</div>
              <div className="stat-label">{t("profile.statsMissed")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--red">
                <Ban size={20} />
              </div>
              <div className="stat-value">{trust.defaulted_groups}</div>
              <div className="stat-label">{t("profile.statsDefaulted")}</div>
            </div>
          </div>

          {/* Explanation */}
          <div className="card mt-6">
            <div className="card-body">
              <h3 style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, marginBottom: "var(--space-3)" }}>
                {t("profile.scoreHowTitle")}
              </h3>
              <p className="text-sm text-muted" style={{ lineHeight: 1.7 }}>
                {t("profile.scoreHowBody")}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <User size={28} />
          </div>
          <div className="empty-state-title">{t("profile.emptyTitle")}</div>
          <p className="empty-state-desc">
            {t("profile.emptyDesc")}
          </p>
        </div>
      )}
    </div>
  );
}
