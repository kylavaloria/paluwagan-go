import { useLocation, useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import { useTranslation } from "react-i18next";
import heroPerson from "../assets/hero-person.png";
import {
  Shield,
  Users,
  BarChart3,
  CircleDollarSign,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { useEffect } from "react";

export default function LandingPage() {
  const { address, connect, isConnecting, isAvailable } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const allowLanding = Boolean((location.state as { allowLanding?: boolean } | null)?.allowLanding);
  const { t } = useTranslation();

  useEffect(() => {
    if (address && !allowLanding) {
      navigate("/group", { replace: true });
    }
  }, [address, allowLanding, navigate]);

  const handleConnect = async () => {
    const addr = await connect();
    if (addr) navigate("/group");
  };

  const handleConnectAndJoin = async () => {
    const addr = await connect();
    if (addr) navigate("/group");
  };

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy">
              <h1 className="hero-title">
                {t("landing.heroTitle")}
              </h1>
              <p className="hero-subtitle">
                {t("landing.heroSubtitle")}
              </p>
              <div className="hero-actions">
                <button
                  className="btn btn--primary btn--lg"
                  onClick={handleConnect}
                  disabled={isConnecting || isAvailable === false}
                >
                  {isConnecting ? t("landing.connecting") : t("landing.createGroupCta")}
                </button>
                <button
                  className="btn btn--secondary btn--lg"
                  onClick={handleConnectAndJoin}
                  disabled={isConnecting || isAvailable === false}
                >
                  {t("landing.joinGroupCta")}
                </button>
              </div>
              {isAvailable === false && (
                <p className="text-sm text-muted mt-4">
                  {t("landing.installPrefix")}{" "}
                  <a
                    href="https://www.freighter.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("landing.freighterLink")}
                  </a>{" "}
                  {t("landing.installSuffix")}
                </p>
              )}
            </div>

            <div className="hero-art">
              <img
                src={heroPerson}
                alt={t("landing.heroImageAlt")}
                className="hero-art-img"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t("landing.trustSectionTitle")}</h2>
            <p className="section-subtitle">
              {t("landing.trustSectionSubtitle")}
            </p>
          </div>
          <div className="features-grid">
            <div className="card feature-card">
              <div className="feature-icon">
                <Shield size={24} />
              </div>
              <h3 className="feature-title">{t("landing.features.transparentTitle")}</h3>
              <p className="feature-desc">
                {t("landing.features.transparentDesc")}
              </p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">
                <Users size={24} />
              </div>
              <h3 className="feature-title">{t("landing.features.trustTitle")}</h3>
              <p className="feature-desc">
                {t("landing.features.trustDesc")}
              </p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">
                <BarChart3 size={24} />
              </div>
              <h3 className="feature-title">{t("landing.features.trackingTitle")}</h3>
              <p className="feature-desc">
                {t("landing.features.trackingDesc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg-primary)" }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t("landing.howTitle")}</h2>
            <p className="section-subtitle">
              {t("landing.howSubtitle")}
            </p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">{t("landing.steps.oneTitle")}</h3>
              <p className="step-desc">
                {t("landing.steps.oneDesc")}
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">{t("landing.steps.twoTitle")}</h3>
              <p className="step-desc">
                {t("landing.steps.twoDesc")}
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">{t("landing.steps.threeTitle")}</h3>
              <p className="step-desc">
                {t("landing.steps.threeDesc")}
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
            <button
              className="btn btn--primary btn--lg"
              onClick={handleConnect}
              disabled={isConnecting || isAvailable === false}
            >
              <CircleDollarSign size={20} />
              {t("landing.getStarted")}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container container--narrow text-center">
          <div className="feature-icon" style={{ margin: "0 auto var(--space-4)", background: "var(--accent-light)", color: "var(--accent)" }}>
            <CheckCircle size={24} />
          </div>
          <h2 className="section-title">{t("landing.reputationTitle")}</h2>
          <p className="section-subtitle" style={{ maxWidth: 540, margin: "0 auto" }}>
            {t("landing.reputationSubtitle")}
          </p>
        </div>
      </section>
    </>
  );
}
