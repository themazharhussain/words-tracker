/**
 * content.js — Injected into every page.
 * Responsibilities:
 *  1. Inject the sidebar iframe (pointing to sidebar.html)
 *  2. Inject the toggle button that opens/closes the sidebar
 *  3. Guard against duplicate injection on SPA navigation
 */

(function () {
  "use strict";

  const SIDEBAR_ID = "vocabtracker-sidebar-iframe";
  const TOGGLE_ID = "vocabtracker-toggle-btn";
  const SIDEBAR_W = "360px";

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
    zIndex: "2147483646",
    transform: `translateX(${SIDEBAR_W})`,
    transition: "transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "-4px 0 32px rgba(0,0,0,0.18)",
    borderRadius: "16px 0 0 16px",
    backgroundColor: "transparent",
  });

  /* ── Toggle button ─────────────────────────────────────────────── */
  const btn = document.createElement("button");
  btn.id = TOGGLE_ID;
  btn.title = "VocabTracker";
  btn.setAttribute("aria-label", "Toggle VocabTracker sidebar");

  // Hamburger SVG icon
  const iconMenu = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="3" y1="6"  x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>`;

  // Close (×) SVG icon
  const iconClose = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6"  x2="6"  y2="18"/>
      <line x1="6"  y1="6"  x2="18" y2="18"/>
    </svg>`;

  btn.innerHTML = iconMenu;

  Object.assign(btn.style, {
    position: "fixed",
    top: "50%",
    right: "0",
    transform: "translateY(-50%)",
    width: "30px",
    height: "54px",
    background: "linear-gradient(160deg, #6366f1, #8b5cf6)",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px 0 0 10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "2147483647",
    boxShadow: "-3px 0 16px rgba(99,102,241,0.45)",
    transition:
      "width 0.2s ease, right 0.32s cubic-bezier(0.4,0,0.2,1), background 0.2s ease",
    padding: "0",
    outline: "none",
  });

  /* ── State ─────────────────────────────────────────────────────── */
  let isOpen = false;

  function openSidebar() {
    isOpen = true;
    iframe.style.transform = "translateX(0)";
    btn.style.right = SIDEBAR_W;
    btn.innerHTML = iconClose;
    btn.title = "Close VocabTracker";
  }

  function closeSidebar() {
    isOpen = false;
    iframe.style.transform = `translateX(${SIDEBAR_W})`;
    btn.style.right = "0";
    btn.innerHTML = iconMenu;
    btn.title = "Open VocabTracker";
  }

  btn.addEventListener("click", () =>
    isOpen ? closeSidebar() : openSidebar(),
  );

  btn.addEventListener("mouseenter", () => {
    btn.style.width = "36px";
    btn.style.background = "linear-gradient(160deg, #4f46e5, #7c3aed)";
  });

  btn.addEventListener("mouseleave", () => {
    btn.style.width = "30px";
    btn.style.background = "linear-gradient(160deg, #6366f1, #8b5cf6)";
  });

  /* ── Mount ─────────────────────────────────────────────────────── */
  document.body.appendChild(iframe);
  document.body.appendChild(btn);

  // Close sidebar when user presses Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closeSidebar();
  });

  // Re-guard against SPA navigation removing and re-adding the body
  const observer = new MutationObserver(() => {
    if (!document.getElementById(SIDEBAR_ID)) {
      document.body.appendChild(iframe);
      document.body.appendChild(btn);
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: false,
  });
})();
