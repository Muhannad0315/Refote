import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
    include: [
      "src/**/__tests__/**/*.test.{js,ts,jsx,tsx}",
      "src/**/__tests__/**/*.spec.{js,ts,jsx,tsx}",
      "src/**/__tests__/**/*.spec.*",
    ],
  },
});
