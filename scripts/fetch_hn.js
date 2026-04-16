// Hacker News via Algolia — highest-signal stories about Claude / Anthropic.
import { httpJson, sortByDateDesc, clampText, safeDate, dedupeByUrl } from "./lib/util.js";

const QUERIES = [
  { q: "claude",    minPoints: 30 },
  { q: "anthropic", minPoints: 30 },
];

async function runQuery({ q, minPoints }) {
  const url =
    `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}` +
    `&tags=story&hitsPerPage=40&numericFilters=points>=${minPoints}`;
  const json = await httpJson(url);
  const hits = Array.isArray(json.hits) ? json.hits : [];
  return hits
    .filter((h) => h.url && h.title)
    .map((h) => ({
      title: h.title,
      url: h.url,
      source: `HN · ${h.points || 0}↑`,
      hn_id: h.objectID,
      published: safeDate(h.created_at),
      summary: clampText(
        (h.story_text || h.comment_text || "").replace(/<[^>]+>/g, " "),
        180
      ),
    }));
}

export async function fetchHN() {
  const out = [];
  for (const q of QUERIES) {
    try {
      const items = await runQuery(q);
      console.log(`  \u2713 hn ${q.q}: ${items.length} items`);
      out.push(...items);
    } catch (e) {
      console.warn(`  \u2717 hn ${q.q}: ${e.message}`);
    }
  }
  return sortByDateDesc(dedupeByUrl(out)).slice(0, 20);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  fetchHN().then((r) => console.log(JSON.stringify(r, null, 2)));
}
