// Official tutorial / guide sources (tagged tutorial_kind: 'official').
// - Anthropic Cookbook commits
// - Anthropic Courses commits
// - Claude Code release notes
// - anthropic.com/engineering/ and anthropic.com/learn/ (from sitemap)
import { httpGet, sortByDateDesc, clampText, safeDate, runAll, dedupeByUrl } from "./lib/util.js";
import { parseFeed, parseSitemap } from "./lib/xml.js";

const GH_ATOMS = [
  { url: "https://github.com/anthropics/claude-cookbooks/commits.atom", source: "Anthropic Cookbook" },
  { url: "https://github.com/anthropics/courses/commits.atom",          source: "Anthropic Courses" },
  { url: "https://github.com/anthropics/claude-code/releases.atom",     source: "Claude Code Releases" },
];

const SITE_PREFIXES = [
  { prefix: "/engineering/", source: "Anthropic Eng" },
  { prefix: "/learn/",       source: "Anthropic Learn" },
];

function titleizeSlug(slug) {
  const small = new Set(["a","an","and","as","at","but","by","for","in","of","on","or","the","to","up","vs","via","with"]);
  const acro = new Set(["api","sdk","cli","mcp","url","json","http","ai","ui","ux","pdf","csv","rag","llm","io","ide"]);
  return slug.split("-").map((w, i) => {
    if (!w) return w;
    const lo = w.toLowerCase();
    if (acro.has(lo)) return lo.toUpperCase();
    if (i !== 0 && small.has(lo)) return lo;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

async function fetchAtom({ url, source }) {
  const xml = await httpGet(url, { headers: { accept: "application/atom+xml, application/xml, */*" } });
  const entries = parseFeed(xml);
  return entries.slice(0, 10).map((e) => ({
    title: e.title.replace(/^[a-f0-9]{7,40}\s*/i, ""),
    url: e.url,
    source,
    published: safeDate(e.published),
    summary: clampText(e.summary, 200),
    tutorial_kind: "official",
  }));
}

async function fetchAnthropicEduPages() {
  const xml = await httpGet("https://www.anthropic.com/sitemap.xml");
  const entries = parseSitemap(xml);
  const out = [];
  for (const e of entries) {
    if (!e.loc) continue;
    const match = SITE_PREFIXES.find((p) => e.loc.includes(p.prefix));
    if (!match) continue;
    const u = new URL(e.loc);
    const rest = u.pathname.replace(match.prefix, "").replace(/\/$/, "");
    if (!rest) continue;
    out.push({
      title: titleizeSlug(rest),
      url: e.loc,
      source: match.source,
      published: safeDate(e.lastmod) || null,
      summary: "",
      tutorial_kind: "official",
    });
  }
  return out;
}

export async function fetchTutorials() {
  const tasks = [
    ...GH_ATOMS.map((f) => [f.source, () => fetchAtom(f)]),
    ["Anthropic edu pages", () => fetchAnthropicEduPages()],
  ];
  const items = await runAll(tasks, { label: "tut" });
  return sortByDateDesc(dedupeByUrl(items)).slice(0, 40);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  fetchTutorials().then((r) => console.log(JSON.stringify(r, null, 2)));
}
