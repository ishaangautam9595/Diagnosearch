import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      "server-only": path.resolve(import.meta.dirname, "tests/helpers/empty.ts"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["tests/helpers/setup.ts"],
    include: ["tests/**/*.test.ts"],
    fileParallelism: false, // integration tests share one database
    testTimeout: 30_000,
  },
});
