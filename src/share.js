// ──────────────────────────────────────────────────────────────────────────
// Shareable-resume links. The whole document is LZ-compressed into the URL
// fragment (after #) — nothing is uploaded to a server (browser-first). The
// viewer at /r decodes and renders it.
// ──────────────────────────────────────────────────────────────────────────

import LZString from "lz-string";

// Legacy base64url fallback (links created before LZ compression).
function fromB64Url(s) {
  try {
    const norm = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(norm);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch { return null; }
}

export function encodeShare(payload) {
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeShare(str) {
  // Try LZ first; fall back to the old base64url scheme.
  try {
    const json = LZString.decompressFromEncodedURIComponent(str);
    if (json) return JSON.parse(json);
  } catch { /* try legacy */ }
  const legacy = fromB64Url(str);
  if (legacy) { try { return JSON.parse(legacy); } catch { /* noop */ } }
  return null;
}

export function buildShareUrl(payload) {
  const origin = (typeof window !== "undefined" && window.location && window.location.origin) || "https://applycraft.io";
  return `${origin}/r#${encodeShare(payload)}`;
}
