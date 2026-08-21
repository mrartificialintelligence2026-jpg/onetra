from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from veda_codebook import GENE_CODE_TO_NAME, VARIANT_CODE_TO_NAME, ZYGOSITY_CODE_TO_NAME, AGE_BRACKET_TO_LABEL, GENDER_CODE_TO_NAME, PERFORMANCE_STATUS_LABEL, PRIOR_TREATMENT_CODE_TO_NAME
from doctor1 import call_doctor1
import doctor2 as _doctor2
from doctor2 import call_doctor2, get_rule_corpus_status, match_rules
from clinical_api import IntakeRequest, build_glyphs_from_intake, to_sanitized_response
from doctor3_upload_runtime.api import router as doctor3_router

load_dotenv()

app = FastAPI(title="VEDA-RT Alpha")
app.include_router(doctor3_router)


@app.on_event("startup")
async def _load_doctrine():
    source = os.environ.get("DOCTRINE_SOURCE", "LOCAL").upper()
    if source == "AZURE":
        from doctrine.storage.loader import load_rules_from_azure
        cache_path = load_rules_from_azure()
        _doctor2.V11_RULES_PATH = cache_path
        _doctor2._RULE_CORPUS_CACHE = None
        corpus = get_rule_corpus_status()
        print(
            f"[DOCTRINE] source=AZURE path={corpus['path']} "
            f"active_rules={corpus['active_count']} sha256={corpus['sha256']}"
        )
        print(f"[DOCTRINE] source=AZURE — rules loaded from Azure, cached at {cache_path}")
    else:
        corpus = get_rule_corpus_status()
        print(
            f"[DOCTRINE] source=LOCAL path={corpus['path']} "
            f"active_rules={corpus['active_count']} sha256={corpus['sha256']}"
        )
        print(f"[DOCTRINE] source=LOCAL — rules from {_doctor2.V11_RULES_PATH}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://onetra.vercel.app", "https://onetra.health", "https://www.onetra.health"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)
AUDIT_LOG = "audit_log.jsonl"

class VEDAStream(BaseModel):
    stream: str

