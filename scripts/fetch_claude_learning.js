// Claude learning feed — Phase 1.5 / M1.5.1.
// First source set: GitHub Releases Atom for Claude Code + core MCP repos.
// Zero-dependency, no API key. Follow-on milestones add docs changelog,
// Anthropic Academy diff, and curated YouTube channels.
import { httpGet, sortByDateDesc, clampText, safeDate, runAll, dedupeByUrl } from "./lib/util.js";
import { parseFeed } from "./lib/xml.js";

const GH_RELEASES = [
  { url: "https://github.com/anthropics/claude-code/releases.atom",                   source: "Claude Code" },
  { url: "https://github.com/modelcontextprotocol/specification/releases.atom",       source: "MCP Spec" },
  { url: "https://github.com/modelcontextprotocol/servers/releases.atom",             source: "MCP Servers" },
  { url: "https://github.com/modelcontextprotocol/python-sdk/releases.atom",          source: "MCP Python SDK" },
  { url: "https://github.com/modelcontextprotocol/typescript-sdk/releases.atom",      source: "MCP TypeScript SDK" },
  { url: "https://github.com/modelcontextprotocol/inspector/releases.atom",           source: "MCP Inspector" },
];

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

export async function fetchClaudeLearning() {
  const tasks = GH_RELEASES.map((f) => [f.source, () => fetchReleases(f)]);
  const items = await runAll(tasks, { label: "learn" });
  return sortByDateDesc(dedupeByUrl(items)).slice(0, 30);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  fetchClaudeLearning().then((r) => console.log(JSON.stringify(r, null, 2)));
}
