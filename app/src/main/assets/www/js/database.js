(function () {
  "use strict";

  const DB_NAME = "ndrow_ojol_v2";
  const DB_VERSION = 1;

  let dbPromise = null;

  function open() {
    if (!("indexedDB" in window)) {
      return Promise.reject(
        new Error("Database lokal tidak didukung browser ini.")
      );
    }

    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function () {
        const db = request.result;

        if (!db.objectStoreNames.contains("transactions")) {
          const store = db.createObjectStore("transactions", {
            keyPath: "id"
          });
          store.createIndex("date", "date", { unique: false });
          store.createIndex("type", "type", { unique: false });
        }

        if (!db.objectStoreNames.contains("debts")) {
          db.createObjectStore("debts", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("services")) {
          db.createObjectStore("services", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      };

      request.onsuccess = function () {
        const db = request.result;
        db.onversionchange = function () {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = function () {
        dbPromise = null;
        reject(request.error || new Error("Gagal membuka database."));
      };

      request.onblocked = function () {
        console.warn("Database menunggu tab aplikasi lain ditutup.");
      };
    });

    return dbPromise;
  }

  function run(storeName, mode, action) {
    return open().then(db => new Promise((resolve, reject) => {
      let transaction;

      try {
        transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = action(store);

        request.onsuccess = function () {
          resolve(request.result);
        };

        request.onerror = function () {
          reject(request.error || new Error("Operasi database gagal."));
        };

        transaction.onabort = function () {
          reject(transaction.error || new Error("Transaksi database dibatalkan."));
        };
      } catch (error) {
        reject(error);
      }
    }));
  }

  const api = {
    open,

    add(store, value) {
      return run(store, "readwrite", s => s.add(value));
    },

    put(store, value) {
      return run(store, "readwrite", s => s.put(value));
    },

    get(store, id) {
      return run(store, "readonly", s => s.get(id));
    },

    getAll(store) {
      return run(store, "readonly", s => s.getAll());
    },

    remove(store, id) {
      return run(store, "readwrite", s => s.delete(id));
    },

    clear(store) {
      return run(store, "readwrite", s => s.clear());
    },

    async testDatabase() {
      const db = await open();
      return {
        success: true,
        name: db.name,
        stores: Array.from(db.objectStoreNames)
      };
    }
  };

  window.NDROW_DB = api;
})();
