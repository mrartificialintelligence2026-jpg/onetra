import { useEffect, useMemo, useState } from "react";
import SiteChrome from "./SiteChrome.jsx";
import { useAuth } from "./AuthProvider.jsx";
import { googleClientId } from "./authClient.js";
import { ConsentForm, ProfileForm } from "./ProfileConsent.jsx";
import { loadDoctor1VnextIntake, runDoctor1Vnext } from "./doctor1VnextClient.js";
import { setPageMeta } from "./pageMeta.js";

const UNKNOWN = "UNKNOWN";

function emptyPatient() {
  return {
    schema_version: "onetra.doctor1.patient.vnext.1",
    demographics: { age_years: null },
    diagnosis: { cancer: "", histology: UNKNOWN, subtype: null },
    disease: { stage: UNKNOWN, states: [], resectability: UNKNOWN, metastatic_status: UNKNOWN, response_status: UNKNOWN, progression_status: UNKNOWN },
    treatment_context: { line: UNKNOWN, setting: UNKNOWN, intent: UNKNOWN },
    performance: { ecog: UNKNOWN },
    biomarkers: [],
    treatment_history: { history_complete: false, prior_line_count: null, events: [] },
    procedures: { surgical_resection_complete: UNKNOWN, residual_invasive_disease: UNKNOWN },
    clinical_facts: { organ_function_documented: UNKNOWN, menopausal_status: UNKNOWN, ovarian_suppression_active: UNKNOWN, platinum_free_interval_months: null },
    contraindications_review_complete: false,
    contraindications: [],
  };
}

function uniqueOptions(items, key, labels) {
  const values = [...new Set(items.map(key).filter(Boolean))];
  return values.sort((a, b) => String(labels[a] || a).localeCompare(String(labels[b] || b))).map((value) => ({ value, label: labels[value] || value }));
}

function setPath(source, path, value) {
  const next = structuredClone(source);
  const parts = path.split(".");
  let cursor = next;
  for (const part of parts.slice(0, -1)) cursor = cursor[part];
  cursor[parts.at(-1)] = value;
  return next;
}

function eventFromSelection(field, selection) {
  const identity = field.therapy_code || field.class_code;
  const event = {
    event_id: `ui-${identity.replace(/[^A-Z0-9]+/gi, "-").toLowerCase()}`,
    therapy_codes: field.therapy_code ? [field.therapy_code] : [],
    class_codes: field.class_code ? [field.class_code] : [],
    line_number: 1,
    setting: UNKNOWN,
    exposure_status: "GIVEN",
    best_response: UNKNOWN,
    outcome: UNKNOWN,
    progression_relation: UNKNOWN,
    intolerant: UNKNOWN,
    discontinuation_reason: UNKNOWN,
    started_on: null,
    ended_on: null,
  };
  if (selection === "COMPLETED") event.exposure_status = "COMPLETED";
  if (selection === "PROGRESSED_ON") event.progression_relation = "ON";
  if (selection === "PROGRESSED_ON_OR_AFTER") event.progression_relation = "ON_OR_AFTER";
  if (selection === "REFRACTORY_TO") event.outcome = "THERAPY_OUTCOME:REFRACTORY_TO";
  if (selection === "INTOLERANT_TO") event.intolerant = "TRUE";
  return event;
}

