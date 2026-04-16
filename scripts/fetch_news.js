// News feeds. Each feed runs independently; failures are tolerated per-feed.
import { httpGet, sortByDateDesc, clampText, safeDate, runAll, dedupeByUrl } from "./lib/util.js";
import { parseFeed } from "./lib/xml.js";

const FEEDS = [
  { url: "https://techcrunch.com/tag/anthropic/feed/", source: "TechCrunch", filter: null },
  { url: "https://techcrunch.com/tag/claude/feed/",    source: "TechCrunch", filter: null },
  { url: "https://arstechnica.com/tag/anthropic/feed/", source: "Ars Technica", filter: null },
  { url: "https://arstechnica.com/ai/feed/",            source: "Ars Technica", filter: /\b(claude|anthropic)\b/i },
  { url: "https://www.theverge.com/rss/index.xml",      source: "The Verge",    filter: /\b(claude|anthropic)\b/i },
  { url: "https://feeds.bloomberg.com/technology/news.rss", source: "Bloomberg", filter: /\b(claude|anthropic)\b/i },
  { url: "https://news.google.com/rss/search?q=anthropic+claude&hl=en-US&gl=US&ceid=US:en", source: "Google News", filter: null },
];

async function fetchOne({ url, source, filter }) {
  const xml = await httpGet(url, { headers: { accept: "application/rss+xml, application/atom+xml, application/xml, */*" } });
  const entries = parseFeed(xml);
  const out = [];
  for (const e of entries) {
    if (!e.title || !e.url) continue;
    if (filter) {
      const hay = (e.title + " " + e.summary).toLowerCase();
      if (!filter.test(hay)) continue;
    }
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

export async function fetchNews() {
  const tasks = FEEDS.map((f) => [f.source + " " + f.url.replace(/https?:\/\//, "").slice(0, 30), () => fetchOne(f)]);
  const items = await runAll(tasks, { label: "news" });
  return sortByDateDesc(dedupeByUrl(items)).slice(0, 25);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  fetchNews().then((r) => console.log(JSON.stringify(r, null, 2)));
}
