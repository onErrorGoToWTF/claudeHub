// Cloudflare Worker: accepts Lisa's requests and writes them to the repo as markdown files.
// POST /submit  { message: string, website?: string (honeypot), turnstile?: string }

const TEXT_HEADERS = { "content-type": "application/json; charset=utf-8" };

function cors(origin, allowedList) {
  const allowed = allowedList.split(",").map((s) => s.trim()).filter(Boolean);
  const ok = origin && (allowed.includes(origin) || allowed.includes("*"));
  return {
    "access-control-allow-origin": ok ? origin : allowed[0] || "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
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

async function commitToRepo(env, path, content, message) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
  // Safe base64 for unicode
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(content)));
  const body = {
    message,
    content: b64,
    branch: env.GITHUB_BRANCH || "main",
  };
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
