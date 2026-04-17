(() => {
  "use strict";

  const DATA_URL = "data/latest.json?v=" + Date.now();
  const TUTORIALS_365_URL = "data/365/tutorials.json?v=" + Date.now();
  const THEME_KEY = "cdih-theme";

  // Sections that render from latest.json and share the filter machinery.
  const SECTIONS = ["365", "resources", "news"];
  // Sections that are exclusive (only visible when their chip is picked).
  const DISTINCT_SECTIONS = ["home"];

  // ---------- Theme (dark-first; opt-in to light) ----------
  const root = document.documentElement;
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light") root.setAttribute("data-theme", "light");

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
  function applyFilter(f) {
    chips.forEach(c => c.classList.toggle("is-active", c.dataset.filter === f));
    DISTINCT_SECTIONS.forEach(name => {
      const el = document.querySelector(`.section[data-section="${name}"]`);
      if (el) el.dataset.hidden = f === name ? "false" : "true";
    });
    SECTIONS.forEach(s => {
      const el = document.querySelector(`.section[data-section="${s}"]`);
      if (!el) return;
      el.dataset.hidden = f === s ? "false" : "true";
    });
    if (f === "365") load365();
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
    renderTimeline();
    renderCompare();
    renderIndex();
    renderScorecard();
  }

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      applyFilter(chip.dataset.filter);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // Resources sub-pills: Videos / Official
  document.querySelectorAll(".subpill[data-tutkind]").forEach((pill) => {
    pill.addEventListener("click", () => {
      const kind = pill.dataset.tutkind;
      document.querySelectorAll(".subpill[data-tutkind]").forEach((p) => {
        const on = p === pill;
        p.classList.toggle("is-active", on);
        p.setAttribute("aria-selected", on ? "true" : "false");
      });
      const videos   = document.querySelector('[data-cards="resources-videos"]');
      const official = document.querySelector('[data-cards="resources-official"]');
      if (videos)   videos.hidden   = kind !== "video";
      if (official) official.hidden = kind !== "official";
    });
  });

  // 365 sub-pills: Resources / News
  document.querySelectorAll(".subpill[data-s365]").forEach((pill) => {
    pill.addEventListener("click", () => {
      const kind = pill.dataset.s365;
      document.querySelectorAll(".subpill[data-s365]").forEach((p) => {
        const on = p === pill;
        p.classList.toggle("is-active", on);
        p.setAttribute("aria-selected", on ? "true" : "false");
      });
      const resources = document.querySelector('[data-cards="365-resources"]');
      const news      = document.querySelector('[data-cards="365-news"]');
      if (resources) resources.hidden = kind !== "resources";
      if (news)      news.hidden      = kind !== "news";
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

  function sortByDateDesc(items) {
    return [...items].sort((a, b) => Date.parse(b.published || 0) - Date.parse(a.published || 0));
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

  function detectStatusSeverity(item) {
    const t = ((item.summary || "") + " " + (item.title || "")).toLowerCase();
    if (t.includes("resolved"))       return "resolved";
    if (t.includes("monitoring"))     return "monitoring";
    if (t.includes("identified"))     return "identified";
    return "investigating";
  }

  function faviconUrl(url) {
    try {
      const host = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
    } catch { return ""; }
  }

  const CARD_CONTAINERS = [
    "365-resources", "365-news",
    "resources-videos", "resources-official",
    "news",
  ];

  // ---------- Scroll-activation IntersectionObserver (universal) ----------
  // Cards/sections get .reveal on render; .in-view is added when they enter
  // the middle ~76% band. Sticky: unobserve on first enter so content cards
  // don't retrigger while scrolling. Home chart bars still reset-on-exit via
  // setupChartObservers below — they do NOT use this observer.
  const revealIO = ("IntersectionObserver" in window)
    ? new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target;
          el.style.willChange = "opacity, transform";
          el.classList.add("in-view");
          const onEnd = () => {
            el.style.willChange = "";
            el.removeEventListener("transitionend", onEnd);
          };
          el.addEventListener("transitionend", onEnd);
          revealIO.unobserve(el);
        }
      }, { root: null, rootMargin: "-12% 0px -12% 0px", threshold: [0, 0.15] })
    : null;

  function registerReveal(el, index) {
    if (!el) return;
    el.classList.add("reveal");
    const i = Math.min(index || 0, 4);
    el.style.setProperty("--i", String(i));
    el.style.setProperty("--d", `calc(min(var(--i), 4) * 70ms)`);
    if (revealIO) {
      revealIO.observe(el);
    } else {
      el.classList.add("in-view");
    }
  }

  // ---------- Skeletons ----------
  function showSkeletons() {
    const tpl = document.getElementById("tpl-skeleton");
    CARD_CONTAINERS.forEach(s => {
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
    items.slice(0, 18).forEach((i, idx) => {
      const node = renderCard(i, videoLike, idx);
      registerReveal(node, idx);
      frag.appendChild(node);
    });
    container.appendChild(frag);
  }

  // NEWS: split by _kind. Videos first (tpl-video), then articles (tpl-card).
  // Each group sorted by date desc internally. Never interleave.
  function renderNews(items) {
    const container = document.querySelector('[data-cards="news"]');
    if (!container) return;
    container.innerHTML = "";
    if (!items || items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No items yet — check back soon.";
      container.appendChild(empty);
      return;
    }
    const videos   = sortByDateDesc(items.filter((i) => i._kind === "news_video"));
    const articles = sortByDateDesc(items.filter((i) => i._kind !== "news_video"));
    const frag = document.createDocumentFragment();
    let idx = 0;
    videos.slice(0, 8).forEach((v) => {
      const node = renderCard(v, true, idx);
      registerReveal(node, idx);
      frag.appendChild(node);
      idx++;
    });
    articles.slice(0, 18).forEach((a) => {
      const node = renderCard(a, false, idx);
      registerReveal(node, idx);
      frag.appendChild(node);
      idx++;
    });
    container.appendChild(frag);
  }

  // NEWS status strip — compact severity indicators from sections.status.
  function renderStatusStrip(statusItems) {
    const strip = document.querySelector('[data-strip="status"]');
    if (!strip) return;
    strip.innerHTML = "";
    const items = (statusItems || []).slice(0, 4);
    if (!items.length) {
      strip.hidden = true;
      return;
    }
    strip.hidden = false;
    const frag = document.createDocumentFragment();
    items.forEach((s, idx) => {
      const sev = s._severity || detectStatusSeverity(s);
      const pill = document.createElement("a");
      pill.className = "status-pill glass";
      pill.href = s.url || "#";
      pill.target = "_blank";
      pill.rel = "noopener";
      pill.dataset.severity = sev;
      pill.innerHTML = `
        <span class="status-dot" aria-hidden="true"></span>
        <span class="status-label">${sev}</span>
        <span class="status-title"></span>
      `;
      pill.querySelector(".status-title").textContent = s.title || "";
      registerReveal(pill, idx);
      frag.appendChild(pill);
    });
    strip.appendChild(frag);
  }

  function setUpdated(name, iso) {
    const el = document.querySelector(`[data-updated="${name}"]`);
    if (!el) return;
    el.textContent = iso ? "Updated " + relTime(iso) : "";
  }

  // ---------- Main feed load ----------
  let latestData = null;
  async function load() {
    showSkeletons();
    try {
      const res = await fetch(DATA_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      latestData = data;

      const s = data.sections || {};

      // Status items pick up severity for the strip AND any card rendering.
      if (s.status) {
        s.status.forEach(item => { item._severity = detectStatusSeverity(item); });
      }

      // RESOURCES tab: split tutorials by tutorial_kind.
      const tuts = Array.isArray(s.tutorials) ? s.tutorials : [];
      const tutVideos   = tuts.filter((t) => t.tutorial_kind === "video");
      const tutOfficial = tuts.filter((t) => t.tutorial_kind !== "video");
      renderSection("resources-videos",   tutVideos,   true);
      renderSection("resources-official", tutOfficial, false);

      // NEWS tab: status strip + mixed grid (videos first, then articles).
      renderStatusStrip(s.status);
      renderNews(s.news || []);

      setUpdated("resources", data.generated_at);
      setUpdated("news",      data.generated_at);
      setUpdated("365",       data.generated_at);
      document.getElementById("generated").textContent = prettyDate(data.generated_at);

      // If the 365 tab is currently selected, render it now that latest is in.
      if (document.querySelector('.chip.is-active')?.dataset.filter === "365") {
        load365();
      }
    } catch (err) {
      CARD_CONTAINERS.forEach(name => {
        const container = document.querySelector(`[data-cards="${name}"]`);
        if (!container) return;
        container.innerHTML = `<div class="empty">Couldn't load feed. ${String(err.message || err)}</div>`;
      });
    }
  }

  load();
  renderTimeline();
  renderCompare();
  renderIndex();
  renderScorecard();
  setupChartObservers();

  // ======================================================================
  // Scroll-triggered chart animation (HOME only).
  // Bars reset-on-exit and replay on re-entry — distinct from the universal
  // card reveal observer above (which is sticky).
  // ======================================================================
  function setupChartObservers() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".cbar, .vbar, .hbar").forEach((el) => el.classList.add("is-go"));
      return;
    }
    const ACTIVATION_MARGIN = "-12.5% 0px -12.5% 0px";
    const groups = [
      { host: "#cbars", childSel: ".cbar" },
      { host: "#vbars", childSel: ".vbar" },
      { host: "#hbars", childSel: ".hbar" },
    ];
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const sel = e.target.dataset.chartChildren;
        if (!sel) continue;
        e.target.querySelectorAll(sel).forEach((k) =>
          k.classList.toggle("is-go", e.isIntersecting)
        );
      }
    }, { root: null, rootMargin: ACTIVATION_MARGIN, threshold: 0 });

    groups.forEach(({ host, childSel }) => {
      const el = document.querySelector(host);
      if (!el) return;
      el.dataset.chartChildren = childSel;
      io.observe(el);
    });

    const tl = document.getElementById("timeline-card");
    if (tl) {
      const tlIo = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) renderTimeline();
      }, { root: null, rootMargin: ACTIVATION_MARGIN, threshold: 0 });
      tlIo.observe(tl);
    }
  }

  // ======================================================================
  // Competitor comparison — context windows
  // ======================================================================
  function renderCompare() {
    const host = document.getElementById("cbars");
    if (!host) return;
    const rows = [
      { name: "Gemini 2.5 Pro",    tokens: 2_000_000, label: "2M", color: "#22d3ee" },
      { name: "Grok 4",            tokens: 2_000_000, label: "2M", color: "#e879f9" },
      { name: "Claude Opus 4.7",   tokens: 1_000_000, label: "1M", color: "#a684ff", hero: true },
      { name: "GPT-4.1",           tokens: 1_000_000, label: "1M", color: "#4ade80" },
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
  }

  // ======================================================================
  // Intelligence Index v4.0 — composite of 10 benchmarks.
  // ======================================================================
  function renderIndex() {
    const host = document.getElementById("vbars");
    if (!host) return;
    const rows = [
      { name: "Opus 4.6",       maker: "Claude",  score: 53, color: "#a684ff", hero: true },
      { name: "GPT-5.3 Codex",  maker: "OpenAI",  score: 54, color: "#4ade80" },
      { name: "GPT-5.4",        maker: "OpenAI",  score: 57, color: "#4ade80" },
      { name: "Gemini 3.1 Pro", maker: "Google",  score: 57, color: "#22d3ee" },
    ];
    const max = 70;
    host.innerHTML = "";
    rows.forEach((r, i) => {
      const h = (r.score / max) * 100;
      const delay = 0.25 + i * 0.12;
      const el = document.createElement("div");
      el.className = "vbar" + (r.hero ? " is-hero" : "");
      el.style.setProperty("--vbar-h", h.toFixed(1) + "%");
      el.style.setProperty("--vbar-col", r.color);
      el.style.setProperty("--vbar-delay", delay + "s");
      el.innerHTML = `
        <div class="vbar-val">${r.score}</div>
        <div class="vbar-track"><div class="vbar-fill"></div></div>
        <div class="vbar-name">${r.name}</div>
        <div class="vbar-lbl">${r.maker}</div>
      `;
      host.appendChild(el);
    });
  }

  // ======================================================================
  // Opus 4.7 scorecard
  // ======================================================================
  function renderScorecard() {
    const host = document.getElementById("hbars");
    if (!host) return;
    const rows = [
      { name: "XBOW · visual acuity",   score: 98.5, prev: 54.5 },
      { name: "Harvey · BigLaw Bench",  score: 90.9, prev: null, note: "high effort" },
      { name: "Cursor · CursorBench",   score: 70,   prev: 58   },
    ];
    host.innerHTML = "";
    rows.forEach((r, i) => {
      const delay = 0.25 + i * 0.18;
      const el = document.createElement("div");
      el.className = "hbar";
      el.style.setProperty("--hbar-w", r.score + "%");
      el.style.setProperty("--hbar-delay", delay + "s");
      if (r.prev != null) el.style.setProperty("--hbar-prev", r.prev + "%");
      const delta = r.prev != null ? "+" + (+(r.score - r.prev).toFixed(1)) + "pt" : (r.note || "");
      el.innerHTML = `
        <div class="hbar-name">${r.name}</div>
        <div class="hbar-val">${r.score}%</div>
        <div class="hbar-delta">${delta}</div>
        <div class="hbar-track">
          ${r.prev != null ? '<div class="hbar-prev-tick" aria-hidden="true"></div>' : ''}
          <div class="hbar-fill">
            <div class="hbar-electron" aria-hidden="true"></div>
          </div>
        </div>
      `;
      host.appendChild(el);
    });
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
      { date: "2026-04-16", model: "Opus 4.7 (1M)", ctx: 1_000_000 },
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

    let d = "";
    data.forEach((p, i) => {
      const x = xOf(p.date).toFixed(1);
      const y = yOf(p.ctx).toFixed(1);
      d += (i === 0 ? "M" : "L") + x + " " + y + " ";
    });
    const areaD = d + `L${xOf(data[data.length-1].date).toFixed(1)} ${padT + innerH} L${xOf(data[0].date).toFixed(1)} ${padT + innerH} Z`;

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

    const lastX = xOf(data[data.length-1].date);
    const lastY = yOf(data[data.length-1].ctx);
    const labels = `
      <text class="label" x="${lastX - 8}" y="${lastY - 14}" text-anchor="end"
            style="animation-delay: 1.5s; font-weight: 600; fill: var(--accent-365-hi);">${data[data.length-1].model}</text>
    `;

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

    const legend = document.getElementById("timeline-legend");
    if (legend) {
      legend.innerHTML =
        `<span>${data[0].date.slice(0,4)} · ${data[0].model}</span>` +
        `<span>${data[data.length-1].date.slice(0,4)} · ${data[data.length-1].model}</span>`;
    }
  }

  // ======================================================================
  // 365 tab
  // ======================================================================
  let loaded365 = false;
  const tutorialCache = new Map();

  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

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

  function renderTutorials(containerSel, tutorials) {
    const container = document.querySelector(containerSel);
    if (!container) return;
    container.innerHTML = "";
    if (!tutorials || !tutorials.length) {
      container.innerHTML = '<div class="empty">Tutorials coming soon.</div>';
      return;
    }
    const tpl = document.getElementById("tpl-tutorial");
    tutorials.forEach((t, idx) => {
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

      registerReveal(node, idx);
      container.appendChild(node);
    });
  }

  async function load365() {
    if (loaded365) return;
    loaded365 = true;

    // Resources (tutorials) — fetch the 365 index.
    try {
      const res = await fetch(TUTORIALS_365_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      renderTutorials('[data-cards="365-resources"]', data.tutorials || []);
    } catch (err) {
      const c = document.querySelector('[data-cards="365-resources"]');
      if (c) c.innerHTML = `<div class="empty">Couldn't load tutorials. ${escHtml(err.message || err)}</div>`;
    }

    // News — pull from latest.json sections.comply365_news (already loaded
    // by load(), or re-fetch if not yet available).
    let items = latestData?.sections?.comply365_news;
    if (!items) {
      try {
        const res = await fetch(DATA_URL, { cache: "no-cache" });
        if (res.ok) {
          const data = await res.json();
          latestData = data;
          items = data?.sections?.comply365_news || [];
        }
      } catch {
        items = [];
      }
    }
    renderSection("365-news", sortByDateDesc(items || []), false);
  }
})();
