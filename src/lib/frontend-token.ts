import { openui } from "./openui";

// Frontend tokens: short-lived Gateway credentials scoped to one visitor and this app, for the
// browser's thread list.

// Reuse a token until a minute before it expires; keep at most this many visitors' tokens.
const REFRESH_MARGIN_S = 60;
const MAX_CACHED = 1000;
const cache = new Map<string, { token: string; expiresAt: number }>();

export async function frontendToken(userId: string, signal?: AbortSignal) {
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
