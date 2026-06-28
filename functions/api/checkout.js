// POST /api/checkout  { lang, returnTo }
// Creates a Lemon Squeezy hosted checkout for the one-time Active Search Pass
// and returns its URL for the client to redirect to. Lemon Squeezy is the
// merchant of record (handles global VAT). Ties the order to the account via
// custom data, which the webhook reads to grant the pass.
//
// Requires (secrets): LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID,
// LEMONSQUEEZY_VARIANT_ID. Returns { configured:false } when absent.
import { json, readJson, accountFromSession } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  const account = await accountFromSession(env, request);
  if (!account) return json({ error: "not_signed_in" }, 401);

  const { LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_VARIANT_ID } = env;
  if (!LEMONSQUEEZY_API_KEY || !LEMONSQUEEZY_STORE_ID || !LEMONSQUEEZY_VARIANT_ID) {
    return json({ configured: false, error: "payments_not_configured" }, 503);
  }

  const { returnTo } = await readJson(request);
  const origin = env.APP_ORIGIN || new URL(request.url).origin;

  try {
    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LEMONSQUEEZY_API_KEY}`,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: account.email,
              // Read back by the webhook to grant the pass to this account.
              custom: { account_email: account.email },
            },
            product_options: {
              redirect_url: `${origin}/?ac_checkout=success`,
            },
          },
          relationships: {
            store: { data: { type: "stores", id: String(LEMONSQUEEZY_STORE_ID) } },
            variant: { data: { type: "variants", id: String(LEMONSQUEEZY_VARIANT_ID) } },
          },
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: "checkout_failed", detail: data?.errors || null }, 502);
    const url = data?.data?.attributes?.url;
    if (!url) return json({ error: "no_checkout_url" }, 502);
    return json({ configured: true, url, returnTo: returnTo || origin });
  } catch (e) {
    return json({ error: "checkout_exception" }, 502);
  }
}
