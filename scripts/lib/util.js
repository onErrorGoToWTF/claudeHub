// Shared helpers: fetch with UA + timeout, date/string utilities.

export const UA =
  "Mozilla/5.0 (claudeHub; +https://github.com/) Gecko/20100101 Firefox/128.0";

export async function httpGet(url, { timeoutMs = 15000, headers = {}, asText = true } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "*/*", ...headers },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return asText ? await res.text() : await res.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}

export async function httpJson(url, opts = {}) {
  const txt = await httpGet(url, opts);
  return JSON.parse(txt);
}

export function decodeEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&#8212;/g, "\u2014")
    .replace(/&#8211;/g, "\u2013")
    .replace(/&#8230;/g, "\u2026")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

export function stripTags(html) {
  if (!html) return "";
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function clampText(s, n = 220) {
  if (!s) return "";
  s = s.trim();
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, "") + "\u2026";
}

export function safeDate(input) {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function dedupeByUrl(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = (it.url || it.title || "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

export function sortByDateDesc(items) {
  return items.slice().sort((a, b) => {
    const da = a.published ? Date.parse(a.published) : 0;
    const db = b.published ? Date.parse(b.published) : 0;
    return db - da;
  });
}

export async function runAll(tasks, { label = "task" } = {}) {
  const results = await Promise.allSettled(tasks.map(([name, fn]) => fn()));
  const out = [];
  results.forEach((r, i) => {
    const name = tasks[i][0];
    if (r.status === "fulfilled") {
      const n = Array.isArray(r.value) ? r.value.length : "?";
      console.log(`  \u2713 ${label} ${name}: ${n} items`);
      if (Array.isArray(r.value)) out.push(...r.value);
    } else {
      console.warn(`  \u2717 ${label} ${name} failed: ${r.reason?.message || r.reason}`);
    }
  });
  return out;
}

export function logSection(name) {
  console.log(`\n[${name}]`);
}
