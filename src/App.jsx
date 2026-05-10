import { useState, useEffect } from "react";

export default function App() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#fff", color: "#0f1c2e" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }

        :root {
          --navy:   #0a2463;
          --blue:   #1e5dba;
          --sky:    #3a87d4;
          --lt:     #e8f0fb;
          --white:  #ffffff;
          --off:    #f5f8ff;
          --text:   #0f1c2e;
          --muted:  #556070;
          --border: #d0dcea;
        }

        /* NAV */
        .nav {
          position: fixed; top: 0; inset-inline: 0; z-index: 200; height: 68px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 56px; transition: all 0.3s;
        }
        .nav.top    { background: rgba(8,20,60,0.3); backdrop-filter: blur(8px); border-bottom: 1px solid rgba(255,255,255,0.1); }
        .nav.pinned { background: #fff; border-bottom: 2px solid var(--navy); box-shadow: 0 2px 20px rgba(0,0,0,0.07); }
        .logo { font-family: 'DM Serif Display', serif; font-size: 21px; color: #fff; text-decoration: none; }
        .logo sup { font-family:'Inter',sans-serif; font-size:9px; font-weight:700; letter-spacing:.1em; vertical-align:super; margin-left:3px; opacity:.7; }
        .nav.pinned .logo { color: var(--navy); }
        .links { display: flex; gap: 32px; list-style: none; }
        .links a { font-size: 13px; font-weight: 500; color: rgba(255,255,255,.85); text-decoration: none; transition: color .2s; }
        .nav.pinned .links a { color: var(--text); }
        .links a:hover { color: var(--sky); }
        .nav.pinned .links a:hover { color: var(--blue); }
        .cta-nav {
          background: #fff; color: var(--navy); border: none; border-radius: 4px;
          font-size: 13px; font-weight: 700; letter-spacing:.04em;
          padding: 10px 24px; cursor: pointer; transition: all .2s;
        }
        .nav.pinned .cta-nav { background: var(--navy); color: #fff; }
        .cta-nav:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(10,36,99,.25); }

        /* HERO */
        .hero {
          position: relative; min-height: 100vh;
          display: flex; align-items: center; overflow: hidden;
        }
        .hero-bg {
          position: absolute; inset: 0;
          background-image: url('https://images.unsplash.com/photo-1576671081837-49000212a370?w=1920&q=85&auto=format&fit=crop');
          background-size: cover; background-position: center 20%;
        }
        .hero-grad {
          position: absolute; inset: 0;
          background: linear-gradient(105deg, rgba(6,18,58,.92) 0%, rgba(14,42,110,.78) 55%, rgba(30,93,186,.35) 100%);
        }
        .hero-body {
          position: relative; z-index: 2; padding: 0 80px; max-width: 860px;
          animation: up .9s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes up { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:none} }
        .pill {
          display: inline-flex; align-items: center; gap: 8px;
          border: 1px solid rgba(255,255,255,.25); border-radius: 100px;
          padding: 6px 16px; margin-bottom: 30px;
          font-size: 11px; font-weight: 600; letter-spacing:.15em; text-transform:uppercase; color:#a8c8f0;
        }
        .pill-dot { width:7px; height:7px; border-radius:50%; background:#4ab3ff; animation:pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
        .hero-h1 {
          font-family:'DM Serif Display',serif;
          font-size:clamp(40px,5.2vw,72px); line-height:1.08;
          color:#fff; margin-bottom:10px; letter-spacing:-.5px;
        }
        .hero-h1 em { font-style:italic; color:#7dc4ff; }
        .hero-tag { font-size:18px; font-weight:600; color:rgba(255,255,255,.75); margin-bottom:22px; }
        .hero-p { font-size:16px; font-weight:300; color:rgba(255,255,255,.68); line-height:1.8; max-width:520px; margin-bottom:46px; }
        .hero-btns { display:flex; gap:14px; flex-wrap:wrap; }
        .btn-solid {
          background:#fff; color:var(--navy); border:none; border-radius:4px;
          font-size:14px; font-weight:700; letter-spacing:.04em;
          padding:15px 34px; cursor:pointer; transition:all .2s;
        }
        .btn-solid:hover { background:#ddeeff; transform:translateY(-2px); box-shadow:0 10px 30px rgba(0,0,0,.2); }
        .btn-ghost {
          background:transparent; color:#fff; border-radius:4px;
          border:1.5px solid rgba(255,255,255,.4);
          font-size:14px; font-weight:500; letter-spacing:.04em;
          padding:15px 34px; cursor:pointer; transition:all .2s;
        }
        .btn-ghost:hover { border-color:#fff; background:rgba(255,255,255,.08); }

        /* STATS */
        .stats { background:var(--navy); display:flex; flex-wrap:wrap; border-bottom:3px solid var(--sky); }
        .stat { flex:1; min-width:160px; padding:28px 36px; border-right:1px solid rgba(255,255,255,.1); text-align:center; }
        .stat:last-child { border-right:none; }
        .stat-n { font-family:'DM Serif Display',serif; font-size:32px; color:#fff; }
        .stat-l { font-size:11px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.45); margin-top:4px; }

        /* LAYOUT */
        .wrap { max-width:1160px; margin:0 auto; padding:0 48px; }
        .sec  { padding:96px 0; }
        .ey   { font-size:11px; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:var(--blue); margin-bottom:12px; }
        .sh2  { font-family:'DM Serif Display',serif; font-size:clamp(30px,3.4vw,46px); color:var(--navy); line-height:1.15; margin-bottom:16px; }
        .sh2 em { font-style:italic; }
        .sp   { font-size:15px; color:var(--muted); line-height:1.8; max-width:560px; }

        /* MOCKUP */
        .mockup-wrap { margin-top:60px; border-radius:12px; overflow:hidden; box-shadow:0 40px 100px rgba(10,36,99,.2); border:1px solid var(--border); }
        .mockup-bar  { background:var(--navy); padding:12px 20px; display:flex; align-items:center; gap:8px; }
        .dot { width:11px; height:11px; border-radius:50%; }
        .mockup-screen { background:#f0f5ff; padding:32px; display:grid; grid-template-columns:260px 1fr; gap:20px; min-height:340px; }
        .mock-sidebar { background:var(--navy); border-radius:8px; padding:24px 20px; display:flex; flex-direction:column; gap:14px; }
        .mock-patient { background:rgba(255,255,255,.12); border-radius:6px; padding:14px 16px; }
        .mock-pt-name { font-size:13px; font-weight:700; color:#fff; }
        .mock-pt-sub  { font-size:11px; color:rgba(255,255,255,.5); margin-top:3px; }
        .mock-badge   { display:inline-block; background:#1e5dba; color:#fff; font-size:9px; font-weight:700; letter-spacing:.1em; padding:3px 8px; border-radius:20px; margin-top:8px; text-transform:uppercase; }
        .mock-ni { height:32px; border-radius:4px; background:rgba(255,255,255,.07); }
        .mock-ni.active { background:rgba(255,255,255,.2); }
        .mock-main { display:flex; flex-direction:column; gap:16px; }
        .mock-hdr { font-family:'DM Serif Display',serif; font-size:18px; color:var(--navy); }
        .recs { display:flex; flex-direction:column; gap:12px; }
        .rc { background:#fff; border-radius:6px; padding:16px 20px; border-left:4px solid var(--blue); box-shadow:0 2px 8px rgba(0,0,0,.06); display:flex; justify-content:space-between; align-items:flex-start; }
        .rc.r2 { border-left-color:var(--sky); opacity:.9; }
        .rc.r3 { border-left-color:#8fb8e8; opacity:.75; }
        .rc-line { font-size:10px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--blue); margin-bottom:4px; }
        .rc-drug { font-size:14px; font-weight:700; color:var(--navy); }
        .rc-sub  { font-size:11px; color:var(--muted); margin-top:3px; }
        .rc-ev   { background:#e8f0fb; color:var(--navy); font-size:10px; font-weight:700; padding:4px 10px; border-radius:20px; white-space:nowrap; }
        .rc-cite { font-size:10px; color:var(--muted); margin-top:4px; }

        /* STEPS */
        .steps { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--border); border:1px solid var(--border); border-radius:8px; overflow:hidden; margin-top:56px; }
        .step { background:#fff; padding:40px 30px; transition:background .2s; }
        .step:hover { background:var(--off); }
        .step-n { font-family:'DM Serif Display',serif; font-size:44px; color:var(--lt); line-height:1; margin-bottom:18px; }
        .step-bar { width:28px; height:3px; background:var(--navy); border-radius:2px; margin-bottom:14px; }
        .step-t { font-size:15px; font-weight:700; color:var(--navy); margin-bottom:10px; }
        .step-d { font-size:13px; color:var(--muted); line-height:1.7; }

        /* SPLIT */
        .split { display:grid; grid-template-columns:1fr 1fr; }
        .split-img {
          background-image:url('https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=900&q=80&auto=format&fit=crop');
          background-size:cover; background-position:center; min-height:500px;
        }
        .split-body { padding:80px 64px; display:flex; flex-direction:column; justify-content:center; background:var(--off); }
        .cl { list-style:none; margin-top:28px; display:flex; flex-direction:column; gap:18px; }
        .cl li { font-size:14px; color:var(--muted); display:flex; gap:12px; align-items:flex-start; line-height:1.65; }
        .ck { width:20px; height:20px; border-radius:50%; background:var(--navy); color:#fff; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:900; flex-shrink:0; margin-top:1px; }

        /* FEATURES */
        .fg2 { display:grid; grid-template-columns:repeat(3,1fr); gap:28px; margin-top:56px; }
        .fc { padding:36px 28px; border:1px solid var(--border); border-radius:8px; border-top:4px solid var(--navy); transition:all .2s; }
        .fc:hover { box-shadow:0 16px 48px rgba(10,36,99,.12); transform:translateY(-4px); }
        .fc-i { font-size:28px; margin-bottom:16px; }
        .fc-t { font-size:15px; font-weight:700; color:var(--navy); margin-bottom:10px; }
        .fc-d { font-size:13px; color:var(--muted); line-height:1.7; }

        /* QUOTE */
        .qband { background:var(--navy); padding:80px 48px; text-align:center; }
        .qmark { font-family:'DM Serif Display',serif; font-size:80px; color:rgba(255,255,255,.1); line-height:.6; margin-bottom:24px; }
        .qtext { font-family:'DM Serif Display',serif; font-size:clamp(22px,3vw,36px); color:#fff; max-width:780px; margin:0 auto; line-height:1.4; }
        .qsub  { font-size:13px; color:rgba(255,255,255,.4); margin-top:28px; font-weight:500; letter-spacing:.06em; text-transform:uppercase; }

        /* CTA */
        .cta-band { background:linear-gradient(120deg,var(--blue) 0%,var(--navy) 100%); padding:88px 80px; display:flex; align-items:center; justify-content:space-between; gap:48px; flex-wrap:wrap; }
        .cta-band h2 { font-family:'DM Serif Display',serif; font-size:38px; color:#fff; max-width:500px; }
        .cta-band p  { font-size:15px; color:rgba(255,255,255,.65); margin-top:10px; line-height:1.7; max-width:460px; }

        /* FOOTER */
        .footer { background:#060e20; padding:64px 48px 36px; }
        .footer-g { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:48px; padding-bottom:48px; border-bottom:1px solid rgba(255,255,255,.07); }
        .fl { font-family:'DM Serif Display',serif; font-size:20px; color:#fff; margin-bottom:12px; }
        .ft { font-size:13px; color:rgba(255,255,255,.35); line-height:1.7; max-width:200px; }
        .footer h4 { font-size:10px; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:rgba(255,255,255,.5); margin-bottom:18px; }
        .footer ul { list-style:none; display:flex; flex-direction:column; gap:12px; }
        .footer a { font-size:13px; color:rgba(255,255,255,.35); text-decoration:none; transition:color .2s; }
        .footer a:hover { color:var(--sky); }
        .footer-b { display:flex; justify-content:space-between; padding-top:28px; flex-wrap:wrap; gap:12px; }
        .footer-b span, .footer-b a { font-size:11px; color:rgba(255,255,255,.2); }

        /* RESPONSIVE */
        @media(max-width:960px){
          .nav{padding:0 24px;} .links{display:none;}
          .hero-body{padding:0 28px;}
          .mockup-screen{grid-template-columns:1fr;}
          .mock-sidebar{display:none;}
          .steps{grid-template-columns:1fr 1fr;}
          .split{grid-template-columns:1fr;}
          .split-img{min-height:260px;}
          .split-body{padding:48px 28px;}
          .fg2{grid-template-columns:1fr 1fr;}
          .footer-g{grid-template-columns:1fr 1fr;}
          .wrap{padding:0 24px;}
          .cta-band{flex-direction:column;padding:64px 28px;}
        }
        @media(max-width:600px){
          .steps,.fg2,.footer-g{grid-template-columns:1fr;}
        }
      `}</style>

      {/* NAV */}
      <nav className={`nav ${scrolled?"pinned":"top"}`}>
        <a href="#" className="logo">OneTra Health<sup>™</sup></a>
        <ul className="links">
          {["Platform","For Oncologists","Evidence","Pricing"].map(l=>(
            <li key={l}><a href="#">{l}</a></li>
          ))}
        </ul>
        <button className="cta-nav" onClick={()=>window.location.href="mailto:hello@onetra.health"}>
          Request Access
        </button>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg"/>
        <div className="hero-grad"/>
        <div className="hero-body">
          <div className="pill"><span className="pill-dot"/>Oncology Decision Intelligence</div>
          <h1 className="hero-h1">Every oncologist's<br/><em>most trusted colleague.</em></h1>
          <p className="hero-tag">Individualized treatment guidance. Always evidence-first.</p>
          <p className="hero-p">
            OneTra analyzes your patient's molecular profile, biomarkers, and disease stage against
            current NCCN guidelines and 40+ daily PubMed updates — and surfaces ranked, cited
            treatment options directly inside your workflow.
          </p>
          <div className="hero-btns">
            <button className="btn-solid" onClick={()=>window.location.href="mailto:hello@onetra.health"}>Request Demo</button>
            <button className="btn-ghost" onClick={()=>go("platform")}>See the Platform</button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats">
        {[
          {n:"40+",   l:"PubMed Papers Daily"},
          {n:"12 min",l:"Case Review Time"},
          {n:"FHIR",  l:"Epic & Cerner Ready"},
          {n:"NCCN",  l:"Guideline Aligned"},
          {n:"3-Line",l:"Ranked Recommendations"},
        ].map(s=>(
          <div className="stat" key={s.l}>
            <div className="stat-n">{s.n}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      {/* PLATFORM MOCKUP */}
      <section className="sec" id="platform">
        <div className="wrap">
          <div className="ey">The Platform</div>
          <h2 className="sh2">Ranked recommendations.<br/><em>Cited. Matched. Instant.</em></h2>
          <p className="sp">No more tab-switching or manual guideline lookups. OneTra gives every oncologist individualized treatment guidance the moment a patient case is opened.</p>
          <div className="mockup-wrap">
            <div className="mockup-bar">
              <div className="dot" style={{background:"#ff5f57"}}/>
              <div className="dot" style={{background:"#febc2e"}}/>
              <div className="dot" style={{background:"#28c840"}}/>
              <span style={{marginLeft:16,fontSize:11,color:"rgba(255,255,255,.4)",fontWeight:600}}>OneTra Health — Patient View</span>
            </div>
            <div className="mockup-screen">
              <div className="mock-sidebar">
                <div className="mock-patient">
                  <div className="mock-pt-name">Sarah K., 54F</div>
                  <div className="mock-pt-sub">Stage IIIB NSCLC · EGFR+</div>
                  <div className="mock-badge">Active Case</div>
                </div>
                {[0,1,2,3].map(i=><div key={i} className={`mock-ni${i===0?" active":""}`}/>)}
              </div>
              <div className="mock-main">
                <div className="mock-hdr">Individualized Treatment Recommendations</div>
                <div className="recs">
                  <div className="rc">
                    <div>
                      <div className="rc-line">1st Line</div>
                      <div className="rc-drug">Osimertinib (Tagrisso) 80mg QD</div>
                      <div className="rc-sub">EGFR exon 19 del · NCCN Category 1</div>
                      <div className="rc-cite">📄 FLAURA Trial · PubMed 29151359 · ClinicalTrials NCT02296125</div>
                    </div>
                    <div className="rc-ev">Level 1A</div>
                  </div>
                  <div className="rc r2">
                    <div>
                      <div className="rc-line" style={{color:"var(--sky)"}}>2nd Line</div>
                      <div className="rc-drug">Erlotinib + Bevacizumab</div>
                      <div className="rc-sub">If Osimertinib contraindicated · NCCN Category 2A</div>
                    </div>
                    <div className="rc-ev">Level 2A</div>
                  </div>
                  <div className="rc r3">
                    <div>
                      <div className="rc-line" style={{color:"#8fb8e8"}}>Trial Match</div>
                      <div className="rc-drug">NCT05123456 — MARIPOSA-2</div>
                      <div className="rc-sub">Amivantamab + Lazertinib · Recruiting · 2 sites near patient</div>
                    </div>
                    <div className="rc-ev">Eligible</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="sec" style={{background:"var(--off)"}}>
        <div className="wrap">
          <div className="ey">How It Works</div>
          <h2 className="sh2">From patient data to<br/><em>ranked guidance — in seconds.</em></h2>
          <p className="sp">OneTra integrates with your EHR and works in the background, so when you open a case, the intelligence is already there.</p>
          <div className="steps">
            {[
              {n:"01",t:"Auto-Ingest via FHIR",d:"Patient data flows from Epic or Cerner automatically. No copy-paste, no manual entry. Labs, pathology, biomarkers, history — all structured."},
              {n:"02",t:"Molecular + Clinical Analysis",d:"OneTra maps the patient's NGS profile, PD-L1, TMB, ctDNA, and disease stage against the latest clinical evidence and NCCN guidelines."},
              {n:"03",t:"Ranked Recommendations",d:"First, second, and third-line options ranked with evidence levels, PubMed citations, and matched clinical trials — all in one screen."},
              {n:"04",t:"Safety & Gap Alerts",d:"Missing biomarkers, drug interactions, and protocol deviations flagged before you finalize — so nothing critical is ever missed."},
            ].map(s=>(
              <div className="step" key={s.n}>
                <div className="step-n">{s.n}</div>
                <div className="step-bar"/>
                <div className="step-t">{s.t}</div>
                <div className="step-d">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PHOTO SPLIT */}
      <div className="split">
        <div className="split-img"/>
        <div className="split-body">
          <div className="ey">For Oncologists</div>
          <h2 className="sh2">The must-have tool<br/><em>for every tumor board.</em></h2>
          <p className="sp">Designed by oncology workflows, for oncology workflows. OneTra doesn't replace your judgment — it backs every decision with the best available evidence.</p>
          <ul className="cl">
            {[
              "Individualized guidance matched to each patient's exact molecular profile",
              "40+ PubMed papers analyzed daily — always working from current evidence",
              "Clinical trial matches surfaced automatically — no separate search needed",
              "Diagnostic gap analysis flags incomplete workups before you decide",
              "Works inside Epic and Cerner — zero new login, zero workflow change",
            ].map(t=>(
              <li key={t}><div className="ck">✓</div><span>{t}</span></li>
            ))}
          </ul>
        </div>
      </div>

      {/* FEATURES */}
      <section className="sec" id="evidence">
        <div className="wrap">
          <div className="ey">Clinical Intelligence</div>
          <h2 className="sh2">Built on evidence.<br/><em>Not assumptions.</em></h2>
          <p className="sp">Every recommendation is transparent, auditable, and cited. Oncologists see exactly why each option was ranked — and act with confidence.</p>
          <div className="fg2">
            {[
              {i:"🧬",t:"Biomarker Intelligence",d:"NGS, PD-L1, TMB, ctDNA, and liquid biopsy data integrated into every recommendation — matched to the patient's exact molecular profile."},
              {i:"📋",t:"NCCN Guideline Alignment",d:"Every recommendation cross-referenced against current NCCN guidelines. Deviations are flagged, explained, and logged with an audit trail."},
              {i:"🔬",t:"Diagnostic Gap Analysis",d:"If critical data is missing, OneTra locks the recommendation and prompts for the required test — preventing incomplete decision-making."},
              {i:"🧪",t:"Clinical Trial Matching",d:"Active trials on ClinicalTrials.gov automatically matched to cancer type, stage, and biomarker profile — no separate search needed."},
              {i:"⚖️",t:"Bias Mitigation Engine",d:"Protocol deviations are logged with an audit trail. OneTra challenges shortcuts and promotes evidence-based, equitable care."},
              {i:"📈",t:"Outcomes Data Flywheel",d:"De-identified outcomes feed back into the system — continuously improving recommendations with real-world clinical performance data."},
            ].map(f=>(
              <div className="fc" key={f.t}>
                <div className="fc-i">{f.i}</div>
                <div className="fc-t">{f.t}</div>
                <div className="fc-d">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <div className="qband">
        <div className="qmark">"</div>
        <p className="qtext">Oncology decisions shouldn't depend on how recently you read a paper. Every patient deserves individualized guidance built on today's best evidence — not last year's memory.</p>
        <p className="qsub">OneTra Health · Clinical Intelligence System for Oncology</p>
      </div>

      {/* CTA */}
      <div className="cta-band">
        <div>
          <h2>Ready to see OneTra in action?</h2>
          <p>We're onboarding early oncology partners. Request a demo and we'll walk through a live case together.</p>
        </div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
          <button className="btn-solid" onClick={()=>window.location.href="mailto:hello@onetra.health"}>Request Demo</button>
          <button style={{padding:"15px 34px",background:"transparent",color:"#fff",border:"1.5px solid rgba(255,255,255,.4)",borderRadius:4,fontSize:14,fontWeight:500,cursor:"pointer"}} onClick={()=>window.location.href="mailto:hello@onetra.health"}>Contact Us</button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-g">
          <div>
            <div className="fl">OneTra Health</div>
            <div className="ft">Clinical intelligence infrastructure for oncology. Built for the precision medicine era.</div>
          </div>
          {[
            {h:"Platform",       ls:["Product Overview","FHIR Integration","NCCN Alignment","Trial Matching"]},
            {h:"For Oncologists",ls:["Epic Integration","How It Works","Case Studies","Pricing"]},
            {h:"Company",        ls:["About","Research","Contact","hello@onetra.health"]},
          ].map(c=>(
            <div key={c.h}>
              <h4>{c.h}</h4>
              <ul>{c.ls.map(l=><li key={l}><a href="#">{l}</a></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="footer-b">
          <span>© 2026 OneTra Health. All rights reserved.</span>
          <div style={{display:"flex",gap:20}}>
            {["Privacy Policy","Terms of Use","Security"].map(l=><a key={l} href="#">{l}</a>)}
          </div>
        </div>
      </footer>
    </div>
  );
}
