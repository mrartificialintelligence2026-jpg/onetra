import { useEffect } from "react";
import SiteChrome from "./SiteChrome.jsx";
import { setPageMeta } from "./pageMeta.js";

export default function Legal({ kind }) {
  const privacy = kind === "privacy";
  useEffect(() => {
    setPageMeta({
      title: privacy ? "Security and privacy — OneTra Health" : "Terms of use — OneTra Health",
      description: privacy
        ? "OneTra is a validation-stage demonstration. Do not submit patient-identifying information. Uploads are used only to return a match, evidence labels, or SILENCE."
        : "OneTra is validation-stage adult oncology decision support. Not an approved medical device. Clinician judgment required.",
      path: privacy ? "/privacy" : "/terms",
    });
  }, [privacy]);
  return (
    <SiteChrome active={privacy ? "/privacy" : "/terms"}>
      <main id="main" className="page-main legal">
        <p className="kicker">{privacy ? "Security / Privacy" : "Terms"}</p>
        <h1>{privacy ? "Security and privacy" : "Terms of use"}</h1>
        {privacy ? (
          <>
            <p>
              This public site is a validation-stage demonstration. Do not submit patient-identifying
              information. Uploaded files are processed transiently to return a match, evidence labels,
              or SILENCE. Raw documents and document text are not stored in the validation ledger.
              Structured validation records may be kept for product validation. OneTra does not use
              this site to create patient records or marketing profiles. This page does not claim
              HIPAA, GDPR, FDA, or CE compliance.
            </p>
            <p>
              Contact <a href="mailto:hello@onetra.health">hello@onetra.health</a> for privacy questions.
            </p>
          </>
        ) : (
          <>
            <p>
              OneTra is validation-stage adult oncology decision support. It is not an approved
              medical device and not a substitute for clinician judgment. Output may abstain.
              Use synthetic or de-identified cases only.
            </p>
            <p>
              The public validator is provided as-is for demonstration and external review.
              Contact <a href="mailto:hello@onetra.health">hello@onetra.health</a> for partnership terms.
            </p>
          </>
        )}
      </main>
    </SiteChrome>
  );
}
