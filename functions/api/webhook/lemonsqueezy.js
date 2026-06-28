// POST /api/webhook/lemonsqueezy
// Lemon Squeezy webhook. Verifies the HMAC-SHA256 signature, then on a paid
// order grants a time-boxed Active Search Pass to the account named in the
// checkout custom data.
//
// Requires secret LEMONSQUEEZY_WEBHOOK_SECRET. Register the webhook URL
// https://applycraft.io/api/webhook/lemonsqueezy in the Lemon Squeezy
// dashboard and subscribe to the "order_created" event.
import { json, kv, PASS_DAYS } from "../_shared.js";

export async function onRequestPost({ request, env }) {
  const secret = env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return json({ error: "not_configured" }, 503);

  const raw = await request.text();
  const signature = request.headers.get("X-Signature") || "";
  const ok = await verifySignature(secret, raw, signature);
  if (!ok) return json({ error: "bad_signature" }, 401);

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "bad_payload" }, 400);
  }

  const eventName = event?.meta?.event_name;
  // Single, non-recurring purchase → grant the pass on a completed order.
  if (eventName !== "order_created") return json({ ok: true, ignored: eventName || "unknown" });

  const status = event?.data?.attributes?.status;
  if (status && status !== "paid") return json({ ok: true, ignored: `status:${status}` });

  const accountEmail =
    event?.meta?.custom_data?.account_email ||
    event?.data?.attributes?.user_email ||
    null;
  if (!accountEmail) return json({ ok: true, ignored: "no_account" });

  const store = kv(env);
  if (!store) return json({ error: "not_configured" }, 503);

  const email = String(accountEmail).toLowerCase();
  const accKey = `account:${email}`;
  const account = JSON.parse((await store.get(accKey)) || "null") || {
    email,
    consent: false,
    createdAt: new Date().toISOString(),
  };

  const expires = new Date(Date.now() + PASS_DAYS(env) * 24 * 60 * 60 * 1000).toISOString();
  account.activePass = true;
  account.passExpires = expires;
  await store.put(accKey, JSON.stringify(account));

  return json({ ok: true, granted: true });
}

// Constant-time-ish HMAC-SHA256 hex comparison via WebCrypto.
async function verifySignature(secret, body, signatureHex) {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
    if (expected.length !== signatureHex.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signatureHex.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}
