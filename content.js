(function () {
  "use strict";

  const SIDEBAR_ID = "vocabtracker-sidebar-iframe";
  const SIDEBAR_W = "500px";

  // Prevent duplicate injection
  if (document.getElementById(SIDEBAR_ID)) return;

  /* ── Sidebar iframe ────────────────────────────────────────────── */
  const iframe = document.createElement("iframe");
  iframe.id = SIDEBAR_ID;
  iframe.src = chrome.runtime.getURL("sidebar.html");
  iframe.setAttribute("allowtransparency", "true");

  Object.assign(iframe.style, {
    position: "fixed",
    top: "0",
    right: "0",
    width: SIDEBAR_W,
    height: "100vh",
    border: "none",
    zIndex: "2147483647",
    transform: `translateX(${SIDEBAR_W})`,
    transition: "transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "-4px 0 32px rgba(0,0,0,0.18)",
    borderRadius: "16px 0 0 16px",
    backgroundColor: "transparent",
  });

  /* ── State ─────────────────────────────────────────────────────── */
  let isOpen = false;

  function openSidebar() {
    isOpen = true;
    iframe.style.transform = "translateX(0)";
  }

  function closeSidebar() {
    isOpen = false;
    iframe.style.transform = `translateX(${SIDEBAR_W})`;
  }

  // Exposed so background.js can toggle via executeScript
  window.__vocabTrackerToggle = () => (isOpen ? closeSidebar() : openSidebar());

  /* ── Mount ─────────────────────────────────────────────────────── */
  document.body.appendChild(iframe);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closeSidebar();
  });

  // Re-guard against SPA navigation removing and re-adding the body
  const observer = new MutationObserver(() => {
    if (!document.getElementById(SIDEBAR_ID)) {
      document.body.appendChild(iframe);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: false });
})();
