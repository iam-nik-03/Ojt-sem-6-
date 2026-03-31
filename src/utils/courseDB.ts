import { openDB, IDBPDatabase } from 'idb';
import { Course, Lesson, Module, Progress, Note, Bookmark } from '../types';
import { api } from './api';

const DB_NAME = 'skillstudio_metadata';
const VERSION = 1;

const STORES = {
  COURSES: 'courses',
  MODULES: 'modules',
  LESSONS: 'lessons',
  PROGRESS: 'progress',
  NOTES: 'notes',
  BOOKMARKS: 'bookmarks',
};

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.COURSES)) {
          db.createObjectStore(STORES.COURSES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.MODULES)) {
          const store = db.createObjectStore(STORES.MODULES, { keyPath: 'id' });
          store.createIndex('courseId', 'courseId');
        }
        if (!db.objectStoreNames.contains(STORES.LESSONS)) {
          const store = db.createObjectStore(STORES.LESSONS, { keyPath: 'id' });
          store.createIndex('courseId', 'courseId');
          store.createIndex('moduleId', 'moduleId');
        }
        if (!db.objectStoreNames.contains(STORES.PROGRESS)) {
          const store = db.createObjectStore(STORES.PROGRESS, { keyPath: 'lessonId' });
          store.createIndex('courseId', 'courseId');
        }
        if (!db.objectStoreNames.contains(STORES.NOTES)) {
          const store = db.createObjectStore(STORES.NOTES, { keyPath: 'id' });
          store.createIndex('courseId', 'courseId');
          store.createIndex('lessonId', 'lessonId');
        }
        if (!db.objectStoreNames.contains(STORES.BOOKMARKS)) {
          const store = db.createObjectStore(STORES.BOOKMARKS, { keyPath: 'lessonId' });
          store.createIndex('courseId', 'courseId');
        }
      },
    });
  }
  return dbPromise;
}

