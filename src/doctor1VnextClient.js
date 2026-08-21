export async function loadDoctor1VnextIntake() {
  const response = await fetch("/api/doctor1-vnext/intake-definition", { headers: { Accept: "application/json" } });
  return readJson(response);
}

export async function runDoctor1Vnext(request, token) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch("/api/doctor1-vnext/recommendation", {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });
  return readJson(response);
}

async function readJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(payload.detail)
      ? payload.detail.map((item) => item.msg).filter(Boolean).join("; ")
      : payload.detail;
    const error = new Error(detail || `Doctor 1 request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

