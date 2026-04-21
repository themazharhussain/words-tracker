"use strict";

chrome.action.onClicked.addListener(async (tab) => {
  if (
    !tab.id ||
    !tab.url ||
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("chrome-extension://")
  )
    return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  } catch (_) {
    // Already injected — duplicate-guard in content.js prevents double UI
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const btn = document.getElementById("vocabtracker-toggle-btn");
        if (btn) btn.click();
      },
    });
  } catch (err) {
    console.warn("[VocabTracker] Could not toggle sidebar:", err.message);
  }
});
