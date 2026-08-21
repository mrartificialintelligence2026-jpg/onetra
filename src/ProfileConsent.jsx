import { useState } from "react";
import { ledgerFetch } from "./authClient.js";

const TYPES = [
  { value: "oncologist", label: "Oncologist" },
  { value: "other_physician", label: "Other physician" },
  { value: "researcher", label: "Researcher" },
  { value: "other_reviewer", label: "Other reviewer" },
];

export function ProfileForm({ reviewer, onSaved }) {
  const [form, setForm] = useState({
    display_name: reviewer.display_name || "",
    reviewer_type: reviewer.reviewer_type || "",
    specialty: reviewer.specialty || "",
    institution: reviewer.institution || "",
    country: reviewer.country || "",
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const data = await ledgerFetch("/api/auth/profile", { method: "POST", body: form });
      onSaved(data.reviewer);
    } catch (err) {
      setError(err.message || "Profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit} data-testid="reviewer-profile">
      <p className="kicker">First-time reviewer profile</p>
      <h2 style={{ fontSize: 28 }}>Tell us who is reviewing</h2>
      <p className="hint" style={{ marginBottom: 18 }}>
        Type is self-declared. Selecting oncologist does not make the account a verified oncologist.
      </p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="display-name">Name</label>
          <input id="display-name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="reviewer-email">Email</label>
          <input id="reviewer-email" value={reviewer.email || ""} readOnly />
        </div>
        <div className="field">
          <label htmlFor="reviewer-type">Reviewer type</label>
          <select id="reviewer-type" required value={form.reviewer_type} onChange={(e) => setForm({ ...form, reviewer_type: e.target.value })}>
            <option value="">Select…</option>
            {TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="specialty">Specialty (optional)</label>
          <input id="specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="institution">Institution / organization (optional)</label>
          <input id="institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="country">Country (optional)</label>
          <input id="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Continue"}</button>
      </div>
    </form>
  );
}

export function ConsentForm({ onSaved }) {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!accepted) {
      setError("Acknowledgement is required before the first case.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = await ledgerFetch("/api/auth/consent", { method: "POST", body: { accepted: true } });
      onSaved(data.reviewer);
    } catch (err) {
      setError(err.message || "Consent could not be recorded.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit} data-testid="validation-consent">
      <p className="kicker">Validation terms</p>
      <h2 style={{ fontSize: 28 }}>Before the first case</h2>
      <ul className="consent-list">
        <li>OneTra is validation-stage oncology decision support, not an approved medical device.</li>
        <li>Adult oncology only. Numeric age is required.</li>
        <li>Clinician judgment remains required. OneTra does not replace a treating oncologist.</li>
        <li>Validation inputs must be synthetic or properly de-identified.</li>
        <li>Do not upload names, IDs, contact information, addresses, facility identifiers, or other direct patient identifiers.</li>
        <li>OneTra may abstain when deterministic criteria are not satisfied.</li>
        <li>Submitted validation feedback may be stored for product validation and quality assessment.</li>
      </ul>
      <label className="confirm">
        <input id="consent-ack" type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>I acknowledge these validation terms. This is not a claim of HIPAA, GDPR, FDA, or CE compliance.</span>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button className="btn btn-primary" type="submit" disabled={saving || !accepted}>{saving ? "Recording…" : "Start validation"}</button>
      </div>
    </form>
  );
}
