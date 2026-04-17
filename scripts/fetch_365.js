// Comply365 + AI-compliance competitor news. Pulls direct vendor feeds where
// they exist (Web Manuals, Flydocs) and Google News RSS for the rest. Google
// News results get a light literal-match filter to drop off-topic hits.
import { httpGet, sortByDateDesc, clampText, safeDate, runAll, dedupeByUrl } from "./lib/util.js";
import { parseFeed } from "./lib/xml.js";

// Brand-match filter: require the brand name to appear in title OR summary.
// Google News can surface stories that mention the query term only in source
// metadata; this drops them.
function brandFilter(brand) {
  const re = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return (title, summary) => re.test(title || "") || re.test(summary || "");
}

const FEEDS = [
  // Comply365 — no public blog RSS; Google News only.
  {
    url: "https://news.google.com/rss/search?q=%22Comply365%22&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    filter: brandFilter("Comply365"),
  },
  // Web Manuals — direct feed.
  {
    url: "https://webmanuals.aero/feed/",
    source: "Web Manuals",
    filter: null,
  },
  // Web Manuals — Google News AI-scoped fallback.
  {
    url: "https://news.google.com/rss/search?q=%22Web+Manuals%22+AI&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    filter: brandFilter("Web Manuals"),
  },
  // Flydocs — direct feed.
  {
    url: "https://www.flydocs.aero/feed/",
    source: "Flydocs",
    filter: null,
  },
  // Flydocs — Google News AI-scoped fallback.
  {
    url: "https://news.google.com/rss/search?q=%22Flydocs%22+AI&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    filter: brandFilter("Flydocs"),
  },
  // Ideagen — no viable direct feed; Google News only.
  {
    url: "https://news.google.com/rss/search?q=%22Ideagen%22+AI&hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
    filter: brandFilter("Ideagen"),
  },
];

async function fetchOne({ url, source, filter }) {
  const xml = await httpGet(url, {
    headers: { accept: "application/rss+xml, application/atom+xml, application/xml, */*" },
  });
  const entries = parseFeed(xml);
  const out = [];
  for (const e of entries) {
    if (!e.title || !e.url) continue;
    if (filter && !filter(e.title, e.summary)) continue;
    out.push({
      title: e.title,
      url: e.url,
      source,
      published: safeDate(e.published),
      summary: clampText(e.summary, 200),
    });
  }
  return out;
}

export async function fetch365() {
  const tasks = FEEDS.map((f) => [
    f.source + " " + f.url.replace(/https?:\/\//, "").slice(0, 40),
    () => fetchOne(f),
  ]);
  const items = await runAll(tasks, { label: "365" });
  return sortByDateDesc(dedupeByUrl(items)).slice(0, 40);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  fetch365().then((r) => console.log(JSON.stringify(r, null, 2)));
}
