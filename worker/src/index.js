// Cloudflare Worker: accepts Lisa's requests and writes them to the repo as markdown files.
// POST /submit  { message: string, website?: string (honeypot), turnstile?: string }

const TEXT_HEADERS = { "content-type": "application/json; charset=utf-8" };

function cors(origin, allowedList) {
  const allowed = allowedList.split(",").map((s) => s.trim()).filter(Boolean);
  const ok = origin && (allowed.includes(origin) || allowed.includes("*"));
  return {
    "access-control-allow-origin": ok ? origin : allowed[0] || "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-lisa-gate",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...TEXT_HEADERS, ...headers },
  });
}

function pad(n) { return String(n).padStart(2, "0"); }
function filename(now) {
  const y = now.getUTCFullYear();
  const mo = pad(now.getUTCMonth() + 1);
  const d  = pad(now.getUTCDate());
  const h  = pad(now.getUTCHours());
  const mi = pad(now.getUTCMinutes());
  const s  = pad(now.getUTCSeconds());
  return `requests/lisa-${y}-${mo}-${d}-${h}${mi}${s}.md`;
}

function escapeYaml(s) {
  if (!s) return '""';
  return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

async function verifyTurnstile(token, secret, ip) {
  if (!secret) return true; // Turnstile optional
  if (!token) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.success;
}

async function rateLimit(env, ip) {
  const win = parseInt(env.RATE_WINDOW_SECONDS || "60", 10);
  const max = parseInt(env.RATE_MAX_REQUESTS || "3", 10);
  const key = `rl:${ip}`;
  const current = parseInt((await env.RATE_LIMIT.get(key)) || "0", 10);
  if (current >= max) return false;
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: win });
  return true;
}

async function commitToRepo(env, path, content, message, sha) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(content)));
  const body = {
    message,
    content: b64,
    branch: env.GITHUB_BRANCH || "main",
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "claudehub-lisa-worker",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

async function getRepoFile(env, path) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}?ref=${env.GITHUB_BRANCH || "main"}`;
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "claudehub-lisa-worker",
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GitHub GET ${res.status}`);
  const j = await res.json();
  const bytes = Uint8Array.from(atob(j.content.replace(/\n/g, "")), (c) => c.charCodeAt(0));
  const text = new TextDecoder().decode(bytes);
  return { text, sha: j.sha };
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sanitizePinItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = String(raw.title || "").trim().slice(0, 300);
  const url = String(raw.url || "").trim().slice(0, 800);
  if (!title || !url) return null;
  try { new URL(url); } catch { return null; }
  return {
    title,
    url,
    source: String(raw.source || "").trim().slice(0, 80),
    summary: String(raw.summary || "").trim().slice(0, 400),
    thumbnail: String(raw.thumbnail || "").trim().slice(0, 500) || undefined,
    kind: raw.kind === "video" ? "video" : "official",
    pinned_at: new Date().toISOString(),
  };
}

async function handlePin(request, env, corsHeaders) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (!(await rateLimit(env, ip))) {
    return json({ error: "rate limited" }, 429, corsHeaders);
  }

  // Gate check: client sends plaintext 365 password in x-lisa-gate header.
  // Worker hashes and compares to env.LISA_GATE_HASH (stored as sha256 hex).
  const sentPlain = (request.headers.get("x-lisa-gate") || "").trim();
  const sentHash = sentPlain ? await sha256Hex(sentPlain) : "";
  if (!env.LISA_GATE_HASH || sentHash !== env.LISA_GATE_HASH.toLowerCase()) {
    return json({ error: "forbidden" }, 403, corsHeaders);
  }

  let payload;
  try { payload = await request.json(); } catch {
    return json({ error: "invalid json" }, 400, corsHeaders);
  }
  const action = payload.action === "remove" ? "remove" : "add";
  const item = sanitizePinItem(payload.item);
  if (!item) return json({ error: "invalid item" }, 400, corsHeaders);

  let file;
  try { file = await getRepoFile(env, "data/lisa.json"); }
  catch (e) { return json({ error: "read failed", detail: String(e.message || e) }, 502, corsHeaders); }

  let data;
  try { data = JSON.parse(file.text); } catch {
    return json({ error: "parse failed" }, 500, corsHeaders);
  }
  if (!Array.isArray(data.tutorials_pinned)) data.tutorials_pinned = [];

  const existingIdx = data.tutorials_pinned.findIndex((p) => p.url === item.url);
  if (action === "add") {
    if (existingIdx === -1) data.tutorials_pinned.unshift(item);
    else return json({ ok: true, status: "already pinned" }, 200, corsHeaders);
  } else {
    if (existingIdx === -1) return json({ ok: true, status: "not pinned" }, 200, corsHeaders);
    data.tutorials_pinned.splice(existingIdx, 1);
  }

  const nextText = JSON.stringify(data, null, 2) + "\n";
  const msg = action === "add"
    ? `chore(lisa): pin tutorial — ${item.title.slice(0, 60)}`
    : `chore(lisa): unpin tutorial — ${item.title.slice(0, 60)}`;

  try { await commitToRepo(env, "data/lisa.json", nextText, msg, file.sha); }
  catch (e) { return json({ error: "commit failed", detail: String(e.message || e) }, 502, corsHeaders); }

  return json({ ok: true, action, count: data.tutorials_pinned.length }, 200, corsHeaders);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    const allowedList = env.ALLOWED_ORIGINS || "";
    const corsHeaders = cors(origin, allowedList);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true }, 200, corsHeaders);
    }

    if (request.method === "POST" && url.pathname === "/pin") {
      return handlePin(request, env, corsHeaders);
    }

    if (request.method !== "POST" || url.pathname !== "/submit") {
      return json({ error: "not found" }, 404, corsHeaders);
    }

    // Body size guard
    const lenHeader = parseInt(request.headers.get("content-length") || "0", 10);
    if (lenHeader > 4096) {
      return json({ error: "payload too large" }, 413, corsHeaders);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "invalid json" }, 400, corsHeaders);
    }

    // Honeypot: bots typically fill hidden "website" field
    if (payload.website) {
      return json({ ok: true, dropped: "honeypot" }, 200, corsHeaders);
    }

    const raw = (payload.message || "").toString();
    const message = raw.trim().slice(0, parseInt(env.MAX_MESSAGE_LEN || "2000", 10));
    if (!message) {
      return json({ error: "message required" }, 400, corsHeaders);
    }

    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const country = request.cf && request.cf.country ? request.cf.country : "??";
    const ua = request.headers.get("user-agent") || "";

    // Rate limit
    const allowed = await rateLimit(env, ip);
    if (!allowed) {
      return json({ error: "rate limited" }, 429, corsHeaders);
    }

    // Turnstile (optional)
    const tsOk = await verifyTurnstile(payload.turnstile, env.TURNSTILE_SECRET, ip);
    if (!tsOk) {
      return json({ error: "challenge failed" }, 403, corsHeaders);
    }

    const now = new Date();
    const path = filename(now);
    const content =
      "---\n" +
      `submitted_at: ${now.toISOString()}\n` +
      `country: ${escapeYaml(country)}\n` +
      `user_agent: ${escapeYaml(ua)}\n` +
      `ip_suffix: ${escapeYaml(ip.split(".").slice(-1)[0] || "?")}\n` +
      "---\n\n" +
      message +
      "\n";

    try {
      await commitToRepo(env, path, content, `chore(lisa): request ${now.toISOString()}`);
    } catch (e) {
      return json({ error: "commit failed", detail: String(e.message || e) }, 502, corsHeaders);
    }

    return json({ ok: true, path }, 200, corsHeaders);
  },
};
