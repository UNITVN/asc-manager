import { generateToken } from "./auth.js";

export async function ascFetch(account, path, options = {}) {
  const token = generateToken(account);
  const url = `https://api.appstoreconnect.apple.com${path}`;
  const headers = { Authorization: `Bearer ${token}` };
  const fetchOptions = { headers };

  if (options.method) fetchOptions.method = options.method;
  if (options.body) {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    const body = await res.text();
    if (options.method && options.method !== "GET") {
      console.error(`[asc] ${options.method} ${path} -> ${res.status}: ${body}`);
    }
    let detail = `ASC API ${res.status}: ${body}`;
    try {
      const parsed = JSON.parse(body);
      if (parsed.errors?.[0]?.detail) {
        detail = parsed.errors[0].detail;
      }
      const associatedErrors =
        parsed.errors?.[0]?.associated_errors
        ?? parsed.errors?.[0]?.meta?.associatedErrors;
      if (associatedErrors) {
        const details = Object.values(associatedErrors)
          .flat()
          .map(e => e.detail || e.title)
          .filter(Boolean);
        if (details.length > 0) {
          detail += ": " + details.join("; ");
        }
      }
    } catch {}
    const error = new Error(detail);
    error.status = res.status;
    throw error;
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return null;
  }
  return res.json();
}
