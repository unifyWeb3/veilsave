import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    pool: "vmThreads",
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 20_000,
    restoreMocks: true,
    clearMocks: true,
    css: true,
  },
});
