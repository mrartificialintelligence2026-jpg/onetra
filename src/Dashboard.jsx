import { useEffect, useMemo, useState } from "react";
import SiteChrome from "./SiteChrome.jsx";
import { parsePatientAge, runThreeDoctorAnalysis, toClinicalPayload } from "./liveClient.js";
import { CANCER_TYPES, CORPUS_RULE_COUNT, ECOG_OPTIONS, optionsFor } from "./intakeTaxonomy.js";
import { setPageMeta } from "./pageMeta.js";
import { useAuth } from "./AuthProvider.jsx";
import { googleClientId, hashFileMeta, ledgerFetch } from "./authClient.js";
import { ConsentForm, ProfileForm } from "./ProfileConsent.jsx";
import FeedbackForm from "./FeedbackForm.jsx";

const DEFAULT_INTAKE = {
  cancer_type: "",
  stage: "",
  biomarkers: [],
  ecog: "1",
  line_of_therapy: "",
  prior_therapy: [],
  histology: "",
  age: "",
};

export default function Dashboard() {
  useEffect(() => {
    setPageMeta({
      title: "OneTra validator — Adult oncology case intake",
      description: "Validation-stage OneTra intake for synthetic or de-identified adult oncology cases. Deterministic match or abstention. Numeric age required.",
      path: "/dashboard",
    });
  }, []);

  const authRequired = Boolean(googleClientId());
  const { ready, signedIn, reviewer, token, setReviewer } = useAuth();
  const [intake, setIntake] = useState(DEFAULT_INTAKE);
  const [files, setFiles] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [runId, setRunId] = useState(null);
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const { stages, lines, biomarkers, histologies } = useMemo(
    () => optionsFor(intake.cancer_type, intake.stage, intake.line_of_therapy),
    [intake.cancer_type, intake.stage, intake.line_of_therapy],
  );

  useEffect(() => {
    if (!ready || !authRequired) return;
    if (!signedIn) window.location.replace("/login?next=/dashboard");
  }, [ready, authRequired, signedIn]);

  function setField(key, value) {
    setIntake((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "cancer_type") {
        next.stage = "";
        next.line_of_therapy = "";
        next.biomarkers = [];
        next.histology = "";
      }
      if (key === "stage") {
        next.line_of_therapy = "";
        next.biomarkers = [];
        next.histology = "";
      }
      if (key === "line_of_therapy") {
        next.biomarkers = [];
        const hists = optionsFor(next.cancer_type, next.stage, next.line_of_therapy).histologies;
        next.histology = hists.length === 1 ? hists[0].value : "";
      }
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (parsePatientAge(intake.age) == null) {
      setError("Enter a numeric patient age in years (18–120).");
      return;
    }
    if (!intake.cancer_type || !intake.stage || !intake.line_of_therapy) {
      setError("Select cancer type, stage or setting, and line of therapy.");
      return;
    }
    if (files.length > 0 && !confirmed) {
      setError("Confirm uploaded documents are de-identified before analysis.");
      return;
    }
    setLoading(true);
    const started = performance.now();
    let currentSession = sessionId;
    try {
      if (authRequired && reviewer) {
        if (!currentSession) {
          const created = await ledgerFetch("/api/ledger/session", { method: "POST", body: {} });
          currentSession = created.session.id;
          setSessionId(currentSession);
        }
        await ledgerFetch("/api/ledger/preflight", { method: "POST", body: {} });
      }
      const analysis = await runThreeDoctorAnalysis({ intake, files, token: token || undefined });
      setResult(analysis);
      if (authRequired && reviewer && currentSession) {
        const pathway = analysis.standard_of_care_pathway;
        const rec = (pathway?.recommendations || [])[0];
        const d3 = analysis.longitudinal_pattern_review;
        const d1Status = pathway?.status === "ABSTAIN" || !rec ? "ABSTAIN" : "MATCH";
        const documentMeta = files.length ? await hashFileMeta(files, confirmed) : null;
        const recorded = await ledgerFetch("/api/ledger/run", {
          method: "POST",
          body: {
            session_id: currentSession,
            intake: toClinicalPayload(intake),
            d1_status: d1Status,
            d1_rule_id: rec?.rule_id || rec?.id || null,
            matched_regimen: rec?.treatment || null,
            reasons: rec?.rationale || null,
            source_identifiers: rec?.references || [],
            d2_evidence_identifiers: (analysis.verified_supporting_evidence?.evidence || []).map((item) => item.title || item.citation).filter(Boolean),
            d3_status: d3?.doctor3_status || null,
            d3_silence_status: d3?.doctor3_status === "SILENCE" ? (d3.display_message || "SILENCE") : null,
            runtime_state: pathway?.status || null,
            latency_ms: Math.round(performance.now() - started),
            document_meta: documentMeta,
          },
        });
        setRunId(recorded.run.id);
      }
      setFiles([]);
    } catch (err) {
      if (err.status === 401 && authRequired) {
        setError("Your session expired. Sign in again.");
      } else {
        setError(err.message || "Analysis unavailable");
      }
      if (authRequired && reviewer && currentSession) {
        try {
          const recorded = await ledgerFetch("/api/ledger/run", {
            method: "POST",
            body: {
              session_id: currentSession,
              intake: toClinicalPayload(intake),
              d1_status: "ERROR",
              error_state: err.code || String(err.status || "analysis_error"),
              latency_ms: Math.round(performance.now() - started),
            },
          });
          setRunId(recorded.run.id);
        } catch {
          /* keep the original analysis error */
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const pathway = result?.standard_of_care_pathway;
  const biomarker = intake.biomarkers[0] || "";
  const d1Status = pathway?.status === "ABSTAIN" || !(pathway?.recommendations || []).length ? "ABSTAIN" : "MATCH";

  if (!ready) {
    return (
      <SiteChrome active="/dashboard">
        <main id="main" className="page-main"><p className="hint">Loading…</p></main>
      </SiteChrome>
    );
  }

  if (authRequired && signedIn && reviewer && !reviewer.profile_complete) {
    return (
      <SiteChrome active="/dashboard">
        <main id="main" className="page-main">
          <p className="kicker">Step 1</p>
          <h1>Reviewer profile</h1>
          <ProfileForm reviewer={reviewer} onSaved={setReviewer} />
        </main>
      </SiteChrome>
    );
  }

  if (authRequired && signedIn && reviewer && !reviewer.consent_complete) {
    return (
      <SiteChrome active="/dashboard">
        <main id="main" className="page-main">
          <p className="kicker">Step 2</p>
          <h1>Validation terms</h1>
          <ConsentForm onSaved={setReviewer} />
        </main>
      </SiteChrome>
    );
  }

  return (
    <SiteChrome active="/dashboard">
      <main id="main" className="page-main">
        <p className="kicker">Step 3 · Live validation platform</p>
        <h1>Clinical intake</h1>
        <p className="notice">
          Synthetic or de-identified information only. Do not upload patient-identifying information.
          Adult oncology. OneTra may abstain. Clinician judgment required.
        </p>

        <form className="form-card" onSubmit={submit}>
          <p className="kicker">Structured case</p>
          <h2 style={{ fontSize: 28 }}>Case profile</h2>
          <p className="hint" style={{ marginBottom: 18 }}>
            Selections are derived from the live {CORPUS_RULE_COUNT}-rule corpus ({CANCER_TYPES.length} cancer types).
            Downstream lists only include combinations that appear on at least one current rule.
          </p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="cancer-type">Cancer type</label>
              <select id="cancer-type" required value={intake.cancer_type} onChange={(e) => setField("cancer_type", e.target.value)}>
                <option value="">Select…</option>
                {CANCER_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="stage">Stage / setting</label>
              <select id="stage" required disabled={!intake.cancer_type} value={intake.stage} onChange={(e) => setField("stage", e.target.value)}>
                <option value="">Select…</option>
                {stages.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="line">Line of therapy</label>
              <select id="line" required disabled={!intake.stage} value={intake.line_of_therapy} onChange={(e) => setField("line_of_therapy", e.target.value)}>
                <option value="">Select…</option>
                {lines.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="biomarkers">Biomarker(s)</label>
              <select
                id="biomarkers"
                multiple={biomarkers.length > 1}
                disabled={!intake.line_of_therapy}
                value={biomarkers.length > 1 ? intake.biomarkers : biomarker}
                onChange={(e) => {
                  if (biomarkers.length > 1) {
                    setField("biomarkers", Array.from(e.target.selectedOptions, (o) => o.value).filter(Boolean));
                  } else {
                    setField("biomarkers", e.target.value ? [e.target.value] : []);
                  }
                }}
              >
                {biomarkers.length <= 1 && <option value="">None specified</option>}
                {biomarkers.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {histologies.length > 0 && (
              <div className="field">
                <label htmlFor="histology">Histology</label>
                <select id="histology" value={intake.histology} onChange={(e) => setField("histology", e.target.value)}>
                  {histologies.length !== 1 && <option value="">Select…</option>}
                  {histologies.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            <div className="field">
              <label htmlFor="ecog">Performance status</label>
              <select id="ecog" value={intake.ecog} onChange={(e) => setField("ecog", e.target.value)}>
                {ECOG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="patient-age">Patient age (years)</label>
              <input
                id="patient-age"
                aria-label="Patient age (years)"
                type="number"
                inputMode="numeric"
                min="18"
                max="120"
                step="1"
                required
                value={intake.age}
                onChange={(e) => setField("age", e.target.value)}
              />
              <span className="hint">Exact numeric age is required (18–120).</span>
            </div>
            <div className="field full">
              <label htmlFor="clinical-documents">Optional clinical documents (TXT, DOCX, text-bearing PDF)</label>
              <input
                id="clinical-documents"
                aria-label="Optional clinical documents"
                type="file"
                multiple
                accept=".txt,.docx,.pdf"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </div>
          </div>
          <label className="confirm">
            <input id="deidentify-confirm" type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>I confirm any uploaded document is cropped or de-identified and contains no direct identifiers.</span>
          </label>
          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={loading || (files.length > 0 && !confirmed)}>
              {loading ? "Analyzing…" : "Run analysis"}
            </button>
          </div>
        </form>

        {loading && (
          <div className="state-card" role="status">
            <div className="rec-name">Matching the case…</div>
            <p className="hint">Deterministic evaluation of structured intake and any uploaded documents.</p>
          </div>
        )}

        {error && (
          <div className="state-card" role="alert">
            <div className="rec-name">Analysis unavailable</div>
            <p className="error">{error}</p>
          </div>
        )}

        {!loading && result && (
          <div className="results">
            <Doctor1 data={pathway} intake={intake} />
            {pathway?.status !== "ABSTAIN" && (result.verified_supporting_evidence?.evidence || []).length > 0 && (
              <Doctor2 data={result.verified_supporting_evidence} />
            )}
            <Doctor3 data={result.longitudinal_pattern_review} />
            {authRequired && runId && !feedbackSaved && (
              <FeedbackForm runId={runId} d1Status={d1Status} onSaved={() => setFeedbackSaved(true)} />
            )}
            {feedbackSaved && (
              <div className="state-card" data-testid="feedback-recorded">
                <div className="rec-name">Feedback recorded</div>
                <p className="hint">This validation run is in the ledger. You can test another case.</p>
                <div className="actions" style={{ justifyContent: "center" }}>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => {
                      setIntake(DEFAULT_INTAKE);
                      setResult(null);
                      setRunId(null);
                      setFeedbackSaved(false);
                      setError(null);
                      setFiles([]);
                      setConfirmed(false);
                    }}
                  >
                    Test another case
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </SiteChrome>
  );
}

function Doctor1({ data, intake }) {
  const recs = data?.recommendations || [];
  return (
    <section className="result-card" data-testid="doctor1-card">
      <p className="result-label">Doctor 1 · Deterministic match</p>
      {recs.length ? recs.map((rec, i) => (
        <div key={`${rec.treatment}-${i}`}>
          {rec.evidence_tier ? <span className="tag ok">{rec.evidence_tier}</span> : null}
          {data?.status ? <span className="tag ok">{data.status}</span> : null}
          <div className="rec-name">{rec.treatment}</div>
          {rec.rationale ? <p className="rec-copy">{rec.rationale}</p> : <p className="rec-copy">Matched a deterministic corpus pathway for the submitted factors.</p>}
          <div className="factor-list">
            <span className="tag">{intake.cancer_type}</span>
            <span className="tag">{intake.stage}</span>
            <span className="tag">{intake.line_of_therapy}</span>
            {(intake.biomarkers || []).map((b) => <span className="tag" key={b}>{b}</span>)}
            <span className="tag">Age {intake.age}</span>
          </div>
          {rec.references?.map((ref) => <span className="tag" key={ref}>{ref}</span>)}
        </div>
      )) : (
        <div>
          <span className="tag halt">ABSTAIN</span>
          <div className="rec-name">No eligible pathway matched.</div>
          <p className="rec-copy">OneTra abstained because deterministic criteria were not met for the submitted factors.</p>
          <div className="factor-list">
            <span className="tag">{intake.cancer_type}</span>
            <span className="tag">{intake.stage}</span>
            <span className="tag">{intake.line_of_therapy}</span>
            {(intake.biomarkers || []).map((b) => <span className="tag" key={b}>{b}</span>)}
            <span className="tag">Age {intake.age}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function Doctor2({ data }) {
  return (
    <section className="result-card" data-testid="doctor2-card">
      <p className="result-label">Doctor 2 · Source evidence</p>
      {(data?.evidence || []).map((item, i) => (
        <p className="rec-copy" key={`${item.title || item.citation || i}`}>{item.title || item.citation}</p>
      ))}
    </section>
  );
}

function Doctor3({ data }) {
  return (
    <section className="result-card" data-testid="doctor3-card">
      <p className="result-label">Doctor 3 · Grounded document analysis</p>
      <p className="rec-copy">{data?.display_message || "No clinical document uploaded."}</p>
      {data?.nano?.status === "LIVE_NANO_VERIFICATION_BLOCKED" && (
        <p className="hint" style={{ marginTop: 10 }}>Model-dependent phrasing is withheld. Deterministic document review remains active.</p>
      )}
    </section>
  );
}
