/**
 * popup.js - Controller for Extension Popup
 * 
 * Manages record rendering, filtering, full-size preview modal,
 * JSON export, single item deletion, and clear all.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const countBadge = document.getElementById('countBadge');
  const btnExport = document.getElementById('btnExport');
  const btnClear = document.getElementById('btnClear');
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const recordsList = document.getElementById('recordsList');
  const emptyState = document.getElementById('emptyState');

  // Preview Modal Elements
  const previewModal = document.getElementById('previewModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalFullImage = document.getElementById('modalFullImage');
  const modalFullPrompt = document.getElementById('modalFullPrompt');
  const modalCopyPromptBtn = document.getElementById('modalCopyPromptBtn');
  const modalTimestamp = document.getElementById('modalTimestamp');
  const modalSourceLink = document.getElementById('modalSourceLink');

  // Clear Confirmation Modal Elements
  const confirmModal = document.getElementById('confirmModal');
  const btnCancelClear = document.getElementById('btnCancelClear');
  const btnConfirmClear = document.getElementById('btnConfirmClear');

  // State
  let cachedRecords = [];

  /**
   * Formats ISO timestamp to human-friendly string.
   */
  function formatTimestamp(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  }

  /**
   * Renders the list of records based on current filter.
   */
  function renderRecords(recordsToRender) {
    recordsList.innerHTML = '';

    if (!recordsToRender || recordsToRender.length === 0) {
      recordsList.style.display = 'none';
      emptyState.style.display = 'flex';
      btnExport.disabled = true;
      btnClear.disabled = true;
      return;
    }

    recordsList.style.display = 'flex';
    emptyState.style.display = 'none';
    btnExport.disabled = false;
    btnClear.disabled = false;

    recordsToRender.forEach((record) => {
      const card = document.createElement('div');
      card.className = 'record-card';

      // Thumbnail Container
      const thumbContainer = document.createElement('div');
      thumbContainer.className = 'record-thumb-container';

      const thumbImg = document.createElement('img');
      thumbImg.className = 'record-thumb';
      thumbImg.src = record.imageThumb || record.imageFull;
      thumbImg.alt = 'Thumbnail';
      thumbContainer.appendChild(thumbImg);

      // Info Section
      const info = document.createElement('div');
      info.className = 'record-info';

      const promptEl = document.createElement('div');
      promptEl.className = 'record-prompt';
      promptEl.textContent = record.prompt;

      const metaEl = document.createElement('div');
      metaEl.className = 'record-meta';

      const timeSpan = document.createElement('span');
      timeSpan.textContent = formatTimestamp(record.timestamp);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete-card';
      deleteBtn.title = 'Delete this record';
      deleteBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      `;

      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // prevent opening preview modal
        await handleDeleteRecord(record.id);
      });

      metaEl.appendChild(timeSpan);
      metaEl.appendChild(deleteBtn);

      info.appendChild(promptEl);
      info.appendChild(metaEl);

      card.appendChild(thumbContainer);
      card.appendChild(info);

      // Click card to open full-size modal
      card.addEventListener('click', () => {
        openPreviewModal(record);
      });

      recordsList.appendChild(card);
    });
  }

  /**
   * Updates badge and record counts.
   */
  function updateHeaderCount(count) {
    countBadge.textContent = count === 1 ? '1 pair' : `${count} pairs`;
  }

  /**
   * Loads all records from storage and refreshes UI.
   */
  async function loadRecords() {
    try {
      cachedRecords = await PromptStorage.getAllRecords();
      updateHeaderCount(cachedRecords.length);
      filterAndRender();
    } catch (err) {
      console.error('[Popup] Failed to load records:', err);
    }
  }

  /**
   * Filters cached records based on search input.
   */
  function filterAndRender() {
    const query = searchInput.value.trim().toLowerCase();
    searchClearBtn.style.display = query ? 'block' : 'none';

    if (!query) {
      renderRecords(cachedRecords);
      return;
    }

    const filtered = cachedRecords.filter((r) => r.prompt.toLowerCase().includes(query));
    renderRecords(filtered);
  }

  /**
   * Handles deletion of a single record.
   */
  async function handleDeleteRecord(id) {
    try {
      await PromptStorage.deleteRecord(id);
      cachedRecords = cachedRecords.filter((r) => r.id !== id);
      updateHeaderCount(cachedRecords.length);
      filterAndRender();
      // Notify background to sync extension badge
      chrome.runtime.sendMessage({ action: 'UPDATE_BADGE' });
    } catch (err) {
      console.error('[Popup] Error deleting record:', err);
    }
  }

  /**
   * Opens the full-size preview modal.
   */
  function openPreviewModal(record) {
    modalFullImage.src = record.imageFull;
    modalFullPrompt.textContent = record.prompt;
    modalTimestamp.textContent = new Date(record.timestamp).toLocaleString();

    if (record.sourceUrl) {
      modalSourceLink.href = record.sourceUrl;
      modalSourceLink.style.display = 'inline';
    } else {
      modalSourceLink.style.display = 'none';
    }

    modalCopyPromptBtn.textContent = 'Copy';
    modalCopyPromptBtn.onclick = () => {
      navigator.clipboard.writeText(record.prompt).then(() => {
        modalCopyPromptBtn.textContent = 'Copied!';
        setTimeout(() => {
          modalCopyPromptBtn.textContent = 'Copy';
        }, 1500);
      });
    };

    previewModal.style.display = 'flex';
  }

  /**
   * Closes the preview modal.
   */
  function closePreviewModal() {
    previewModal.style.display = 'none';
    modalFullImage.src = '';
  }

  modalCloseBtn.addEventListener('click', closePreviewModal);
  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) closePreviewModal();
  });

  /**
   * Search input listeners.
   */
  searchInput.addEventListener('input', filterAndRender);
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterAndRender();
    searchInput.focus();
  });

  /**
   * Clear All confirmation handling.
   */
  btnClear.addEventListener('click', () => {
    if (cachedRecords.length > 0) {
      confirmModal.style.display = 'flex';
    }
  });

  btnCancelClear.addEventListener('click', () => {
    confirmModal.style.display = 'none';
  });

  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) confirmModal.style.display = 'none';
  });

  btnConfirmClear.addEventListener('click', async () => {
    try {
      await PromptStorage.clearAllRecords();
      cachedRecords = [];
      updateHeaderCount(0);
      renderRecords([]);
      confirmModal.style.display = 'none';
      chrome.runtime.sendMessage({ action: 'UPDATE_BADGE' });
    } catch (err) {
      console.error('[Popup] Error clearing records:', err);
    }
  });

  /**
   * Export All Records to a JSON file download.
   */
  btnExport.addEventListener('click', async () => {
    if (!cachedRecords || cachedRecords.length === 0) return;

    try {
      // Re-fetch newest records from storage to ensure complete serialization
      const recordsToExport = await PromptStorage.getAllRecords();

      const exportData = {
        exportedAt: new Date().toISOString(),
        totalRecords: recordsToExport.length,
        version: '1.0.0',
        records: recordsToExport
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const filename = `prompt-image-pairs-${dateStr}-${timeStr}.json`;

      // Convert to a data URL first: blob: URLs are unreliable with
      // chrome.downloads.download when initiated from a popup context.
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read export data.'));
        reader.readAsDataURL(blob);
      });

      // Use Chrome downloads API if available, fallback to anchor tag
      if (chrome.downloads && chrome.downloads.download) {
        chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: true
        });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('[Popup] Error exporting records:', err);
      alert('Export failed: ' + err.message);
    }
  });

  // Initial load
  await loadRecords();
});
