type SeoPayload = {
  title: string;
  description: string;
  keywords: string;
};

function upsertMetaTag(
  selector: string,
  attrs: { name?: string; property?: string },
  content: string,
) {
  if (!content) return;
  let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    if (attrs.name) tag.setAttribute("name", attrs.name);
    if (attrs.property) tag.setAttribute("property", attrs.property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export function setSeoMeta({ title, description, keywords }: SeoPayload) {
  if (title) document.title = title;

  upsertMetaTag(
    'meta[name="description"]',
    { name: "description" },
    description,
  );
  upsertMetaTag('meta[name="keywords"]', { name: "keywords" }, keywords);

  upsertMetaTag('meta[property="og:title"]', { property: "og:title" }, title);
  upsertMetaTag(
    'meta[property="og:description"]',
    { property: "og:description" },
    description,
  );
  upsertMetaTag('meta[property="og:type"]', { property: "og:type" }, "website");
  upsertMetaTag(
    'meta[property="og:site_name"]',
    { property: "og:site_name" },
    "Refote",
  );

  upsertMetaTag(
    'meta[name="twitter:card"]',
    { name: "twitter:card" },
    "summary_large_image",
  );
  upsertMetaTag('meta[name="twitter:title"]', { name: "twitter:title" }, title);
  upsertMetaTag(
    'meta[name="twitter:description"]',
    { name: "twitter:description" },
    description,
  );
}
