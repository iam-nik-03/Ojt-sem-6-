import { Request, Response } from "express";
import { googleDriveService } from "../services/googleDriveService";
import { courseStorageService } from "../storage/courseStorage";
import { v4 as uuidv4 } from "uuid";

let importing = false;

export const importController = {
  importFromDrive: async (req: Request, res: Response) => {
    if (importing) {
      return res.status(429).json({ error: "An import is already in progress." });
    }

    const { driveLink } = req.body;

    if (!driveLink) {
      return res.status(400).json({ error: "Missing drive link" });
    }

    const tokensStr = req.cookies.google_tokens;
    if (!tokensStr) {
      return res.status(401).json({ error: "Google Drive not connected" });
    }
    const tokens = JSON.parse(tokensStr);

    const folderId = googleDriveService.extractFolderId(driveLink);
    if (!folderId) {
      return res.status(400).json({ error: "Invalid Google Drive folder URL or ID" });
    }

    importing = true;

    try {
      const metadata = await googleDriveService.getFolderMetadata(folderId, tokens);
      const scanResults = await googleDriveService.scanFolder(folderId, tokens);

      if (scanResults.length === 0) {
        return res.status(404).json({ error: "No video or PDF files found" });
      }

      const courseStructure = googleDriveService.convertToCourseStructure(metadata.name || "Imported Course", scanResults);
      const savedCourse = courseStorageService.saveCourse(courseStructure, "drive");

      res.json(savedCourse);
    } catch (error: any) {
      console.error("Drive import error:", error);
      res.status(500).json({ error: error.message || "Google API failure" });
    } finally {
      importing = false;
    }
  },

  saveCourse: async (req: Request, res: Response) => {
    try {
      const courseData = req.body;
      const savedCourse = courseStorageService.saveCourse(courseData, courseData.sourceType || "local");
      res.json(savedCourse);
    } catch (error: any) {
      console.error("Save course error:", error);
      res.status(500).json({ error: error.message || "Failed to save course on server" });
    }
  },

  getCourse: async (req: Request, res: Response) => {
    try {
      const courseId = req.params.courseId as string;
      const course = courseStorageService.getCourse(courseId);

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      // Only re-sync Google Drive courses
      if (course.type !== "drive" || !course.driveFolderId) {
        return res.json(course);
      }

      // Check cache (5 minutes)
      const now = new Date();
      const lastSync = course.lastSyncTime ? new Date(course.lastSyncTime) : new Date(0);
      const diffMs = now.getTime() - lastSync.getTime();
      const diffMins = diffMs / (1000 * 60);

      if (diffMins < 5) {
        return res.json(course);
      }

      // Re-sync with Google Drive
      const tokensStr = req.cookies.google_tokens;
      if (!tokensStr) {
        return res.json(course);
      }
      const tokens = JSON.parse(tokensStr);

      console.log(`Re-syncing course ${courseId} from Google Drive...`);
      
      const metadata = await googleDriveService.getFolderMetadata(course.driveFolderId, tokens);
      const scanResults = await googleDriveService.scanFolder(course.driveFolderId, tokens);
      const newStructure = googleDriveService.convertToCourseStructure(metadata.name || course.title, scanResults);

      const updatedModules = [...course.modules];
      const updatedLessons = [...course.lessons];
      let hasChanges = false;

      newStructure.modules.forEach((newMod: any) => {
        let existingMod = updatedModules.find(m => m.title === newMod.moduleName);
        
        if (!existingMod) {
          existingMod = {
            id: uuidv4(),
            courseId: course.id,
            title: newMod.moduleName,
            orderIndex: updatedModules.length
          };
          updatedModules.push(existingMod);
          hasChanges = true;
        }

        newMod.lessons.forEach((newLesson: any) => {
          const exists = updatedLessons.find(l => l.drive_id === newLesson.drive_id);
          if (!exists) {
            updatedLessons.push({
              id: uuidv4(),
              moduleId: existingMod!.id,
              courseId: course.id,
              title: newLesson.lessonName,
              orderIndex: updatedLessons.filter(l => l.moduleId === existingMod!.id).length,
              drive_id: newLesson.drive_id,
              type: newLesson.type
            });
            hasChanges = true;
          }
        });
      });

      if (hasChanges) {
        const saved = courseStorageService.saveCourse({
          ...course,
          modules: updatedModules,
          lessons: updatedLessons,
          lastSyncTime: new Date().toISOString()
        }, "drive");
        return res.json(saved.course);
      } else {
        // Update sync time even if no changes
        course.lastSyncTime = new Date().toISOString();
        return res.json(course);
      }
    } catch (error: any) {
      console.error("Course re-sync error:", error);
      // Return cached version on error to avoid breaking the player
      const course = courseStorageService.getCourse(req.params.courseId as string);
      res.json(course);
    }
  },
};
