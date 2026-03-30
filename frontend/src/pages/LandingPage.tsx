import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
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

  useEffect(() => {
    if (address) {
      navigate("/group", { replace: true });
    }
  }, [address, navigate]);

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
            <div>
              <h1 className="hero-title">
                Paluwagan na walang hulaan kung legit.
              </h1>
              <p className="hero-subtitle">
                Track contributions, verify payouts, and build trust through
                transparent group records — all powered by blockchain.
              </p>
              <div className="hero-actions">
                <button
                  className="btn btn--primary btn--lg"
                  onClick={handleConnect}
                  disabled={isConnecting || isAvailable === false}
                >
                  {isConnecting ? "Connecting..." : "Create a Group"}
                </button>
                <button
                  className="btn btn--secondary btn--lg"
                  onClick={handleConnectAndJoin}
                  disabled={isConnecting || isAvailable === false}
                >
                  Join a Group
                </button>
              </div>
              {isAvailable === false && (
                <p className="text-sm text-muted mt-4">
                  To get started, install the{" "}
                  <a
                    href="https://www.freighter.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Freighter wallet extension
                  </a>{" "}
                  and refresh this page.
                </p>
              )}
            </div>

            <div className="hero-preview">
              <div className="flex items-center justify-between mb-4">
                <span style={{ fontWeight: 700, fontSize: "var(--font-size-base)" }}>
                  Dashboard Overview
                </span>
                <span className="badge badge--active">Active</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: "var(--text-heading)" }}>5</div>
                  <div className="stat-label">Active Groups</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: "var(--accent)" }}>98%</div>
                  <div className="stat-label">Trust Score</div>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">Cycle Progress</span>
                <span className="text-sm font-semibold">8 of 10 confirmed</span>
              </div>
              <div className="progress">
                <div className="progress-bar" style={{ width: "80%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Built for Trust and Transparency</h2>
            <p className="section-subtitle">
              Everything you need to run a legitimate paluwagan
            </p>
          </div>
          <div className="features-grid">
            <div className="card feature-card">
              <div className="feature-icon">
                <Shield size={24} />
              </div>
              <h3 className="feature-title">Transparent Records</h3>
              <p className="feature-desc">
                Every contribution and payout is recorded on the blockchain.
                No more "sabi ni ganito" — everyone can verify.
              </p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">
                <Users size={24} />
              </div>
              <h3 className="feature-title">Trust Scores</h3>
              <p className="feature-desc">
                Members build a reliability score based on their payment history.
                See who's trustworthy before you join.
              </p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">
                <BarChart3 size={24} />
              </div>
              <h3 className="feature-title">Payment Tracking</h3>
              <p className="feature-desc">
                Track who has paid and who hasn't, in real time.
                Both sender and receiver confirm each payment.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg-primary)" }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              Three simple steps to start saving together
            </p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">Create or Join</h3>
              <p className="step-desc">
                Start a new savings group or join one shared by a friend.
                Set the contribution amount and schedule.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">Contribute Each Round</h3>
              <p className="step-desc">
                Everyone pays their share each round. Confirm your payment
                and the organizer confirms receipt.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">Receive Your Payout</h3>
              <p className="step-desc">
                When it's your turn, the full pool goes to you.
                Everyone takes a turn — fair and square.
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
              Get Started
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
          <h2 className="section-title">Your Reputation Matters</h2>
          <p className="section-subtitle" style={{ maxWidth: 540, margin: "0 auto" }}>
            Every payment you make builds your trust score. Members with higher
            scores are more likely to be welcomed into groups. Pay on time,
            build your rep.
          </p>
        </div>
      </section>
    </>
  );
}
