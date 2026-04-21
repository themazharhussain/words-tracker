/**
 * sidebar.js — VocabTracker sidebar logic
 *
 * Handles:
 *  - IndexedDB initialisation and CRUD operations
 *  - Rendering word cards
 *  - Add / delete / search functionality
 *  - Toast notifications
 *  - Collapsible form
 */

"use strict";

/* ================================================================
   IndexedDB helper
   ================================================================ */
const DB = (() => {
  const DB_NAME = "VocabTrackerDB";
  const STORE_NAME = "words";
  const DB_VERSION = 1;
  let db = null;

  /** Open (or create) the database. Returns a Promise. */
  function open() {
    return new Promise((resolve, reject) => {
      if (db) {
        resolve(db);
        return;
      }

      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("word", "word", { unique: false });
          store.createIndex("dateAdded", "dateAdded", { unique: false });
        }
      };

      req.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /** Add a word entry. Returns the new auto-increment id. */
  async function addWord(entry) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.add({
        word: entry.word.trim(),
        meaning: entry.meaning.trim(),
        example: (entry.example || "").trim(),
        dateAdded: new Date().toISOString(),
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /** Retrieve all words, newest first. */
  async function getAllWords() {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve([...request.result].reverse());
      request.onerror = () => reject(request.error);
    });
  }

  /** Delete a word by id. */
  async function deleteWord(id) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /** Update word and meaning by id, preserving dateAdded. */
  async function updateWord(id, entry) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        const putReq = store.put({
          ...existing,
          word: entry.word.trim(),
          meaning: entry.meaning.trim(),
        });
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  return { addWord, getAllWords, deleteWord, updateWord };
})();

/* ================================================================
   Utility helpers
   ================================================================ */

/** Format an ISO date string into a readable label. */
function formatDate(isoString) {
  const date = new Date(isoString);
  const today = new Date();

  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (sameDay) return "Today";

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const wasYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (wasYesterday) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

/** Return true if an ISO date string represents today's date. */
function isToday(isoString) {
  const date = new Date(isoString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Wrap all occurrences of `query` in a string with
 * <mark class="highlight">…</mark>, case-insensitive.
 */
function highlightText(text, query) {
  if (!query || !text) return escapeHtml(text || "");
  const escaped = escapeHtml(text);
  const pattern = new RegExp(`(${escapeRegex(query)})`, "gi");
  return escaped.replace(pattern, '<mark class="highlight">$1</mark>');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ================================================================
   Toast notifications
   ================================================================ */
let toastTimer = null;

function showToast(message, type = "default") {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = "toast";
  }, 2600);
}

/* ================================================================
   UI state
   ================================================================ */
let allWords = []; // full dataset from DB
let searchQuery = ""; // current search string
let editingId = null; // null = add mode, number = editing existing word id

/* ================================================================
   Render word cards
   ================================================================ */
function renderWords() {
  const list = document.getElementById("wordsList");
  const meta = document.getElementById("listMeta");
  const badge = document.getElementById("totalCountBadge");

  // Filter words by search query
  const query = searchQuery.toLowerCase().trim();
  const visible = query
    ? allWords.filter(
        (w) =>
          w.word.toLowerCase().includes(query) ||
          w.meaning.toLowerCase().includes(query) ||
          (w.example && w.example.toLowerCase().includes(query)),
      )
    : allWords;

  // Update counters
  badge.textContent = allWords.length;
  meta.textContent = query
    ? `${visible.length} of ${allWords.length}`
    : `${allWords.length} word${allWords.length !== 1 ? "s" : ""}`;

  // Empty states
  if (allWords.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📖</div>
        <h3>No words yet</h3>
        <p>Add your first word using the form above and start building your vocabulary.</p>
      </div>`;
    return;
  }

  if (visible.length === 0) {
    list.innerHTML = `
      <div class="no-results">
        <strong>No results for "${escapeHtml(searchQuery)}"</strong>
        Try a different word or meaning.
      </div>`;
    return;
  }

  // Render cards
  list.innerHTML = visible.map((w) => buildCardHTML(w, query)).join("");

  // Attach delete listeners
  list.querySelectorAll("[data-delete-id]").forEach((btn) => {
    btn.addEventListener("click", () =>
      handleDelete(Number(btn.dataset.deleteId)),
    );
  });

  // Attach edit listeners
  list.querySelectorAll("[data-edit-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entry = allWords.find((w) => w.id === Number(btn.dataset.editId));
      if (entry) startEdit(entry);
    });
  });
}

/** Build the HTML string for a single word card. */
function buildCardHTML(word, query) {
  const todayClass = isToday(word.dateAdded) ? " today" : "";
  const wordHtml = highlightText(word.word, query);
  const meaningHtml = highlightText(word.meaning, query);
  const dateLabel = formatDate(word.dateAdded);

  return `
    <article class="word-card${todayClass}" aria-label="${escapeHtml(word.word)}">
      <div class="card-top">
        <span class="word-name">${wordHtml}</span>
        <div class="card-actions">
          <button
            class="edit-btn"
            data-edit-id="${word.id}"
            title="Edit word"
            aria-label="Edit ${escapeHtml(word.word)}"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            class="delete-btn"
            data-delete-id="${word.id}"
            title="Delete word"
            aria-label="Delete ${escapeHtml(word.word)}"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="word-meaning">${meaningHtml}</div>

      <footer class="card-footer">
        <span class="date-badge">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8"  y1="2" x2="8"  y2="6"/>
            <line x1="3"  y1="10" x2="21" y2="10"/>
          </svg>
          ${dateLabel}
        </span>
      </footer>
    </article>`;
}

/* ================================================================
   Event handlers
   ================================================================ */

const SAVE_BTN_HTML = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
  Save Word`;

const UPDATE_BTN_HTML = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
  Update Word`;

function startEdit(entry) {
  editingId = entry.id;
  document.getElementById("inputWord").value       = entry.word;
  document.getElementById("inputMeaning").value    = entry.meaning;
  document.getElementById("formTitle").textContent = "Edit Word";
  document.getElementById("saveBtn").innerHTML     = UPDATE_BTN_HTML;
  document.getElementById("cancelBtn").hidden      = false;
  document.getElementById("inputWord").focus();
  document.getElementById("formSection").scrollIntoView({ behavior: "smooth" });
}

function cancelEdit() {
  editingId = null;
  document.getElementById("inputWord").value       = "";
  document.getElementById("inputMeaning").value    = "";
  document.getElementById("formTitle").textContent = "Add New Word";
  document.getElementById("saveBtn").innerHTML     = SAVE_BTN_HTML;
  document.getElementById("cancelBtn").hidden      = true;
}

async function handleSave() {
  const wordEl    = document.getElementById("inputWord");
  const meaningEl = document.getElementById("inputMeaning");
  const saveBtn   = document.getElementById("saveBtn");

  const word    = wordEl.value.trim();
  const meaning = meaningEl.value.trim();

  if (!word) {
    wordEl.focus();
    showToast("Please enter a word.", "error");
    return;
  }
  if (!meaning) {
    meaningEl.focus();
    showToast("Please enter the meaning.", "error");
    return;
  }

  saveBtn.disabled  = true;
  saveBtn.innerHTML = '<div class="spinner"></div> Saving…';

  try {
    if (editingId !== null) {
      await DB.updateWord(editingId, { word, meaning });
      allWords = await DB.getAllWords();
      renderWords();
      cancelEdit();
      showToast(`"${word}" updated!`, "success");
    } else {
      const duplicate = allWords.find(
        (w) => w.word.toLowerCase() === word.toLowerCase()
      );
      if (duplicate) {
        showToast(`"${word}" is already saved.`, "error");
        wordEl.focus();
        return;
      }
      await DB.addWord({ word, meaning });
      allWords = await DB.getAllWords();
      renderWords();
      wordEl.value    = "";
      meaningEl.value = "";
      wordEl.focus();
      showToast(`"${word}" saved successfully!`, "success");
    }
  } catch (err) {
    console.error("[VocabTracker] Save error:", err);
    showToast("Failed to save. Please try again.", "error");
  } finally {
    saveBtn.disabled  = false;
    saveBtn.innerHTML = editingId !== null ? UPDATE_BTN_HTML : SAVE_BTN_HTML;
  }
}

async function handleDelete(id) {
  const entry = allWords.find((w) => w.id === id);
  if (!entry) return;

  try {
    await DB.deleteWord(id);
    allWords = await DB.getAllWords();
    renderWords();
    showToast(`"${entry.word}" deleted.`);
  } catch (err) {
    console.error("[VocabTracker] Delete error:", err);
    showToast("Failed to delete. Please try again.", "error");
  }
}

function handleSearch(e) {
  searchQuery = e.target.value;
  renderWords();
}

function handleKeydown(e) {
  const isFormField = ["inputWord", "inputMeaning"].includes(e.target.id);
  if (isFormField && (e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    handleSave();
  }
}

/* ================================================================
   Initialise
   ================================================================ */
async function init() {
  try {
    allWords = await DB.getAllWords();
    renderWords();
  } catch (err) {
    console.error("[VocabTracker] DB init error:", err);
    document.getElementById("wordsList").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Storage error</h3>
        <p>Could not load your words. Try reloading the page.</p>
      </div>`;
  }

  document.getElementById("saveBtn").addEventListener("click", handleSave);
  document.getElementById("cancelBtn").addEventListener("click", cancelEdit);
  document.getElementById("searchInput").addEventListener("input", handleSearch);
  document.addEventListener("keydown", handleKeydown);
}

document.addEventListener("DOMContentLoaded", init);
