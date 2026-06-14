import { useState, useEffect } from "react";

/* ─── Google Fonts ─── */
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300;1,9..144,400&family=DM+Mono:wght@300;400;500&display=swap";
document.head.appendChild(fontLink);

const styles = `
  :root {
    --navy: #0d2144;
    --navy2: #142c56;
    --navy3: #1a3566;
    --sky: #4ab8f0;
    --sky2: #2196d3;
    --mint: #2ed4a0;
    --mint2: #1aaa7a;
    --white: #f0f6ff;
    --txt: #c8dff2;
    --muted: #6a9fc0;
    --line: rgba(74,184,240,0.15);
    --line2: rgba(74,184,240,0.08);
    --amber: #f5a623;
    --coral: #f06272;
    --card: rgba(255,255,255,0.04);
    --card-border: rgba(74,184,240,0.14);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body, #root {
    background: var(--navy);
    color: var(--txt);
    font-family: 'Fraunces', Georgia, serif;
    min-height: 100vh;
  }

  .ot-wrap { min-height: 100vh; background: var(--navy); }

  /* NAV */
  .ot-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 48px;
    background: rgba(13,33,68,0.92);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--line);
    position: sticky; top: 0; z-index: 100;
  }
  .ot-logo { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: var(--white); letter-spacing: -0.5px; }
  .ot-logo em { color: var(--sky); font-style: normal; }
  .ot-nav-tag { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; }
  .ot-nav-r { display: flex; align-items: center; gap: 10px; }
  .nav-pill { display: flex; align-items: center; gap: 6px; padding: 5px 14px; border-radius: 20px; font-family: 'DM Mono', monospace; font-size: 11px; border: 1px solid rgba(46,212,160,0.25); color: var(--mint); background: rgba(46,212,160,0.06); }
  .nav-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 8px var(--mint); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

  /* MAIN */
  .ot-main { max-width: 1120px; margin: 0 auto; padding: 40px 32px; display: flex; flex-direction: column; gap: 24px; }

  /* PATIENT CARD */
  .patient-card {
    background: linear-gradient(135deg, rgba(26,53,102,0.9) 0%, rgba(20,44,86,0.95) 100%);
    border: 1px solid var(--card-border);
    border-radius: 20px;
    padding: 36px 40px;
    position: relative;
    overflow: hidden;
  }
  .patient-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--sky), var(--mint));
  }
  .patient-card::after {
    content: '';
    position: absolute; top: -80px; right: -80px;
    width: 260px; height: 260px; border-radius: 50%;
    background: radial-gradient(circle, rgba(74,184,240,0.07) 0%, transparent 70%);
    pointer-events: none;
  }
  .pc-eyebrow { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 2.5px; color: var(--sky); text-transform: uppercase; margin-bottom: 10px; }
  .pc-title { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; color: var(--white); letter-spacing: -0.5px; margin-bottom: 6px; }
  .pc-hope { font-size: 14px; font-style: italic; color: var(--muted); margin-bottom: 28px; line-height: 1.6; }
  .pc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .pc-cell { background: rgba(255,255,255,0.03); border: 1px solid var(--line2); border-radius: 12px; padding: 16px 18px; }
  .pc-cell-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; margin-bottom: 8px; }
  .pc-cell-val { font-size: 13px; font-weight: 400; color: var(--white); line-height: 1.6; }
  .tag { display: inline-block; padding: 2px 9px; border-radius: 4px; font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 500; margin: 2px 3px 2px 0; }
  .tag-sky { background: rgba(74,184,240,0.1); color: var(--sky); border: 1px solid rgba(74,184,240,0.2); }
  .tag-amber { background: rgba(245,166,35,0.1); color: var(--amber); border: 1px solid rgba(245,166,35,0.2); }
  .tag-mint { background: rgba(46,212,160,0.1); color: var(--mint); border: 1px solid rgba(46,212,160,0.2); }
  .tag-muted { background: rgba(106,159,192,0.1); color: var(--muted); border: 1px solid rgba(106,159,192,0.2); }

  /* TWO COL */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

  /* TREATMENT CARD */
  .treat-section { display: flex; flex-direction: column; gap: 14px; }
  .treat-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    padding: 22px 24px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s, transform 0.2s;
    cursor: default;
  }
  .treat-card:hover { border-color: rgba(74,184,240,0.35); transform: translateY(-2px); }
  .treat-card::before { content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 3px; background: var(--sky); border-radius: 3px 0 0 3px; }
  .treat-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 4px; font-family: 'DM Mono', monospace; font-size: 9px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px; }
  .badge-pref { background: rgba(74,184,240,0.12); color: var(--sky); border: 1px solid rgba(74,184,240,0.25); }
  .badge-cat1 { background: rgba(46,212,160,0.1); color: var(--mint); border: 1px solid rgba(46,212,160,0.2); }
  .treat-name { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; color: var(--white); margin-bottom: 6px; }
  .treat-rationale { font-size: 13px; color: var(--muted); line-height: 1.65; font-style: italic; }
  .treat-score { position: absolute; top: 22px; right: 22px; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--sky); }
  .score-bar { height: 3px; background: var(--line); border-radius: 3px; margin-top: 14px; overflow: hidden; }
  .score-fill { height: 100%; background: linear-gradient(90deg, var(--sky), var(--mint)); border-radius: 3px; transition: width 1s ease; }

  /* TRIAL CARDS */
  .trial-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    padding: 22px 24px;
    transition: border-color 0.2s, transform 0.2s;
  }
  .trial-card:hover { border-color: rgba(46,212,160,0.3); transform: translateY(-2px); }
  .trial-status { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 4px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px; }
  .status-strong { background: rgba(46,212,160,0.1); color: var(--mint); border: 1px solid rgba(46,212,160,0.25); }
  .status-review { background: rgba(245,166,35,0.1); color: var(--amber); border: 1px solid rgba(245,166,35,0.25); }
  .trial-id { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); margin-bottom: 6px; }
  .trial-title { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 600; color: var(--white); margin-bottom: 8px; line-height: 1.4; }
  .trial-rationale { font-size: 12px; color: var(--muted); line-height: 1.6; font-style: italic; }
  .trial-score-row { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
  .trial-score-label { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); }
  .trial-score-val { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; color: var(--sky); }

  /* HOPE BANNER */
  .hope-banner {
    background: linear-gradient(135deg, rgba(26,53,102,0.6) 0%, rgba(13,33,68,0.8) 100%);
    border: 1px solid rgba(46,212,160,0.2);
    border-radius: 16px;
    padding: 24px 32px;
    display: flex; align-items: center; gap: 20px;
  }
  .hope-icon { font-size: 28px; flex-shrink: 0; }
  .hope-text { font-size: 14px; line-height: 1.75; color: var(--txt); font-style: italic; font-weight: 300; }
  .hope-text strong { color: var(--mint); font-style: normal; font-weight: 600; }

  /* SEC LABEL */
  .sec-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 2.5px; color: var(--sky); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .sec-label::after { content: ''; flex: 1; height: 1px; background: var(--line); }

  /* AI OUTPUT (doctor1 / doctor2) */
  .ai-output-card {
    background: linear-gradient(135deg, rgba(26,53,102,0.7) 0%, rgba(13,33,68,0.9) 100%);
    border: 1px solid var(--card-border);
    border-radius: 20px;
    padding: 28px 32px;
    display: flex;
    flex-direction: column;
  }
  .doc-engine-tag { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; padding: 3px 10px; border-radius: 4px; margin-bottom: 14px; display: inline-flex; align-items: center; gap: 6px; width: fit-content; }
  .doc1-tag { background: rgba(74,184,240,0.1); color: var(--sky); border: 1px solid rgba(74,184,240,0.2); }
  .doc2-tag { background: rgba(46,212,160,0.1); color: var(--mint); border: 1px solid rgba(46,212,160,0.2); }
  .doc-title { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: var(--white); margin-bottom: 14px; }
  .doc-body { font-size: 13.5px; line-height: 1.85; color: var(--txt); font-weight: 300; white-space: pre-wrap; }

  /* LOADING / ERROR */
  .state-card {
    background: linear-gradient(135deg, rgba(26,53,102,0.7) 0%, rgba(13,33,68,0.9) 100%);
    border: 1px solid var(--card-border);
    border-radius: 20px;
    padding: 80px 40px;
    text-align: center;
  }
  .loading-dots { display: flex; gap: 10px; justify-content: center; margin-bottom: 24px; }
  .loading-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--sky); animation: pulse 1.4s infinite; }
  .loading-dot:nth-child(2) { animation-delay: 0.2s; }
  .loading-dot:nth-child(3) { animation-delay: 0.4s; }
  .state-title { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: var(--white); margin-bottom: 8px; }
  .state-sub { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 1px; }
  .state-err-msg { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--coral); background: rgba(240,98,114,0.08); border: 1px solid rgba(240,98,114,0.2); border-radius: 8px; padding: 10px 16px; margin-top: 16px; }

  /* FOOTER */
  .ot-footer { text-align: center; padding: 24px 32px; border-top: 1px solid var(--line); margin-top: 16px; }
  .ot-footer-txt { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.5px; }
`;

