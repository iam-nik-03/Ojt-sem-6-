import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'lumina_files';
const STORE_NAME = 'files';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    });
  }
  return dbPromise;
}

export async function saveFile(lessonId: string, file: File) {
  const db = await getDB();
  await db.put(STORE_NAME, file, lessonId);
}

export async function getFileFromDB(lessonId: string): Promise<File | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, lessonId);
}

export async function deleteFile(lessonId: string) {
  const db = await getDB();
  await db.delete(STORE_NAME, lessonId);
}

export async function clearAllFiles() {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
