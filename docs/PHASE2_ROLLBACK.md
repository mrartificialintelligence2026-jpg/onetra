# Phase 2 rollback

Recorded 2026-08-14. Secret values are not stored here.

## Frontend

- Git HEAD at start of Phase 2: `7028d6de0abe32fc4fe4055293162851be6a5dff`
- Working tree already contained the Phase 1 validator (uncommitted relative to that HEAD).
- Restore last committed tree: `git checkout 7028d6de0abe32fc4fe4055293162851be6a5dff -- .`
- Vercel project: `onetra-s-projects/onetra`
- Production alias: `https://onetra.vercel.app` and `https://onetra.health`
- Last known good production deployment before Phase 2 auth/ledger: `https://onetra-ugmr21tef-onetra-s-projects.vercel.app`
- Phase 2 Vercel production after Google/Neon: `https://onetra-1muu6balo-onetra-s-projects.vercel.app`
- Neon resource: `onetra-validation-ledger` (plan `free_v3`)
- Instant rollback: `vercel rollback` (or promote that deployment in the Vercel dashboard)

## Backend

- Runtime path: `C:\OneTra\cc-sonnet5-live-wiring-2026-08-12\deploy_staging`
- No git repository on the live-wiring tree
- Snapshots: `.phase2-rollback/backend/main.py`, `requirements.txt`, `doctor3_api.py`
- SHA-256:
  - `main.py` `D090750191BDF5B7B367A29A460E57A771D73424DF251F6AAFD299E89F2E0FE2`
  - `requirements.txt` `2604F9B80303B0540BE4C871D421CDD2526782F7AAA3D335A0B6441F8EC3CC4D`
  - `doctor3_api.py` `ADE2B4BB7C7ECC8D8FBDF0770FE0C27B478B8B3AC1014248213F38C9C2630EBC`
- Restore: copy those three files back onto `deploy_staging` (and `doctor3_upload_runtime/api.py`)
- Live app: `https://onetra-veda-live.azurewebsites.net`
- Resource lock: subscription `8da78521-04aa-4ef9-b62f-057f6a618822`, app `onetra-veda-live`
- Forbidden subscription: `acfb358c-6c02-4053-bb7b-2089e2904d72`

## Environment variable names (no values)

Frontend / Vercel:

- `VITE_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_ID`
- `DATABASE_URL`
- `ONETRA_ADMIN_EMAILS`
- `ANALYSIS_RATE_LIMIT_MAX`
- `ANALYSIS_RATE_LIMIT_WINDOW_SECONDS`
- `ONETRA_TERMS_VERSION`
- `ONETRA_APP_VERSION`
- `ONETRA_CORPUS_IDENTIFIER`

Azure:

- `GOOGLE_CLIENT_ID`
- `ONETRA_REQUIRE_GOOGLE_AUTH`
- `ONETRA_DOCS_ENABLED`
- `ANALYSIS_RATE_LIMIT_MAX`
- `ANALYSIS_RATE_LIMIT_WINDOW_SECONDS`

Vercel had no project environment variables at the start of Phase 2.

## Safety

Do not deploy Azure token enforcement until `GOOGLE_CLIENT_ID` is set, or the public validator will reject every analysis.
Do not point Azure CLI at the forbidden subscription.
