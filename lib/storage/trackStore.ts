export interface StoredTrack {
  id: string;
  name: string;
  createdAt: number;
  duration: number;
  blob: Blob;
}

const DB_NAME = 'vault-voice-recorder';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async <T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const listTracks = () => withStore('readonly', store => store.getAll());

export const saveTrack = async (track: Omit<StoredTrack, 'id'>) => {
  const newTrack: StoredTrack = {
    ...track,
    id: crypto.randomUUID(),
  };

  await withStore('readwrite', store => store.add(newTrack));
  return newTrack;
};

export const deleteTrack = (id: string) =>
  withStore('readwrite', store => store.delete(id));