export default function Doctor1Vnext() {
  useEffect(() => setPageMeta({ title: "OneTra — Doctor 1 deterministic recommendation", description: "Typed progressive adult-oncology intake with deterministic matching and source evidence.", path: "/dashboard" }), []);
  const authRequired = Boolean(googleClientId());
  const { ready, signedIn, reviewer, token, setReviewer } = useAuth();
  const [definition, setDefinition] = useState(null);
  const [patient, setPatient] = useState(emptyPatient);
  const [diseaseChoice, setDiseaseChoice] = useState("");
  const [lineChoice, setLineChoice] = useState("");
  const [preferredAlternative, setPreferredAlternative] = useState("");
  const [fieldValues, setFieldValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadDoctor1VnextIntake().then((data) => { if (!cancelled) setDefinition(data); }).catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (ready && authRequired && !signedIn) window.location.replace("/login?next=/dashboard");
  }, [ready, authRequired, signedIn]);

  const labels = useMemo(() => definition?.labels || {}, [definition]);
  const pathways = useMemo(() => definition?.pathways || [], [definition]);
  const cancerPaths = useMemo(() => pathways.filter((path) => !patient.diagnosis.cancer || path.base.cancer === patient.diagnosis.cancer), [pathways, patient.diagnosis.cancer]);
  const diseasePaths = useMemo(() => cancerPaths.filter((path) => {
    if (!diseaseChoice) return true;
    const [axis, value] = diseaseChoice.split("|");
    return path.base[axis] === value;
  }), [cancerPaths, diseaseChoice]);
  const linePaths = useMemo(() => diseasePaths.filter((path) => !lineChoice || `${path.base.line}|${path.base.setting}` === lineChoice), [diseasePaths, lineChoice]);
  const histologyOptions = useMemo(() => uniqueOptions(linePaths, (path) => path.base.histology, labels), [linePaths, labels]);
  const activePaths = useMemo(() => linePaths.filter((path) => !path.base.histology || path.base.histology === patient.diagnosis.histology), [linePaths, patient.diagnosis.histology]);
  const baseReady = Boolean(patient.diagnosis.cancer && diseaseChoice && lineChoice && (histologyOptions.length === 0 || patient.diagnosis.histology !== UNKNOWN));
  const dynamicFields = useMemo(() => {
    if (!baseReady) return [];
    const found = new Map();
    for (const path of activePaths) for (const field of path.dynamic_fields) found.set(field.id, field);
    return [...found.values()];
  }, [activePaths, baseReady]);
  const alternatives = useMemo(() => {
    const found = new Map();
    for (const path of activePaths) if (path.alternative_member) found.set(path.alternative_member, path.alternative_label);
    return [...found].map(([value, label]) => ({ value, label }));
  }, [activePaths]);

  const cancerOptions = useMemo(() => uniqueOptions(pathways, (path) => path.base.cancer, labels), [pathways, labels]);
  const diseaseOptions = useMemo(() => {
    const found = new Map();
    for (const path of cancerPaths) {
      const axis = ["stage", "disease_state", "resectability", "metastatic_status"].find((name) => path.base[name] != null);
      const tokenValue = path.base[axis];
      const axisLabel = { stage: "Stage", disease_state: "Disease state", resectability: "Resectability", metastatic_status: "Metastatic disease" }[axis];
      const valueLabel = axis === "metastatic_status" ? (tokenValue === "TRUE" ? "Yes" : "No") : (labels[tokenValue] || tokenValue);
      found.set(`${axis}|${tokenValue}`, `${axisLabel}: ${valueLabel}`);
    }
    return [...found].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [cancerPaths, labels]);
  const lineOptions = useMemo(() => {
    const found = new Map();
    for (const path of diseasePaths) found.set(`${path.base.line}|${path.base.setting}`, `${labels[path.base.line] || path.base.line} · ${labels[path.base.setting] || path.base.setting}`);
    return [...found].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [diseasePaths, labels]);

  function resetFromCancer(cancer) {
    const next = emptyPatient();
    next.diagnosis.cancer = cancer;
    setPatient(next); setDiseaseChoice(""); setLineChoice(""); setPreferredAlternative(""); setFieldValues({}); setResult(null); setError("");
  }

  function chooseDisease(value) {
    setDiseaseChoice(value); setLineChoice(""); setPreferredAlternative(""); setFieldValues({}); setResult(null);
    const [axis, tokenValue] = value.split("|");
    setPatient((current) => {
      let next = setPath(current, "disease.stage", axis === "stage" ? tokenValue : UNKNOWN);
      next = setPath(next, "disease.states", axis === "disease_state" ? [tokenValue] : []);
      next = setPath(next, "disease.resectability", axis === "resectability" ? tokenValue : UNKNOWN);
      next = setPath(next, "disease.metastatic_status", axis === "metastatic_status" ? tokenValue : UNKNOWN);
      next.diagnosis.histology = UNKNOWN; next.treatment_context.line = UNKNOWN; next.treatment_context.setting = UNKNOWN;
      return next;
    });
  }

  function chooseLine(value) {
    setLineChoice(value); setPreferredAlternative(""); setFieldValues({}); setResult(null);
    const [line, setting] = value.split("|");
    setPatient((current) => {
      let next = setPath(current, "treatment_context.line", line);
      next = setPath(next, "treatment_context.setting", setting);
      next.diagnosis.histology = UNKNOWN;
      return next;
    });
  }

  function updateDynamic(field, value) {
    setFieldValues((current) => ({ ...current, [field.id]: value }));
    setResult(null);
    setPatient((current) => {
      if (field.kind === "number") return setPath(current, field.path, value === "" ? null : Number(value));
      if (field.kind === "boolean") return setPath(current, field.path, value === "TRUE");
      if (field.kind === "tristate" || field.kind === "select") return setPath(current, field.path, value);
      if (field.kind === "biomarker") {
        const next = structuredClone(current);
        next.biomarkers = next.biomarkers.filter((item) => item.code !== field.code);
        next.biomarkers.push({ code: field.code, status: value, alteration: null, origin: null, assay: null, score: null });
        return next;
      }
      if (field.kind === "contraindication") {
        const next = structuredClone(current);
        next.contraindications = next.contraindications.filter((code) => code !== field.code);
        if (value) next.contraindications.push(field.code);
        return next;
      }
      const next = structuredClone(current);
      const identity = field.therapy_code || field.class_code;
      next.treatment_history.events = next.treatment_history.events.filter((item) => !item.therapy_codes.includes(identity) && !item.class_codes.includes(identity));
      if (value !== UNKNOWN && value !== "NOT_EXPOSED") next.treatment_history.events.push(eventFromSelection(field, value));
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault(); setError(""); setResult(null);
    if (!baseReady) { setError("Complete the executable cancer, disease, and treatment path."); return; }
    if (!Number.isInteger(patient.demographics.age_years)) { setError("Enter the patient's exact age or leave it unknown to receive an explicit abstention."); return; }
    if (alternatives.length > 1 && !preferredAlternative) { setError("Choose one of the explicitly accepted alternative regimens for deterministic resolution."); return; }
    setLoading(true);
    try { setResult(await runDoctor1Vnext({ patient, preferred_alternative_member: preferredAlternative || null }, token || undefined)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  if (!ready || !definition) return <SiteChrome active="/dashboard"><main className="page-main"><p className="hint">Loading Doctor 1…</p>{error && <p className="error">{error}</p>}</main></SiteChrome>;
  if (authRequired && signedIn && reviewer && !reviewer.profile_complete) return <SiteChrome active="/dashboard"><main className="page-main"><h1>Reviewer profile</h1><ProfileForm reviewer={reviewer} onSaved={setReviewer} /></main></SiteChrome>;
  if (authRequired && signedIn && reviewer && !reviewer.consent_complete) return <SiteChrome active="/dashboard"><main className="page-main"><h1>Validation terms</h1><ConsentForm onSaved={setReviewer} /></main></SiteChrome>;

  return (
    <SiteChrome active="/dashboard">
      <main id="main" className="page-main" data-testid="doctor1-vnext-ready">
        <p className="kicker">Doctor 1 · vNext golden mechanism</p>
        <h1>Case profile</h1>
        <p className="notice">Adult oncology. Fields appear only when a still-compatible executable pathway requires them. Unknown material facts cause abstention.</p>
        <form className="form-card" onSubmit={submit}>
          <div className="form-grid">
            <SelectField id="vnext-cancer" label="Cancer" value={patient.diagnosis.cancer} options={cancerOptions} onChange={resetFromCancer} />
            <SelectField id="vnext-disease" label="Stage / disease state" value={diseaseChoice} options={diseaseOptions} disabled={!patient.diagnosis.cancer} onChange={chooseDisease} />
            <SelectField id="vnext-line" label="Line / treatment setting" value={lineChoice} options={lineOptions} disabled={!diseaseChoice} onChange={chooseLine} />
            {histologyOptions.length > 0 && <SelectField id="vnext-histology" label="Histology" value={patient.diagnosis.histology === UNKNOWN ? "" : patient.diagnosis.histology} options={histologyOptions} disabled={!lineChoice} onChange={(value) => setPatient((current) => setPath(current, "diagnosis.histology", value || UNKNOWN))} />}
            {dynamicFields.map((field) => <DynamicField key={field.id} field={field} value={fieldValues[field.id] ?? (field.kind === "number" ? "" : UNKNOWN)} onChange={(value) => updateDynamic(field, value)} />)}
            {alternatives.length > 1 && <SelectField id="vnext-alternative" label="Accepted alternative regimen" value={preferredAlternative} options={alternatives} onChange={setPreferredAlternative} />}
          </div>
          <div className="actions"><button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Running analysis…" : "Run analysis"}</button></div>
        </form>
        {error && <div className="state-card" role="alert"><div className="rec-name">Unable to run Doctor 1</div><p className="error">{error}</p></div>}
        {result && <Doctor1Result result={result} />}
      </main>
    </SiteChrome>
  );
}

function SelectField({ id, label, value, options, onChange, disabled = false }) {
  return <div className="field"><label htmlFor={id}>{label}</label><select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">Select…</option>{options.map((option) => <option key={String(option.value)} value={option.value}>{option.label}</option>)}</select></div>;
}

function DynamicField({ field, value, onChange }) {
  if (field.kind === "number") return <div className="field"><label htmlFor={`vnext-${field.id}`}>{field.label}</label><input id={`vnext-${field.id}`} data-field-id={field.id} type="number" min={field.minimum} max={field.maximum} value={value} onChange={(event) => onChange(event.target.value)} /><span className="hint">Leave unknown only if unavailable; dependent rules will abstain.</span></div>;
  if (field.kind === "contraindication") return <div className="field"><label htmlFor={`vnext-${field.id}`}><input id={`vnext-${field.id}`} data-field-id={field.id} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /> Patient has {field.label}</label><span className="hint">Unchecked is treated as absent only after the contraindication review is marked complete.</span></div>;
  return <SelectField id={`vnext-${field.id}`} label={field.kind === "therapy_event" ? `${field.label} — documented outcome` : field.kind === "biomarker" ? `${field.label} result` : field.label} value={value} options={field.options} onChange={onChange} />;
}

function Doctor1Result({ result }) {
  if (result.status !== "MATCH") return <section className="result-card" data-testid="doctor1-vnext-result"><p className="result-label">Doctor 1 — explicit abstention</p><span className="tag halt">{result.status}</span><div className="rec-name">No deterministic recommendation issued.</div>{result.missing_fields?.length > 0 && <p className="rec-copy">Missing material information: {result.missing_fields.join(", ")}</p>}{result.resolver_trace?.map((step, index) => <p className="hint" key={index}>{step.reason}</p>)}</section>;
  return <section className="result-card" data-testid="doctor1-vnext-result"><p className="result-label">Doctor 1 — deterministic recommendation</p><span className="tag ok">MATCH</span><div className="rec-name" data-testid="vnext-regimen">{result.recommendation.display_regimen}</div><p className="rec-copy">{result.recommendation.rationale}</p><h3>Why this matched</h3><ul data-testid="vnext-match-trace">{result.why_matched.map((trace, index) => <li key={`${trace.predicate_id}-${index}`}>{trace.field}: {trace.reason}</li>)}</ul><h3>Evidence</h3><div data-testid="vnext-evidence"><a href={result.evidence.source_url} target="_blank" rel="noreferrer">{result.evidence.source_title}</a>{result.evidence.source_version_date && <p className="hint">Version/date: {result.evidence.source_version_date}</p>}<p className="rec-copy">{result.evidence.supporting_passage}</p></div></section>;
}