// Course Operations
export async function getCourses(): Promise<Course[]> {
  const db = await getDB();
  const courses = await db.getAll(STORES.COURSES);
  return courses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getCoursesWithDetails(): Promise<Course[]> {
  const db = await getDB();
  const courses = await db.getAll(STORES.COURSES);
  
  // Fetch all related data in parallel for bulk optimization
  const [allModules, allLessons, allProgress, allBookmarks] = await Promise.all([
    db.getAll(STORES.MODULES),
    db.getAll(STORES.LESSONS),
    db.getAll(STORES.PROGRESS),
    db.getAll(STORES.BOOKMARKS)
  ]);

  // Group data by courseId for efficient mapping
  const modulesMap = allModules.reduce((acc: any, item: any) => {
    if (!acc[item.courseId]) acc[item.courseId] = [];
    acc[item.courseId].push(item);
    return acc;
  }, {});

  const lessonsMap = allLessons.reduce((acc: any, item: any) => {
    if (!acc[item.courseId]) acc[item.courseId] = [];
    acc[item.courseId].push(item);
    return acc;
  }, {});

  const progressMap = allProgress.reduce((acc: any, item: any) => {
    if (!acc[item.courseId]) acc[item.courseId] = [];
    acc[item.courseId].push(item);
    return acc;
  }, {});

  const bookmarksMap = allBookmarks.reduce((acc: any, item: any) => {
    if (!acc[item.courseId]) acc[item.courseId] = [];
    acc[item.courseId].push(item);
    return acc;
  }, {});

  return courses.map(c => ({
    ...c,
    modules: modulesMap[c.id] || [],
    lessons: lessonsMap[c.id] || [],
    progress: progressMap[c.id] || [],
    bookmarks: bookmarksMap[c.id] || []
  })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getCourseDetail(id: string) {
  const db = await getDB();
  const course = await db.get(STORES.COURSES, id);
  if (!course) return null;

  const [modules, lessons, progress, bookmarks] = await Promise.all([
    db.getAllFromIndex(STORES.MODULES, 'courseId', id),
    db.getAllFromIndex(STORES.LESSONS, 'courseId', id),
    db.getAllFromIndex(STORES.PROGRESS, 'courseId', id),
    db.getAllFromIndex(STORES.BOOKMARKS, 'courseId', id)
  ]);

  return { ...course, modules, lessons, progress, bookmarks };
}

export async function syncCourseWithBackend(id: string) {
  try {
    const { data: refreshedCourse, error } = await api.get<any>(`/api/import/get-course/${id}`);
    if (error) return null;
    
    if (refreshedCourse) {
      await saveCourse(refreshedCourse);
      return await getCourseDetail(id);
    }
  } catch (err) {
    console.error("Failed to sync course with backend", err);
  }
  return null;
}

export async function saveCourse(courseData: any) {
  const db = await getDB();
  const tx = db.transaction([STORES.COURSES, STORES.MODULES, STORES.LESSONS], 'readwrite');
  
  const { id, title, sourceType, path, modules, lessons, createdAt, thumbnail, rootFolderId, driveFolderId, lastSyncTime } = courseData;
  
  await tx.objectStore(STORES.COURSES).put({ 
    id, title, sourceType, path, thumbnail, 
    rootFolderId: rootFolderId || driveFolderId, 
    driveFolderId: driveFolderId || rootFolderId,
    lastSyncTime,
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  if (modules) {
    for (const mod of modules) {
      await tx.objectStore(STORES.MODULES).put({ ...mod, courseId: id });
    }
  }

  if (lessons) {
    for (const lesson of lessons) {
      await tx.objectStore(STORES.LESSONS).put({ ...lesson, courseId: id });
    }
  }

  await tx.done;

  // Sync with backend for streaming proxy
  try {
    await api.post('/api/import/save-course', courseData);
  } catch (err) {
    console.error("Failed to sync course with backend", err);
  }
}

export async function addModule(courseId: string, module: Module) {
  const db = await getDB();
  await db.put(STORES.MODULES, { ...module, courseId });
}

export async function addLesson(courseId: string, lesson: Lesson) {
  const db = await getDB();
  await db.put(STORES.LESSONS, { ...lesson, courseId });
}

export async function updateLesson(id: string, updates: Partial<Lesson>) {
  const db = await getDB();
  const lesson = await db.get(STORES.LESSONS, id);
  if (lesson) {
    await db.put(STORES.LESSONS, { ...lesson, ...updates });
  }
}

export async function deleteLesson(id: string) {
  const db = await getDB();
  await db.delete(STORES.LESSONS, id);
  await db.delete(STORES.PROGRESS, id);
  await db.delete(STORES.BOOKMARKS, id);
}

export async function updateModule(id: string, updates: Partial<Module>) {
  const db = await getDB();
  const mod = await db.get(STORES.MODULES, id);
  if (mod) {
    await db.put(STORES.MODULES, { ...mod, ...updates });
  }
}

export async function deleteModule(id: string) {
  const db = await getDB();
  const tx = db.transaction([STORES.MODULES, STORES.LESSONS, STORES.PROGRESS], 'readwrite');
  
  // Delete module
  await tx.objectStore(STORES.MODULES).delete(id);
  
  // Delete lessons in this module
  const lessons = await tx.objectStore(STORES.LESSONS).index('moduleId').getAllKeys(id);
  for (const key of lessons) {
    await tx.objectStore(STORES.LESSONS).delete(key);
    // Also delete progress for these lessons
    await tx.objectStore(STORES.PROGRESS).delete(key);
  }
  
  await tx.done;
}

export async function updateCourse(id: string, updates: Partial<Course>) {
  const db = await getDB();
  const course = await db.get(STORES.COURSES, id);
  if (course) {
    await db.put(STORES.COURSES, { ...course, ...updates });
  }
}

export async function deleteCourse(id: string) {
  const db = await getDB();
  const tx = db.transaction(Object.values(STORES), 'readwrite');
  
  // Delete course
  await tx.objectStore(STORES.COURSES).delete(id);
  
  // Delete related data
  const modules = await tx.objectStore(STORES.MODULES).index('courseId').getAllKeys(id);
  for (const key of modules) await tx.objectStore(STORES.MODULES).delete(key);
  
  const lessons = await tx.objectStore(STORES.LESSONS).index('courseId').getAllKeys(id);
  for (const key of lessons) await tx.objectStore(STORES.LESSONS).delete(key);
  
  const progress = await tx.objectStore(STORES.PROGRESS).index('courseId').getAllKeys(id);
  for (const key of progress) await tx.objectStore(STORES.PROGRESS).delete(key);
  
  const notes = await tx.objectStore(STORES.NOTES).index('courseId').getAllKeys(id);
  for (const key of notes) await tx.objectStore(STORES.NOTES).delete(key);
  
  const bookmarks = await tx.objectStore(STORES.BOOKMARKS).index('courseId').getAllKeys(id);
  for (const key of bookmarks) await tx.objectStore(STORES.BOOKMARKS).delete(key);

  await tx.done;
}

// Progress Operations
export async function saveProgress(progress: Progress) {
  const db = await getDB();
  await db.put(STORES.PROGRESS, {
    ...progress,
    updatedAt: new Date().toISOString()
  });
}

// Note Operations
export async function getNotes(courseId: string): Promise<Note[]> {
  const db = await getDB();
  const notes = await db.getAllFromIndex(STORES.NOTES, 'courseId', courseId);
  return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveNote(note: Note) {
  const db = await getDB();
  await db.put(STORES.NOTES, {
    ...note,
    createdAt: note.createdAt || new Date().toISOString()
  });
}

export async function deleteNote(id: string) {
  const db = await getDB();
  await db.delete(STORES.NOTES, id);
}

// Bookmark Operations
export async function toggleBookmark(lessonId: string, courseId: string) {
  const db = await getDB();
  const exists = await db.get(STORES.BOOKMARKS, lessonId);
  if (exists) {
    await db.delete(STORES.BOOKMARKS, lessonId);
    return false;
  } else {
    await db.put(STORES.BOOKMARKS, {
      lessonId,
      courseId,
      createdAt: new Date().toISOString()
    });
    return true;
  }
}
