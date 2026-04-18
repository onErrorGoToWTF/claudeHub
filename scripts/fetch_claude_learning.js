// Claude learning feed — Phase 1.5.
// M1.5.1: GitHub Releases Atom for Claude Code + core MCP repos.
// M1.5.2: Anthropic release-notes HTML scrape (Claude API + System prompts).
// Deliberate deviation from plan: the plan said "changelog/RSS if exposed,
// otherwise sitemap-diff against a cached snapshot." No RSS exists, but the
// release-notes HTML itself is the changelog — strictly higher signal than
// sitemap-diff (which only detects new PAGES, not new entries). HTML scrape it.
// Zero-dependency, no API key. Follow-on milestones add Academy diff +
// curated YouTube channels.
import { httpGet, sortByDateDesc, stripTags, clampText, safeDate, runAll, dedupeByUrl } from "./lib/util.js";
import { parseFeed } from "./lib/xml.js";

const GH_RELEASES = [
  { url: "https://github.com/anthropics/claude-code/releases.atom",                   source: "Claude Code" },
  { url: "https://github.com/modelcontextprotocol/specification/releases.atom",       source: "MCP Spec" },
  { url: "https://github.com/modelcontextprotocol/servers/releases.atom",             source: "MCP Servers" },
  { url: "https://github.com/modelcontextprotocol/python-sdk/releases.atom",          source: "MCP Python SDK" },
  { url: "https://github.com/modelcontextprotocol/typescript-sdk/releases.atom",      source: "MCP TypeScript SDK" },
  { url: "https://github.com/modelcontextprotocol/inspector/releases.atom",           source: "MCP Inspector" },
];

// The /release-notes/system-prompts page is a Radix accordion whose bodies
// are empty in SSR and hydrate client-side from <template> streaming blocks,
// so a plain-HTML scrape returns zero bullets. Deferred until a later
// milestone builds template-block reassembly; overview covers the signal.
const RELEASE_NOTES_PAGES = [
  {
    url:      "https://platform.claude.com/docs/en/release-notes/overview",
    source:   "Claude API Release Notes",
    stableAnchors: true,
  },
];

const DATED_ID_RE = /id="((?:january|february|march|april|may|june|july|august|september|october|november|december)-\d{1,2}-\d{4})"/gi;
const LI_RE = /<li[^>]*>([\s\S]*?)<\/li>/g;

async function fetchReleases({ url, source }) {
  const xml = await httpGet(url, { headers: { accept: "application/atom+xml, application/xml, */*" } });
  const entries = parseFeed(xml);
  return entries.slice(0, 10).map((e) => ({
    title: e.title,
    url: e.url,
    source,
    published: safeDate(e.published),
    summary: clampText(e.summary, 220),
  }));
}

// Extract bullet points from a slice of HTML.
function extractBullets(slice) {
  const out = [];
  LI_RE.lastIndex = 0;
  let li;
  while ((li = LI_RE.exec(slice))) {
    const t = stripTags(li[1]);
    if (t) out.push(t);
  }
  return out;
}

// Scrape a release-notes HTML page into dated entries.
async function fetchReleaseNotesPage({ url, source, stableAnchors }) {
  const html = await httpGet(url, { headers: { accept: "text/html,*/*" } });

  if (stableAnchors) {
    // Overview page: wrapper divs carry `id="<month>-<day>-<year>"`. Slice
    // from each id to the next to isolate one entry's content.
    const markers = [];
    let m;
    DATED_ID_RE.lastIndex = 0;
    while ((m = DATED_ID_RE.exec(html))) markers.push({ id: m[1], idx: m.index });
    const items = [];
    for (let i = 0; i < markers.length; i++) {
      const a = markers[i];
      const end = markers[i + 1] ? markers[i + 1].idx : Math.min(a.idx + 8000, html.length);
      const slice = html.slice(a.idx, end);
      const bullets = extractBullets(slice);
      if (bullets.length === 0) continue;
      const dateISO = safeDate(a.id.replace(/-/g, " "));
      if (!dateISO) continue;
      const title = clampText(bullets[0], 120);
      const summary = bullets.length > 1 ? clampText(bullets.slice(1).join(" • "), 240) : "";
      items.push({
        title,
        url: `${url}#${a.id}`,
        source,
        published: dateISO,
        summary,
      });
    }
    if (items.length === 0) throw new Error("no dated entries parsed");
    return items;
  }

  throw new Error("unsupported release-notes page layout");
}

export async function fetchClaudeLearning() {
  const tasks = [
    ...GH_RELEASES.map((f) => [f.source, () => fetchReleases(f)]),
    ...RELEASE_NOTES_PAGES.map((p) => [p.source, () => fetchReleaseNotesPage(p)]),
  ];
  const items = await runAll(tasks, { label: "learn" });
  return sortByDateDesc(dedupeByUrl(items)).slice(0, 40);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  fetchClaudeLearning().then((r) => console.log(JSON.stringify(r, null, 2)));
}
