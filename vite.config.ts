import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      // Use the legacy build entry points for TanStack packages to avoid
      // Vite/esbuild issues resolving conditional modern exports on some
      // environments (e.g. Replit). These files exist under node_modules.
      "@tanstack/react-query": path.resolve(
        import.meta.dirname,
        "node_modules",
        "@tanstack",
        "react-query",
        "build",
        "legacy",
      ),
      "@tanstack/query-core": path.resolve(
        import.meta.dirname,
        "node_modules",
        "@tanstack",
        "query-core",
        "build",
        "legacy",
      ),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  optimizeDeps: {
    // Only include the package names — avoid explicit internal paths which
    // may not be present in the package `exports` and cause resolver errors.
    include: ["@tanstack/react-query", "@tanstack/query-core"],
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
