// dbHelper.js - IndexedDB wrapper for storing email data
// Provides much higher storage capacity than chrome.storage.local (~10MB vs 50-100MB+)

const DB_NAME = "ExpositionAutomatorDB";
const DB_VERSION = 1;
const STORE_NAME = "emails";

class DBHelper {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize/open the IndexedDB database
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("IndexedDB failed to open:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("✅ IndexedDB opened successfully");
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        console.log("Creating/upgrading IndexedDB schema...");
        const db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
          });

          // Create indexes for searching
          objectStore.createIndex("senderEmail", "senderEmail", {
            unique: false,
          });
          objectStore.createIndex("date", "date", { unique: false });

          console.log("✅ Object store created:", STORE_NAME);
        }
      };
    });
  }

  /**
   * Add or update an email entry
   */
  async saveEmail(emailData) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(emailData); // put = add or update

      request.onsuccess = () => {
        console.log("✅ Email saved to IndexedDB:", emailData.id);
        resolve(emailData.id);
      };

      request.onerror = () => {
        console.error("❌ Failed to save email:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a specific email by ID
   */
  async getEmail(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error("❌ Failed to get email:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all emails
   */
  async getAllEmails() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const emails = request.result || [];
        console.log(`📧 Retrieved ${emails.length} emails from IndexedDB`);
        resolve(emails);
      };

      request.onerror = () => {
        console.error("❌ Failed to get all emails:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update an existing email
   */
  async updateEmail(id, updates) {
    if (!this.db) await this.init();

    const email = await this.getEmail(id);
    if (!email) {
      throw new Error(`Email with id ${id} not found`);
    }

    const updatedEmail = { ...email, ...updates };
    return this.saveEmail(updatedEmail);
  }

  /**
   * Delete a specific email by ID
   */
  async deleteEmail(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log("✅ Email deleted:", id);
        resolve(true);
      };

      request.onerror = () => {
        console.error("❌ Failed to delete email:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all emails from the database
   */
  async clearAllEmails() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log("✅ All emails cleared from IndexedDB");
        resolve(true);
      };

      request.onerror = () => {
        console.error("❌ Failed to clear emails:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Count total emails
   */
  async countEmails() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error("❌ Failed to count emails:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get storage size estimate (approximate)
   */
  async getStorageEstimate() {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usageInMB = (estimate.usage / (1024 * 1024)).toFixed(2);
      const quotaInMB = (estimate.quota / (1024 * 1024)).toFixed(2);
      console.log(
        `📊 Storage: ${usageInMB}MB used of ${quotaInMB}MB quota`,
      );
      return { usage: estimate.usage, quota: estimate.quota, usageInMB, quotaInMB };
    }
    return null;
  }
}

// Create singleton instance
const dbHelper = new DBHelper();

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = dbHelper;
} else {
  window.dbHelper = dbHelper;
}
