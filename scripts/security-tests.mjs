import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker, { __securityTest } from "../worker.js";

const ORIGIN = "https://applycraft.io";
let requestId = 10;

function request(path, init = {}) {
  const headers = { Origin: ORIGIN, "Content-Type": "application/json", "X-Forwarded-For": `203.0.113.${requestId++}`, ...(init.headers || {}) };
  return new Request(`https://applycraft.io${path}`, {
    ...init,
    method: "POST",
    headers,
    body: init.body ?? JSON.stringify({ action: "rewrite-achievement", text: "Responsible for reports", language: "en" }),
  });
}

function env() {
  return {
    ANTHROPIC_API_KEY: "test-key",
    ASSETS: { fetch: async () => new Response("<!doctype html><title>ok</title>", { headers: { "Content-Type": "text/html" } }) },
  };
}

async function withMockFetch(fn, handler) {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    await fn();
  } finally {
    globalThis.fetch = oldFetch;
  }
}

async function readJson(response) {
  return JSON.parse(await response.text());
}

async function testWorkerValidation() {
  await withMockFetch(async () => {
    let response = await worker.fetch(new Request("https://applycraft.io/api/ai", { method: "GET", headers: { Origin: ORIGIN } }), env());
    assert.equal(response.status, 405);

    response = await worker.fetch(request("/api/ai", { headers: { Origin: "https://evil.example", "Content-Type": "application/json" } }), env());
    assert.equal(response.status, 403);

    response = await worker.fetch(request("/api/ai", { headers: { Origin: ORIGIN, "Content-Type": "text/plain" }, body: "{}" }), env());
    assert.equal(response.status, 415);

    response = await worker.fetch(request("/api/ai", { body: "{" }), env());
    assert.equal(response.status, 400);
    assert.equal((await readJson(response)).error.code, "MALFORMED_JSON");

    response = await worker.fetch(request("/api/ai", { body: JSON.stringify({ action: "rewrite-achievement", text: "x", language: "en", model: "override" }) }), env());
    assert.equal(response.status, 400);
    assert.equal((await readJson(response)).error.code, "UNKNOWN_FIELD");

    response = await worker.fetch(request("/api/ai", { body: JSON.stringify({ action: "unknown", text: "x", language: "en" }) }), env());
    assert.equal(response.status, 400);

    response = await worker.fetch(request("/api/ai", { body: JSON.stringify({ action: "rewrite-achievement", text: "x", language: "xx" }) }), env());
    assert.equal(response.status, 400);

    response = await worker.fetch(request("/api/ai", { body: JSON.stringify({ action: "rewrite-achievement", text: "x".repeat(3000), language: "en" }) }), env());
    assert.equal(response.status, 413);

    response = await worker.fetch(request("/api/ai", { headers: { Origin: ORIGIN, "Content-Type": "application/json", "Content-Length": String(__securityTest.MAX_BODY_BYTES + 1) } }), env());
    assert.equal(response.status, 413);
  }, async () => new Response(JSON.stringify({ content: [{ type: "text", text: "Improved bullet." }] }), { headers: { "Content-Type": "application/json" } }));
}

async function testWorkerUpstreamControls() {
  let upstreamBody;
  await withMockFetch(async () => {
    const response = await worker.fetch(request("/api/ai", {
      body: JSON.stringify({ action: "rewrite-achievement", text: "Responsible for reports", language: "en" }),
    }), env());
    assert.equal(response.status, 200);
    assert.equal((await readJson(response)).result, "Improved bullet.");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
    assert.equal(upstreamBody.model, "claude-3-5-haiku-20241022");
    assert.equal(upstreamBody.max_tokens, 150);
    assert.equal(upstreamBody.messages.length, 1);
    assert.ok(!("tools" in upstreamBody));
    assert.ok(!("metadata" in upstreamBody));
  }, async (_url, init) => {
    upstreamBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ content: [{ type: "text", text: "Improved bullet." }] }), { headers: { "Content-Type": "application/json" } });
  });
}

async function testRateLimit() {
  await withMockFetch(async () => {
    let response;
    for (let i = 0; i < 9; i += 1) {
      response = await worker.fetch(request("/api/ai", { headers: { "X-Forwarded-For": "198.51.100.42" } }), env());
    }
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get("Retry-After")) > 0);
  }, async () => new Response(JSON.stringify({ content: [{ type: "text", text: "Improved bullet." }] }), { headers: { "Content-Type": "application/json" } }));
}

async function testUpstreamFailures() {
  await withMockFetch(async () => {
    let response = await worker.fetch(request("/api/ai"), env());
    assert.equal(response.status, 502);
    assert.equal((await readJson(response)).error.code, "AI_BAD_UPSTREAM_RESPONSE");
  }, async () => new Response("not json", { headers: { "Content-Type": "text/plain" } }));

  await withMockFetch(async () => {
    const response = await worker.fetch(request("/api/ai"), env());
    assert.equal(response.status, 502);
    assert.equal((await readJson(response)).error.code, "AI_REQUEST_FAILED");
  }, async () => new Response(JSON.stringify({ error: { message: "provider detail" } }), { status: 500, headers: { "Content-Type": "application/json" } }));

  await withMockFetch(async () => {
    const response = await worker.fetch(request("/api/ai"), env());
    assert.equal(response.status, 504);
    assert.equal((await readJson(response)).error.code, "AI_TIMEOUT");
  }, async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    throw err;
  });
}

async function testSecurityHeaders() {
  const response = await worker.fetch(new Request("https://applycraft.io/"), env());
  assert.match(response.headers.get("Content-Security-Policy"), /default-src 'self'/);
  assert.match(response.headers.get("Content-Security-Policy"), /frame-ancestors 'none'/);
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
}

async function testStaticSinks() {
  const ats = await readFile(new URL("../public/ats-engine.js", import.meta.url), "utf8");
  assert.equal(/innerHTML\s*=/.test(ats), false);
  const app = await readFile(new URL("../src/ResumeGenerator.jsx", import.meta.url), "utf8");
  assert.equal(/dangerouslySetInnerHTML|insertAdjacentHTML|document\.write/.test(app), false);
  assert.match(app, /sanitizeFilename/);
  assert.match(app, /validateResumeImport/);
  assert.match(app, /hasDangerousKey/);
}

await testWorkerValidation();
await testWorkerUpstreamControls();
await testRateLimit();
await testUpstreamFailures();
await testSecurityHeaders();
await testStaticSinks();

console.log("Security tests passed.");
