import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps asset paths relative so it also works on GitHub Pages later.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
