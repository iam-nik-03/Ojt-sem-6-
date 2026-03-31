
import { api } from './api';

const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;

export function extractDriveId(url: string): string | null {
  // Handle folder links
  const folderMatch = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  
  // Handle file links
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  // Handle uc links
  const ucMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) return ucMatch[1];
  
  // Also handle direct ID if pasted (usually 25+ chars)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(url)) return url;
  
  return null;
}

export async function getGDriveVideoUrl(courseId: string, lessonId: string): Promise<string> {
  return `/api/stream/${courseId}/${lessonId}`;
}

export async function fetchGDriveCourse(id: string) {
  if (!API_KEY) {
    throw new Error("Google Drive API Key is missing. Please add VITE_GOOGLE_DRIVE_API_KEY to your .env file.");
  }

  // Fetch item info
  const { data, error } = await api.get<any>(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType&key=${API_KEY}`);
  if (error) throw new Error(error);
  if (!data) throw new Error("Failed to fetch item info. Make sure it is public.");

  if (data.mimeType === 'application/vnd.google-apps.folder') {
    // Fetch all files recursively
    const allFiles = await fetchRecursive(id);
    
    if (allFiles.length === 0) {
      throw new Error("No video or PDF files found in the selected Google Drive folder.");
    }

    return {
      title: data.name,
      files: allFiles
    };
  } else if (data.mimeType.startsWith('video/') || data.mimeType === 'application/pdf') {
    // Single file
    return {
      title: data.name.replace(/\.[^/.]+$/, ""),
      files: [{
        id: data.id,
        name: data.name,
        mimeType: data.mimeType,
        webkitRelativePath: data.name
      }]
    };
  } else {
    throw new Error("The provided link is neither a folder nor a supported video or PDF file.");
  }
}

async function fetchRecursive(folderId: string, path: string = ""): Promise<any[]> {
  const q = `'${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)&key=${API_KEY}`;
  
  const { data, error } = await api.get<any>(url);
  if (error || !data || !data.files) return [];

  let results: any[] = [];

  for (const file of data.files) {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      const subFolderResults = await fetchRecursive(file.id, `${path}${file.name}/`);
      results = [...results, ...subFolderResults];
    } else if (file.mimeType.startsWith('video/') || file.mimeType === 'application/pdf') {
      results.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webkitRelativePath: `${path}${file.name}` // Mocking webkitRelativePath for existing parser logic compatibility
      });
    }
  }

  return results;
}

export async function syncGDriveCourse(course: any) {
  if (!course.rootFolderId) return null;

  try {
    const latestData = await fetchGDriveCourse(course.rootFolderId);
    const existingModules = course.modules || [];
    const existingLessons = course.lessons || [];
    
    const newModules: any[] = [];
    const newLessons: any[] = [];
    
    // Group latest files by module title
    const latestFilesByModule = new Map<string, any[]>();
    latestData.files.forEach(file => {
      const parts = file.webkitRelativePath.split('/');
      const moduleTitle = parts.length > 1 ? parts[0] : "General";
      if (!latestFilesByModule.has(moduleTitle)) {
        latestFilesByModule.set(moduleTitle, []);
      }
      latestFilesByModule.get(moduleTitle)!.push(file);
    });

    // Check for new modules
    for (const [moduleTitle, files] of latestFilesByModule.entries()) {
      let mod = existingModules.find((m: any) => m.title === moduleTitle);
      
      if (!mod) {
        // Create new module
        mod = {
          id: crypto.randomUUID(),
          courseId: course.id,
          title: moduleTitle,
          orderIndex: existingModules.length + newModules.length
        };
        newModules.push(mod);
      }

      // Check for new lessons in this module
      const moduleLessons = existingLessons.filter((l: any) => l.moduleId === mod.id);
      const maxOrderIndex = moduleLessons.reduce((max: number, l: any) => Math.max(max, l.orderIndex), -1);

      files.forEach((file, index) => {
        const lessonExists = existingLessons.find((l: any) => l.drive_id === file.id);
        if (!lessonExists) {
          const lessonTitle = file.name.replace(/\.[^/.]+$/, "").replace(/^\d+[\s._-]*/, "");
          const isPdf = file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          
          newLessons.push({
            id: crypto.randomUUID(),
            moduleId: mod.id,
            courseId: course.id,
            title: lessonTitle,
            type: isPdf ? 'pdf' : 'video',
            fileName: file.name,
            drive_id: file.id,
            orderIndex: maxOrderIndex + 1 + index
          });
        }
      });
    }

    return {
      newModules,
      newLessons,
      lastSyncTime: new Date().toISOString()
    };
  } catch (err) {
    console.error("Sync failed", err);
    throw new Error("Unable to sync Google Drive course.");
  }
}
