import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_UNIFIED_API || "";
const initial = { cancer_type: "NSCLC", stage: "IV", biomarkers: "EGFR_EX19DEL", ecog: "0", line_of_therapy: "1L", histology: "Nonsquamous" };
const Field = ({label, children, hint}) => <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;

export default function App() {
  const [caps,setCaps]=useState(null), [form,setForm]=useState(initial), [file,setFile]=useState(null);
  const [synthetic,setSynthetic]=useState(false), [phase,setPhase]=useState("idle"), [result,setResult]=useState(null), [error,setError]=useState("");
  useEffect(()=>{fetch(`${API}/api/v1/capabilities`).then(r=>r.ok?r.json():Promise.reject()).then(setCaps).catch(()=>setError("Staging capabilities are temporarily unavailable."));},[]);
  const cancers=caps?.cancer_types||[{id:"NSCLC",coverage:"demonstration-ready"}];
  const biomarkers=useMemo(()=>form.biomarkers.split(",").map(x=>x.trim()).filter(Boolean),[form.biomarkers]);
  const set=k=>e=>setForm({...form,[k]:e.target.value});
  async function submit(e){e.preventDefault();setError("");setResult(null);if(!synthetic)return setError("Confirm that this is a synthetic demonstration case.");setPhase(file?"extracting":"analyzing");const body=new FormData();body.append("intake_json",JSON.stringify({...form,biomarkers,prior_therapy:[]}));body.append("synthetic_confirmed","true");if(file)body.append("file",file);try{const r=await fetch(`${API}/api/v1/unified-analysis`,{method:"POST",body});if(!r.ok)throw new Error((await r.json()).detail||"Analysis failed safely.");setPhase("verifying");setResult(await r.json());setPhase("done");}catch(x){setError(typeof x.message==="string"?x.message:"Analysis unavailable; no clinical output was produced.");setPhase("idle");}}
  return <main>
    <header className="masthead"><div><p className="eyebrow">OneTra unified staging</p><h1>Evidence-bound oncology workflow</h1><p>One synthetic written report becomes a reviewed fact set, a deterministic rule result, trusted citations, and a fail-closed longitudinal pattern decision.</p></div><div className="status"><span/>Private owner preview</div></header>
    <div className="warning" role="note">Demonstration software — synthetic cases only — not validated for patient care.</div>
    <section className="pipeline" aria-label="Analysis pipeline">{["Upload","Extract facts","Doctor 1","Doctor 2","Doctor 3","Verify"].map((x,i)=><div key={x}><b>{i+1}</b><span>{x}</span></div>)}</section>
    <section className="workspace">
      <form onSubmit={submit} className="panel form-panel"><div className="panel-head"><div><p className="eyebrow">Synthetic case intake</p><h2>Review the case inputs</h2></div><span className="scope">Adult oncology demo</span></div>
        <div className="grid">
          <Field label="Cancer type" hint={cancers.find(x=>x.id===form.cancer_type)?.coverage}><select value={form.cancer_type} onChange={set("cancer_type")}>{cancers.map(x=><option key={x.id}>{x.id}</option>)}</select></Field>
          <Field label="Stage"><select value={form.stage} onChange={set("stage")}>{["I","II","III","IV"].map(x=><option key={x}>{x}</option>)}</select></Field>
          <Field label="Line of therapy"><select value={form.line_of_therapy} onChange={set("line_of_therapy")}><option>1L</option><option>2L</option><option>3L+</option></select></Field>
          <Field label="ECOG"><select value={form.ecog} onChange={set("ecog")}>{["0","1","2","3","4"].map(x=><option key={x}>{x}</option>)}</select></Field>
          <Field label="Histology"><input value={form.histology} onChange={set("histology")}/></Field>
          <Field label="Biomarkers" hint="Comma-separated canonical demo identifiers"><input value={form.biomarkers} onChange={set("biomarkers")}/></Field>
        </div>
        <label className="upload"><input type="file" accept=".txt,.pdf,.docx,.png,.jpg,.jpeg" onChange={e=>setFile(e.target.files?.[0]||null)}/><strong>{file?file.name:"Choose a synthetic written oncology report"}</strong><span>TXT, PDF, DOCX, PNG or JPEG · maximum 10 MB · no medical-image pixel interpretation</span></label>
        <label className="confirm"><input type="checkbox" checked={synthetic} onChange={e=>setSynthetic(e.target.checked)}/><span>I confirm this contains synthetic demonstration data only and no PHI.</span></label>
        <button className="primary" disabled={phase!=="idle"&&phase!=="done"}>{phase==="extracting"?"Extracting facts…":phase==="analyzing"?"Running analysis…":phase==="verifying"?"Verifying output…":"Run unified analysis"}</button>{error&&<p className="error" role="alert">{String(error)}</p>}
      </form>
      <section className="panel result-panel" aria-live="polite" aria-busy={phase!=="idle"&&phase!=="done"}>{!result?<div className="empty"><div>01</div><h2>One coherent result</h2><p>The reviewed facts, deterministic recommendation, trusted evidence and Doctor 3 safety decision will appear here.</p></div>:<Result data={result}/>}</section>
    </section>
    <footer><p>BUILDER/STAGING VALIDATION — INDEPENDENT CC OR GROK AUDIT PENDING</p><p>OneTra remains an unvalidated software/IP asset and is not approved for patient care.</p></footer>
  </main>;
}

function Result({data}){return <div className="results"><div className="result-title"><div><p className="eyebrow">Verified unified response</p><h2>{data.case_summary.cancer_type} · Stage {data.case_summary.stage}</h2></div><span className="verified">Fail-closed verifier passed</span></div>
  <article><h3>Extracted facts</h3>{data.extracted_facts.length?<div className="chips">{data.extracted_facts.map(f=><span key={f.id}>{f.type}: {f.value}</span>)}</div>:<p className="muted">Structured intake only; no report was uploaded.</p>}{data.missing_information.length>0&&<p className="caution">Missing: {data.missing_information.join(", ")}</p>}</article>
  <article><h3>Deterministic recommendation</h3>{data.doctor1.recommendations.length?data.doctor1.recommendations.map((r,i)=><div className="recommendation" key={i}><b>{r.treatment}</b><span>{r.evidence_tier}</span><p>{r.rationale}</p></div>):<p className="abstain">Controlled abstention — no grounded rule matched all supplied facts.</p>}</article>
  <article><h3>Trusted evidence</h3>{data.doctor2.evidence?.length?<details><summary>{data.doctor2.evidence.length} traceable citations</summary>{data.doctor2.evidence.map(e=><div className="citation" key={e.source_identifier}><b>{e.title}</b><p>{e.citation}</p><small>{e.source_name} · {e.publication_date||"date unavailable"}</small></div>)}</details>:<p className="abstain">Controlled abstention — trusted grounding was inadequate or unavailable.</p>}</article>
  <article className="silence"><div><h3>Longitudinal pattern monitor</h3><p>SILENCE is the expected safe result when no approved trigger is active.</p></div><strong>{data.doctor3.decision}</strong></article><p className="request">Request {data.request_id}</p></div>}
