import React, { useEffect, useState } from "react";
import { decodeShare } from "./share.js";

// Public viewer for a shared resume / cover letter. Reads the encoded document
// from the URL fragment (SSR-safe: only on the client), renders it centered on
// a clean page with the full ApplyCraft site navbar + footer. Nothing is
// fetched — this is a standalone, lightweight page (no ResumeGenerator import).

// Dark-theme tokens mirrored from the main app's `C` object.
const PAGE_BG = "#06080F";
const SURFACE = "#0D1424";
const BORDER  = "#20324E";
const TEXT1   = "#EEF2FF";
const TEXT2   = "#B6C2D6";
const TEXT3   = "#7186A6";
const GRAD    = "linear-gradient(135deg,#6366F1 0%,#3B82F6 100%)";

const PAPER = "#ffffff";
const INK = "#1a1a1a";
const MUTE = "#5b6678";
const ACCENT = "#6366F1";
const EMAIL = "hello@applycraft.io";

const cleanLine = (s) => String(s || "").replace(/\*\*|__|\*|~~/g, "");

function Logo({ size = 24 }) {
  return (
    <a href="/" style={{ fontSize: size, fontWeight: 800, letterSpacing: "-0.8px", textDecoration: "none",
      background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block" }}>
      ApplyCraft
    </a>
  );
}

const NAV_LINKS = [
  { href: "/resume/templates", label: "Resume Builder" },
  { href: "/cover-letter/templates", label: "Cover Letter" },
  { href: "/ats-checker/", label: "ATS Checker" },
];

function SiteNav() {
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 100, background: PAGE_BG + "cc",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo size={24} />
        <nav aria-label="Primary tools" style={{ display: "flex", gap: 4 }} className="ac-shared-nav-links">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} style={{ borderRadius: 8, padding: "9px 12px",
              color: TEXT2, textDecoration: "none", fontSize: 13.5, fontWeight: 650 }}>{l.label}</a>
          ))}
        </nav>
        <a href="/resume/templates" style={{ background: GRAD, color: "#fff", textDecoration: "none",
          borderRadius: 3, padding: "10px 20px", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
          Create my resume
        </a>
      </div>
    </nav>
  );
}

function SiteFooter() {
  const col = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: TEXT3, marginBottom: 16 };
  const lk = { display: "block", fontSize: 13.5, color: TEXT2, textDecoration: "none", padding: "4px 0" };
  return (
    <div style={{ padding: "56px 24px 32px", borderTop: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 40, marginBottom: 48 }}>
          <div style={{ maxWidth: 280 }}>
            <Logo size={20} />
            <p style={{ fontSize: 13, color: TEXT3, lineHeight: 1.75, margin: "12px 0 16px" }}>
              Free resume and cover letter builder for the global job market. No sign-up required.
            </p>
            <a href={`mailto:${EMAIL}`} style={{ fontSize: 13, color: TEXT2, textDecoration: "none" }}>{EMAIL}</a>
          </div>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            <div>
              <div style={col}>Product</div>
              <a href="/resume/templates" style={lk}>Resume Builder</a>
              <a href="/cover-letter/templates" style={lk}>Cover Letter</a>
              <a href="/ats-checker/" style={lk}>ATS Checker</a>
              <a href="/changelog/" style={lk}>Changelog</a>
              <a href="/roadmap/" style={lk}>Roadmap</a>
              <a href="/status/" style={lk}>Status</a>
            </div>
            <div>
              <div style={col}>Company</div>
              <a href="/about/" style={lk}>About &amp; Founder</a>
              <a href="/contact/" style={lk}>Contact</a>
              <a href="https://github.com/biroue10" target="_blank" rel="noopener noreferrer" style={lk}>GitHub</a>
            </div>
            <div>
              <div style={col}>Resources</div>
              <a href="/blog/" style={lk}>Blog</a>
              <a href="/help/" style={lk}>Help Center</a>
              <a href="/resume-builder/" style={lk}>Resume Guide</a>
              <a href="/ats-resume-builder/" style={lk}>ATS Guide</a>
              <a href="/cover-letter-builder/" style={lk}>Cover Letter Guide</a>
              <a href="/free-resume-builder/" style={lk}>Free Resume Builder</a>
              <a href="/student-resume-builder/" style={lk}>Student Resume Builder</a>
              <a href="/canadian-resume-builder/" style={lk}>Canadian Resume Builder</a>
            </div>
            <div>
              <div style={col}>Legal</div>
              <a href="/privacy/" style={lk}>Privacy Policy</a>
              <a href="/privacy/#gdpr" style={lk}>GDPR</a>
              <a href="/privacy/#cookies" style={lk}>Cookies</a>
              <a href="/accessibility/" style={lk}>Accessibility</a>
            </div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20,
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 12.5, color: TEXT3 }}>© {new Date().getFullYear()} ApplyCraft by Biroue Digital Ltd · applycraft.io</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: TEXT3 }}>No account required</span>
            <span style={{ fontSize: 12, color: TEXT3 }}>Optional AI helpers</span>
            <span style={{ fontSize: 12, color: TEXT3 }}>Browser-first editing</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumeView({ d }) {
  return (
    <article style={{ background: PAPER, color: INK, width: "100%", maxWidth: 800, margin: "0 auto",
      borderRadius: 10, boxShadow: "0 24px 70px rgba(0,0,0,0.45)", padding: "44px 48px", boxSizing: "border-box" }}>
      <header style={{ borderBottom: `2px solid ${ACCENT}`, paddingBottom: 14, marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.5px" }}>{d.name || "Resume"}</h1>
        {d.title && <div style={{ fontSize: 15, color: ACCENT, fontWeight: 700, marginTop: 4 }}>{d.title}</div>}
        {Array.isArray(d.contact) && d.contact.length > 0 && (
          <div style={{ fontSize: 12.5, color: MUTE, marginTop: 8 }}>{d.contact.filter(Boolean).join("   •   ")}</div>
        )}
      </header>
      {d.summary && <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "#333", margin: "0 0 18px" }}>{cleanLine(d.summary)}</p>}
      {(d.sections || []).map((s, i) => (
        <section key={i} style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: ACCENT, margin: "0 0 8px" }}>{s.heading}</h2>
          {(s.items || []).map((it, j) => {
            const line = cleanLine(it);
            const bullet = /^\s*[•\-*]\s/.test(line);
            return (
              <div key={j} style={{ fontSize: 13, lineHeight: 1.6, color: "#333", marginBottom: 3,
                paddingLeft: bullet ? 14 : 0, position: "relative" }}>
                {bullet ? line.replace(/^\s*[•\-*]\s/, "• ") : line}
              </div>
            );
          })}
        </section>
      ))}
    </article>
  );
}

