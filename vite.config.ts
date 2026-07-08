import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static SPA. `base: "./"` keeps asset paths relative so the build works from
// any host path (GitHub Pages subpaths, Netlify, plain file serving).
export default defineConfig({
  base: "./",
  plugins: [react()],
});
