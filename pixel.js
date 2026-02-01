// ====== CONFIG ======
const PIXEL_ENDPOINT = "https://pixel-functional-app-test-debcf3ctg4acgwez.westus2-01.azurewebsites.net/api/ingest";
const PIXEL_CODE = "QcOybpPguXMM_ySWD6TktprZYX2bIjXoZiqbCkOJHS9dAzFuQF6ejA==";
const DEALER_ID = "test-site";

// ====== ID HELPERS ======
function getOrCreateId(storage, key) {
  let v = storage.getItem(key);
  if (!v) {
    v = (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random());
    storage.setItem(key, v);
  }
  return v;
}

function getAnonymousId() {
  return getOrCreateId(localStorage, "ps_anonymous_id");
}

function getSessionId() {
  return getOrCreateId(sessionStorage, "ps_session_id");
}

// ====== SEND EVENT ======
async function sendEvent(eventName, props = {}) {
  const payload = {
    event_name: eventName,
    event_time_utc: new Date().toISOString(),
    event_uuid: (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random()),
    dealer_id: DEALER_ID,
    anonymous_id: getAnonymousId(),
    session_id: getSessionId(),
    page_url: window.location.href,
    referrer: document.referrer || null,
    ...props
  };

  const url = `${PIXEL_ENDPOINT}?code=${encodeURIComponent(PIXEL_CODE)}`;
  const body = JSON.stringify(payload);

  // Best effort on unload/navigation
  if (navigator.sendBeacon) {
    try {
      const ok = navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      if (ok) return;
    } catch (_) {}
  }

  // Fallback
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  });

  if (!res.ok) {
    // Helpful during testing
    const text = await res.text().catch(() => "");
    console.error("Pixel send failed:", res.status, text);
  }
}

// ====== AUTO PAGE VIEW ======
window.addEventListener("load", () => {
  sendEvent("page_view");
});

// Expose for your HTML buttons during testing
window.psSendEvent = sendEvent;
