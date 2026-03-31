import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/auth/callback`
);

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
}

export const googleDriveService = {
  getAuthUrl: () => {
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
      ],
      prompt: "consent",
    });
  },

  getTokens: async (code: string) => {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  },

  extractFolderId: (url: string): string | null => {
    const match = url.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url; // If not a URL, assume it's the ID itself
  },

  getFolderMetadata: async (folderId: string, tokens: any) => {
    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const res = await drive.files.get({
      fileId: folderId,
      fields: "id, name",
    });
    return res.data;
  },

  scanFolder: async (folderId: string, tokens: any): Promise<any[]> => {
    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const scan = async (id: string, path: string = ""): Promise<any[]> => {
      const res = await drive.files.list({
        q: `'${id}' in parents and trashed = false`,
        fields: "files(id, name, mimeType)",
      });

      const files = res.data.files || [];
      const results: any[] = [];

      for (const file of files) {
        if (file.mimeType === "application/vnd.google-apps.folder") {
          const subFiles = await scan(file.id!, `${path}/${file.name}`);
          if (subFiles.length > 0) {
            results.push({
              name: file.name,
              isFolder: true,
              children: subFiles,
            });
          }
        } else if (
          file.name?.toLowerCase().endsWith(".mp4") ||
          file.name?.toLowerCase().endsWith(".mkv") ||
          file.name?.toLowerCase().endsWith(".webm") ||
          file.name?.toLowerCase().endsWith(".mov") ||
          file.name?.toLowerCase().endsWith(".pdf") ||
          file.mimeType === "application/pdf"
        ) {
          results.push({
            name: file.name,
            id: file.id,
            mimeType: file.mimeType,
            isFolder: false,
          });
        }
      }
      return results;
    };
    
    return await scan(folderId);
  },

  convertToCourseStructure: (folderName: string, scanResults: any[]) => {
    const modules: any[] = [];

    // Flatten logic or nested logic?
    // User says: 
    // Course
    // ├ Module 1 (Folder name)
    // │  ├ Lesson 1 (Video file)
    // │  ├ Lesson 2 (Video file)
    
    // If there are files in the root, put them in a "General" module
    const rootFiles = scanResults.filter(f => !f.isFolder);
    if (rootFiles.length > 0) {
      modules.push({
        moduleName: "General",
        lessons: rootFiles.map(f => ({
          lessonName: f.name.replace(/\.[^/.]+$/, ""),
          videoUrl: `/api/stream/drive/${f.id}`,
          drive_id: f.id,
          type: (f.mimeType === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) ? 'pdf' : 'video'
        })),
      });
    }

    // Folders become modules
    const folders = scanResults.filter(f => f.isFolder);
    folders.forEach(folder => {
      // We only take one level of folders as modules for simplicity, 
      // or we can recursively flatten.
      // Let's recursively flatten subfolders into the same module for now, 
      // or just take the first level.
      
      const lessons: any[] = [];
      const collectLessons = (items: any[]) => {
        items.forEach(item => {
          if (item.isFolder) {
            collectLessons(item.children);
          } else {
            lessons.push({
              lessonName: item.name.replace(/\.[^/.]+$/, ""),
              videoUrl: `/api/stream/drive/${item.id}`,
              drive_id: item.id,
              type: (item.mimeType === 'application/pdf' || item.name.toLowerCase().endsWith('.pdf')) ? 'pdf' : 'video'
            });
          }
        });
      };
      
      collectLessons(folder.children);
      
      if (lessons.length > 0) {
        modules.push({
          moduleName: folder.name,
          lessons: lessons,
        });
      }
    });

    return {
      courseName: folderName,
      modules,
    };
  },

  getFileMetadata: async (fileId: string, tokens: any) => {
    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const res = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size",
    });
    return res.data;
  },

  getFileStream: async (fileId: string, tokens: any, range?: string) => {
    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    
    const requestOptions: any = {
      fileId,
      alt: "media",
    };

    if (range) {
      requestOptions.headers = {
        Range: range,
      };
    }

    const res = await drive.files.get(
      requestOptions,
      { responseType: "stream" }
    );
    return res;
  },
};
