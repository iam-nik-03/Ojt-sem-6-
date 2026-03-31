import { Lesson, Module } from "../types";

export function parseLocalFolder(files: FileList): { title: string; modules: Module[]; lessons: Lesson[] } {
  const fileArray = Array.from(files);
  const supportedFiles = fileArray.filter(f => 
    f.type.startsWith('video/') || 
    f.type === 'application/pdf' ||
    /\.(mp4|mkv|webm|mov|avi|flv|wmv|pdf)$/i.test(f.name)
  );
  
  if (supportedFiles.length === 0) {
    throw new Error("No supported video or PDF files found in the selected folder.");
  }

  // Get the root folder name from the first file's path
  const firstPath = supportedFiles[0].webkitRelativePath;
  const pathParts = firstPath.split('/');
  const courseTitle = pathParts[0] || "Untitled Course";

  const modulesMap = new Map<string, Module>();
  const lessons: Lesson[] = [];

  // Sort files by path to maintain some order
  supportedFiles.sort((a, b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath));

  supportedFiles.forEach((file, index) => {
    const relativePath = file.webkitRelativePath;
    const parts = relativePath.split('/');
    
    // parts[0] is course title
    // parts[1] is module title (if exists)
    // parts[parts.length - 1] is file name
    
    let moduleTitle = "General";
    if (parts.length > 2) {
      moduleTitle = parts[1];
    }

    if (!modulesMap.has(moduleTitle)) {
      modulesMap.set(moduleTitle, {
        id: crypto.randomUUID(),
        courseId: '',
        title: moduleTitle,
        orderIndex: modulesMap.size
      });
    }

    const mod = modulesMap.get(moduleTitle)!;
    const lessonTitle = parts[parts.length - 1].replace(/\.[^/.]+$/, "").replace(/^\d+[\s._-]*/, "");
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    lessons.push({
      id: crypto.randomUUID(),
      moduleId: mod.id,
      courseId: '', // Will be set later
      title: lessonTitle,
      type: isPdf ? 'pdf' : 'video',
      fileName: file.name,
      file: file, // Store the actual file object
      orderIndex: index
    });
  });

  return {
    title: courseTitle,
    modules: Array.from(modulesMap.values()),
    lessons
  };
}

export function parseModuleFolder(files: FileList): { title: string; lessons: Lesson[] } {
  const fileArray = Array.from(files);
  const supportedFiles = fileArray.filter(f => 
    f.type.startsWith('video/') || 
    f.type === 'application/pdf' ||
    /\.(mp4|mkv|webm|mov|avi|flv|wmv|pdf)$/i.test(f.name)
  );
  
  if (supportedFiles.length === 0) {
    throw new Error("No supported video or PDF files found in the selected folder.");
  }

  // Sort files by path
  supportedFiles.sort((a, b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath));

  const firstPath = supportedFiles[0].webkitRelativePath;
  const pathParts = firstPath.split('/');
  const moduleTitle = pathParts[0] || "New Module";

  const lessons: Lesson[] = supportedFiles.map((file, index) => {
    const parts = file.webkitRelativePath.split('/');
    const lessonTitle = parts[parts.length - 1].replace(/\.[^/.]+$/, "").replace(/^\d+[\s._-]*/, "");
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    
    return {
      id: crypto.randomUUID(),
      moduleId: '', // Set by caller
      courseId: '', // Set by caller
      title: lessonTitle,
      type: isPdf ? 'pdf' : 'video',
      fileName: file.name,
      file: file,
      orderIndex: index
    };
  });

  return {
    title: moduleTitle,
    lessons
  };
}

export function parseGDriveFolder(courseTitle: string, files: any[]): { title: string; modules: Module[]; lessons: Lesson[] } {
  const supportedFiles = files.filter(f => f.mimeType.startsWith('video/') || f.mimeType === 'application/pdf');
  
  const modulesMap = new Map<string, Module>();
  const lessons: Lesson[] = [];

  // Sort files by path
  supportedFiles.sort((a, b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath));

  supportedFiles.forEach((file, index) => {
    const relativePath = file.webkitRelativePath;
    const parts = relativePath.split('/');
    
    // parts[0] is module title (if exists)
    // parts[parts.length - 1] is file name
    
    let moduleTitle = "General";
    if (parts.length > 1) {
      moduleTitle = parts[0];
    }

    if (!modulesMap.has(moduleTitle)) {
      modulesMap.set(moduleTitle, {
        id: crypto.randomUUID(),
        courseId: '',
        title: moduleTitle,
        orderIndex: modulesMap.size
      });
    }

    const mod = modulesMap.get(moduleTitle)!;
    const lessonTitle = parts[parts.length - 1].replace(/\.[^/.]+$/, "").replace(/^\d+[\s._-]*/, "");
    const isPdf = file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    lessons.push({
      id: crypto.randomUUID(),
      moduleId: mod.id,
      courseId: '',
      title: lessonTitle,
      type: isPdf ? 'pdf' : 'video',
      fileName: file.name,
      drive_id: file.id, // Store the Google Drive file ID
      orderIndex: index
    });
  });

  return {
    title: courseTitle,
    modules: Array.from(modulesMap.values()),
    lessons
  };
}

export function parseYoutubePlaylist(playlistTitle: string, videos: any[]): { title: string; modules: Module[]; lessons: Lesson[] } {
  const modulesMap = new Map<string, Module>();
  const lessons: Lesson[] = [];

  // Create a default module for YouTube playlists
  const moduleTitle = "YouTube Playlist";
  const modId = crypto.randomUUID();
  
  modulesMap.set(moduleTitle, {
    id: modId,
    courseId: '',
    title: moduleTitle,
    orderIndex: 0
  });

  videos.forEach((video, index) => {
    lessons.push({
      id: crypto.randomUUID(),
      moduleId: modId,
      courseId: '',
      title: video.title,
      type: 'youtube',
      youtubeId: video.videoId,
      duration: video.duration,
      orderIndex: index
    });
  });

  return {
    title: playlistTitle,
    modules: Array.from(modulesMap.values()),
    lessons
  };
}
