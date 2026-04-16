// Tutorials, guides, and high-signal posts.
// Sources: Anthropic cookbook commits, courses commits, claude-code releases, HN Algolia for "claude tutorial".
import { httpGet, httpJson, sortByDateDesc, clampText, safeDate, runAll, dedupeByUrl } from "./lib/util.js";
import { parseFeed } from "./lib/xml.js";

const GH_ATOMS = [
  { url: "https://github.com/anthropics/claude-cookbooks/commits.atom", source: "Anthropic Cookbook" },
  { url: "https://github.com/anthropics/courses/commits.atom",          source: "Anthropic Courses" },
  { url: "https://github.com/anthropics/claude-code/releases.atom",     source: "Claude Code Releases" },
];

async function fetchAtom({ url, source }) {
  const xml = await httpGet(url, { headers: { accept: "application/atom+xml, application/xml, */*" } });
  const entries = parseFeed(xml);
  return entries.slice(0, 10).map((e) => ({
    title: e.title.replace(/^[a-f0-9]{7,40}\s*/i, ""),
    url: e.url,
    source,
    published: safeDate(e.published),
    summary: clampText(e.summary, 200),
  }));
}

async function fetchHnTutorials() {
  const url =
    "https://hn.algolia.com/api/v1/search?query=" +
    encodeURIComponent("claude code") +
    "&tags=story&hitsPerPage=25&numericFilters=points>=20";
  const json = await httpJson(url);
  const hits = Array.isArray(json.hits) ? json.hits : [];
  return hits
    .filter((h) => h.url && h.title && /guide|tutorial|tips|how to|building|workflow|mcp|skill/i.test(h.title))
    .map((h) => ({
      title: h.title,
      url: h.url,
      source: `HN · ${h.points || 0}↑`,
      published: safeDate(h.created_at),
      summary: "",
    }));
}

export async function fetchTutorials() {
  const tasks = [
    ...GH_ATOMS.map((f) => [f.source, () => fetchAtom(f)]),
    ["HN tutorials", () => fetchHnTutorials()],
  ];
  const items = await runAll(tasks, { label: "tut" });
  return sortByDateDesc(dedupeByUrl(items)).slice(0, 20);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  fetchTutorials().then((r) => console.log(JSON.stringify(r, null, 2)));
}
