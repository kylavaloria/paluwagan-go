import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useToast } from "../hooks/useToast";
import { createGroup } from "../lib/contract";
import { addMyGroup } from "../lib/store";
import { friendlyError } from "../lib/errors";
import Stepper from "../components/Stepper";
import ActionButton from "../components/ActionButton";
import {
  CheckCircle,
  Copy,
  ArrowRight,
  ArrowLeft,
  Minus,
  Plus,
  Link as LinkIcon,
} from "lucide-react";

const WIZARD_STEPS = ["Group Basics", "Contribution Details", "Payout Settings"];

type OrgRole = "org_member" | "org_only";
type PayoutMode = "join_order" | "randomized";
type Schedule = "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
type PayoutType = "cash" | "item";

export default function CreateGroupPage() {
  const { address } = useWallet();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Step 1 fields
  const [groupName, setGroupName] = useState("");
  const [orgRole, setOrgRole] = useState<OrgRole>("org_member");
  const [maxMembers, setMaxMembers] = useState(5);
  const [isPublic, setIsPublic] = useState(true);

  // Step 2 fields
  const [amountXlm, setAmountXlm] = useState("");
  const [schedule, setSchedule] = useState<Schedule>("monthly");
  const [customGap, setCustomGap] = useState("");
  const [interestBps, setInterestBps] = useState(0);

  // Step 3 fields
  const [payoutMode, setPayoutMode] = useState<PayoutMode>("join_order");
  const [payoutType, setPayoutType] = useState<PayoutType>("cash");

  useEffect(() => {
    if (!address) navigate("/", { replace: true });
  }, [address, navigate]);

  const handleSubmit = async () => {
    if (!address) return;

    const name = groupName.trim();
    if (name.length === 0 || name.length > 50) {
      showToast("error", "Invalid group name", "Please enter a name between 1 and 50 characters.");
      return;
    }

    const xlmValue = parseFloat(amountXlm);
    if (isNaN(xlmValue) || xlmValue <= 0) {
      showToast("error", "Invalid amount", "Please enter a valid contribution amount.");
      return;
    }

    // Convert XLM to stroops (1 XLM = 10,000,000 stroops)
    const stroops = BigInt(Math.round(xlmValue * 1e7));

    const gap = schedule === "custom" ? parseInt(customGap, 10) || 0 : 0;
    if (schedule === "custom" && gap <= 0) {
      showToast("error", "Invalid schedule", "Please specify how often members contribute.");
      return;
    }

    setSubmitting(true);
    try {
      const groupId = await createGroup(
        address,
        name,
        orgRole,
        payoutMode,
        stroops,
        maxMembers,
        schedule,
        payoutType,
        isPublic,
        interestBps,
        gap,
      );
      addMyGroup(address, groupId, "creator");
      setCreatedGroupId(groupId);
      showToast("success", "Group created!", `Your group number is #${groupId}`);
    } catch (err) {
      showToast("error", "Failed to create group", friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/group/${createdGroupId}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (!address) return null;

  // Success screen
  if (createdGroupId !== null) {
    return (
      <div className="container container--narrow">
        <div className="success-screen">
          <div className="success-icon">
            <CheckCircle size={40} />
          </div>
          <h1 className="success-title">Your group is ready! 🎉</h1>
          <p className="success-subtitle">
            {groupName.trim() ? (
              <>
                <strong>{groupName.trim()}</strong> is live. Share the group number below so
                members can join.
              </>
            ) : (
              "Share this group number with your members so they can join."
            )}
          </p>
          <div className="success-group-id">#{createdGroupId}</div>
          <div className="success-actions">
            <ActionButton variant="secondary" onClick={copyLink}>
              {linkCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
              {linkCopied ? "Link Copied!" : "Copy Invite Link"}
            </ActionButton>
            <ActionButton
              variant="primary"
              onClick={() => navigate(`/group/${createdGroupId}`)}
            >
              Go to Group
              <ArrowRight size={16} />
            </ActionButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container container--narrow" style={{ paddingBottom: "var(--space-16)" }}>
      <div className="page-header">
        <h1 className="page-title">Start a New Group</h1>
        <p className="page-subtitle">Set up your savings group in 3 easy steps.</p>
      </div>

      <Stepper steps={WIZARD_STEPS} currentStep={step} />

      <div className="card">
        <div className="card-body">
          {/* Step 1: Group Basics */}
          {step === 0 && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="create-group-name">
                  Group name
                </label>
                <input
                  id="create-group-name"
                  className="form-input"
                  type="text"
                  maxLength={50}
                  placeholder="e.g. Weekend savings circle"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  autoComplete="off"
                />
                <span className="form-hint">1–50 characters, stored on-chain with the group.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Will you also contribute to the pool?</label>
                <p className="form-hint mb-2">
                  Choose whether you'll be a paying member or just the organizer.
                </p>
                <div className="toggle-group">
                  <button
                    className={`toggle-option${orgRole === "org_member" ? " toggle-option--active" : ""}`}
                    onClick={() => setOrgRole("org_member")}
                  >
                    Yes, I'll contribute
                  </button>
                  <button
                    className={`toggle-option${orgRole === "org_only" ? " toggle-option--active" : ""}`}
                    onClick={() => setOrgRole("org_only")}
                  >
                    No, organizer only
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">How many people in the group?</label>
                <p className="form-hint mb-2">
                  This includes you if you're also contributing.
                </p>
                <div className="number-stepper">
                  <button
                    className="number-stepper-btn"
                    onClick={() => setMaxMembers(Math.max(2, maxMembers - 1))}
                    disabled={maxMembers <= 2}
                  >
                    <Minus size={16} />
                  </button>
                  <div className="number-stepper-value">{maxMembers}</div>
                  <button
                    className="number-stepper-btn"
                    onClick={() => setMaxMembers(Math.min(20, maxMembers + 1))}
                    disabled={maxMembers >= 20}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Who can join this group?</label>
                <div className="toggle-group">
                  <button
                    className={`toggle-option${isPublic ? " toggle-option--active" : ""}`}
                    onClick={() => setIsPublic(true)}
                  >
                    Anyone
                  </button>
                  <button
                    className={`toggle-option${!isPublic ? " toggle-option--active" : ""}`}
                    onClick={() => setIsPublic(false)}
                  >
                    Invite only
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Contribution Details */}
          {step === 1 && (
            <>
              <div className="form-group">
                <label className="form-label">
                  How much does each person contribute per round?
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    className="form-input"
                    type="number"
                    min="0.0000001"
                    step="any"
                    placeholder="e.g. 100"
                    value={amountXlm}
                    onChange={(e) => setAmountXlm(e.target.value)}
                    style={{ paddingRight: 60 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                      fontSize: "var(--font-size-sm)",
                    }}
                  >
                    XLM
                  </span>
                </div>
                <span className="form-hint">Contribution Amount (XLM)</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  How often do members contribute?
                </label>
                <div className="radio-cards">
                  {([
                    { value: "weekly", label: "Weekly", desc: "Every week" },
                    { value: "monthly", label: "Monthly", desc: "Every month" },
                    { value: "quarterly", label: "Quarterly", desc: "Every 3 months" },
                    { value: "yearly", label: "Yearly", desc: "Once a year" },
                    { value: "custom", label: "Custom", desc: "Set your own" },
                  ] as const).map((opt) => (
                    <label
                      key={opt.value}
                      className={`radio-card${schedule === opt.value ? " radio-card--selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="schedule"
                        value={opt.value}
                        checked={schedule === opt.value}
                        onChange={() => setSchedule(opt.value)}
                      />
                      <span className="radio-card-label">{opt.label}</span>
                      <span className="radio-card-desc">{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {schedule === "custom" && (
                <div className="form-group">
                  <label className="form-label">Custom cycle gap (in ledger sequences)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    placeholder="e.g. 200"
                    value={customGap}
                    onChange={(e) => setCustomGap(e.target.value)}
                  />
                  <span className="form-hint">
                    Each ledger sequence is roughly 5 seconds. 100 ≈ 8 minutes.
                  </span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  Interest fee (optional)
                </label>
                <div className="slider-group">
                  <input
                    type="range"
                    className="slider-input"
                    min="0"
                    max="500"
                    step="25"
                    value={interestBps}
                    onChange={(e) => setInterestBps(parseInt(e.target.value, 10))}
                  />
                  <span className="slider-value">{(interestBps / 100).toFixed(2)}%</span>
                </div>
                <span className="form-hint">
                  0% means no interest. Maximum 5%.
                </span>
              </div>
            </>
          )}

          {/* Step 3: Payout Settings */}
          {step === 2 && (
            <>
              <div className="form-group">
                <label className="form-label">
                  How is the payout order decided?
                </label>
                <div className="radio-cards">
                  <label
                    className={`radio-card${payoutMode === "join_order" ? " radio-card--selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="payoutMode"
                      value="join_order"
                      checked={payoutMode === "join_order"}
                      onChange={() => setPayoutMode("join_order")}
                    />
                    <span className="radio-card-label">First Come, First Served</span>
                    <span className="radio-card-desc">
                      Members receive payouts in the order they joined.
                    </span>
                  </label>
                  <label
                    className={`radio-card${payoutMode === "randomized" ? " radio-card--selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="payoutMode"
                      value="randomized"
                      checked={payoutMode === "randomized"}
                      onChange={() => setPayoutMode("randomized")}
                    />
                    <span className="radio-card-label">Randomized</span>
                    <span className="radio-card-desc">
                      The order is shuffled randomly when the group starts.
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payout type</label>
                <div className="radio-cards">
                  <label
                    className={`radio-card${payoutType === "cash" ? " radio-card--selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="payoutType"
                      value="cash"
                      checked={payoutType === "cash"}
                      onChange={() => setPayoutType("cash")}
                    />
                    <span className="radio-card-label">Cash</span>
                    <span className="radio-card-desc">Members contribute and receive cash.</span>
                  </label>
                  <label
                    className={`radio-card${payoutType === "item" ? " radio-card--selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="payoutType"
                      value="item"
                      checked={payoutType === "item"}
                      onChange={() => setPayoutType("item")}
                    />
                    <span className="radio-card-label">Item</span>
                    <span className="radio-card-desc">Members contribute toward an item purchase.</span>
                  </label>
                </div>
              </div>

              {/* Summary */}
              <div className="card" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                <div className="card-body">
                  <h3 style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, marginBottom: "var(--space-3)" }}>
                    Summary
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", fontSize: "var(--font-size-sm)" }}>
                    <span className="text-muted">Name:</span>
                    <span>{groupName.trim() || "—"}</span>
                    <span className="text-muted">Your role:</span>
                    <span>{orgRole === "org_member" ? "Organizer & Member" : "Organizer only"}</span>
                    <span className="text-muted">Members:</span>
                    <span>{maxMembers} people</span>
                    <span className="text-muted">Visibility:</span>
                    <span>{isPublic ? "Public (anyone can join)" : "Private (invite only)"}</span>
                    <span className="text-muted">Contribution:</span>
                    <span>{amountXlm || "—"} XLM per round</span>
                    <span className="text-muted">Schedule:</span>
                    <span style={{ textTransform: "capitalize" }}>{schedule === "custom" ? `Custom (${customGap} ledgers)` : schedule}</span>
                    <span className="text-muted">Interest:</span>
                    <span>{interestBps === 0 ? "None" : `${(interestBps / 100).toFixed(2)}%`}</span>
                    <span className="text-muted">Payout order:</span>
                    <span>{payoutMode === "join_order" ? "First come, first served" : "Randomized"}</span>
                    <span className="text-muted">Payout type:</span>
                    <span style={{ textTransform: "capitalize" }}>{payoutType}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="wizard-actions">
            {step > 0 ? (
              <ActionButton variant="secondary" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={16} />
                Back
              </ActionButton>
            ) : (
              <div></div>
            )}
            {step < WIZARD_STEPS.length - 1 ? (
              <ActionButton
                variant="primary"
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 0 &&
                    (!groupName.trim() ||
                      groupName.trim().length > 50)) ||
                  (step === 1 && (!amountXlm || parseFloat(amountXlm) <= 0))
                }
              >
                Next
                <ArrowRight size={16} />
              </ActionButton>
            ) : (
              <ActionButton
                variant="primary"
                onClick={handleSubmit}
                loading={submitting}
                disabled={
                  !groupName.trim() ||
                  groupName.trim().length > 50 ||
                  !amountXlm ||
                  parseFloat(amountXlm) <= 0
                }
              >
                <LinkIcon size={16} />
                Create Group
              </ActionButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