function CoverView({ d }) {
  const paras = String(d.body || "").split(/\n{2,}/).filter((p) => p.trim());
  return (
    <article style={{ background: PAPER, color: INK, width: "100%", maxWidth: 760, margin: "0 auto",
      borderRadius: 10, boxShadow: "0 24px 70px rgba(0,0,0,0.45)", padding: "48px 52px", boxSizing: "border-box", lineHeight: 1.7 }}>
      <header style={{ borderBottom: `2px solid ${ACCENT}`, paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 24, fontWeight: 800 }}>{d.name || ""}</div>
        {d.jobTitle && <div style={{ fontSize: 13.5, color: ACCENT, fontWeight: 700 }}>{d.jobTitle}</div>}
        <div style={{ fontSize: 12, color: MUTE, marginTop: 6 }}>{[d.email, d.phone, d.location].filter(Boolean).join("   •   ")}</div>
      </header>
      {d.date && <div style={{ fontSize: 12.5, color: MUTE, marginBottom: 10 }}>{d.date}</div>}
      {(d.recipientName || d.company) && (
        <div style={{ fontSize: 13, marginBottom: 14 }}>
          {d.recipientName && <div style={{ fontWeight: 700 }}>{d.recipientName}</div>}
          {d.recipientTitle && <div>{d.recipientTitle}</div>}
          {d.company && <div>{d.company}</div>}
          {d.companyAddress && <div style={{ color: MUTE }}>{d.companyAddress}</div>}
        </div>
      )}
      {d.subject && <div style={{ fontWeight: 700, marginBottom: 12 }}>Re: {d.subject}</div>}
      {d.opening && <p style={{ margin: "0 0 12px", fontSize: 13.5 }}>Dear {d.opening},</p>}
      {paras.map((p, i) => <p key={i} style={{ margin: "0 0 12px", fontSize: 13.5 }}>{cleanLine(p)}</p>)}
      {d.closing && <p style={{ margin: "0 0 16px", fontSize: 13.5 }}>{cleanLine(d.closing)}</p>}
      <p style={{ margin: 0, fontSize: 13.5 }}>{d.signoff || "Sincerely"},</p>
      <p style={{ margin: "2px 0 0", fontSize: 13.5, fontWeight: 700 }}>{d.name || ""}</p>
    </article>
  );
}

export default function SharedResume() {
  const [doc, setDoc] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const frag = window.location.hash.replace(/^#/, "");
    setDoc(frag ? decodeShare(frag) : null);
    setReady(true);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, display: "flex", flexDirection: "column",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <SiteNav />

      <main style={{ flex: 1, padding: "32px 16px 56px" }}>
        {!ready ? (
          <div style={{ color: TEXT3, textAlign: "center", padding: 60 }}>Loading…</div>
        ) : !doc ? (
          <div style={{ color: TEXT2, textAlign: "center", padding: 60, maxWidth: 460, margin: "0 auto" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: TEXT1, marginBottom: 8 }}>This shared link is empty or invalid.</div>
            <div style={{ fontSize: 14, marginBottom: 20 }}>Ask the sender for a fresh link, or build your own resume for free.</div>
            <a href="/resume/templates" style={{ background: GRAD, color: "#fff", textDecoration: "none",
              borderRadius: 3, padding: "11px 22px", fontSize: 14, fontWeight: 700, display: "inline-block" }}>
              Build my resume — free
            </a>
          </div>
        ) : doc.k === "cover" ? <CoverView d={doc.d || {}} /> : <ResumeView d={doc.d || {}} />}
      </main>

      <SiteFooter />
    </div>
  );
}
