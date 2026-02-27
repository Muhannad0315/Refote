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
const MANAGED_ATTR = "data-refote-seo";
const MANAGED_VALUE = "1";
const KEY_ATTR = "data-refote-key";

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

function upsertMetaTag(
  key: string,
  attrs: { name?: string; property?: string },
  content: string,
  activeKeys: Set<string>,
) {
  const sanitized = clean(content);
  if (!sanitized || !isBrowser()) return;
  const selector = `meta[${KEY_ATTR}="${key}"]`;
  let tag = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement("meta");
    document.head.appendChild(tag);
  }

  tag.setAttribute(MANAGED_ATTR, MANAGED_VALUE);
  tag.setAttribute(KEY_ATTR, key);
  if (attrs.name) {
    tag.setAttribute("name", attrs.name);
    tag.removeAttribute("property");
  }
  if (attrs.property) {
    tag.setAttribute("property", attrs.property);
    tag.removeAttribute("name");
  }
  tag.setAttribute("content", sanitized);
  activeKeys.add(key);
}

function upsertLinkTag(
  key: string,
  rel: string,
  href: string,
  activeKeys: Set<string>,
) {
  const sanitized = clean(href);
  if (!sanitized || !isBrowser()) return;
  const selector = `link[${KEY_ATTR}="${key}"]`;
  let tag = document.head.querySelector(selector) as HTMLLinkElement | null;

  if (!tag) {
    tag = document.createElement("link");
    document.head.appendChild(tag);
  }

  tag.setAttribute(MANAGED_ATTR, MANAGED_VALUE);
  tag.setAttribute(KEY_ATTR, key);
  tag.setAttribute("rel", rel);
  tag.setAttribute("href", sanitized);
  activeKeys.add(key);
}

function upsertJsonLdScript(
  key: string,
  payload: unknown,
  activeKeys: Set<string>,
) {
  if (!isBrowser()) return;
  const selector = `script[type="application/ld+json"][${KEY_ATTR}="${key}"]`;
  let tag = document.head.querySelector(selector) as HTMLScriptElement | null;

  if (!tag) {
    tag = document.createElement("script");
    tag.type = "application/ld+json";
    document.head.appendChild(tag);
  }

  tag.setAttribute(MANAGED_ATTR, MANAGED_VALUE);
  tag.setAttribute(KEY_ATTR, key);
  tag.textContent = JSON.stringify(payload);
  activeKeys.add(key);
}

function removeStaleManagedTags(activeKeys: Set<string>) {
  if (!isBrowser()) return;
  const managed = document.head.querySelectorAll(
    `[${MANAGED_ATTR}="${MANAGED_VALUE}"]`,
  );
  managed.forEach((node) => {
    const key = node.getAttribute(KEY_ATTR);
    if (!key || !activeKeys.has(key)) {
      node.remove();
    }
  });
}

function ensureSeoDocument(input: SeoDocument): SeoDocument {
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

export const HeadManager = {
  apply(documentModel: SeoDocument) {
    if (!isBrowser()) return;
    const doc = ensureSeoDocument(documentModel);
    const activeKeys = new Set<string>();

    document.title = withDefault(doc.title, DEFAULT_TITLE);

    upsertMetaTag(
      "meta:name:description",
      { name: "description" },
      doc.description,
      activeKeys,
    );
    upsertMetaTag(
      "meta:name:robots",
      { name: "robots" },
      doc.robots,
      activeKeys,
    );

    upsertLinkTag("link:canonical", "canonical", doc.canonicalUrl, activeKeys);

    upsertMetaTag(
      "meta:property:og:title",
      { property: "og:title" },
      doc.openGraph.title,
      activeKeys,
    );
    upsertMetaTag(
      "meta:property:og:description",
      { property: "og:description" },
      doc.openGraph.description,
      activeKeys,
    );
    upsertMetaTag(
      "meta:property:og:url",
      { property: "og:url" },
      doc.canonicalUrl,
      activeKeys,
    );
    upsertMetaTag(
      "meta:property:og:type",
      { property: "og:type" },
      doc.openGraph.type,
      activeKeys,
    );
    upsertMetaTag(
      "meta:property:og:site_name",
      { property: "og:site_name" },
      doc.openGraph.siteName,
      activeKeys,
    );
    upsertMetaTag(
      "meta:property:og:image",
      { property: "og:image" },
      doc.openGraph.image,
      activeKeys,
    );

    upsertMetaTag(
      "meta:name:twitter:card",
      { name: "twitter:card" },
      doc.twitter.card,
      activeKeys,
    );
    upsertMetaTag(
      "meta:name:twitter:title",
      { name: "twitter:title" },
      doc.twitter.title,
      activeKeys,
    );
    upsertMetaTag(
      "meta:name:twitter:description",
      { name: "twitter:description" },
      doc.twitter.description,
      activeKeys,
    );
    upsertMetaTag(
      "meta:name:twitter:image",
      { name: "twitter:image" },
      doc.twitter.image,
      activeKeys,
    );

    if (doc.pagination?.prevUrl) {
      upsertLinkTag(
        "link:prev",
        "prev",
        normalizeCanonicalUrl(doc.pagination.prevUrl),
        activeKeys,
      );
    }
    if (doc.pagination?.nextUrl) {
      upsertLinkTag(
        "link:next",
        "next",
        normalizeCanonicalUrl(doc.pagination.nextUrl),
        activeKeys,
      );
    }

    if (!hasNoindex(doc.robots) && Array.isArray(doc.jsonLd)) {
      doc.jsonLd.forEach((block, index) => {
        upsertJsonLdScript(`jsonld:${index}`, block, activeKeys);
      });
    }

    removeStaleManagedTags(activeKeys);
  },
};

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
