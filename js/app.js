(() => {
  "use strict";

  const DATA_URL = "data/latest.json?v=" + Date.now();
  const LISA_URL = "data/lisa.json?v=" + Date.now();
  const THEME_KEY = "cdih-theme";
  const SECTIONS = ["updates", "news", "status", "youtube", "tutorials"];

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

  // ---------- Theme ----------
  const root = document.documentElement;
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") {
    root.setAttribute("data-theme", stored);
  } else if (matchMedia("(prefers-color-scheme: dark)").matches) {
    root.setAttribute("data-theme", "dark");
  }

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) meta.setAttribute("content", next === "dark" ? "#0b0b0d" : "#f0eee6");
  });

  // ---------- Filters ----------
  const chips = document.querySelectorAll(".chip");
  const lisaSection = document.querySelector('[data-section="lisa"]');
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const f = chip.dataset.filter;

      // 365 gate: if locked, open modal without switching tabs.
      if (f === "lisa" && !isLisaUnlocked()) {
        openLisaModal();
        return;
      }

      chips.forEach(c => c.classList.remove("is-active"));
      chip.classList.add("is-active");

      if (lisaSection) lisaSection.dataset.hidden = f === "lisa" ? "false" : "true";

      SECTIONS.forEach(s => {
        const el = document.querySelector(`.section[data-section="${s}"]`);
        if (!el) return;
        el.dataset.hidden = (f === "all" || f === s) ? "false" : "true";
      });

      if (f === "lisa") loadLisa();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

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
  function renderCard(item, videoLike) {
    const tpl = document.getElementById(videoLike ? "tpl-video" : "tpl-card");
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.href = item.url;
    const title = node.querySelector(".card-title");
    const source = node.querySelector(".card-source");
    const time = node.querySelector(".card-time");
    title.textContent = item.title || "(untitled)";
    source.textContent = item.source || item.channel || "";
    time.textContent = relTime(item.published) || prettyDate(item.published) || "";
    if (videoLike) {
      const img = node.querySelector("img");
      if (item.thumbnail) {
        img.src = item.thumbnail;
        img.alt = item.title || "";
      }
    } else {
      const sum = node.querySelector(".card-summary");
      sum.textContent = item.summary || "";
      if (!item.summary) sum.remove();
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
    items.slice(0, 12).forEach(i => frag.appendChild(renderCard(i, videoLike)));
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
      activateLisaChip();
      loadLisa();
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
