/**
 * storage.js - IndexedDB Storage Manager for Prompt & Image Pair Capturer Extension
 * 
 * Provides a robust, promise-based API around IndexedDB for storing paired records.
 * 
 * Each record schema:
 * {
 *   id: string (UUID v4),
 *   prompt: string (exact copied text, untouched/unmodified),
 *   imageFull: string (base64 data URL, full resolution/original quality),
 *   imageThumb: string (base64 data URL, compressed ~200px JPEG thumbnail),
 *   timestamp: string (ISO 8601 date string),
 *   sourceUrl: string (URL where the capture occurred)
 * }
 */

const DB_NAME = 'PromptImageCapturerDB';
const DB_VERSION = 1;
const STORE_NAME = 'paired_records';

/**
 * Opens and initializes the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Index by timestamp for chronological sorting (newest first)
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('[PromptCapturer Storage] Failed to open IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Saves a new paired record to IndexedDB.
 * @param {Object} record - The paired record object
 * @returns {Promise<string>} The record ID
 */
async function saveRecord(record) {
  if (!record || !record.id || !record.prompt || !record.imageFull) {
    throw new Error('Invalid record: id, prompt, and imageFull are required.');
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => {
      resolve(record.id);
    };

    request.onerror = (event) => {
      console.error('[PromptCapturer Storage] Failed to save record:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Retrieves all stored paired records, sorted newest first.
 * @returns {Promise<Array<Object>>}
 */
async function getAllRecords() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    
    // Open cursor in descending order (newest first)
    const records = [];
    const request = index.openCursor(null, 'prev');

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        records.push(cursor.value);
        cursor.continue();
      } else {
        resolve(records);
      }
    };

    request.onerror = (event) => {
      console.error('[PromptCapturer Storage] Failed to retrieve records:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Retrieves the count of captured records.
 * @returns {Promise<number>}
 */
async function getRecordCount() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error('[PromptCapturer Storage] Failed to get count:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Deletes a single record by its ID.
 * @param {string} id - The record UUID
 * @returns {Promise<boolean>}
 */
async function deleteRecord(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = (event) => {
      console.error('[PromptCapturer Storage] Failed to delete record:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Clears all records from IndexedDB.
 * @returns {Promise<boolean>}
 */
async function clearAllRecords() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve(true);
    };

    request.onerror = (event) => {
      console.error('[PromptCapturer Storage] Failed to clear records:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Export for ES modules and attach to global scope for standard script tags
if (typeof self !== 'undefined') {
  self.PromptStorage = {
    openDB,
    saveRecord,
    getAllRecords,
    getRecordCount,
    deleteRecord,
    clearAllRecords
  };
}
