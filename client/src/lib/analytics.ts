declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as
  | string
  | undefined;

let lastTrackedPath = "";

export function trackPageView(path: string) {
  if (!GA_MEASUREMENT_ID) return;
  if (!window.gtag) return;
  if (path === lastTrackedPath) return;

  lastTrackedPath = path;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
