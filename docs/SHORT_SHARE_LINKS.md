# Short Share Links

ApplyCraft short public links use the Worker endpoint `POST /api/share` and a
Cloudflare KV namespace.

Required binding:

```text
SHARES
```

The Worker also accepts `SHARE_KV` or the existing `AC_KV` binding as fallback
names, but production should bind the namespace as `SHARES`. Without one of
these bindings, `/api/share` returns a safe
`SHARE_STORAGE_UNAVAILABLE` response and no document content is stored.

Recommended setup:

```bash
npx wrangler kv namespace create SHARES
```

Then add the returned namespace ID to the Cloudflare Worker deployment as the
`SHARES` binding. Keep `RATE_LIMIT_KV` bound separately when available so
share creation and AI endpoints use centralized rate limiting across isolates.

Privacy behavior:

- Short links store a copy of the versioned share payload in KV.
- Links expire automatically through KV TTL.
- The raw delete token is returned only once to the creator; only its hash is
  stored.
- Old `/r#...` hash links still work and keep all document content in the URL
  fragment without uploading it.