/* The SYN-ONC-000 VEDA stream — hardcoded for this release; oncologist input form is a later step */
const VEDA_STREAM =
  "VEDA1.0|SID:PT-20260613-000|DV:1.0\n@BASE[SID:PT-20260613-000]|Sigma[CT:NSCLC].[ST:4].[GR:X].[MS:NSCLC]|Omega[CH:7].[GN:14].[VT:04].[ZY:H]~[CF:95]|Omega[CH:9].[GN:25].[VT:07].[ZY:H]~[CF:95]|Lambda[GB:NCCN].[PI:NSCLC-2026].[VR:1.0].[LT:1L]|[AG:A3].[GD:M].[PS:1].[PT:CH].[PT:RT]";

const STAGE_MAP = { "1": "I", "2": "II", "3": "III", "4": "IV" };
const CONF_SCORE = { HIGH: 90, MEDIUM: 60, LOW: 30 };

function toTitleCase(soc) {
  return soc.split("+").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" + ");
}

function transformResponse(api) {
  const glyphs = api.parsed?.glyphs || {};
  const sigma = glyphs.sigma || {};
  const omega = glyphs.omega || [];
  const demo = glyphs.demographics || {};
  const prior = glyphs.prior_treatments || [];

  return {
    session_id: api.session_id,
    status: api.status,
    patient_context: {
      cancer_type: sigma.cancer_type || "Unknown",
      stage: STAGE_MAP[sigma.stage] || sigma.stage || "Unknown",
      biomarkers: omega.map(b => `${b.gene_name} ${b.variant_name}`),
      prior_therapies: prior.map(p => p.name),
      performance_status: demo.performance_status || "",
    },
    treatments: (api.matched_rules || []).map(rule => ({
      treatment: toTitleCase(rule.soc),
      category: rule.evidence === "NCCN_CAT1" ? "Preferred" : "Alternative",
      evidence_level: rule.evidence === "NCCN_CAT1" ? "Category 1" : rule.evidence,
      final_score: CONF_SCORE[rule.confidence] ?? 50,
      max_score: 100,
      matched_biomarkers: [rule.biomarker.split("_")[0]],
      rationale: rule.reason,
      prior_exposure: rule.prior_exposure,
    })),
    trials: [],
    doctor1: api.doctor1,
    doctor2: api.doctor2,
  };
}

