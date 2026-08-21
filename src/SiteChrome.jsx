import { useState } from "react";
import { useAuth } from "./AuthProvider.jsx";
import { googleClientId } from "./authClient.js";

const NAV = [
  { href: "/#platform", label: "Platform" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#evidence", label: "Evidence" },
  { href: "/#oncologists", label: "For Oncologists" },
  { href: "/#validation", label: "Validation" },
  { href: "/privacy", label: "Security" },
  { href: "/login", label: "Login" },
];

export default function SiteChrome({ children, inverse = false, active = "" }) {
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  const signedIn = Boolean(auth?.signedIn);
  const isAdmin = Boolean(auth?.reviewer?.is_admin);

  return (
    <div className="page">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className={`site-header${inverse ? " inverse" : ""}`}>
        <a className="brand" href="/" aria-label="OneTra Health home">One<span>Tra</span></a>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
        <nav aria-label="Primary">
          <ul id="site-nav" className={`nav-links${open ? " open" : ""}`}>
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={active === item.href ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
            {isAdmin && (
              <li><a href="/admin" aria-current={active === "/admin" ? "page" : undefined} onClick={() => setOpen(false)}>Admin</a></li>
            )}
            {signedIn ? (
              <li>
                <button className="btn btn-ghost" type="button" onClick={() => { auth.signOut(); window.location.href = "/"; }}>
                  Sign out
                </button>
              </li>
            ) : (
              <li>
                <a className="btn btn-primary" href={googleClientId() ? "/login" : "/dashboard"} onClick={() => setOpen(false)}>
                  {googleClientId() ? "Sign in" : "Open validator"}
                </a>
              </li>
            )}
            {signedIn && (
              <li>
                <a className="btn btn-primary" href="/dashboard" onClick={() => setOpen(false)}>
                  Open validator
                </a>
              </li>
            )}
          </ul>
        </nav>
      </header>
      {children}
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid">
            <div>
              <div className="footer-brand">OneTra Health</div>
              <p>Validation-stage decision support for adult oncology. Deterministic matching, source traceability, and safe abstention.</p>
            </div>
            <div>
              <div className="kicker" style={{ color: "rgba(255,252,247,0.45)" }}>Navigate</div>
              <ul className="footer-list">
                <li><a href="/#platform">Platform</a></li>
                <li><a href="/#how-it-works">How It Works</a></li>
                <li><a href="/#evidence">Evidence</a></li>
                <li><a href="/#oncologists">For Oncologists</a></li>
                <li><a href="/#validation">Validation</a></li>
                <li><a href="/dashboard">Validator</a></li>
                <li><a href="/login">Login</a></li>
                <li><a href="mailto:hello@onetra.health">Contact</a></li>
              </ul>
            </div>
            <div>
              <div className="kicker" style={{ color: "rgba(255,252,247,0.45)" }}>Security</div>
              <ul className="footer-list">
                <li><a href="/privacy">Security/Privacy</a></li>
                <li><a href="/terms">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 OneTra Health. Adult oncology. Not a medical device. Clinician judgment required.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
