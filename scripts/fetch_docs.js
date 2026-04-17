// Official Anthropic docs from platform.claude.com sitemap.
// Only English tutorial-heavy prefixes; skips pure API reference and locale mirrors.
import { httpGet, sortByDateDesc, safeDate } from "./lib/util.js";
import { parseSitemap } from "./lib/xml.js";

const SITEMAP = "https://platform.claude.com/sitemap.xml";

const INCLUDE_PREFIXES = [
  { prefix: "/docs/en/build-with-claude/",  source: "Anthropic Docs" },
  { prefix: "/docs/en/agents-and-tools/",   source: "Anthropic Docs" },
  { prefix: "/docs/en/test-and-evaluate/",  source: "Anthropic Docs" },
  { prefix: "/docs/en/managed-agents/",     source: "Anthropic Docs" },
  { prefix: "/docs/en/release-notes/",      source: "Release Notes" },
];

function prettyTitleFromUrl(loc) {
  try {
    const u = new URL(loc);
    const parts = u.pathname.split("/").filter(Boolean);
    const slug = parts[parts.length - 1] || "";
    if (!slug || slug === "overview") {
      const section = parts[parts.length - 2] || "";
      return titleize(section) + (slug === "overview" ? " — Overview" : "");
    }
    return titleize(slug);
  } catch {
    return loc;
  }
}

function titleize(slug) {
  const small = new Set(["a","an","and","as","at","but","by","for","in","of","on","or","the","to","up","vs","via","with"]);
  const acro = new Set(["api","sdk","cli","mcp","url","json","http","https","ai","ui","ux","pdf","csv","rag","llm","io","ide","jwt","oauth"]);
  return slug
    .split("-")
    .map((w, i) => {
      if (!w) return w;
      const lo = w.toLowerCase();
      if (acro.has(lo)) return lo.toUpperCase();
      if (i !== 0 && small.has(lo)) return lo;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

export async function fetchDocs() {
  let xml;
  try {
    xml = await httpGet(SITEMAP);
  } catch (e) {
    console.warn(`    docs sitemap fail: ${e.message}`);
    return [];
  }
  const entries = parseSitemap(xml);
  const out = [];
  for (const e of entries) {
    if (!e.loc) continue;
    const match = INCLUDE_PREFIXES.find((p) => e.loc.includes(p.prefix));
    if (!match) continue;
    // skip bare index pages (the prefix itself)
    const u = new URL(e.loc);
    const rest = u.pathname.replace(match.prefix, "").replace(/\/$/, "");
    if (!rest) continue;
    out.push({
      title: prettyTitleFromUrl(e.loc),
      url: e.loc,
      source: match.source,
      published: safeDate(e.lastmod) || null,
      summary: "",
      tutorial_kind: "official",
    });
  }
  return sortByDateDesc(out).slice(0, 40);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  fetchDocs().then((r) => console.log(JSON.stringify(r, null, 2)));
}
