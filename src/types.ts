export interface Course {
  id: string;
  title: string;
  sourceType: 'local' | 'gdrive' | 'youtube';
  path?: string;
  thumbnail?: string;
  isPublic?: boolean;
  rootFolderId?: string; // For GDrive sync
  lastSyncTime?: string; // For GDrive sync
  createdAt: string;
  updatedAt: string;
  modules?: Module[];
  lessons?: Lesson[];
  progress?: Progress[];
  bookmarks?: Bookmark[];
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  type: 'video' | 'youtube' | 'pdf';
  fileName?: string; // For local matching
  file?: File; // Transient local file object
  drive_id?: string; // For Google Drive files
  youtubeId?: string; // For YouTube videos
  duration?: number; // Duration in seconds
  orderIndex: number;
}

export interface Progress {
  lessonId: string;
  courseId: string;
  completed: boolean;
  lastPosition: number;
  updatedAt: string;
}

export interface Note {
  id: string;
  courseId: string;
  lessonId: string;
  text: string;
  timestamp: number;
  createdAt: string;
}

export interface Bookmark {
  lessonId: string;
  courseId: string;
  createdAt: string;
}
