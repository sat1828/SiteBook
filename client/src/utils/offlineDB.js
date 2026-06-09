const DB_NAME = 'SiteBookOffline';
const DB_VERSION = 1;

let dbPromise = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('attendance')) {
          const store = db.createObjectStore('attendance', { keyPath: 'offlineId' });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('siteId', 'siteId', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('materials')) {
          db.createObjectStore('materials', { keyPath: 'offlineId' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
};

export const saveAttendanceOffline = async (records) => {
  const db = await getDB();
  const tx = db.transaction('attendance', 'readwrite');
  const store = tx.objectStore('attendance');

  const items = Array.isArray(records) ? records : [records];
  for (const item of items) {
    const record = {
      ...item,
      offlineId: item.offlineId || `off_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      synced: false,
      createdAt: new Date().toISOString(),
    };
    store.put(record);
  }

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  return items.length;
};

export const getUnsyncedAttendance = async () => {
  const db = await getDB();
  const tx = db.transaction('attendance', 'readonly');
  const store = tx.objectStore('attendance');
  const index = store.index('synced');
  const range = IDBKeyRange.only(false);

  return new Promise((resolve, reject) => {
    const results = [];
    const cursor = index.openCursor(range);

    cursor.onsuccess = (event) => {
      const cur = event.target.result;
      if (cur) {
        results.push(cur.value);
        cur.continue();
      } else {
        resolve(results);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
};

export const markAsSynced = async (offlineIds) => {
  const db = await getDB();
  const tx = db.transaction('attendance', 'readwrite');
  const store = tx.objectStore('attendance');

  const ids = Array.isArray(offlineIds) ? offlineIds : [offlineIds];
  for (const id of ids) {
    const record = await new Promise((resolve, reject) => {
      const get = store.get(id);
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    });
    if (record) {
      record.synced = true;
      store.put(record);
    }
  }

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
};

export const clearSyncedRecords = async () => {
  const db = await getDB();
  const tx = db.transaction('attendance', 'readwrite');
  const store = tx.objectStore('attendance');
  const index = store.index('synced');
  const range = IDBKeyRange.only(true);

  return new Promise((resolve, reject) => {
    const cursor = index.openCursor(range);
    let count = 0;

    cursor.onsuccess = (event) => {
      const cur = event.target.result;
      if (cur) {
        store.delete(cur.primaryKey);
        count++;
        cur.continue();
      } else {
        resolve(count);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
};

export const getPendingCount = async () => {
  const unsynced = await getUnsyncedAttendance();
  return unsynced.length;
};
