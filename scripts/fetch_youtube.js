// YouTube channel feeds (per-channel Atom, no API key needed).
import { httpGet, sortByDateDesc, clampText, safeDate, runAll, dedupeByUrl } from "./lib/util.js";
import { parseFeed, firstMatch, stripCdata } from "./lib/xml.js";

const CHANNELS = [
  { id: "UCrDwWp7EBBv4NwvScIpBDOA", name: "Anthropic" },
  { id: "UCbo-KbSjJDG6JWQ_MTZ_rNA", name: "Nick Saraev" },
  { id: "UC0ZAzshNeCjuvgExPQyOHQg", name: "John Elder" },
  { id: "UCMcoud_ZW7cfxeIugBflSBw", name: "Riley Brown" },
  { id: "UCfQNB91qRP_5ILeu_S_bSkg", name: "Alex Finn" },
  { id: "UC3LCokV1C_1HGI4W5rftmvQ", name: "Productive Dude" },
  { id: "UCe4eqh2Rs4bkjDRrjZQWkZw", name: "Pragati Kunwer" },
  { id: "UCtevzRsHEKhs-RK8pAqwSyQ", name: "Leon van Zyl" },
  { id: "UCDqZyVCTwg9UyRWKgQ7Gizg", name: "Stefan Rows" },
  { id: "UCKq-lHnyradGRmFClX_ACMw", name: "Ryan & Matt Data Science" },
];

// Keyword filter so we don't surface unrelated videos from general creators.
// Empty = channel is Claude-focused enough to always include.
const ALWAYS_INCLUDE = new Set(["Anthropic"]);
const CLAUDE_RE = /\b(claude|anthropic|claude code|mcp|agentic)\b/i;

async function fetchChannel({ id, name }) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;
  const xml = await httpGet(url, { headers: { accept: "application/atom+xml, application/xml, */*" } });
  const entries = parseFeed(xml);
  const items = [];
  for (const e of entries) {
    if (!e.title || !e.url) continue;
    if (!ALWAYS_INCLUDE.has(name)) {
      const hay = (e.title + " " + e.summary).toLowerCase();
      if (!CLAUDE_RE.test(hay)) continue;
    }
    // video id
    const vidId = firstMatch(e.raw, "yt:videoId").trim();
    const thumb = vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : e.thumbnail;
    items.push({
      title: e.title,
      url: e.url,
      source: name,
      channel: name,
      channel_id: id,
      video_id: vidId,
      thumbnail: thumb,
      published: safeDate(e.published),
      summary: clampText(e.summary, 180),
    });
  }
  return items;
}

export async function fetchYouTube() {
  const tasks = CHANNELS.map((c) => [c.name, () => fetchChannel(c)]);
  const items = await runAll(tasks, { label: "yt" });
  return sortByDateDesc(dedupeByUrl(items)).slice(0, 30);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  fetchYouTube().then((r) => console.log(JSON.stringify(r, null, 2)));
}
