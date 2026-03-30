import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { getUserTrust, type UserTrust } from "../lib/contract";
import StarRating from "../components/StarRating";
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
  const [trust, setTrust] = useState<UserTrust | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!address) {
      navigate("/", { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);

    getUserTrust(address)
      .then((t) => { if (!cancelled) setTrust(t); })
      .catch(() => { if (!cancelled) setTrust(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [address, navigate]);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!address) return null;

  return (
    <div className="container container--narrow" style={{ paddingBottom: "var(--space-16)" }}>
      <div className="page-header">
        <h1 className="page-title">Your Profile</h1>
        <p className="page-subtitle">Your trust reputation across all groups.</p>
      </div>

      {/* Wallet Address */}
      <div className="card mb-6">
        <div className="card-body flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="stat-icon stat-icon--green">
              <User size={20} />
            </div>
            <div>
              <div className="text-sm text-muted">Wallet Address</div>
              <div className="address" style={{ fontSize: "var(--font-size-sm)" }}>
                {address.slice(0, 10)}...{address.slice(-6)}
              </div>
            </div>
          </div>
          <button
            className="btn btn--ghost btn--sm"
            onClick={copyAddress}
            title="Copy full address"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading your trust profile...</p>
        </div>
      ) : trust ? (
        <>
          {/* Reliability Score */}
          <div className="card mb-6">
            <div className="card-body text-center" style={{ padding: "var(--space-8)" }}>
              <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
                Reliability Score
              </h2>
              <div style={{ marginBottom: "var(--space-3)" }}>
                <StarRating score={trust.reliability_score} size={32} />
              </div>
              <p className="text-sm text-muted" style={{ maxWidth: 360, margin: "0 auto" }}>
                {trust.reliability_score === null
                  ? "You're new here! Complete a group to get your first rating."
                  : "Your score is based on your payment history. Pay on time to keep it high!"}
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
              <div className="stat-label">Groups Joined</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--green">
                <CheckCircle size={20} />
              </div>
              <div className="stat-value">{trust.completed_groups}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--yellow">
                <Clock size={20} />
              </div>
              <div className="stat-value">{trust.late_payments}</div>
              <div className="stat-label">Late Payments</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--red">
                <AlertTriangle size={20} />
              </div>
              <div className="stat-value">{trust.missed_payments}</div>
              <div className="stat-label">Missed Payments</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--red">
                <Ban size={20} />
              </div>
              <div className="stat-value">{trust.defaulted_groups}</div>
              <div className="stat-label">Defaulted Groups</div>
            </div>
          </div>

          {/* Explanation */}
          <div className="card mt-6">
            <div className="card-body">
              <h3 style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, marginBottom: "var(--space-3)" }}>
                How is my score calculated?
              </h3>
              <p className="text-sm text-muted" style={{ lineHeight: 1.7 }}>
                You start with a score of 5 stars. Each missed payment, late payment, 
                or defaulted group reduces your score. Completing groups on time helps 
                maintain your reputation. Members with higher scores are more trusted 
                in the community.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <User size={28} />
          </div>
          <div className="empty-state-title">No activity yet</div>
          <p className="empty-state-desc">
            Join or create a group to start building your trust profile.
          </p>
        </div>
      )}
    </div>
  );
}
