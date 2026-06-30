// ──────────────────────────────────────────────────────────────────────────
// Client-side text extraction from an uploaded résumé file (PDF / DOCX / TXT).
// This whole module is loaded lazily (dynamic import on user action), so the
// PDF/zip libraries stay out of the main + SSR bundle. Nothing is uploaded —
// the file is read entirely in the browser.
// ──────────────────────────────────────────────────────────────────────────

import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { unzipSync, strFromU8 } from "fflate";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

const decodeEntities = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

async function extractPdf(buf) {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    let line = "", lastY = null;
    const lines = [];
    for (const it of content.items) {
      if (typeof it.str !== "string") continue;
      const y = Math.round(it.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 3) { if (line.trim()) lines.push(line.trim()); line = ""; }
      line += (line && !line.endsWith(" ") && !it.str.startsWith(" ") ? " " : "") + it.str;
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    out.push(lines.join("\n"));
  }
  try { doc.destroy(); } catch { /* noop */ }
  return out.join("\n");
}

function extractDocx(buf) {
  const files = unzipSync(new Uint8Array(buf));
  const docXml = files["word/document.xml"];
  if (!docXml) return "";
  const xml = strFromU8(docXml);
  // One line per <w:p> paragraph; join the <w:t> runs inside it.
  return xml.split(/<\/w:p>/).map((para) => {
    const runs = [...para.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]);
    const tabs = para.replace(/<w:tab[^>]*\/>/g, "\t");
    void tabs;
    return decodeEntities(runs.join(""));
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Returns the resume's plain text. Throws if the file can't be read.
export async function extractResumeText(file) {
  const name = (file && file.name ? file.name : "").toLowerCase();
  const type = (file && file.type) || "";
  const buf = await file.arrayBuffer();
  if (name.endsWith(".pdf") || type === "application/pdf") return extractPdf(buf);
  if (name.endsWith(".docx") || type.includes("officedocument.wordprocessing")) return extractDocx(buf);
  // .txt / unknown → decode as UTF-8 text.
  return new TextDecoder().decode(new Uint8Array(buf));
}
