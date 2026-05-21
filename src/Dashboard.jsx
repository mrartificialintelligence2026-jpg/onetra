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

  /* BRIEFING */
  .briefing-card {
    background: linear-gradient(135deg, rgba(26,53,102,0.7) 0%, rgba(13,33,68,0.9) 100%);
    border: 1px solid var(--card-border);
    border-radius: 20px;
    padding: 36px 40px;
  }
  .sec-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 2.5px; color: var(--sky); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .sec-label::after { content: ''; flex: 1; height: 1px; background: var(--line); }
  .briefing-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: var(--white); margin-bottom: 6px; }
  .briefing-sub { font-size: 13px; font-style: italic; color: var(--muted); margin-bottom: 20px; }
  .briefing-text { font-size: 14.5px; line-height: 1.85; color: var(--txt); font-weight: 300; }

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

  /* FOOTER */
  .ot-footer { text-align: center; padding: 24px 32px; border-top: 1px solid var(--line); margin-top: 16px; }
  .ot-footer-txt { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); letter-spacing: 0.5px; }
`;

const mockData = {
  patient_id: "SYN-ONC-000",
  status: "Ready for Physician Review",
  final_physician_summary:
    "Osimertinib was identified as a Preferred NCCN Category 1 pathway with a final composite score of 12 — representing the strongest possible evidence alignment for this patient's EGFR L858R profile. NCT-MOCK-002 achieved Strongly Recommended status (match score 9.0), with clean TP53 alignment and no exclusion conflicts — an open door worth exploring. NCT-MOCK-001 requires review: EGFR and stage match are confirmed, but prior Pembrolizumab exposure flags a potential conflict that warrants physician judgment before proceeding.",
  patient_context: {
    cancer_type: "Non-Small Cell Lung Cancer",
    stage: "IV",
    prior_therapies: ["Platinum doublet chemotherapy", "Pembrolizumab"],
    biomarkers: ["EGFR L858R", "TP53 R273H"],
  },
  treatments: [
    {
      treatment: "Osimertinib",
      category: "Preferred",
      evidence_level: "Category 1",
      final_score: 12,
      max_score: 15,
      matched_biomarkers: ["EGFR"],
      rationale: "Strong NCCN Category 1 recommendation with direct EGFR L858R match. FLAURA trial demonstrates superior PFS over earlier-generation TKIs.",
    },
  ],
  trials: [
    {
      nct_id: "NCT-MOCK-002",
      title: "Phase 2 Study of Novel TP53 Stabilizers in Solid Tumors",
      status: "Strongly Recommended",
      match_score: 9.0,
      rationale: "Gene Match: TP53 · Stage Match: IV · No exclusion conflicts identified",
    },
    {
      nct_id: "NCT-MOCK-001",
      title: "Targeted Therapy in Advanced EGFR-Mutated NSCLC",
      status: "Review Required",
      match_score: 2.0,
      rationale: "Gene Match: EGFR · Variant: EGFR L858R · Stage: IV · ⚠️ Prior Pembrolizumab exposure — physician review advised",
    },
  ],
};

export default function OneTraDashboard() {
  const [mounted, setMounted] = useState(false);
  const [scoreFilled, setScoreFilled] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setScoreFilled(true), 400);
  }, []);

  const pct = (score, max) => Math.round((score / max) * 100);

  return (
    <>
      <style>{styles}</style>
      <div className="ot-wrap" style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.5s" }}>

        {/* NAV */}
        <nav className="ot-nav">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span className="ot-logo">One<em>Tra</em> Health™</span>
            <span style={{ width: 1, height: 18, background: "var(--line)", display: "inline-block" }} />
            <span className="ot-nav-tag">Physician Cockpit</span>
          </div>
          <div className="ot-nav-r">
            <div className="nav-pill"><span className="nav-dot" />Clinical Safety · Active</div>
            <div className="nav-pill" style={{ borderColor: "rgba(74,184,240,0.2)", color: "var(--sky)", background: "rgba(74,184,240,0.06)" }}>Azure OpenAI</div>
          </div>
        </nav>

        <main className="ot-main">

          {/* PATIENT CARD */}
          <div className="patient-card">
            <div className="pc-eyebrow">Stage IV · Non-Small Cell Lung Cancer · {mockData.patient_id}</div>
            <div className="pc-title">{mockData.patient_context.cancer_type}</div>
            <div className="pc-hope">Every data point analyzed. Every pathway explored. Evidence in hand — so your team can focus on what matters most.</div>
            <div className="pc-grid">
              <div className="pc-cell">
                <div className="pc-cell-label">Key Biomarkers</div>
                <div className="pc-cell-val">
                  {mockData.patient_context.biomarkers.map((b) => (
                    <span key={b} className="tag tag-sky">{b}</span>
                  ))}
                </div>
              </div>
              <div className="pc-cell">
                <div className="pc-cell-label">Prior Therapies</div>
                <div className="pc-cell-val">
                  {mockData.patient_context.prior_therapies.map((t) => (
                    <span key={t} className="tag tag-amber">{t}</span>
                  ))}
                </div>
              </div>
              <div className="pc-cell">
                <div className="pc-cell-label">Performance Status</div>
                <div className="pc-cell-val">
                  <span className="tag tag-mint">ECOG 1</span>
                  <span className="tag tag-muted">Ready for Treatment</span>
                </div>
              </div>
            </div>
          </div>

          {/* HOPE BANNER */}
          <div className="hope-banner">
            <div className="hope-icon">🔬</div>
            <div className="hope-text">
              <strong>Science has opened doors here.</strong> This patient's molecular profile matches targetable pathways and active clinical trials. The analysis below gives your team a clear, evidence-ranked starting point — the next step belongs to you.
            </div>
          </div>

          {/* BRIEFING */}
          <div className="briefing-card">
            <div className="sec-label">AI Clinical Briefing</div>
            <div className="briefing-title">Physician Summary</div>
            <div className="briefing-sub">NCCN-aligned · Biomarker-validated · Evidence-ranked</div>
            <div className="briefing-text">{mockData.final_physician_summary}</div>
          </div>

          {/* TWO COL: TREATMENTS + TRIALS */}
          <div className="two-col">

            {/* TREATMENTS */}
            <div>
              <div className="sec-label" style={{ marginBottom: 16 }}>Treatment Pathways</div>
              <div className="treat-section">
                {mockData.treatments.map((t) => (
                  <div className="treat-card" key={t.treatment}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      <span className="treat-badge badge-pref">⭐ {t.category}</span>
                      <span className="treat-badge badge-cat1">{t.evidence_level}</span>
                    </div>
                    <div className="treat-name">{t.treatment}</div>
                    <div className="treat-rationale">{t.rationale}</div>
                    <div className="treat-score">Score {t.final_score} / {t.max_score}</div>
                    <div className="score-bar">
                      <div className="score-fill" style={{ width: scoreFilled ? `${pct(t.final_score, t.max_score)}%` : "0%" }} />
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 5 }}>
                      {t.matched_biomarkers.map((b) => <span key={b} className="tag tag-sky">{b} matched</span>)}
                    </div>
                  </div>
                ))}
                <div className="treat-card" style={{ borderColor: "rgba(74,184,240,0.08)", opacity: 0.6, cursor: "default" }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", textAlign: "center", padding: "8px 0" }}>
                    + 2 more pathways · Connect backend to unlock
                  </div>
                </div>
              </div>
            </div>

            {/* TRIALS */}
            <div>
              <div className="sec-label" style={{ marginBottom: 16 }}>Clinical Trials Matched</div>
              <div className="treat-section">
                {mockData.trials.map((tr) => (
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

          </div>

          {/* FOOTER NOTE */}
          <div className="ot-footer">
            <div className="ot-footer-txt">
              OneTra Health · Oncology Decision Intelligence · NCCN-aligned · Azure-native · Not a substitute for physician clinical judgment
            </div>
          </div>

        </main>
      </div>
    </>
  );
}
