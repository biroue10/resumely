import assert from "node:assert/strict";
import fs from "node:fs";
import worker, { __securityTest } from "../worker.js";
import { encodeShare, decodeShare, normalizeSharedDocument, SHARE_ID_RE } from "../src/share.js";
import { getResumeTemplateById, getCoverTemplateById } from "../src/documents/templateRegistry.js";
import { isRtlLang } from "../src/i18n/languages.js";

function roundTrip(payload) {
  return normalizeSharedDocument(decodeShare(encodeShare(payload)));
}

function memoryKv() {
  const store = new Map();
  return {
    async get(key) {
      const item = store.get(key);
      if (!item) return null;
      if (item.expires && item.expires <= Date.now()) {
        store.delete(key);
        return null;
      }
      return item.value;
    },
    async put(key, value, options = {}) {
      const ttl = options.expirationTtl ? Date.now() + options.expirationTtl * 1000 : 0;
      store.set(key, { value, expires: ttl });
    },
    async delete(key) {
      store.delete(key);
    },
    store,
  };
}

function shareRequest(path, init = {}) {
  return new Request(`https://applycraft.io${path}`, {
    method: init.method || "GET",
    headers: {
      Origin: "https://applycraft.io",
      "Content-Type": "application/json",
      "X-Forwarded-For": init.ip || `198.51.100.${Math.floor(Math.random() * 100) + 1}`,
      ...(init.headers || {}),
    },
    body: init.body,
  });
}

async function readJson(response) {
  return JSON.parse(await response.text());
}

const arabicModernResume = {
  v: 2,
  k: "resume",
  t: "modern",
  l: "ar",
  p: "a4",
  c: { accent: "#2563eb" },
  d: {
    name: "Gladys Mouna",
    title: "Systems Administrator",
    contact: [
      "gladys.mouna@gmail.com",
      "+33 773406333",
      "https://www.linkedin.com/in/isaac-biroue",
    ],
    summary: "Experienced administrator for Microsoft 365 and Active Directory.",
    sections: [
      {
        key: "experience",
        heading: "الخبرة العملية",
        isCustom: false,
        items: ["Managed Microsoft 365, Active Directory, React, PHP and HTML systems."],
      },
      {
        key: "projects",
        heading: "مسيرتي المهنية",
        isCustom: true,
        items: ["Built bilingual documentation for support teams."],
      },
    ],
  },
};

const generatedIds = new Set(Array.from({ length: 50 }, () => __securityTest.generateShareId()));
assert.equal(generatedIds.size, 50, "share IDs should not repeat in a small sample");
for (const id of generatedIds) {
  assert.match(id, SHARE_ID_RE, "share IDs should be URL-safe and long enough");
}
assert.equal(__securityTest.SHARE_ID_RE.test("123"), false, "short IDs should be rejected");
assert.equal(__securityTest.SHARE_ID_RE.test("bad/id!!"), false, "unsafe IDs should be rejected");
assert.equal(__securityTest.validateSharePayload(arabicModernResume).value.k, "resume", "valid share payload should pass worker validation");
assert.ok(__securityTest.validateSharePayload({ ...arabicModernResume, t: "unknown" }).error, "unsupported templates should be rejected");
assert.ok(__securityTest.validateSharePayload({ ...arabicModernResume, d: { text: "x".repeat(120000) } }).error, "oversized share payloads should be rejected");

const decoded = roundTrip(arabicModernResume);
assert.equal(decoded.v, 2, "v2 payload should round-trip");
assert.equal(decoded.k, "resume", "resume kind should be preserved");
assert.equal(decoded.t, "modern", "template id should be preserved");
assert.equal(decoded.l, "ar", "Arabic document language should be preserved");
assert.equal(decoded.p, "a4", "page size should be preserved");
assert.deepEqual(decoded.c, { accent: "#2563eb" }, "customization should be preserved");
assert.equal(decoded.d.sections[1].heading, "مسيرتي المهنية", "custom section heading should remain unchanged");
assert.equal(isRtlLang(decoded.l), true, "Arabic shared document should resolve as RTL");
assert.equal(getResumeTemplateById(decoded.t).id, "modern", "Modern resume template should resolve");

