import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import ReactHelmetAsync from "react-helmet-async/lib/index.js";
import {
  HydrationBoundary,
  QueryClientProvider,
  dehydrate,
  type DehydratedState,
  type QueryClient,
} from "@tanstack/react-query";
import App from "./src/App";
import { AuthProvider } from "./src/lib/auth";
import {
  createQueryClient,
  setQueryClientInstance,
} from "./src/lib/queryClient";

const { HelmetProvider } = ReactHelmetAsync as any;

type RenderResult = {
  appHtml: string;
  dehydratedState?: DehydratedState | null;
  helmet: {
    title: string;
    meta: string;
    link: string;
    script: string;
  };
};

async function prefetchForUrl(
  url: string,
  queryClient: QueryClient,
  origin: string,
) {
  const urlObj = new URL(url, origin);
  const path = urlObj.pathname;

  const cafeMatch = /^\/cafe\/([^/]+)/i.exec(path || "");
  if (cafeMatch?.[1]) {
    const cafeId = cafeMatch[1];
    const lang = "en";
    try {
      const apiUrl = `${origin}/api/cafes/${encodeURIComponent(
        cafeId,
      )}?lang=${lang}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        queryClient.setQueryData(["/api/cafes", cafeId, lang], data);
      }
    } catch (_err) {
      // Ignore fetch failures during SSR prefetch; client will retry as needed.
    }
  }
}

export async function render(
  url: string,
  options?: { origin?: string },
): Promise<RenderResult> {
  const origin =
    options?.origin ||
    process.env.PUBLIC_ORIGIN ||
    process.env.PUBLIC_URL ||
    "http://localhost:5000";

  const queryClient = createQueryClient();
  setQueryClientInstance(queryClient);

  await prefetchForUrl(url, queryClient, origin);
  const dehydratedState = dehydrate(queryClient);

  const helmetContext: any = {};
  const appHtml = renderToString(
    <HelmetProvider context={helmetContext}>
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={dehydratedState}>
          <Router ssrPath={url}>
            <AuthProvider>
              <App queryClient={queryClient} />
            </AuthProvider>
          </Router>
        </HydrationBoundary>
      </QueryClientProvider>
    </HelmetProvider>,
  );

  const helmet = helmetContext?.helmet;
  return {
    appHtml,
    dehydratedState,
    helmet: {
      title: helmet?.title?.toString?.() ?? "",
      meta: helmet?.meta?.toString?.() ?? "",
      link: helmet?.link?.toString?.() ?? "",
      script: helmet?.script?.toString?.() ?? "",
    },
  };
}
