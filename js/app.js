(() => {
  "use strict";

  const DATA_URL = "data/latest.json?v=" + Date.now();
  const THEME_KEY = "cdih-theme";
  const SECTIONS = ["updates", "news", "status", "youtube", "tutorials"];

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
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      const f = chip.dataset.filter;
      SECTIONS.forEach(s => {
        const el = document.querySelector(`.section[data-section="${s}"]`);
        if (!el) return;
        el.dataset.hidden = f !== "all" && f !== s ? "true" : "false";
      });
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

  // ---------- Rendering ----------
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

  // ---------- Load ----------
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
})();