const cover = roundTrip({
  v: 2,
  k: "cover",
  t: "classic",
  l: "fr",
  p: "letter",
  c: {},
  d: { name: "Alex Martin", body: "Bonjour,\n\nMerci." },
});
assert.equal(cover.k, "cover", "cover kind should be preserved");
assert.equal(cover.l, "fr", "cover language should be preserved");
assert.equal(cover.p, "letter", "letter page size should be preserved");
assert.equal(getCoverTemplateById(cover.t).id, "classic", "Classic cover template should resolve");

const oldLink = normalizeSharedDocument({ k: "resume", t: "modern", d: { name: "Old Link" } });
assert.equal(oldLink.v, 1, "missing version should default to v1");
assert.equal(oldLink.l, "en", "old links without language should default to English");
assert.equal(oldLink.p, "a4", "old links without page size should default to A4");

const oldRtlFallback = normalizeSharedDocument({
  k: "resume",
  t: "modern",
  d: { name: "سارة محمد", sections: [{ heading: "الخبرة العملية", items: ["إدارة فرق الدعم الفني"] }] },
});
assert.equal(oldRtlFallback.l, "ar", "old links with strong RTL content should infer Arabic as fallback");

assert.equal(normalizeSharedDocument({ k: "unknown", d: {} }), null, "invalid shared kind should fail safely");
assert.equal(getResumeTemplateById("missing-template").id, "modern", "invalid resume template should fall back safely");

const sharedSource = fs.readFileSync("src/SharedResume.jsx", "utf8");
assert.ok(sharedSource.includes("ResumePaper"), "shared viewer should import/use ResumePaper");
assert.ok(sharedSource.includes("CoverLetterPaper"), "shared viewer should import/use CoverLetterPaper");
assert.ok(!/function\s+ResumeView\b/.test(sharedSource), "generic ResumeView renderer should be removed");
assert.ok(!/function\s+CoverView\b/.test(sharedSource), "generic CoverView renderer should be removed");
assert.ok(/lang=\{doc\.l\}/.test(sharedSource), "shared document article should receive document language");
assert.ok(/dir=\{resolved\.rtl \? "rtl" : "ltr"\}/.test(sharedSource), "shared document article should receive document direction");
assert.ok(/@media print/.test(sharedSource), "shared viewer should include print styles");

const generatorSource = fs.readFileSync("src/ResumeGenerator.jsx", "utf8");
assert.ok(/v:\s*2,\s*k:\s*"resume"/.test(generatorSource), "resume share payload should use schema v2");
assert.ok(/v:\s*2,\s*k:\s*"cover"/.test(generatorSource), "cover share payload should use schema v2");
assert.ok(/l:\s*docLang/.test(generatorSource), "share payloads should include document language");
assert.ok(/isCustom: Boolean\(form\.sectionTitles\?\.\[key\]\)/.test(generatorSource), "live sections should preserve custom-label metadata");

assert.ok(generatorSource.includes("createShortShareLink"), "share menu should call the short-link API");
assert.ok(generatorSource.includes("window.confirm(shareCopy.confirm)"), "share menu should show a privacy confirmation before upload");
assert.ok(generatorSource.includes("buildPrivateShareUrl"), "private offline hash link should remain available");
assert.ok(sharedSource.includes("fetchShortSharedDocument"), "shared viewer should fetch short-link payloads");
assert.ok(sharedSource.includes("shareIdFromPath"), "shared viewer should support /r/:shareId");

