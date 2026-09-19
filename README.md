# ✨ Prompt & Image Pair Capturer

[![License](https://img.shields.io/github/license/jamamjadalone/prompt-image-pair-capturer?color=blue)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blueviolet)](manifest.json)
[![Manifest](https://img.shields.io/badge/Manifest_V3-required-0052CC)]()
[![Browser](https://img.shields.io/badge/Browser-Chrome%20%7C%20Edge-4285F4)]()
[![Language](https://img.shields.io/badge/language-JavaScript%20(vanilla)-8B0000)]()
[![Storage](https://img.shields.io/badge/storage-IndexedDB%20(local)-10B981)]()
[![Privacy](https://img.shields.io/badge/privacy-100%25_local-green)]()
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen)]()

A lightweight **Chrome & Edge extension** that pairs the AI prompt you copied with the generated image you click — and keeps them together, safely on your device.

> Why this exists: most AI image tools (ImageFX, Gemini, and many others) do **not** embed the prompt inside the image file. This extension gives you a reliable, site-agnostic way to keep `prompt → image` pairs together — no EXIF metadata required, no API keys, no accounts.

---

## 🚀 Features

- ✅ **Works on any website** — AI Studio, Gemini, ImageFX, Midjourney web, or any page with images
- ✅ **Copy → Click → Saved** — a deliberate, foolproof pairing workflow (no DOM guessing)
- ✅ **Full-resolution capture** — keeps the original image quality, plus a compressed thumbnail
- ✅ **CORS-resistant** — tries direct fetch first, gracefully falls back to canvas capture
- ✅ **100% local** — everything stays in your browser's IndexedDB; zero network calls
- ✅ **Live badge counter** — see your captured-pair count right on the toolbar icon
- ✅ **Search, preview & export** — filter prompts, open full-size previews, export one-click JSON
- ✅ **SPA-ready** — capture-phase listeners work on dynamically loaded content (React, Vue, Angular)
- ✅ **Zero data loss** — every pair is committed to IndexedDB the moment you click

---

## 📖 How to Use (Easy Guide)

It's a simple 3-step rhythm: **Copy the prompt → Click the image → Done.**

### Step 1 – Copy the prompt

On any AI image site, select the prompt text and press `Ctrl + C` (or right-click → Copy).

A blue floating pill appears in the top-right corner:

```
● Prompt armed — click image to save
  A futuristic neon city in cinematic lighting, 8k resolution…
```

- The pill confirms the prompt is **armed** and waiting.
- Tip: copying a new prompt simply replaces the old one. You can re-copy as many times as you like before clicking an image.

### Step 2 – Click the generated image

Click directly on the result image (`<img>`, `<canvas>`, or a `background-image` element).

- The extension grabs the **full-resolution** image and builds a small **thumbnail**.
- The pair is immediately saved to local storage, the pill disappears, and you'll see:

```
✓ Saved
```

**Forgot to copy a prompt first?** Clicking an image without copying shows a warning instead of saving anything:

```
⚠ No prompt copied yet — copy the prompt text first
```

### Step 3 – Review & export

1. Click the extension icon in your toolbar.
2. Browse your captured pairs (thumbnail + prompt snippet + timestamp).
3. Click any card to open the **full-size image + full prompt** in a modal (and copy the prompt from there).
4. Use the search bar to filter prompts.
5. Click **Export All** → downloads a single JSON file for your desktop matching app.
6. Click **Clear All** (after confirmation) to start a fresh batch.

> 📌 **Workflow tip:** Use the ☒ button on the floating pill anytime to cancel/disarm before clicking an image.

---

## 🛡️ Robustness & Design

- **No DOM guessing** — pairs come only from your deliberate actions
- **Unarmed-click protection** — invalid records are never created
- **Double-click guard** — a 500 ms debounce prevents accidental duplicates
- **Dynamic SPA ready** — capture-phase event delegation catches dynamically inserted elements
- **Offline-safe** — records survive tab reloads and browser restarts

---

## 📥 Installation

### Option A – Load unpacked (developer mode)

1. Open **Google Chrome** or **Microsoft Edge**.
2. Go to `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Toggle **Developer mode** (top-right corner).
4. Click **Load unpacked** (top-left).
5. Select this extension's folder (the one containing `manifest.json`).
6. Pin the extension icon to your toolbar for quick access and the live badge counter.

### Option B – From source

```bash
git clone https://github.com/jamamjadalone/prompt-image-pair-capturer.git
```

Then follow steps 1–6 above using the cloned folder.

---

## 🧩 File Structure

```
prompt-image-pair-capturer/
├── manifest.json       # MV3 configuration & permissions
├── background.js       # Service worker: IndexedDB storage + badge sync
├── storage.js          # Shared IndexedDB wrapper (save, get, delete, clear, count)
├── content.js          # Copy→Click state machine, image detection & extraction
├── style.css           # Scoped on-page pill/toast styling
├── popup.html          # Popup UI layout
├── popup.css           # Popup styling (list, modals, search)
├── popup.js            # Popup controller (rendering, preview, export)
├── icons/              # Extension icons (16px, 48px, 128px)
└── LICENSE             # MIT
```

---

## 📄 JSON Export Schema

```json
{
  "exportedAt": "2026-09-19T10:30:00.000Z",
  "totalRecords": 50,
  "version": "1.0.0",
  "records": [
    {
      "id": "c7a8b3f1-2d3e-4b5a-8c9d-0e1f2a3b4c5d",
      "prompt": "A futuristic neon city in cinematic lighting, 8k resolution...",
      "imageFull": "data:image/png;base64,iVBORw0KGgo...",
      "imageThumb": "data:image/jpeg;base64,/9j/4AAQ...",
      "timestamp": "2026-09-19T10:29:45.123Z",
      "sourceUrl": "https://aistudio.google.com/..."
    }
  ]
}
```

---

## 🔒 Privacy

- **Zero network requests.** No analytics, no telemetry, no cloud.
- All data lives in your browser via **IndexedDB** under the extension's origin.
- Your prompts and images never leave your machine unless **you** export the JSON file.

---

## ❓ FAQ / Troubleshooting

| Problem | Solution |
| --- | --- |
| Image won't capture ("Couldn't capture this image") | Rare CORS case — use that site's own Save/download button, or right-click → Save Image and import manually. |
| No pill appears after copying | Make sure real text is selected (`Ctrl + C` with a text selection); empty copies are ignored. |
| Clicking an image saves the wrong image | Some sites use nested decorative icons; click the main image itself. |
| Accidental rapid double-click saved a duplicate | Guarded by 500 ms debounce — duplicates are already prevented. |
| How do I remove one record? | Open the popup → hover a card → click the 🗑 delete icon. |

---

## 🧠 Tech

- **Manifest V3** · vanilla JavaScript · no build step, no dependencies
- IndexedDB for durable local storage
- File → Blob → base64 capture pipeline with canvas fallback

---

## 🤝 Contributing

Found a bug or want a feature? Open an [issue](https://github.com/jamamjadalone/prompt-image-pair-capturer/issues) or submit a PR — contributions are welcome.

---

## 📄 License

[MIT](LICENSE) © 2026 [jamamjadalone](https://github.com/jamamjadalone)