def write_audit(entry: dict):
    with open(AUDIT_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")

def parse_header(stream: str):
    clean = stream.replace('\n', '|').replace('\r', '|')
    header_match = re.search(r'VEDA1\.0\|SID:([^\|]+)\|DV:([^\s\|]+)', clean)
    if not header_match:
        return None, None, "Missing or invalid VEDA1.0 header"
    return header_match.group(1).strip(), header_match.group(2).strip(), None

def parse_glyphs(stream: str):
    glyphs = {}
    if re.search(r'(Sigma|Σ)', stream):
        m = re.search(r'(?:Sigma|Σ)\[CT:([^\]]+)\]\.\[ST:([^\]]+)\]\.\[GR:([^\]]+)\]\.\[MS:([^\]]+)\]', stream)
        if m:
            glyphs['sigma'] = {'cancer_type': m.group(1), 'stage': m.group(2), 'grade': m.group(3), 'subtype': m.group(4)}
    matches = re.findall(r'(?:Omega|Ω)\[CH:(\d+)\]\.\[GN:(\d+)\]\.\[VT:(\d+)\]\.\[ZY:([HZX])\]~?\[CF:(\d+)\]', stream)
    if matches:
        glyphs['omega'] = [{
            'chromosome': ch,
            'gene': gn,
            'gene_name': GENE_CODE_TO_NAME.get(gn, 'Unknown'),
            'variant': vt,
            'variant_name': VARIANT_CODE_TO_NAME.get(vt, 'Unknown'),
            'zygosity': zy,
            'zygosity_name': ZYGOSITY_CODE_TO_NAME.get(zy, 'Unknown'),
            'confidence': int(cf),
        } for ch, gn, vt, zy, cf in matches]
    if re.search(r'(Lambda|Λ)', stream):
        m = re.search(r'(?:Lambda|Λ)\[GB:([^\]]+)\]\.\[PI:([^\]]+)\]\.\[VR:([^\]]+)\]\.\[LT:([^\]]+)\]', stream)
        if m:
            glyphs['lambda'] = {'guideline': m.group(1), 'protocol': m.group(2), 'version': m.group(3), 'line': m.group(4)}
    m = re.search(r'\[AG:([^\]]+)\]\.\[GD:([^\]]+)\]', stream)
    if m:
        ag, gd = m.group(1), m.group(2)
        glyphs['demographics'] = {
            'age_bracket': ag,
            'age_label': AGE_BRACKET_TO_LABEL.get(ag, 'Unknown'),
            'gender_code': gd,
            'gender': GENDER_CODE_TO_NAME.get(gd, 'Unknown'),
        }
    m = re.search(r'\[PS:([^\]]+)\]', stream)
    if m:
        ps = m.group(1)
        if 'demographics' in glyphs:
            glyphs['demographics']['performance_status_code'] = ps
            glyphs['demographics']['performance_status'] = PERFORMANCE_STATUS_LABEL.get(ps, 'Unknown')
    pt_codes = re.findall(r'\[PT:([^\]]+)\]', stream)
    if pt_codes:
        glyphs['prior_treatments'] = [
            {'code': c, 'name': PRIOR_TREATMENT_CODE_TO_NAME.get(c, 'Unknown')}
            for c in pt_codes
        ]
    return glyphs

def check_triggers(glyphs: dict):
    triggers = []
    if 'omega' in glyphs and any(f['confidence'] < 80 for f in glyphs['omega']):
        triggers.append('!P3:REPEAT_BIOPSY_REQUIRED')
    return triggers

@app.post("/parse")
def parse_veda(input: VEDAStream):
    stream = input.stream
    sid, dv, error = parse_header(stream)
    if error:
        entry = {"timestamp": datetime.utcnow().isoformat(), "session_id": "UNKNOWN", "status": "REJECTED", "error": error, "triggers": []}
        write_audit(entry)
        return {"status": "REJECTED", "error": error}

    glyphs = parse_glyphs(stream)
    triggers = check_triggers(glyphs)
    status = "HALT" if any(t.startswith('!P1') for t in triggers) else "OK"

    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "session_id": sid,
        "dictionary_version": dv,
        "status": status,
        "triggers": triggers,
        "glyphs_detected": list(glyphs.keys())
    }
    write_audit(entry)

    return {
        "status": status,
        "session_id": sid,
        "dictionary_version": dv,
        "glyphs": glyphs,
        "triggers": triggers
    }

@app.post("/analyze")
def analyze(input: VEDAStream):
    stream = input.stream
    sid, dv, error = parse_header(stream)
    if error:
        entry = {"timestamp": datetime.utcnow().isoformat(), "session_id": "UNKNOWN", "status": "REJECTED", "error": error, "triggers": []}
        write_audit(entry)
        return {"status": "REJECTED", "error": error}

    glyphs = parse_glyphs(stream)
    triggers = check_triggers(glyphs)
    status = "HALT" if any(t.startswith("!P1") for t in triggers) else "OK"
    parsed = {
        "status": status,
        "session_id": sid,
        "dictionary_version": dv,
        "glyphs": glyphs,
        "triggers": triggers,
    }

    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "session_id": sid,
        "dictionary_version": dv,
        "status": status,
        "triggers": triggers,
        "glyphs_detected": list(glyphs.keys()),
        "endpoint": "/analyze",
    }
    write_audit(entry)

    matched = match_rules(parsed)
    doctor1_text = call_doctor1(parsed)
    doctor2_text = call_doctor2(parsed)

    return {
        "status": status,
        "session_id": sid,
        "parsed": parsed,
        "matched_rules": matched,
        "doctor1": doctor1_text,
        "doctor2": doctor2_text,
    }


@app.post("/api/clinical-recommendation")
def clinical_recommendation(intake: IntakeRequest):
    glyphs = build_glyphs_from_intake(intake)
    triggers = check_triggers(glyphs)
    status = "HALT" if any(t.startswith("!P1") for t in triggers) else "OK"
    matched = match_rules({"glyphs": glyphs})
    return to_sanitized_response(status, matched)


@app.get("/")
async def root():
    return {"message": "VEDA-RT Alpha - fixed parser ready"}
