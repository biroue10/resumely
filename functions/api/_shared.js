// ──────────────────────────────────────────────────────────────────────────
// Shared helpers for the optional account / sync / billing endpoints.
// Cloudflare Pages Functions. Files prefixed with "_" are not routed.
//
// Persistence uses a KV binding named AC_KV (create it in the CF dashboard and
// bind it to the Pages project — see SETUP notes in the task summary). When the
// binding or required secrets are missing, callers return a clear, safe
// "not configured" response instead of throwing, so the free app is unaffected.
//
// KV schema:
//   login:<token>    -> { email, exp }            (one-time magic-link token)
//   session:<token>  -> email                     (durable bearer session)
//   account:<email>  -> { email, activePass, passExpires, consent, createdAt }
//   master:<email>   -> <stringified Master Profile JSON>   (PAID: cloud sync)
// ──────────────────────────────────────────────────────────────────────────

export const PASS_DAYS = (env) => Number(env.PASS_DAYS || 7);

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extraHeaders },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function getBearer(request) {
  const h = request.headers.get("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

export function token(bytes = 24) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function kv(env) {
  return env.AC_KV || null; // null when the binding is not configured
}

export function validEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// Resolve the account for the request's bearer session, or null.
export async function accountFromSession(env, request) {
  const store = kv(env);
  const t = getBearer(request);
  if (!store || !t) return null;
  const email = await store.get(`session:${t}`);
  if (!email) return null;
  const raw = await store.get(`account:${email}`);
  return raw ? JSON.parse(raw) : { email };
}

export function passActive(account) {
  return !!(account?.activePass && account.passExpires && new Date(account.passExpires).getTime() > Date.now());
}

// A safe, client-facing view of the account (never leak internal fields).
export function publicAccount(account) {
  if (!account) return null;
  return {
    email: account.email,
    activePass: passActive(account),
    passExpires: passActive(account) ? account.passExpires : null,
  };
}
