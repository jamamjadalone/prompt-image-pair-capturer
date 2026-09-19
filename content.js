/**
 * content.js - DOM Interaction, State Machine & Image Extraction
 * 
 * CORE STATE MACHINE:
 * 
 *    [IDLE]
 *      │
 *      │ (User copies prompt text via Ctrl+C / right-click copy)
 *      ▼
 *   [ARMED] ◄────────────────────────────────────────┐
 *      │                                             │ (User copies a NEW prompt)
 *      │                                             │ [Replaces pending prompt]
 *      ├── (User clicks non-image element) ──────────┘ [Ignored, stays ARMED]
 *      │
 *      ├── (User clicks image element)
 *      │       │
 *      │       ▼
 *      │   [EXTRACT FULL & THUMBNAIL]
 *      │       │
 *      │       ├── (Success) ──► [SAVE TO INDEXEDDB] ──► [TOAST SUCCESS] ──► [IDLE]
 *      │       │
 *      │       └── (CORS/Extraction Error) ──► [TOAST ERROR] ──► [STAYS ARMED or IDLE]
 *      │
 *      └── (User clicks "✕" on floating pill) ──► [IDLE]
 * 
 * UNARMED IMAGE CLICK:
 *   [IDLE] + (User clicks image element) ──► [TOAST WARNING: "No prompt copied yet"] ──► [IDLE]
 */

