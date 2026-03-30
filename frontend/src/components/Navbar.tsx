import { Link, useLocation } from "react-router-dom";
import { CircleDollarSign, Menu, X } from "lucide-react";
import { useState } from "react";
import WalletButton from "./WalletButton";
import { useWallet } from "../hooks/useWallet";

export default function Navbar() {
  const { address } = useWallet();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const groupHubPath = "/group";

  const isActive = (path: string) => location.pathname === path;
  const isGroupSection =
    location.pathname === "/group" || location.pathname.startsWith("/group/");

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to={address ? groupHubPath : "/"} className="navbar-brand">
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
                Group
              </Link>
              <Link
                to="/create"
                className={`navbar-link${isActive("/create") ? " navbar-link--active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                Create Group
              </Link>
              <Link
                to="/profile"
                className={`navbar-link${isActive("/profile") ? " navbar-link--active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                Profile
              </Link>
            </>
          )}
        </div>

        <div className="navbar-actions">
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
