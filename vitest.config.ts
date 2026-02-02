import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["client/src/setupTests.ts"],
    include: [
      "client/src/**/__tests__/**/*.test.{js,ts,jsx,tsx}",
      "client/src/**/__tests__/**/*.spec.{js,ts,jsx,tsx}",
    ],
  },
});
