// ──────────────────────────────────────────────────────────────────────────
// PDF text-layer tests (Phase 4).
//
// Verifies that the jsPDF export produces a REAL, extractable text layer (not
// an image): generate a resume PDF, extract its text with pdfjs-dist, and
// assert the important content is present, in a sensible reading order, with
// accented Latin text preserved. Also asserts the honest handling of non-Latin
// scripts (Arabic) the built-in fonts cannot render.
//
// Run: npm run test:pdf
// ──────────────────────────────────────────────────────────────────────────
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { pdfSafe, containsNonLatin1 } = await import(path.join(root, "src/pdf/text.js"));
const { jsPDF } = await import("jspdf");
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

let failures = 0;
const check = (name, fn) => fn().then(
  () => console.log(`  ok  ${name}`),
  (e) => { failures++; console.error(`  FAIL ${name}\n       ${e.message}`); },
);

// A realistic resume with accented Latin text (FR/ES/DE) to exercise encoding.
const RESUME = {
  name: "José Müller-Dupré",
  title: "Développeur logiciel senior",
  contact: "jose@example.com · +33 6 12 34 56 78 · Paris, France",
  sections: [
    { heading: "Expérience", items: [
      "Développeur principal — Société Générale (2021–Présent)",
      "Réduction du temps de déploiement de 60% (Kubernetes, CI/CD)",
    ] },
    { heading: "Compétences", items: ["Python, SQL, AWS, Gestión de proyectos"] },
  ],
};

// Build a single-column text PDF the way downloadPDF does (jsPDF doc.text()).
function buildResumePdf(data) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18; let y = margin;
  doc.setFont("helvetica", "bold"); doc.setFontSize(22);
  doc.text(pdfSafe(data.name), margin, y); y += 9;
  doc.setFont("helvetica", "normal"); doc.setFontSize(12);
  doc.text(pdfSafe(data.title), margin, y); y += 7;
  doc.setFontSize(9);
  doc.text(pdfSafe(data.contact), margin, y); y += 10;
  for (const sec of data.sections) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(pdfSafe(sec.heading).toUpperCase(), margin, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    for (const item of sec.items) { doc.text(pdfSafe(item), margin, y); y += 6; }
    y += 3;
  }
  return new Uint8Array(doc.output("arraybuffer"));
}

async function extractText(bytes) {
  const task = pdfjs.getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false });
  const pdf = await task.promise;
  let out = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    out += tc.items.map((i) => i.str).join(" ") + "\n";
  }
  return out;
}

await check("pdfSafe keeps accented Latin, drops non-Latin", async () => {
  assert.equal(pdfSafe("Développeur"), "Développeur", "French accent preserved");
  assert.equal(pdfSafe("Gestión José Müller"), "Gestión José Müller", "ES/DE accents preserved");
  assert.equal(pdfSafe("مهندس برمجيات"), "", "Arabic dropped (built-in fonts can't render it)");
});

await check("containsNonLatin1 detects Arabic, not accented Latin", async () => {
  assert.equal(containsNonLatin1("Développeur expérimenté"), false);
  assert.equal(containsNonLatin1("مهندس"), true);
});

await check("generated PDF has an extractable text layer with key content", async () => {
  const text = await extractText(buildResumePdf(RESUME));
  for (const must of ["José", "jose@example.com", "Paris", "Python", "SQL", "AWS"]) {
    assert.ok(text.includes(must), `expected "${must}" in extracted PDF text`);
  }
});

await check("reading order: name → headings → details", async () => {
  const text = await extractText(buildResumePdf(RESUME));
  const iName = text.indexOf("José");
  const iExp = text.indexOf("EXP"); // "EXPÉRIENCE" heading (uppercased)
  const iSkillItem = text.indexOf("Python");
  assert.ok(iName >= 0 && iExp > iName, "heading comes after name");
  assert.ok(iSkillItem > iExp, "skill details come after experience heading");
});

await check("accented Latin survives the PDF round-trip", async () => {
  const text = await extractText(buildResumePdf(RESUME));
  // At least one accented character must survive extraction (é / ü / í / ó).
  assert.ok(/[éèêàçñüöíó]/i.test(text), `expected accented characters in extracted text; got: ${text.slice(0, 200)}`);
});

console.log("");
if (failures) { console.error(`PDF tests: ${failures} failed.`); process.exit(1); }
console.log("PDF tests: all passed.");
