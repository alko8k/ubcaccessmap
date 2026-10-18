import { useRef } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { ChevronDown, LogOut, MapPin } from "lucide-react";
import { useAuth } from "./lib/auth.tsx";
import { AboutPage } from "./pages/AboutPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { ModerationPage } from "./pages/ModerationPage.tsx";
import { VerifyPage } from "./features/auth/VerifyPage.tsx";

function AccountMenu({ name, onSignOut }: { name: string; onSignOut: () => void }) {
  const menuRef = useRef<HTMLDetailsElement | null>(null);

  return (
    <details className="account-menu" ref={menuRef}>
      <summary className="btn btn--ghost btn--sm">
        <span className="avatar" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="account-name">{name}</span>
        <ChevronDown aria-hidden="true" size={14} />
      </summary>
      <div className="account-pop">
        <button
          type="button"
          className="menu-item"
          onClick={() => {
            menuRef.current?.removeAttribute("open");
            onSignOut();
          }}
        >
          <LogOut aria-hidden="true" size={16} />
          Sign out
        </button>
      </div>
    </details>
  );
}

export default function App() {
  const { user, signOut } = useAuth();
  // The map page is full-bleed; the map control already carries attribution.
  const onMap = useLocation().pathname === "/";

  return (
    <div className="site">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            <MapPin size={16} strokeWidth={2.5} />
          </span>
          UBC Access Map
        </Link>
        <nav aria-label="Primary">
          <NavLink to="/about" className="nav-link">
            About
          </NavLink>
          {user?.role === "ADMIN" && (
            <NavLink to="/moderate" className="nav-link">
              Moderate
            </NavLink>
          )}
          {user ? (
            <AccountMenu name={user.displayName} onSignOut={() => void signOut()} />
          ) : (
            <Link to="/?signin=1" className="btn btn--primary btn--sm">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      {onMap ? (
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      ) : (
        <div className="page-scroll">
          <Routes>
            <Route path="/about" element={<AboutPage />} />
            <Route path="/moderate" element={<ModerationPage />} />
            <Route path="/auth/verify" element={<VerifyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <footer className="footer">
            Independent student project, not affiliated with UBC.{" "}
            <Link to="/about">About and credits</Link>
          </footer>
        </div>
      )}
    </div>
  );
}
