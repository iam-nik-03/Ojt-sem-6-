import { Request, Response } from "express";
import { courseStorageService } from "../storage/courseStorage";
import { googleDriveService } from "../services/googleDriveService";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

export const streamController = {
  streamLesson: async (req: Request, res: Response) => {
    const { courseId, lessonId } = req.params as { courseId: string; lessonId: string };

    try {
      const lesson = courseStorageService.getLesson(courseId, lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      if (lesson.drive_id) {
        const apiKey = process.env.VITE_GOOGLE_DRIVE_API_KEY;
        if (!apiKey) {
          console.error("Google Drive API key is missing in environment variables");
          return res.status(500).json({ error: "Server configuration error: Google Drive API key is missing" });
        }

        const driveUrl = `https://www.googleapis.com/drive/v3/files/${lesson.drive_id}?alt=media&key=${apiKey}`;
        
        const fetchHeaders: Record<string, string> = {};
        if (req.headers.range) {
          fetchHeaders["Range"] = req.headers.range;
        }

        let response;
        try {
          response = await fetch(driveUrl, { headers: fetchHeaders });
        } catch (fetchError: any) {
          console.error("Network error fetching from Google Drive:", fetchError);
          return res.status(503).json({ error: "Failed to connect to Google Drive service" });
        }
        
        if (!response.ok) {
          let errorMessage = "Failed to fetch from Google Drive API";
          try {
            const errorData = await response.json();
            if (errorData.error && errorData.error.message) {
              errorMessage = `Google Drive error: ${errorData.error.message}`;
            }
          } catch (e) {
            // If response is not JSON, use status text
            errorMessage = `Google Drive error: ${response.status} ${response.statusText}`;
          }
          console.error(`Google Drive API error: ${response.status} ${response.statusText}`, errorMessage);
          return res.status(response.status).json({ error: errorMessage });
        }

        const isPdf = lesson.type === 'pdf' || lesson.fileName?.toLowerCase().endsWith('.pdf');
        let contentType = isPdf ? "application/pdf" : (response.headers.get("content-type") || "video/mp4");
        const contentLength = response.headers.get("content-length");
        const contentRange = response.headers.get("content-range");
        const acceptRanges = response.headers.get("accept-ranges") || "bytes";

        res.setHeader("Content-Type", contentType);
        res.setHeader("Accept-Ranges", acceptRanges);
        if (contentLength) res.setHeader("Content-Length", contentLength);
        if (contentRange) res.setHeader("Content-Range", contentRange);

        if (response.status === 206) {
          res.status(206);
        } else {
          res.status(200);
        }
        
        if (response.body) {
          // @ts-ignore
          Readable.fromWeb(response.body).pipe(res);
        } else {
          res.status(404).json({ error: "Empty response from Google Drive" });
        }
      } else if (lesson.fileName) {
        // Stream from local file system
        try {
          const uploadsDir = path.join(process.cwd(), "uploads");
          const filePath = path.join(uploadsDir, lesson.fileName);
          
          // Basic path traversal protection
          if (!filePath.startsWith(uploadsDir)) {
            console.error(`Invalid file path attempted: ${filePath}`);
            return res.status(403).json({ error: "Access denied: Invalid file path" });
          }

          if (!fs.existsSync(filePath)) {
            console.error(`Local file not found: ${filePath}`);
            return res.status(404).json({ error: "The requested file was not found on the server" });
          }

          const stat = fs.statSync(filePath);
          const fileSize = stat.size;
          const range = req.headers.range;
          const isPdf = lesson.type === 'pdf' || lesson.fileName.toLowerCase().endsWith('.pdf');

          if (range && typeof range === "string" && !isPdf) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize || end >= fileSize || start > end) {
              return res.status(416).json({ error: "Requested range not satisfiable" });
            }

            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });
            
            file.on('error', (err) => {
              console.error("Error reading local file stream (range):", err);
              if (!res.headersSent) {
                res.status(500).json({ error: "Error reading file from disk" });
              }
            });

            const head = {
              "Content-Range": `bytes ${start}-${end}/${fileSize}`,
              "Accept-Ranges": "bytes",
              "Content-Length": chunksize,
              "Content-Type": "video/mp4",
            };
            res.writeHead(206, head);
            file.pipe(res);
          } else {
            const head = {
              "Content-Length": fileSize,
              "Content-Type": isPdf ? "application/pdf" : "video/mp4",
            };
            res.writeHead(200, head);
            const file = fs.createReadStream(filePath);
            
            file.on('error', (err) => {
              console.error("Error reading local file stream:", err);
              if (!res.headersSent) {
                res.status(500).json({ error: "Error reading file from disk" });
              }
            });

            file.pipe(res);
          }
        } catch (fsError: any) {
          console.error("File system error in streamLesson:", fsError);
          return res.status(500).json({ error: `Server error accessing file: ${fsError.message}` });
        }
      } else {
        res.status(400).json({ error: "No video source available for this lesson" });
      }
    } catch (error: any) {
      console.error("Streaming error:", error);
      res.status(500).json({ error: error.message || "Failed to stream video" });
    }
  },
};
