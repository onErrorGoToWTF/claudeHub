// Tiny tolerant RSS/Atom/sitemap parser.
// Not a general XML parser — it targets feed formats only.

import { decodeEntities, stripTags } from "./util.js";

function stripCdata(s) {
  if (!s) return "";
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function firstMatch(block, ...tagNames) {
  for (const tag of tagNames) {
    const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
    const m = block.match(re);
    if (m) return m[1];
  }
  return "";
}

function attrOf(block, tag, attr) {
  const re = new RegExp(`<${tag}\\b([^>]*)\\/?>`, "i");
  const m = block.match(re);
  if (!m) return "";
  const attrRe = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, "i");
  const a = m[1].match(attrRe);
  return a ? a[1] : "";
}

function allAttr(block, tag, attr) {
  const out = [];
  const re = new RegExp(`<${tag}\\b([^>]*)\\/?>`, "gi");
  let m;
  while ((m = re.exec(block)) !== null) {
    const attrRe = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, "i");
    const a = m[1].match(attrRe);
    if (a) out.push(a[1]);
  }
  return out;
}

function splitItems(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi");
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[0]);
  return out;
}

export function parseFeed(xml) {
  if (!xml) return [];
  const isAtom = /<feed\b/i.test(xml);
  const raw = isAtom ? splitItems(xml, "entry") : splitItems(xml, "item");
  return raw.map((block) => {
    const title = stripTags(stripCdata(firstMatch(block, "title")));
    let link = "";
    if (isAtom) {
      // Prefer <link rel="alternate" href="..."> then any <link href="...">
      const altMatch = block.match(/<link\b[^>]*\brel="alternate"[^>]*\bhref="([^"]+)"/i);
      link = altMatch ? altMatch[1] : attrOf(block, "link", "href");
    } else {
      link = stripTags(stripCdata(firstMatch(block, "link")));
    }
    const pub =
      firstMatch(block, "pubDate", "published", "updated", "dc:date") || "";
    const rawSummary =
      firstMatch(block, "content:encoded", "description", "summary", "content") || "";
    const summary = stripTags(stripCdata(rawSummary));
    const id = firstMatch(block, "guid", "id") || link;

    // Media thumbnails (YouTube uses media:thumbnail)
    const thumb =
      attrOf(block, "media:thumbnail", "url") ||
      attrOf(block, "itunes:image", "href") ||
      "";

    return {
      id: decodeEntities(id.trim()),
      title,
      url: decodeEntities(link.trim()),
      published: pub ? pub.trim() : "",
      summary,
      thumbnail: thumb,
      raw: block,
    };
  });
}

export function parseSitemap(xml) {
  if (!xml) return [];
  const urls = splitItems(xml, "url");
  return urls.map((u) => ({
    loc: stripTags(firstMatch(u, "loc")).trim(),
    lastmod: firstMatch(u, "lastmod").trim() || "",
  }));
}

// Expose primitives for callers that want them
export { splitItems, firstMatch, attrOf, allAttr, stripCdata };
