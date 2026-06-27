import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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

export default defineConfig({
  plugins: [react()],
  base: "/",
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
