import { useEffect } from "react";
import SiteChrome from "./SiteChrome.jsx";
import { setPageMeta } from "./pageMeta.js";

export default function App() {
  useEffect(() => {
    setPageMeta({
      title: "OneTra Health — Auditable oncology decision support",
      description: "Validation-stage adult oncology decision support. Deterministic Doctor 1 matching, source-traceable evidence, VEDA document processing, and safe abstention.",
      path: "/",
    });
  }, []);

  return (
    <SiteChrome>
      <main id="main">
        <section className="hero">
          <img className="visually-hidden" src="/imagery/vial-hero.jpg" alt="Glass medicine vial on a dark clinical surface" />
          <div className="wrap">
            <p className="kicker">Adult oncology · Validation stage</p>
            <h1>Auditable Oncology Decision Support</h1>
            <p className="lede">
              Deterministic oncology matching against a clinically audited rule corpus.
              Source-linked recommendations when criteria are met. Safe abstention when they are not.
              Clinical-document processing through VEDA. External oncologist review is underway.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="/dashboard">Open Validation Platform</a>
              <a className="btn btn-ghost" href="#how-it-works">How OneTra Works</a>
            </div>
          </div>
        </section>

        <div className="band" aria-label="Current operating bounds">
          <div className="wrap band-grid">
            <div className="band-item"><strong>Adult oncology</strong><span>Numeric age required. Eighteen and older.</span></div>
            <div className="band-item"><strong>One match, or abstain</strong><span>Doctor 1 does not rank a treatment list.</span></div>
            <div className="band-item"><strong>Source-linked</strong><span>Doctor 2 surfaces evidence on a match.</span></div>
            <div className="band-item"><strong>Validation stage</strong><span>Not an approved medical device.</span></div>
          </div>
        </div>

        <section className="section" id="platform">
          <div className="wrap">
            <p className="kicker">Platform</p>
            <h2>What OneTra does</h2>
            <p className="lede">
              An oncologist enters a de-identified adult case, optionally attaches a clinical document,
              and receives what the live system can produce: a Doctor 1 match or abstention, Doctor 2
              source labels when a match exists, and Doctor 3 grounded document analysis or SILENCE.
            </p>
            <div className="grid-2" style={{ marginTop: 36 }}>
              <article className="card">
                <h3>Present now</h3>
                <p>
                  Deterministic matching to a clinically audited corpus. Safe abstention. Source and
                  evidence labels on a match. <a href="#veda">VEDA clinical-document processing</a>.
                  Bounded document restatement or SILENCE. <a href="/login">Open the validator</a>.
                </p>
              </article>
              <article className="card">
                <h3>Not claimed</h3>
                <p>
                  OneTra does not ingest electronic health records, rank multiple treatment lines,
                  match clinical trials, learn from outcomes, or replace a treating oncologist.
                  This public validator is for synthetic or de-identified demonstration cases only.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section watermark-band" id="how-it-works">
          <div className="wrap">
            <p className="kicker">How it works</p>
            <h2>Three layers. Separate limits.</h2>
            <div className="grid-3" style={{ marginTop: 36 }}>
              <article className="card">
                <p className="kicker">01</p>
                <h3>Structured intake</h3>
                <p>Cancer type, stage or setting, line, biomarker, and numeric age — only combinations present in the live 315-rule corpus.</p>
              </article>
              <article className="card">
                <p className="kicker">02</p>
                <h3>Deterministic match</h3>
                <p>Doctor 1 evaluates the case against the audited corpus and returns one recommendation or abstains.</p>
              </article>
              <article className="card">
                <p className="kicker">03</p>
                <h3>Document or SILENCE</h3>
                <p>Optional clinical documents are processed through VEDA. Doctor 3 restates grounded findings or returns SILENCE.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section light-section" id="evidence">
          <div className="wrap">
            <p className="kicker">Evidence</p>
            <h2>Doctor 1 matching. Doctor 2 traceability.</h2>
            <div className="grid-2" style={{ marginTop: 36 }}>
              <article className="card">
                <p className="kicker">Doctor 1</p>
                <h3>Deterministic matching</h3>
                <p>
                  Evaluates structured intake against the frozen, clinically audited 315-rule corpus.
                  Outcome: one matched recommendation, or safe abstention when criteria are not met.
                </p>
              </article>
              <article className="card">
                <p className="kicker">Doctor 2</p>
                <h3>Evidence layer</h3>
                <p>
                  Surfaces the source and evidence labels attached to a Doctor 1 match. It does not
                  generate new research or search the literature independently.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="veda">
          <div className="wrap grid-2">
            <div>
              <p className="kicker">VEDA + Doctor 3</p>
              <h2>Clinical documents, grounded or silent.</h2>
              <p className="lede">
                VEDA encodes uploaded TXT, DOCX, or text-bearing PDF as de-identified clinical material.
                Doctor 3 follows extraction → encoding → bounded grounded runtime, and returns grounded
                output or SILENCE. It does not recommend treatment and does not compare serial cases over time.
              </p>
            </div>
            <article className="card">
              <h3>Safe abstention</h3>
              <p>
                Abstention is a successful safety outcome. When the case is outside live intake, the
                corpus cannot deterministically match, or a document cannot be grounded, OneTra does
                not invent an answer.
              </p>
            </article>
          </div>
        </section>

        <section className="section light-section" id="validation">
          <div className="wrap">
            <p className="kicker">Validation</p>
            <h2>A clinically audited corpus, under external review.</h2>
            <p className="lede">
              The live matcher uses a frozen, clinically audited 315-rule corpus. External oncologist
              review is underway. OneTra is validation-stage decision support for adult oncology,
              not an approved medical device and not a substitute for clinical judgment.
            </p>
            <div className="grid-3" style={{ marginTop: 36 }}>
              <article className="card">
                <h3>Adult oncology only</h3>
                <p>Numeric patient age is required. Cases under 18 are out of scope.</p>
              </article>
              <article className="card">
                <h3>De-identified cases</h3>
                <p>Synthetic or cropped documents only. No names, identifiers, or contact details.</p>
              </article>
              <article className="card">
                <h3>Traceable output</h3>
                <p>A match carries its evidence label. An abstention is stated plainly.</p>
              </article>
            </div>
            <div className="hero-actions">
              <a className="btn btn-primary" href="/dashboard">Open Validation Platform</a>
            </div>
          </div>
        </section>

        <section className="section" id="oncologists">
          <div className="wrap grid-2">
            <div>
              <p className="kicker">For oncologists</p>
              <h2>Review a live validation case.</h2>
              <p className="lede">
                Open the public validator, enter a synthetic adult oncology case, and inspect match,
                evidence, or abstention. Strategic partners and acquisition inquiries should contact
                OneTra directly.
              </p>
            </div>
            <div className="hero-actions" style={{ alignItems: "center" }}>
              <a className="btn btn-primary" href="/dashboard">Open Validation Platform</a>
              <a className="btn btn-ghost" href="mailto:hello@onetra.health">Contact OneTra</a>
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
