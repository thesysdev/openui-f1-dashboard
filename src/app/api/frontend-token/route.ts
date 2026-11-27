import { openui } from "../../../lib/openui";
import { hasAllowedOrigin } from "../../../lib/same-origin";
import { readUserId } from "../../../lib/user-id";

export const runtime = "nodejs";

// Reuse a visitor's token until a minute before it expires; keep at most this many visitors' tokens.
const REFRESH_MARGIN_S = 60;
const MAX_CACHED = 1000;
const cache = new Map<string, { token: string; expiresAt: number }>();

async function frontendToken(userId: string, signal: AbortSignal) {
  const cached = cache.get(userId);
  if (cached && cached.expiresAt - REFRESH_MARGIN_S > Date.now() / 1000) return cached;

  // No sign-in: userId is the browser's anonymous visitor id (lib/user-id.ts). Use the signed-in
  // user's id instead when you add authentication:
  // https://www.openui.com/docs/gateway/authentication
  const { token, expires_at } = await openui.createFrontendToken({ userId }, { signal });

  const entry = { token, expiresAt: expires_at };
  cache.delete(userId);
  cache.set(userId, entry);
  if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
  return entry;
}

// Mints the short-lived frontend token that useOpenuiCloudStorage() sends with its
// Conversations API calls. Gateway scopes the token to the visitor's anonymous id and this app,
// so each browser reaches only its own threads and never sees THESYS_API_KEY.
export async function POST(request: Request) {
  if (!hasAllowedOrigin(request))
    return Response.json(
      { error: "This example only accepts requests from its local chat interface." },
      { status: 403 },
    );
  const userId = readUserId(request);
  if (!userId) return Response.json({ error: "Missing visitor id." }, { status: 401 });
  if (!process.env.THESYS_API_KEY) throw new Error("Set THESYS_API_KEY in .env.local, then restart.");

  try {
    const { token, expiresAt } = await frontendToken(userId, request.signal);
    return Response.json(
      { token, expires_at: expiresAt },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ error: "OpenUI Gateway could not create a frontend token." }, { status: 502 });
  }
}
