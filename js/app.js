(() => {
  "use strict";

  const DATA_URL = "data/latest.json?v=" + Date.now();
  const LISA_URL = "data/lisa.json?v=" + Date.now();
  const THEME_KEY = "cdih-theme";
  const SECTIONS = ["updates", "news", "status", "youtube", "tutorials"];
  const DISTINCT_SECTIONS = ["home", "lisa"]; // only visible when their chip is picked

  // TODO: set this to your deployed Cloudflare Worker URL after `wrangler deploy`.
  // While unset, the form shows a friendly "not wired up yet" message.
  const WORKER_URL = "https://claudehub-lisa.alanyoungjr.workers.dev/submit";
  const WORKER_PLACEHOLDER = /YOUR-SUBDOMAIN/.test(WORKER_URL);

  // SHA-256 of the Lisa-tab password. Plaintext lives on Alan's and Lisa's phones only.
  // To rotate: regenerate with `node -e "..."` (see chat), replace this hash, commit.
  const LISA_PW_HASH = "bbd2915e8e9e0e54d1b210501ebd8ed391957692016af2e409ebcb4951d796e1";
  const LISA_UNLOCK_KEY = "cdih-lisa-unlocked";

  async function sha256Hex(s) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
  }

  function isLisaUnlocked() {
    return localStorage.getItem(LISA_UNLOCK_KEY) === LISA_PW_HASH;
  }

  function openLisaModal() {
    const m = document.getElementById("lisa-modal");
    if (!m) return;
    m.hidden = false;
    const pw = document.getElementById("lisa-pw");
    if (pw) { pw.value = ""; setTimeout(() => pw.focus(), 60); }
    const err = document.getElementById("lisa-gate-error");
    if (err) err.textContent = "";
  }

  function closeLisaModal() {
    const m = document.getElementById("lisa-modal");
    if (m) m.hidden = true;
  }

  function activateLisaChip() {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
    const c = document.querySelector('[data-filter="lisa"]');
    if (c) c.classList.add("is-active");
    const lisaEl = document.querySelector('[data-section="lisa"]');
    if (lisaEl) lisaEl.dataset.hidden = "false";
    ["updates","news","status","youtube","tutorials"].forEach(s => {
      const el = document.querySelector(`.section[data-section="${s}"]`);
      if (el) el.dataset.hidden = "true";
    });
  }

  // ---------- Theme (dark-first; opt-in to light) ----------
  const root = document.documentElement;
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light") root.setAttribute("data-theme", "light");
  // else: dark is the CSS default

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const isLight = root.getAttribute("data-theme") === "light";
    if (isLight) {
      root.removeAttribute("data-theme");
      localStorage.setItem(THEME_KEY, "dark");
    } else {
      root.setAttribute("data-theme", "light");
      localStorage.setItem(THEME_KEY, "light");
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isLight ? "#050507" : "#f7f7f8");
  });

  // ---------- Filters ----------
  const chips = document.querySelectorAll(".chip");
  const lisaSection = document.querySelector('[data-section="lisa"]');
  function applyFilter(f) {
    chips.forEach(c => c.classList.toggle("is-active", c.dataset.filter === f));
    DISTINCT_SECTIONS.forEach(name => {
      const el = document.querySelector(`.section[data-section="${name}"]`);
      if (el) el.dataset.hidden = f === name ? "false" : "true";
    });
    SECTIONS.forEach(s => {
      const el = document.querySelector(`.section[data-section="${s}"]`);
      if (!el) return;
      el.dataset.hidden = (f === "all" || f === s) ? "false" : "true";
    });
    if (f === "lisa") loadLisa();
    if (f === "home") replayHomeAnimations();
  }

  // Replay Home-tab animations whenever the tab is activated.
  function replayHomeAnimations() {
    const css = document.querySelectorAll(
      ".section-home, .section-home .home-hero, .section-home .stat-grid, .section-home .home-cta, .section-home .hero"
    );
    css.forEach(el => {
      el.style.animation = "none";
      void el.offsetHeight;      // force reflow
      el.style.animation = "";
    });
    // SVG + bar charts: re-render gives us fresh SMIL / CSS animations.
    renderTimeline();
    renderCompare();
  }

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const f = chip.dataset.filter;
      if (f === "lisa" && !isLisaUnlocked()) { openLisaModal(); return; }
      applyFilter(f);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // Initial filter (respects the chip that was marked .is-active in the HTML)
  const initial = document.querySelector(".chip.is-active");
  if (initial) applyFilter(initial.dataset.filter);

  // Home CTA — jump to another chip
  const cta = document.querySelector(".home-cta-btn");
  if (cta) {
    cta.addEventListener("click", () => {
      const target = cta.dataset.chip;
      const chip = document.querySelector(`[data-filter="${target}"]`);
      if (chip) chip.click();
    });
  }

  // ---------- Time formatting ----------
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  function relTime(iso) {
    if (!iso) return "";
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const diffSec = Math.round((then - Date.now()) / 1000);
    const abs = Math.abs(diffSec);
    const units = [
      ["year",   60 * 60 * 24 * 365],
      ["month",  60 * 60 * 24 * 30],
      ["week",   60 * 60 * 24 * 7],
      ["day",    60 * 60 * 24],
      ["hour",   60 * 60],
      ["minute", 60],
      ["second", 1],
    ];
    for (const [unit, secs] of units) {
      if (abs >= secs || unit === "second") {
        return rtf.format(Math.round(diffSec / secs), unit);
      }
    }
    return "";
  }

  function prettyDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  // ---------- Sentiment detection ----------
  function detectSentiment(item) {
    const t = ((item.title || "") + " " + (item.summary || "")).toLowerCase();
    if (/outage|critical|failure|vulnerabilit|breach|exploit|hack|sued|lawsuit|security issue/.test(t))
      return { label: "Critical", cls: "critical" };
    if (/error|issue|degraded|regression|downgrade|ban|blocked|broke[n]?|bug|limit|restrict/.test(t))
      return { label: "Warning", cls: "warning" };
    if (/resolved|fixed|restored|recovered/.test(t))
      return { label: "Resolved", cls: "resolved" };
    if (/launch|announc|releas|introduc|now available|new (feature|model|version|tool|capability)|ships?\b/.test(t))
      return { label: "New", cls: "positive" };
    return { label: "Info", cls: "info" };
  }

  function faviconUrl(url) {
    try {
      const host = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
    } catch { return ""; }
  }

  // ---------- Skeletons ----------
  function showSkeletons() {
    const tpl = document.getElementById("tpl-skeleton");
    SECTIONS.forEach(s => {
      const container = document.querySelector(`[data-cards="${s}"]`);
      if (!container) return;
      container.innerHTML = "";
      for (let i = 0; i < 3; i++) container.appendChild(tpl.content.cloneNode(true));
    });
  }

  // ---------- Card rendering (main feed) ----------
  function renderCard(item, videoLike, index) {
    const tpl = document.getElementById(videoLike ? "tpl-video" : "tpl-card");
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.href = item.url;
    node.style.setProperty("--card-delay", (0.04 * (index || 0)) + "s");
    const title = node.querySelector(".card-title");
    const source = node.querySelector(".card-source");
    const time = node.querySelector(".card-time");
    title.textContent = item.title || "(untitled)";
    source.textContent = item.source || item.channel || "";
    time.textContent = relTime(item.published) || prettyDate(item.published) || "";
    if (item._severity) node.dataset.severity = item._severity;

    // Pill + favicon (non-video cards only)
    if (!videoLike) {
      const pill = node.querySelector(".card-pill");
      const sent = item._severity
        ? { label: item._severity.charAt(0).toUpperCase() + item._severity.slice(1), cls: item._severity }
        : detectSentiment(item);
      if (pill) {
        pill.textContent = sent.label;
        pill.dataset.pill = sent.cls;
      }
      node.dataset.sent = sent.cls;
      const icon = node.querySelector(".card-icon");
      if (icon && item.url) {
        icon.src = faviconUrl(item.url);
        icon.onerror = () => { icon.style.display = "none"; };
      }
      const sum = node.querySelector(".card-summary");
      sum.textContent = item.summary || "";
      if (!item.summary) sum.remove();
    } else {
      const img = node.querySelector("img");
      if (item.thumbnail) {
        img.src = item.thumbnail;
        img.alt = item.title || "";
      }
    }
    return node;
  }

  function renderSection(name, items, videoLike) {
    const container = document.querySelector(`[data-cards="${name}"]`);
    if (!container) return;
    container.innerHTML = "";
    if (!items || items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No items yet — check back soon.";
      container.appendChild(empty);
      return;
    }
    const frag = document.createDocumentFragment();
    items.slice(0, 12).forEach((i, idx) => frag.appendChild(renderCard(i, videoLike, idx)));
    container.appendChild(frag);
  }

  function setUpdated(name, iso) {
    const el = document.querySelector(`[data-updated="${name}"]`);
    if (!el) return;
    el.textContent = iso ? "Updated " + relTime(iso) : "";
  }

  // ---------- Main feed load ----------
  async function load() {
    showSkeletons();
    try {
      const res = await fetch(DATA_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();

      const s = data.sections || {};
      renderSection("updates",   s.updates,   false);
      renderSection("news",      s.news,      false);
      // Detect status severity from summary text
      if (s.status) {
        s.status.forEach(item => {
          const t = ((item.summary || "") + " " + (item.title || "")).toLowerCase();
          if (t.includes("resolved"))       item._severity = "resolved";
          else if (t.includes("monitoring")) item._severity = "monitoring";
          else if (t.includes("identified")) item._severity = "identified";
          else                               item._severity = "investigating";
        });
      }
      renderSection("status",    s.status,    false);
      renderSection("youtube",   s.youtube,   true);
      renderSection("tutorials", s.tutorials, false);

      SECTIONS.forEach(sec => setUpdated(sec, data.generated_at));
      document.getElementById("generated").textContent = prettyDate(data.generated_at);
    } catch (err) {
      SECTIONS.forEach(name => {
        const container = document.querySelector(`[data-cards="${name}"]`);
        if (!container) return;
        container.innerHTML = `<div class="empty">Couldn't load feed. ${String(err.message || err)}</div>`;
      });
    }
  }

  load();
  renderTimeline();
  renderCompare();

  // ======================================================================
  // Competitor comparison — context windows
  // ======================================================================
  function renderCompare() {
    const host = document.getElementById("cbars");
    if (!host) return;
    // Electric palette — deliberately distinct from the Claude blue/purple.
    const rows = [
      { name: "Gemini 2.5 Pro",    tokens: 2_000_000, label: "2M", color: "#22d3ee" }, // cyan
      { name: "Grok 4",            tokens: 2_000_000, label: "2M", color: "#e879f9" }, // magenta
      { name: "Claude Opus 4.6",   tokens: 1_000_000, label: "1M", color: "#a684ff", hero: true },
      { name: "GPT-4.1",           tokens: 1_000_000, label: "1M", color: "#4ade80" }, // electric green
    ];
    const max = Math.max(...rows.map(r => r.tokens));
    host.innerHTML = "";
    rows.forEach((r, i) => {
      const pct = (r.tokens / max) * 100;
      const delay = 0.25 + i * 0.18;
      const el = document.createElement("div");
      el.className = "cbar" + (r.hero ? " is-hero" : "");
      el.style.setProperty("--cbar-pct", pct.toFixed(1) + "%");
      el.style.setProperty("--cbar-col", r.color);
      el.style.setProperty("--cbar-delay", delay + "s");
      el.innerHTML = `
        <div class="cbar-label">${r.name}</div>
        <div class="cbar-val">${r.label}</div>
        <div class="cbar-track">
          <div class="cbar-fill">
            <div class="cbar-electron"></div>
          </div>
        </div>`;
      host.appendChild(el);
    });
    // Kick off transitions on the next frame.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      host.querySelectorAll(".cbar").forEach(el => el.classList.add("is-go"));
    }));
  }

  // ======================================================================
  // Timeline chart (context window growth)
  // ======================================================================
  function renderTimeline() {
    const svg = document.getElementById("timeline-svg");
    if (!svg) return;

    const data = [
      { date: "2023-03-14", model: "Claude 1",      ctx:  100_000 },
      { date: "2023-07-11", model: "Claude 2",      ctx:  100_000 },
      { date: "2023-11-21", model: "Claude 2.1",    ctx:  200_000 },
      { date: "2024-03-04", model: "Claude 3",      ctx:  200_000 },
      { date: "2024-06-20", model: "3.5 Sonnet",    ctx:  200_000 },
      { date: "2024-10-22", model: "3.5 Sonnet v2", ctx:  200_000 },
      { date: "2025-02-24", model: "3.7 Sonnet",    ctx:  200_000 },
      { date: "2025-05-22", model: "Sonnet 4",      ctx:  200_000 },
      { date: "2025-09-29", model: "Sonnet 4.5",    ctx: 1_000_000 },
      { date: "2026-01-15", model: "Opus 4.6 (1M)", ctx: 1_000_000 },
    ];

    const W = 800, H = 240;
    const padL = 44, padR = 20, padT = 20, padB = 36;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const t0 = Date.parse(data[0].date);
    const t1 = Date.parse(data[data.length - 1].date);
    const yMin = Math.log10(80_000);
    const yMax = Math.log10(1_500_000);

    const xOf = (d) => padL + ((Date.parse(d) - t0) / (t1 - t0)) * innerW;
    const yOf = (ctx) => padT + innerH - ((Math.log10(ctx) - yMin) / (yMax - yMin)) * innerH;

    // Build path
    let d = "";
    data.forEach((p, i) => {
      const x = xOf(p.date).toFixed(1);
      const y = yOf(p.ctx).toFixed(1);
      d += (i === 0 ? "M" : "L") + x + " " + y + " ";
    });
    const areaD = d + `L${xOf(data[data.length-1].date).toFixed(1)} ${padT + innerH} L${xOf(data[0].date).toFixed(1)} ${padT + innerH} Z`;

    // Y-axis reference ticks (100K, 200K, 1M)
    const yTicks = [100_000, 200_000, 1_000_000];

    const fmtK = (n) => n >= 1_000_000 ? (n / 1_000_000) + "M" : (n / 1000) + "K";

    let defs = `
      <defs>
        <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#3b82f6"/>
          <stop offset="65%"  stop-color="#60a5fa"/>
          <stop offset="100%" stop-color="#a684ff"/>
        </linearGradient>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#3b82f6" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
        </linearGradient>
      </defs>`;

    let grid = "";
    yTicks.forEach(t => {
      const y = yOf(t).toFixed(1);
      grid += `<line class="grid-line" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"/>`;
      grid += `<text class="y-axis" x="${padL - 8}" y="${+y + 3}" text-anchor="end">${fmtK(t)}</text>`;
    });

    let dots = "";
    data.forEach((p, i) => {
      const x = xOf(p.date).toFixed(1);
      const y = yOf(p.ctx).toFixed(1);
      const cls = i === data.length - 1 ? "dot dot-last" : "dot";
      const r = i === data.length - 1 ? 5.5 : 3.8;
      const delay = 0.4 + i * 0.12;
      dots += `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}" style="animation-delay:${delay}s; transform-origin:${x}px ${y}px;"/>`;
    });

    // Label only the last (endpoint) to keep it clean
    const lastX = xOf(data[data.length-1].date);
    const lastY = yOf(data[data.length-1].ctx);
    const labels = `
      <text class="label" x="${lastX - 8}" y="${lastY - 14}" text-anchor="end"
            style="animation-delay: 1.5s; font-weight: 600; fill: var(--lisa-hi);">${data[data.length-1].model}</text>
    `;

    // Electron — particle that travels the path and lands at the endpoint
    const electron = `
      <g>
        <animateMotion dur="1.6s" begin="0.35s" fill="freeze" path="${d.trim()}" rotate="auto"/>
        <circle class="electron-halo" r="10">
          <animate attributeName="r" values="10;14;10" dur="1.6s" begin="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.55;0.12;0.55" dur="1.6s" begin="2s" repeatCount="indefinite"/>
        </circle>
        <circle class="electron-core" r="3.2">
          <animate attributeName="r" values="3.2;4.2;3.2" dur="1.6s" begin="2s" repeatCount="indefinite"/>
        </circle>
      </g>`;

    svg.innerHTML = defs + grid +
      `<path class="area" d="${areaD}"/>` +
      `<path class="line" d="${d.trim()}"/>` +
      dots + labels + electron;

    // Legend
    const legend = document.getElementById("timeline-legend");
    if (legend) {
      legend.innerHTML =
        `<span>${data[0].date.slice(0,4)} · ${data[0].model}</span>` +
        `<span>${data[data.length-1].date.slice(0,4)} · ${data[data.length-1].model}</span>`;
    }
  }

  // ======================================================================
  // Lisa tab
  // ======================================================================
  let lisaLoaded = false;
  const tutorialCache = new Map();

  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Minimal markdown renderer covering: headings, paragraphs, bold/italic,
  // inline code, links, ul/ol, blockquotes, hr. No code blocks (tutorials
  // are plain English).
  function renderMarkdown(md) {
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let i = 0;

    function renderInline(text) {
      let s = escHtml(text);
      s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
      s = s.replace(/\*\*([^*]+)\*\*/g, (_, c) => `<strong>${c}</strong>`);
      s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, (_, p, c) => `${p}<em>${c}</em>`);
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) =>
        `<a href="${escHtml(u)}" target="_blank" rel="noopener">${t}</a>`);
      return s;
    }

    while (i < lines.length) {
      const line = lines[i];

      if (/^\s*$/.test(line)) { i++; continue; }

      let m;
      if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
        const lvl = Math.min(m[1].length, 3);
        out.push(`<h${lvl}>${renderInline(m[2])}</h${lvl}>`);
        i++;
        continue;
      }

      if (/^---+$/.test(line.trim())) { out.push("<hr>"); i++; continue; }

      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          buf.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        out.push(`<blockquote>${renderInline(buf.join(" "))}</blockquote>`);
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push(renderInline(lines[i].replace(/^\s*[-*]\s+/, "")));
          i++;
        }
        out.push("<ul>" + items.map(x => `<li>${x}</li>`).join("") + "</ul>");
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push(renderInline(lines[i].replace(/^\s*\d+\.\s+/, "")));
          i++;
        }
        out.push("<ol>" + items.map(x => `<li>${x}</li>`).join("") + "</ol>");
        continue;
      }

      // paragraph: join consecutive non-blank, non-block lines
      const buf = [line];
      i++;
      while (i < lines.length &&
             !/^\s*$/.test(lines[i]) &&
             !/^(#{1,6})\s+/.test(lines[i]) &&
             !/^\s*[-*]\s+/.test(lines[i]) &&
             !/^\s*\d+\.\s+/.test(lines[i]) &&
             !/^>\s?/.test(lines[i]) &&
             !/^---+$/.test(lines[i].trim())) {
        buf.push(lines[i]);
        i++;
      }
      out.push(`<p>${renderInline(buf.join(" "))}</p>`);
    }
    return out.join("\n");
  }

  function renderLisaCard(item) {
    const tpl = document.getElementById("tpl-card");
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.href = item.url;
    node.querySelector(".card-title").textContent = item.title;
    node.querySelector(".card-source").textContent = item.source || "";
    const time = node.querySelector(".card-time");
    time.textContent = relTime(item.published) || prettyDate(item.published) || "";
    const sum = node.querySelector(".card-summary");
    sum.textContent = item.summary || "";
    if (!item.summary) sum.remove();
    return node;
  }

  function renderLisaCards(name, items) {
    const container = document.querySelector(`[data-cards="${name}"]`);
    if (!container) return;
    container.innerHTML = "";
    if (!items || !items.length) {
      container.innerHTML = '<div class="empty">Nothing here yet.</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach(i => frag.appendChild(renderLisaCard(i)));
    container.appendChild(frag);
  }

  function renderTutorials(tutorials) {
    const container = document.querySelector('[data-cards="lisa-tutorials"]');
    if (!container) return;
    container.innerHTML = "";
    if (!tutorials || !tutorials.length) {
      container.innerHTML = '<div class="empty">Tutorials coming soon.</div>';
      return;
    }
    const tpl = document.getElementById("tpl-tutorial");
    for (const t of tutorials) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelector(".tutorial-title").textContent = t.title;
      node.querySelector(".tutorial-blurb").textContent = t.blurb || "";
      const time = node.querySelector(".tutorial-time");
      time.textContent = t.minutes ? `${t.minutes} min read` : "";
      const head = node.querySelector(".tutorial-head");
      const body = node.querySelector(".tutorial-body");

      head.addEventListener("click", async () => {
        const expanded = node.dataset.expanded === "true";
        if (expanded) {
          node.dataset.expanded = "false";
          body.hidden = true;
          return;
        }
        node.dataset.expanded = "true";
        body.hidden = false;
        if (!tutorialCache.has(t.slug)) {
          body.innerHTML = '<p class="empty">Loading…</p>';
          try {
            const res = await fetch(t.file + "?v=" + Date.now(), { cache: "no-cache" });
            if (!res.ok) throw new Error("HTTP " + res.status);
            const md = await res.text();
            tutorialCache.set(t.slug, renderMarkdown(md));
          } catch (err) {
            tutorialCache.set(t.slug, `<p class="empty">Couldn't load tutorial. ${escHtml(err.message || err)}</p>`);
          }
        }
        body.innerHTML = tutorialCache.get(t.slug);
      });

      container.appendChild(node);
    }
  }

  async function loadLisa() {
    if (lisaLoaded) return;
    lisaLoaded = true;
    try {
      const res = await fetch(LISA_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const g = data.greeting || {};
      document.querySelector('[data-lisa="headline"]').textContent = g.headline || "Hi Lisa";
      document.querySelector('[data-lisa="subline"]').textContent  = g.subline || "";
      renderTutorials(data.tutorials);
      renderLisaCards("lisa-news",  data.news);
      renderLisaCards("lisa-pitch", data.pitch_deck);
    } catch (err) {
      const body = document.querySelector('[data-section="lisa"]');
      const note = document.createElement("div");
      note.className = "empty";
      note.textContent = "Couldn't load Lisa content: " + (err.message || err);
      body.appendChild(note);
    }
  }

  // ---------- Gate (password) ----------
  const gatePw = document.getElementById("lisa-pw");
  const gateBtn = document.getElementById("lisa-gate-btn");
  const gateErr = document.getElementById("lisa-gate-error");
  const lockBtn = document.getElementById("lisa-lock");

  async function tryUnlock() {
    if (!gatePw) return;
    gateErr.textContent = "";
    const tryHash = await sha256Hex((gatePw.value || "").trim());
    if (tryHash === LISA_PW_HASH) {
      localStorage.setItem(LISA_UNLOCK_KEY, LISA_PW_HASH);
      closeLisaModal();
      applyFilter("lisa");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      gateErr.textContent = "Wrong password.";
      gatePw.select();
    }
  }

  if (gateBtn) gateBtn.addEventListener("click", tryUnlock);
  if (gatePw) {
    gatePw.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); tryUnlock(); }
    });
  }
  const modalClose = document.getElementById("lisa-modal-close");
  if (modalClose) modalClose.addEventListener("click", closeLisaModal);
  const modalBackdrop = document.getElementById("lisa-modal");
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) closeLisaModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalBackdrop && !modalBackdrop.hidden) closeLisaModal();
  });
  if (lockBtn) {
    lockBtn.addEventListener("click", () => {
      localStorage.removeItem(LISA_UNLOCK_KEY);
      const all = document.querySelector('[data-filter="all"]');
      if (all) all.click();
    });
  }

  // ---------- Request form ----------
  const form = document.getElementById("lisa-form");
  const msg = document.getElementById("lisa-message");
  const counter = document.getElementById("lisa-counter");
  const submitBtn = document.getElementById("lisa-submit");
  const statusEl = document.getElementById("lisa-status");

  if (form && msg) {
    msg.addEventListener("input", () => {
      const n = msg.value.length;
      counter.textContent = `${n} / 2000`;
      counter.classList.toggle("is-near", n > 1800);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = msg.value.trim();
      if (!text) {
        statusEl.dataset.kind = "error";
        statusEl.textContent = "Write something first.";
        return;
      }
      if (WORKER_PLACEHOLDER) {
        statusEl.dataset.kind = "error";
        statusEl.textContent = "Form not wired up yet — Alan still needs to deploy the Worker.";
        console.info("Lisa request (not sent, Worker URL unset):", text);
        return;
      }
      submitBtn.disabled = true;
      statusEl.dataset.kind = "";
      statusEl.textContent = "Sending…";
      try {
        const res = await fetch(WORKER_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: text,
            website: form.website.value || "",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
        statusEl.dataset.kind = "ok";
        statusEl.textContent = "Got it — Alan will review tomorrow.";
        msg.value = "";
        counter.textContent = "0 / 2000";
      } catch (err) {
        statusEl.dataset.kind = "error";
        statusEl.textContent = "Couldn't send: " + (err.message || err);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
})();
