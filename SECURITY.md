# Security Policy

## Supported Versions

Security fixes are applied to the current `main` branch and the production deployment at `https://applycraft.io/`.

## Reporting a Vulnerability

Please do not open a public issue for an unpatched vulnerability. Use GitHub private vulnerability reporting for this repository. If private vulnerability reporting is not enabled, the repository owner should enable it in GitHub under **Settings > Security > Private vulnerability reporting**.

Include:

- Affected URL, component, or file path.
- Reproduction steps using test data only.
- Security impact and any prerequisites.
- Browser and operating system details when relevant.

Do not include real resume data, real user contact details, API keys, tokens, or destructive proof-of-concept payloads.

## Scope

In scope:

- ApplyCraft browser application.
- Cloudflare Worker API endpoints.
- Static pages and generated SEO pages.
- GitHub Actions workflows in this repository.

Out of scope:

- Denial-of-service testing.
- Social engineering.
- Physical attacks.
- Attacks against third-party services except where ApplyCraft configuration is directly involved.

## Safe Harbor

Good-faith research that avoids privacy harm, service disruption, data destruction, and public disclosure before remediation is welcome. Stop testing and report promptly if you encounter sensitive data, secrets, or behavior that could affect other users.

## Expected Process

The maintainer should acknowledge valid private reports within 5 business days, triage severity, and coordinate remediation before public disclosure. Public disclosure should wait until a fix is available or a mutually agreed disclosure date is reached.
