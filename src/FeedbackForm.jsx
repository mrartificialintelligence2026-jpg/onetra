import { useState } from "react";
import { ledgerFetch } from "./authClient.js";

export default function FeedbackForm({ runId, d1Status, onSaved }) {
  const [form, setForm] = useState({
    clinically_correct: "",
    recommendation_usefulness: "3",
    evidence_usefulness: "3",
    abstention_appropriate: d1Status === "ABSTAIN" ? "yes" : "not_applicable",
    missing_clinical_factor: "",
    clinical_error_category: "",
    comments: "",
    requires_correction_before_clinical_use: "no",
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await ledgerFetch("/api/ledger/feedback", {
        method: "POST",
        body: {
          run_id: runId,
          clinically_correct: form.clinically_correct,
          recommendation_usefulness: Number(form.recommendation_usefulness),
          evidence_usefulness: Number(form.evidence_usefulness),
          abstention_appropriate: form.abstention_appropriate,
          missing_clinical_factor: form.missing_clinical_factor,
          clinical_error_category: form.clinical_error_category,
          comments: form.comments,
          requires_correction_before_clinical_use: form.requires_correction_before_clinical_use === "yes",
        },
      });
      onSaved();
    } catch (err) {
      setError(err.message || "Feedback could not be recorded.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit} data-testid="validation-feedback">
      <p className="kicker">Step 5</p>
      <h2 style={{ fontSize: 28 }}>Structured reviewer feedback</h2>
      <p className="hint" style={{ marginBottom: 18 }}>Required after each case. This becomes part of the validation ledger.</p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="clinically-correct">Clinically correct</label>
          <select id="clinically-correct" required value={form.clinically_correct} onChange={(e) => setField("clinically_correct", e.target.value)}>
            <option value="">Select…</option>
            <option value="yes">Yes</option>
            <option value="partially">Partially</option>
            <option value="no">No</option>
            <option value="unable_to_judge">Unable to judge</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="rec-use">Recommendation usefulness (1–5)</label>
          <select id="rec-use" value={form.recommendation_usefulness} onChange={(e) => setField("recommendation_usefulness", e.target.value)}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ev-use">Evidence / citation usefulness (1–5)</label>
          <select id="ev-use" value={form.evidence_usefulness} onChange={(e) => setField("evidence_usefulness", e.target.value)}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="abstention-ok">Abstention appropriate</label>
          <select id="abstention-ok" value={form.abstention_appropriate} onChange={(e) => setField("abstention_appropriate", e.target.value)}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="not_applicable">Not applicable</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="missing-factor">Missing clinical factor</label>
          <input id="missing-factor" value={form.missing_clinical_factor} onChange={(e) => setField("missing_clinical_factor", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="error-category">Clinical error category</label>
          <input id="error-category" value={form.clinical_error_category} onChange={(e) => setField("clinical_error_category", e.target.value)} />
        </div>
        <div className="field full">
          <label htmlFor="feedback-comments">Comments</label>
          <textarea id="feedback-comments" rows={4} value={form.comments} onChange={(e) => setField("comments", e.target.value)} />
        </div>
        <div className="field full">
          <label htmlFor="needs-correction">Would this output require correction before clinical use?</label>
          <select id="needs-correction" value={form.requires_correction_before_clinical_use} onChange={(e) => setField("requires_correction_before_clinical_use", e.target.value)}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Recording…" : "Submit feedback"}</button>
      </div>
    </form>
  );
}