(function () {
  'use strict';

  // Prevent multiple injections in the same frame/page
  if (window.__promptImageCapturerInitialized) {
    return;
  }
  window.__promptImageCapturerInitialized = true;

  // ==========================================
  // STATE VARIABLES
  // ==========================================
  let armedPrompt = null;            // Holds the untouched copied prompt text
  let lastSavedTimestamp = 0;        // Guard against rapid accidental double-clicks (500ms)
  let lastSavedElement = null;       // Reference to last saved element for debounce

  // ==========================================
  // DOM UI HELPERS (Floating Pill & Toasts)
  // ==========================================
  let hostContainer = null;
  let floatingPill = null;
  let toastContainer = null;

  /**
   * Ensures the isolated container for all extension UI elements exists in DOM.
   */
  function ensureHostContainer() {
    if (!hostContainer || !document.body.contains(hostContainer)) {
      hostContainer = document.createElement('div');
      hostContainer.id = '__pic_host_container';
      document.documentElement.appendChild(hostContainer);
    }
    if (!toastContainer || !hostContainer.contains(toastContainer)) {
      toastContainer = document.createElement('div');
      toastContainer.className = '__pic-toast-container';
      hostContainer.appendChild(toastContainer);
    }
    return hostContainer;
  }

  /**
   * Shows or updates the floating on-page badge indicating a prompt is armed.
   * @param {string} promptText - The prompt text that was copied.
   */
  function showArmedPill(promptText) {
    ensureHostContainer();

    if (!floatingPill) {
      floatingPill = document.createElement('div');
      floatingPill.className = '__pic-floating-pill';
      
      const dot = document.createElement('div');
      dot.className = '__pic-pill-dot';

      const content = document.createElement('div');
      content.className = '__pic-pill-content';

      const title = document.createElement('div');
      title.className = '__pic-pill-title';
      title.textContent = 'Prompt armed — click image to save';

      const snippet = document.createElement('div');
      snippet.className = '__pic-pill-snippet';

      content.appendChild(title);
      content.appendChild(snippet);

      const closeBtn = document.createElement('button');
      closeBtn.className = '__pic-pill-close';
      closeBtn.title = 'Cancel / Disarm';
      closeBtn.innerHTML = '✕';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        disarm();
      });

      floatingPill.appendChild(dot);
      floatingPill.appendChild(content);
      floatingPill.appendChild(closeBtn);

      hostContainer.appendChild(floatingPill);
    }

    // Update snippet text
    const snippetEl = floatingPill.querySelector('.__pic-pill-snippet');
    if (snippetEl) {
      // Clean up whitespace for preview display only (original prompt stays untouched)
      const cleanSnippet = promptText.replace(/\s+/g, ' ').trim();
      snippetEl.textContent = cleanSnippet.length > 50 ? cleanSnippet.slice(0, 50) + '…' : cleanSnippet;
    }

    // Re-trigger animation if already open
    floatingPill.style.display = 'flex';
  }

  /**
   * Hides and removes the armed indicator pill.
   */
  function hideArmedPill() {
    if (floatingPill && floatingPill.parentNode) {
      floatingPill.parentNode.removeChild(floatingPill);
      floatingPill = null;
    }
  }

  /**
   * Clears the armed prompt state and hides the floating pill.
   */
  function disarm() {
    armedPrompt = null;
    hideArmedPill();
  }

  /**
   * Displays a temporary on-page toast notification.
   * @param {string} message - Message text
   * @param {'success'|'warning'|'error'} type - Toast type
   * @param {number} durationMs - Duration in milliseconds
   */
  function showToast(message, type = 'success', durationMs = 3500) {
    ensureHostContainer();

    const toast = document.createElement('div');
    toast.className = `__pic-toast __pic-toast-${type}`;

    const icon = document.createElement('span');
    icon.className = '__pic-toast-icon';
    if (type === 'success') icon.textContent = '✓';
    else if (type === 'warning') icon.textContent = '⚠';
    else icon.textContent = '✕';

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    toastContainer.appendChild(toast);

    // Auto dismiss
    setTimeout(() => {
      toast.classList.add('__pic-toast-exit');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, durationMs);
  }

  // ==========================================
  // COPY EVENT LISTENER
  // ==========================================
  /**
   * Captures user-initiated copy events.
   */
  function handleCopy(event) {
    // Check if target is inside our own extension UI
    if (event.target && event.target.closest && event.target.closest('#__pic_host_container')) {
      return;
    }

    let copiedText = '';

    // 1. Try getting text directly from selection
    const selection = window.getSelection();
    if (selection) {
      copiedText = selection.toString();
    }

    // 2. If selection is empty (e.g. copied from inside an input/textarea), check clipboardData if available
    if (!copiedText && event.clipboardData) {
      copiedText = event.clipboardData.getData('text/plain') || '';
    }

    // 3. If still empty, attempt activeElement inspection
    if (!copiedText && document.activeElement) {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        const start = active.selectionStart;
        const end = active.selectionEnd;
        if (start !== null && end !== null && start !== end) {
          copiedText = active.value.substring(start, end);
        }
      }
    }

    // Discard empty/whitespace-only copies
    if (!copiedText || !copiedText.trim()) {
      return;
    }

    // Arm the prompt (replaces any previous pending prompt with latest copy)
    armedPrompt = copiedText;
    showArmedPill(armedPrompt);
  }

  // Register copy listener on document in capture phase
  document.addEventListener('copy', handleCopy, true);

  // ==========================================
  // IMAGE DETECTION & EXTRACTION
  // ==========================================

  /**
   * Checks if an element is or contains an AI-generated image/canvas.
   * Returns an object { type: 'img'|'canvas'|'bg', element, src } or null.
   */
  function detectImageTarget(element) {
    if (!element || !(element instanceof Element)) return null;

    // Ignore clicks inside our own UI container
    if (element.closest && element.closest('#__pic_host_container')) return null;

    // 1. Direct <img> element
    if (element instanceof HTMLImageElement && element.src) {
      return { type: 'img', element, src: element.currentSrc || element.src };
    }

    // 2. Direct <canvas> element
    if (element instanceof HTMLCanvasElement) {
      return { type: 'canvas', element, src: null };
    }

    // 3. SVG <image> tag
    if (element.tagName && element.tagName.toLowerCase() === 'image') {
      const href = element.getAttribute('href') || element.getAttribute('xlink:href');
      if (href) return { type: 'img', element, src: href };
    }

    // 4. Element with CSS background-image
    const computedStyle = window.getComputedStyle(element);
    const bgImage = computedStyle.backgroundImage;
    if (bgImage && bgImage !== 'none' && bgImage.startsWith('url(')) {
      const match = bgImage.match(/^url\(["']?(.+?)["']?\)$/);
      if (match && match[1]) {
        return { type: 'bg', element, src: match[1] };
      }
    }

    // 5. Check if element is a wrapper/overlay immediately containing an img or canvas
    // (Common in dynamic Google image grid cards with overlay buttons/shadows)
    const childImg = element.querySelector('img');
    if (childImg && childImg.src) {
      return { type: 'img', element: childImg, src: childImg.currentSrc || childImg.src };
    }

    const childCanvas = element.querySelector('canvas');
    if (childCanvas) {
      return { type: 'canvas', element: childCanvas, src: null };
    }

    // 6. Check closest ancestor img/canvas/bg if clicked on pseudo-element or nested badge
    const ancestorWithBg = element.closest('[style*="background-image"]');
    if (ancestorWithBg) {
      const ancestorStyle = window.getComputedStyle(ancestorWithBg);
      const ancestorBg = ancestorStyle.backgroundImage;
      const match = ancestorBg.match(/^url\(["']?(.+?)["']?\)$/);
      if (match && match[1]) {
        return { type: 'bg', element: ancestorWithBg, src: match[1] };
      }
    }

    return null;
  }

  /**
   * Fetches image source as full-res base64 data URL via Blob.
   * This guarantees exact original quality without recompression.
   */
  async function fetchImageAsBase64(srcUrl) {
    const response = await fetch(srcUrl, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Fallback: Draws image/canvas to an offscreen canvas and extracts base64 data URL.
   */
  function extractViaCanvas(imageSource) {
    return new Promise((resolve, reject) => {
      try {
        if (imageSource.type === 'canvas') {
          const canvas = imageSource.element;
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
          return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width || 512;
            canvas.height = img.naturalHeight || img.height || 512;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image for canvas extraction.'));
        };

        img.src = imageSource.src;
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates a small compressed thumbnail (max ~200px, JPEG 70%) from full image data URL.
   */
  function generateThumbnail(fullDataUrl, maxDim = 200, quality = 0.7) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width || 100;
          canvas.height = height || 100;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const thumbDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(thumbDataUrl);
        } catch (e) {
          // If thumbnail generation fails, return full data URL as fallback
          resolve(fullDataUrl);
        }
      };

      img.onerror = () => resolve(fullDataUrl);
      img.src = fullDataUrl;
    });
  }

  /**
   * Extracts full-resolution image data URL with fallback strategy.
   */
  async function extractFullImage(imageTarget) {
    // If it's a canvas, direct export
    if (imageTarget.type === 'canvas') {
      return imageTarget.element.toDataURL('image/png');
    }

    const src = imageTarget.src;

    // If it's already a data URL or blob URL
    if (src.startsWith('data:')) {
      return src;
    }

    // First attempt: fetch + blob -> exact original file
    try {
      return await fetchImageAsBase64(src);
    } catch (fetchError) {
      console.warn('[PromptCapturer] Direct fetch failed (likely CORS), attempting canvas fallback...', fetchError);
    }

    // Second attempt: canvas draw fallback
    try {
      return await extractViaCanvas(imageTarget);
    } catch (canvasError) {
      console.error('[PromptCapturer] Canvas fallback failed:', canvasError);
      throw new Error("Couldn't capture this image — try right-click > Save Image and import manually");
    }
  }

  // ==========================================
  // CLICK EVENT INTERCEPTOR
  // ==========================================
  /**
   * Intercepts clicks to pair armed prompt with clicked image.
   */
  async function handleClick(event) {
    const target = event.target;
    if (!target) return;

    // Ignore clicks inside our own extension UI elements
    if (target.closest && target.closest('#__pic_host_container')) {
      return;
    }

    // Detect if clicked element is an image
    const imageTarget = detectImageTarget(target);
    if (!imageTarget) {
      // Not an image click, let regular user interaction proceed untouched
      return;
    }

    // Debounce check: Prevent accidental rapid double-clicks (500ms window)
    const now = Date.now();
    if (now - lastSavedTimestamp < 500 && (lastSavedElement === target || lastSavedElement === imageTarget.element)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // RULE 4: User clicks image WITHOUT copying a prompt first
    if (!armedPrompt || !armedPrompt.trim()) {
      event.preventDefault();
      event.stopPropagation();
      showToast('No prompt copied yet — copy the prompt text first', 'warning');
      return;
    }

    // RULE 3: User clicks image WITH an armed prompt
    const promptToSave = armedPrompt; // snapshot exact text
    
    // Prevent default navigation if image was wrapped in a link
    if (target.closest('a')) {
      event.preventDefault();
    }

    try {
      // Extract full-resolution image
      const imageFull = await extractFullImage(imageTarget);

      // Generate fast compressed thumbnail for popup list view
      const imageThumb = await generateThumbnail(imageFull);

      // Construct paired record schema
      const record = {
        id: crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2)),
        prompt: promptToSave, // Exact copied text, untouched/unmodified
        imageFull: imageFull,
        imageThumb: imageThumb,
        timestamp: new Date().toISOString(),
        sourceUrl: window.location.href
      };

      // Persist to centralized IndexedDB via background service worker
      chrome.runtime.sendMessage({ action: 'SAVE_RECORD', record }, (response) => {
        if (chrome.runtime.lastError || (response && !response.success)) {
          const errMsg = chrome.runtime.lastError ? chrome.runtime.lastError.message : response?.error;
          console.error('[PromptCapturer] Failed to save record:', errMsg);
          showToast('Failed to save record: ' + (errMsg || 'Storage error'), 'error');
          return;
        }

        // Successfully saved!
        lastSavedTimestamp = Date.now();
        lastSavedElement = imageTarget.element;

        // Disarm state immediately to require a fresh copy before next image click
        disarm();

        // Show confirmation toast
        showToast('Saved ✓', 'success');
      });

    } catch (err) {
      console.error('[PromptCapturer] Image extraction failed:', err);
      showToast(err.message || "Couldn't capture this image — try right-click > Save Image and import manually", 'error', 4500);
    }
  }

  // Register click listener on window in capture phase to reliably intercept dynamic SPA elements
  window.addEventListener('click', handleClick, true);

  console.log('[Prompt & Image Pair Capturer] Content script active and listening for copy -> click pairs.');
})();
