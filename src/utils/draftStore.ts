import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'course_draft_db';
const STORE_NAME = 'files';
const METADATA_KEY = 'course_draft_metadata';

export interface DraftMetadata {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  thumbnail: string | null;
  currentStep: number;
  lastSaved: number;
  modules: any[];
  lessons: any[];
}

class DraftStore {
  private db: Promise<IDBPDatabase>;

  constructor() {
    this.db = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    });
  }

  async saveFile(id: string, file: File) {
    const db = await this.db;
    await db.put(STORE_NAME, file, id);
  }

  async getFile(id: string): Promise<File | undefined> {
    const db = await this.db;
    return db.get(STORE_NAME, id);
  }

  async deleteFile(id: string) {
    const db = await this.db;
    await db.delete(STORE_NAME, id);
  }

  async clearFiles() {
    const db = await this.db;
    await db.clear(STORE_NAME);
  }

  saveMetadata(metadata: DraftMetadata) {
    localStorage.setItem(METADATA_KEY, JSON.stringify({
      ...metadata,
      lastSaved: Date.now()
    }));
  }

  getMetadata(): DraftMetadata | null {
    const data = localStorage.getItem(METADATA_KEY);
    return data ? JSON.parse(data) : null;
  }

  clearMetadata() {
    localStorage.removeItem(METADATA_KEY);
  }

  async clearAll() {
    this.clearMetadata();
    await this.clearFiles();
  }
}

export const draftStore = new DraftStore();
