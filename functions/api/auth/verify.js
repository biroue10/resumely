// POST /api/auth/verify  { token }
// Exchanges a one-time magic-link token for a durable session and returns the
// public account view.
import { json, readJson, kv, token as newToken } from "../_shared.js";
import { publicAccount } from "../_shared.js";

export async function onRequestPost({ request, env }) {
  const { token: t } = await readJson(request);
  if (!t) return json({ error: "missing_token" }, 400);

  const store = kv(env);
  if (!store) return json({ error: "not_configured", configured: false }, 503);

  const raw = await store.get(`login:${t}`);
  if (!raw) return json({ error: "invalid_or_expired" }, 401);
  await store.delete(`login:${t}`); // one-time use

  const { email, consent } = JSON.parse(raw);

  // Create or load the account.
  const accKey = `account:${email}`;
  let account = JSON.parse((await store.get(accKey)) || "null");
  if (!account) {
    account = { email, activePass: false, passExpires: null, consent: !!consent, createdAt: new Date().toISOString() };
    await store.put(accKey, JSON.stringify(account));
  } else if (consent && !account.consent) {
    account.consent = true;
    await store.put(accKey, JSON.stringify(account));
  }

  // Durable session (30 days).
  const session = newToken(32);
  await store.put(`session:${session}`, email, { expirationTtl: 60 * 60 * 24 * 30 });

  return json({ ok: true, session, account: publicAccount(account) });
}
