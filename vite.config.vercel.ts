import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vercel-specific config (no Cloudflare plugins)
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 5000,
    outDir: "dist",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

