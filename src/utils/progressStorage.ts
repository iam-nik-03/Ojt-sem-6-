interface LessonProgress {
  progress: number; // percentage 0-100
  completed: boolean;
  lastPosition: number; // timestamp in seconds
  updatedAt: string;
}

interface CourseProgressData {
  courseId: string;
  lessons: Record<string, LessonProgress>;
}

const STORAGE_PREFIX = 'course-progress-';

export const progressStorage = {
  saveLessonProgress: (courseId: string, lessonId: string, data: Partial<LessonProgress>) => {
    const key = `${STORAGE_PREFIX}${courseId}`;
    const existingRaw = localStorage.getItem(key);
    let courseData: CourseProgressData = existingRaw 
      ? JSON.parse(existingRaw) 
      : { courseId, lessons: {} };

    const currentLesson = courseData.lessons[lessonId] || {
      progress: 0,
      completed: false,
      lastPosition: 0,
      updatedAt: new Date().toISOString()
    };

    courseData.lessons[lessonId] = {
      ...currentLesson,
      ...data,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(key, JSON.stringify(courseData));
  },

  getCourseProgress: (courseId: string): CourseProgressData | null => {
    const key = `${STORAGE_PREFIX}${courseId}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },

  getLessonProgress: (courseId: string, lessonId: string): LessonProgress | null => {
    const courseData = progressStorage.getCourseProgress(courseId);
    return courseData?.lessons[lessonId] || null;
  },

  deleteCourseProgress: (courseId: string) => {
    localStorage.removeItem(`${STORAGE_PREFIX}${courseId}`);
  },

  deleteLessonProgress: (courseId: string, lessonId: string) => {
    const key = `${STORAGE_PREFIX}${courseId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const data: CourseProgressData = JSON.parse(raw);
      delete data.lessons[lessonId];
      localStorage.setItem(key, JSON.stringify(data));
    }
  }
};
