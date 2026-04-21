# VocabTracker — Word Saver

A Chrome extension to save and review English vocabulary words while browsing any website.

## Features

- **Save words** with their meaning directly from any webpage
- **Edit** saved words and meanings inline
- **Delete** words you no longer need
- **Search** across all saved words and meanings
- **Today badge** highlights words added today
- Words are stored locally using IndexedDB — no account or internet required
- Sidebar slides in from the right edge of any page

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the project folder
5. The VocabTracker icon will appear in your toolbar

## Usage

| Action | How |
|---|---|
| Open / close sidebar | Click the extension icon in the toolbar, or click the purple tab on the right edge of any page |
| Add a word | Fill in Word + Meaning and click **Save Word** (or press `Ctrl+Enter`) |
| Edit a word | Click the ✏️ pencil button on a card, update the fields, click **Update Word** |
| Delete a word | Click the 🗑️ trash button on a card |
| Search | Type in the search bar — matches are highlighted in real time |
| Close sidebar | Press `Escape` or click the × tab |

## Project Structure

```
new-words/
├── manifest.json       # Extension manifest (MV3)
├── background.js       # Service worker — handles toolbar icon clicks
├── content.js          # Injected into every page — mounts the sidebar iframe
├── sidebar.html        # Sidebar UI markup
├── sidebar.js          # Sidebar logic — IndexedDB, rendering, events
├── sidebar.css         # Sidebar styles
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── generate-icons.html # Helper page to regenerate icons if needed
```

## Storage

All data is saved in the browser's **IndexedDB** (`VocabTrackerDB`). Nothing is sent to any server. Clearing browser data will erase saved words.
