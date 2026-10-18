import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth.tsx";
import { AboutPage } from "./pages/AboutPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { ModerationPage } from "./pages/ModerationPage.tsx";
import { VerifyPage } from "./features/auth/VerifyPage.tsx";

export default function App() {
  const { user, signOut } = useAuth();

  return (
    <div className="site">
      <header className="topbar">
        <div>
          <Link to="/" className="brand">
            UBC Access Map
          </Link>
          <p className="tagline">Find a washroom. Check the access facts first.</p>
        </div>
        <nav aria-label="Primary">
          <Link to="/">Map</Link>
          <Link to="/about">About</Link>
          {user?.role === "ADMIN" && <Link to="/moderate">Moderate</Link>}
          {user ? (
            <button type="button" className="text-btn" onClick={() => void signOut()}>
              Sign out {user.displayName}
            </button>
          ) : (
            <Link to="/?signin=1">Sign in</Link>
          )}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/moderate" element={<ModerationPage />} />
        <Route path="/auth/verify" element={<VerifyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="footer">
        Independent student project. Not affiliated with UBC. Building data © UBC C+CP, PDDL 1.0.
        Map tiles © OpenFreeMap / OpenMapTiles / OpenStreetMap contributors.
      </footer>
    </div>
  );
}
