import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { type DehydratedState } from "@tanstack/react-query";

export async function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  const serverSsrEntry = path.resolve(__dirname, "server", "entry-server.js");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  if (!fs.existsSync(serverSsrEntry)) {
    throw new Error(
      `Could not find SSR server entry: ${serverSsrEntry}, make sure to build SSR output first`,
    );
  }

  const templatePath = path.resolve(distPath, "index.html");
  const template = await fs.promises.readFile(templatePath, "utf-8");
  const serverEntryUrl = pathToFileURL(serverSsrEntry).href;

  const serverEntry = (await import(serverEntryUrl)) as {
    render: (
      url: string,
      options?: { origin?: string },
    ) =>
      | {
          appHtml: string;
          dehydratedState?: DehydratedState | null;
          helmet?: {
            title?: string;
            meta?: string;
            link?: string;
            script?: string;
          };
        }
      | Promise<{
          appHtml: string;
          dehydratedState?: DehydratedState | null;
          helmet?: {
            title?: string;
            meta?: string;
            link?: string;
            script?: string;
          };
        }>;
  };
  if (typeof serverEntry?.render !== "function") {
    throw new Error(`SSR entry does not export a render(url) function`);
  }

  app.use(express.static(distPath));

  // fall through to index.html for non-API routes so the SPA router can
  // handle client-side routes. Allow API routes to pass through to server
  // handlers by calling `next()`.
  app.use("*", async (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    try {
      const origin = `${req.protocol}://${req.get("host")}`;
      const rendered = await serverEntry.render(req.originalUrl || req.url, {
        origin,
      });
      const appHtml = rendered?.appHtml ?? "";
      const helmet = rendered?.helmet ?? {
        title: "",
        meta: "",
        link: "",
        script: "",
      };
      const stateJson = JSON.stringify(
        rendered?.dehydratedState ?? null,
      ).replace(/</g, "\\u003c");
      const stateScript = `window.__REACT_QUERY_STATE__=${stateJson};`;

      const html = template
        .replace("<!--helmet-title-->", helmet.title || "")
        .replace("<!--helmet-meta-->", helmet.meta || "")
        .replace("<!--helmet-link-->", helmet.link || "")
        .replace("<!--helmet-script-->", helmet.script || "")
        .replace("<!--app-html-->", appHtml || "")
        .replace("<!--react-query-state-->", stateScript || "");
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      next(error);
    }
  });
}
