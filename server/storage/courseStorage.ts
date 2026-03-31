import { v4 as uuidv4 } from "uuid";

export interface Course {
  id: string;
  title: string;
  type: string;
  path?: string;
  driveFolderId?: string;
  lastSyncTime?: string;
  modules: Module[];
  lessons: Lesson[];
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
  videoUrl?: string;
  fileName?: string;
  orderIndex: number;
  drive_id?: string;
  type?: string;
}

// In-memory storage
const courses: Course[] = [];

export const courseStorageService = {
  saveCourse: (courseData: any, type: string) => {
    const courseId = courseData.id || uuidv4();
    
    // Check if course already exists
    const existingIndex = courses.findIndex(c => c.id === courseId);
    if (existingIndex !== -1) {
      courses.splice(existingIndex, 1);
    }

    const { id, title, sourceType, path, modules, lessons, rootFolderId, lastSyncTime } = courseData;
    
    const newCourse: Course = {
      id: courseId,
      title: title || courseData.courseName,
      type: type || sourceType,
      path: path || null,
      driveFolderId: rootFolderId || courseData.driveFolderId,
      lastSyncTime: lastSyncTime || new Date().toISOString(),
      modules: [],
      lessons: []
    };

    courseData.modules.forEach((mod: any, modIdx: number) => {
      const moduleId = mod.id || uuidv4();
      newCourse.modules.push({
        id: moduleId,
        courseId,
        title: mod.title || mod.moduleName,
        orderIndex: mod.orderIndex !== undefined ? mod.orderIndex : modIdx
      });
      
      const lessons = mod.lessons || courseData.lessons?.filter((l: any) => l.moduleId === mod.id) || [];
      lessons.forEach((lesson: any, lessonIdx: number) => {
        const lessonId = lesson.id || uuidv4();
        newCourse.lessons.push({
          id: lessonId,
          moduleId,
          courseId,
          title: lesson.title || lesson.lessonName,
          videoUrl: lesson.videoUrl || null,
          fileName: lesson.fileName || null,
          orderIndex: lesson.orderIndex !== undefined ? lesson.orderIndex : lessonIdx,
          drive_id: lesson.drive_id || lesson.gdriveId || null,
          type: lesson.type || (lesson.fileName?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'video')
        });
      });
    });

    // If lessons are not nested in modules, add them
    if (courseData.lessons && newCourse.lessons.length === 0) {
      courseData.lessons.forEach((lesson: any, lessonIdx: number) => {
        const lessonId = lesson.id || uuidv4();
        newCourse.lessons.push({
          id: lessonId,
          moduleId: lesson.moduleId || "",
          courseId,
          title: lesson.title || lesson.lessonName,
          videoUrl: lesson.videoUrl || null,
          fileName: lesson.fileName || null,
          orderIndex: lesson.orderIndex !== undefined ? lesson.orderIndex : lessonIdx,
          drive_id: lesson.drive_id || lesson.gdriveId || null,
          type: lesson.type || (lesson.fileName?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'video')
        });
      });
    }

    courses.push(newCourse);
    
    return {
      courseId,
      course: newCourse
    };
  },

  getCourse: (id: string) => {
    return courses.find(c => c.id === id) || null;
  },

  getLesson: (courseId: string, lessonId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return null;
    return course.lessons.find(l => l.id === lessonId) || null;
  },

  getAllCourses: () => {
    return courses;
  }
};
