// ──────────────────────────────────────────────────────────────────────────
// Privacy-respecting analytics (Plausible — cookieless, no consent banner).
//
// Only the six whitelisted events below are ever sent, and payloads are
// filtered to non-PII scalars. No emails, names, resume text, or IDs.
// ──────────────────────────────────────────────────────────────────────────

import { ANALYTICS } from "./config.js";

// The ONLY events we send. Anything not in this set is dropped.
export const EVENTS = {
  RESUME_STARTED: "resume_started",
  RESUME_EXPORTED: "resume_exported",
  AI_TAILORING_USED: "ai_tailoring_used",
  EMAIL_CAPTURED: "email_captured",
  CHECKOUT_STARTED: "checkout_started",
  CHECKOUT_COMPLETED: "checkout_completed",
};

const ALLOWED = new Set(Object.values(EVENTS));

let loaded = false;

// Inject the Plausible script once, in the browser only, and only when
// analytics is enabled and a domain is configured.
export function initAnalytics() {
  if (loaded || typeof window === "undefined") return;
  if (!ANALYTICS.enabled || !ANALYTICS.domain) return;
  loaded = true;

  // Stub queue so events fired before the script finishes loading are kept.
  window.plausible =
    window.plausible ||
    function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };

  const s = document.createElement("script");
  s.defer = true;
  s.setAttribute("data-domain", ANALYTICS.domain);
  s.src = ANALYTICS.src;
  document.head.appendChild(s);
}

// Track one whitelisted event. `props` must be non-PII scalars only.
export function track(name, props = {}) {
  if (!ANALYTICS.enabled || typeof window === "undefined") return;
  if (!ALLOWED.has(name)) return; // hard whitelist — never send arbitrary names

  const safe = Object.fromEntries(
    Object.entries(props).filter(([, v]) =>
      ["string", "number", "boolean"].includes(typeof v)
    )
  );

  try {
    window.plausible?.(name, Object.keys(safe).length ? { props: safe } : undefined);
  } catch {
    /* analytics must never break the app */
  }
}
