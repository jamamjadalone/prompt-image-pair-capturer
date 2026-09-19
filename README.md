# Prompt & Image Pair Capturer (Manifest V3)

A Chrome & Edge browser extension that captures user-copied prompt text together with a user-clicked image preview from AI image-generation web tools (e.g., Google AI Studio, Gemini, ImageFX, Midjourney, etc.), and stores them as paired records in IndexedDB for JSON export.

---

## 🚀 How to Install

1. Open **Google Chrome** or **Microsoft Edge**.
2. Navigate to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left.
5. Select this extension's folder (`prompt-image-pair-capturer`).
6. Pin the extension icon to your toolbar for quick access and live badge counters.

---

## 🎯 Core User Workflow (Copy ➔ Click ➔ Confirm)

1. **Copy the Prompt**:
   - Manually highlight and copy the prompt text anywhere on the page using `Ctrl + C` or right-click `Copy`.
   - A floating pill appears in the top right:  
     `"Prompt armed — click image to save"` with a snippet of your copied text.
   - *Tip:* If you copy a new prompt before clicking an image, the pending prompt is automatically replaced with your latest copy.
2. **Click the Generated Image**:
   - Click directly on the result image (`<img>`, `<canvas>`, or CSS `background-image`).
   - The extension captures the full-resolution preview and generates a compressed thumbnail.
   - The pair is immediately saved to IndexedDB, the floating badge clears, and a confirmation toast appears:  
     `"Saved ✓"`
3. **Review & Export**:
   - Click the extension icon in your browser toolbar to open the popup list.
   - View captured records (thumbnails + prompt snippets + timestamps).
   - Click any card to expand the full-size image preview and full prompt text.
   - Click **Export All** to download a single JSON file formatted for your desktop matching application.
   - Click **Clear All** when you are ready to start a fresh batch.

---

## 🛡️ Robustness & Features

- **No DOM Guessing**: Pairs are created strictly through deliberate user actions (Copy prompt ➔ Click image).
- **Unarmed Click Protection**: If an image is clicked without copying a prompt first, a warning toast (`"No prompt copied yet — copy the prompt text first"`) is shown and no invalid records are saved.
- **Dynamic SPA Ready**: Uses capture-phase event delegation on the document/window to reliably catch dynamically inserted elements in single-page apps (React, Lit, Angular).
- **CORS Fallback**: Attempts direct `fetch()` + `blob` to extract original image files; falls back to offscreen `<canvas>` drawing when needed.
- **Zero Data Loss**: Records are committed immediately to IndexedDB (not kept only in memory), surviving tab reloads or crashes.
- **Double-Click Guard**: 500ms debounce protection prevents accidental duplicate records.
- **Live Badge Counter**: The extension icon badge displays the real-time count of captured pairs.
- **100% Local**: Zero external network calls. All data is stored locally in your browser.

---

## 📂 File Structure

```
Propmt COpy Extension/
├── manifest.json       # Manifest V3 configuration & permissions
├── background.js       # Service worker: centralized IndexedDB storage & badge sync
├── storage.js          # Shared IndexedDB wrapper (save, get, delete, clear, count)
├── content.js          # DOM capture listeners, copy-then-click state machine & extraction
├── style.css           # Scoped styling for floating pill & toast notifications
├── popup.html          # Extension popup UI layout
├── popup.css           # Styling for popup list, modals, and search
├── popup.js            # Popup controller (rendering, modals, JSON export)
├── icons/              # Extension icons (16px, 48px, 128px)
└── README.md           # Documentation & user instructions
```

---

## 📄 JSON Export Schema

```json
{
  "exportedAt": "2026-08-31T10:30:00.000Z",
  "totalRecords": 50,
  "version": "1.0.0",
  "records": [
    {
      "id": "c7a8b3f1-2d3e-4b5a-8c9d-0e1f2a3b4c5d",
      "prompt": "A futuristic neon city in cinematic lighting, 8k resolution...",
      "imageFull": "data:image/png;base64,iVBORw0KGgo...",
      "imageThumb": "data:image/jpeg;base64,/9j/4AAQ...",
      "timestamp": "2026-08-31T10:29:45.123Z",
      "sourceUrl": "https://aistudio.google.com/..."
    }
  ]
}
```
