// ====== CONFIG ======
const PIXEL_ENDPOINT = "https://pixel-functional-app-test-debcf3ctg4acgwez.westus2-01.azurewebsites.net/api/ingest";
const PIXEL_CODE = "QcOybpPguXMM_ySWD6TktprZYX2bIjXoZiqbCkOJHS9dAzFuQF6ejA==";
const DEALER_ID = "test-site";

// ================= ID HELPERS =================
function getOrCreateId(storage, key) {
  let v = storage.getItem(key);
  if (!v) {
    v = (crypto?.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random());
    storage.setItem(key, v);
  }
  return v;
}

const getAnonymousId = () => getOrCreateId(localStorage, "ps_anon_id");
const getSessionId   = () => getOrCreateId(sessionStorage, "ps_session_id");

// ================= SEND EVENT =================
async function sendEvent(eventName, extra = {}) {
  const payload = {
    event_name: eventName,
    event_time_utc: new Date().toISOString(),
    event_uuid: crypto?.randomUUID?.(),
    dealer_id: DEALER_ID,
    anonymous_id: getAnonymousId(),
    session_id: getSessionId(),
    page_url: window.location.href,
    referrer: document.referrer || null,
    ...extra
  };

  const url = `${PIXEL_ENDPOINT}?code=${encodeURIComponent(PIXEL_CODE)}`;
  const body = JSON.stringify(payload);

  // sendBeacon first (best for navigation/unload)
  if (navigator.sendBeacon) {
    try {
      const ok = navigator.sendBeacon(
        url,
        new Blob([body], { type: "application/json" })
      );
      if (ok) return;
    } catch (_) {}
  }

  // fallback to fetch
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => {});
}

// ================= PAGE LOAD EVENTS =================
window.addEventListener("load", () => {
  // Always record a page_view
  sendEvent("page_view");

  // If this is a product page, record product_view
  if (window.psDataLayer?.page_type === "product") {
    sendEvent("product_view", {
      product: {
        product_id: window.psDataLayer.product_id,
        product_name: window.psDataLayer.product_name,
        category: window.psDataLayer.category,
        price: window.psDataLayer.price
      }
    });
  }
});

// ================= CLICK TRACKING =================
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-track]");
  if (!el) return;

  sendEvent("click", {
    action: el.dataset.track
  });
});
