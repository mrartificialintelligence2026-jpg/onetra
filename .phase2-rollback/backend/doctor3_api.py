"""FastAPI router for Doctor 3 upload analysis."""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, UploadFile

from .config import MAX_UPLOAD_BYTES, SUPPORTED_EXTENSIONS
from .longitudinal.case_pipeline import analyze_case
from .longitudinal.phi_gate import sanitize_for_export, scan_object
from .nano_client import resolve_auth
from .pipeline import analyze_upload

log = logging.getLogger("doctor3_upload_runtime.api")
router = APIRouter(tags=["doctor3"])


def _phi_safe_response(response: dict) -> dict:
    """Final fail-closed gate: never return identity to the client.

    1) Scan the original response for residual identity — if present, suppress.
    2) Sanitize free-text excerpt fields from a clean response tree.
    3) Re-scan; if still dirty, suppress. Identity is never echoed.
    """
    if not isinstance(response, dict):
        response = {}
    # Hard suppress when the pre-sanitize payload already contains identity risk.
    if scan_object(response):
        log.info("doctor3_response_phi_blocked categories=%s", ",".join(scan_object(response)))
        return {
            "doctor3_status": "SILENCE",
            "case_status": "REDACTION_REVIEW_REQUIRED",
            "silence_reason": "REDACTION_REVIEW_REQUIRED",
            "triggers": [],
            "timeline": {"events": []},
            "nano_allowed": False,
            "safety_flags": ["RESPONSE_PHI_BLOCKED"],
            "limitations": [
                "Doctor 3 restates document facts only; it does not recommend treatment.",
                "Not validated for patient care.",
                "Residual identity risk detected in output; response suppressed and review required.",
            ],
            "auth": response.get("auth"),
        }
    cleaned = sanitize_for_export(response)
    if not isinstance(cleaned, dict):
        cleaned = dict(response)
    if scan_object(cleaned):
        log.info("doctor3_response_phi_blocked_post_sanitize")
        return {
            "doctor3_status": "SILENCE",
            "case_status": "REDACTION_REVIEW_REQUIRED",
            "silence_reason": "REDACTION_REVIEW_REQUIRED",
            "triggers": [],
            "timeline": {"events": []},
            "nano_allowed": False,
            "safety_flags": ["RESPONSE_PHI_BLOCKED"],
            "limitations": [
                "Doctor 3 restates document facts only; it does not recommend treatment.",
                "Not validated for patient care.",
                "Residual identity risk detected in output; response suppressed and review required.",
            ],
            "auth": response.get("auth"),
        }
    return cleaned


@router.get("/doctor3/health")
def doctor3_health() -> dict:
    auth = resolve_auth()
    return {
        "status": "ok",
        "service": "doctor3-upload-runtime",
        "supported_formats": sorted(ext.lstrip(".") for ext in SUPPORTED_EXTENSIONS),
        "max_upload_bytes": MAX_UPLOAD_BYTES,
        "auth_method": auth.get("method"),
        "managed_identity_status": auth.get("managed_identity_status"),
        "env_key_fallback_status": auth.get("env_key_fallback_status"),
        "nano_available": auth.get("available"),
        "longitudinal_case_endpoint": "/doctor3/analyze-case",
    }


@router.post("/doctor3/analyze-upload")
async def doctor3_analyze_upload(file: UploadFile = File(...)) -> dict:
    """Accept one oncology document; return SUMMARY or SILENCE with compression metrics.

    Does not recommend treatment. Does not call Doctor 1 or Doctor 2.
    """
    # Read with hard cap (+1 to detect oversize before full buffer growth in pathological cases)
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    filename = file.filename
    # Do not log filename raw if it could contain secrets; log length only + sanitized later.
    log.info(
        "doctor3_analyze_upload received bytes=%s name_len=%s",
        len(data),
        len(filename or ""),
    )
    result = analyze_upload(data, filename, use_nano=True, allow_deterministic_summary=True)
    # SILENCE is a successful safety outcome → HTTP 200
    return _phi_safe_response(result.response)


@router.post("/doctor3/analyze-case")
async def doctor3_analyze_case(files: list[UploadFile] = File(...)) -> dict:
    """Accept multiple oncology documents for one case; return longitudinal timeline/triggers.

    De-identifies before any Nano call. Does not recommend treatment.
    Does not call Doctor 1 or Doctor 2. Does not adjudicate discordance.
    """
    docs: list[tuple[bytes, str | None]] = []
    for f in files:
        data = await f.read(MAX_UPLOAD_BYTES + 1)
        docs.append((data, f.filename))
        log.info(
            "doctor3_analyze_case received bytes=%s name_len=%s",
            len(data),
            len(f.filename or ""),
        )
    result = analyze_case(docs, use_nano=True, allow_deterministic_summary=True)
    return _phi_safe_response(result.response)
