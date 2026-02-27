export type SeoDocument = {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  openGraph: {
    title: string;
    description: string;
    url: string;
    type: string;
    siteName: string;
    image: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
    image: string;
  };
  jsonLd?: unknown[];
  pagination?: {
    prevUrl?: string;
    nextUrl?: string;
  };
};

export type SeoOverridePayload = Partial<
  Omit<SeoDocument, "openGraph" | "twitter">
> & {
  openGraph?: Partial<SeoDocument["openGraph"]>;
  twitter?: Partial<SeoDocument["twitter"]>;
};

type LegacySeoPayload = {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  robots?: string;
  url?: string;
  image?: string;
  type?: string;
  siteName?: string;
  card?: string;
  openGraph?: Partial<SeoDocument["openGraph"]>;
  twitter?: Partial<SeoDocument["twitter"]>;
  jsonLd?: unknown[];
  pagination?: SeoDocument["pagination"];
};

const DEFAULT_TITLE = "Refote – Discover Cafes, Coffee & Drinks Near You";
const DEFAULT_DESCRIPTION =
  "Discover cafes, coffee shops, and drinks near you with Refote. Check in, rate drinks, explore coffee tasting notes, and find your next favorite cafe.";
const DEFAULT_CANONICAL = "https://www.refote.com/";
const DEFAULT_OG_IMAGE = "https://www.refote.com/android-chrome-512x512.png";
const DEFAULT_ROBOTS = "index,follow";

function clean(value?: string | null): string {
  return String(value ?? "").trim();
}

function withDefault(value: string | undefined, fallback: string): string {
  const sanitized = clean(value);
  return sanitized || fallback;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function hasNoindex(robots: string): boolean {
  return /(^|,)\s*noindex\s*(,|$)/i.test(robots);
}

export function normalizeCanonicalUrl(input?: string): string {
  const defaultBase = "https://www.refote.com/";
  const rawInput = clean(input);

  let url: URL;
  try {
    const base = isBrowser() ? window.location.href : defaultBase;
    url = new URL(rawInput || defaultBase, base);
  } catch (_e) {
    url = new URL(defaultBase);
  }

  url.protocol = "https:";
  url.hostname = "www.refote.com";
  url.port = "";
  url.hash = "";

  const keepPage = clean(url.searchParams.get("page"));
  url.search = "";
  if (keepPage) {
    url.searchParams.set("page", keepPage);
  }

  let normalizedPath = url.pathname || "/";
  if (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
    normalizedPath = normalizedPath.replace(/\/+$/, "");
    if (!normalizedPath) normalizedPath = "/";
  }
  url.pathname = normalizedPath;

  return url.toString();
}

export function ensureSeoDocument(input: SeoDocument): SeoDocument {
  const title = withDefault(input.title, DEFAULT_TITLE);
  const description = withDefault(input.description, DEFAULT_DESCRIPTION);
  const canonicalUrl = normalizeCanonicalUrl(
    input.canonicalUrl || DEFAULT_CANONICAL,
  );
  const robots = withDefault(input.robots, DEFAULT_ROBOTS);

  const openGraph = {
    title: withDefault(input.openGraph?.title, title),
    description: withDefault(input.openGraph?.description, description),
    url: canonicalUrl,
    type: withDefault(input.openGraph?.type, "website"),
    siteName: withDefault(input.openGraph?.siteName, "Refote"),
    image: withDefault(input.openGraph?.image, DEFAULT_OG_IMAGE),
  };

  const twitter = {
    card: withDefault(input.twitter?.card, "summary_large_image"),
    title: withDefault(input.twitter?.title, title),
    description: withDefault(input.twitter?.description, description),
    image: withDefault(input.twitter?.image, DEFAULT_OG_IMAGE),
  };

  const jsonLd = hasNoindex(robots) ? undefined : input.jsonLd;

  return {
    title,
    description,
    canonicalUrl,
    robots,
    openGraph,
    twitter,
    jsonLd,
    pagination: input.pagination,
  };
}

let overrideSetter: ((payload: SeoOverridePayload | null) => void) | null =
  null;

export function registerSeoOverrideSetter(
  setter: (payload: SeoOverridePayload | null) => void,
) {
  overrideSetter = setter;
  return () => {
    if (overrideSetter === setter) {
      overrideSetter = null;
    }
  };
}

export function setSeoOverride(payload: SeoOverridePayload | null) {
  if (overrideSetter) {
    overrideSetter(payload);
  }
}

export function setSeoMeta(payload: LegacySeoPayload) {
  const openGraph: Partial<SeoDocument["openGraph"]> = {
    ...payload.openGraph,
  };
  const twitter: Partial<SeoDocument["twitter"]> = {
    ...payload.twitter,
  };

  if (payload.title && !openGraph.title) openGraph.title = payload.title;
  if (payload.description && !openGraph.description)
    openGraph.description = payload.description;
  if (payload.canonicalUrl && !openGraph.url)
    openGraph.url = payload.canonicalUrl;
  if (payload.url && !openGraph.url) openGraph.url = payload.url;
  if (payload.type && !openGraph.type) openGraph.type = payload.type;
  if (payload.siteName && !openGraph.siteName)
    openGraph.siteName = payload.siteName;
  if (payload.image && !openGraph.image) openGraph.image = payload.image;

  if (payload.card && !twitter.card) twitter.card = payload.card;
  if (payload.title && !twitter.title) twitter.title = payload.title;
  if (payload.description && !twitter.description)
    twitter.description = payload.description;
  if (payload.image && !twitter.image) twitter.image = payload.image;

  setSeoOverride({
    title: payload.title,
    description: payload.description,
    canonicalUrl: payload.canonicalUrl || payload.url,
    robots: payload.robots,
    openGraph,
    twitter,
    jsonLd: payload.jsonLd,
    pagination: payload.pagination,
  });
}

export const SeoDefaults = {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  canonicalUrl: DEFAULT_CANONICAL,
  robots: DEFAULT_ROBOTS,
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: DEFAULT_CANONICAL,
    type: "website",
    siteName: "Refote",
    image: DEFAULT_OG_IMAGE,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    image: DEFAULT_OG_IMAGE,
  },
} as const;
