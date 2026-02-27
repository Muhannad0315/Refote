import { hydrateRoot, createRoot } from "react-dom/client";
import ReactHelmetAsync from "react-helmet-async/lib/index.js";
import { HydrationBoundary, QueryClientProvider } from "@tanstack/react-query";
import App from "./src/App";
import "./src/index.css";
import { AuthProvider } from "./src/lib/auth";
import {
  createQueryClient,
  setQueryClientInstance,
} from "./src/lib/queryClient";

const { HelmetProvider } = ReactHelmetAsync as any;

const dehydratedState = (window as any).__REACT_QUERY_STATE__ ?? undefined;
const clientQueryClient = createQueryClient();
setQueryClientInstance(clientQueryClient);

const app = (
  <HelmetProvider>
    <QueryClientProvider client={clientQueryClient}>
      <HydrationBoundary state={dehydratedState}>
        <AuthProvider>
          <App queryClient={clientQueryClient} />
        </AuthProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  </HelmetProvider>
);

const container = document.getElementById("root");
if (!container) {
  throw new Error("Missing #root container for client hydration");
}

if (container.hasChildNodes()) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
