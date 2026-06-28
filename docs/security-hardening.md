# ApplyCraft Security Hardening Notes

## Cloudflare Controls To Configure Manually

- Keep Cloudflare Access enabled. The repository changes do not remove or weaken Access.
- Store `ANTHROPIC_API_KEY` as a Cloudflare Worker secret. Rotate it immediately if misuse is suspected:
  `wrangler secret put ANTHROPIC_API_KEY`.
- Set production Worker variables:
  - `ALLOWED_ORIGINS=https://applycraft.io`
  - `ENVIRONMENT=production`
  - `ENABLE_DEV_ORIGINS=false`
- Add a Cloudflare Rate Limiting Rule for `/api/ai` as the production enforcement layer. Suggested starting point:
  - Method: `POST`
  - Path: `/api/ai`
  - Characteristics: IP address plus user-agent where available
  - Threshold: 8 requests per minute and 40 requests per hour
  - Action: block or managed challenge, depending on observed false positives
- Add Cloudflare alerting for abnormal Worker invocation volume and Anthropic spend. Do not log full prompts or resume content.
- Consider Turnstile only for suspicious or high-volume AI use. Do not require it for normal browser-side resume editing.

## GitHub Controls To Configure Manually

- Enable GitHub private vulnerability reporting.
- Enable GitHub secret scanning and push protection.
- Keep repository and Actions secrets limited to deployment credentials only.
- Do not expose secrets to workflows triggered by untrusted forks.

## Accepted Notes

- The IndexNow key file is intentionally public verification material under the IndexNow protocol. It is not an authentication secret and must not be reused as one.
- The committed Worker includes an in-isolate limiter for immediate protection, but Cloudflare-native rate limiting is still required for durable cross-isolate enforcement.
- CSP permits inline styles because the React app and generated static pages rely heavily on inline style attributes. Inline scripts remain blocked.
- HSTS is set without `includeSubDomains` or `preload`; those should only be added after every relevant subdomain is verified HTTPS-only.
