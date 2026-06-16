import { useState } from "react";

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
    font-size: 13px;
  }

  .ot-wrap { min-height: 100vh; background: var(--navy); }

  /* NAV */
  .ot-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 40px;
    background: rgba(13,33,68,0.92);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--line);
    position: sticky; top: 0; z-index: 100;
  }
  .ot-logo { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; color: var(--white); letter-spacing: -0.5px; }
  .ot-logo em { color: var(--sky); font-style: normal; }
  .ot-nav-tag { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 1.8px; color: var(--muted); text-transform: uppercase; }
  .ot-nav-r { display: flex; align-items: center; gap: 10px; }
  .nav-pill { display: flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-family: 'DM Mono', monospace; font-size: 10px; border: 1px solid rgba(46,212,160,0.25); color: var(--mint); background: rgba(46,212,160,0.06); }
  .nav-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 8px var(--mint); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

  /* MAIN */
  .ot-main { max-width: 880px; margin: 0 auto; padding: 32px 28px; display: flex; flex-direction: column; gap: 18px; }

  /* INTAKE FORM */
  .intake-card {
    background: linear-gradient(135deg, rgba(26,53,102,0.9) 0%, rgba(20,44,86,0.95) 100%);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    padding: 26px 28px;
  }
  .intake-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
  .intake-field { display: flex; flex-direction: column; gap: 6px; }
  .intake-field.full { grid-column: 1 / -1; }
  .intake-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 1.8px; color: var(--muted); text-transform: uppercase; }
  .intake-field select {
    background: rgba(255,255,255,0.04); border: 1px solid var(--card-border); border-radius: 8px;
    color: var(--white); font-family: 'Fraunces', Georgia, serif; font-size: 13px; padding: 0 10px; height: 36px;
  }
  .intake-field select[multiple] { height: auto; min-height: 110px; padding: 6px; }
  .intake-hint { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); }
  .intake-submit {
    margin-top: 18px; display: flex; justify-content: flex-end;
  }
  .btn-primary {
    background: var(--sky); color: var(--navy); border: none; border-radius: 8px;
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px;
    padding: 10px 22px; cursor: pointer; transition: transform .15s;
  }
  .btn-primary:hover { transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.6; cursor: wait; }

  .pc-eyebrow { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 2px; color: var(--sky); text-transform: uppercase; margin-bottom: 8px; }
  .pc-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: var(--white); letter-spacing: -0.5px; }

  .tag { display: inline-block; padding: 2px 9px; border-radius: 4px; font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 500; margin: 2px 4px 2px 0; }
  .tag-sky { background: rgba(74,184,240,0.1); color: var(--sky); border: 1px solid rgba(74,184,240,0.2); }
  .tag-mint { background: rgba(46,212,160,0.1); color: var(--mint); border: 1px solid rgba(46,212,160,0.2); }
  .tag-muted { background: rgba(106,159,192,0.1); color: var(--muted); border: 1px solid rgba(106,159,192,0.2); }
  .tag-coral { background: rgba(240,98,114,0.1); color: var(--coral); border: 1px solid rgba(240,98,114,0.25); }

  /* RESULTS */
  .sec-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 2.2px; color: var(--sky); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .sec-label::after { content: ''; flex: 1; height: 1px; background: var(--line); }
  .treat-section { display: flex; flex-direction: column; gap: 12px; }
  .treat-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--card-border);
    border-radius: 14px;
    padding: 18px 20px;
    position: relative;
  }
  .treat-card::before { content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 3px; background: var(--sky); border-radius: 3px 0 0 3px; }
  .treat-name { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: var(--white); margin-bottom: 6px; }
  .treat-rationale { font-size: 12.5px; color: var(--muted); line-height: 1.6; font-style: italic; margin-top: 8px; }
  .treat-refs { margin-top: 10px; }

  /* LOADING / ERROR / EMPTY */
  .state-card {
    background: linear-gradient(135deg, rgba(26,53,102,0.7) 0%, rgba(13,33,68,0.9) 100%);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    padding: 48px 32px;
    text-align: center;
  }
  .loading-dots { display: flex; gap: 10px; justify-content: center; margin-bottom: 18px; }
  .loading-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--sky); animation: pulse 1.4s infinite; }
  .loading-dot:nth-child(2) { animation-delay: 0.2s; }
  .loading-dot:nth-child(3) { animation-delay: 0.4s; }
  .state-title { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: var(--white); margin-bottom: 6px; }
  .state-sub { font-family: 'DM Mono', monospace; font-size: 9.5px; color: var(--muted); letter-spacing: 0.8px; }
  .state-err-msg { font-family: 'DM Mono', monospace; font-size: 10.5px; color: var(--coral); background: rgba(240,98,114,0.08); border: 1px solid rgba(240,98,114,0.2); border-radius: 8px; padding: 10px 14px; margin-top: 14px; }

  /* FOOTER */
  .ot-footer { text-align: center; padding: 20px 32px; border-top: 1px solid var(--line); margin-top: 12px; }
  .ot-footer-txt { font-family: 'DM Mono', monospace; font-size: 9.5px; color: var(--muted); letter-spacing: 0.4px; }

  @media (max-width: 640px) {
    .intake-grid { grid-template-columns: 1fr; }
    .ot-main { padding: 24px 16px; }
    .intake-card { padding: 20px; }
  }
