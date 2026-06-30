// ──────────────────────────────────────────────────────────────────────────
// Local, SSR-safe ATS keyword engine: language detection, normalization,
// stop-word filtering, light stemming, and cross-language synonym matching.
// No network, no browser-only APIs — pure functions over plain strings.
// ──────────────────────────────────────────────────────────────────────────

import { STOPWORDS } from "./stopwords.js";
import { SYNONYM_GROUPS, PHRASES, TECH_TOKENS, BOILERPLATE } from "./synonyms.js";

export const LANG_LABEL = { en: "EN", fr: "FR", es: "ES", de: "DE", ar: "AR" };

const stripDiacritics = (s) => s.normalize("NFD").replace(/\p{M}/gu, "");
// Unicode-aware normalization: lowercase, fold diacritics (so "Compétences"
// matches "competences"), and keep letters/numbers from ANY script (Latin,
// Arabic, Cyrillic, CJK…) — never silently drop non-Latin characters.
const normalize = (w) => stripDiacritics(String(w || "").toLowerCase()).replace(/[^\p{L}\p{N}_]/gu, "");

// Split text into word-like tokens. Prefer Intl.Segmenter (true Unicode word
// boundaries, correct for scripts without spaces); fall back to a Unicode
// property-class regex. Both keep whole words only — no partial/substring
// matches — and preserve every script.
function segmentWords(text, locale) {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    try {
      const seg = new Intl.Segmenter(locale || "en", { granularity: "word" });
      const out = [];
      for (const part of seg.segment(text)) if (part.isWordLike) out.push(part.segment);
      return out;
    } catch { /* fall through to regex */ }
  }
  return text.match(/[\p{L}\p{N}_]+/gu) || [];
}

// Conservative stemmer (collapses manage/managing/managed, compétence(s), etc.).
function stem(w) {
  if (w.length < 6 || /\d/.test(w)) return w;
  let s = w
    .replace(/(isations?|izations?)$/, "ize")
    .replace(/(ements?)$/, "")
    .replace(/(ings?|edly)$/, "")
    .replace(/(ed)$/, "")
    .replace(/(ions?)$/, "")
    .replace(/(ers?)$/, "")
    .replace(/(es|s)$/, "");
  return s.length >= 4 ? s : w;
}

// canonical id for a synonym group member / token.
const canonKey = (w) => stem(normalize(w));

// Build variant → canonical-id map from the synonym groups.
const CANON = new Map();
for (const group of SYNONYM_GROUPS) {
  const id = canonKey(group[0]);
  for (const member of group) CANON.set(canonKey(member), id);
}

const PHRASE_DISPLAY = {
  customerservice: "customer service", projectmanagement: "project management",
  techsupport: "technical support", problemsolving: "problem solving",
  dataanalysis: "data analysis", teamwork: "teamwork",
};

// Apply known multi-word phrases on already-normalized text, collapsing each to
// a single underscore-free canonical token so it tokenizes as one keyword.
function applyPhrases(normText) {
  let t = normText;
  for (const [phrase, token] of Object.entries(PHRASES)) {
    t = t.split(phrase).join(` ${token} `);
  }
  return t;
}

// Lightweight language detection (Arabic by script, others by stop-word hits).
export function detectLanguage(text) {
  const raw = String(text || "");
  if (!raw.trim()) return "en";
  const arabic = (raw.match(/[؀-ۿ]/g) || []).length;
  const letters = (raw.match(/[A-Za-zÀ-ɏ؀-ۿ]/g) || []).length || 1;
  if (arabic / letters > 0.2) return "ar";
  const words = stripDiacritics(raw.toLowerCase()).split(/[^a-z]+/).filter((w) => w.length > 1);
  if (!words.length) return "en";
  const scores = {};
  for (const lang of ["en", "fr", "es", "de"]) {
    const set = STOPWORDS[lang];
    scores[lang] = words.reduce((n, w) => n + (set.has(w) ? 1 : 0), 0);
  }
  let best = "en", bestN = scores.en;
  for (const lang of ["fr", "es", "de"]) if (scores[lang] > bestN) { best = lang; bestN = scores[lang]; }
  return best;
}

// Tokenize text into meaningful keyword surface forms (stopwords/boilerplate
// removed). Unicode + locale aware. Diacritics are folded for matching so the
// same word matches across accented/unaccented spellings; non-Latin scripts
// (e.g. Arabic) are preserved, never discarded.
function tokenize(text, stopSet, dropBoilerplate, locale) {
  const lower = String(text || "").toLocaleLowerCase(locale || "en");
  const normText = applyPhrases(stripDiacritics(lower));
  const out = [];
  for (const raw of segmentWords(normText, locale)) {
    const tok = raw.replace(/[^\p{L}\p{N}_]/gu, "");
    if (tok.length < 2) continue;
    if (/^\d+$/.test(tok)) continue;
    if (stopSet.has(tok)) continue;
    if (dropBoilerplate && BOILERPLATE.has(tok)) continue;
    out.push(tok);
  }
  return out;
}

const isAgnostic = (tok) => TECH_TOKENS.has(tok) || /\d/.test(tok);
function canonicalOf(tok) {
  if (isAgnostic(tok)) return "tech:" + tok;          // tool/tech/acronym → literal cross-lang match
  const s = canonKey(tok);
  return CANON.get(s) || s;
}
function weightOf(tok) {
  if (isAgnostic(tok)) return 2;                      // tools / tech / certs / acronyms
  if (CANON.has(canonKey(tok))) return 1.5;           // known skill/role term
  return 1;                                           // other content word
}
const displayOf = (tok) => PHRASE_DISPLAY[tok] || tok;

// Main entry: compare resume vs JD with cross-language matching.
export function analyzeKeywords(resumeText, jdText) {
  const langResume = detectLanguage(resumeText);
  const langJd = detectLanguage(jdText);
  const stopR = new Set([...STOPWORDS[langResume], ...STOPWORDS.en]);
  const stopJ = new Set([...STOPWORDS[langJd], ...STOPWORDS.en]);

  const resumeCanon = new Set(tokenize(resumeText, stopR, false, langResume).map(canonicalOf));

  // Dedupe JD keywords by canonical; keep the highest weight + a readable label.
  const jdKw = new Map();
  for (const tok of tokenize(jdText, stopJ, true, langJd)) {
    const canon = canonicalOf(tok);
    const w = weightOf(tok);
    const prev = jdKw.get(canon);
    if (!prev || w > prev.weight) jdKw.set(canon, { disp: displayOf(tok), weight: w, canon });
  }

  const present = [], missing = [];
  let wMatched = 0, wTotal = 0;
  for (const kw of jdKw.values()) {
    wTotal += kw.weight;
    if (resumeCanon.has(kw.canon)) { present.push(kw); wMatched += kw.weight; }
    else missing.push(kw);
  }
  const byWeight = (a, b) => b.weight - a.weight;
  present.sort(byWeight); missing.sort(byWeight);

  return {
    present: present.slice(0, 24).map((k) => k.disp),
    missing: missing.slice(0, 24).map((k) => k.disp),
    pct: wTotal ? Math.round((wMatched / wTotal) * 100) : 0,
    total: jdKw.size,
    crossLanguage: langResume !== langJd,
    langResume, langJd,
  };
}
