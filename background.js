/**
 * background.js - Service Worker for Prompt & Image Pair Capturer Extension
 * 
 * Manages centralized IndexedDB storage across all tabs and origins,
 * keeps the extension action badge updated with the current captured count,
 * and handles message passing between content scripts and popup UI.
 */

// Import shared IndexedDB storage wrapper
importScripts('storage.js');

/**
 * Updates the extension icon badge text with the current count of captured records.
 */
async function updateBadgeCount() {
  try {
    const count = await PromptStorage.getRecordCount();
    const badgeText = count > 0 ? (count > 999 ? '999+' : String(count)) : '';
    await chrome.action.setBadgeText({ text: badgeText });
    await chrome.action.setBadgeBackgroundColor({ color: '#2563EB' }); // Professional indigo/blue
  } catch (err) {
    console.error('[PromptCapturer Background] Error updating badge count:', err);
  }
}

// Update badge count when the service worker initializes or extension is installed
chrome.runtime.onInstalled.addListener(() => {
  updateBadgeCount();
});

chrome.runtime.onStartup.addListener(() => {
  updateBadgeCount();
});

/**
 * Global message router for background operations.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) {
    return false;
  }

  // Handle asynchronous operations
  (async () => {
    try {
      switch (message.action) {
        case 'SAVE_RECORD': {
          const recordId = await PromptStorage.saveRecord(message.record);
          await updateBadgeCount();
          sendResponse({ success: true, id: recordId });
          break;
        }

        case 'GET_RECORDS': {
          const records = await PromptStorage.getAllRecords();
          sendResponse({ success: true, records });
          break;
        }

        case 'GET_COUNT': {
          const count = await PromptStorage.getRecordCount();
          sendResponse({ success: true, count });
          break;
        }

        case 'DELETE_RECORD': {
          await PromptStorage.deleteRecord(message.id);
          await updateBadgeCount();
          sendResponse({ success: true });
          break;
        }

        case 'CLEAR_ALL': {
          await PromptStorage.clearAllRecords();
          await updateBadgeCount();
          sendResponse({ success: true });
          break;
        }

        case 'UPDATE_BADGE': {
          await updateBadgeCount();
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: `Unknown action: ${message.action}` });
      }
    } catch (error) {
      console.error(`[PromptCapturer Background] Error handling action ${message.action}:`, error);
      sendResponse({ success: false, error: error.message || 'Internal error' });
    }
  })();

  // Return true to indicate asynchronous response
  return true;
});
