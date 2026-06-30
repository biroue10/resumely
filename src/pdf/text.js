// ──────────────────────────────────────────────────────────────────────────
// Shared text normalization for jsPDF export.
//
// jsPDF's built-in fonts (Helvetica/Times/Courier) render the WinAnsi / Latin-1
// repertoire. That INCLUDES accented Latin letters (é, è, à, ç, ñ, ü, ö…), so
// we must KEEP them — earlier code stripped them, turning "Développeur" into
// "Developpeur". It does NOT include non-Latin scripts (Arabic, CJK, Cyrillic,
// Hebrew…), which built-in fonts cannot draw; those are dropped so the PDF
// never emits garbage, and the UI warns the user to use DOCX instead.
// ──────────────────────────────────────────────────────────────────────────

// Codepoints jsPDF's standard fonts can render (Latin-1 / WinAnsi range).
const NON_LATIN1 = /[^\x00-\xFF]/;

// Normalize a string for jsPDF text(): compose accents into single Latin-1
// codepoints and drop anything outside the renderable range.
export function pdfSafe(str = "") {
  return String(str || "")
    .normalize("NFC")              // combine base+accent into one Latin-1 char
    .replace(/[^\x00-\xFF]/g, "")  // drop only glyphs the built-in fonts can't draw
    .replace(/\s+\n/g, "\n")
    .trim();
}

// True when text contains characters the built-in PDF fonts cannot render
// (e.g. Arabic). Used to warn the user and steer them to DOCX export.
export function containsNonLatin1(str = "") {
  return NON_LATIN1.test(String(str || "").normalize("NFC"));
}
