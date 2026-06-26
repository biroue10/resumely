import React, { useState } from "react";

// ── Language config ──────────────────────────────────────────────
const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ar", label: "العربية", flag: "🇲🇦", rtl: true },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
];

const UI = {
  en: { name: "Full name", title: "Professional title", email: "Email", phone: "Phone",
    location: "Location", summary: "About you", experience: "Experience", education: "Education",
    skills: "Skills (comma separated)", generate: "Generate resume", generating: "Generating…",
    heading: "Resume generator", sub: "Choose a language and template, add your details, get a polished resume.",
    copy: "Copy", copied: "Copied", chooseTpl: "Choose a template", back: "Back",
    placeholderEx: "Role, company, dates, what you did — one per line" },
  fr: { name: "Nom complet", title: "Titre professionnel", email: "E-mail", phone: "Téléphone",
    location: "Localisation", summary: "À propos de vous", experience: "Expérience", education: "Formation",
    skills: "Compétences (séparées par des virgules)", generate: "Générer le CV", generating: "Génération…",
    heading: "Générateur de CV", sub: "Choisissez une langue et un modèle, ajoutez vos infos, obtenez un CV soigné.",
    copy: "Copier", copied: "Copié", chooseTpl: "Choisissez un modèle", back: "Retour",
    placeholderEx: "Poste, entreprise, dates, missions — une par ligne" },
  es: { name: "Nombre completo", title: "Título profesional", email: "Correo", phone: "Teléfono",
    location: "Ubicación", summary: "Sobre ti", experience: "Experiencia", education: "Educación",
    skills: "Habilidades (separadas por comas)", generate: "Generar currículum", generating: "Generando…",
    heading: "Generador de currículums", sub: "Elige idioma y plantilla, añade tus datos y obtén un currículum pulido.",
    copy: "Copiar", copied: "Copiado", chooseTpl: "Elige una plantilla", back: "Volver",
    placeholderEx: "Puesto, empresa, fechas, qué hiciste — uno por línea" },
  ar: { name: "الاسم الكامل", title: "المسمى الوظيفي", email: "البريد", phone: "الهاتف",
    location: "الموقع", summary: "نبذة عنك", experience: "الخبرة", education: "التعليم",
    skills: "المهارات (مفصولة بفواصل)", generate: "إنشاء السيرة الذاتية", generating: "جارٍ الإنشاء…",
    heading: "منشئ السيرة الذاتية", sub: "اختر لغة وقالباً، أضف بياناتك، واحصل على سيرة ذاتية متقنة.",
    copy: "نسخ", copied: "تم النسخ", chooseTpl: "اختر قالباً", back: "رجوع",
    placeholderEx: "المنصب، الشركة، التواريخ، مهامك — واحدة في كل سطر" },
  de: { name: "Vollständiger Name", title: "Berufsbezeichnung", email: "E-Mail", phone: "Telefon",
    location: "Standort", summary: "Über dich", experience: "Erfahrung", education: "Ausbildung",
    skills: "Fähigkeiten (durch Kommas getrennt)", generate: "Lebenslauf erstellen", generating: "Wird erstellt…",
    heading: "Lebenslauf-Generator", sub: "Sprache und Vorlage wählen, Daten eingeben, gepflegten Lebenslauf erhalten.",
    copy: "Kopieren", copied: "Kopiert", chooseTpl: "Vorlage wählen", back: "Zurück",
    placeholderEx: "Position, Firma, Zeitraum, Aufgaben — eine pro Zeile" },
};

// ── Templates ─────────────────────────────────────────────────────
const TEMPLATES = [
  { id: "classic",   name: "Classic",   tag: "Timeless, serif, single column",      accent: "#1f2937", font: "Georgia, serif" },
  { id: "modern",    name: "Modern",    tag: "Clean sans-serif with sidebar",        accent: "#2563eb", font: "'Segoe UI', sans-serif" },
  { id: "minimal",   name: "Minimal",   tag: "Lots of whitespace, understated",      accent: "#0f766e", font: "'Helvetica Neue', sans-serif" },
  { id: "bold",      name: "Bold",      tag: "Strong header band, high contrast",    accent: "#b91c1c", font: "'Segoe UI', sans-serif" },
  { id: "elegant",   name: "Elegant",   tag: "Refined, thin rules, light weight",    accent: "#7c3aed", font: "'Palatino Linotype', serif" },
  { id: "executive", name: "Executive", tag: "Split header, left-bar sections, gold",accent: "#d97706", font: "Georgia, serif" },
  { id: "creative",  name: "Creative",  tag: "Right colour panel, bold & expressive",accent: "#db2777", font: "'Segoe UI', sans-serif" },
  { id: "tech",      name: "Tech",      tag: "Dark terminal style, monospace, green",accent: "#10b981", font: "'Courier New', monospace" },
];

