// ──────────────────────────────────────────────────────────────────────────
// ATS engine + scoring tests (Phase 3). Pure, SSR-safe — no browser needed.
// Run: npm run test:ats
// Covers tokenization/keyword matching for all 5 interface languages plus the
// centralized, documented scoring rules.
// ──────────────────────────────────────────────────────────────────────────
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { analyzeKeywords, detectLanguage } = await import(path.join(root, "src/ats/engine.js"));
const { scoreFromIssues, scoreBand, READINESS_EXPLAINER, SCORE_WEIGHTS } =
  await import(path.join(root, "src/ats/scoring.js"));

let failures = 0;
const check = (name, fn) => {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (e) { failures++; console.error(`  FAIL ${name}\n       ${e.message}`); }
};

// ── Language detection ──────────────────────────────────────────────────────
check("detects English", () => assert.equal(detectLanguage("experience managing a team and shipping software"), "en"));
check("detects French", () => assert.equal(detectLanguage("expérience dans la gestion d'une équipe et le développement"), "fr"));
check("detects Spanish", () => assert.equal(detectLanguage("experiencia en la gestión de un equipo y el desarrollo de software"), "es"));
check("detects German", () => assert.equal(detectLanguage("Erfahrung in der Leitung eines Teams und der Entwicklung von Software"), "de"));
check("detects Arabic", () => assert.equal(detectLanguage("خبرة في إدارة فريق وتطوير البرمجيات"), "ar"));

// ── English keyword matching ────────────────────────────────────────────────
check("EN: matches present, flags missing", () => {
  const r = analyzeKeywords("Built data pipelines with Python and SQL", "We need Python, SQL and AWS experience");
  assert.ok(r.present.includes("python") && r.present.includes("sql"), "python+sql present");
  assert.ok(r.missing.includes("aws"), "aws missing");
  assert.ok(r.pct > 0 && r.pct <= 100);
});

// ── French: accented words are handled (folded for matching, not dropped) ────
check("FR: accented words match across spellings", () => {
  const r = analyzeKeywords("Développeur logiciel expérimenté dans la méthode agile", "Recherche développeur dans une équipe agile");
  // "Développeur" (accented) must fold and match "développeur", surfacing as
  // the diacritic-folded token "developpeur" — the accented word is not dropped.
  assert.ok(r.present.includes("developpeur"), `expected 'developpeur' in present, got ${JSON.stringify(r.present)}`);
  assert.ok(r.present.includes("agile"), `expected 'agile' in present, got ${JSON.stringify(r.present)}`);
});

// ── Spanish & German smoke matching ─────────────────────────────────────────
check("ES: matches keywords", () => {
  const r = analyzeKeywords("Gestión de proyectos y desarrollo de software", "Buscamos gestión de proyectos y desarrollo");
  assert.ok(r.present.length >= 1, JSON.stringify(r.present));
});
check("DE: matches keywords", () => {
  const r = analyzeKeywords("Projektmanagement und Softwareentwicklung", "Wir suchen Projektmanagement und Entwicklung");
  assert.ok(r.total >= 1);
});

// ── Arabic (RTL, non-Latin): analyzed, not discarded ────────────────────────
check("AR: non-Latin tokens are analyzed and matched", () => {
  const resume = "مهندس برمجيات لديه خبرة في تطوير البرمجيات وإدارة المشاريع";
  const jd = "مطلوب مهندس برمجيات لديه خبرة في تطوير وإدارة المشاريع";
  const r = analyzeKeywords(resume, jd);
  assert.equal(r.langResume, "ar");
  assert.equal(r.langJd, "ar");
  assert.ok(r.total >= 1, "Arabic JD produced keywords");
  assert.ok(r.present.length >= 1, `Arabic matches found, got ${JSON.stringify(r.present)}`);
});

// ── No partial-word matching ────────────────────────────────────────────────
check("does not match partial words (java ≠ javascript)", () => {
  const r = analyzeKeywords("Expert in JavaScript", "Java required");
  assert.ok(r.missing.includes("java"), `java should be missing, got ${JSON.stringify(r)}`);
  assert.ok(!r.present.includes("java"));
});

// ── Repeated keywords do not inflate ────────────────────────────────────────
check("repeated JD keywords are de-duplicated", () => {
  const r = analyzeKeywords("Python developer", "python python python developer");
  assert.equal(r.total, 2, `expected 2 unique keywords (python, developer), got ${r.total}`);
  assert.equal(r.pct, 100, "both unique keywords present → 100%");
});

// ── Empty / safe inputs ─────────────────────────────────────────────────────
check("empty JD is safe", () => {
  const r = analyzeKeywords("Some resume text", "");
  assert.equal(r.pct, 0);
  assert.equal(r.total, 0);
});

// ── Centralized scoring ─────────────────────────────────────────────────────
check("scoreFromIssues uses documented weights", () => {
  assert.equal(scoreFromIssues([]), 100);
  assert.equal(scoreFromIssues([{ level: "critical" }, { level: "warning" }]),
    100 - SCORE_WEIGHTS.critical - SCORE_WEIGHTS.warning);
  assert.equal(scoreFromIssues(Array(10).fill({ level: "critical" })), 0, "never below 0");
});
check("scoreBand labels are honest (no guarantee wording)", () => {
  assert.equal(scoreBand(90).label, "Strong");
  assert.equal(scoreBand(70).label, "Needs work");
  assert.equal(scoreBand(50).label, "Action required");
  assert.equal(scoreBand(10).label, "Critical issues");
});
check("readiness explainer names no specific ATS as reproduced + no guarantee", () => {
  for (const v of ["Workday", "Greenhouse", "Taleo", "Lever"]) assert.ok(READINESS_EXPLAINER.includes(v));
  assert.ok(/does not guarantee/i.test(READINESS_EXPLAINER));
});

console.log("");
if (failures) { console.error(`ATS tests: ${failures} failed.`); process.exit(1); }
console.log("ATS tests: all passed.");
