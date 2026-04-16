// Claude status page incidents (RSS)
import { httpGet, sortByDateDesc, clampText, safeDate } from "./lib/util.js";
import { parseFeed } from "./lib/xml.js";

const FEED = "https://status.claude.com/history.rss";

export async function fetchStatus() {
  const xml = await httpGet(FEED);
  const entries = parseFeed(xml);
  const items = entries.map((e) => ({
    title: e.title,
    url: e.url,
    source: "Claude Status",
    published: safeDate(e.published),
    summary: clampText(e.summary, 200),
  }));
  return sortByDateDesc(items).slice(0, 12);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  fetchStatus().then((r) => console.log(JSON.stringify(r, null, 2)));
}
