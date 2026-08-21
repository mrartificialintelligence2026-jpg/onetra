import json
import sys
from pathlib import Path

sys.path.insert(0, r"C:\OneTra\cc-sonnet5-live-wiring-2026-08-12\deploy_staging")
from clinical_api import IntakeRequest, build_glyphs_from_intake, to_sanitized_response
from doctor2 import match_rules

CORPUS = Path(r"C:\OneTra\cc-sonnet5-live-wiring-2026-08-12\deploy_staging\corpus\doctor1_frozen\11_FINAL_D1_ACTIVE_CORPUS.json")
rules = json.loads(CORPUS.read_text(encoding="utf-8"))
if isinstance(rules, dict):
    rules = rules["rules"]


def stages_of(rule):
    values = []
    def add(v):
        t = str(v or "").strip()
        if t and t not in values:
            values.append(t)
    any_of = rule.get("stage_or_disease_state_any_of") or rule.get("stage_disease_state_any_of")
    if isinstance(any_of, list):
        for item in any_of:
            add(item)
    else:
        add(any_of)
    add(rule.get("setting"))
    add(rule.get("stage"))
    add(rule.get("stage_or_disease_state"))
    return values


def bios_of(rule):
    raw = rule.get("biomarker_required") or rule.get("biomarkers_required") or rule.get("biomarker") or []
    if not isinstance(raw, list):
        raw = [raw]
    return [str(x).strip() for x in raw if str(x or "").strip() and str(x).lower() != "none"]


matches = []
for rule in rules:
    cancer = str(rule.get("cancer") or rule.get("cancer_type") or "").strip()
    line = str(rule.get("line") or rule.get("line_of_therapy") or "").strip()
    if not cancer or not line:
        continue
    stages = stages_of(rule) or ["IV"]
    bios = bios_of(rule)
    hist = rule.get("histology")
    hist = None if not hist or str(hist).lower() in {"any", "not otherwise specified", "not otherwise specified in source rule"} else str(hist)
    for stage in stages:
        intake = IntakeRequest(
            cancer_type=cancer,
            stage=stage,
            biomarkers=bios,
            ecog="1",
            line_of_therapy=line,
            prior_therapy=[],
            histology=hist,
            age=65,
        )
        glyphs = build_glyphs_from_intake(intake)
        matched = match_rules({"glyphs": glyphs})
        resp = to_sanitized_response("OK", matched)
        if resp["status"] == "OK" and resp["recommendations"]:
            matches.append({
                "id": rule.get("id") or rule.get("rule_id"),
                "cancer": cancer,
                "stage": stage,
                "line": line,
                "biomarkers": bios,
                "histology": hist,
                "treatment": resp["recommendations"][0]["treatment"],
                "evidence": resp["recommendations"][0].get("evidence_tier"),
            })
            break

uniq = []
seen = set()
for row in matches:
    if row["id"] in seen:
        continue
    seen.add(row["id"])
    uniq.append(row)

out = Path(r"C:\OneTra\onetra\tests\positive-controls.json")
out.write_text(json.dumps(uniq, indent=2), encoding="utf-8")
print("UNIQUE_MATCHES", len(uniq))
for row in uniq:
    print(f"{row['id']}\t{row['cancer']}\t{row['stage']}\t{row['line']}\t{row['biomarkers']}\t{row['treatment'][:70]}")
