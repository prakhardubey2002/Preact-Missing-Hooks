import { defineConfig } from "vitest/config";
import path from "node:path";

const rootDir = __dirname;

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "preact/hooks",
        replacement: path.resolve(rootDir, "node_modules/react"),
      },
      {
        find: "preact",
        replacement: path.resolve(rootDir, "tests/react-adapter.tsx"),
      },
      {
        find: "@testing-library/preact",
        replacement: path.resolve(rootDir, "node_modules/@testing-library/react"),
      },
      { find: "@", replacement: path.resolve(rootDir, "./src") },
    ],
  },
  test: {
    name: "react",
    globals: true,
    environment: "jsdom",
    setupFiles: [path.resolve(rootDir, "tests/setup-react.ts")],
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 10000,
    hookTimeout: 10000,
    poolOptions: {
      threads: { maxThreads: 8, minThreads: 1 },
    },
  },
});
