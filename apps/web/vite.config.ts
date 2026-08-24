import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const fheIsolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: false,
  },
  server: {
    port: 4173,
    strictPort: false,
    headers: fheIsolationHeaders,
  },
  preview: { headers: fheIsolationHeaders },
});
