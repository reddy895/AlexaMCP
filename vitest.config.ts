import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "tests/security/**/*.test.ts",
      "tests/e2e/**/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "whisper.cpp/**",
    ],
    passWithNoTests: true,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