const kv = memoryKv();
const env = {
  SHARE_KV: kv,
  APP_ORIGIN: "https://applycraft.io",
  ASSETS: {
    fetch: async (request) => new Response(`asset:${new URL(request.url).pathname}`, {
      headers: { "Content-Type": "text/html" },
    }),
  },
};

let response = await worker.fetch(shareRequest("/api/share", {
  method: "POST",
  body: JSON.stringify({ payload: arabicModernResume, expiresInDays: 30 }),
}), env);
assert.equal(response.status, 201, "create share should succeed");
let body = await readJson(response);
assert.equal(body.ok, true, "create share response should be ok");
assert.match(body.shareId, SHARE_ID_RE, "create share should return a URL-safe ID");
assert.equal(body.url, `https://applycraft.io/r/${body.shareId}`, "create share should return clean short URL");
assert.ok(body.expiresAt, "create share should return expiration");
assert.match(body.deleteToken, SHARE_ID_RE, "create share should return a delete token");
const shareId = body.shareId;
const deleteToken = body.deleteToken;

response = await worker.fetch(shareRequest(`/api/share/${shareId}`), env);
assert.equal(response.status, 200, "read share should succeed");
body = await readJson(response);
assert.equal(body.ok, true, "read share response should be ok");
assert.equal(body.payload.l, "ar", "read share should preserve document language");
assert.equal(body.payload.t, "modern", "read share should preserve template");
assert.equal(body.payload.d.sections[1].heading, "مسيرتي المهنية", "read share should preserve custom labels");

response = await worker.fetch(shareRequest("/api/share", {
  method: "POST",
  body: JSON.stringify({ payload: { ...arabicModernResume, k: "bad" } }),
}), env);
assert.equal(response.status, 400, "invalid share payload should be rejected");

response = await worker.fetch(shareRequest("/api/share", {
  method: "POST",
  body: JSON.stringify({ payload: { ...arabicModernResume, d: { text: "x".repeat(120000) } } }),
}), env);
assert.equal(response.status, 413, "oversized share payload should be rejected");

response = await worker.fetch(shareRequest("/api/share/missing123"), env);
assert.equal(response.status, 404, "missing share should return not found");
assert.equal((await readJson(response)).error, "not_found");

await kv.put("share:expired12", JSON.stringify({
  payload: arabicModernResume,
  createdAt: "2026-07-01T00:00:00.000Z",
  expiresAt: "2026-07-01T00:00:01.000Z",
}));
response = await worker.fetch(shareRequest("/api/share/expired12"), env);
assert.equal(response.status, 410, "expired share should return expired");
assert.equal((await readJson(response)).error, "expired");

response = await worker.fetch(shareRequest(`/api/share/${shareId}`, {
  method: "DELETE",
  headers: { "X-Delete-Token": "wrongtoken" },
}), env);
assert.equal(response.status, 403, "delete should reject invalid delete token");
response = await worker.fetch(shareRequest(`/api/share/${shareId}`, {
  method: "DELETE",
  headers: { "X-Delete-Token": deleteToken },
}), env);
assert.equal(response.status, 200, "delete should work with the delete token");
response = await worker.fetch(shareRequest(`/api/share/${shareId}`), env);
assert.equal(response.status, 404, "deleted share should no longer read");

response = await worker.fetch(new Request("https://applycraft.io/r/aB7xK2mQ", { method: "GET" }), env);
assert.equal(response.status, 200, "worker should serve the shared viewer for /r/:shareId");
assert.equal(await response.text(), "asset:/r.html", "worker should rewrite /r/:shareId to /r.html");

let limitedResponse;
for (let i = 0; i < 9; i += 1) {
  limitedResponse = await worker.fetch(shareRequest("/api/share", {
    method: "POST",
    ip: "203.0.113.222",
    body: JSON.stringify({ payload: arabicModernResume, expiresInDays: 30 }),
  }), env);
}
assert.equal(limitedResponse.status, 429, "share creation should be rate limited");

console.log("share tests passed");
