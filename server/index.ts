import express, { type Request, Response, NextFunction } from "express";
import * as path from "path";
import dotenv from "dotenv";

// Load server-specific .env (server/.env) if present
dotenv.config({ path: path.join(process.cwd(), "server", ".env") });
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Increase JSON body size to allow base64 image payloads from the client
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "10mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Enforce presence of GOOGLE_API_KEY at startup — this app requires live Places data.
  const serverApiKey = process.env.GOOGLE_API_KEY;
  if (!serverApiKey) {
    console.warn(
      "GOOGLE_API_KEY missing — Google Places features may not work.",
    );
  } else {
    // console.log(
    //   "Refote: Using Google Places API as the ONLY cafe data source",
    // );
  }

  // Note: Do not load `server/test-location` at startup — dev location overrides
  // are evaluated per-request to avoid caching and silent fallbacks.

  // Production-only global redirect to canonical HTTPS + WWW host.
  // Skip for internal/localhost/Railway hosts to avoid breaking health checks.
  if (process.env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      const host = String(req.headers.host || "").toLowerCase();
      const proto = String(
        req.headers["x-forwarded-proto"] || "",
      ).toLowerCase();

      // Do not redirect internal or local hosts (Railway, localhost, loopback)
      if (
        host === "localhost" ||
        host.startsWith("127.") ||
        host.endsWith(".railway.app") ||
        host.endsWith(".railway.sh")
      ) {
        return next();
      }

      // If already on the canonical host with https, do nothing
      if (proto === "https" && host === "www.refote.com") return next();

      // Redirect when the request is plain http, or host is the non-www domain
      const shouldRedirect = proto === "http" || host === "refote.com";
      if (!shouldRedirect) return next();

      const destination = `https://www.refote.com${req.originalUrl || req.url}`;
      return res.redirect(301, destination);
    });
  }

  // Ensure `photo_reference` column exists in `coffee_places` (helpful for first-run)
  try {
    const { createServerSupabaseClient } = await import("./supabaseClient");
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("coffee_places")
      .select("photo_reference")
      .limit(1);
    if (error) {
      console.warn(
        "photo_reference column appears missing in coffee_places — please run the DB migration to add it (supabase/migrations/20260129_add_photo_reference.sql)",
      );
    } else {
      try {
        console.log("photo_reference column exists — skipping creation");
      } catch (_) {}
    }
  } catch (err) {
    // non-fatal: log and continue
    console.error("Failed to verify photo_reference column:", err);
  }

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error(err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  // `reusePort` is not supported on some platforms (notably Windows).
  // Avoid passing it on Windows to prevent `ENOTSUP` errors.
  const listenOptions: any = { port, host: "0.0.0.0" };
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }

  httpServer.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
