// Official Anthropic updates: no RSS, so use sitemap + newest paths under /news/, /engineering/, /research/.
import { httpGet, sortByDateDesc, clampText, safeDate } from "./lib/util.js";
import { parseSitemap } from "./lib/xml.js";

const SITEMAPS = [
  "https://www.anthropic.com/sitemap.xml",
];

const PATH_PREFIXES = [
  { prefix: "/news/",        source: "Anthropic" },
  { prefix: "/engineering/", source: "Anthropic Eng" },
  { prefix: "/research/",    source: "Anthropic Research" },
];

function prettyTitleFromUrl(loc) {
  try {
    const u = new URL(loc);
    const slug = u.pathname.replace(/^\/[^/]+\//, "").replace(/\/$/, "");
    if (!slug) return u.pathname;
    const small = new Set(["a","an","and","as","at","but","by","for","in","of","on","or","the","to","up","vs","via","with"]);
    return slug
      .split("-")
      .map((w, i) => {
        if (!w) return w;
        if (i !== 0 && small.has(w.toLowerCase())) return w.toLowerCase();
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(" ");
  } catch {
    return loc;
  }
}

export async function fetchAnthropic() {
  const out = [];
  for (const sm of SITEMAPS) {
    let xml;
    try {
      xml = await httpGet(sm);
    } catch (e) {
      console.warn(`    sitemap fail ${sm}: ${e.message}`);
      continue;
    }
    const entries = parseSitemap(xml);
    for (const e of entries) {
      if (!e.loc) continue;
      const match = PATH_PREFIXES.find((p) => e.loc.includes(p.prefix));
      if (!match) continue;
      // skip index pages
      const u = new URL(e.loc);
      if (u.pathname.replace(match.prefix, "").replace(/\/$/, "") === "") continue;
      out.push({
        title: prettyTitleFromUrl(e.loc),
        url: e.loc,
        source: match.source,
        published: safeDate(e.lastmod) || null,
        summary: "",
      });
    }
  }
  return sortByDateDesc(out).slice(0, 20);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  fetchAnthropic().then((r) => console.log(JSON.stringify(r, null, 2)));
}
