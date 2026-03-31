import { Link, useLocation } from "react-router-dom";
import { CircleDollarSign, Menu, X } from "lucide-react";
import { useState } from "react";
import WalletButton from "./WalletButton";
import { useWallet } from "../hooks/useWallet";
import { useTranslation } from "react-i18next";
import i18n, { setAppLanguage } from "../i18n";

export default function Navbar() {
  const { address } = useWallet();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation();

  const groupHubPath = "/group";

  const isActive = (path: string) => location.pathname === path;
  const isGroupSection =
    location.pathname === "/group" || location.pathname.startsWith("/group/");

  const currentLang = (i18n.language === "en" ? "en" : "fil") as "en" | "fil";

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link
          to="/"
          state={{ allowLanding: true }}
          className="navbar-brand"
          onClick={() => setMobileOpen(false)}
        >
          <div className="navbar-brand-icon">
            <CircleDollarSign size={20} />
          </div>
          Paluwagan Go
        </Link>

        <div className={`navbar-links${mobileOpen ? " navbar-links--open" : ""}`}>
          {address && (
            <>
              <Link
                to={groupHubPath}
                className={`navbar-link${isGroupSection ? " navbar-link--active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                {t("nav.group")}
              </Link>
              <Link
                to="/create"
                className={`navbar-link${isActive("/create") ? " navbar-link--active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                {t("nav.createGroup")}
              </Link>
              <Link
                to="/profile"
                className={`navbar-link${isActive("/profile") ? " navbar-link--active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                {t("nav.profile")}
              </Link>
            </>
          )}
        </div>

        <div className="navbar-actions">
          <div className="flex items-center gap-2">
            <select
              className="form-input"
              value={currentLang}
              onChange={(e) => setAppLanguage(e.target.value === "en" ? "en" : "fil")}
              aria-label={t("nav.language")}
              style={{ padding: "6px 10px", width: "auto" }}
            >
              <option value="fil">{t("nav.filipino")}</option>
              <option value="en">{t("nav.english")}</option>
            </select>
          </div>
          <WalletButton />
          <button
            className="navbar-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
