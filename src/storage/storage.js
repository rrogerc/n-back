const DB_NAME = 'nback-db';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';
const SETTINGS_STORE = 'settings';

/**
 * Storage class for persisting session history and settings using IndexedDB
 */
export class Storage {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize the database
   * @returns {Promise<void>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create sessions store
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          const sessionsStore = db.createObjectStore(SESSIONS_STORE, {
            keyPath: 'id',
            autoIncrement: true
          });
          sessionsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Save a completed session
   * @param {object} sessionData - Session data to save
   * @returns {Promise<number>} - Session ID
   */
  async saveSession(sessionData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SESSIONS_STORE], 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);

      const session = {
        ...sessionData,
        timestamp: Date.now()
      };

      const request = store.add(session);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get recent sessions
   * @param {number} limit - Maximum number of sessions to return
   * @returns {Promise<object[]>}
   */
  async getSessions(limit = 10) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SESSIONS_STORE], 'readonly');
      const store = transaction.objectStore(SESSIONS_STORE);
      const index = store.index('timestamp');

      const sessions = [];
      const request = index.openCursor(null, 'prev'); // Descending order

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && sessions.length < limit) {
          sessions.push(cursor.value);
          cursor.continue();
        } else {
          resolve(sessions);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get user settings
   * @returns {Promise<object>}
   */
  async getSettings() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SETTINGS_STORE], 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get('user-settings');

      request.onsuccess = () => {
        const saved = request.result?.value || {};
        resolve({ ...this.getDefaultSettings(), ...saved });
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save user settings
   * @param {object} settings - Settings to save
   * @returns {Promise<void>}
   */
  async saveSettings(settings) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SETTINGS_STORE], 'readwrite');
      const store = transaction.objectStore(SETTINGS_STORE);

      const request = store.put({
        key: 'user-settings',
        value: settings
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get the best (highest) n-back level achieved
   * @returns {Promise<number>}
   */
  async getBestLevel() {
    const sessions = await this.getSessions(100); // Get more sessions to find the best
    if (sessions.length === 0) {
      return 2; // Default starting level
    }

    let bestLevel = 1;
    for (const session of sessions) {
      if (session.n > bestLevel) {
        bestLevel = session.n;
      }
    }
    return bestLevel;
  }

  /**
   * Get the last played n-back level
   * @returns {Promise<number>}
   */
  async getLastLevel() {
    const sessions = await this.getSessions(1);
    if (sessions.length === 0) {
      return 2; // Default starting level
    }
    return sessions[0].nextLevel || sessions[0].n;
  }

  /**
   * Get default settings
   * @returns {object}
   */
  getDefaultSettings() {
    return {
      currentN: 2,
      soundEnabled: true,
      vibrationEnabled: true,
      feedbackSoundsEnabled: true,
      adaptiveDifficulty: true
    };
  }
}

// Export singleton instance
export const storage = new Storage();
