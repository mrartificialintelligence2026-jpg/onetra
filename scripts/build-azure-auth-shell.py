from pathlib import Path
import base64

src = Path(r"C:\OneTra\cc-sonnet5-live-wiring-2026-08-12\deploy_staging")
auth = base64.b64encode((src / "google_auth.py").read_bytes()).decode()
main = base64.b64encode((src / "main.py").read_bytes()).decode()
script = f"""#!/usr/bin/env bash
set -euo pipefail
ALLOWED=8da78521-04aa-4ef9-b62f-057f6a618822
FORBIDDEN=acfb358c-6c02-4053-bb7b-2089e2904d72
RG=onetra-live-rg
APP=onetra-veda-live
CLIENT_ID=25702905297-15ujkqchtq7un8f56776u4h6v080sqo5.apps.googleusercontent.com
ACTIVE="$(az account show --query id -o tsv)"
if [ "$ACTIVE" != "$ALLOWED" ]; then
  echo "Refusing: Cloud Shell must already be on $ALLOWED"
  exit 1
fi
if [ "$ACTIVE" = "$FORBIDDEN" ]; then
  echo "Refusing: forbidden subscription is active"
  exit 1
fi
python3 - <<'PY'
import base64, pathlib
pathlib.Path("/tmp/google_auth.py").write_bytes(base64.b64decode("{auth}"))
pathlib.Path("/tmp/main.py").write_bytes(base64.b64decode("{main}"))
print("auth files written")
PY
az webapp deploy --subscription "$ALLOWED" -g "$RG" -n "$APP" --src-path /tmp/google_auth.py --type static --target-path home/site/wwwroot/google_auth.py
az webapp deploy --subscription "$ALLOWED" -g "$RG" -n "$APP" --src-path /tmp/main.py --type static --target-path home/site/wwwroot/main.py
az webapp config appsettings set --subscription "$ALLOWED" -g "$RG" -n "$APP" --settings GOOGLE_CLIENT_ID="$CLIENT_ID" ONETRA_REQUIRE_GOOGLE_AUTH=1 ONETRA_DOCS_ENABLED=0 --output none
az webapp restart --subscription "$ALLOWED" -g "$RG" -n "$APP" --output none
echo Azure analysis API auth enabled.
"""
out = Path(r"C:\\Users\\starr\\onetra_secure_azure_once.sh")
out.write_text(script, encoding="utf-8", newline="\n")
print(f"wrote {out} ({out.stat().st_size} bytes)")
