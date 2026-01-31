(() => {
  // =========================
  // Config
  // =========================
  const EVENTS_KEY = "ps_events_v1";
  const ANON_KEY = "ps_anon_id_v1";
  const SESSION_KEY = "ps_session_id_v1";
  const MAX_EVENTS = 500;

  // If you later build an API, set this to your endpoint and uncomment send() below.
  // const INGEST_URL = "https://your-api.example.com/events";

  // =========================
  // Identity
  // =========================
  const anonId = (() => {
    let v = localStorage.getItem(ANON_KEY);
    if (!v) {
      v = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
      localStorage.setItem(ANON_KEY, v);
    }
    return v;
  })();

  const sessionId = (() => {
    let v = sessionStorage.getItem(SESSION_KEY);
    if (!v) {
      v = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
      sessionStorage.setItem(SESSION_KEY, v);
    }
    return v;
  })();

  // =========================
  // Data layer helpers
  // =========================
  function getPageContext() {
    // Option A: data layer object (preferred)
    const dl = window.psDataLayer && typeof window.psDataLayer === "object" ? window.psDataLayer : {};

    // Option B: body data-* attributes (optional)
    const b = document.body;
    const attr = b ? b.dataset : {};

    return {
      page_type: dl.page_type || attr.pageType || null,
      product_id: dl.product_id || attr.productId || null,
      product_name: dl.product_name || attr.productName || null,
      category: dl.category || attr.category || null,
      price: dl.price ?? (attr.price ? Number(attr.price) : null)
    };
  }

  // =========================
  // Storage
  // =========================
  function loadQueue() {
    try {
      return JSON.parse(localStorage.getItem(EVENTS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveQueue(q) {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(q.slice(-MAX_EVENTS)));
  }

  // =========================
  // Visibility badge (optional)
  // =========================
  function ensureBadge() {
    let badge = document.getElementById("ps-badge");
    if (badge) return badge;

    badge = document.createElement("div");
    badge.id = "ps-badge";
    badge.style.cssText = `
      position:fixed; right:12px; bottom:12px; z-index:99999;
      background:rgba(20,20,20,0.92); color:#fff;
      padding:10px 12px; border-radius:12px;
      font:12px system-ui, -apple-system, Segoe UI, Roboto, Arial;
      box-shadow:0 6px 20px rgba(0,0,0,0.25);
      max-width:320px;
    `;

    badge.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span id="ps-dot" style="width:10px;height:10px;border-radius:50%;background:#aaa;display:inline-block;"></span>
        <strong>Powersports Pixel</strong>
      </div>
      <div id="ps-status" style="margin-top:6px;opacity:0.9;">Initializing…</div>
      <div id="ps-ids" style="margin-top:6px;opacity:0.7;"></div>
      <div style="margin-top:8px;display:flex;gap:8px;">
        <button id="ps-export" style="cursor:pointer;border:0;border-radius:8px;padding:6px 8px;font:inherit;">Export</button>
        <button id="ps-clear" style="cursor:pointer;border:0;border-radius:8px;padding:6px 8px;font:inherit;">Clear</button>
      </div>
    `;

    document.body.appendChild(badge);

    // wire badge buttons
    const exportBtn = badge.querySelector("#ps-export");
    const clearBtn = badge.querySelector("#ps-clear");
    exportBtn.addEventListener("click", () => {
      const q = loadQueue();
      const blob = new Blob([JSON.stringify(q, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ps_events_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flash("#3b82f6");
    });

    clearBtn.addEventListener("click", () => {
      localStorage.removeItem(EVENTS_KEY);
      setStatus("Cleared. Captured 0 event(s).");
      flash("#f97316");
    });

    // show ids
    const ids = badge.querySelector("#ps-ids");
    ids.innerHTML = `
      anon_id: <code>${anonId.slice(0, 8)}…</code><br/>
      session_id: <code>${sessionId.slice(0, 8)}…</code>
    `;

    setStatus(`Ready.`);
    return badge;
  }

  function flash(color, ms = 250) {
    const dot = document.getElementById("ps-dot");
    if (!dot) return;
    const prev = dot.style.background;
    dot.style.background = color;
    setTimeout(() => (dot.style.background = prev || "#aaa"), ms);
  }

  function setStatus(text) {
    const s = document.getElementById("ps-status");
    if (s) s.textContent = text;
  }

  // =========================
  // Tracking
  // =========================
  function track(type, props = {}) {
    const ctx = getPageContext();

    const evt = {
      type,
      ts: new Date().toISOString(),
      anon_id: anonId,
      session_id: sessionId,
      url: location.href,
      path: location.pathname,
      referrer: document.referrer || null,

      // context fields
      page_type: ctx.page_type,
      product_id: ctx.product_id,
      product_name: ctx.product_name,
      category: ctx.category,
      price: ctx.price,

      // event-specific properties
      ...props
    };

    const q = loadQueue();
    q.push(evt);
    saveQueue(q);

    setStatus(`Captured ${q.length} event(s) • last: ${type}`);
    flash("#22c55e");

    // If/when you have a backend:
    // send(evt);
  }

  // Optional future: send to API
  // async function send(evt) {
  //   try {
  //     await fetch(INGEST_URL, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(evt)
  //     });
  //   } catch (e) {
  //     // You can queue failed sends later
  //   }
  // }

  // =========================
  // Auto events
  // =========================

  // badge
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureBadge);
  } else {
    ensureBadge();
  }

  // page view
  window.addEventListener("load", () => {
    track("page_view", { title: document.title || null });
  });

  // product view (fires if page_type === 'product')
  window.addEventListener("load", () => {
    const ctx = getPageContext();
    if (ctx.page_type === "product" && ctx.product_id) {
      track("view_product", {});
    }
  });

  // clicks (captures data-track label + basic element info)
  document.addEventListener(
    "click",
    (e) => {
      const tracked = e.target?.closest?.("[data-track]");
      const el = tracked || e.target?.closest?.("a,button,input,select,textarea");
      if (!el) return;

      const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) || null;

      track("click", {
        tag: el.tagName.toLowerCase(),
        trackLabel: tracked?.getAttribute?.("data-track") || null,
        id: el.id || null,
        classes: typeof el.className === "string" ? el.className : null,
        text,
        href: el.getAttribute?.("href") || null
      });
    },
    true
  );

  // expose a tiny API (optional, handy later)
  window.psPixel = {
    track,
    getAnonId: () => anonId,
    getSessionId: () => sessionId
  };
})();
