import { useEffect, useState } from "react";
import SiteChrome from "./SiteChrome.jsx";
import { setPageMeta } from "./pageMeta.js";
import { useAuth } from "./AuthProvider.jsx";
import { googleClientId, ledgerFetch } from "./authClient.js";

export default function Admin() {
  const { ready, signedIn, reviewer, signOut } = useAuth();
  const [summary, setSummary] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setPageMeta({
      title: "Validation summary — OneTra Health",
      description: "Private OneTra validation ledger summary for authorized administrators.",
      path: "/admin",
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!signedIn) {
      window.location.replace("/login?next=/admin");
      return;
    }
    if (!reviewer?.is_admin) return;
    ledgerFetch("/api/admin/summary")
      .then(setSummary)
      .catch((err) => setError(err.message || "Summary unavailable."));
  }, [ready, signedIn, reviewer]);

  if (!ready) {
    return (
      <SiteChrome active="/admin">
        <main id="main" className="page-main"><p className="hint">Loading…</p></main>
      </SiteChrome>
    );
  }

  if (signedIn && !reviewer?.is_admin) {
    return (
      <SiteChrome active="/admin">
        <main id="main" className="page-main">
          <p className="kicker">Restricted</p>
          <h1>Administrator access required</h1>
          <p className="lede">This summary is not available to ordinary reviewer accounts.</p>
        </main>
      </SiteChrome>
    );
  }

  return (
    <SiteChrome active="/admin">
      <main id="main" className="page-main">
        <p className="kicker">Private validation ledger</p>
        <h1>Validation summary</h1>
        <p className="hint">Authorized administrators only. Reviewer emails are not listed here.</p>
        {error && <p className="error" role="alert">{error}</p>}
        {summary && (
          <>
            <div className="stat-grid">
              <Stat label="Reviewers" value={summary.reviewer_count} />
              <Stat label="Runs" value={summary.run_count} />
              <Stat label="Cancer types" value={summary.cancer_types} />
              <Stat label="MATCH" value={summary.match_count} />
              <Stat label="ABSTAIN" value={summary.abstain_count} />
              <Stat label="ERROR" value={summary.error_count} />
              <Stat label="Correct / partial / no" value={`${summary.clinically_correct_yes} / ${summary.clinically_correct_partial} / ${summary.clinically_correct_no}`} />
              <Stat label="Judgeable correctness" value={summary.correctness_pct == null ? "n/a" : `${summary.correctness_pct}%`} />
              <Stat label="Evidence complaints" value={summary.evidence_complaints} />
              <Stat label="Unresolved reported errors" value={summary.unresolved_errors} />
            </div>
            <section className="form-card">
              <h2 style={{ fontSize: 24 }}>Rules most frequently tested</h2>
              <ul className="admin-list">
                {(summary.rules_tested || []).map((row) => (
                  <li key={row.rule_key}>{row.rule_key} · {row.tested} runs · {row.negative} negative</li>
                ))}
              </ul>
            </section>
            <section className="form-card">
              <h2 style={{ fontSize: 24 }}>Recent runs</h2>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Status</th>
                      <th>Cancer</th>
                      <th>Regimen / rule</th>
                      <th>Judgment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.recent_runs || []).map((row) => (
                      <tr key={row.id}>
                        <td><button className="linkish" type="button" onClick={() => openRun(row.id)}>{String(row.response_at).slice(0, 19)}</button></td>
                        <td>{row.d1_status}</td>
                        <td>{row.cancer_type}</td>
                        <td>{row.d1_rule_id || row.matched_regimen || "—"}</td>
                        <td>{row.clinically_correct || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        {detail && (
          <section className="form-card" data-testid="admin-run-detail">
            <h2 style={{ fontSize: 24 }}>Run detail</h2>
            <p className="hint">Reviewer type {detail.reviewer?.type || "unspecified"} · {detail.reviewer?.verification_status}</p>
            <p className="rec-copy">{detail.d1_status} · {detail.matched_regimen || "no regimen"}</p>
            <p className="rec-copy">{detail.intake?.cancer_type} / {detail.intake?.stage} / {detail.intake?.line_of_therapy}</p>
            {detail.reasons && <p className="rec-copy">{detail.reasons}</p>}
            {detail.feedback && <p className="rec-copy">Feedback: {detail.feedback.clinically_correct}. {detail.feedback.comments || ""}</p>}
          </section>
        )}
        {googleClientId() && (
          <div className="actions" style={{ justifyContent: "flex-start" }}>
            <button className="btn btn-ghost" type="button" onClick={signOut}>Sign out</button>
          </div>
        )}
      </main>
    </SiteChrome>
  );

  async function openRun(id) {
    try {
      setDetail(await ledgerFetch(`/api/admin/run?id=${encodeURIComponent(id)}`));
    } catch (err) {
      setError(err.message);
    }
  }
}

function Stat({ label, value }) {
  return (
    <article className="stat-card">
      <div className="kicker">{label}</div>
      <div className="stat-value">{value}</div>
    </article>
  );
}
