// OpenF1 OAuth2 access token (https://openf1.org/auth.html). With OPENF1_USERNAME and
// OPENF1_PASSWORD set, requests carry a Bearer token for higher rate limits and live data;
// without them the client stays on the free, unauthenticated tier. Tokens last an hour, so one
// is fetched on first use, shared by every request in the process, and replaced a few minutes
// before it expires or as soon as OpenF1 rejects it.

export const OPENF1_TOKEN_URL = "https://api.openf1.org/token";
const REFRESH_EARLY_MS = 5 * 60 * 1000;

let current: { token: string; expiresAt: number } | null = null;
let pending: Promise<string> | null = null;

function credentials() {
  const username = process.env.OPENF1_USERNAME;
  const password = process.env.OPENF1_PASSWORD;
  return username && password ? { username, password } : null;
}

async function requestToken(username: string, password: string): Promise<string> {
  const response = await fetch(OPENF1_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`OpenF1 token request failed: HTTP ${response.status}`);
  const body = (await response.json()) as { access_token?: string; expires_in?: string | number };
  if (!body.access_token) throw new Error("OpenF1 token response had no access_token");
  const expiresIn = Number(body.expires_in) || 3600;
  current = { token: body.access_token, expiresAt: Date.now() + expiresIn * 1000 };
  return current.token;
}

/** A valid access token, or null when no OpenF1 credentials are configured. */
export async function openf1Token(): Promise<string | null> {
  const creds = credentials();
  if (!creds) return null;
  if (current && Date.now() < current.expiresAt - REFRESH_EARLY_MS) return current.token;
  pending ??= requestToken(creds.username, creds.password).finally(() => {
    pending = null;
  });
  return pending;
}

/** Drops a token OpenF1 rejected, so the next call fetches a new one. */
export function invalidateOpenf1Token(token: string) {
  if (current?.token === token) current = null;
}

/** Headers for an OpenF1 request: the Bearer token when signed in. */
export async function openf1AuthHeaders(): Promise<Record<string, string>> {
  const token = await openf1Token();
  return token ? { authorization: `Bearer ${token}` } : {};
}
