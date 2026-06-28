// POST /api/auth/request-link  { email, consent, lang }
// Creates a one-time magic-link token and emails it. Optional email capture —
// this never gates the free builder.
import { json, readJson, kv, token, validEmail } from "../_shared.js";

export async function onRequestPost({ request, env }) {
  const { email, consent, lang = "en" } = await readJson(request);
  if (!validEmail(email)) return json({ error: "invalid_email" }, 400);

  const store = kv(env);
  if (!store) {
    // Backend not configured yet — tell the client cleanly; UI shows a TODO state.
    return json({ ok: false, configured: false });
  }

  const normalized = email.toLowerCase();
  const t = token();
  // 30-minute one-time login token.
  await store.put(`login:${t}`, JSON.stringify({ email: normalized, consent: !!consent }), {
    expirationTtl: 60 * 30,
  });

  const origin = env.APP_ORIGIN || new URL(request.url).origin;
  const link = `${origin}/?ac_login=${t}`;

  const sent = await sendMagicLink(env, { email: normalized, link, lang });

  // In non-production, surface the link so it can be tested without email wired.
  const devLink = (env.ENVIRONMENT || "production") !== "production" ? link : undefined;
  return json({ ok: true, configured: true, sent, devLink });
}

// Sends the magic link via Resend if RESEND_API_KEY is set; otherwise no-op.
// TODO: swap in your transactional email provider of choice.
async function sendMagicLink(env, { email, link, lang }) {
  if (!env.RESEND_API_KEY) return false; // not wired — see SETUP notes
  try {
    const subject = {
      en: "Your ApplyCraft sign-in link",
      fr: "Votre lien de connexion ApplyCraft",
      es: "Tu enlace de acceso a ApplyCraft",
      ar: "رابط تسجيل الدخول إلى ApplyCraft",
      de: "Ihr ApplyCraft-Anmeldelink",
    }[lang] || "Your ApplyCraft sign-in link";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.MAIL_FROM || "ApplyCraft <hello@applycraft.io>",
        to: email,
        subject,
        text: `Click to access your Master Profile on this device:\n\n${link}\n\nThis link expires in 30 minutes. If you didn't request it, ignore this email.`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
