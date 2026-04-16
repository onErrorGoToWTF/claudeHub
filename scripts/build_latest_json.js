// Orchestrator: runs every fetcher in parallel, merges results, writes data/latest.json.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchAnthropic } from "./fetch_anthropic.js";
import { fetchStatus } from "./fetch_status.js";
import { fetchNews } from "./fetch_news.js";
import { fetchYouTube } from "./fetch_youtube.js";
import { fetchHN } from "./fetch_hn.js";
import { fetchTutorials } from "./fetch_tutorials.js";
import { logSection } from "./lib/util.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "latest.json");

async function readExisting() {
  try {
    const raw = await fs.readFile(OUT, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function merge(existing, fresh) {
  // If fresh is empty but we have prior data, keep prior. Otherwise take fresh.
  if (!fresh || fresh.length === 0) {
    return existing || [];
  }
  return fresh;
}

async function main() {
  console.log("Claude Daily Intelligence Hub \u2014 building feed\u2026");

  const prior = await readExisting();
  const priorSections = (prior && prior.sections) || {};

  logSection("anthropic");
  const updates = await fetchAnthropic().catch((e) => (console.warn(e.message), []));
  logSection("status");
  const status = await fetchStatus().catch((e) => (console.warn(e.message), []));
  logSection("news");
  const news = await fetchNews().catch((e) => (console.warn(e.message), []));
  logSection("youtube");
  const youtube = await fetchYouTube().catch((e) => (console.warn(e.message), []));
  logSection("hackernews (merged into news)");
  const hn = await fetchHN().catch((e) => (console.warn(e.message), []));
  logSection("tutorials");
  const tutorials = await fetchTutorials().catch((e) => (console.warn(e.message), []));

  // Combine HN into news, sort by date
  const mergedNews = [...news, ...hn]
    .filter((v, i, a) => a.findIndex((x) => x.url === v.url) === i)
    .sort((a, b) => Date.parse(b.published || 0) - Date.parse(a.published || 0))
    .slice(0, 25);

  const payload = {
    generated_at: new Date().toISOString(),
    version: 1,
    sections: {
      updates:   merge(priorSections.updates,   updates),
      news:      merge(priorSections.news,      mergedNews),
      status:    merge(priorSections.status,    status),
      youtube:   merge(priorSections.youtube,   youtube),
      tutorials: merge(priorSections.tutorials, tutorials),
    },
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");

  const counts = Object.fromEntries(
    Object.entries(payload.sections).map(([k, v]) => [k, v.length])
  );
  console.log("\nDone. Counts:", counts);
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
