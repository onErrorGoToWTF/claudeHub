// Anthropic Academy (anthropic.skilljar.com) course-list diff — Phase 1.5 / M1.5.3.
//
// Scrapes the Academy home page for its course grid, then diffs against a
// snapshot on disk (data/learn/academy_snapshot.json). Emits a What's new
// entry only when a course slug first appears, so the feed stays quiet
// except when Anthropic ships a new course.
//
// Cold-start behavior: if the snapshot is empty, silently seed it with
// every current course and emit zero items — a fresh deploy won't flood
// the feed with 17 "new" entries. Only diffs discovered after seeding
// surface.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { httpGet, clampText, stripTags, sortByDateDesc } from "./lib/util.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = path.resolve(__dirname, "..", "data", "learn", "academy_snapshot.json");
const BASE = "https://anthropic.skilljar.com";
const SOURCE = "Anthropic Academy";

// Each course card:
//   <a href="/<slug>" title="<title>" ... class="...coursebox-container...">
//     ...
//     <div class="coursebox-text-description" ...>…</div>
//   </a>
const CARD_RE =
  /<a\s+href="(\/[a-z0-9-]+)"\s+title="([^"]+)"[\s\S]*?class="[^"]*coursebox-container[\s\S]*?<div[^>]+class="coursebox-text-description"[^>]*>([\s\S]*?)<\/div>/g;

function decodeTitle(s) {
  return s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
}

async function loadSnapshot() {
  try {
    const raw = await fs.readFile(SNAPSHOT, "utf8");
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

async function saveSnapshot(snap) {
  await fs.mkdir(path.dirname(SNAPSHOT), { recursive: true });
  await fs.writeFile(SNAPSHOT, JSON.stringify(snap, null, 2) + "\n", "utf8");
}

function parseCards(html) {
  const out = [];
  CARD_RE.lastIndex = 0;
  let m;
  while ((m = CARD_RE.exec(html))) {
    const slug = m[1].replace(/^\//, "");
    const title = decodeTitle(m[2]);
    const desc = stripTags(m[3]);
    if (!slug || !title) continue;
    out.push({ slug, title, desc });
  }
  return out;
}

export async function fetchAcademy() {
  const html = await httpGet(`${BASE}/`, { headers: { accept: "text/html,*/*" } });
  const cards = parseCards(html);
  if (cards.length === 0) throw new Error("no academy courses parsed");

  const snap = await loadSnapshot();
  const isColdStart = Object.keys(snap).length === 0;
  const nowIso = new Date().toISOString();

  const items = [];
  for (const c of cards) {
    const existing = snap[c.slug];
    if (!existing) {
      snap[c.slug] = { title: c.title, firstSeen: nowIso };
      if (!isColdStart) {
        items.push({
          title: c.title,
          url: `${BASE}/${c.slug}`,
          source: SOURCE,
          published: nowIso,
          summary: clampText(c.desc, 220),
        });
      }
    } else {
      // Keep snapshot title fresh if Anthropic edits it.
      existing.title = c.title;
    }
  }

  await saveSnapshot(snap);
  if (isColdStart) console.log(`    academy cold-start: seeded ${cards.length} courses, emitted 0`);
  return sortByDateDesc(items);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  fetchAcademy().then((r) => console.log(JSON.stringify(r, null, 2)));
}
