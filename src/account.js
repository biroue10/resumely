// ──────────────────────────────────────────────────────────────────────────
// Client-side account layer for the OPTIONAL Master Profile sync + paid pass.
//
// Design rules:
//  - Email capture is optional and a user benefit, never a gate. The free
//    builder works fully with no account.
//  - Auth is passwordless (magic link). The server emails a link back to the
//    app with ?ac_login=<token>; verify() exchanges it for a session.
//  - Cross-device SYNC and AI TAILORING are the only paid features and are
//    enforced server-side by an active-pass flag; this module just reflects it.
//
// All network calls hit same-origin /api/* (Cloudflare Pages Functions). They
// degrade gracefully (resolve to a clear "not configured" result) when the
// backend or its env vars are absent — see functions/api/* for the stubs.
// ──────────────────────────────────────────────────────────────────────────

const SESSION_KEY = "ac_session";
const ACCOUNT_KEY = "ac_account";
const CONSENT_KEY = "ac_consent_sync";

function read(key, fallback = null) {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota/availability errors */
  }
}

// ── Session + account (persisted locally so login survives refresh) ─────────

export function getSession() {
  return read(SESSION_KEY); // opaque bearer token string, or null
}

export function getAccount() {
  return read(ACCOUNT_KEY); // { email, activePass, passExpires } | null
}

export function hasActivePass() {
  const a = getAccount();
  if (!a?.activePass || !a.passExpires) return false;
  return new Date(a.passExpires).getTime() > Date.now();
}

export function getConsent() {
  return read(CONSENT_KEY); // { granted: bool, at: iso } | null
}

function setAccount(account) {
  if (account) write(ACCOUNT_KEY, account);
}

function authHeaders() {
  const s = getSession();
  return s ? { Authorization: `Bearer ${s}` } : {};
}

async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, data });
  return data;
}

// ── Magic-link auth ─────────────────────────────────────────────────────────

// Step 1: request a sign-in / save link. Records explicit consent locally and
// asks the server to email a magic link. Returns { ok, configured }.
export async function requestMagicLink(email, { consent, lang = "en" } = {}) {
  write(CONSENT_KEY, { granted: !!consent, at: new Date().toISOString() });
  return post("/api/auth/request-link", { email, consent: !!consent, lang });
}

// Step 2: called on app load if the URL carries ?ac_login=<token>. Exchanges
// the one-time token for a durable session and persists the account.
export async function verifyMagicToken(token) {
  const data = await post("/api/auth/verify", { token });
  if (data.session) write(SESSION_KEY, data.session);
  if (data.account) setAccount(data.account);
  return data;
}

// Detect + consume a magic-link token from the current URL. Returns the
// verified account (or null) and strips the token from the address bar.
export async function consumeLoginFromUrl() {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const token = url.searchParams.get("ac_login");
  if (!token) return null;
  url.searchParams.delete("ac_login");
  window.history.replaceState({}, "", url.toString());
  try {
    const data = await verifyMagicToken(token);
    return data.account || null;
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof localStorage === "undefined") return;
  [SESSION_KEY, ACCOUNT_KEY].forEach((k) => localStorage.removeItem(k));
}

// ── Master Profile cloud sync (PAID — server enforces the active pass) ──────

// Push the local Master Profile to the cloud. Throws { status: 402 } when the
// caller has no active pass so the UI can show the upsell.
export async function pushMasterProfile(master) {
  return post("/api/sync", { master });
}

// Pull the cloud Master Profile. Returns { master } or { master: null }.
export async function pullMasterProfile() {
  const res = await fetch("/api/sync", { headers: { ...authHeaders() } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, data });
  return data;
}

// Refresh the cached account (pass status) from the server.
export async function refreshAccount() {
  const s = getSession();
  if (!s) return null;
  try {
    const res = await fetch("/api/account", { headers: { ...authHeaders() } });
    if (!res.ok) return getAccount();
    const data = await res.json().catch(() => ({}));
    if (data.account) setAccount(data.account);
    return data.account || getAccount();
  } catch {
    return getAccount();
  }
}

// Delete the server-side saved data for this account (mirrors local delete).
export async function deleteSavedData() {
  const out = await post("/api/account/delete", {});
  logout();
  if (typeof localStorage !== "undefined") localStorage.removeItem(CONSENT_KEY);
  return out;
}

// ── Checkout (PAID — Lemon Squeezy hosted checkout, redirect flow) ──────────

// Ask the server to create a checkout and return its hosted URL. The caller
// then redirects. Custom data ties the order back to this account via webhook.
export async function startCheckout({ lang = "en" } = {}) {
  const data = await post("/api/checkout", { lang, returnTo: typeof window !== "undefined" ? window.location.href : "" });
  return data; // { url, configured }
}
