import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "./tests/preact-as-react.ts"),
    },
  },
  test: {
    name: "preact",
    globals: true,
    environment: "jsdom",
    setupFiles: [],
    include: ["tests/**/*.test.{ts,tsx}"],
    poolOptions: {
      threads: { maxThreads: 8, minThreads: 1 },
    },
  },
});
