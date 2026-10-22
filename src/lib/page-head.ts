export function pageHead(title: string, description: string) {
  return { meta: [{ title: `${title} — Crypto Metrics` }, { name: "description", content: description }, { property: "og:title", content: `${title} — Crypto Metrics` }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
}