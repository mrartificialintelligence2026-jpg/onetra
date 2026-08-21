const ORIGIN = "https://onetra.vercel.app";

export function setPageMeta({ title, description, path }) {
  const url = `${ORIGIN}${path || "/"}`;
  document.title = title;
  upsert("name", "description", description);
  upsert("rel", "canonical", url, "link");
  upsert("property", "og:title", title);
  upsert("property", "og:description", description);
  upsert("property", "og:url", url);
  upsert("name", "twitter:title", title);
  upsert("name", "twitter:description", description);
}

function upsert(attr, key, value, tag = "meta") {
  const selector = tag === "link" ? `link[${attr}="${key}"]` : `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(tag);
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  if (tag === "link") el.setAttribute("href", value);
  else el.setAttribute("content", value);
}
