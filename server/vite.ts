import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { type DehydratedState } from "@tanstack/react-query";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = await vite.transformIndexHtml(url, template);

      const { render } = (await vite.ssrLoadModule("/entry-server.tsx")) as {
        render: (
          url: string,
          options?: { origin?: string },
        ) => Promise<{
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

      const origin = `${req.protocol}://${req.get("host")}`;
      const rendered = await render(url, { origin });

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

      const page = template
        .replace("<!--helmet-title-->", helmet.title || "")
        .replace("<!--helmet-meta-->", helmet.meta || "")
        .replace("<!--helmet-link-->", helmet.link || "")
        .replace("<!--helmet-script-->", helmet.script || "")
        .replace("<!--app-html-->", appHtml)
        .replace("<!--react-query-state-->", stateScript || "");
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