// Build resume data straight from the form so the preview updates as the user types.
function buildLiveData(form, t) {
  const lines = (s) => s.split("\n").map((x) => x.trim()).filter(Boolean);
  const csv = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
  const sections = [];
  if (form.experience.trim()) sections.push({ heading: t.experience, items: lines(form.experience) });
  if (form.education.trim())  sections.push({ heading: t.education,  items: lines(form.education) });
  if (form.skills.trim())     sections.push({ heading: t.skills.replace(/\s*\(.*\)/, ""), items: csv(form.skills) });
  return {
    name: form.name || "—",
    title: form.title || "",
    contact: [form.email, form.phone, form.location].filter(Boolean),
    summary: form.summary || "",
    sections,
  };
}

export default function ResumeGenerator() {
  const [step, setStep] = useState("templates");
  const [lang, setLang] = useState("en");
  const [tpl, setTpl] = useState(null);
  const [form, setForm] = useState({
    name: "", title: "", email: "", phone: "", location: "",
    summary: "", experience: "", education: "", skills: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const t = UI[lang];
  const rtl = LANGUAGES.find((l) => l.code === lang)?.rtl;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const liveData = buildLiveData(form, t);

  async function generate() {
    setLoading(true); setError(""); setResult(null);
    const langName = LANGUAGES.find((l) => l.code === lang)?.label;
    const prompt = `You are an expert resume writer. Using the candidate details below, write a polished, ATS-friendly resume entirely in ${langName} (every word, including section headings, in ${langName}). Improve weak phrasing and use strong action verbs.

Return ONLY valid JSON, no markdown, in this exact shape:
{"name":"","title":"","contact":["email","phone","location"],"summary":"","sections":[{"heading":"","items":["bullet or line"]}]}

Use sections for Experience, Education, Skills (and any other relevant section). Each item is a single concise line.

Candidate details:
Name: ${form.name}
Title: ${form.title}
Email: ${form.email}
Phone: ${form.phone}
Location: ${form.location}
About: ${form.summary}
Experience: ${form.experience}
Education: ${form.education}
Skills: ${form.skills}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error("no-backend");
      const data = await res.json();
      const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
      const clean = text.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
    } catch (err) {
      // No AI backend (e.g. running locally or on static hosting):
      // fall back to the live form data so the preview still renders.
      setResult(buildLiveData(form, t));
      setError("AI polish needs a backend with an API key — showing your raw entries instead.");
    } finally {
      setLoading(false);
    }
  }

  function copyOut() {
    const src = result || liveData;
    if (!src) return;
    const flat = [src.name, src.title, (src.contact || []).join("  •  "), "",
      src.summary, "",
      ...(src.sections || []).flatMap((s) => [s.heading, ...s.items, ""])].join("\n");
    navigator.clipboard.writeText(flat);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (step === "templates") {
    return (
      <div dir={rtl ? "rtl" : "ltr"} style={page}>
        <div style={{ ...shell, maxWidth: 920 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {LANGUAGES.map((l) => (
              <button key={l.code} onClick={() => setLang(l.code)}
                style={{ ...chip, ...(lang === l.code ? chipActive : {}) }}>
                <span style={{ fontSize: 15 }}>{l.flag}</span> {l.label}
              </button>
            ))}
          </div>
          <h1 style={h1}>{t.heading}</h1>
          <p style={subtitle}>{t.chooseTpl}</p>

          <div style={tplGrid}>
            {TEMPLATES.map((tp) => (
              <button key={tp.id} onClick={() => { setTpl(tp); setStep("form"); }} style={tplCard}>
                <ThumbPreview tp={tp} />
                <div style={{ padding: "12px 14px", textAlign: rtl ? "right" : "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#f5f8fc" }}>{tp.name}</div>
                  <div style={{ fontSize: 12.5, color: "#8a98a8", marginTop: 2 }}>{tp.tag}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const field = (key, multiline, ph) =>
    multiline ? (
      <textarea value={form[key]} onChange={set(key)} placeholder={ph || ""} rows={4}
        style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
    ) : (
      <input value={form[key]} onChange={set(key)} style={inputStyle} />
    );

  return (
    <div dir={rtl ? "rtl" : "ltr"} style={page}>
      <div style={{ ...shell, maxWidth: 1080 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
          <button onClick={() => setStep("templates")} style={backBtn}>← {t.back}</button>
          <div style={{ fontSize: 13.5, color: "#8a98a8" }}>
            {t.chooseTpl}: <strong style={{ color: tpl.accent }}>{tpl.name}</strong>
          </div>
        </div>

        <div style={splitGrid}>
          <div>
            <label style={lbl}>{t.name}</label>{field("name")}
            <label style={lbl}>{t.title}</label>{field("title")}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><label style={lbl}>{t.email}</label>{field("email")}</div>
              <div style={{ flex: 1 }}><label style={lbl}>{t.phone}</label>{field("phone")}</div>
            </div>
            <label style={lbl}>{t.location}</label>{field("location")}
            <label style={lbl}>{t.summary}</label>{field("summary", true)}
            <label style={lbl}>{t.experience}</label>{field("experience", true, t.placeholderEx)}
            <label style={lbl}>{t.education}</label>{field("education", true)}
            <label style={lbl}>{t.skills}</label>{field("skills")}
            <button onClick={generate} disabled={loading || !form.name} style={{ ...cta, background: tpl.accent }}>
              {loading ? t.generating : t.generate}
            </button>
            {error && <p style={{ color: "#f87171", fontSize: 14, marginTop: 12 }}>{error}</p>}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ ...badge, ...(result ? badgePolished : badgeLive),
                background: result ? `${tpl.accent}22` : "#1f2937",
                color: result ? tpl.accent : "#9fb0c2" }}>
                {result ? "✦ AI-polished" : "● Live preview"}
              </span>
            </div>
            <div style={{ position: "relative" }}>
              {result && <button onClick={copyOut} style={copyBtn}>{copied ? t.copied : t.copy}</button>}
              <ResumePaper tpl={tpl} result={result || liveData} rtl={rtl} placeholder={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThumbPreview({ tp }) {
  const bar = (w, c = "#cbd5e1") => ({ height: 4, borderRadius: 2, background: c, width: w });
  if (tp.id === "modern" || tp.id === "elegant") {
    return (
      <div style={{ height: 120, background: "#fff", display: "flex", padding: 10, gap: 8 }}>
        <div style={{ width: "32%", background: tp.id === "elegant" ? "#f3f0fb" : tp.accent, borderRadius: 4, padding: 8 }}>
          <div style={{ ...bar("70%", tp.id === "elegant" ? "#c4b5fd" : "rgba(255,255,255,0.8)"), marginBottom: 6 }} />
          <div style={{ ...bar("90%", tp.id === "elegant" ? "#ddd6fe" : "rgba(255,255,255,0.5)"), marginBottom: 4 }} />
          <div style={bar("60%", tp.id === "elegant" ? "#ddd6fe" : "rgba(255,255,255,0.5)")} />
        </div>
        <div style={{ flex: 1, paddingTop: 4 }}>
          <div style={{ ...bar("55%", tp.accent), height: 6, marginBottom: 8 }} />
          <div style={{ ...bar("100%"), marginBottom: 4 }} />
          <div style={{ ...bar("85%"), marginBottom: 4 }} />
          <div style={{ ...bar("92%") }} />
        </div>
      </div>
    );
  }
  if (tp.id === "bold") {
    return (
      <div style={{ height: 120, background: "#fff" }}>
        <div style={{ background: tp.accent, padding: "10px 12px" }}>
          <div style={{ ...bar("50%", "rgba(255,255,255,0.95)"), height: 7, marginBottom: 5 }} />
          <div style={bar("30%", "rgba(255,255,255,0.6)")} />
        </div>
        <div style={{ padding: 12 }}>
          <div style={{ ...bar("100%"), marginBottom: 5 }} />
          <div style={{ ...bar("88%"), marginBottom: 5 }} />
          <div style={bar("94%")} />
        </div>
      </div>
    );
  }
  if (tp.id === "executive") {
    return (
      <div style={{ height: 120, background: "#fff", padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ ...bar("80px", "#1a1a1a"), height: 6, marginBottom: 4 }} />
            <div style={{ ...bar("55px", tp.accent), height: 3 }} />
          </div>
          <div>
            <div style={{ ...bar("45px"), marginBottom: 3 }} />
            <div style={{ ...bar("38px"), marginBottom: 3 }} />
            <div style={bar("42px")} />
          </div>
        </div>
        <div style={{ height: 2, background: `linear-gradient(to right, ${tp.accent}, ${tp.accent}33)`, marginBottom: 8 }} />
        <div style={{ ...bar("100%"), marginBottom: 4 }} />
        <div style={{ ...bar("88%"), marginBottom: 4 }} />
        <div style={bar("94%")} />
      </div>
    );
  }
  if (tp.id === "creative") {
    return (
      <div style={{ height: 120, background: "#fff", display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, padding: "12px 10px" }}>
          <div style={{ ...bar("100%"), marginBottom: 4 }} />
          <div style={{ ...bar("88%"), marginBottom: 4 }} />
          <div style={{ ...bar("95%"), marginBottom: 4 }} />
          <div style={bar("80%")} />
        </div>
        <div style={{ width: "36%", background: tp.accent, padding: "12px 10px" }}>
          <div style={{ ...bar("80%", "rgba(255,255,255,0.9)"), height: 5, marginBottom: 5 }} />
          <div style={{ ...bar("60%", "rgba(255,255,255,0.6)"), marginBottom: 4 }} />
          <div style={{ ...bar("70%", "rgba(255,255,255,0.45)"), marginBottom: 4 }} />
          <div style={bar("50%", "rgba(255,255,255,0.45)")} />
        </div>
      </div>
    );
  }
  if (tp.id === "tech") {
    return (
      <div style={{ height: 120, background: "#0d1117", padding: 12 }}>
        <div style={{ ...bar("65%", tp.accent), height: 5, marginBottom: 4 }} />
        <div style={{ ...bar("42%", "#8b949e"), height: 3, marginBottom: 10 }} />
        <div style={{ ...bar("100%", "#30363d"), marginBottom: 4 }} />
        <div style={{ ...bar("88%", "#30363d"), marginBottom: 4 }} />
        <div style={{ ...bar("94%", "#30363d"), marginBottom: 4 }} />
        <div style={bar("75%", "#30363d")} />
      </div>
    );
  }
  return (
    <div style={{ height: 120, background: "#fff", padding: 14, textAlign: "center" }}>
      <div style={{ ...bar("50%", tp.accent), height: 7, margin: "0 auto 6px" }} />
      <div style={{ ...bar("34%"), margin: "0 auto 12px" }} />
      <div style={{ height: 1, background: "#e5e7eb", margin: "0 0 10px" }} />
      <div style={{ ...bar("100%"), marginBottom: 5 }} />
      <div style={{ ...bar("90%"), marginBottom: 5 }} />
      <div style={bar("96%")} />
    </div>
  );
}

function ResumePaper({ tpl, result, rtl, placeholder = true }) {
  const hasContent = result && (result.name !== "—" || result.summary || (result.sections && result.sections.length));
  const empty = placeholder && !hasContent;
  const data = result || { name: "—", title: "", contact: [], summary: "", sections: [] };
  const paper = { background: "#fff", color: "#1a1a1a", borderRadius: 8, minHeight: 420,
    fontFamily: tpl.font, overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.35)" };

  if (empty) {
    return <div style={{ ...paper, display: "flex", alignItems: "center", justifyContent: "center",
      color: "#9ca3af", fontFamily: "'Segoe UI', sans-serif", fontSize: 14, padding: 30, textAlign: "center" }}>
      Your resume will appear here in the <strong style={{ color: tpl.accent, margin: "0 4px" }}>{tpl.name}</strong> style.
    </div>;
  }

  const Section = ({ s }) => (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "1px",
        color: tpl.accent, margin: "0 0 7px", fontWeight: 700,
        borderBottom: tpl.id === "minimal" ? "none" : `1px solid ${tpl.accent}33`, paddingBottom: 3 }}>
        {s.heading}
      </h3>
      {s.items.map((it, i) => (
        <div key={i} style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 4, color: "#333" }}>
          {tpl.id === "minimal" ? it : `• ${it}`}
        </div>
      ))}
    </div>
  );

  if (tpl.id === "modern" || tpl.id === "elegant") {
    const sideBg = tpl.id === "elegant" ? "#f5f2fc" : tpl.accent;
    const sideTextMain = tpl.id === "elegant" ? "#4c1d95" : "#fff";
    const sideTextSub = tpl.id === "elegant" ? "#6d28d9" : "rgba(255,255,255,0.85)";
    const skills = data.sections.find((s) => /skill|compét|habilidad|مهارات|fähig/i.test(s.heading));
    const rest = data.sections.filter((s) => s !== skills);
    return (
      <div style={paper}>
        <div style={{ display: "flex" }}>
          <div style={{ width: "34%", background: sideBg, color: sideTextMain, padding: "22px 16px" }}>
            <div style={{ fontWeight: 800, fontSize: 19, lineHeight: 1.15 }}>{data.name}</div>
            <div style={{ color: sideTextSub, fontSize: 13, marginTop: 4, marginBottom: 16 }}>{data.title}</div>
            {data.contact.map((c, i) => (
              <div key={i} style={{ fontSize: 11.5, color: sideTextSub, marginBottom: 5, wordBreak: "break-word" }}>{c}</div>
            ))}
            {skills && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, fontWeight: 700 }}>{skills.heading}</div>
                {skills.items.map((it, i) => (
                  <div key={i} style={{ fontSize: 11.5, color: sideTextSub, marginBottom: 4 }}>{it}</div>
                ))}
              </div>
            )}
          </div>
          <div style={{ flex: 1, padding: "22px 20px" }}>
            {data.summary && <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: 0, marginBottom: 16, color: "#444" }}>{data.summary}</p>}
            {rest.map((s, i) => <Section key={i} s={s} />)}
          </div>
        </div>
      </div>
    );
  }

  if (tpl.id === "bold") {
    return (
      <div style={paper}>
        <div style={{ background: tpl.accent, color: "#fff", padding: "22px 24px" }}>
          <div style={{ fontWeight: 800, fontSize: 24 }}>{data.name}</div>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 3 }}>{data.title}</div>
          <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 8 }}>{data.contact.join("   •   ")}</div>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {data.summary && <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: 0, marginBottom: 16, color: "#444" }}>{data.summary}</p>}
          {data.sections.map((s, i) => <Section key={i} s={s} />)}
        </div>
      </div>
    );
  }

  if (tpl.id === "executive") {
    return (
      <div style={paper}>
        <div style={{ padding: "26px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 24, color: "#1a1a1a" }}>{data.name}</div>
              <div style={{ fontSize: 13.5, color: tpl.accent, marginTop: 3, fontStyle: "italic" }}>{data.title}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {data.contact.map((c, i) => (
                <div key={i} style={{ fontSize: 11.5, color: "#555", marginBottom: 3 }}>{c}</div>
              ))}
            </div>
          </div>
          <div style={{ height: 3, background: `linear-gradient(to right, ${tpl.accent}, ${tpl.accent}22)`, marginBottom: 18 }} />
          {data.summary && <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 18, color: "#444", fontStyle: "italic" }}>{data.summary}</p>}
          {data.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 12.5, textTransform: "uppercase", letterSpacing: "1.5px", color: tpl.accent,
                margin: "0 0 7px", fontWeight: 700, borderLeft: `3px solid ${tpl.accent}`, paddingLeft: 8 }}>
                {s.heading}
              </h3>
              {s.items.map((it, j) => (
                <div key={j} style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 4, color: "#333" }}>• {it}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tpl.id === "creative") {
    return (
      <div style={paper}>
        <div style={{ display: "flex", flexDirection: "row-reverse" }}>
          <div style={{ width: "34%", background: tpl.accent, color: "#fff", padding: "22px 16px" }}>
            <div style={{ fontWeight: 800, fontSize: 19, lineHeight: 1.2 }}>{data.name}</div>
            <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 4, marginBottom: 16 }}>{data.title}</div>
            {data.contact.map((c, i) => (
              <div key={i} style={{ fontSize: 11.5, opacity: 0.8, marginBottom: 5, wordBreak: "break-word" }}>{c}</div>
            ))}
          </div>
          <div style={{ flex: 1, padding: "22px 20px" }}>
            {data.summary && <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: 0, marginBottom: 16, color: "#444" }}>{data.summary}</p>}
            {data.sections.map((s, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "1px", color: tpl.accent,
                  margin: "0 0 7px", fontWeight: 700, borderBottom: `2px solid ${tpl.accent}`, paddingBottom: 3 }}>
                  {s.heading}
                </h3>
                {s.items.map((it, j) => (
                  <div key={j} style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 4, color: "#333" }}>• {it}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tpl.id === "tech") {
    return (
      <div style={{ ...paper, background: "#0d1117", color: "#e6edf3", fontFamily: tpl.font }}>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 22, color: tpl.accent }}>{data.name}</div>
            <div style={{ fontSize: 13, color: "#8b949e", marginTop: 3 }}>$ {data.title}</div>
            <div style={{ fontSize: 11.5, color: "#8b949e", marginTop: 6 }}>{data.contact.join("  |  ")}</div>
          </div>
          {data.summary && (
            <p style={{ fontSize: 12.5, lineHeight: 1.6, marginBottom: 16, color: "#c9d1d9",
              borderLeft: `2px solid ${tpl.accent}`, paddingLeft: 10, margin: "0 0 16px" }}>
              {data.summary}
            </p>
          )}
          {data.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 12, color: tpl.accent, margin: "0 0 7px", fontWeight: 700 }}>
                // {s.heading.toUpperCase()}
              </h3>
              {s.items.map((it, j) => (
                <div key={j} style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 4, color: "#c9d1d9" }}>
                  &gt; {it}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={paper}>
      <div style={{ padding: "26px 28px" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 24, color: "#1a1a1a", letterSpacing: tpl.id === "classic" ? "0.5px" : "0" }}>{data.name}</div>
          <div style={{ fontSize: 14, color: tpl.accent, marginTop: 3 }}>{data.title}</div>
          <div style={{ fontSize: 11.5, color: "#666", marginTop: 7 }}>{data.contact.join("   •   ")}</div>
          {tpl.id === "classic" && <div style={{ height: 2, background: tpl.accent, width: 60, margin: "12px auto 0" }} />}
        </div>
        {data.summary && <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 18, color: "#444", textAlign: "center" }}>{data.summary}</p>}
        {data.sections.map((s, i) => <Section key={i} s={s} />)}
      </div>
    </div>
  );
}

const page = { minHeight: "100vh", background: "#0f1419", padding: "32px 16px",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", color: "#e7ecf2" };
const shell = { margin: "0 auto", background: "#161c24", borderRadius: 18, padding: 32, border: "1px solid #232c38" };
const h1 = { fontSize: 30, fontWeight: 700, margin: "0 0 6px", color: "#f5f8fc", letterSpacing: "-0.5px" };
const subtitle = { color: "#8a98a8", fontSize: 15, margin: "0 0 22px", lineHeight: 1.5 };
const tplGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 };
const tplCard = { background: "#0f1419", border: "1px solid #2a3441", borderRadius: 12, overflow: "hidden",
  cursor: "pointer", padding: 0, textAlign: "left" };
const splitGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 };
const lbl = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#9fb0c2",
  margin: "14px 0 6px", textTransform: "uppercase", letterSpacing: "0.4px" };
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", background: "#0f1419",
  border: "1px solid #2a3441", borderRadius: 9, color: "#e7ecf2", fontSize: 14.5, outline: "none" };
const chip = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", background: "#0f1419",
  border: "1px solid #2a3441", borderRadius: 999, color: "#9fb0c2", fontSize: 13.5, cursor: "pointer", fontWeight: 500 };
const chipActive = { background: "#2563eb", borderColor: "#2563eb", color: "#fff" };
const cta = { marginTop: 22, width: "100%", padding: "13px", color: "#fff", border: "none",
  borderRadius: 10, fontSize: 15.5, fontWeight: 600, cursor: "pointer" };
const backBtn = { padding: "7px 14px", background: "#0f1419", border: "1px solid #2a3441", borderRadius: 8,
  color: "#cdd8e4", fontSize: 13.5, cursor: "pointer" };
const copyBtn = { position: "absolute", top: 12, insetInlineEnd: 12, zIndex: 2, padding: "6px 12px",
  background: "#232c38", border: "1px solid #2a3441", borderRadius: 7, color: "#cdd8e4", fontSize: 12.5, cursor: "pointer" };
const badge = { fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, letterSpacing: "0.3px" };
const badgeLive = { border: "1px solid #2a3441" };
const badgePolished = { border: "1px solid transparent" };
