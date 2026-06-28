import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// Per-route language metadata. Drives both the <html> attributes and hreflang
// injection for every React route vite-react-ssg prebuilds. Static pages in
// /public (e.g. /resume-in-arabic/) bypass this pipeline and are edited directly.
const ROUTE_LANG = {
  "/":                  { lang: "en" },
  "/resume-in-arabic/": { lang: "ar", dir: "rtl" },
  "/resume-in-french/": { lang: "fr" },
};

// Reciprocal hreflang set — every language variant points to all siblings.
const HREFLANG_LINKS = [
  `<link rel="alternate" hreflang="en" href="https://applycraft.io/" />`,
  `<link rel="alternate" hreflang="ar" href="https://applycraft.io/resume-in-arabic/" />`,
  `<link rel="alternate" hreflang="fr" href="https://applycraft.io/resume-in-french/" />`,
  `<link rel="alternate" hreflang="x-default" href="https://applycraft.io/" />`,
].join("\n    ");

const isAnalyze = process.env.ANALYZE === "true";

export default defineConfig({
  plugins: [
    react(),
    // Bundle visualizer — only emitted when ANALYZE=true to avoid cluttering CI.
    isAnalyze && visualizer({
      filename: "dist/bundle-report.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: "treemap",
    }),
  ].filter(Boolean),
  base: "/",
  build: {
    // Report compressed sizes in the build output.
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // React and router: always needed, extract once so SSG + app share it.
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router-dom/") ||
            id.includes("/react-router/")
          ) {
            return "react-vendor";
          }
          // jsPDF, docx, html2canvas, dompurify: intentionally NOT assigned here.
          //
          // Assigning them to named chunks causes Rollup to place __vite__mapDeps
          // (the module-preload helper) inside the jspdf chunk and then add a
          // *static* import of that chunk from the app entry. This forces the
          // browser to download all 391 KB of jsPDF before the app can execute —
          // defeating the dynamic import() calls in the source entirely.
          //
          // Without a manualChunks assignment Rollup treats these as genuine lazy
          // chunks: they are downloaded only when the user first requests PDF or
          // DOCX export, saving ~480 KB gzip on initial load.
        },
      },
    },
  },
  ssgOptions: {
    onBeforePageRender(path, html) {
      const { lang = "en", dir } = ROUTE_LANG[path] ?? {};
      const htmlTag = dir
        ? `<html lang="${lang}" dir="${dir}">`
        : `<html lang="${lang}">`;
      return html
        .replace(/<html[^>]*>/, htmlTag)
        .replace("</head>", `    ${HREFLANG_LINKS}\n  </head>`);
    },
  },
});