`;

const CANCER_TYPE_OPTIONS = [
  { value: "NSCLC", label: "Non-Small Cell Lung Cancer (NSCLC)" },
];
const STAGE_OPTIONS = ["I", "II", "III", "IV"];
const BIOMARKER_OPTIONS = [
  { value: "EGFR_EX19DEL", label: "EGFR Exon 19 Deletion" },
  { value: "EGFR_L858R", label: "EGFR L858R" },
  { value: "ALK", label: "ALK Fusion" },
  { value: "ROS1", label: "ROS1 Fusion" },
  { value: "KRAS_G12C", label: "KRAS G12C" },
  { value: "MET_EX14", label: "MET Exon 14 Skipping" },
  { value: "RET", label: "RET Fusion / Rearrangement" },
  { value: "BRAF_V600E", label: "BRAF V600E" },
  { value: "PDL1_HIGH", label: "PD-L1 Overexpression (>=50%)" },
];
const ECOG_OPTIONS = [
  { value: "0", label: "0 - Fully active" },
  { value: "1", label: "1 - Restricted, ambulatory" },
  { value: "2", label: "2 - Ambulatory, unable to work" },
  { value: "3", label: "3 - Limited self-care" },
  { value: "4", label: "4 - Completely disabled" },
];
const LINE_OPTIONS = [
  { value: "1L", label: "1st Line" },
  { value: "2L", label: "2nd Line" },
  { value: "3L+", label: "3rd Line or later" },
];
const PRIOR_THERAPY_OPTIONS = [
  { value: "CH", label: "Chemotherapy" },
  { value: "RT", label: "Radiation" },
  { value: "IM", label: "Immunotherapy" },
  { value: "TG", label: "Targeted Therapy" },
  { value: "SG", label: "Surgery" },
  { value: "HO", label: "Hormonal Therapy" },
];

const DEFAULT_INTAKE = {
  cancer_type: "NSCLC",
  stage: "IV",
  biomarkers: [],
  ecog: "1",
  line_of_therapy: "1L",
  prior_therapy: [],
};

function IntakeForm({ intake, setIntake, onSubmit, loading }) {
  function setField(key, value) {
    setIntake((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form className="intake-card" onSubmit={onSubmit}>
      <div className="pc-eyebrow">Patient Intake</div>
      <div className="pc-title">Clinical Profile</div>
      <div className="intake-grid">
        <div className="intake-field">
          <label className="intake-label" htmlFor="cancer-type">Cancer Type</label>
          <select id="cancer-type" value={intake.cancer_type} onChange={(e) => setField("cancer_type", e.target.value)}>
            {CANCER_TYPE_OPTIONS.map((o) => <option value={o.value} key={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="intake-field">
          <label className="intake-label" htmlFor="stage">Stage</label>
          <select id="stage" value={intake.stage} onChange={(e) => setField("stage", e.target.value)}>
            {STAGE_OPTIONS.map((s) => <option value={s} key={s}>Stage {s}</option>)}
          </select>
        </div>
        <div className="intake-field">
          <label className="intake-label" htmlFor="ecog">ECOG Performance Status</label>
          <select id="ecog" value={intake.ecog} onChange={(e) => setField("ecog", e.target.value)}>
            {ECOG_OPTIONS.map((o) => <option value={o.value} key={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="intake-field">
          <label className="intake-label" htmlFor="line">Line of Therapy</label>
          <select id="line" value={intake.line_of_therapy} onChange={(e) => setField("line_of_therapy", e.target.value)}>
            {LINE_OPTIONS.map((o) => <option value={o.value} key={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="intake-field full">
          <label className="intake-label" htmlFor="biomarkers">Biomarker(s)</label>
          <select
            id="biomarkers"
            multiple
            value={intake.biomarkers}
            onChange={(e) => setField("biomarkers", Array.from(e.target.selectedOptions, (o) => o.value))}
          >
            {BIOMARKER_OPTIONS.map((o) => <option value={o.value} key={o.value}>{o.label}</option>)}
          </select>
          <span className="intake-hint">Ctrl/Cmd-click to select multiple, or none if no driver detected.</span>
        </div>
        <div className="intake-field full">
          <label className="intake-label" htmlFor="prior-therapy">Prior Therapy</label>
          <select
            id="prior-therapy"
            multiple
            value={intake.prior_therapy}
            onChange={(e) => setField("prior_therapy", Array.from(e.target.selectedOptions, (o) => o.value))}
          >
            {PRIOR_THERAPY_OPTIONS.map((o) => <option value={o.value} key={o.value}>{o.label}</option>)}
          </select>
          <span className="intake-hint">Ctrl/Cmd-click to select multiple, or none if treatment-naive.</span>
        </div>
      </div>
      <div className="intake-submit">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Analyzing…" : "Get Recommendation"}
        </button>
      </div>
    </form>
  );
}

function RecommendationCard({ rec }) {
  return (
    <div className="treat-card">
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <span className="tag tag-mint">{rec.evidence_tier}</span>
        <span className="tag tag-sky">{rec.fda_status}</span>
      </div>
      <div className="treat-name">{rec.treatment}</div>
      <div className="treat-rationale">{rec.rationale}</div>
      {rec.references?.length ? (
        <div className="treat-refs">
          {rec.references.map((ref) => <span className="tag tag-muted" key={ref}>{ref}</span>)}
        </div>
      ) : null}
    </div>
  );
}

function ResultsPanel({ result }) {
  if (!result) return null;
  const recommendations = result.recommendations || [];

  return (
    <div>
      <div className="sec-label">Treatment Pathways</div>
      {result.safety_notice ? (
        <div className="state-err-msg" style={{ marginBottom: 12 }}>{result.safety_notice}</div>
      ) : null}
      <div className="treat-section">
        {recommendations.length
          ? recommendations.map((rec, i) => <RecommendationCard rec={rec} key={`${rec.treatment}-${i}`} />)
          : <div className="state-card"><div className="state-title">No grounded recommendation available.</div></div>}
      </div>
    </div>
  );
}

export default function OneTraDashboard() {
  const [intake, setIntake] = useState(DEFAULT_INTAKE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function submitIntake(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const base = import.meta.env.VITE_API_URL || "http://localhost:8000";
    try {
      const r = await fetch(`${base}/api/clinical-recommendation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intake),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setResult(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const nav = (
    <nav className="ot-nav">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span className="ot-logo">One<em>Tra</em> Health™</span>
        <span style={{ width: 1, height: 18, background: "var(--line)", display: "inline-block" }} />
        <span className="ot-nav-tag">Clinical Dashboard</span>
      </div>
      <div className="ot-nav-r">
        <div className="nav-pill"><span className="nav-dot" />Clinical Safety · Active</div>
      </div>
    </nav>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="ot-wrap">
        {nav}
        <main className="ot-main">
          <IntakeForm intake={intake} setIntake={setIntake} onSubmit={submitIntake} loading={loading} />

          {loading && (
            <div className="state-card">
              <div className="loading-dots">
                <div className="loading-dot" />
                <div className="loading-dot" />
                <div className="loading-dot" />
              </div>
              <div className="state-title">Matching against clinical guidelines…</div>
              <div className="state-sub">Evaluating molecular profile and disease stage</div>
            </div>
          )}

          {error && (
            <div className="state-card">
              <div className="state-title">Analysis unavailable</div>
              <div className="state-sub">Check that the clinical recommendation service is reachable</div>
              <div className="state-err-msg">{error}</div>
            </div>
          )}

          {!loading && !error && <ResultsPanel result={result} />}

          <div className="ot-footer">
            <div className="ot-footer-txt">
              OneTra Health · Oncology Decision Intelligence · NCCN-aligned · Not a substitute for physician clinical judgment
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
