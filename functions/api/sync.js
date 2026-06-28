// /api/sync   (PAID — Master Profile cloud sync, enforced by active pass)
//   GET  -> { master } | { master: null }
//   PUT/POST { master } -> { ok: true }
//
// Returns 401 when not signed in, 402 when signed in without an active pass
// (so the client can show the upsell). This is a NEW capability — local-only
// editing remains fully free.
import { json, readJson, kv, accountFromSession, passActive } from "./_shared.js";

const MAX_BYTES = 256 * 1024; // generous cap for a Master Profile JSON blob

async function requirePaidAccount(env, request) {
  const account = await accountFromSession(env, request);
  if (!account) return { error: json({ error: "not_signed_in" }, 401) };
  if (!passActive(account)) return { error: json({ error: "pass_required" }, 402) };
  return { account };
}

export async function onRequestGet({ request, env }) {
  const store = kv(env);
  if (!store) return json({ error: "not_configured", configured: false }, 503);
  const { account, error } = await requirePaidAccount(env, request);
  if (error) return error;
  const master = await store.get(`master:${account.email}`);
  return json({ master: master ? JSON.parse(master) : null });
}

async function handlePut({ request, env }) {
  const store = kv(env);
  if (!store) return json({ error: "not_configured", configured: false }, 503);
  const { account, error } = await requirePaidAccount(env, request);
  if (error) return error;

  const { master } = await readJson(request);
  if (master == null || typeof master !== "object") return json({ error: "invalid_master" }, 400);
  const serialized = JSON.stringify(master);
  if (serialized.length > MAX_BYTES) return json({ error: "too_large" }, 413);

  await store.put(`master:${account.email}`, serialized);
  return json({ ok: true });
}

export const onRequestPut = handlePut;
export const onRequestPost = handlePut;
