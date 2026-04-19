(() => {
  "use strict";

  const DATA_URL = "data/latest.json?v=" + Date.now();
  const TUTORIALS_365_URL = "data/365/tutorials.json?v=" + Date.now();
  const TOOLS_URL    = "data/learn/tools.json?v=" + Date.now();
  const ACADEMY_URL  = "data/learn/academy_courses.json?v=" + Date.now();
  const HUB_MAP_URL  = "data/learn/claude_hub_map.json?v=" + Date.now();
  const SNIPPETS_URL = "data/learn/snippets.json?v=" + Date.now();
  const LESSONS_URL  = "data/learn/lessons.json?v="  + Date.now();
  const USECASES_URL = "data/learn/usecases.json?v=" + Date.now();
  const VERSION_URL = "data/version.json?v=" + Date.now();
  const THEME_KEY = "cdih-theme";

  // Tool-catalog modality vocabulary. "all" is the default filter.
  // Order here drives the filter-pill order in the UI.
  const MODALITIES = [
    { id: "all",        label: "All"        },
    { id: "llm",        label: "LLM"        },
    { id: "coding",     label: "Coding"     },
    { id: "agent",      label: "Agent"      },
    { id: "image",      label: "Image"      },
    { id: "video",      label: "Video"      },
    { id: "voice",      label: "Voice"      },
    { id: "automation", label: "Automation" },
    { id: "deploy",     label: "Deploy"     },
    { id: "data",       label: "Data"       },
  ];
  const PRICE_BADGE = {
    free:     "Free",
    lte20:    "≤$20/mo",
    lte50:    "≤$50/mo",
    premium:  "Premium",
  };
  // Ordinal for price-ascending sort. Unknown tiers go last.
  const PRICE_RANK = { free: 0, lte20: 1, lte50: 2, premium: 3 };

  // Projects localStorage key (M1.11).
  const PROJECTS_KEY = "clhub.v1.projects";

  // Module-scope snippet cache populated by loadSnippets(); consumed by the
  // tool-detail modal (M2.9) and the cmd-K search (M2.10).
  let snippetsData = [];

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Capability taxonomy for the Finder checkbox grid.
  // Each capability.matches lists the tools.json `provides` tags that
  // satisfy that capability. Live counts = # tools whose provides set
  // intersects the matches set.
  const CAP_GROUPS = [
    { id: "foundation", label: "Foundation Model", caps: [
      { id: "cap-frontier-llm",  label: "Frontier reasoning",   matches: ["frontier-llm"] },
      { id: "cap-agent-framework", label: "Agent framework",    matches: ["agent-framework"] },
      { id: "cap-projects",      label: "Projects / Artifacts", matches: ["projects", "artifacts"] },
    ]},
    { id: "build", label: "Build Surface", caps: [
      { id: "cap-ide",           label: "IDE / pair-coder",     matches: ["ide", "inline-edit"] },
      { id: "cap-no-code",       label: "No-code app builder",  matches: ["no-code-frontend"] },
      { id: "cap-terminal",      label: "Terminal agent",       matches: ["terminal-agent"] },
      { id: "cap-premium-motion", label: "Premium-motion UI",   matches: ["premium-motion-ui"] },
    ]},
    { id: "agent", label: "Agent & Orchestration", caps: [
      { id: "cap-mcp",           label: "MCP client",           matches: ["mcp-client"] },
      { id: "cap-workflow",      label: "Workflow automation",  matches: ["workflow-automation"] },
      { id: "cap-scheduled",     label: "Scheduled / cron",     matches: ["cron-jobs"] },
    ]},
    { id: "voice", label: "Voice", caps: [
      { id: "cap-tts",           label: "Text-to-speech",       matches: ["text-to-speech", "expressive-tts"] },
      { id: "cap-voice-clone",   label: "Voice cloning",        matches: ["voice-cloning"] },
      { id: "cap-realtime-voice", label: "Realtime voice",      matches: ["real-time-voice"] },
    ]},
    { id: "video", label: "Video", caps: [
      { id: "cap-gen-video",     label: "Generative video",     matches: ["text-to-video"] },
      { id: "cap-img-to-video",  label: "Image-to-video",       matches: ["image-to-video", "keyframe-video-animation"] },
      { id: "cap-cinematic",     label: "4K / synced audio",    matches: ["4k-video", "synced-audio"] },
      { id: "cap-video-edit",    label: "Edit / color grade",   matches: ["video-editor", "color-grading"] },
    ]},
    { id: "3d-motion", label: "3D / Motion", caps: [
      { id: "cap-3d-scene",      label: "3D scene / modelling", matches: ["3d-scene-composition"] },
      { id: "cap-ai-3d-model",   label: "AI 3D model gen",      matches: ["ai-3d-model-gen"] },
      { id: "cap-explode-view",  label: "Explode-view / particles", matches: ["explode-view-animation", "particle-effect"] },
      { id: "cap-camera-path",   label: "Camera path control",  matches: ["camera-path-control"] },
    ]},
    { id: "image", label: "Image", caps: [
      { id: "cap-text-to-image", label: "Text-to-image",        matches: ["text-to-image"] },
      { id: "cap-image-edit",    label: "Image edit / inpaint", matches: ["image-to-image"] },
      { id: "cap-text-on-image", label: "Text on image",        matches: ["text-rendering"] },
    ]},
    { id: "data", label: "Data & Retrieval", caps: [
      { id: "cap-postgres",      label: "Postgres DB",          matches: ["postgres-db"] },
      { id: "cap-vector",        label: "Vector / RAG",         matches: ["vector-search"] },
      { id: "cap-auth",          label: "Auth bundled",         matches: ["auth-included"] },
    ]},
    { id: "knowledge", label: "Knowledge & Research", caps: [
      { id: "cap-file-upload",   label: "File uploads",         matches: ["file-upload"] },
      { id: "cap-long-context",  label: "Long context",         matches: ["long-context"] },
    ]},
    { id: "deploy", label: "Deploy & Hosting", caps: [
      { id: "cap-static",        label: "Static / edge hosting", matches: ["static-hosting", "edge-functions"] },
      { id: "cap-preview",       label: "Preview deploys",       matches: ["preview-deploys"] },
      { id: "cap-nextjs",        label: "Next.js native",        matches: ["next-js-native"] },
    ]},
    { id: "glue", label: "Glue & Ops", caps: [
      { id: "cap-one-click",     label: "One-click deploy",     matches: ["one-click-deploy", "vercel-deploy"] },
      { id: "cap-self-host",     label: "Self-hostable",        matches: ["self-hostable"] },
    ]},
    { id: "local", label: "Local / Desktop", caps: [
      { id: "cap-local-script",  label: "Local script / CLI",   matches: ["local-script", "cli-tool"] },
      { id: "cap-desktop-ui",    label: "Desktop UI",           matches: ["desktop-ui"] },
      { id: "cap-file-parsing",  label: "File / legacy parsing", matches: ["file-parsing", "legacy-format-ingest"] },
    ]},
  ];
  const CAP_BY_ID = {};
  CAP_GROUPS.forEach(g => g.caps.forEach(c => { CAP_BY_ID[c.id] = { ...c, groupLabel: g.label }; }));

  // M5.5: keyword → cap-id heuristic. Deliberately conservative — better to
  // add zero caps than wrong caps. Each entry: a regex run against the
  // lower-cased description, and the list of cap IDs it implies.
  const CAP_KEYWORD_RULES = [
    { rx: /\b(3d|three\s*d|blender|mesh(?:y)?|depth\s*map|explode[- ]view|exploded)\b/, caps: ["cap-3d-scene", "cap-explode-view"] },
    { rx: /\bcamera\s*(path|move|dolly|push|pull)\b/,                                   caps: ["cap-camera-path"] },
    { rx: /\b(particle|particles|smoke|fire|sparks)\b/,                                 caps: ["cap-explode-view"] },
    { rx: /\b(ai\s*(generated|gen)\s*video|generative\s*video|veo|runway\s*gen|kling|sora|text[- ]to[- ]video)\b/, caps: ["cap-gen-video"] },
    { rx: /\b(keyframe|first[-\s]*last|nano\s*banana|google\s*flow|image[- ]to[- ]video)\b/, caps: ["cap-img-to-video"] },
    { rx: /\b(4k|cinematic|synced\s*audio|narrat(?:ed|ion))\b/,                         caps: ["cap-cinematic"] },
    { rx: /\b(edit|color\s*grade|davinci|resolve|premiere|final\s*cut|post[- ]production)\b/, caps: ["cap-video-edit"] },
    { rx: /\b(text[- ]to[- ]image|midjourney|flux|stable\s*diffusion|nano\s*banana|gemini\s*image|image\s*gen(?:eration)?)\b/, caps: ["cap-text-to-image"] },
    { rx: /\b(inpaint|outpaint|image\s*edit|image[- ]to[- ]image)\b/,                   caps: ["cap-image-edit"] },
    { rx: /\btext\s*(on|in)\s*image\b/,                                                 caps: ["cap-text-on-image"] },
    { rx: /\b(voice(\s*over| acting| clone| clon(?:ing|e))?|narration|tts|text[- ]to[- ]speech|elevenlabs)\b/, caps: ["cap-tts"] },
    { rx: /\b(voice\s*clone|clone\s*voice)\b/,                                          caps: ["cap-voice-clone"] },
    { rx: /\brealtime\s*voice\b|\blive\s*voice\b/,                                      caps: ["cap-realtime-voice"] },
    { rx: /\b(no[- ]code|lovable|bolt|v0\b|vercel\s*v0|webflow|framer\s*site)\b/,        caps: ["cap-no-code"] },
    { rx: /\b(ide|cursor|zed|copilot|pair[- ]?coder|inline\s*edit)\b/,                  caps: ["cap-ide"] },
    { rx: /\b(terminal|cli|shell|claude\s*code)\b/,                                     caps: ["cap-terminal", "cap-local-script"] },
    { rx: /\b(premium[- ]motion|framer\s*motion|spring\s*physics|layout\s*animation|shared[- ]element)\b/, caps: ["cap-premium-motion"] },
    { rx: /\b(agent\s*sdk|claude\s*agent|agent\s*framework|langchain|langgraph)\b/,     caps: ["cap-agent-framework"] },
    { rx: /\bmcp\b|\bmodel\s*context\s*protocol\b/,                                     caps: ["cap-mcp"] },
    { rx: /\b(n8n|zapier|make\.com|workato|workflow\s*(automation|engine))\b/,          caps: ["cap-workflow"] },
    { rx: /\b(cron|schedul(?:ed?|ing)|every\s*\d+\s*(min|hour|day))\b/,                 caps: ["cap-scheduled"] },
    { rx: /\b(postgres|supabase|neon|planetscale|rds)\b/,                               caps: ["cap-postgres"] },
    { rx: /\b(vector|rag|retrieval[- ]augmented|embedding(s)?|pgvector|pinecone)\b/,    caps: ["cap-vector"] },
    { rx: /\b(auth|sign[- ]?in|login|clerk|auth0|magic\s*link)\b/,                      caps: ["cap-auth"] },
    { rx: /\b(file\s*upload|drop\s*files?|attach\s*files?)\b/,                          caps: ["cap-file-upload"] },
    { rx: /\b(long\s*context|large\s*context|million\s*tokens?)\b/,                     caps: ["cap-long-context"] },
    { rx: /\b(vercel|cloudflare\s*pages|netlify|github\s*pages|static\s*hosting|edge\s*functions?)\b/, caps: ["cap-static"] },
    { rx: /\bpreview\s*(deploy|url)\b/,                                                 caps: ["cap-preview"] },
    { rx: /\bnext\.?js\b/,                                                              caps: ["cap-nextjs"] },
    { rx: /\bone[- ]click\s*deploy\b|\bdeploy\s*button\b/,                              caps: ["cap-one-click"] },
    { rx: /\bself[- ]host(?:ed|able)?\b|\bself[- ]hosted\b/,                            caps: ["cap-self-host"] },
    { rx: /\b(local\s*(script|program|tool)|cli\s*tool|command\s*line\s*tool|python\s*script|node\s*script)\b/, caps: ["cap-local-script"] },
    { rx: /\b(desktop\s*(app|ui)|electron|tauri)\b/,                                    caps: ["cap-desktop-ui"] },
    { rx: /\b(file\s*pars(?:er|ing)|fixed[- ]width|cp437|accpac|dos\s*(report|output|file))\b/, caps: ["cap-file-parsing"] },
    { rx: /\bfrontier\s*(llm|model|reasoning)\b|\b(gpt|opus|claude|gemini|grok)\b/,     caps: ["cap-frontier-llm"] },
    { rx: /\b(artifacts?|claude\s*projects?|long\s*chat)\b/,                            caps: ["cap-projects"] },
  ];
  function autoCheckCapsFromText(text) {
    const s = (text || "").toLowerCase();
    const before = new Set(capsSelected);
    for (const rule of CAP_KEYWORD_RULES) {
      if (rule.rx.test(s)) rule.caps.forEach((c) => capsSelected.add(c));
    }
    let added = 0;
    capsSelected.forEach((id) => { if (!before.has(id)) added++; });
    if (added > 0) {
      try { localStorage.setItem(FINDER_CAPS_KEY, JSON.stringify([...capsSelected])); } catch {}
    }
    return added;
  }

  // Sections that render from latest.json and share the filter machinery.
  const SECTIONS = ["comply365", "news-media"];
  // Sections that are exclusive (only visible when their chip is picked).
  const DISTINCT_SECTIONS = ["home", "learn", "tools", "projects", "youtube"];

  // Per-model brand-aligned electric palette, used by every chart so
  // colors match across the site.
  //   Claude (Anthropic)  → electric orange
  //   OpenAI / GPT        → electric teal/mint
  //   Google / Gemini     → electric blue
  //   xAI / Grok          → electric magenta
  const MODEL_COL = {
    claude: "#ff7a3d",
    openai: "#14b8a6",
    google: "#4a90ff",
    xai:    "#e879f9",
  };

  // Type tokens — declared early so any hoisted render function that reads
  // them (e.g. via replayHomeAnimations fired during initial applyFilter)
  // doesn't hit a TDZ error.
  const TYPE_LABEL = {
    "LLM":      "LLM",
    "image":    "Image",
    "video":    "Video",
    "voice":    "Voice",
    "tool-app": "Tool",
  };
  const TYPE_DESC = {
    "LLM":      "Text & code reasoning",
    "image":    "Image generation",
    "video":    "Video generation",
    "voice":    "Voice / speech",
    "tool-app": "App built on a model",
  };

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
    if (f === "comply365") load365();
    if (f === "home") replayHomeAnimations();
    if (f === "news-media") replayNewsMediaAnimations();
  }

  // If a host's bounding rect overlaps the activation zone (middle ~75%
  // of the viewport), re-toggle .is-go on its children. This protects
  // against the edge case where the user re-clicks the same tab: the
  // IntersectionObserver won't fire (no visibility change) but render*()
  // has wiped the children's .is-go class, so bars stay invisible.
  function chartHostInView(host) {
    const rect = host.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const top = vh * 0.125;
    const bottom = vh * 0.875;
    return rect.bottom > top && rect.top < bottom;
  }
  function replayChartObservers(hostSelectors) {
    requestAnimationFrame(() => {
      hostSelectors.forEach((sel) => {
        const host = document.querySelector(sel);
        if (!host) return;
        const childSel = host.dataset.chartChildren;
        if (!childSel) return;
        const on = chartHostInView(host);
        host.querySelectorAll(childSel).forEach((k) =>
          k.classList.toggle("is-go", on)
        );
      });
    });
  }

  // Replay Home-tab animations whenever the tab is activated.
  // Charts moved to News & Media in M1.3 — Home only animates its hero,
  // stat-grid, and CTA.
  function replayHomeAnimations() {
    const css = document.querySelectorAll(
      ".section-home, .section-home .home-hero, .section-home .stat-grid, .section-home .home-cta"
    );
    css.forEach(el => {
      el.style.animation = "none";
      void el.offsetHeight;      // force reflow
      el.style.animation = "";
    });
    // M3.6: refresh "Continue where you left off" each time Home is activated.
    renderContinueCard();
  }

  // Replay News & Media chart animations when the tab is activated and the
  // State-of-AI sub-pill pane is visible (default on tab load).
  function replayNewsMediaAnimations() {
    const statePane = document.querySelector('[data-pane="news-media-state"]');
    if (!statePane || statePane.hidden) return;
    const css = statePane.querySelectorAll(".hero");
    css.forEach(el => {
      el.style.animation = "none";
      void el.offsetHeight;
      el.style.animation = "";
    });
    renderTimeline();
    renderCompare();
    renderIndex();
    renderScorecard();
    renderLlmFaceoff();
    replayChartObservers(["#cbars", "#vbars", "#hbars", "#faceoff"]);
  }

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      applyFilter(chip.dataset.filter);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // Learn sub-pills (M3.7: only [data-learn="claude"] remains inside Learn;
  // Finder / Tools / My Projects promoted to top-level sections. M3.8 will
  // rebuild this with What's new / Courses / Tutorials). Guard for legacy
  // markup; if no pills present this is a no-op.
  document.querySelectorAll(".subpill[data-learn]").forEach((pill) => {
    pill.addEventListener("click", () => {
      const kind = pill.dataset.learn;
      document.querySelectorAll(".subpill[data-learn]").forEach((p) => {
        const on = p === pill;
        p.classList.toggle("is-active", on);
        p.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll('.pane[data-pane^="learn-"]').forEach((pane) => {
        pane.hidden = pane.dataset.pane !== `learn-${kind}`;
      });
    });
  });

  // Projects sub-pills (M3.7): Saved list vs. + New project (Finder).
  document.querySelectorAll(".subpill[data-projects-view]").forEach((pill) => {
    pill.addEventListener("click", () => {
      const kind = pill.dataset.projectsView;
      document.querySelectorAll(".subpill[data-projects-view]").forEach((p) => {
        const on = p === pill;
        p.classList.toggle("is-active", on);
        p.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll('.pane[data-pane^="projects-"]').forEach((pane) => {
        pane.hidden = pane.dataset.pane !== `projects-${kind}`;
      });
    });
  });

  // Courses tab: Anthropic Academy / aiStacked Originals (M3.8).
  document.querySelectorAll(".subpill[data-courses]").forEach((pill) => {
    pill.addEventListener("click", () => {
      const kind = pill.dataset.courses;
      document.querySelectorAll(".subpill[data-courses]").forEach((p) => {
        const on = p === pill;
        p.classList.toggle("is-active", on);
        p.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll('.pane[data-pane^="courses-"]').forEach((pane) => {
        pane.hidden = pane.dataset.pane !== `courses-${kind}`;
      });
    });
  });

  // Legacy Claude hub sub-sub-pills (removed in M3.8) — this block is a
  // no-op guard in case old markup resurfaces during a partial deploy.
  document.querySelectorAll(".subpill[data-claude]").forEach((pill) => {
    pill.addEventListener("click", () => {
      const kind = pill.dataset.claude;
      document.querySelectorAll(".subpill[data-claude]").forEach((p) => {
        const on = p === pill;
        p.classList.toggle("is-active", on);
        p.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll('.pane[data-pane^="claude-"]').forEach((pane) => {
        pane.hidden = pane.dataset.pane !== `claude-${kind}`;
      });
      // Mark What's new as seen the moment it's opened — count resets on
      // next render. Any items that arrive AFTER this moment will re-light it.
      if (kind === "whats-new") {
        setClaudeWhatsNewLastSeen(new Date().toISOString());
        updateClaudeWhatsNewBadge();
      }
    });
  });

  // News & Media sub-pills: State of AI / News
  document.querySelectorAll(".subpill[data-newsmedia]").forEach((pill) => {
    pill.addEventListener("click", () => {
      const kind = pill.dataset.newsmedia;
      document.querySelectorAll(".subpill[data-newsmedia]").forEach((p) => {
        const on = p === pill;
        p.classList.toggle("is-active", on);
        p.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll('.pane[data-pane^="news-media-"]').forEach((pane) => {
        pane.hidden = pane.dataset.pane !== `news-media-${kind}`;
      });
      if (kind === "state") replayNewsMediaAnimations();
    });
  });

  // Comply365 sub-pills: Tutorials / Resources / News
  document.querySelectorAll(".subpill[data-s365]").forEach((pill) => {
    pill.addEventListener("click", () => {
      const kind = pill.dataset.s365;
      document.querySelectorAll(".subpill[data-s365]").forEach((p) => {
        const on = p === pill;
        p.classList.toggle("is-active", on);
        p.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll('.pane[data-pane^="365-"]').forEach((pane) => {
        pane.hidden = pane.dataset.pane !== `365-${kind}`;
      });
    });
  });

  // 365 Resources sub-sub-pills: Videos / Official
  document.querySelectorAll(".subpill[data-s365res]").forEach((pill) => {
    pill.addEventListener("click", () => {
      const kind = pill.dataset.s365res;
      document.querySelectorAll(".subpill[data-s365res]").forEach((p) => {
        const on = p === pill;
        p.classList.toggle("is-active", on);
        p.setAttribute("aria-selected", on ? "true" : "false");
      });
      const videos   = document.querySelector('[data-cards="365-resources-videos"]');
      const official = document.querySelector('[data-cards="365-resources-official"]');
      if (videos)   videos.hidden   = kind !== "videos";
      if (official) official.hidden = kind !== "official";
    });
  });

  // Initial filter (respects the chip that was marked .is-active in the HTML)
  const initial = document.querySelector(".chip.is-active");
  if (initial) applyFilter(initial.dataset.filter);

  // Chip shortcut buttons — any element with data-chip jumps to that tab,
  // and optional data-subpill activates a named sub-pill inside it.
  const SUBPILL_ATTR = {
    "learn":      "learn",
    "comply365":  "s365",
    "news-media": "newsmedia",
    "projects":   "projects-view",
  };
  document.querySelectorAll("[data-chip]").forEach(btn => {
    btn.addEventListener("click", () => {
      const chipName = btn.dataset.chip;
      const chip = document.querySelector(`[data-filter="${chipName}"]`);
      if (chip) {
        chip.click();
      } else {
        // M3.9: news-media has no chip but its section still exists.
        // Hit applyFilter directly so the Home "State of AI" card still works.
        applyFilter(chipName);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      const sub = btn.dataset.subpill;
      const attr = SUBPILL_ATTR[chipName];
      if (sub && attr) {
        const pill = document.querySelector(`[data-${attr}="${sub}"]`);
        if (pill) pill.click();
      }
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
    "365-tutorials", "365-resources-videos", "365-resources-official", "365-news",
    "news", "claude-whats-new",
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
  // LEARN → Claude → What's new: unified release feed from Claude Code + MCP repos.
  let claudeLearningItems = [];
  let claudeLearningFilter = "all";

  // Pinned items — URLs the user wants to keep regardless of feed churn.
  // Pins are SCRAPE-RESISTANT: each pin stores the full item snapshot
  // (title, url, source, published, summary) so the card can be rerendered
  // M3.10: URL-based pin helpers now read from the unified clhub.v1.saves
  // store. isPinned(url) = any save exists for kind="learning" with that
  // URL. Resurrection of scraped-off items reads saves too.
  function isPinned(url) { return isSavedAny("learning", url); }
  function resurrectPinnedItems(liveItems) {
    const saves = getSaves();
    const live = new Map(liveItems.map((it) => [it.url, it]));
    // Collect every learning-kind save across all project scopes + unscoped.
    const snapshots = new Map();
    for (const [key, entry] of Object.entries(saves)) {
      if (entry && entry.kind === "learning" && entry.url) {
        // Use any variant; all share the same URL and card metadata.
        if (!snapshots.has(entry.url)) snapshots.set(entry.url, entry);
      }
    }
    for (const [url, snap] of snapshots) {
      if (!live.has(url)) {
        live.set(url, {
          url,
          title:     snap.title     || "",
          source:    snap.source    || "",
          published: snap.published || null,
          summary:   snap.summary   || "",
          thumb:     snap.thumb     || null,
        });
      }
    }
    return Array.from(live.values());
  }

  // Unread badge — tracks last time the user viewed What's new. First visit
  // silently seeds "now" so the badge doesn't light up with 70 items on a
  // brand-new device. Subsequent visits count items newer than that stamp.
  const CLAUDE_WHATS_NEW_KEY = "clhub.v1.claudeWhatsNewLastSeen";
  function getClaudeWhatsNewLastSeen() {
    try {
      const raw = localStorage.getItem(CLAUDE_WHATS_NEW_KEY);
      if (!raw) return null;
      const t = Date.parse(raw);
      return isNaN(t) ? null : t;
    } catch { return null; }
  }
  function setClaudeWhatsNewLastSeen(iso) {
    try { localStorage.setItem(CLAUDE_WHATS_NEW_KEY, iso); } catch {}
  }
  function updateClaudeWhatsNewBadge() {
    const badge = document.querySelector('[data-subpill-badge="whats-new"]');
    if (!badge) return;
    let lastSeen = getClaudeWhatsNewLastSeen();
    if (lastSeen === null) {
      // First visit on this device — seed silently, no badge.
      setClaudeWhatsNewLastSeen(new Date().toISOString());
      badge.hidden = true;
      badge.textContent = "";
      return;
    }
    const count = claudeLearningItems.reduce((n, it) => {
      const t = it.published ? Date.parse(it.published) : NaN;
      return !isNaN(t) && t > lastSeen ? n + 1 : n;
    }, 0);
    if (count > 0) {
      badge.hidden = false;
      badge.textContent = String(count);
      badge.setAttribute("aria-label", `${count} new since last visit`);
    } else {
      badge.hidden = true;
      badge.textContent = "";
    }
  }

  // M3.9: filter buckets collapse to All / Anthropic / Industry / Videos.
  // Items can carry an explicit _bucket hint (set when merging s.news into
  // the feed); otherwise we derive from source.
  function sourceBucket(source, hintedBucket) {
    if (hintedBucket) return hintedBucket;
    const s = source || "";
    if (s.startsWith("YouTube")) return "videos";
    if (s === "Claude Code") return "anthropic";
    if (s === "Claude API Release Notes") return "anthropic";
    if (s.startsWith("MCP")) return "anthropic";
    if (s === "Anthropic Academy") return "anthropic";
    if (/anthropic/i.test(s)) return "anthropic";
    return "industry";
  }

  function renderClaudeLearning(items) {
    claudeLearningItems = Array.isArray(items) ? items : [];
    paintClaudeLearning();
    updateClaudeWhatsNewBadge();
    updateLearnFilterCounts();
    renderYouTube();
  }

  // M3.10: dedicated YouTube tab. Pulls every item in the merged feed whose
  // sourceBucket is "videos" (source starts with "YouTube"); renders as
  // cards-mixed with the in-app iframe modal click-through and unified Save.
  function renderYouTube() {
    const host = document.getElementById("youtube-grid");
    if (!host) return;
    const allSaves = getSaves();
    // Rebuild from the live feed + any saved videos that have dropped off.
    const liveVids = claudeLearningItems
      .filter((it) => sourceBucket(it.source, it._bucket) === "videos");
    const savedVids = [];
    for (const entry of Object.values(allSaves)) {
      if (entry && entry.kind === "learning" && entry.url &&
          sourceBucket(entry.source || "", entry._bucket) === "videos" &&
          !liveVids.some((it) => it.url === entry.url)) {
        savedVids.push({
          url: entry.url,
          title: entry.title || "",
          source: entry.source || "YouTube",
          published: entry.published || null,
          summary: "",
          thumb: entry.thumb || null,
        });
      }
    }
    const items = liveVids.concat(savedVids).sort((a, b) => {
      const pa = isSavedAny("learning", a.url) ? 1 : 0;
      const pb = isSavedAny("learning", b.url) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const ta = a.published ? Date.parse(a.published) : 0;
      const tb = b.published ? Date.parse(b.published) : 0;
      return tb - ta;
    });
    host.innerHTML = "";
    if (items.length === 0) {
      host.innerHTML = `<div class="empty">No videos in the feed yet.</div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    items.slice(0, 60).forEach((it, idx) => {
      const node = renderCard(it, false, idx);
      node.dataset.learnBucket = "videos";
      if (isSavedAny("learning", it.url)) node.dataset.pinned = "1";
      const pill = node.querySelector(".card-pill");
      if (pill) { pill.textContent = "Video"; pill.dataset.pill = "videos"; }
      attachPinButton(node, it);
      const vid = extractYouTubeId(it.url);
      if (vid) {
        node.addEventListener("click", (e) => {
          if (e.target.closest(".save-btn")) return;
          e.preventDefault();
          openVideoModal(vid, it.title, it.url);
        });
      }
      frag.appendChild(node);
    });
    host.appendChild(frag);
  }

  function updateLearnFilterCounts() {
    const merged = resurrectPinnedItems(claudeLearningItems)
      .filter((it) => sourceBucket(it.source, it._bucket) !== "videos");
    const counts = { all: merged.length, anthropic: 0, industry: 0 };
    for (const it of merged) {
      const b = sourceBucket(it.source, it._bucket);
      if (counts[b] !== undefined) counts[b]++;
    }
    document.querySelectorAll("[data-filter-count]").forEach((el) => {
      const key = el.dataset.filterCount;
      const n = counts[key];
      el.textContent = n > 0 ? String(n) : "";
    });
  }

  function paintClaudeLearning() {
    const container = document.querySelector('[data-cards="claude-whats-new"]');
    if (!container) return;
    container.innerHTML = "";
    const filter = claudeLearningFilter;
    // M3.10: videos live in the YouTube top-level tab now.
    const merged = resurrectPinnedItems(claudeLearningItems)
      .filter((it) => sourceBucket(it.source, it._bucket) !== "videos");
    const filtered = filter === "all"
      ? merged
      : merged.filter((it) => sourceBucket(it.source, it._bucket) === filter);
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = filter === "all"
        ? "No items yet — check back soon."
        : "No items in this category yet.";
      container.appendChild(empty);
      return;
    }
    // Sort saved items first (within the filtered set), then by date desc.
    // Saves float to the top of whatever view the user has.
    const sorted = filtered.slice().sort((a, b) => {
      const pa = isSavedAny("learning", a.url) ? 1 : 0;
      const pb = isSavedAny("learning", b.url) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const ta = a.published ? Date.parse(a.published) : 0;
      const tb = b.published ? Date.parse(b.published) : 0;
      return tb - ta;
    });
    const frag = document.createDocumentFragment();
    const BUCKET_LABEL = { anthropic: "Anthropic", industry: "Industry", videos: "Video" };
    sorted.slice(0, 24).forEach((it, idx) => {
      const node = renderCard(it, false, idx);
      const bucket = sourceBucket(it.source, it._bucket);
      node.dataset.learnBucket = bucket;
      if (isSavedAny("learning", it.url)) node.dataset.pinned = "1";
      const pill = node.querySelector(".card-pill");
      if (pill && BUCKET_LABEL[bucket]) {
        pill.textContent = BUCKET_LABEL[bucket];
        pill.dataset.pill = bucket;
      }
      attachPinButton(node, it.url);
      // For YouTube cards, open in-app modal instead of navigating out.
      if (bucket === "videos") {
        const vid = extractYouTubeId(it.url);
        if (vid) {
          node.addEventListener("click", (e) => {
            // Let pin taps through; don't hijack them.
            if (e.target.closest(".card-pin")) return;
            e.preventDefault();
            openVideoModal(vid, it.title, it.url);
          });
        }
      }
      registerReveal(node, idx);
      frag.appendChild(node);
    });
    container.appendChild(frag);
  }

  // YouTube in-app modal — keeps users from being pushed out of the web app
  // when they tap a video card. Opens the official youtube.com/embed iframe
  // so there's no third-party JS dependency and no cookie/identity handoff.
  function extractYouTubeId(url) {
    try {
      const u = new URL(url);
      if (u.hostname === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
      if (/(^|\.)youtube\.com$/.test(u.hostname)) {
        if (u.pathname === "/watch") return u.searchParams.get("v");
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts[0] === "shorts" || parts[0] === "embed") return parts[1] || null;
      }
    } catch {}
    return null;
  }
  function openVideoModal(videoId, title, externalUrl) {
    const modal = document.getElementById("video-modal");
    if (!modal) return;
    const iframe = modal.querySelector(".video-modal-iframe");
    const titleEl = modal.querySelector(".video-modal-title");
    const openLink = modal.querySelector(".video-modal-open");
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    if (titleEl) titleEl.textContent = title || "";
    if (openLink) openLink.href = externalUrl || `https://www.youtube.com/watch?v=${videoId}`;
    modal.hidden = false;
    document.body.classList.add("modal-open");
  }
  function closeVideoModal() {
    const modal = document.getElementById("video-modal");
    if (!modal || modal.hidden) return;
    const iframe = modal.querySelector(".video-modal-iframe");
    iframe.src = "";
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }
  document.querySelectorAll("#video-modal [data-close]").forEach((el) => {
    el.addEventListener("click", (e) => { e.preventDefault(); closeVideoModal(); });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeVideoModal();
  });
  const expandBtn = document.querySelector("#video-modal .video-modal-expand");
  if (expandBtn) {
    expandBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const frame = document.querySelector("#video-modal .video-modal-frame");
      if (!frame) return;
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      } else {
        (frame.requestFullscreen || frame.webkitRequestFullscreen)?.call(frame);
      }
    });
  }

  // SVG pin glyphs — outline when unpinned, filled when pinned.
  const PIN_SVG_OUTLINE = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l-1 5 3 3H7l3-3-1-5z"/><path d="M12 12v8"/></svg>';
  const PIN_SVG_FILLED  = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 4h6l-1 5 3 3H7l3-3-1-5z"/><rect x="11.2" y="12" width="1.6" height="8" rx="0.6"/></svg>';

  // M3.10: card pin → unified Save button. Same glyphs, same affordance,
  // but click opens the global save picker instead of toggling a pin.
  function attachPinButton(node, urlOrItem) {
    const item = typeof urlOrItem === "object" ? urlOrItem : null;
    const url  = item ? item.url : urlOrItem;
    if (!url || node.querySelector(".save-btn")) return;
    const saved = isSavedAny("learning", url);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "save-btn save-btn-card";
    btn.dataset.saveKind = "learning";
    btn.dataset.saveId   = url;
    btn.dataset.saveLabel = item?.title || url;
    if (item?.thumb)     btn.dataset.saveThumb     = item.thumb;
    if (item?.source)    btn.dataset.saveSource    = item.source;
    if (item?.published) btn.dataset.savePublished = item.published;
    btn.dataset.saveUrl = url;
    btn.dataset.saved = saved ? "1" : "";
    btn.innerHTML = saved ? PIN_SVG_FILLED : PIN_SVG_OUTLINE;
    btn.setAttribute("aria-label", saved ? "Edit save" : "Save");
    btn.setAttribute("aria-pressed", saved ? "true" : "false");
    // Click handled by the delegated .save-btn listener; nothing else needed.
    node.appendChild(btn);
  }

  // Snippet loader (M3.8): populates the module-scope snippetsData cache
  // used by the tool-detail modal, cmd-K search, and the new flat Academy
  // course renderer. Per-bucket .snippets-host rendering removed — snippets
  // now surface INSIDE each Academy course card (see renderAcademyFlat).
  async function loadSnippets() {
    try {
      const res = await fetch(SNIPPETS_URL, { cache: "no-cache" });
      if (!res.ok) return;
      const payload = await res.json();
      snippetsData = Array.isArray(payload.snippets) ? payload.snippets : [];
    } catch {}
  }

  // Wire .snippet-copy click handlers inside `root`. Idempotent via dataset flag.
  function wireSnippetCopyButtons(root) {
    (root || document).querySelectorAll(".snippet-copy").forEach((btn) => {
      if (btn.dataset.wired === "1") return;
      btn.dataset.wired = "1";
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const row = btn.closest(".snippet-row");
        const code = row && row.querySelector(".snippet-code");
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code.textContent || "");
          btn.dataset.state = "ok";
          btn.textContent = "Copied";
          setTimeout(() => { btn.dataset.state = ""; btn.textContent = "Copy"; }, 1800);
        } catch {
          btn.dataset.state = "err";
          btn.textContent = "Copy failed";
          setTimeout(() => { btn.dataset.state = ""; btn.textContent = "Copy"; }, 1800);
        }
      });
    });
  }

  function renderSnippetRow(s) {
    const lang = (s.language || "text").toLowerCase();
    const pinned = isSavedAny("snippet", s.id);
    return `
      <details class="snippet-row glass" data-lang="${escapeHtml(lang)}">
        <summary class="snippet-summary">
          <div class="snippet-head">
            <div class="snippet-lang">${escapeHtml(lang)}</div>
            <div class="snippet-title">${escapeHtml(s.title || s.id)}</div>
          </div>
          <div class="snippet-lede">${escapeHtml(s.summary || "")}</div>
        </summary>
        <div class="snippet-body">
          <div class="snippet-actions">
            <button type="button" class="save-btn save-btn-row" data-save-kind="snippet" data-save-id="${escapeHtml(s.id)}" data-save-label="${escapeHtml(s.title || s.id)}" data-saved="${pinned ? "1" : ""}" aria-pressed="${pinned ? "true" : "false"}" aria-label="${pinned ? "Edit save" : "Save"}">${pinned ? PIN_SVG_FILLED : PIN_SVG_OUTLINE}<span class="save-btn-label">${pinned ? "Saved" : "Save"}</span></button>
            <button type="button" class="snippet-copy">Copy</button>
          </div>
          <pre class="snippet-pre"><code class="snippet-code">${escapeHtml(s.body || "")}</code></pre>
        </div>
      </details>
    `;
  }

  // Claude hub — render Anthropic Academy course grids in each subpill pane.
  // Two files: academy_courses.json (full metadata from the scraper) and
  // claude_hub_map.json (hand-curated slug → bucket mapping). Rendered once
  // on load; no cache-bust needed within a session.
  // Flat Academy renderer (M3.8). One list, grouped by bucket label
  // (Basics → Claude Code → Skills → MCP → Agent SDK), with each course
  // as a <details> element whose body contains the course description,
  // the official link, and every snippet whose tags belong to the
  // course's bucket.
  const BUCKET_LABEL = {
    "basics":    "Basics",
    "code":      "Claude Code",
    "skills":    "Skills",
    "mcp":       "MCP",
    "agent-sdk": "Agent SDK",
  };
  async function loadAcademyHub() {
    const host = document.getElementById("academy-flat-host");
    if (!host) return;
    try {
      const [coursesRes, mapRes] = await Promise.all([
        fetch(ACADEMY_URL, { cache: "no-cache" }),
        fetch(HUB_MAP_URL, { cache: "no-cache" }),
      ]);
      if (!coursesRes.ok || !mapRes.ok) return;
      const coursesPayload = await coursesRes.json();
      const mapPayload = await mapRes.json();
      const bySlug = Object.fromEntries(
        (coursesPayload.courses || []).map((c) => [c.slug, c])
      );
      const buckets = mapPayload.buckets || {};
      const snippetTagsByBucket = mapPayload.snippetTagsByBucket || {};
      const parts = [];
      for (const [bucket, slugs] of Object.entries(buckets)) {
        const courses = (slugs || []).map((s) => bySlug[s]).filter(Boolean);
        if (courses.length === 0) continue;
        const tagSet = new Set(snippetTagsByBucket[bucket] || []);
        const bucketSnippets = tagSet.size
          ? snippetsData.filter((s) => (s.snippetTags || []).some((t) => tagSet.has(t)))
          : [];
        const label = BUCKET_LABEL[bucket] || bucket;
        const courseRows = courses.map((c) => {
          const snipCount = bucketSnippets.length;
          const snipRows = bucketSnippets.map((s) => renderSnippetRow(s)).join("");
          const snipBlock = snipCount > 0
            ? `<div class="academy-course-snippets">
                 <div class="academy-course-snippets-head">Snippets · ${snipCount}</div>
                 <div class="snippet-list">${snipRows}</div>
               </div>`
            : "";
          return `
            <details class="academy-course glass">
              <summary class="academy-course-summary">
                <span class="academy-course-bucket" data-bucket="${escapeHtml(bucket)}">${escapeHtml(label)}</span>
                <span class="academy-course-title">${escapeHtml(c.title)}</span>
                ${snipCount > 0 ? `<span class="academy-course-badge">${snipCount} snippet${snipCount === 1 ? "" : "s"}</span>` : ""}
              </summary>
              <div class="academy-course-body">
                ${c.summary ? `<p class="academy-course-body-lede">${escapeHtml(c.summary)}</p>` : ""}
                <a class="academy-course-cta" href="${escapeHtml(c.url)}" target="_blank" rel="noopener">Start course on Anthropic Academy ↗</a>
                ${snipBlock}
              </div>
            </details>
          `;
        }).join("");
        parts.push(`
          <div class="academy-bucket" data-bucket="${escapeHtml(bucket)}">
            <div class="academy-bucket-head">
              <span class="academy-bucket-label">${escapeHtml(label)}</span>
              <span class="academy-bucket-count">${courses.length} course${courses.length === 1 ? "" : "s"}</span>
            </div>
            <div class="academy-bucket-list">${courseRows}</div>
          </div>
        `);
      }
      host.innerHTML = parts.join("");
      wireSnippetCopyButtons(host);
    } catch {}
  }

  document.querySelectorAll(".learn-filter[data-learn-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.learnFilter || "all";
      if (key === claudeLearningFilter) return;
      claudeLearningFilter = key;
      document.querySelectorAll(".learn-filter[data-learn-filter]").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });
      paintClaudeLearning();
    });
  });

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

  // ---------- Tools catalog (Learn → Tools) ----------
  let toolsData = null;
  let toolsModality = "all";

  // Finder capability-grid state (M1.8). Persisted per-device.
  const FINDER_CAPS_KEY = "clhub.v1.finderCaps";
  const capsSelected = new Set();
  try {
    const raw = localStorage.getItem(FINDER_CAPS_KEY);
    if (raw) JSON.parse(raw).forEach((id) => capsSelected.add(id));
  } catch {}
  function persistCaps() {
    try { localStorage.setItem(FINDER_CAPS_KEY, JSON.stringify([...capsSelected])); } catch {}
  }

  async function loadTools() {
    try {
      const res = await fetch(TOOLS_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      toolsData = Array.isArray(data.tools) ? data.tools : [];
      renderModalityFilter();
      renderTools();
      renderCapGrid();
      renderCapFilterBar();
      renderProjects(); // re-render so chips show real tool names
    } catch (err) {
      const host = document.getElementById("tool-grid");
      if (host) host.innerHTML = `<div class="empty">Couldn't load tools catalog. ${String(err.message || err)}</div>`;
    }
  }

  function countToolsForCap(cap) {
    if (!toolsData || !cap) return 0;
    const m = cap.matches || [];
    return toolsData.filter((t) =>
      (t.provides || []).some((p) => m.includes(p))
    ).length;
  }

  function renderCapGrid() {
    const host = document.getElementById("cap-grid");
    if (!host || !toolsData) return;
    host.innerHTML = "";
    CAP_GROUPS.forEach((g) => {
      const group = document.createElement("section");
      group.className = "cap-group glass";
      group.innerHTML = `<h5 class="cap-group-title">${g.label}</h5>`;
      const list = document.createElement("div");
      list.className = "cap-list";
      g.caps.forEach((c) => {
        const n = countToolsForCap(c);
        const checked = capsSelected.has(c.id);
        const row = document.createElement("label");
        row.className = "cap-check" + (checked ? " is-checked" : "") + (n === 0 ? " is-empty" : "");
        row.innerHTML = `
          <input type="checkbox" class="cap-input" data-cap="${c.id}" ${checked ? "checked" : ""} ${n === 0 ? "disabled" : ""} />
          <span class="cap-label">${c.label}</span>
          <span class="cap-count">${n}</span>
        `;
        list.appendChild(row);
      });
      group.appendChild(list);
      host.appendChild(group);
    });
    host.querySelectorAll(".cap-input").forEach((input) => {
      input.addEventListener("change", () => {
        const id = input.dataset.cap;
        if (input.checked) capsSelected.add(id);
        else capsSelected.delete(id);
        input.closest(".cap-check").classList.toggle("is-checked", input.checked);
        persistCaps();
        renderCapFilterBar();
        // Live-update the stack if the output is already revealed.
        const stackOutput = document.getElementById("stack-output");
        if (stackOutput && !stackOutput.hidden) renderStack();
      });
    });
  }

  // ----- Finder output — dual Easiest / Best path (M1.9–M1.10) -----
  // Easy sort per plan: (+setupComplexity, -priorityScore, price-asc,
  // Claude-native-first, id). Claude-native wins ties.
  function cmpEasy(a, b) {
    const pairs = [
      [(a.setupComplexity ?? 3),      (b.setupComplexity ?? 3)],
      [-(a.priorityScore ?? 3),       -(b.priorityScore ?? 3)],
      [(PRICE_RANK[a.priceTier] ?? 99), (PRICE_RANK[b.priceTier] ?? 99)],
      [(a.claudeNative ? 0 : 1),      (b.claudeNative ? 0 : 1)],
    ];
    for (const [x, y] of pairs) if (x !== y) return x - y;
    return (a.id || "").localeCompare(b.id || "");
  }

  // Best sort per plan: (-priorityScore, quality-hints from tags, id) with
  // Claude-native ties preferred. priceTier DESC stands in for a
  // quality hint — premium-tier tools tend to be best-in-class.
  function cmpBest(a, b) {
    const pairs = [
      [-(a.priorityScore ?? 3),       -(b.priorityScore ?? 3)],
      [(a.claudeNative ? 0 : 1),      (b.claudeNative ? 0 : 1)],
      [-(PRICE_RANK[a.priceTier] ?? 0), -(PRICE_RANK[b.priceTier] ?? 0)],
      [(a.setupComplexity ?? 3),      (b.setupComplexity ?? 3)],
    ];
    for (const [x, y] of pairs) if (x !== y) return x - y;
    return (a.id || "").localeCompare(b.id || "");
  }

  function pickStack(capIds, cmp) {
    const picks = new Map(); // tool.id -> { tool, caps: [capLabel] }
    const unmet = [];
    capIds.forEach((id) => {
      const cap = CAP_BY_ID[id];
      if (!cap) return;
      const candidates = toolsData.filter((t) =>
        (t.provides || []).some((p) => (cap.matches || []).includes(p))
      );
      if (candidates.length === 0) {
        unmet.push(cap.label);
        return;
      }
      const primary = [...candidates].sort(cmp)[0];
      const entry = picks.get(primary.id) || { tool: primary, caps: [] };
      entry.caps.push(cap.label);
      picks.set(primary.id, entry);
    });
    const ordered = [...picks.values()].sort((a, b) => cmp(a.tool, b.tool));
    return { ordered, unmet };
  }

  function renderStack({ scroll } = {}) {
    const host = document.getElementById("stack-output");
    if (!host || !toolsData) return;
    if (capsSelected.size === 0) {
      host.hidden = true;
      updateSaveCtaVisibility();
      return;
    }
    const caps = [...capsSelected];
    const easy = pickStack(caps, cmpEasy);
    const best = pickStack(caps, cmpBest);
    renderColumn(easy.ordered, easy.unmet, "stack-easy-list", "stack-easy-summary");
    renderColumn(best.ordered, best.unmet, "stack-best-list", "stack-best-summary");
    host.hidden = false;
    updateSaveCtaVisibility();
    if (scroll) host.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateSaveCtaVisibility() {
    const stack = document.getElementById("stack-output");
    const saveBlock = document.getElementById("stack-save");
    const saveForm = document.getElementById("save-form");
    if (!saveBlock) return;
    const stackVisible = stack && !stack.hidden;
    const formOpen = saveForm && !saveForm.hidden;
    saveBlock.hidden = !stackVisible || formOpen;
    if (!stackVisible && saveForm && !saveForm.hidden) {
      saveForm.hidden = true;
    }
  }

  function renderColumn(picked, unmet, listId, summaryId) {
    const ol      = document.getElementById(listId);
    const summary = document.getElementById(summaryId);
    if (!ol || !summary) return;
    summary.textContent = picked.length === 1 ? "1 tool" : `${picked.length} tools`;
    ol.innerHTML = "";
    picked.forEach((entry, i) => {
      const { tool, caps } = entry;
      const complexity = Math.max(0, Math.min(5, tool.setupComplexity || 0));
      const stars = "★".repeat(complexity) + "☆".repeat(5 - complexity);
      const priceLabel = PRICE_BADGE[tool.priceTier] || "";
      const priceBadge = priceLabel
        ? `<span class="tool-badge tool-badge-price" data-tier="${tool.priceTier}">${priceLabel}</span>`
        : "";
      const claudeBadge = tool.claudeNative
        ? `<span class="tool-badge tool-badge-claude">Claude-native</span>`
        : "";
      const modalityLabel = (MODALITIES.find((m) => m.id === tool.modality) || {}).label || tool.modality || "";
      const li = document.createElement("li");
      li.className = "stack-step" + (i === 0 ? " stack-step-first" : "");
      li.innerHTML = `
        <div class="stack-step-num" aria-hidden="true">${i + 1}</div>
        <article class="stack-card glass${tool.claudeNative ? " stack-card-claude" : ""}">
          <div class="stack-card-head">
            <span class="stack-vendor">${tool.vendor || ""}</span>
            <span class="stack-modality">${modalityLabel}</span>
          </div>
          <h4 class="stack-name">${tool.name}</h4>
          <p class="stack-tagline">${tool.tagline || ""}</p>
          <p class="stack-why"><span class="stack-why-label">Picked because:</span> covers ${caps.join(", ")}.</p>
          <div class="stack-meta">
            <span class="stack-complexity" title="Setup complexity ${complexity}/5">Setup <span class="stack-stars">${stars}</span></span>
            ${priceBadge}
            ${claudeBadge}
          </div>
          <div class="stack-actions">
            ${i === 0 ? '<span class="stack-start-chip">Start here</span>' : '<span class="stack-next-chip">Next step</span>'}
            <a class="stack-link" href="${tool.docsUrl || tool.officialUrl || "#"}" target="_blank" rel="noopener">Docs →</a>
          </div>
        </article>
      `;
      ol.appendChild(li);
    });
    if (unmet && unmet.length) {
      const li = document.createElement("li");
      li.className = "stack-unmet";
      li.innerHTML = `
        <div class="stack-step-num stack-step-num-warn" aria-hidden="true">!</div>
        <div class="stack-unmet-body">
          <strong>Nothing in the catalog covers:</strong> ${unmet.join(", ")}.
          The stub catalog is 14 tools — these capabilities fill in as the catalog grows.
        </div>
      `;
      ol.appendChild(li);
    }
  }

  // ----- My Projects (M1.11) -----
  function getProjects() {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
  }
  function putProjects(obj) {
    try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(obj)); } catch {}
  }
  function saveProject({ title, path }) {
    if (!toolsData || capsSelected.size === 0) return null;
    const caps = [...capsSelected];
    const cmp = path === "best" ? cmpBest : cmpEasy;
    const { ordered, unmet } = pickStack(caps, cmp);
    const id = "prj_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
    const goal = document.getElementById("finder-input")?.value?.trim() || "";
    const finalTitle = (title || "").trim()
      || goal.slice(0, 60)
      || `Project ${new Date().toLocaleDateString()}`;
    const project = {
      id,
      title: finalTitle,
      goal,
      path: path === "best" ? "best" : "easy",
      capsSelected: caps,
      stack: ordered.map((e) => ({ toolId: e.tool.id, caps: e.caps })),
      unmet,
      createdAt: new Date().toISOString(),
    };
    const projects = getProjects();
    projects[id] = project;
    putProjects(projects);
    renderProjects();
    renderContinueCard();
    return project;
  }
  function deleteProject(id) {
    const projects = getProjects();
    if (!projects[id]) return;
    delete projects[id];
    putProjects(projects);
    renderProjects();
    renderContinueCard();
  }

  // ---------- Backup export / import (M3.3) ----------
  // Dumps every clhub.v1.* + cdih-theme localStorage key into a single JSON
  // file the user can stash somewhere safe. Re-import merges by default,
  // replacing each included key. Never touches non-backup keys.
  const BACKUP_KEY_PREFIXES = ["clhub.v1.", "cdih-"];
  function isBackupKey(k) {
    return BACKUP_KEY_PREFIXES.some((p) => k.startsWith(p));
  }
  function collectBackup() {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && isBackupKey(k)) data[k] = localStorage.getItem(k);
      }
    } catch {}
    return {
      schema: "aistacked-backup",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion: (document.getElementById("version-num")?.textContent || "").replace(/^v/, "") || null,
      keys: data,
    };
  }
  function applyBackup(payload, { mode = "merge" } = {}) {
    if (!payload || typeof payload !== "object") throw new Error("invalid: not an object");
    if (payload.schema !== "aistacked-backup") throw new Error("invalid: wrong schema");
    const keys = payload.keys;
    if (!keys || typeof keys !== "object") throw new Error("invalid: missing keys");
    // Only accept backup-prefix keys — never overwrite anything else.
    const accepted = Object.keys(keys).filter(isBackupKey);
    if (accepted.length === 0) throw new Error("invalid: no backup keys found");
    if (mode === "replace") {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && isBackupKey(k)) localStorage.removeItem(k);
      }
    }
    accepted.forEach((k) => {
      const v = keys[k];
      if (typeof v === "string") localStorage.setItem(k, v);
    });
    return accepted.length;
  }
  function setBackupStatus(msg, tone) {
    const el = document.getElementById("backup-status");
    if (!el) return;
    el.textContent = msg || "";
    el.dataset.tone = tone || "";
    if (msg) {
      clearTimeout(setBackupStatus._t);
      setBackupStatus._t = setTimeout(() => {
        if (el.textContent === msg) { el.textContent = ""; el.dataset.tone = ""; }
      }, 3000);
    }
  }
  function openBackupModal() {
    const payload = collectBackup();
    const text = JSON.stringify(payload, null, 2);
    const n = Object.keys(payload.keys).length;
    const modal = document.getElementById("backup-modal");
    if (!modal) return;
    const ta  = modal.querySelector(".backup-modal-json");
    const sub = modal.querySelector(".backup-modal-sub");
    if (ta)  ta.value = text;
    if (sub) sub.textContent = `${n} key${n === 1 ? "" : "s"} · ${(new Blob([text]).size / 1024).toFixed(1)} KB`;
    // Reset transient button labels.
    const copyBtn   = modal.querySelector(".backup-modal-copy");
    const laptopBtn = modal.querySelector(".backup-modal-laptop");
    if (copyBtn)   { copyBtn.textContent   = "Copy";          copyBtn.dataset.state   = ""; }
    if (laptopBtn) { laptopBtn.textContent = "Save to laptop"; laptopBtn.dataset.state = ""; }
    modal.hidden = false;
    document.body.classList.add("modal-open");
  }
  function closeBackupModal() {
    const modal = document.getElementById("backup-modal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (!document.querySelector(".video-modal:not([hidden]), .tool-modal:not([hidden]), .search-modal:not([hidden]), .pin-picker-modal:not([hidden])")) {
      document.body.classList.remove("modal-open");
    }
  }
  async function copyBackupJson() {
    const modal = document.getElementById("backup-modal");
    const ta = modal?.querySelector(".backup-modal-json");
    const btn = modal?.querySelector(".backup-modal-copy");
    if (!ta || !btn) return;
    try {
      await navigator.clipboard.writeText(ta.value);
      btn.textContent = "Copied"; btn.dataset.state = "ok";
    } catch {
      // Fallback for iOS if clipboard API is blocked: select + execCommand.
      ta.focus(); ta.select();
      try { document.execCommand("copy"); btn.textContent = "Copied"; btn.dataset.state = "ok"; }
      catch { btn.textContent = "Copy failed"; btn.dataset.state = "err"; }
    }
    setTimeout(() => { btn.textContent = "Copy"; btn.dataset.state = ""; }, 1600);
  }
  async function saveBackupToLaptop() {
    const modal = document.getElementById("backup-modal");
    const ta  = modal?.querySelector(".backup-modal-json");
    const btn = modal?.querySelector(".backup-modal-laptop");
    if (!ta || !btn) return;
    btn.textContent = "Saving…"; btn.dataset.state = "";
    try {
      const res = await fetch("/__save_backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: ta.value,
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json().catch(() => ({}));
      btn.textContent = data.path ? `Saved → ${data.path}` : "Saved";
      btn.dataset.state = "ok";
    } catch (err) {
      btn.textContent = "Save failed";
      btn.dataset.state = "err";
    }
    setTimeout(() => { btn.textContent = "Save to laptop"; btn.dataset.state = ""; }, 2400);
  }
  async function handleImportFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const n = applyBackup(payload, { mode: "merge" });
      setBackupStatus(`Imported ${n} key${n === 1 ? "" : "s"} — reloading…`, "ok");
      setTimeout(() => location.reload(), 700);
    } catch (err) {
      setBackupStatus(`Import failed: ${err.message || err}`, "err");
    }
  }
  {
    const exportBtn = document.getElementById("backup-export");
    const importBtn = document.getElementById("backup-import-trigger");
    const fileInput = document.getElementById("backup-import-file");
    if (exportBtn) exportBtn.addEventListener("click", (e) => { e.preventDefault(); openBackupModal(); });
    if (importBtn && fileInput) {
      importBtn.addEventListener("click", (e) => { e.preventDefault(); fileInput.click(); });
      fileInput.addEventListener("change", () => {
        const f = fileInput.files?.[0];
        if (f) handleImportFile(f);
        fileInput.value = "";
      });
    }
    // Backup modal wiring.
    document.querySelectorAll("#backup-modal [data-close]").forEach((el) => {
      el.addEventListener("click", (ev) => { ev.preventDefault(); closeBackupModal(); });
    });
    const copyBtn   = document.querySelector("#backup-modal .backup-modal-copy");
    const laptopBtn = document.querySelector("#backup-modal .backup-modal-laptop");
    if (copyBtn)   copyBtn.addEventListener("click", (e) => { e.preventDefault(); copyBackupJson(); });
    if (laptopBtn) laptopBtn.addEventListener("click", (e) => { e.preventDefault(); saveBackupToLaptop(); });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const m = document.getElementById("backup-modal");
      if (m && !m.hidden) closeBackupModal();
    });
  }

  // ---------- Authored lessons + MCQ quizzes (M4.1 / M4.2 / M4.3) ----------
  let lessonsData = [];
  const lessonBodyCache = new Map();
  const LESSON_PROGRESS_KEY = "clhub.v1.lessonProgress";
  const TRACK_LABEL = {
    "claude-code":  "Claude Code",
    "skills":       "Skills",
    "mcp":          "MCP",
    "finder":       "Finder",
    "image-video":  "Image / Video",
    "nocode":       "No-code",
    "local":        "Local / Desktop",
  };
  function getLessonProgress() {
    try {
      const raw = localStorage.getItem(LESSON_PROGRESS_KEY);
      if (!raw) return {};
      const obj = JSON.parse(raw);
      return obj && typeof obj === "object" ? obj : {};
    } catch { return {}; }
  }
  function putLessonProgress(obj) {
    try { localStorage.setItem(LESSON_PROGRESS_KEY, JSON.stringify(obj)); } catch {}
  }
  function lessonState(slug) {
    const p = getLessonProgress();
    return p[slug] || null;
  }
  function setLessonState(slug, state) {
    const p = getLessonProgress();
    if (state === null) delete p[slug]; else p[slug] = state;
    putLessonProgress(p);
  }
  async function loadLessons() {
    try {
      const res = await fetch(LESSONS_URL, { cache: "no-cache" });
      if (!res.ok) return;
      const payload = await res.json();
      lessonsData = Array.isArray(payload.lessons) ? payload.lessons : [];
    } catch { lessonsData = []; }
    renderLessonsList();
  }
  function renderLessonsList() {
    const host = document.getElementById("lessons-list");
    if (!host) return;
    if (lessonsData.length === 0) {
      host.innerHTML = `<div class="empty glass academy-empty">No lessons yet. First one lands soon — check back, or hit the Academy tab for Anthropic's own catalog in the meantime.</div>`;
      return;
    }
    const byTrack = new Map();
    lessonsData
      .slice()
      .sort((a, b) => (a.track || "").localeCompare(b.track || "") || (a.order || 0) - (b.order || 0))
      .forEach((l) => {
        const k = l.track || "misc";
        if (!byTrack.has(k)) byTrack.set(k, []);
        byTrack.get(k).push(l);
      });
    const progress = getLessonProgress();
    const sections = [];
    for (const [track, list] of byTrack) {
      const label = TRACK_LABEL[track] || track;
      const completed = list.filter((l) => progress[l.slug]?.state === "completed").length;
      const rows = list.map((l) => {
        const state = progress[l.slug]?.state || "new";
        const stateLabel = state === "completed" ? "Completed"
                        : state === "in_progress" ? "In progress"
                        : "Not started";
        return `
          <button type="button" class="lesson-row" data-lesson-slug="${escapeHtml(l.slug)}">
            <div class="lesson-row-head">
              <span class="lesson-row-min">${l.minutes ? l.minutes + " min" : ""}</span>
              <span class="lesson-row-title">${escapeHtml(l.title)}</span>
              <span class="lesson-row-state" data-state="${escapeHtml(state)}">${stateLabel}</span>
            </div>
            <div class="lesson-row-summary">${escapeHtml(l.summary || "")}</div>
          </button>
        `;
      }).join("");
      sections.push(`
        <div class="lessons-track">
          <div class="lessons-track-head">
            <span class="lessons-track-label">${escapeHtml(label)}</span>
            <span class="lessons-track-count">${completed}/${list.length}</span>
          </div>
          <div class="lessons-track-rows">${rows}</div>
        </div>
      `);
    }
    host.innerHTML = sections.join("");
    host.querySelectorAll(".lesson-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        e.preventDefault();
        openLesson(row.dataset.lessonSlug);
      });
    });
  }
  async function openLesson(slug) {
    const lesson = lessonsData.find((l) => l.slug === slug);
    const modal = document.getElementById("lesson-modal");
    if (!lesson || !modal) return;
    modal.dataset.slug = slug;
    const titleEl = modal.querySelector(".lesson-modal-title");
    const trackEl = modal.querySelector(".lesson-modal-track");
    const minEl   = modal.querySelector(".lesson-modal-min");
    const statusEl = modal.querySelector(".lesson-modal-status");
    const mdHost  = modal.querySelector("#lesson-markdown");
    const quizHost = modal.querySelector("#lesson-quiz");
    const completeBtn = modal.querySelector("#lesson-complete");
    const resetBtn    = modal.querySelector("#lesson-reset");
    if (titleEl) titleEl.textContent = lesson.title || "";
    if (trackEl) trackEl.textContent = TRACK_LABEL[lesson.track] || lesson.track || "";
    if (minEl)   minEl.textContent   = lesson.minutes ? lesson.minutes + " min" : "";
    const progress = lessonState(slug);
    const isComplete = progress?.state === "completed";
    if (statusEl) {
      statusEl.textContent = isComplete ? "Completed" :
                              progress ? "In progress" : "";
      statusEl.dataset.state = isComplete ? "completed" : progress ? "in_progress" : "";
    }
    if (completeBtn) completeBtn.textContent = isComplete ? "Mark incomplete" : "Mark complete";
    if (resetBtn)    resetBtn.hidden = !progress;

    // Load + render the markdown body (cached).
    if (mdHost) {
      if (lessonBodyCache.has(slug)) {
        mdHost.innerHTML = lessonBodyCache.get(slug);
      } else {
        mdHost.innerHTML = `<div class="empty">Loading lesson…</div>`;
        try {
          const res = await fetch(`data/learn/lessons/${slug}.md?v=${Date.now()}`, { cache: "no-cache" });
          if (res.ok) {
            const md = await res.text();
            const html = renderMarkdown(md);
            lessonBodyCache.set(slug, html);
            mdHost.innerHTML = html;
          } else {
            mdHost.innerHTML = `<div class="empty">Couldn't load lesson body.</div>`;
          }
        } catch {
          mdHost.innerHTML = `<div class="empty">Couldn't load lesson body.</div>`;
        }
      }
    }
    // Render quiz.
    if (quizHost) {
      const quiz = Array.isArray(lesson.quiz) ? lesson.quiz : [];
      const savedAnswers = progress?.answers || {};
      quizHost.innerHTML = quiz.length === 0 ? "" : `
        <div class="lesson-quiz-head">Check your understanding</div>
        ${quiz.map((q, qi) => {
          const chosen = savedAnswers[qi];
          const hasAnswered = Number.isInteger(chosen);
          return `
            <div class="lesson-q" data-q-idx="${qi}">
              <div class="lesson-q-text">${escapeHtml(q.q)}</div>
              <div class="lesson-q-choices">
                ${q.choices.map((c, ci) => {
                  const correct = ci === q.answer;
                  const picked = hasAnswered && ci === chosen;
                  let cls = "lesson-q-choice";
                  if (hasAnswered) {
                    if (picked && correct)   cls += " is-correct is-picked";
                    else if (picked)         cls += " is-wrong is-picked";
                    else if (correct)        cls += " is-correct";
                  }
                  return `<button type="button" class="${cls}" data-choice-idx="${ci}" ${hasAnswered ? "disabled" : ""}>${escapeHtml(c)}</button>`;
                }).join("")}
              </div>
              ${hasAnswered && q.why ? `<div class="lesson-q-why">${escapeHtml(q.why)}</div>` : ""}
            </div>
          `;
        }).join("")}
      `;
      // Click handlers on choices.
      quizHost.querySelectorAll(".lesson-q-choice").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          if (btn.disabled) return;
          const q = btn.closest(".lesson-q");
          const qi = Number(q?.dataset.qIdx);
          const ci = Number(btn.dataset.choiceIdx);
          const state = lessonState(slug) || { state: "in_progress", answers: {}, startedAt: new Date().toISOString() };
          state.answers = state.answers || {};
          state.answers[qi] = ci;
          state.state = state.state === "completed" ? "completed" : "in_progress";
          setLessonState(slug, state);
          openLesson(slug); // re-render with the reveal
        });
      });
    }
    modal.hidden = false;
    document.body.classList.add("modal-open");
  }
  function closeLessonModal() {
    const modal = document.getElementById("lesson-modal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (!document.querySelector(".video-modal:not([hidden]), .tool-modal:not([hidden]), .search-modal:not([hidden]), .pin-picker-modal:not([hidden]), .backup-modal:not([hidden]), .storage-modal:not([hidden])")) {
      document.body.classList.remove("modal-open");
    }
    renderLessonsList(); // refresh status chips
  }
  {
    const completeBtn = document.getElementById("lesson-complete");
    const resetBtn    = document.getElementById("lesson-reset");
    if (completeBtn) completeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const modal = document.getElementById("lesson-modal");
      const slug = modal?.dataset.slug;
      if (!slug) return;
      const cur = lessonState(slug);
      if (cur?.state === "completed") {
        setLessonState(slug, { ...cur, state: "in_progress", completedAt: null });
      } else {
        setLessonState(slug, {
          ...(cur || { answers: {}, startedAt: new Date().toISOString() }),
          state: "completed",
          completedAt: new Date().toISOString(),
        });
      }
      openLesson(slug);
    });
    if (resetBtn) resetBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const modal = document.getElementById("lesson-modal");
      const slug = modal?.dataset.slug;
      if (!slug) return;
      setLessonState(slug, null);
      openLesson(slug);
    });
    document.querySelectorAll("#lesson-modal [data-close]").forEach((el) => {
      el.addEventListener("click", (ev) => { ev.preventDefault(); closeLessonModal(); });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const m = document.getElementById("lesson-modal");
      if (m && !m.hidden) closeLessonModal();
    });
  }

  // ---------- Storage monitor (M3.4) ----------
  // Shows localStorage usage for aiStacked's namespace and gives the user
  // an escape hatch if they want to drop a single key. Browsers give us
  // 5-10 MB per origin; 5 MB is the safe lowest-common-denominator budget.
  const STORAGE_BUDGET_BYTES = 5 * 1024 * 1024;
  // Friendlier labels for known keys.
  const STORAGE_KEY_LABEL = {
    "clhub.v1.projects":             "Projects",
    "clhub.v1.saves":                "Saves (pinned tools / snippets / learning items)",
    "clhub.v1.learningPins":         "Legacy learning pins (pre-M3.10, safe to delete after migration)",
    "clhub.v1.savesMigrated":        "Migration flag",
    "clhub.v1.finderCaps":           "Finder — selected capabilities",
    "clhub.v1.finderDraft":          "Finder — textarea draft",
    "clhub.v1.claudeWhatsNewLastSeen": "What's new — last-seen timestamp",
    "cdih-theme":                    "Theme (dark / light)",
  };
  function byteSize(s) {
    try { return new Blob([s || ""]).size; } catch { return (s || "").length; }
  }
  function collectStorageKeys() {
    const rows = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !isBackupKey(k)) continue;
        const v = localStorage.getItem(k);
        rows.push({ key: k, size: byteSize(v), length: (v || "").length });
      }
    } catch {}
    rows.sort((a, b) => b.size - a.size);
    return rows;
  }
  function formatBytes(n) {
    if (n < 1024)       return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(2) + " MB";
  }
  function openStorageModal() {
    const modal = document.getElementById("storage-modal");
    if (!modal) return;
    renderStorageBody();
    modal.hidden = false;
    document.body.classList.add("modal-open");
  }
  function closeStorageModal() {
    const modal = document.getElementById("storage-modal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (!document.querySelector(".video-modal:not([hidden]), .tool-modal:not([hidden]), .search-modal:not([hidden]), .pin-picker-modal:not([hidden]), .backup-modal:not([hidden])")) {
      document.body.classList.remove("modal-open");
    }
  }
  function renderStorageBody() {
    const bar     = document.getElementById("storage-usage-bar");
    const caption = document.getElementById("storage-usage-caption");
    const list    = document.getElementById("storage-key-list");
    const sub     = document.querySelector("#storage-modal .storage-modal-sub");
    if (!bar || !caption || !list) return;
    const rows = collectStorageKeys();
    const total = rows.reduce((n, r) => n + r.size, 0);
    const pct = Math.min(100, Math.round((total / STORAGE_BUDGET_BYTES) * 100));
    const tone = pct >= 90 ? "red" : pct >= 70 ? "amber" : "ok";
    bar.dataset.tone = tone;
    bar.innerHTML = `
      <div class="storage-usage-fill" style="width:${pct}%"></div>
      <div class="storage-usage-pct">${pct}%</div>
    `;
    caption.textContent = `${formatBytes(total)} / ${formatBytes(STORAGE_BUDGET_BYTES)} (${rows.length} key${rows.length === 1 ? "" : "s"})`;
    if (sub) sub.textContent = "Tap Delete to drop a single key. Nothing outside the aiStacked namespace is touched.";
    if (rows.length === 0) {
      list.innerHTML = `<div class="empty">No aiStacked keys in localStorage yet.</div>`;
      return;
    }
    list.innerHTML = rows.map((r) => {
      const label = STORAGE_KEY_LABEL[r.key] || "";
      return `
        <div class="storage-key-row" data-key="${escapeHtml(r.key)}">
          <div class="storage-key-head">
            <code class="storage-key-name">${escapeHtml(r.key)}</code>
            <span class="storage-key-size">${formatBytes(r.size)}</span>
          </div>
          ${label ? `<div class="storage-key-label">${escapeHtml(label)}</div>` : ""}
          <button type="button" class="storage-key-delete" data-delete-key="${escapeHtml(r.key)}">Delete</button>
        </div>
      `;
    }).join("");
    // Two-tap confirm (same pattern as project delete).
    list.querySelectorAll(".storage-key-delete").forEach((btn) => {
      let timer = null;
      const disarm = () => {
        btn.dataset.armed = "";
        btn.textContent = "Delete";
        clearTimeout(timer);
        timer = null;
      };
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        if (btn.dataset.armed !== "1") {
          btn.dataset.armed = "1";
          btn.textContent = "Tap again to remove";
          timer = setTimeout(disarm, 3000);
          return;
        }
        const key = btn.dataset.deleteKey;
        try { localStorage.removeItem(key); } catch {}
        renderStorageBody();
      });
    });
  }
  {
    const openBtn = document.getElementById("storage-open");
    if (openBtn) openBtn.addEventListener("click", (e) => { e.preventDefault(); openStorageModal(); });
    document.querySelectorAll("#storage-modal [data-close]").forEach((el) => {
      el.addEventListener("click", (ev) => { ev.preventDefault(); closeStorageModal(); });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const m = document.getElementById("storage-modal");
      if (m && !m.hidden) closeStorageModal();
    });
  }

  // ---------- Unified Save (M3.10) ----------
  // Single storage key replacing Pin + "Add to learning". Each entry:
  //   { kind: "tool"|"snippet"|"learning"|"video"|"article",
  //     targetId,  // for tools/snippets: the tool/snippet id
  //     url,       // for learning/video/article: the URL
  //     title, thumb, source, published,  // card-resurrection metadata
  //     projectId, note, addedAt }
  // Entry id is kind:targetId-or-url-hash[:projectId].
  const SAVES_KEY = "clhub.v1.saves";
  const SAVES_MIGRATED_KEY = "clhub.v1.savesMigrated";

  function getSaves() {
    try {
      const raw = localStorage.getItem(SAVES_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
  }
  function putSaves(obj) {
    try { localStorage.setItem(SAVES_KEY, JSON.stringify(obj)); } catch {}
  }
  function saveKey(kind, targetOrUrl, projectId) {
    return `${kind}:${targetOrUrl}${projectId ? ":" + projectId : ""}`;
  }
  function isSavedAny(kind, targetOrUrl) {
    const saves = getSaves();
    const prefix = `${kind}:${targetOrUrl}`;
    return Object.keys(saves).some((k) => k === prefix || k.startsWith(prefix + ":"));
  }
  function getSavesFor(kind, targetOrUrl) {
    const saves = getSaves();
    const prefix = `${kind}:${targetOrUrl}`;
    return Object.entries(saves)
      .filter(([k]) => k === prefix || k.startsWith(prefix + ":"))
      .map(([k, v]) => ({ id: k, ...v }));
  }
  function upsertSave(entry) {
    const saves = getSaves();
    const id = saveKey(entry.kind, entry.targetId || entry.url, entry.projectId);
    saves[id] = { ...entry, addedAt: entry.addedAt || new Date().toISOString() };
    putSaves(saves);
    return id;
  }
  function removeSave(id) {
    const saves = getSaves();
    if (id in saves) {
      delete saves[id];
      putSaves(saves);
    }
  }
  // One-time migration from the pre-M3.10 stores. Idempotent; flag-guarded.
  function migrateSavesOnce() {
    try {
      if (localStorage.getItem(SAVES_MIGRATED_KEY) === "1") return;
    } catch { return; }
    const saves = getSaves();
    // Old URL-based Claude learning pins.
    try {
      const raw = localStorage.getItem("clhub.v1.learningPins");
      const oldPins = raw ? JSON.parse(raw) : {};
      if (oldPins && typeof oldPins === "object") {
        for (const [url, meta] of Object.entries(oldPins)) {
          if (!url || typeof meta !== "object") continue;
          const id = saveKey("learning", url);
          if (!saves[id]) {
            saves[id] = {
              kind: "learning",
              url,
              title: meta.title || "",
              thumb: meta.thumb || null,
              source: meta.source || "",
              published: meta.published || null,
              note: "",
              addedAt: meta.pinnedAt || new Date().toISOString(),
            };
          }
        }
      }
    } catch {}
    // Project-scoped pins (tool + snippet).
    try {
      const projects = getProjects();
      Object.values(projects).forEach((p) => {
        (p.pinnedTools || []).forEach((toolId) => {
          const id = saveKey("tool", toolId, p.id);
          if (!saves[id]) saves[id] = {
            kind: "tool", targetId: toolId, projectId: p.id,
            note: "",
            addedAt: p.updatedAt || p.createdAt || new Date().toISOString(),
          };
        });
        (p.pinnedSnippets || []).forEach((snipId) => {
          const id = saveKey("snippet", snipId, p.id);
          if (!saves[id]) saves[id] = {
            kind: "snippet", targetId: snipId, projectId: p.id,
            note: "",
            addedAt: p.updatedAt || p.createdAt || new Date().toISOString(),
          };
        });
      });
    } catch {}
    putSaves(saves);
    try { localStorage.setItem(SAVES_MIGRATED_KEY, "1"); } catch {}
  }
  migrateSavesOnce();

  // Unified save button painter. All .save-btn elements carry
  //   data-save-kind, data-save-id (targetId-or-url), data-save-label,
  //   optionally data-save-thumb, data-save-source, data-save-published.
  function repaintSaveButtons(kind, id) {
    const saved = isSavedAny(kind, id);
    document.querySelectorAll(
      `.save-btn[data-save-kind="${kind}"][data-save-id="${CSS.escape(id)}"]`
    ).forEach((btn) => {
      btn.dataset.saved = saved ? "1" : "";
      btn.setAttribute("aria-pressed", saved ? "true" : "false");
      const hasLabel = !!btn.querySelector(".save-btn-label");
      btn.innerHTML = (saved ? PIN_SVG_FILLED : PIN_SVG_OUTLINE) +
        (hasLabel ? `<span class="save-btn-label">${saved ? "Saved" : "Save"}</span>` : "");
    });
  }
  // Delegated click handler. Every .save-btn opens the save picker.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.(".save-btn");
    if (!btn) return;
    const kind = btn.dataset.saveKind;
    const id   = btn.dataset.saveId;
    if (!kind || !id) return;
    e.preventDefault();
    e.stopPropagation();
    openSavePicker({
      kind,
      id,
      label: btn.dataset.saveLabel || id,
      extras: {
        url:       btn.dataset.saveUrl || undefined,
        thumb:     btn.dataset.saveThumb || undefined,
        source:    btn.dataset.saveSource || undefined,
        published: btn.dataset.savePublished || undefined,
      },
    });
  });
  function openSavePicker({ kind, id, label, extras }) {
    const modal = document.getElementById("pin-picker-modal");
    if (!modal) return;
    modal.dataset.kind = kind;
    modal.dataset.id   = id;
    modal.dataset.url       = extras.url       || "";
    modal.dataset.thumb     = extras.thumb     || "";
    modal.dataset.source    = extras.source    || "";
    modal.dataset.published = extras.published || "";
    modal.dataset.label     = label || "";
    const titleEl = modal.querySelector(".pin-picker-title");
    const subEl   = modal.querySelector(".pin-picker-sub");
    const listEl  = modal.querySelector(".pin-picker-list");
    const emptyEl = modal.querySelector(".pin-picker-empty");
    const noteEl  = modal.querySelector(".pin-picker-note");
    const saveBtn = modal.querySelector(".pin-picker-save");
    const removeBtn = modal.querySelector(".pin-picker-remove");
    if (titleEl) titleEl.textContent = "Save";
    if (subEl)   subEl.textContent   = label || "";
    const projects = Object.values(getProjects()).sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );
    const existingSaves = getSavesFor(kind, id);
    const pinnedProjectIds = new Set(existingSaves.map((s) => s.projectId).filter(Boolean));
    const existingNote = existingSaves.find((s) => s.note)?.note || "";
    if (noteEl) noteEl.value = existingNote;
    if (projects.length === 0) {
      if (listEl)  listEl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
    } else {
      if (emptyEl) emptyEl.hidden = true;
      if (listEl) {
        listEl.innerHTML = projects.map((p) => {
          const checked = pinnedProjectIds.has(p.id) ? "checked" : "";
          return `
            <label class="pin-picker-row">
              <input type="checkbox" class="pin-picker-check" value="${escapeHtml(p.id)}" ${checked}>
              <span class="pin-picker-row-title">${escapeHtml(p.title)}</span>
              <span class="pin-picker-row-path">${p.path === "best" ? "Best" : "Easy"}</span>
            </label>
          `;
        }).join("");
      }
    }
    // "Remove save" shown only if this item is saved anywhere.
    if (removeBtn) removeBtn.hidden = existingSaves.length === 0;
    if (saveBtn) saveBtn.disabled = false;
    modal.hidden = false;
    document.body.classList.add("modal-open");
  }
  function commitSavePicker() {
    const modal = document.getElementById("pin-picker-modal");
    if (!modal) return;
    const kind = modal.dataset.kind;
    const id   = modal.dataset.id;
    if (!kind || !id) { closePinPicker(); return; }
    const note = (modal.querySelector(".pin-picker-note")?.value || "").trim();
    const checks = modal.querySelectorAll(".pin-picker-check");
    const selectedProjectIds = new Set();
    checks.forEach((c) => { if (c.checked) selectedProjectIds.add(c.value); });

    // Remove existing saves for this item that are no longer desired.
    const existing = getSavesFor(kind, id);
    existing.forEach((entry) => {
      if (entry.projectId && !selectedProjectIds.has(entry.projectId)) {
        removeSave(entry.id);
      }
    });

    // Figure out an always-write base payload with metadata from the trigger.
    const baseExtras = {
      url:       modal.dataset.url       || undefined,
      thumb:     modal.dataset.thumb     || undefined,
      source:    modal.dataset.source    || undefined,
      published: modal.dataset.published || undefined,
      title:     modal.dataset.label     || id,
    };
    // No projects selected → store one unscoped save. If no projects exist yet
    // and the user didn't uncheck anything, keep/create an unscoped save too.
    if (selectedProjectIds.size === 0) {
      upsertSave({ kind, targetId: id, ...baseExtras, note });
    } else {
      // Remove the unscoped save (projectId undefined) if the user picked projects.
      existing.forEach((entry) => {
        if (!entry.projectId) removeSave(entry.id);
      });
      selectedProjectIds.forEach((pid) => {
        upsertSave({ kind, targetId: id, projectId: pid, ...baseExtras, note });
      });
    }

    // Mirror pinnedTools/pinnedSnippets onto the project objects for the
    // existing renderProjects chip row (shows tool/snippet counts).
    if (kind === "tool" || kind === "snippet") {
      const projects = getProjects();
      const listKey = kind === "tool" ? "pinnedTools" : "pinnedSnippets";
      Object.values(projects).forEach((p) => {
        const shouldHave = selectedProjectIds.has(p.id);
        const has = Array.isArray(p[listKey]) && p[listKey].includes(id);
        if (shouldHave && !has) {
          p[listKey] = Array.isArray(p[listKey]) ? p[listKey].concat(id) : [id];
          p.updatedAt = new Date().toISOString();
        } else if (!shouldHave && has) {
          p[listKey] = p[listKey].filter((x) => x !== id);
          p.updatedAt = new Date().toISOString();
        }
      });
      putProjects(projects);
    }

    repaintSaveButtons(kind, id);
    renderProjects();
    renderContinueCard();
    renderYouTube();
    paintClaudeLearning();
    updateLearnFilterCounts();
    closePinPicker();
  }
  function removeCurrentSave() {
    const modal = document.getElementById("pin-picker-modal");
    if (!modal) return;
    const kind = modal.dataset.kind;
    const id   = modal.dataset.id;
    if (!kind || !id) return;
    const entries = getSavesFor(kind, id);
    entries.forEach((e) => removeSave(e.id));
    // Also scrub project pin arrays.
    if (kind === "tool" || kind === "snippet") {
      const projects = getProjects();
      const listKey = kind === "tool" ? "pinnedTools" : "pinnedSnippets";
      Object.values(projects).forEach((p) => {
        if (Array.isArray(p[listKey]) && p[listKey].includes(id)) {
          p[listKey] = p[listKey].filter((x) => x !== id);
          p.updatedAt = new Date().toISOString();
        }
      });
      putProjects(projects);
    }
    repaintSaveButtons(kind, id);
    renderProjects();
    renderContinueCard();
    renderYouTube();
    paintClaudeLearning();
    updateLearnFilterCounts();
    closePinPicker();
  }

  // ---------- Project-scoped pinning (M3.2) — retained as read-path ----------
  // Pin a tool (toolId) or snippet (snippetId) into one or more projects.
  // Stored on the project object under pinnedTools[] / pinnedSnippets[].
  function pinKeyForKind(kind) {
    return kind === "tool" ? "pinnedTools" : "pinnedSnippets";
  }
  function isPinnedToAnyProject(kind, id) {
    if (!id) return false;
    const key = pinKeyForKind(kind);
    const projects = getProjects();
    return Object.values(projects).some((p) => Array.isArray(p[key]) && p[key].includes(id));
  }
  function getProjectsPinning(kind, id) {
    const key = pinKeyForKind(kind);
    const projects = getProjects();
    return Object.values(projects)
      .filter((p) => Array.isArray(p[key]) && p[key].includes(id))
      .map((p) => p.id);
  }
  function setProjectPins(kind, id, projectIdSet) {
    const key = pinKeyForKind(kind);
    const projects = getProjects();
    Object.values(projects).forEach((p) => {
      const has = Array.isArray(p[key]) ? p[key].includes(id) : false;
      const shouldHave = projectIdSet.has(p.id);
      if (shouldHave && !has) {
        p[key] = Array.isArray(p[key]) ? p[key].concat(id) : [id];
        p.updatedAt = new Date().toISOString();
      } else if (!shouldHave && has) {
        p[key] = p[key].filter((x) => x !== id);
        p.updatedAt = new Date().toISOString();
      }
    });
    putProjects(projects);
  }
  // Paint all pin buttons matching kind/id (there may be many — search results,
  // tool modal, snippet rows reused across panes).
  function repaintPinButtons(kind, id) {
    const pinned = isPinnedToAnyProject(kind, id);
    document.querySelectorAll(
      `.pin-btn[data-pin-kind="${kind}"][data-pin-id="${CSS.escape(id)}"]`
    ).forEach((btn) => {
      btn.dataset.pinned = pinned ? "1" : "";
      btn.setAttribute("aria-pressed", pinned ? "true" : "false");
      const label = btn.querySelector(".pin-btn-label");
      btn.innerHTML = (pinned ? PIN_SVG_FILLED : PIN_SVG_OUTLINE) +
        (label ? `<span class="pin-btn-label">Pin</span>` : "");
    });
  }
  // Delegated click handler for every .pin-btn on the page.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.(".pin-btn");
    if (!btn) return;
    const kind = btn.dataset.pinKind;
    const id   = btn.dataset.pinId;
    const label = btn.dataset.pinLabel || id;
    if (!kind || !id) return;
    e.preventDefault();
    e.stopPropagation();
    openPinPicker({ kind, id, label });
  });

  function openPinPicker({ kind, id, label }) {
    const modal = document.getElementById("pin-picker-modal");
    if (!modal) return;
    modal.dataset.kind = kind;
    modal.dataset.id   = id;
    const titleEl = modal.querySelector(".pin-picker-title");
    const subEl   = modal.querySelector(".pin-picker-sub");
    const listEl  = modal.querySelector(".pin-picker-list");
    const emptyEl = modal.querySelector(".pin-picker-empty");
    const saveBtn = modal.querySelector(".pin-picker-save");
    if (titleEl) titleEl.textContent = kind === "tool" ? "Pin tool to projects" : "Pin snippet to projects";
    if (subEl)   subEl.textContent   = label || "";
    const projects = Object.values(getProjects()).sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );
    const alreadyPinned = new Set(getProjectsPinning(kind, id));
    if (projects.length === 0) {
      if (listEl)  listEl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      if (saveBtn) saveBtn.disabled = true;
    } else {
      if (emptyEl) emptyEl.hidden = true;
      if (saveBtn) saveBtn.disabled = false;
      if (listEl) {
        listEl.innerHTML = projects.map((p) => {
          const checked = alreadyPinned.has(p.id) ? "checked" : "";
          return `
            <label class="pin-picker-row">
              <input type="checkbox" class="pin-picker-check" value="${escapeHtml(p.id)}" ${checked}>
              <span class="pin-picker-row-title">${escapeHtml(p.title)}</span>
              <span class="pin-picker-row-path">${p.path === "best" ? "Best" : "Easy"}</span>
            </label>
          `;
        }).join("");
      }
    }
    modal.hidden = false;
    document.body.classList.add("modal-open");
  }
  function closePinPicker() {
    const modal = document.getElementById("pin-picker-modal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (!document.querySelector(".video-modal:not([hidden]), .tool-modal:not([hidden]), .search-modal:not([hidden])")) {
      document.body.classList.remove("modal-open");
    }
  }
  function commitPinPicker() {
    const modal = document.getElementById("pin-picker-modal");
    if (!modal) return;
    const kind = modal.dataset.kind;
    const id   = modal.dataset.id;
    if (!kind || !id) { closePinPicker(); return; }
    const checks = modal.querySelectorAll(".pin-picker-check");
    const nextSet = new Set();
    checks.forEach((c) => { if (c.checked) nextSet.add(c.value); });
    setProjectPins(kind, id, nextSet);
    repaintPinButtons(kind, id);
    renderProjects();
    closePinPicker();
  }
  // Wire close + save.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const m = document.getElementById("pin-picker-modal");
    if (m && !m.hidden) closePinPicker();
  });
  document.querySelectorAll("#pin-picker-modal [data-close]").forEach((el) => {
    el.addEventListener("click", (ev) => { ev.preventDefault(); closePinPicker(); });
  });
  {
    const saveBtn = document.querySelector("#pin-picker-modal .pin-picker-save");
    // M3.10: the picker commit path is commitSavePicker (unified Save).
    if (saveBtn) saveBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      commitSavePicker();
    });
    const removeBtn = document.querySelector("#pin-picker-modal .pin-picker-remove");
    if (removeBtn) removeBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      removeCurrentSave();
    });
  }
  // M3.6: Home "Continue where you left off" — up to 3 most-recently-updated
  // projects, plus a count of their pinned tools/snippets as a read-at-a-glance
  // progress hint. Tapping a card jumps to Projects → Saved.
  function renderContinueCard() {
    const host = document.getElementById("continue-body");
    if (!host) return;
    const all = Object.values(getProjects());
    if (all.length === 0) {
      host.innerHTML = `<p class="dash-empty">No projects in flight yet — start one and your progress lands here.</p>`;
      return;
    }
    const recent = all
      .slice()
      .sort((a, b) => {
        const ta = Date.parse(a.updatedAt || a.createdAt || 0) || 0;
        const tb = Date.parse(b.updatedAt || b.createdAt || 0) || 0;
        return tb - ta;
      })
      .slice(0, 3);
    host.innerHTML = recent.map((p) => {
      const pinTools    = Array.isArray(p.pinnedTools)    ? p.pinnedTools.length    : 0;
      const pinSnippets = Array.isArray(p.pinnedSnippets) ? p.pinnedSnippets.length : 0;
      const notes = (p.notes || "").trim().length;
      const parts = [];
      if (pinTools)    parts.push(`${pinTools} tool${pinTools === 1 ? "" : "s"}`);
      if (pinSnippets) parts.push(`${pinSnippets} snippet${pinSnippets === 1 ? "" : "s"}`);
      if (notes)       parts.push(`${notes} chars note`);
      const meta = parts.length ? parts.join(" · ") : "Just saved";
      const pathLabel = p.path === "best" ? "Best" : "Easy";
      return `
        <button type="button" class="continue-row" data-project-id="${escapeHtml(p.id)}">
          <div class="continue-row-head">
            <span class="continue-row-path" data-path="${escapeHtml(p.path || "easy")}">${pathLabel}</span>
            <span class="continue-row-title">${escapeHtml(p.title)}</span>
          </div>
          <div class="continue-row-meta">${escapeHtml(meta)}</div>
        </button>
      `;
    }).join("");
    // Each row jumps to Projects → Saved.
    host.querySelectorAll(".continue-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        e.preventDefault();
        const chip = document.querySelector('[data-filter="projects"]');
        if (chip) chip.click();
        const savedPill = document.querySelector('.subpill[data-projects-view="saved"]');
        if (savedPill) savedPill.click();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  function renderProjects() {
    const host = document.getElementById("projects-grid");
    if (!host) return;
    const projects = Object.values(getProjects()).sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );
    if (projects.length === 0) {
      host.innerHTML = `<div class="empty">No saved projects yet — run the Finder and tap "Save as project" to seed one here.</div>`;
      return;
    }
    host.innerHTML = "";
    projects.forEach((p) => {
      const card = document.createElement("article");
      card.className = "project-card glass" + (p.path === "best" ? " project-card-best" : " project-card-easy");
      const pathLabel = p.path === "best" ? "Best path" : "Easiest path";
      const stackChips = (p.stack || []).map((s) => {
        const tool = toolsData?.find((t) => t.id === s.toolId);
        const claudeCls = tool?.claudeNative ? " project-chip-claude" : "";
        return `<span class="project-chip${claudeCls}">${escapeHtml(tool ? tool.name : s.toolId)}</span>`;
      }).join("");
      const date = p.createdAt
        ? new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
        : "";
      const pinnedToolsCount    = Array.isArray(p.pinnedTools)    ? p.pinnedTools.length    : 0;
      const pinnedSnippetsCount = Array.isArray(p.pinnedSnippets) ? p.pinnedSnippets.length : 0;
      const pinsRow = (pinnedToolsCount + pinnedSnippetsCount > 0)
        ? `<div class="project-pins-row">
             <span class="project-pins-chip">${pinnedToolsCount} tool${pinnedToolsCount === 1 ? "" : "s"}</span>
             <span class="project-pins-chip">${pinnedSnippetsCount} snippet${pinnedSnippetsCount === 1 ? "" : "s"}</span>
           </div>`
        : "";
      const notesVal = typeof p.notes === "string" ? p.notes : "";
      const notesOpenAttr = notesVal.trim() ? " open" : "";
      const notesLen = notesVal.length;
      card.innerHTML = `
        <div class="project-head">
          <span class="project-path">${pathLabel}</span>
          <span class="project-date">${escapeHtml(date)}</span>
        </div>
        <h4 class="project-title">${escapeHtml(p.title)}</h4>
        ${p.goal ? `<p class="project-goal">${escapeHtml(p.goal)}</p>` : ""}
        <div class="project-stack-chips">${stackChips}</div>
        ${pinsRow}
        <details class="project-notes"${notesOpenAttr}>
          <summary class="project-notes-summary">
            <span class="project-notes-label">Notes</span>
            <span class="project-notes-meta" data-count>${notesLen ? notesLen + " chars" : "empty"}</span>
            <span class="project-notes-status" data-status></span>
          </summary>
          <div class="project-notes-body">
            <textarea class="project-notes-input"
                      data-project-id="${escapeHtml(p.id)}"
                      placeholder="Markdown scratchpad — links, todos, what you learned. Saves as you type."
                      rows="5"
                      spellcheck="false">${escapeHtml(notesVal)}</textarea>
          </div>
        </details>
        <div class="project-actions">
          <button class="project-delete" type="button" data-project-id="${escapeHtml(p.id)}">Delete</button>
        </div>
      `;
      host.appendChild(card);
    });
    // Wire notes textareas: debounced save to localStorage, transient "Saved" status.
    host.querySelectorAll(".project-notes-input").forEach((ta) => {
      let saveTimer = null;
      let statusTimer = null;
      const details = ta.closest(".project-notes");
      const status = details?.querySelector("[data-status]");
      const count  = details?.querySelector("[data-count]");
      ta.addEventListener("input", () => {
        if (status) status.textContent = "Saving…";
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          const id = ta.dataset.projectId;
          if (!id) return;
          const projects = getProjects();
          if (!projects[id]) return;
          projects[id].notes = ta.value;
          projects[id].updatedAt = new Date().toISOString();
          putProjects(projects);
          if (count) count.textContent = ta.value.length ? ta.value.length + " chars" : "empty";
          if (status) {
            status.textContent = "Saved";
            clearTimeout(statusTimer);
            statusTimer = setTimeout(() => { if (status.textContent === "Saved") status.textContent = ""; }, 1400);
          }
        }, 320);
      });
    });
    // Two-tap confirm: first tap arms the button, second tap deletes.
    // Avoids confirm(), which iOS standalone PWAs silently suppress.
    host.querySelectorAll(".project-delete").forEach((btn) => {
      let armTimer = null;
      const disarm = () => {
        btn.dataset.armed = "";
        btn.textContent = "Delete";
        clearTimeout(armTimer);
        armTimer = null;
      };
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const id = btn.dataset.projectId;
        if (!id) return;
        if (btn.dataset.armed === "1") {
          disarm();
          deleteProject(id);
          return;
        }
        btn.dataset.armed = "1";
        btn.textContent = "Tap again to delete";
        clearTimeout(armTimer);
        armTimer = setTimeout(disarm, 3000);
      });
    });
  }

  function renderCapFilterBar() {
    const bar = document.getElementById("cap-filter-bar");
    if (!bar) return;
    if (capsSelected.size === 0) {
      bar.innerHTML = "";
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    bar.innerHTML = "";
    [...capsSelected].forEach((id) => {
      const cap = CAP_BY_ID[id];
      if (!cap) return;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "cap-filter-chip";
      chip.setAttribute("aria-label", `Remove ${cap.label}`);
      chip.innerHTML = `<span class="cap-filter-label">${cap.label}</span><span class="cap-filter-x" aria-hidden="true">×</span>`;
      chip.addEventListener("click", () => {
        capsSelected.delete(id);
        persistCaps();
        // Uncheck the matching input.
        const input = document.querySelector(`.cap-input[data-cap="${id}"]`);
        if (input) {
          input.checked = false;
          input.closest(".cap-check").classList.remove("is-checked");
        }
        renderCapFilterBar();
        const stackOutput = document.getElementById("stack-output");
        if (stackOutput && !stackOutput.hidden) renderStack();
      });
      bar.appendChild(chip);
    });
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "cap-filter-clear";
    clear.textContent = "Clear all";
    clear.addEventListener("click", () => {
      capsSelected.clear();
      persistCaps();
      document.querySelectorAll(".cap-input").forEach((i) => {
        i.checked = false;
        i.closest(".cap-check").classList.remove("is-checked");
      });
      renderCapFilterBar();
      const stackOutput = document.getElementById("stack-output");
      if (stackOutput) stackOutput.hidden = true;
    });
    bar.appendChild(clear);
  }

  function renderModalityFilter() {
    const host = document.getElementById("modality-filter");
    if (!host || !toolsData) return;
    // Count tools per modality for live counts on each pill.
    const counts = toolsData.reduce((acc, t) => {
      acc[t.modality] = (acc[t.modality] || 0) + 1;
      return acc;
    }, {});
    host.innerHTML = "";
    MODALITIES.forEach((m) => {
      const n = m.id === "all" ? toolsData.length : (counts[m.id] || 0);
      if (m.id !== "all" && n === 0) return;   // hide empty modalities
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "modality-pill" + (m.id === toolsModality ? " is-active" : "");
      pill.dataset.modality = m.id;
      pill.setAttribute("role", "tab");
      pill.setAttribute("aria-selected", m.id === toolsModality ? "true" : "false");
      pill.innerHTML = `<span class="modality-label">${m.label}</span><span class="modality-count">${n}</span>`;
      pill.addEventListener("click", () => {
        toolsModality = m.id;
        renderModalityFilter();
        renderTools();
      });
      host.appendChild(pill);
    });
  }

  function renderTools() {
    const host = document.getElementById("tool-grid");
    if (!host || !toolsData) return;
    const filtered = toolsModality === "all"
      ? toolsData
      : toolsData.filter((t) => t.modality === toolsModality);
    host.innerHTML = "";
    if (filtered.length === 0) {
      host.innerHTML = `<div class="empty">No tools in this modality yet.</div>`;
      return;
    }
    const frag = document.createDocumentFragment();
    filtered.forEach((t, i) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "tool-card glass" + (t.claudeNative ? " tool-card-claude" : "");
      card.dataset.toolId = t.id;
      card.addEventListener("click", (e) => {
        e.preventDefault();
        openToolModal(t);
      });
      card.style.setProperty("--card-delay", (0.05 + i * 0.04) + "s");
      const verified = t.verifiedAt
        ? `<span class="tool-verified">Verified ${t.verifiedAt}</span>`
        : "";
      const priceLabel = PRICE_BADGE[t.priceTier] || "";
      const priceBadge = priceLabel
        ? `<span class="tool-badge tool-badge-price" data-tier="${t.priceTier}">${priceLabel}</span>`
        : "";
      const claudeBadge = t.claudeNative
        ? `<span class="tool-badge tool-badge-claude">Claude-native</span>`
        : "";
      card.innerHTML = `
        <div class="tool-card-head">
          <span class="tool-vendor">${t.vendor || ""}</span>
          <span class="tool-modality" data-modality="${t.modality}">${(MODALITIES.find(m => m.id === t.modality) || {}).label || t.modality}</span>
        </div>
        <h3 class="tool-name">${t.name}</h3>
        <p class="tool-tagline">${t.tagline || ""}</p>
        <div class="tool-badges">
          ${claudeBadge}
          ${priceBadge}
        </div>
        <div class="tool-foot">
          <span class="tool-version">${t.currentVersion || ""}</span>
          ${verified}
        </div>
      `;
      registerReveal(card, i);
      frag.appendChild(card);
    });
    host.appendChild(frag);
  }

  // ---------- Tool detail modal (M2.9) ----------
  function openToolModal(tool) {
    const modal = document.getElementById("tool-modal");
    if (!modal || !tool) return;
    const q = (sel) => modal.querySelector(sel);
    const modalityLabel = (MODALITIES.find((m) => m.id === tool.modality) || {}).label || tool.modality || "";
    q(".tool-modal-vendor").textContent   = tool.vendor || "";
    q(".tool-modal-modality").textContent = modalityLabel;
    q(".tool-modal-title").textContent    = tool.name || "";
    q(".tool-modal-tagline").textContent  = tool.tagline || "";
    // Pin button (M3.2) — shows filled when pinned into any project.
    const pinHost = q(".tool-modal-pin");
    if (pinHost) {
      const saved = isSavedAny("tool", tool.id);
      pinHost.innerHTML = `
        <button type="button" class="save-btn save-btn-tool" data-save-kind="tool" data-save-id="${escapeHtml(tool.id)}" data-save-label="${escapeHtml(tool.name || tool.id)}" data-saved="${saved ? "1" : ""}" aria-pressed="${saved ? "true" : "false"}" aria-label="${saved ? "Edit save" : "Save"}">
          ${saved ? PIN_SVG_FILLED : PIN_SVG_OUTLINE}<span class="save-btn-label">${saved ? "Saved" : "Save"}</span>
        </button>
      `;
    }
    q(".tool-modal-when").textContent     = tool.whenToUse || "";
    q(".tool-modal-version").textContent  = tool.currentVersion || "";
    q(".tool-modal-pricing").textContent  = tool.pricing || "";

    // Badges
    const priceLabel = PRICE_BADGE[tool.priceTier] || "";
    const badges = [];
    if (tool.claudeNative) badges.push(`<span class="tool-badge tool-badge-claude">Claude-native</span>`);
    if (priceLabel)        badges.push(`<span class="tool-badge tool-badge-price" data-tier="${tool.priceTier}">${priceLabel}</span>`);
    q(".tool-modal-badges").innerHTML = badges.join("");

    // Links
    const links = [];
    if (tool.officialUrl) {
      links.push(`<a class="tool-modal-link" data-primary href="${escapeHtml(tool.officialUrl)}" target="_blank" rel="noopener">Official ↗</a>`);
    }
    if (tool.docsUrl && tool.docsUrl !== tool.officialUrl) {
      links.push(`<a class="tool-modal-link" href="${escapeHtml(tool.docsUrl)}" target="_blank" rel="noopener">Docs ↗</a>`);
    }
    q(".tool-modal-links").innerHTML = links.join("");

    // M5.2: setup snippet — shown right below the links when present.
    const setupHost = q(".tool-modal-setup");
    if (setupHost) {
      if (tool.setupSnippet) {
        const body = String(tool.setupSnippet);
        setupHost.hidden = false;
        setupHost.innerHTML = `
          <div class="tool-modal-setup-head">Setup</div>
          <pre class="tool-modal-setup-pre"><code>${escapeHtml(body)}</code></pre>
          <button type="button" class="tool-modal-setup-copy" data-setup-body="${escapeHtml(body)}">Copy</button>
        `;
        const copyBtn = setupHost.querySelector(".tool-modal-setup-copy");
        if (copyBtn) copyBtn.addEventListener("click", async (ev) => {
          ev.preventDefault();
          try {
            await navigator.clipboard.writeText(body);
            copyBtn.textContent = "Copied"; copyBtn.dataset.state = "ok";
          } catch { copyBtn.textContent = "Copy failed"; copyBtn.dataset.state = "err"; }
          setTimeout(() => { copyBtn.textContent = "Copy"; copyBtn.dataset.state = ""; }, 1600);
        });
      } else {
        setupHost.hidden = true;
        setupHost.innerHTML = "";
      }
    }

    // Snippets filtered by this tool's snippetTags
    const tagSet = new Set(tool.snippetTags || []);
    const matching = tagSet.size
      ? snippetsData.filter((s) => (s.snippetTags || []).some((t) => tagSet.has(t)))
      : [];
    const snippetHost = q(".tool-modal-snippets");
    const listHost = q(".tool-modal-snippet-list");
    const titleEl = q(".tool-modal-snippets-title");
    titleEl.textContent = matching.length > 0
      ? `Snippets · ${matching.length}`
      : "Snippets";
    listHost.innerHTML = matching.map((s) => renderSnippetRow(s)).join("");
    snippetHost.dataset.empty = matching.length === 0 ? "1" : "";
    wireSnippetCopyButtons(modal);

    modal.hidden = false;
    document.body.classList.add("modal-open");
    const closeBtn = q(".tool-modal-close");
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeToolModal() {
    const modal = document.getElementById("tool-modal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    // Also clear body scroll lock unless another modal is open.
    if (!document.querySelector(".video-modal:not([hidden]), .search-modal:not([hidden])")) {
      document.body.classList.remove("modal-open");
    }
  }

  document.querySelectorAll("#tool-modal [data-close]").forEach((el) => {
    el.addEventListener("click", (e) => { e.preventDefault(); closeToolModal(); });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const m = document.getElementById("tool-modal");
    if (m && !m.hidden) closeToolModal();
  });

  // ---------- Snippet search — cmd-K / ctrl-K (M2.10) ----------
  function openSnippetSearch() {
    const modal = document.getElementById("snippet-search-modal");
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    const input = document.getElementById("snippet-search-input");
    if (input) {
      input.value = "";
      runSnippetSearch("");
      // iOS: delay focus slightly so the modal is visible before the keyboard pops.
      setTimeout(() => input.focus({ preventScroll: true }), 30);
    }
  }
  function closeSnippetSearch() {
    const modal = document.getElementById("snippet-search-modal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (!document.querySelector(".video-modal:not([hidden]), .tool-modal:not([hidden])")) {
      document.body.classList.remove("modal-open");
    }
  }
  function runSnippetSearch(raw) {
    const host   = document.getElementById("snippet-search-results");
    const status = document.getElementById("snippet-search-status");
    if (!host) return;
    const q = (raw || "").trim().toLowerCase();
    const haystack = snippetsData || [];
    let matches;
    if (q === "") {
      matches = haystack.slice(0, 40);
    } else {
      const terms = q.split(/\s+/).filter(Boolean);
      matches = haystack.filter((s) => {
        const fields = [
          s.title || "",
          s.summary || "",
          (s.tags || []).join(" "),
          (s.snippetTags || []).join(" "),
          s.language || "",
        ].join(" ").toLowerCase();
        return terms.every((t) => fields.includes(t));
      });
    }
    host.innerHTML = matches.map((s) => renderSnippetRow(s)).join("");
    if (status) {
      if (q === "") {
        status.textContent = `${haystack.length} snippets — type to filter`;
      } else {
        status.textContent = `${matches.length} match${matches.length === 1 ? "" : "es"} for "${raw.trim()}"`;
      }
    }
    wireSnippetCopyButtons(host);
  }
  document.addEventListener("keydown", (e) => {
    // cmd-K / ctrl-K opens snippet search; works anywhere on the page.
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      openSnippetSearch();
      return;
    }
    // Escape closes search.
    if (e.key === "Escape") {
      const m = document.getElementById("snippet-search-modal");
      if (m && !m.hidden) closeSnippetSearch();
    }
  });
  {
    const openBtn = document.getElementById("snippet-search-open");
    if (openBtn) openBtn.addEventListener("click", (e) => { e.preventDefault(); openSnippetSearch(); });
    document.querySelectorAll("#snippet-search-modal [data-close]").forEach((el) => {
      el.addEventListener("click", (e) => { e.preventDefault(); closeSnippetSearch(); });
    });
    const input = document.getElementById("snippet-search-input");
    if (input) input.addEventListener("input", () => runSnippetSearch(input.value));
  }

  // ---------- Version footer — proves which build is rendered ----------
  async function loadVersion() {
    // Always stamp "Loaded at" on mount, even if the fetch fails.
    const loadedEl = document.getElementById("loaded-at");
    if (loadedEl) {
      loadedEl.textContent = new Date().toLocaleTimeString(undefined, {
        hour: "numeric", minute: "2-digit", second: "2-digit",
      });
    }
    try {
      const res = await fetch(VERSION_URL, { cache: "no-store" });
      if (!res.ok) return;
      const v = await res.json();
      const num = document.getElementById("version-num");
      const ms  = document.getElementById("version-milestone");
      const dt  = document.getElementById("version-date");
      if (num) num.textContent = "v" + v.version;
      if (ms)  ms.textContent  = v.milestone || "";
      if (dt)  dt.textContent  = v.deployedAt || "";
    } catch {}
  }
  loadVersion();

  // ---------- Finder wizard (Learn → Finder) ----------
  const FINDER_DRAFT_KEY = "clhub.v1.finderDraft";

  // ---------- Finder example projects (M5.3) ----------
  async function loadFinderExamples() {
    const host = document.getElementById("finder-examples");
    if (!host) return;
    try {
      const res = await fetch(USECASES_URL, { cache: "no-cache" });
      if (!res.ok) { host.innerHTML = ""; return; }
      const payload = await res.json();
      const examples = Array.isArray(payload.examples) ? payload.examples : [];
      if (examples.length === 0) { host.innerHTML = ""; return; }
      host.innerHTML = examples.map((ex) => `
        <button type="button" class="finder-example glass" data-example-id="${escapeHtml(ex.id)}">
          <div class="finder-example-eyebrow">Example</div>
          <div class="finder-example-title">${escapeHtml(ex.title)}</div>
          <div class="finder-example-body">${escapeHtml(ex.oneLine || "")}</div>
          <div class="finder-example-cta">Load into Finder →</div>
        </button>
      `).join("");
      host.querySelectorAll(".finder-example").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const id = btn.dataset.exampleId;
          const ex = examples.find((x) => x.id === id);
          if (!ex) return;
          applyFinderExample(ex);
        });
      });
    } catch { host.innerHTML = ""; }
  }
  function applyFinderExample(ex) {
    // Fill the description textarea.
    const input = document.getElementById("finder-input");
    if (input) {
      input.value = ex.goal || "";
      try { localStorage.setItem(FINDER_DRAFT_KEY, input.value); } catch {}
    }
    // Pre-check the example's capabilities and persist + re-render the grid.
    capsSelected.clear();
    (ex.caps || []).forEach((id) => capsSelected.add(id));
    try { localStorage.setItem(FINDER_CAPS_KEY, JSON.stringify([...capsSelected])); } catch {}
    renderCapGrid();
    renderCapFilterBar();
    renderStack({ scroll: false });
    // Scroll the capability grid into view so the user sees what got picked.
    const grid = document.getElementById("cap-grid");
    if (grid) grid.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  loadFinderExamples();

  function initFinder() {
    const input    = document.getElementById("finder-input");
    const cont     = document.getElementById("finder-continue");
    const status   = document.getElementById("finder-status");
    if (!input || !cont || !status) return;

    function setStatus(text, kind) {
      status.textContent = text;
      status.dataset.kind = kind || "";
    }

    // Restore any draft text the user typed last time.
    try {
      const saved = localStorage.getItem(FINDER_DRAFT_KEY);
      if (saved) input.value = saved;
    } catch {}

    input.addEventListener("input", () => {
      try { localStorage.setItem(FINDER_DRAFT_KEY, input.value); } catch {}
      if (status.dataset.kind) setStatus("", "");
    });

    cont.addEventListener("click", () => {
      const text = input.value.trim();
      if (!text) {
        setStatus("Add a short description first.", "warn");
        input.focus();
        return;
      }
      // M5.5: keyword heuristic — scan the description for well-known terms
      // and add matching capability IDs to whatever the user has already
      // picked. Non-destructive: we never uncheck an existing pick.
      const added = autoCheckCapsFromText(text);
      if (added > 0) {
        renderCapGrid();
        renderCapFilterBar();
        renderStack({ scroll: false });
        setStatus(`Saved. Pre-checked ${added} cap${added === 1 ? "" : "s"} from your description — tweak below.`, "ok");
      } else {
        setStatus("Saved. Pick the capabilities your project needs ↓", "ok");
      }
      const capWrap = document.querySelector(".cap-wrap");
      if (capWrap) capWrap.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.querySelectorAll(".finder-fork[data-fork]").forEach(btn => {
      btn.addEventListener("click", () => {
        const fork = btn.dataset.fork;
        const msg = fork === "tools"
          ? "Mode B (Pick tools) — multi-select in the catalog lands in a later milestone; for now pick capabilities below."
          : "Mode C (Browse by topic) ships in a later milestone.";
        setStatus(msg, "info");
      });
    });

    // Capability grid "See the stack" CTA — wired to its own status line.
    const capContinue = document.getElementById("cap-continue");
    const capStatus   = document.getElementById("cap-status");
    if (capContinue && capStatus) {
      capContinue.addEventListener("click", () => {
        if (capsSelected.size === 0) {
          capStatus.textContent = "Pick at least one capability first.";
          capStatus.dataset.kind = "warn";
          return;
        }
        capStatus.textContent = "";
        capStatus.dataset.kind = "";
        renderStack({ scroll: true });
      });
    }

    // Save-as-project form wiring (M1.11).
    const saveOpen   = document.getElementById("stack-save-open");
    const saveForm   = document.getElementById("save-form");
    const saveTitle  = document.getElementById("save-title");
    const saveCancel = document.getElementById("save-cancel");
    const saveStatus = document.getElementById("save-status");
    if (saveOpen && saveForm && saveTitle && saveStatus) {
      saveOpen.addEventListener("click", () => {
        if (!saveTitle.value) {
          const desc = (input && input.value) ? input.value.trim() : "";
          if (desc) saveTitle.value = desc.slice(0, 60);
        }
        saveStatus.textContent = "";
        saveStatus.dataset.kind = "";
        saveForm.hidden = false;
        updateSaveCtaVisibility();
        saveTitle.focus();
        saveTitle.select();
      });
      if (saveCancel) {
        saveCancel.addEventListener("click", () => {
          saveForm.hidden = true;
          saveStatus.textContent = "";
          saveStatus.dataset.kind = "";
          updateSaveCtaVisibility();
        });
      }
      saveForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const path = saveForm.querySelector('input[name="save-path-radio"]:checked')?.value || "easy";
        const project = saveProject({ title: saveTitle.value, path });
        if (!project) {
          saveStatus.textContent = "Couldn't save — pick at least one capability first.";
          saveStatus.dataset.kind = "warn";
          return;
        }
        saveStatus.textContent = "Saved. Opening Projects…";
        saveStatus.dataset.kind = "ok";
        setTimeout(() => {
          saveForm.hidden = true;
          saveTitle.value = "";
          saveStatus.textContent = "";
          saveStatus.dataset.kind = "";
          updateSaveCtaVisibility();
          // M3.7: Projects is a top-level tab with Saved/New subpills.
          const chip = document.querySelector('[data-filter="projects"]');
          if (chip) chip.click();
          const savedPill = document.querySelector('.subpill[data-projects-view="saved"]');
          if (savedPill) savedPill.click();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 650);
      });
    }

    // Seed My Projects pane with any previously-saved projects.
    renderProjects();
    renderContinueCard();
  }
  initFinder();

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

      // M3.9: News & Media tab retired as a chip; charts reached via Home's
      // "State of AI" card. renderStatusStrip / renderNews kept callable but
      // no longer invoked (their containers are gone). General-news items
      // merge into the Learn → What's new feed with _bucket: "industry".
      const industryNews = (s.news || []).map((it) => ({ ...it, _bucket: "industry" }));
      const mergedLearn = (s.claude_learning || []).concat(industryNews);
      renderClaudeLearning(mergedLearn);

      setUpdated("news", data.generated_at);
      setUpdated("365",  data.generated_at);
      document.getElementById("generated").textContent = prettyDate(data.generated_at);

      // If Comply365 is currently selected, render it now that latest is in.
      if (document.querySelector('.chip.is-active')?.dataset.filter === "comply365") {
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
  loadTools();
  // M3.8: loadSnippets populates snippetsData which loadAcademyHub reads
  // when attaching snippets under each course. Chain them.
  loadSnippets().then(() => loadAcademyHub());
  // M4.1: authored lessons for Learn → Tutorials & quizzes.
  loadLessons();
  renderTimeline();
  renderCompare();
  renderIndex();
  renderScorecard();
  renderLlmFaceoff();
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
      { host: "#cbars",    childSel: ".cbar" },
      { host: "#vbars",    childSel: ".vbar" },
      { host: "#hbars",    childSel: ".hbar" },
      { host: "#taskgrid", childSel: ".trow" },
      { host: "#faceoff",  childSel: ".gbar" },
      { host: "#recipes",  childSel: ".recipe" },
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
      { name: "Gemini 2.5 Pro",    tokens: 2_000_000, label: "2M", color: MODEL_COL.google },
      { name: "Grok 4",            tokens: 2_000_000, label: "2M", color: MODEL_COL.xai    },
      { name: "Claude Opus 4.7",   tokens: 1_000_000, label: "1M", color: MODEL_COL.claude, hero: true },
      { name: "GPT-4.1",           tokens: 1_000_000, label: "1M", color: MODEL_COL.openai },
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
      { name: "Opus 4.6",       maker: "Claude",  score: 53, color: MODEL_COL.claude, hero: true },
      { name: "GPT-5.3 Codex",  maker: "OpenAI",  score: 54, color: MODEL_COL.openai },
      { name: "GPT-5.4",        maker: "OpenAI",  score: 57, color: MODEL_COL.openai },
      { name: "Gemini 3.1 Pro", maker: "Google",  score: 57, color: MODEL_COL.google },
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
  // Best tool per task — heterogeneous "winner" grid with type badges.
  // (TYPE_LABEL / TYPE_DESC are declared at the top of the IIFE.)
  // ======================================================================
  function renderTypeLegend() {
    const host = document.getElementById("type-legend");
    if (!host) return;
    const order = ["LLM", "image", "video", "voice", "tool-app"];
    host.innerHTML = order.map(k => `
      <div class="type-legend-item" data-type="${k}">
        <span class="type-legend-dot" aria-hidden="true"></span>
        <span class="type-legend-name">${TYPE_LABEL[k]}</span>
        <span class="type-legend-desc">${TYPE_DESC[k]}</span>
      </div>
    `).join("");
  }

  function renderTaskGrid() {
    renderTypeLegend();
    const host = document.getElementById("taskgrid");
    if (!host) return;
    const rows = [
      { task: "Agentic coding",          winner: "Claude Opus 4.7",     type: "LLM",      runner: "GPT-5.3 Codex",    hero: true },
      { task: "Long-form writing",       winner: "Claude Opus 4.7",     type: "LLM",      runner: "GPT-5.4",          hero: true },
      { task: "Research / notebook",     winner: "NotebookLM",          type: "tool-app", runner: "Claude + MCP"                 },
      { task: "Reasoning / math",        winner: "Gemini 3.1 Pro",      type: "LLM",      runner: "GPT-5.4 Pro"                  },
      { task: "Image generation",        winner: "Nano Banana 2",       type: "image",    runner: "Nano Banana Pro"              },
      { task: "Video generation",        winner: "Sora 2",              type: "video",    runner: "Veo 3.1"                      },
      { task: "Vision / multimodal",     winner: "Gemini 3.1 Pro",      type: "LLM",      runner: "GPT-5.4"                      },
      { task: "Long-context (1M+)",      winner: "Claude Opus 4.7",     type: "LLM",      runner: "Gemini 3.1 Pro",   hero: true },
      { task: "Voice · expressive TTS",  winner: "ElevenLabs v3",       type: "voice",    runner: "Inworld TTS-1.5"              },
      { task: "Voice · real-time",       winner: "Inworld TTS-1.5 Max", type: "voice",    runner: "ElevenLabs Flash"             },
      { task: "Web research agent",      winner: "Gemini 3.1 Pro",      type: "LLM",      runner: "GPT-5.4"                      },
    ];
    host.innerHTML = "";
    rows.forEach((r, i) => {
      const delay = 0.2 + i * 0.06;
      const el = document.createElement("div");
      el.className = "trow" + (r.hero ? " is-hero" : "");
      el.style.setProperty("--trow-delay", delay + "s");
      el.innerHTML = `
        <div class="trow-task">${r.task}</div>
        <div class="trow-winner">${r.winner}</div>
        <div class="trow-type" data-type="${r.type}">${TYPE_LABEL[r.type]}</div>
        <div class="trow-runner">vs ${r.runner}</div>
      `;
      host.appendChild(el);
    });
  }

  // ======================================================================
  // Top 4 LLM face-off — single grouped chart. 4 category clusters along
  // the x-axis; within each cluster, 4 thin model bars. Legend on top for
  // color→model mapping, category labels under each cluster, stats table
  // below for context window + price.
  // ======================================================================
  function renderLlmFaceoff() {
    const host = document.getElementById("faceoff");
    if (!host) return;
    const models = [
      { short: "Opus 4.7",   col: MODEL_COL.claude, ctx: "1M",   price: "$5"   },
      { short: "GPT-5.4",    col: MODEL_COL.openai, ctx: "400K", price: "~$10" },
      { short: "Gemini 3.1", col: MODEL_COL.google, ctx: "1M",   price: "$2"   },
      { short: "Grok 4.20",  col: MODEL_COL.xai,    ctx: "2M",   price: "$2"   },
    ];
    // AIME dropped — every model maxes at ~100%, no useful signal.
    const benches = [
      { label: "GPQA",    vals: [94.2, 94.4, 94.3, null], display: ["94.2",  "94.4", "94.3",  "—"]    },
      { label: "SWE-b",   vals: [87.6, 80.0, 68.5, null], display: ["87.6",  "80.0", "68.5*", "—"]    },
      { label: "LMArena", vals: [88,   85,   82,   81],   display: ["~1500", "#2",   "1493",  "1491"] },
    ];

    let clustersHtml = "";
    benches.forEach((b, bi) => {
      const barsHtml = b.vals.map((v, mi) => {
        const m = models[mi];
        const nodata = v === null || v === undefined;
        const h = nodata ? 0 : v;
        const delay = 0.2 + bi * 0.15 + mi * 0.07;
        return `
          <div class="gbar${nodata ? " is-nodata" : ""}" style="--col:${m.col}; --h:${h}%; --gd:${delay}s;">
            <div class="gbar-track"><div class="gbar-fill"></div></div>
          </div>
        `;
      }).join("");
      clustersHtml += `
        <div class="gf-cluster">
          <div class="gf-bars">${barsHtml}</div>
          <div class="gf-label">${b.label}</div>
        </div>
      `;
    });

    const legendHtml = `
      <div class="gf-legend">
        ${models.map(m => `
          <span class="gf-li" style="--col:${m.col}">
            <span class="gf-dot" aria-hidden="true"></span>${m.short}
          </span>
        `).join("")}
      </div>
    `;

    const headCells = `
      <div class="fms-model">Model</div>
      <div class="fms-val">Ctx</div>
      <div class="fms-val">$/1M</div>
      ${benches.map(b => `<div class="fms-val">${b.label}</div>`).join("")}
    `;
    const modelRows = models.map((m, mi) => `
      <div class="fms-row" style="--fms-col:${m.col}">
        <div class="fms-model"><span class="fms-dot" aria-hidden="true"></span>${m.short}</div>
        <div class="fms-val">${m.ctx}</div>
        <div class="fms-val">${m.price}</div>
        ${benches.map(b => `<div class="fms-val">${b.display[mi]}</div>`).join("")}
      </div>
    `).join("");

    const statsHtml = `
      <div class="faceoff-mini-stats">
        <div class="fms-row fms-head">${headCells}</div>
        ${modelRows}
      </div>
    `;

    host.innerHTML = `<div class="gf-chart">${clustersHtml}</div>` + legendHtml + statsHtml;
  }

  // Map a tool chip name to its brand color when we recognize a model /
  // vendor; otherwise return null so the chip falls back to type color.
  function chipColorFor(name) {
    const n = String(name).toLowerCase();
    if (/claude|opus|sonnet|haiku|anthropic/.test(n)) return MODEL_COL.claude;
    if (/gpt|openai|chatgpt|\bo1\b|\bo3\b/.test(n))   return MODEL_COL.openai;
    if (/gemini|nano banana|notebooklm|\bveo\b|google/.test(n)) return MODEL_COL.google;
    if (/grok|xai/.test(n)) return MODEL_COL.xai;
    return null;
  }
  function chipMarkup(c) {
    const col = chipColorFor(c.n);
    const style = col ? ` style="--type-col:${col}"` : "";
    return `<span class="tool-chip" data-type="${c.t}"${style}>${c.n}</span>`;
  }

  // ======================================================================
  // Workflow recipes — clickable cards that open a modal with full detail.
  // Using a function declaration (hoisted) instead of a const so the TDZ
  // doesn't fire if applyFilter("home") → replayHomeAnimations() runs at
  // init before this module position is reached.
  // ======================================================================
  function getRecipes() { return [
    {
      chips: [{n:"Claude Code", t:"LLM"}, {n:"Cursor", t:"tool-app"}],
      title: "Agentic refactor loop",
      description: "Claude Code runs as a background agent that plans, edits across many files, and runs tests autonomously. Cursor stays open on the same repo for inline-diff review and last-mile polish — you get agentic scale plus IDE ergonomics without picking one tool.",
      detail: {
        overview: "The dominant 'two-IDE' pattern on r/ClaudeAI. Claude Code operates on a feature branch — it reads the repo, plans, executes multi-file edits, runs tests, iterates. Cursor is kept open on the same working tree for anything that needs human judgement: selection-based rewrites, tab-complete, quick tweaks. You commit from whichever tool feels right for the moment.",
        steps: [
          "Install Claude Code CLI and point it at the repo root; add a CLAUDE.md with conventions.",
          "Open the same folder in Cursor so both tools share the working tree.",
          "Kick off the refactor in Claude Code with a clear plan and test command.",
          "Let Claude Code iterate (plan → edit → test → fix) until green.",
          "Review the diff in Cursor; use Cursor's inline edit for the last 10% polish.",
          "Commit from whichever tool you prefer."
        ],
        when_to_use: "Multi-file refactor, migration, or feature spanning 5+ files where a single IDE prompt is too small.",
        gotchas: [
          "Don't let both agents edit the same file concurrently — stage your work.",
          "Claude Code's autonomy is bounded by CLAUDE.md; vague conventions = drift.",
          "Commit often; agentic edits are hard to cherry-pick after the fact."
        ],
        est_cost: "$40–60/mo (Claude Pro/Max $20–40 + Cursor Pro $20)",
        links: [
          { label: "Claude Code workflows", url: "https://code.claude.com/docs/en/common-workflows" },
          { label: "Multi-AI workflow guide", url: "https://claude-world.com/articles/multi-ai-workflow/" }
        ]
      }
    },
    {
      chips: [{n:"Nano Banana 2", t:"image"}, {n:"Claude (MCP)", t:"LLM"}],
      title: "On-brand hero art",
      description: "Claude reads your brand system (voice, palette, references) and drafts Nano Banana 2 prompts that keep characters and objects consistent across a set. Best for thumbnails, landing-page heroes, and product shots when you need 4–10 on-palette images in one pass.",
      detail: {
        overview: "Nano Banana 2 (Gemini 3.1 Pro Image) keeps up to 5 characters and 14 objects consistent across a batch, renders at 4K, and can target any aspect ratio. Claude sits in front as the art director — it ingests brand guidelines, decides composition, and emits prompt sets. Configured as a Claude Code skill or via the Gemini image API through MCP, the pipeline produces a batch (1:1, 16:9, 9:16) in one run.",
        steps: [
          "Write a brand skill in Claude: palette, typography, subject rules, forbidden motifs.",
          "Wire Nano Banana 2 via Claude Code skill or Gemini API MCP server.",
          "Prompt Claude with the artifact you need (e.g. 'hero + 3 social crops').",
          "Let Claude generate the prompt batch and call Nano Banana 2.",
          "Review outputs in a contact sheet; request edits in natural language.",
          "Export final frames at target aspect ratios."
        ],
        when_to_use: "You need a visually consistent image set (3+ images) tied to a brand.",
        gotchas: [
          "Character consistency drops past ~5 subjects — split into sub-batches.",
          "Nano Banana 2 still hallucinates text; render copy in post where possible.",
          "Costs stack fast at 4K — generate at 1K first, upscale only winners."
        ],
        est_cost: "$20–60/mo (Claude Pro + Gemini API usage)",
        links: [
          { label: "Connect Nano Banana via MCP", url: "https://aimaker.substack.com/p/how-to-connect-image-generation-claude-mcp-nano-banana" },
          { label: "Claude + Nano Banana walkthrough", url: "https://ryandoser.com/nano-banana-claude-code/" }
        ]
      }
    },
    {
      chips: [{n:"NotebookLM", t:"tool-app"}, {n:"Claude (MCP)", t:"LLM"}],
      title: "Cited research synthesis",
      description: "Drop PDFs, transcripts, and links into NotebookLM for citation-locked summaries and Q&A over the exact sources. Hand the grounded notes to Claude via MCP to turn them into briefs, memos, or literature reviews — without losing a single citation.",
      detail: {
        overview: "NotebookLM refuses to answer outside the corpus you give it; Claude has the long-form writing chops. Put them in series: load 10–50 sources into a NotebookLM notebook, use it to extract citation-tagged key points, then pipe the briefing to Claude (via MCP or paste) to assemble the deliverable. Citations survive the handoff because Claude only rewrites what NotebookLM produced.",
        steps: [
          "Create a NotebookLM notebook; upload PDFs, YouTube links, Google Docs.",
          "Ask NotebookLM for a briefing doc with inline citations.",
          "Copy or MCP-pipe the briefing into Claude.",
          "Prompt Claude to restructure into the target artifact (memo, article, deck outline).",
          "Tell Claude to preserve citation anchors verbatim.",
          "Spot-check 3–5 citations against the originals before shipping."
        ],
        when_to_use: "You have a fixed corpus and cannot afford invented facts.",
        gotchas: [
          "Claude will 'improve' citation wording unless told to preserve verbatim.",
          "NotebookLM caps ~50 sources per notebook — split by theme.",
          "The audio-overview feature is off-topic here; don't get sidetracked."
        ],
        est_cost: "$0–20/mo (NotebookLM free tier + Claude Pro)",
        links: [
          { label: "NotebookLM", url: "https://notebooklm.google.com" },
          { label: "Claude + NotebookLM guide", url: "https://popularaitools.ai/blog/claude-code-notebooklm-guide-2026" }
        ]
      }
    },
    {
      chips: [{n:"Nano Banana 2", t:"image"}, {n:"Claude Opus 4.7", t:"LLM"}],
      title: "Image → 3D \"explode\" site",
      description: "Generate a hero image in Nano Banana 2, then have Claude Opus 4.7 segment it and scaffold a Three.js scene that 'explodes' the image into separate meshes on scroll. Portfolio-quality interactive landing pages without a 3D artist.",
      detail: {
        overview: "A newer creative-dev pattern. Nano Banana 2 produces a crisp hero (product, character, abstract composition). Claude Opus 4.7 treats the image as a spec — it proposes a parts breakdown, generates the per-part renders (green-screen mode), and writes the Three.js scroll-driven explode animation with physics-ish easing. Output is a single Vite + Three.js page you can deploy to Vercel.",
        steps: [
          "Generate one clean hero in Nano Banana 2 on a flat or transparent background.",
          "Ask Claude Opus 4.7 to propose a 6–12 part segmentation.",
          "Generate each part as a separate Nano Banana 2 render (green-screen mode).",
          "Have Claude scaffold a Vite + Three.js project with scroll-linked explode.",
          "Tune easing and camera in-browser via Claude-suggested params.",
          "Deploy to Vercel or GitHub Pages."
        ],
        when_to_use: "Portfolio, launch page, or social-viral demo where motion sells the story.",
        gotchas: [
          "Transparent-bg parts require Nano Banana 2's green-screen skill.",
          "Three.js asset loading on mobile is fragile — compress textures to KTX2.",
          "Keep part count ≤12 or FPS tanks on mid-tier phones."
        ],
        est_cost: "$20–60/mo (Claude Pro/Max + Gemini API image credits)",
        links: [
          { label: "Nano Banana 2 Claude skill", url: "https://github.com/kingbootoshi/nano-banana-2-skill" },
          { label: "Three.js docs", url: "https://threejs.org/docs/" }
        ]
      }
    },
    {
      chips: [{n:"Gemini 3.1 (BrowseComp)", t:"LLM"}, {n:"Claude Opus 4.7", t:"LLM"}],
      title: "Deep web → long-form finish",
      description: "Use Gemini's BrowseComp-style deep crawl to gather fresh, cited evidence on a topic, then hand the dossier to Claude Opus 4.7 for structured reasoning and publication-ready writing. Best when currency-of-information matters as much as writing quality.",
      detail: {
        overview: "Gemini 3.1 leads on live-web retrieval breadth (BrowseComp benchmark); Claude Opus 4.7 leads on editorial output, tone control, and extended reasoning in a single pass. Run them in series: Gemini produces a 2–5K word cited research dossier, Claude restructures into the target format (report, article, exec memo). A popular Reddit pattern that sidesteps Claude's web-search limits while keeping writing quality high.",
        steps: [
          "Prompt Gemini 3.1 with a research brief and desired depth.",
          "Ask for inline citations and a source table at the end.",
          "Paste or MCP-pipe the dossier into Claude Opus 4.7.",
          "Ask Claude for an outline first; approve before it writes.",
          "Have Claude draft in target voice, preserving citations.",
          "Final fact-check pass: sample 5 citations from the source table."
        ],
        when_to_use: "Topic requires current-day evidence beyond Claude's training cutoff.",
        gotchas: [
          "Gemini occasionally invents secondary-source URLs — spot-check.",
          "Ask Claude to flag claims lacking a citation rather than smooth them over.",
          "Don't let Claude 'refresh' Gemini's quotes; keep them verbatim."
        ],
        est_cost: "$20–40/mo (Claude Pro + Gemini Advanced)",
        links: [
          { label: "Gemini 3.1 Pro model card", url: "https://deepmind.google/models/model-cards/gemini-3-1-pro" },
          { label: "Claude Opus 4.7 release", url: "https://www.anthropic.com/news/claude-opus-4-7" }
        ]
      }
    },
    {
      chips: [{n:"Figma", t:"tool-app"}, {n:"Claude Code (MCP)", t:"LLM"}],
      title: "Design-to-code bridge",
      description: "Figma's official MCP server lets Claude Code read clean, token-aware design data from a selected frame and emit production React — with an optional bidirectional mode that pushes rendered UIs back as editable Figma layers. Design and code stop diverging.",
      detail: {
        overview: "Figma rebuilt their MCP server to filter raw API noise into something LLMs can actually act on: pixel positions become 'centered in parent', hex values become design tokens, deep nesting flattens. Claude Code pulls that structured context, writes components using your existing codebase conventions, and can push the result back as editable Figma layers. Fastest-growing design-dev workflow of 2026.",
        steps: [
          "Enable Figma's MCP server (requires a Dev Mode seat).",
          "Add the Figma MCP to Claude Code's mcp_servers.json.",
          "In Figma, select a frame and copy its URL.",
          "Prompt Claude Code: 'Implement this frame using our component library.'",
          "Review the diff; iterate with natural-language tweaks.",
          "Optional: push the rendered UI back to Figma for designer review."
        ],
        when_to_use: "Handing a finished Figma frame off to implementation, or keeping design and code in sync over iterations.",
        gotchas: [
          "Design tokens must exist in both Figma and code or names drift.",
          "Deeply nested auto-layout still produces odd flex trees — review.",
          "Bidirectional push overwrites Figma layers; branch first."
        ],
        est_cost: "$45–60/mo (Figma Dev Mode + Claude Pro)",
        links: [
          { label: "Figma + Claude Code announcement", url: "https://www.figma.com/blog/introducing-claude-code-to-figma/" },
          { label: "Figma MCP setup guide", url: "https://www.builder.io/blog/claude-code-figma-mcp-server" }
        ]
      }
    },
    {
      chips: [{n:"Claude Code", t:"LLM"}, {n:"Playwright MCP", t:"tool-app"}],
      title: "AI QA engineer",
      description: "Wire Microsoft's Playwright MCP into Claude Code and let it drive a real browser, read the accessibility tree, and write E2E tests grounded in the actual DOM. Kills brittle selectors and gives you a real smoke-test suite without a dedicated QA role.",
      detail: {
        overview: "Instead of hallucinating selectors, Claude Code with Playwright MCP navigates your running app through structured accessibility data (not screenshots) and grounds each test in what the app actually renders. It handles clicks, forms, uploads, dialogs, screenshots, and custom Playwright scripts. Microsoft maintains the MCP server; workflows documented by Builder.io and in Anthropic's plugins directory.",
        steps: [
          "Run `npx @playwright/mcp@latest` and register the server in Claude Code.",
          "Start your app locally.",
          "Ask Claude Code to 'explore the signup flow and list failure modes.'",
          "Review the exploratory report; pick scenarios to lock in as tests.",
          "Have Claude write Playwright test files using real selectors from the MCP session.",
          "Wire the suite into CI (GitHub Actions) for headless runs."
        ],
        when_to_use: "Your app has critical flows and no meaningful end-to-end coverage.",
        gotchas: [
          "Tests generated against dev data break in CI — seed consistently.",
          "Accessibility tree is only as good as your ARIA; fix it along the way.",
          "Don't commit screenshots from MCP sessions — they balloon repo size."
        ],
        est_cost: "$20–40/mo (Claude Pro/Max); Playwright itself is free",
        links: [
          { label: "Playwright MCP (GitHub)", url: "https://github.com/microsoft/playwright-mcp" },
          { label: "Building an AI QA engineer", url: "https://alexop.dev/posts/building_ai_qa_engineer_claude_code_playwright/" }
        ]
      }
    }
  ]; }

  function openRecipeModal(recipe) {
    const tpl = document.getElementById("tpl-recipe-modal");
    const modal = tpl.content.firstElementChild.cloneNode(true);

    const chipsEl = modal.querySelector(".recipe-modal-chips");
    chipsEl.innerHTML = recipe.chips.map((c, i) => {
      const chip = chipMarkup(c);
      return i === 0 ? chip : `<span class="recipe-arrow" aria-hidden="true">→</span>${chip}`;
    }).join("");

    modal.querySelector(".recipe-modal-title").textContent = recipe.title || "Workflow recipe";
    const d = recipe.detail || {};
    modal.querySelector(".recipe-modal-overview").textContent = d.overview || recipe.description || "";

    const sectionsEl = modal.querySelector(".recipe-modal-sections");
    let html = "";
    if (d.steps && d.steps.length) {
      html += `<div class="rm-section">
        <div class="rm-section-title">Steps</div>
        <ol class="rm-section-body">${d.steps.map(s => `<li>${s}</li>`).join("")}</ol>
      </div>`;
    }
    if (d.when_to_use) {
      html += `<div class="rm-section">
        <div class="rm-section-title">When to use</div>
        <div class="rm-section-body">${d.when_to_use}</div>
      </div>`;
    }
    if (d.gotchas && d.gotchas.length) {
      html += `<div class="rm-section">
        <div class="rm-section-title">Gotchas</div>
        <ul class="rm-section-body">${d.gotchas.map(g => `<li>${g}</li>`).join("")}</ul>
      </div>`;
    }
    if (d.est_cost) {
      html += `<div class="rm-section">
        <div class="rm-section-title">Estimated cost</div>
        <div class="rm-section-body">${d.est_cost}</div>
      </div>`;
    }
    if (d.links && d.links.length) {
      html += `<div class="rm-section">
        <div class="rm-section-title">Learn more</div>
        <ul class="rm-section-body">${d.links.map(l => `<li><a href="${l.url}" target="_blank" rel="noopener">${l.label}</a></li>`).join("")}</ul>
      </div>`;
    }
    sectionsEl.innerHTML = html;

    document.body.appendChild(modal);
    document.body.classList.add("is-modal-open");
    requestAnimationFrame(() => modal.classList.add("is-open"));

    const close = () => {
      modal.classList.remove("is-open");
      document.body.classList.remove("is-modal-open");
      document.removeEventListener("keydown", escHandler);
      setTimeout(() => modal.remove(), 300);
    };
    const escHandler = (e) => { if (e.key === "Escape") close(); };
    modal.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", close));
    document.addEventListener("keydown", escHandler);
  }

  function renderRecipes() {
    const host = document.getElementById("recipes");
    if (!host) return;
    host.innerHTML = "";
    getRecipes().forEach((r, i) => {
      const delay = 0.2 + i * 0.08;
      const el = document.createElement("div");
      el.className = "recipe";
      el.style.setProperty("--recipe-delay", delay + "s");
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      const chipsHtml = r.chips.map((c, ci) => {
        const chip = chipMarkup(c);
        return ci === 0 ? chip : `<span class="recipe-arrow" aria-hidden="true">→</span>${chip}`;
      }).join("");
      el.innerHTML = `
        <div class="recipe-chips">${chipsHtml}</div>
        <div class="recipe-desc">${r.description}</div>
        <div class="recipe-more">Tap for details →</div>
      `;
      el.addEventListener("click", () => openRecipeModal(r));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openRecipeModal(r);
        }
      });
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

      // Fenced code blocks — ```lang ... ```
      let fence;
      if ((fence = line.match(/^\s*```\s*([\w-]*)\s*$/))) {
        const lang = fence[1] || "";
        i++;
        const buf = [];
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
          buf.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++; // skip closing fence
        const code = escHtml(buf.join("\n"));
        out.push(`<pre><code class="lang-${escHtml(lang)}">${code}</code></pre>`);
        continue;
      }

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
             !/^\s*```/.test(lines[i]) &&
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

    // Ensure latest data is loaded (needed for Resources + News sub-pills).
    if (!latestData) {
      try {
        const res = await fetch(DATA_URL, { cache: "no-cache" });
        if (res.ok) latestData = await res.json();
      } catch {}
    }

    // Tutorials sub-pill — hand-authored markdown from data/365/tutorials.json.
    try {
      const res = await fetch(TUTORIALS_365_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      renderTutorials('[data-cards="365-tutorials"]', data.tutorials || []);
    } catch (err) {
      const c = document.querySelector('[data-cards="365-tutorials"]');
      if (c) c.innerHTML = `<div class="empty">Couldn't load tutorials. ${escHtml(err.message || err)}</div>`;
    }

    // Resources sub-pill — newest Claude videos + official docs from the main
    // tutorials pool, sliced to keep it tight and curated-feeling.
    const allTuts = latestData?.sections?.tutorials || [];
    const videos   = allTuts.filter((t) => t.tutorial_kind === "video").slice(0, 6);
    const official = allTuts.filter((t) => t.tutorial_kind !== "video").slice(0, 6);
    renderSection("365-resources-videos",   videos,   true);
    renderSection("365-resources-official", official, false);

    // News sub-pill — Comply365 + competitor scraped items.
    renderSection("365-news", sortByDateDesc(latestData?.sections?.comply365_news || []), false);
  }
})();
