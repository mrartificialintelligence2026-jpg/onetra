import { useState } from "react";

export default function Login() {
  const [role, setRole] = useState(null);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError("Please enter email and password."); return; }
    setLoading(true); setError("");
    setTimeout(() => {
      setLoading(false);
      if (role === "oncologist") window.location.href = "/onco_view";
      else window.location.href = "/dashboard";
    }, 1200);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#031126", minHeight: "100vh", color: "white", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-nav {
          height: 64px; display: flex; align-items: center; justify-content: space-between;
          padding: 0 48px; border-bottom: 1px solid #163252; background: #04162f;
        }
        .login-logo { font-family: 'DM Serif Display', serif; font-size: 22px; color: white; text-decoration: none; }
        .login-logo span { color: #33b5ff; }
        .back-link { font-size: 13px; color: #3d6a8a; text-decoration: none; transition: color .2s; }
        .back-link:hover { color: #33b5ff; }

        .login-body {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 60px 24px;
        }
        .login-box { width: 100%; max-width: 480px; }

        .login-eyebrow {
          font-size: 10px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase;
          color: #1da1ff; margin-bottom: 10px;
        }
        .login-title {
          font-family: 'DM Serif Display', serif; font-size: clamp(28px, 4vw, 40px);
          line-height: 1.15; margin-bottom: 8px;
        }
        .login-title em { font-style: italic; color: #33b5ff; }
        .login-sub { font-size: 14px; color: #4d7a99; line-height: 1.7; margin-bottom: 36px; }

        .role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 32px; }
        .role-card {
          border: 1px solid #17395b; border-radius: 10px; padding: 20px 18px;
          cursor: pointer; transition: all .2s; background: #061a33; text-align: left;
          position: relative; overflow: hidden;
        }
        .role-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #1da1ff, #0d5a8a); opacity: 0; transition: opacity .2s;
        }
        .role-card:hover { border-color: #1da1ff; transform: translateY(-2px); }
        .role-card:hover::before { opacity: 1; }
        .role-card.selected { border-color: #1da1ff; background: #082438; }
        .role-card.selected::before { opacity: 1; }
        .role-icon { font-size: 24px; margin-bottom: 10px; }
        .role-name { font-size: 14px; font-weight: 700; color: white; margin-bottom: 4px; }
        .role-desc { font-size: 11px; color: #3d6a8a; line-height: 1.5; }
        .role-check {
          position: absolute; top: 12px; right: 12px; width: 18px; height: 18px;
          border-radius: 50%; background: #1da1ff; display: flex; align-items: center;
          justify-content: center; font-size: 9px; font-weight: 900;
          opacity: 0; transition: opacity .2s;
        }
        .role-card.selected .role-check { opacity: 1; }

        .field-label {
          font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
          color: #2a5070; margin-bottom: 6px; display: block;
        }
        .field-input {
          width: 100%; padding: 11px 14px; border: 1px solid #17395b; border-radius: 7px;
          background: #020e20; color: white; font-family: 'Inter', sans-serif;
          font-size: 14px; outline: none; transition: border-color .2s; margin-bottom: 14px;
        }
        .field-input:focus { border-color: #1da1ff; }
        .field-input::placeholder { color: #2a5070; }

        .login-btn {
          width: 100%; padding: 14px; background: #1da1ff; color: white; border: none;
          border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 14px;
          font-weight: 700; cursor: pointer; transition: all .2s; letter-spacing: .02em;
          margin-top: 4px;
        }
        .login-btn:hover:not(:disabled) { background: #0d8de0; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(29,161,255,.3); }
        .login-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

        .login-error {
          background: rgba(239,68,68,.1); border: 1px solid rgba(248,113,113,.25);
          border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #f87171;
          margin-bottom: 14px;
        }
        .login-note { font-size: 11px; color: #1d3d55; text-align: center; margin-top: 18px; line-height: 1.6; }
        .login-note a { color: #1da1ff; text-decoration: none; }

        .divider { border: none; border-top: 1px solid #163252; margin: 28px 0; }

        .spinner-inline {
          display: inline-block; width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,.2); border-top-color: white;
          border-radius: 50%; animation: spin .7s linear infinite;
          vertical-align: middle; margin-right: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .role-required { font-size: 11px; color: #f87171; margin-bottom: 16px; display: none; }
        .role-required.show { display: block; }
      `}</style>

      <nav className="login-nav">
        <a href="/" className="login-logo">OneTra<span> Health</span>™</a>
        <a href="/" className="back-link">← Back to homepage</a>
      </nav>

      <div className="login-body">
        <div className="login-box">
          <div className="login-eyebrow">Platform Access</div>
          <h1 className="login-title">Select your<br/><em>access role.</em></h1>
          <p className="login-sub">OneTra delivers different intelligence layers by role. Select yours to continue.</p>

          <div className="role-grid">
            <div className={`role-card ${role==="oncologist"?"selected":""}`} onClick={()=>setRole("oncologist")}>
              <div className="role-check">✓</div>
              <div className="role-icon">🩺</div>
              <div className="role-name">Oncologist</div>
              <div className="role-desc">Full clinical intelligence — prognosis, NCCN mapping, trial matching, biomarker sequencing.</div>
            </div>
            <div className={`role-card ${role==="patient"?"selected":""}`} onClick={()=>setRole("patient")}>
              <div className="role-check">✓</div>
              <div className="role-icon">👤</div>
              <div className="role-name">General / Patient</div>
              <div className="role-desc">Simplified guidance, educational summaries, referral direction — emotionally safe framing.</div>
            </div>
          </div>

          {!role && error && <div className="role-required show">Please select a role to continue.</div>}

          <hr className="divider"/>

          <label className="field-label">Email Address</label>
          <input className="field-input" type="email" placeholder="you@hospital.org"
            value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>

          <label className="field-label">Password</label>
          <input className="field-input" type="password" placeholder="••••••••"
            value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>

          {error && role && <div className="login-error">{error}</div>}

          <button className="login-btn" disabled={loading} onClick={()=>{
            if(!role){setError("Please select a role."); return;}
            handleLogin();
          }}>
            {loading ? <><span className="spinner-inline"/>Authenticating...</> : "Continue to Platform →"}
          </button>

          <p className="login-note">
            No account? <a href="mailto:hello@onetra.health">Contact us</a> for enterprise access.<br/>
            OneTra is currently in early access — hospital and oncology partners only.
          </p>
        </div>
      </div>
    </div>
  );
}