export default function OneTraDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [scoreFilled, setScoreFilled] = useState(false);

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || "http://localhost:8000";
    fetch(`${base}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stream: VEDA_STREAM }),
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => {
        if (json.status === "REJECTED") throw new Error(json.error || "VEDA stream rejected");
        setData(transformResponse(json));
        setLoading(false);
        setTimeout(() => setScoreFilled(true), 400);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const pct = (score, max) => Math.round((score / max) * 100);

  const nav = (
    <nav className="ot-nav">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span className="ot-logo">One<em>Tra</em> Health™</span>
        <span style={{ width: 1, height: 18, background: "var(--line)", display: "inline-block" }} />
        <span className="ot-nav-tag">Physician Cockpit</span>
      </div>
      <div className="ot-nav-r">
        <div className="nav-pill"><span className="nav-dot" />Clinical Safety · Active</div>
        <div className="nav-pill" style={{ borderColor: "rgba(74,184,240,0.2)", color: "var(--sky)", background: "rgba(74,184,240,0.06)" }}>VEDA-RT Alpha</div>
      </div>
    </nav>
  );

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="ot-wrap">
          {nav}
          <main className="ot-main">
            <div className="state-card">
              <div className="loading-dots">
                <div className="loading-dot" />
                <div className="loading-dot" />
                <div className="loading-dot" />
              </div>
              <div className="state-title">Analyzing VEDA stream…</div>
              <div className="state-sub">Running Doctor 1 · Doctor 2 · Rule matching</div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{styles}</style>
        <div className="ot-wrap">
          {nav}
          <main className="ot-main">
            <div className="state-card">
              <div className="state-title">Analysis unavailable</div>
              <div className="state-sub">Check that the VEDA-RT backend is running on {import.meta.env.VITE_API_URL || "http://localhost:8000"}</div>
              <div className="state-err-msg">{error}</div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="ot-wrap">

        {nav}

        <main className="ot-main">

          {/* PATIENT CARD */}
          <div className="patient-card">
            <div className="pc-eyebrow">Stage {data.patient_context.stage} · {data.patient_context.cancer_type} · {data.session_id}</div>
            <div className="pc-title">{data.patient_context.cancer_type}</div>
            <div className="pc-hope">Every data point analyzed. Every pathway explored. Evidence in hand — so your team can focus on what matters most.</div>
            <div className="pc-grid">
              <div className="pc-cell">
                <div className="pc-cell-label">Key Biomarkers</div>
                <div className="pc-cell-val">
                  {data.patient_context.biomarkers.map((b) => (
                    <span key={b} className="tag tag-sky">{b}</span>
                  ))}
                </div>
              </div>
              <div className="pc-cell">
                <div className="pc-cell-label">Prior Therapies</div>
                <div className="pc-cell-val">
                  {data.patient_context.prior_therapies.map((t) => (
                    <span key={t} className="tag tag-amber">{t}</span>
                  ))}
                </div>
              </div>
              <div className="pc-cell">
                <div className="pc-cell-label">Performance Status</div>
                <div className="pc-cell-val">
                  {data.patient_context.performance_status
                    ? <span className="tag tag-mint">{data.patient_context.performance_status}</span>
                    : null}
                  <span className="tag tag-muted">Ready for Treatment</span>
                </div>
              </div>
            </div>
          </div>

          {/* HOPE BANNER */}
          <div className="hope-banner">
            <div className="hope-icon">🔬</div>
            <div className="hope-text">
              <strong>Science has opened doors here.</strong> This patient's molecular profile matches targetable pathways. The analysis below gives your team a clear, evidence-ranked starting point — the next step belongs to you.
            </div>
          </div>

          {/* DOCTOR 1 / DOCTOR 2 — core AI output */}
          <div className="two-col">
            <div className="ai-output-card">
              <span className="doc-engine-tag doc1-tag">⬡ Doctor 1 · NCCN/FDA Doctrine Engine</span>
              <div className="doc-title">Guideline-Grounded Recommendation</div>
              <div className="doc-body">{data.doctor1}</div>
            </div>
            <div className="ai-output-card">
              <span className="doc-engine-tag doc2-tag">⬡ Doctor 2 · Investigational Analyst</span>
              <div className="doc-title">Research Guidance &amp; Caveats</div>
              <div className="doc-body">{data.doctor2}</div>
            </div>
          </div>

          {/* TWO COL: TREATMENTS + TRIALS */}
          <div className={data.trials.length > 0 ? "two-col" : ""}>

            {/* TREATMENTS */}
            <div>
              <div className="sec-label" style={{ marginBottom: 16 }}>Treatment Pathways</div>
              <div className="treat-section">
                {data.treatments.map((t) => (
                  <div className="treat-card" key={t.treatment}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      <span className="treat-badge badge-pref">⭐ {t.category}</span>
                      <span className="treat-badge badge-cat1">{t.evidence_level}</span>
                      {t.prior_exposure && (
                        <span className="treat-badge" style={{ background: "rgba(245,166,35,0.1)", color: "var(--amber)", border: "1px solid rgba(245,166,35,0.25)" }}>Prior Exposure</span>
                      )}
                    </div>
                    <div className="treat-name">{t.treatment}</div>
                    <div className="treat-rationale">{t.rationale}</div>
                    <div className="treat-score">Confidence {t.final_score}%</div>
                    <div className="score-bar">
                      <div className="score-fill" style={{ width: scoreFilled ? `${pct(t.final_score, t.max_score)}%` : "0%" }} />
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 5 }}>
                      {t.matched_biomarkers.map((b) => <span key={b} className="tag tag-sky">{b} matched</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TRIALS — only rendered when the API returns trial data */}
            {data.trials.length > 0 && (
              <div>
                <div className="sec-label" style={{ marginBottom: 16 }}>Clinical Trials Matched</div>
                <div className="treat-section">
                  {data.trials.map((tr) => (
                    <div className="trial-card" key={tr.nct_id}>
                      <span className={`trial-status ${tr.status === "Strongly Recommended" ? "status-strong" : "status-review"}`}>
                        {tr.status === "Strongly Recommended" ? "✓ " : "⚠ "}{tr.status}
                      </span>
                      <div className="trial-id">{tr.nct_id}</div>
                      <div className="trial-title">{tr.title}</div>
                      <div className="trial-rationale">{tr.rationale}</div>
                      <div className="trial-score-row">
                        <span className="trial-score-label">Match score</span>
                        <span className="trial-score-val">{tr.match_score.toFixed(1)} / 10</span>
                      </div>
                      <div className="score-bar" style={{ marginTop: 8 }}>
                        <div className="score-fill"
                          style={{
                            width: scoreFilled ? `${(tr.match_score / 10) * 100}%` : "0%",
                            background: tr.status === "Strongly Recommended"
                              ? "linear-gradient(90deg, var(--mint), var(--sky))"
                              : "linear-gradient(90deg, var(--amber), var(--coral))"
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div className="ot-footer">
            <div className="ot-footer-txt">
              OneTra Health · Oncology Decision Intelligence · NCCN-aligned · VEDA-RT · Not a substitute for physician clinical judgment
            </div>
          </div>

        </main>
      </div>
    </>
  );
}
