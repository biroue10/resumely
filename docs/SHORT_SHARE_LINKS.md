# Short Share Links

ApplyCraft short public links use the Worker endpoint `POST /api/share` and a
Cloudflare KV namespace.

Required binding:

```text
SHARE_KV
```

The Worker also falls back to the existing `AC_KV` binding if `SHARE_KV` is not
configured. Without either binding, `/api/share` returns a safe
`SHARE_STORAGE_UNAVAILABLE` response and no document content is stored.

Recommended setup:

```bash
npx wrangler kv namespace create SHARE_KV
```

Then add the returned namespace ID to the Cloudflare Worker/Pages deployment as
the `SHARE_KV` binding. Keep `RATE_LIMIT_KV` bound separately when available so
share creation and AI endpoints use centralized rate limiting across isolates.

Privacy behavior:

- Short links store a copy of the versioned share payload in KV.
- Links expire automatically through KV TTL.
- The raw delete token is returned only once to the creator; only its hash is
  stored.
- Old `/r#...` hash links still work and keep all document content in the URL
  fragment without uploading it.
