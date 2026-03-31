import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useToast } from "../hooks/useToast";
import { createGroup } from "../lib/contract";
import { addMyGroup } from "../lib/store";
import { friendlyError } from "../lib/errors";
import Stepper from "../components/Stepper";
import ActionButton from "../components/ActionButton";
import { useTranslation } from "react-i18next";
import {
  CheckCircle,
  Copy,
  ArrowRight,
  ArrowLeft,
  Minus,
  Plus,
  Link as LinkIcon,
} from "lucide-react";

type OrgRole = "org_member" | "org_only";
type PayoutMode = "join_order" | "randomized";
type Schedule = "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
type PayoutType = "cash" | "item";

export default function CreateGroupPage() {
  const { address } = useWallet();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const WIZARD_STEPS = [
    t("createGroup.steps.basics"),
    t("createGroup.steps.contribution"),
    t("createGroup.steps.payout"),
  ];

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
      showToast("error", t("createGroup.invalidGroupNameTitle"), t("createGroup.invalidGroupNameMsg"));
      return;
    }

    const xlmValue = parseFloat(amountXlm);
    if (isNaN(xlmValue) || xlmValue <= 0) {
      showToast("error", t("createGroup.invalidAmountTitle"), t("createGroup.invalidAmountMsg"));
      return;
    }

    // Convert XLM to stroops (1 XLM = 10,000,000 stroops)
    const stroops = BigInt(Math.round(xlmValue * 1e7));

    const gap = schedule === "custom" ? parseInt(customGap, 10) || 0 : 0;
    if (schedule === "custom" && gap <= 0) {
      showToast("error", t("createGroup.invalidScheduleTitle"), t("createGroup.invalidScheduleMsg"));
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
      showToast("success", t("createGroup.createdToastTitle"), t("createGroup.createdToastMsg", { id: groupId }));
    } catch (err) {
      showToast("error", t("createGroup.createFailedToastTitle"), friendlyError(err));
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
          <h1 className="success-title">{t("createGroup.createdTitle")}</h1>
          <p className="success-subtitle">
            {groupName.trim() ? (
              <>
                {t("createGroup.createdSubtitleNamed", { name: groupName.trim() })}
              </>
            ) : (
              t("createGroup.createdSubtitle")
            )}
          </p>
          <div className="success-group-id">#{createdGroupId}</div>
          <div className="success-actions">
            <ActionButton variant="secondary" onClick={copyLink}>
              {linkCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
              {linkCopied ? t("createGroup.linkCopied") : t("createGroup.copyInviteLink")}
            </ActionButton>
            <ActionButton
              variant="primary"
              onClick={() => navigate(`/group/${createdGroupId}`)}
            >
              {t("createGroup.goToGroup")}
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
        <h1 className="page-title">{t("createGroup.title")}</h1>
        <p className="page-subtitle">{t("createGroup.subtitle")}</p>
      </div>

      <Stepper steps={WIZARD_STEPS} currentStep={step} />

      <div className="card">
        <div className="card-body">
          {/* Step 1: Group Basics */}
          {step === 0 && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="create-group-name">
                  {t("createGroup.groupName")}
                </label>
                <input
                  id="create-group-name"
                  className="form-input"
                  type="text"
                  maxLength={50}
                  placeholder={t("createGroup.groupNamePlaceholder")}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  autoComplete="off"
                />
                <span className="form-hint">{t("createGroup.groupNameHint")}</span>
              </div>

              <div className="form-group">
                <label className="form-label">{t("createGroup.orgContributeQ")}</label>
                <p className="form-hint mb-2">
                  {t("createGroup.orgContributeHint")}
                </p>
                <div className="toggle-group">
                  <button
                    className={`toggle-option${orgRole === "org_member" ? " toggle-option--active" : ""}`}
                    onClick={() => setOrgRole("org_member")}
                  >
                    {t("createGroup.orgMemberYes")}
                  </button>
                  <button
                    className={`toggle-option${orgRole === "org_only" ? " toggle-option--active" : ""}`}
                    onClick={() => setOrgRole("org_only")}
                  >
                    {t("createGroup.orgOnlyNo")}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t("createGroup.howManyPeople")}</label>
                <p className="form-hint mb-2">
                  {t("createGroup.howManyHint")}
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
                <label className="form-label">{t("createGroup.whoCanJoin")}</label>
                <div className="toggle-group">
                  <button
                    className={`toggle-option${isPublic ? " toggle-option--active" : ""}`}
                    onClick={() => setIsPublic(true)}
                  >
                    {t("createGroup.anyone")}
                  </button>
                  <button
                    className={`toggle-option${!isPublic ? " toggle-option--active" : ""}`}
                    onClick={() => setIsPublic(false)}
                  >
                    {t("createGroup.inviteOnly")}
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
                  {t("createGroup.amountQ")}
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
                <span className="form-hint">{t("createGroup.amountHint")}</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {t("createGroup.scheduleQ")}
                </label>
                <div className="radio-cards">
                  {([
                    { value: "weekly", label: t("createGroup.schedule.weekly"), desc: t("createGroup.scheduleDesc.weekly") },
                    { value: "monthly", label: t("createGroup.schedule.monthly"), desc: t("createGroup.scheduleDesc.monthly") },
                    { value: "quarterly", label: t("createGroup.schedule.quarterly"), desc: t("createGroup.scheduleDesc.quarterly") },
                    { value: "yearly", label: t("createGroup.schedule.yearly"), desc: t("createGroup.scheduleDesc.yearly") },
                    { value: "custom", label: t("createGroup.schedule.custom"), desc: t("createGroup.scheduleDesc.custom") },
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
                  <label className="form-label">{t("createGroup.customGapLabel")}</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    placeholder="e.g. 200"
                    value={customGap}
                    onChange={(e) => setCustomGap(e.target.value)}
                  />
                  <span className="form-hint">
                    {t("createGroup.customGapHint")}
                  </span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  {t("createGroup.interestLabel")}
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
                  {t("createGroup.interestHint")}
                </span>
              </div>
            </>
          )}

          {/* Step 3: Payout Settings */}
          {step === 2 && (
            <>
              <div className="form-group">
                <label className="form-label">
                  {t("createGroup.payoutOrderQ")}
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
                    <span className="radio-card-label">{t("createGroup.payoutJoinOrder")}</span>
                    <span className="radio-card-desc">
                      {t("createGroup.payoutJoinOrderDesc")}
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
                    <span className="radio-card-label">{t("createGroup.payoutRandom")}</span>
                    <span className="radio-card-desc">
                      {t("createGroup.payoutRandomDesc")}
                    </span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t("createGroup.payoutType")}</label>
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
                    <span className="radio-card-label">{t("createGroup.payoutCash")}</span>
                    <span className="radio-card-desc">{t("createGroup.payoutCashDesc")}</span>
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
                    <span className="radio-card-label">{t("createGroup.payoutItem")}</span>
                    <span className="radio-card-desc">{t("createGroup.payoutItemDesc")}</span>
                  </label>
                </div>
              </div>

              {/* Summary */}
              <div className="card" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                <div className="card-body">
                  <h3 style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, marginBottom: "var(--space-3)" }}>
                    {t("createGroup.summary")}
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", fontSize: "var(--font-size-sm)" }}>
                    <span className="text-muted">{t("createGroup.summaryName")}</span>
                    <span>{groupName.trim() || "—"}</span>
                    <span className="text-muted">{t("createGroup.summaryRole")}</span>
                    <span>{orgRole === "org_member" ? t("createGroup.roleOrgMember") : t("createGroup.roleOrgOnly")}</span>
                    <span className="text-muted">{t("createGroup.summaryMembers")}</span>
                    <span>{maxMembers} {t("createGroup.people")}</span>
                    <span className="text-muted">{t("createGroup.summaryVisibility")}</span>
                    <span>{isPublic ? t("createGroup.visibilityPublic") : t("createGroup.visibilityPrivate")}</span>
                    <span className="text-muted">{t("createGroup.summaryContribution")}</span>
                    <span>{amountXlm || "—"} {t("createGroup.perRound")}</span>
                    <span className="text-muted">{t("createGroup.summarySchedule")}</span>
                    <span style={{ textTransform: "capitalize" }}>{schedule === "custom" ? `Custom (${customGap} ledgers)` : schedule}</span>
                    <span className="text-muted">{t("createGroup.summaryInterest")}</span>
                    <span>{interestBps === 0 ? t("createGroup.none") : `${(interestBps / 100).toFixed(2)}%`}</span>
                    <span className="text-muted">{t("createGroup.summaryPayoutOrder")}</span>
                    <span>{payoutMode === "join_order" ? t("createGroup.payoutJoinOrder") : t("createGroup.payoutRandom")}</span>
                    <span className="text-muted">{t("createGroup.summaryPayoutType")}</span>
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
                {t("common.back")}
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
                {t("common.next")}
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
                {t("createGroup.create")}
              </ActionButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
