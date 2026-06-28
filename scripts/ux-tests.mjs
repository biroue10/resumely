import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/ResumeGenerator.jsx", import.meta.url), "utf8");
const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

assert.match(app, /Create my resume/, "homepage needs a specific primary CTA");
assert.match(app, /Check my existing resume/, "homepage needs a specific secondary CTA");
assert.match(app, /Create a job-ready resume without signing up\./, "homepage value proposition should be direct");
assert.match(app, /startResume\("hero_primary"\)/, "hero CTA should use the fast-start resume path");
assert.match(app, /RECOMMENDED_TEMPLATE_ID = "modern"/, "resume flow should preselect a recommended template");
assert.match(app, /Use recommended template/, "template selector should call out the default");
assert.match(app, /mobileResumeMode/, "mobile edit and preview modes should be explicit");
assert.match(app, /Saved locally in this browser/, "editor should explain local save state");
assert.match(app, /ac_resume_draft/, "main resume draft should be saved locally");
assert.match(app, /Download PDF/, "PDF export should remain obvious");
assert.match(app, /Download DOCX/, "DOCX export should remain obvious");
assert.match(app, /UX_MEASUREMENT_ENABLED = false/, "privacy-preserving measurement must be disabled by default");
assert.doesNotMatch(app, /from ["'](?:@?fullstory|hotjar|mixpanel|amplitude)|https?:\/\/[^"']*(?:fullstory|hotjar|mixpanel|amplitude|google-analytics)|gtag\(/i, "no invasive analytics should be added");
assert.ok(pkg.scripts["test:ux"], "package.json should expose npm run test:ux");

console.log("UX tests passed.");
