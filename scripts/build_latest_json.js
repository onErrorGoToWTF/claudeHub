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
import { fetchDocs } from "./fetch_docs.js";
import { fetch365 } from "./fetch_365.js";
import { fetchClaudeLearning } from "./fetch_claude_learning.js";
import { fetchAcademy } from "./fetch_academy.js";
import { logSection } from "./lib/util.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "latest.json");

// How-to intent on YouTube titles. Keep high-signal — this pulls videos into
// the Tutorials > Videos sub-tab. Main YouTube tab stays unfiltered.
const TUT_VIDEO_RE = /\b(tutorial|guide|how[- ]?to|walkthrough|build(ing)?|set[- ]?up|getting started|intro|introducing|beginner|step[- ]by[- ]step|new in|what'?s new|explained|deep dive|crash course|masterclass|quickstart|lesson|feature[sd]?)\b/i;

function filterYouTubeTutorials(videos) {
  return videos
    .filter((v) => TUT_VIDEO_RE.test(v.title || ""))
    .map((v) => ({ ...v, tutorial_kind: "video" }));
}

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

function dedupeByUrl(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = (it.url || "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
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
  logSection("tutorials (official)");
  const officialTuts = await fetchTutorials().catch((e) => (console.warn(e.message), []));
  logSection("docs (platform.claude.com)");
  const docs = await fetchDocs().catch((e) => (console.warn(e.message), []));
  logSection("365 (comply365 + competitors)");
  const comply365News = await fetch365().catch((e) => (console.warn(e.message), []));
  logSection("claude_learning (Claude Code + MCP releases + docs changelog)");
  const claudeLearning = await fetchClaudeLearning().catch((e) => (console.warn(e.message), []));
  logSection("academy (new Anthropic Academy courses)");
  const academy = await fetchAcademy().catch((e) => (console.warn(e.message), []));

  // Combine HN into news, sort by date
  const mergedNews = [...news, ...hn]
    .filter((v, i, a) => a.findIndex((x) => x.url === v.url) === i)
    .sort((a, b) => Date.parse(b.published || 0) - Date.parse(a.published || 0))
    .slice(0, 25);

  // Merge sections first so tutorial-videos can be derived from the merged
  // (possibly prior) YouTube list if this run's YT fetch failed.
  const mergedYouTube = merge(priorSections.youtube, youtube);

  // Tutorials section = Official (docs + cookbook/courses/releases + eng/learn)
  //                   + Videos (how-to filtered YouTube).
  const videoTuts = filterYouTubeTutorials(mergedYouTube);
  const tutorials = dedupeByUrl([...docs, ...officialTuts, ...videoTuts])
    .sort((a, b) => Date.parse(b.published || 0) - Date.parse(a.published || 0));

  // Non-tutorial YouTube videos get tagged and merged into the NEWS section.
  // The frontend NEWS renderer splits news_video items (tpl-video) from
  // ordinary articles and always renders videos first, then articles.
  const newsVideos = mergedYouTube
    .filter((v) => !TUT_VIDEO_RE.test(v.title || ""))
    .map((v) => ({ ...v, _kind: "news_video" }));
  const newsCombined = dedupeByUrl([...mergedNews, ...newsVideos])
    .sort((a, b) => Date.parse(b.published || 0) - Date.parse(a.published || 0));

  const payload = {
    generated_at: new Date().toISOString(),
    version: 1,
    sections: {
      updates:   merge(priorSections.updates,   updates),
      news:      merge(priorSections.news,      newsCombined),
      status:    merge(priorSections.status,    status),
      youtube:   mergedYouTube,
      tutorials: merge(priorSections.tutorials, tutorials),
      comply365_news: merge(priorSections.comply365_news, comply365News),
      claude_learning: merge(
        priorSections.claude_learning,
        dedupeByUrl([...claudeLearning, ...academy])
          .sort((a, b) => Date.parse(b.published || 0) - Date.parse(a.published || 0))
      ),
    },
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");

  const counts = Object.fromEntries(
    Object.entries(payload.sections).map(([k, v]) => [k, v.length])
  );
  const tutKinds = tutorials.reduce((a, t) => (a[t.tutorial_kind || "none"] = (a[t.tutorial_kind || "none"] || 0) + 1, a), {});
  console.log("\nDone. Counts:", counts);
  console.log("Tutorial kinds:", tutKinds);
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
