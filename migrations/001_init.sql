CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL DEFAULT '',
  display_name TEXT,
  reviewer_type TEXT CHECK (reviewer_type IN ('oncologist', 'other_physician', 'researcher', 'other_reviewer')),
  specialty TEXT,
  institution TEXT,
  country TEXT,
  reviewer_verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (reviewer_verification_status IN ('unverified', 'manually_verified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consent_version TEXT,
  consent_at TIMESTAMPTZ,
  profile_completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS validation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES reviewers(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  app_version TEXT,
  backend_version TEXT,
  corpus_identifier TEXT
);

CREATE TABLE IF NOT EXISTS validation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES validation_sessions(id),
  cancer_type TEXT,
  stage TEXT,
  line_of_therapy TEXT,
  biomarkers JSONB NOT NULL DEFAULT '[]'::jsonb,
  ecog TEXT,
  age INTEGER,
  histology TEXT,
  prior_therapy JSONB NOT NULL DEFAULT '[]'::jsonb,
  extra_predicates JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES validation_cases(id),
  session_id UUID NOT NULL REFERENCES validation_sessions(id),
  reviewer_id UUID NOT NULL REFERENCES reviewers(id),
  d1_status TEXT NOT NULL CHECK (d1_status IN ('MATCH', 'ABSTAIN', 'ERROR')),
  d1_rule_id TEXT,
  matched_regimen TEXT,
  reasons TEXT,
  source_identifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  d2_evidence_identifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  d3_status TEXT,
  d3_silence_status TEXT,
  runtime_state TEXT,
  error_state TEXT,
  response_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latency_ms INTEGER,
  app_version TEXT,
  backend_version TEXT,
  corpus_identifier TEXT,
  document_meta JSONB
);

CREATE TABLE IF NOT EXISTS reviewer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES validation_runs(id),
  reviewer_id UUID NOT NULL REFERENCES reviewers(id),
  clinically_correct TEXT CHECK (clinically_correct IN ('yes', 'partially', 'no', 'unable_to_judge')),
  recommendation_usefulness SMALLINT CHECK (recommendation_usefulness BETWEEN 1 AND 5),
  evidence_usefulness SMALLINT CHECK (evidence_usefulness BETWEEN 1 AND 5),
  abstention_appropriate TEXT CHECK (abstention_appropriate IN ('yes', 'no', 'not_applicable')),
  missing_clinical_factor TEXT,
  clinical_error_category TEXT,
  comments TEXT,
  requires_correction_before_clinical_use BOOLEAN,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analysis_rate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES reviewers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviewers_email ON reviewers (email);
CREATE INDEX IF NOT EXISTS idx_sessions_reviewer ON validation_sessions (reviewer_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_session ON validation_cases (session_id, request_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_reviewer ON validation_runs (reviewer_id, response_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_status ON validation_runs (d1_status);
CREATE INDEX IF NOT EXISTS idx_runs_case ON validation_runs (case_id, response_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_run ON reviewer_feedback (run_id);
CREATE INDEX IF NOT EXISTS idx_rate_reviewer_created ON analysis_rate_events (reviewer_id, created_at DESC);

INSERT INTO schema_migrations (id) VALUES ('001_init')
ON CONFLICT (id) DO NOTHING;
