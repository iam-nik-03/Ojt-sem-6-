import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DownloadProjectButton } from '../components/DownloadProjectButton';
import { 
  ChevronLeft, 
  Heart,
  Play, 
  CheckCircle2, 
  Circle, 
  MessageSquare, 
  Bookmark, 
  ChevronRight,
  Clock,
  MoreVertical,
  Maximize2,
  Settings,
  FileText,
  Sparkles,
  Plus,
  Layout,
  Eye,
  EyeOff,
  Filter,
  Volume2,
  SkipForward,
  FastForward,
  Trophy,
  FolderPlus,
  Loader2,
  Youtube,
  Globe,
  FolderUp
} from 'lucide-react';
import { extractYoutubeVideoId } from '../utils/youtube';
import { Course, Lesson, Module, Progress, Note } from '../types';
import { useFileStore } from '../store/FileStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { VideoPlayer, VideoPlayerHandle } from '../components/player/VideoPlayer';
import { PdfViewer } from '../components/player/PdfViewer';
import { 
  getCourseDetail, 
  saveProgress as dbSaveProgress, 
  getNotes, 
  saveNote, 
  toggleBookmark as dbToggleBookmark,
  addModule,
  addLesson,
  updateModule,
  deleteModule,
  updateLesson,
  deleteLesson,
  updateCourse
} from '../utils/courseDB';
import { getGDriveVideoUrl, syncGDriveCourse } from '../utils/gdrive';
import { parseModuleFolder } from '../utils/courseParser';
import { progressStorage } from '../utils/progressStorage';

import { StudyAssistant } from '../components/assistant/StudyAssistant';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatDuration = (seconds: number | undefined) => {
  if (seconds === undefined || seconds === 0 || isNaN(seconds)) return '--:--';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatModuleDuration = (seconds: number, isCalculating?: boolean) => {
  if (!seconds || isNaN(seconds) || seconds === 0) return isCalculating ? 'Calculating...' : '0s';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

const getVideoDuration = (url: string): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    if (url.startsWith('http')) {
      video.crossOrigin = 'anonymous';
    }
    
    const handleMetadata = () => {
      const duration = video.duration;
      cleanup();
      resolve(duration || 0);
    };
    
    const handleError = () => {
      cleanup();
      resolve(0);
    };
    
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', handleMetadata);
      video.removeEventListener('error', handleError);
      video.src = '';
      video.load();
    };

    video.addEventListener('loadedmetadata', handleMetadata);
    video.addEventListener('error', handleError);
    video.src = url;
    
    // Timeout after 15 seconds
    setTimeout(() => {
      cleanup();
      resolve(0);
    }, 15000);
  });
};

export const CoursePlayer: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getFile, setFiles } = useFileStore();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'transcript' | 'resources'>('overview');
  const [focusMode, setFocusMode] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [bookmarkFilter, setBookmarkFilter] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  
  const [showAssistantChat, setShowAssistantChat] = useState(false);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState('');
  const addModuleInputRef = useRef<HTMLInputElement>(null);
  
  const videoRef = useRef<VideoPlayerHandle>(null);

  // Background duration calculation for all lessons
  useEffect(() => {
    if (!course || !course.lessons || loading) return;

    const lessonsToProcess = course.lessons.filter(l => !l.duration);
    if (lessonsToProcess.length === 0) return;

    let cancelled = false;

    const processLessons = async () => {
      const cachedDurationsRaw = localStorage.getItem('videoDurations');
      const cachedDurations = cachedDurationsRaw ? JSON.parse(cachedDurationsRaw) : {};

      for (const lesson of lessonsToProcess) {
        if (cancelled) break;

        // Check cache first
        const cachedDuration = cachedDurations[lesson.id];
        if (cachedDuration && cachedDuration > 0) {
          await updateLesson(lesson.id, { duration: cachedDuration });
          setCourse(prev => {
            if (!prev) return null;
            const newLessons = prev.lessons?.map(l => l.id === lesson.id ? { ...l, duration: cachedDuration } : l);
            if (activeLesson?.id === lesson.id) {
              setActiveLesson(prevActive => prevActive ? { ...prevActive, duration: cachedDuration } : null);
            }
            return {
              ...prev,
              lessons: newLessons
            };
          });
          continue;
        }

        try {
          let url: string | null = null;
          if (course.sourceType === 'gdrive' && lesson.drive_id) {
            url = await getGDriveVideoUrl(course.id, lesson.id);
          } else {
            const file = await getFile(lesson.id);
            if (file) {
              url = URL.createObjectURL(file);
            }
          }

          if (url && !cancelled) {
            const duration = await getVideoDuration(url);
            if (duration > 0 && !cancelled) {
              // Update cache object
              const currentCachedRaw = localStorage.getItem('videoDurations');
              const currentCached = currentCachedRaw ? JSON.parse(currentCachedRaw) : {};
              currentCached[lesson.id] = duration;
              localStorage.setItem('videoDurations', JSON.stringify(currentCached));

              await updateLesson(lesson.id, { duration });
              setCourse(prev => {
                if (!prev) return null;
                const newLessons = prev.lessons?.map(l => l.id === lesson.id ? { ...l, duration } : l);
                if (activeLesson?.id === lesson.id) {
                  setActiveLesson(prevActive => prevActive ? { ...prevActive, duration } : null);
                }
                return {
                  ...prev,
                  lessons: newLessons
                };
              });
            }
            
            if (course.sourceType !== 'gdrive' && url.startsWith('blob:')) {
              URL.revokeObjectURL(url);
            }
          }
        } catch (err) {
          console.error(`Failed to get duration for lesson ${lesson.id}`, err);
        }
      }
    };

    processLessons();

    return () => {
      cancelled = true;
    };
  }, [course?.id, course?.lessons?.length, loading]);

  useEffect(() => {
    if (activeLesson && !expandedModuleId) {
      setExpandedModuleId(activeLesson.moduleId);
    }
  }, [activeLesson]);

  useEffect(() => {
    if (id) {
      const cached = localStorage.getItem(`course_${id}`);
      if (cached) {
        try {
          setCourse(JSON.parse(cached));
          setLoading(false);
        } catch (e) {
          console.error("Failed to parse cached course", e);
        }
      }
      fetchCourseData();
    }
  }, [id]);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const loadVideo = async () => {
      if (activeLesson && course) {
        if (course.sourceType === 'youtube') {
          const youtubeId = activeLesson.youtubeId || extractYoutubeVideoId(activeLesson.id);
          if (youtubeId) {
            setVideoUrl(`youtube:${youtubeId}`);
            return;
          }
        }

        if (course.sourceType === 'gdrive' && activeLesson.drive_id) {
          const url = await getGDriveVideoUrl(course.id, activeLesson.id);
          if (!cancelled) {
            setVideoUrl(url);
          }
        } else {
          const file = await getFile(activeLesson.id);
          if (file && !cancelled) {
            objectUrl = URL.createObjectURL(file);
            setVideoUrl(objectUrl);
            
            // Resume position logic
            const localProg = progressStorage.getLessonProgress(course.id, activeLesson.id);
            const dbProg = course?.progress?.find(p => p.lessonId === activeLesson.id);
            const prog = localProg || dbProg;
            
            if (prog && prog.lastPosition > 10) {
              setResumeTime(prog.lastPosition);
              setShowResumePrompt(true);
            }
          } else if (!cancelled) {
            setVideoUrl(null);
          }
        }

        // Resume position logic for GDrive (if not handled above)
        if (course.sourceType === 'gdrive' && !cancelled) {
          const localProg = progressStorage.getLessonProgress(course.id, activeLesson.id);
          const dbProg = course?.progress?.find(p => p.lessonId === activeLesson.id);
          const prog = localProg || dbProg;
          
          if (prog && prog.lastPosition > 10) {
            setResumeTime(prog.lastPosition);
            setShowResumePrompt(true);
          }
        }
      }
    };

    loadVideo();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [activeLesson, course?.id, getFile]);

  const handleResume = () => {
    if (videoRef.current && resumeTime > 0) {
      videoRef.current.seek(resumeTime);
      videoRef.current.play();
    }
    setShowResumePrompt(false);
  };

  // Auto-save progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && activeLesson && !videoRef.current.isPaused()) {
        const currentTime = videoRef.current.getCurrentTime();
        saveProgress(activeLesson.id, currentTime);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeLesson, course?.progress]);

  const fetchCourseData = async () => {
    try {
      const data = await getCourseDetail(id!);
      if (!data) throw new Error("Failed to fetch course");
      
      // Sort modules and lessons
      if (data.modules) {
        data.modules.sort((a: Module, b: Module) => {
          const getDayNumber = (title: string) => {
            const match = title.match(/Day\s*(\d+)/i);
            return match ? parseInt(match[1], 10) : Infinity;
          };
          const dayA = getDayNumber(a.title);
          const dayB = getDayNumber(b.title);
          
          if (dayA !== Infinity || dayB !== Infinity) {
            return dayA - dayB;
          }
          return a.orderIndex - b.orderIndex;
        });
      }
      if (data.lessons) {
        data.lessons.sort((a: Lesson, b: Lesson) => a.orderIndex - b.orderIndex);
      }

      // Merge localStorage progress
      const localProgress = progressStorage.getCourseProgress(id!);
      if (localProgress) {
        const mergedProgress = [...(data.progress || [])];
        Object.entries(localProgress.lessons).forEach(([lessonId, prog]) => {
          const idx = mergedProgress.findIndex(p => p.lessonId === lessonId);
          if (idx >= 0) {
            mergedProgress[idx] = { ...mergedProgress[idx], ...prog };
          } else {
            mergedProgress.push({ ...prog, lessonId, courseId: id! });
          }
        });
        data.progress = mergedProgress;
      }

      // Load cached durations immediately for fast UI
      const cachedDurationsRaw = localStorage.getItem('videoDurations');
      const cachedDurations = cachedDurationsRaw ? JSON.parse(cachedDurationsRaw) : {};
      
      if (data.lessons) {
        data.lessons = data.lessons.map((lesson: Lesson) => {
          const duration = cachedDurations[lesson.id];
          if (duration && duration > 0) {
            return { ...lesson, duration };
          }
          return lesson;
        });
      }

      setCourse(data);
      localStorage.setItem(`course_${id}`, JSON.stringify(data));
      
      // Auto-sync GDrive course on load
      if (data.sourceType === 'gdrive' && data.rootFolderId) {
        handleSync(data);
      }
      
      if (data.lessons?.length > 0) {
        if (!activeLesson) {
          setActiveLesson(data.lessons[0]);
        } else {
          const updatedActive = data.lessons.find((l: Lesson) => l.id === activeLesson.id);
          if (updatedActive) setActiveLesson(updatedActive);
        }
      }

      const notesData = await getNotes(id!);
      setNotes(notesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (lessonId: string, position: number, completed?: boolean) => {
    if (!course) return;
    
    const localProg = progressStorage.getLessonProgress(course.id, lessonId);
    const dbProg = course.progress?.find(p => p.lessonId === lessonId);
    const existingProg = localProg || dbProg;
    
    const isCompleted = completed ?? existingProg?.completed;
    const duration = videoRef.current?.getDuration() || course.lessons?.find(l => l.id === lessonId)?.duration || 0;
    const progressPercent = duration > 0 ? Math.round((position / duration) * 100) : 0;

    // Save to localStorage (as requested)
    progressStorage.saveLessonProgress(course.id, lessonId, {
      progress: progressPercent,
      completed: !!isCompleted,
      lastPosition: position
    });

    // Also save to IndexedDB for backup/sync
    await dbSaveProgress({
      lessonId,
      courseId: course.id,
      completed: !!isCompleted,
      lastPosition: position,
      updatedAt: new Date().toISOString()
    });

    // Update local state for immediate UI feedback
    setCourse(prev => {
      if (!prev) return null;
      const newProgress = [...(prev.progress || [])];
      const idx = newProgress.findIndex(p => p.lessonId === lessonId);
      const entry = {
        lessonId,
        courseId: prev.id,
        completed: !!isCompleted,
        lastPosition: position,
        updatedAt: new Date().toISOString()
      };
      if (idx >= 0) newProgress[idx] = entry;
      else newProgress.push(entry);
      return { ...prev, progress: newProgress };
    });
  };

  const toggleLessonCompletion = async (lessonId: string) => {
    if (!course) return;
    const isCompleted = course.progress?.find(p => p.lessonId === lessonId)?.completed;
    if (!isCompleted) {
      setShowCompletionToast(true);
      setTimeout(() => {
        setShowCompletionToast(false);
      }, 3000);
    }
    
    await saveProgress(lessonId, videoRef.current?.getCurrentTime() || 0, !isCompleted);
    fetchCourseData();
  };

  const handleSync = async (courseToSync?: Course) => {
    const targetCourse = courseToSync || course;
    if (!targetCourse || targetCourse.sourceType !== 'gdrive' || !targetCourse.rootFolderId) return;

    setIsSyncing(true);
    try {
      const result = await syncGDriveCourse(targetCourse);
      if (result && (result.newModules.length > 0 || result.newLessons.length > 0)) {
        // Save new modules
        for (const mod of result.newModules) {
          await addModule(targetCourse.id, mod);
        }
        // Save new lessons
        for (const lesson of result.newLessons) {
          await addLesson(targetCourse.id, lesson);
        }
        // Update last sync time
        await updateCourse(targetCourse.id, { lastSyncTime: result.lastSyncTime });
        
        // Refresh data
        await fetchCourseData();
      } else if (result) {
        // Just update last sync time if no new content
        await updateCourse(targetCourse.id, { lastSyncTime: result.lastSyncTime });
        setCourse(prev => prev ? { ...prev, lastSyncTime: result.lastSyncTime } : null);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !activeLesson || !course) return;
    
    const note = {
      id: crypto.randomUUID(),
      courseId: course.id,
      lessonId: activeLesson.id,
      text: newNote,
      timestamp: videoRef.current?.getCurrentTime() || 0,
      createdAt: new Date().toISOString()
    };

    await saveNote(note);

    setNewNote('');
    fetchCourseData();
  };

  const toggleBookmark = async (lessonId: string) => {
    if (!course) return;
    await dbToggleBookmark(lessonId, course.id);
    fetchCourseData();
  };

  const handleAddModule = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !course) return;
    
    setIsAddingModule(true);
    try {
      const parsed = parseModuleFolder(e.target.files);
      const moduleId = crypto.randomUUID();
      
      // Add module
      await addModule(course.id, {
        id: moduleId,
        courseId: course.id,
        title: parsed.title,
        orderIndex: (course.modules?.length || 0) + 1
      });

      // Add lessons
      await Promise.all(parsed.lessons.map(async (lesson, idx) => {
        const lessonId = crypto.randomUUID();
        if (lesson.file) {
          await setFiles(lessonId, lesson.file);
        }
        await addLesson(course.id, {
          ...lesson,
          id: lessonId,
          moduleId,
          courseId: course.id,
          orderIndex: idx
        });
      }));

      await fetchCourseData();
      setIsManaging(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAddingModule(false);
    }
  };

  const handleUpdateModule = async (moduleId: string) => {
    if (!editModuleTitle.trim() || !course) return;
    await updateModule(moduleId, { title: editModuleTitle });
    setEditingModuleId(null);
    setEditModuleTitle('');
    fetchCourseData();
  };

  const handleUpdateLesson = async (lessonId: string) => {
    if (!editLessonTitle.trim() || !course) return;
    await updateLesson(lessonId, { title: editLessonTitle });
    setEditingLessonId(null);
    setEditLessonTitle('');
    fetchCourseData();
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!course) return;
    if (window.confirm("Are you sure you want to delete this module? All lessons inside it will also be removed.")) {
      // Find lessons to delete progress
      const lessonsToDelete = course.lessons?.filter(l => l.moduleId === moduleId) || [];
      lessonsToDelete.forEach(l => progressStorage.deleteLessonProgress(course.id, l.id));
      
      await deleteModule(moduleId);
      fetchCourseData();
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!course) return;
    if (window.confirm("Are you sure you want to delete this lesson?")) {
      progressStorage.deleteLessonProgress(course.id, lessonId);
      await deleteLesson(lessonId);
      fetchCourseData();
    }
  };

  const progressStats = useMemo(() => {
    if (!course || !course.lessons) return { percent: 0, completed: 0, total: 0, totalDuration: 0 };
    const completed = course.progress?.filter(p => p.completed).length || 0;
    const total = course.lessons.length;
    const totalDuration = course.lessons.reduce((acc, l) => acc + (l.duration || 0), 0);
    return {
      percent: Math.round((completed / total) * 100),
      completed,
      total,
      totalDuration
    };
  }, [course]);

  const getModuleProgress = (moduleId: string) => {
    if (!course || !course.lessons) return { percent: 0, completed: 0, total: 0, totalDuration: 0 };
    const moduleLessons = course.lessons.filter(l => l.moduleId === moduleId);
    const completed = moduleLessons.filter(l => course.progress?.find(p => p.lessonId === l.id)?.completed).length;
    const total = moduleLessons.length;
    const totalDuration = moduleLessons.reduce((acc, l) => acc + (l.duration || 0), 0);
    
    return {
      percent: Math.round((completed / total) * 100),
      completed,
      total,
      totalDuration,
      isMastered: completed === total && total > 0
    };
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-muted-foreground animate-pulse">Preparing your learning environment...</p>
    </div>
  );
  
  if (!course) return <div className="h-screen flex items-center justify-center bg-background">Course not found</div>;

  const isLessonCompleted = (lessonId: string) => course.progress?.find(p => p.lessonId === lessonId)?.completed;
  const isLessonBookmarked = (lessonId: string) => course.bookmarks?.find(b => b.lessonId === lessonId);

  const filteredLessons = (modId: string) => {
    const lessons = course.lessons?.filter(l => l.moduleId === modId) || [];
    if (bookmarkFilter) return lessons.filter(l => isLessonBookmarked(l.id));
    return lessons;
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden selection:bg-primary/30">
      {/* Top Progress Header */}
      <header className="sticky top-0 z-50 h-16 tablet:h-20 border-b border-border glass flex flex-col justify-between shrink-0">
        <div className="flex-1 flex items-center justify-between px-4 tablet:px-6">
          <div className="flex items-center gap-2 tablet:gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 tablet:p-2.5 hover:bg-muted rounded-xl tablet:rounded-2xl transition-all active:scale-95 group"
            >
              <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="flex flex-col">
              <h1 className="font-bold text-xs tablet:text-sm truncate max-w-[120px] sm:max-w-[200px] md:max-w-md">{course.title}</h1>
              <div className="flex items-center gap-2 tablet:gap-3 mt-0.5 tablet:mt-1">
                <span className="text-[8px] tablet:text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 tablet:gap-3">
                  <span className="flex items-center gap-1"><Clock size={10} /> {progressStats.percent}%</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 tablet:gap-6">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="laptop:hidden p-2 tablet:p-2.5 bg-muted hover:bg-muted/80 rounded-xl text-muted-foreground transition-all"
            >
              <Layout size={18} />
            </button>

            <button 
              onClick={() => setFocusMode(!focusMode)}
              className={cn(
                "p-2 tablet:p-2.5 rounded-xl transition-all flex items-center gap-2 text-[10px] tablet:text-xs font-bold",
                focusMode ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {focusMode ? <EyeOff size={14} /> : <Eye size={14} />}
              <span className="hidden sm:inline">{focusMode ? 'Exit Focus' : 'Focus Mode'}</span>
            </button>

            {course.sourceType === 'gdrive' && (
              <button 
                onClick={() => handleSync()}
                disabled={isSyncing}
                className="hidden sm:flex p-2.5 bg-muted hover:bg-muted/80 rounded-xl text-muted-foreground transition-all items-center gap-2 text-xs font-bold disabled:opacity-50"
              >
                {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isSyncing ? 'Syncing...' : 'Sync'}
              </button>
            )}

            <DownloadProjectButton />

            <div className="hidden desktop:flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary">{progressStats.percent}% Complete</span>
                <span className="text-[10px] text-muted-foreground">{progressStats.completed} / {progressStats.total} Lessons</span>
              </div>
              <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden border border-border">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressStats.percent}%` }}
                  className="h-full bg-gradient-to-r from-primary to-secondary shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Global Progress Bar (Slim) */}
        <div className="h-1 w-full bg-muted">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressStats.percent}%` }}
            className="h-full bg-primary"
          />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-y-auto course-sidebar-scroll p-4 tablet:p-6 transition-all duration-500",
          focusMode ? "max-w-6xl mx-auto" : ""
        )}>
          <div className="max-w-5xl mx-auto">
            {/* Video Player Area */}
            <div className="relative group mb-4 tablet:mb-6">
              {(activeLesson?.type === 'pdf' || activeLesson?.fileName?.toLowerCase().endsWith('.pdf')) && videoUrl ? (
                <div className="aspect-[3/4] tablet:aspect-[4/5] laptop:aspect-[3/4] max-h-[1000px]">
                  <PdfViewer 
                    src={videoUrl} 
                    title={activeLesson.title}
                  />
                </div>
              ) : videoUrl ? (
                <VideoPlayer 
                  key={videoUrl}
                  ref={videoRef}
                  src={videoUrl}
                  youtubeId={activeLesson?.youtubeId}
                  drive_id={activeLesson?.drive_id}
                  title={activeLesson?.title}
                  initialTime={course.progress?.find(p => p.lessonId === activeLesson?.id)?.lastPosition || 0}
                  onProgress={(currentTime, duration) => {
                    if (activeLesson) {
                      saveProgress(activeLesson.id, currentTime);
                      
                      // Auto-save duration if not present or different
                      if (duration > 0 && activeLesson.duration !== duration) {
                        const cachedRaw = localStorage.getItem('videoDurations');
                        const cached = cachedRaw ? JSON.parse(cachedRaw) : {};
                        cached[activeLesson.id] = duration;
                        localStorage.setItem('videoDurations', JSON.stringify(cached));

                        updateLesson(activeLesson.id, { duration });
                        setCourse(prev => {
                          if (!prev) return null;
                          const newLessons = prev.lessons?.map(l => l.id === activeLesson.id ? { ...l, duration } : l);
                          return {
                            ...prev,
                            lessons: newLessons
                          };
                        });
                        setActiveLesson(prev => prev ? { ...prev, duration } : null);
                      }
                    }
                  }}
                  onDurationLoaded={(duration) => {
                    if (activeLesson && activeLesson.duration !== duration) {
                      const cachedRaw = localStorage.getItem('videoDurations');
                      const cached = cachedRaw ? JSON.parse(cachedRaw) : {};
                      cached[activeLesson.id] = duration;
                      localStorage.setItem('videoDurations', JSON.stringify(cached));

                      updateLesson(activeLesson.id, { duration });
                      setCourse(prev => {
                        if (!prev) return null;
                        const newLessons = prev.lessons?.map(l => l.id === activeLesson.id ? { ...l, duration } : l);
                        return {
                          ...prev,
                          lessons: newLessons
                        };
                      });
                      setActiveLesson(prev => prev ? { ...prev, duration } : null);
                    }
                  }}
                  onNext={() => {
                    const currentIndex = course.lessons?.findIndex(l => l.id === activeLesson?.id) ?? -1;
                    if (currentIndex !== -1 && course.lessons && currentIndex < course.lessons.length - 1) {
                      setActiveLesson(course.lessons[currentIndex + 1]);
                    }
                  }}
                  onPrevious={() => {
                    const currentIndex = course.lessons?.findIndex(l => l.id === activeLesson?.id) ?? -1;
                    if (currentIndex > 0 && course.lessons) {
                      setActiveLesson(course.lessons[currentIndex - 1]);
                    }
                  }}
                  autoPlayNext={true}
                />
              ) : (
                <div className="aspect-video bg-background rounded-[2rem] overflow-hidden shadow-2xl relative border border-border ring-1 ring-border">
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-4 bg-[#050505]">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                      <Play size={40} className="opacity-20 translate-x-1" />
                    </div>
                    <p className="font-medium text-center px-4">
                      {course.sourceType === 'gdrive' 
                        ? "Failed to load Google Drive video. Please check your connection or folder permissions."
                        : course.sourceType === 'youtube'
                          ? "Failed to load YouTube video. Please check the playlist link or your connection."
                          : "Please re-link your local folder to play this video."}
                    </p>
                  </div>
                </div>
              )}

              {/* Completion Toast */}
              <AnimatePresence>
                {showCompletionToast && (
                  <motion.div 
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 100, opacity: 0 }}
                    className="fixed top-24 right-6 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold z-[60]"
                  >
                    <CheckCircle2 size={20} />
                    Lesson Completed ✓
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Player Controls & Navigation */}
            <div className="flex flex-col md:flex-row items-center justify-end gap-4 mb-8 bg-foreground/[0.02] p-4 rounded-[2rem] border border-border">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    const currentIndex = course.lessons?.findIndex(l => l.id === activeLesson?.id) ?? -1;
                    if (currentIndex > 0 && course.lessons) {
                      setActiveLesson(course.lessons[currentIndex - 1]);
                    }
                  }}
                  disabled={course.lessons?.findIndex(l => l.id === activeLesson?.id) === 0}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl font-bold text-sm transition-all flex items-center gap-2 border border-white/5"
                >
                  <SkipForward size={18} className="rotate-180" />
                  Previous Lesson
                </button>
                <button 
                  onClick={() => {
                    const currentIndex = course.lessons?.findIndex(l => l.id === activeLesson?.id) ?? -1;
                    if (currentIndex !== -1 && course.lessons && currentIndex < course.lessons.length - 1) {
                      setActiveLesson(course.lessons[currentIndex + 1]);
                    }
                  }}
                  disabled={course.lessons?.findIndex(l => l.id === activeLesson?.id) === (course.lessons?.length || 0) - 1}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl font-bold text-sm transition-all flex items-center gap-2 border border-white/5"
                >
                  Next Lesson
                  <SkipForward size={18} />
                </button>
              </div>
            </div>

            {/* Floating Add Note Button */}
            <button 
              onClick={() => {
                setActiveTab('notes');
              }}
              className="absolute -bottom-6 right-10 w-14 h-14 bg-secondary text-white rounded-full shadow-[0_10px_30px_rgba(74,108,247,0.4)] flex items-center justify-center hover:scale-110 transition-all active:scale-95 group z-20"
            >
              <Plus size={28} className="group-hover:rotate-90 transition-transform" />
            </button>

            {/* Lesson Info */}
            <div className="flex items-start justify-between mb-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded-lg border border-primary/20">
                    Source: {course.sourceType === 'gdrive' ? 'Google Drive' : 'Local Upload'}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Module {course.modules?.findIndex(m => m.id === activeLesson?.moduleId) || 0 + 1}</span>
                </div>
                <h2 className="text-4xl font-bold mb-4 tracking-tight">{activeLesson?.title}</h2>
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => setShowAssistantChat(true)}
                    className={cn(
                      "flex items-center gap-2 text-sm font-bold transition-all px-4 py-2 rounded-xl border",
                      showAssistantChat 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                        : "text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/5 border-transparent hover:border-emerald-500/20"
                    )}
                  >
                    <Sparkles size={18} className={showAssistantChat ? "animate-pulse" : ""} /> 
                    Ask Assistant
                  </button>
                  <button 
                    onClick={() => setActiveTab('transcript')}
                    className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
                  >
                    <FileText size={18} /> Transcript
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => activeLesson && toggleBookmark(activeLesson.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all active:scale-95",
                    isLessonBookmarked(activeLesson?.id || '') 
                      ? "bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]" 
                      : "bg-card border-white/5 hover:border-white/20"
                  )}
                >
                  <Bookmark size={22} fill={isLessonBookmarked(activeLesson?.id || '') ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={() => activeLesson && toggleLessonCompletion(activeLesson.id)}
                  className={cn(
                    "px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all active:scale-95 shadow-lg",
                    isLessonCompleted(activeLesson?.id || '')
                      ? "bg-emerald-500 text-white shadow-emerald-500/20"
                      : "bg-primary text-black hover:bg-primary/90 shadow-primary/20"
                  )}
                >
                  {isLessonCompleted(activeLesson?.id || '') ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                  {isLessonCompleted(activeLesson?.id || '') ? 'Completed' : 'Mark as Complete'}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/5 mb-8 flex gap-10">
              {['overview', 'notes', 'transcript', 'resources'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={cn(
                    "pb-4 text-sm font-bold transition-all relative capitalize",
                    activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                  {tab === 'notes' && <span className="ml-2 text-[10px] opacity-50">({notes.filter(n => n.lessonId === activeLesson?.id).length})</span>}
                  {activeTab === tab && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(0,255,163,0.5)]" />}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="pb-32">
              {activeTab === 'overview' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="prose prose-invert max-w-none"
                >
                  <div className="glass p-8 rounded-[2rem] border border-white/5">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Sparkles size={20} className="text-primary" /> Lesson Description
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                      In this lesson, we dive deep into the core concepts of {activeLesson?.title}. 
                      Follow along as we explore practical examples and best practices. 
                      Don't forget to use the notes feature to capture important timestamps!
                    </p>
                    <div className="mt-8 grid grid-cols-3 gap-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Difficulty</span>
                        <p className="font-bold text-secondary">Intermediate</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Topic</span>
                        <p className="font-bold text-amber-500">Learning</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'notes' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="glass p-6 rounded-[2rem] border border-white/5">
                    <textarea 
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Write a timestamped note..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px] transition-all"
                    />
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock size={14} /> 
                        Note will be saved at <span className="text-primary font-mono">{Math.floor((videoRef.current?.getCurrentTime() || 0) / 60)}:{(videoRef.current?.getCurrentTime() || 0 % 60).toFixed(0).padStart(2, '0')}</span>
                      </div>
                      <button 
                        onClick={addNote}
                        className="bg-primary text-black px-8 py-3 rounded-2xl font-bold hover:scale-105 transition-all active:scale-95"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {notes.filter(n => n.lessonId === activeLesson?.id).map(note => (
                      <motion.div 
                        layout
                        key={note.id} 
                        className="glass p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <button 
                            onClick={() => {
                              if (videoRef.current) videoRef.current.seek(note.timestamp);
                            }}
                            className="text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 hover:bg-primary/20 transition-colors flex items-center gap-2"
                          >
                            <Play size={10} fill="currentColor" />
                            {Math.floor(note.timestamp / 60)}:{(note.timestamp % 60).toFixed(0).padStart(2, '0')}
                          </button>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{note.text}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'transcript' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {[
                    { time: 0, text: "Welcome to this comprehensive guide on modern development." },
                    { time: 65, text: "In this section, we'll cover the fundamental architecture." },
                    { time: 142, text: "Notice how the state management flows through the components." },
                    { time: 210, text: "This is a crucial concept for building scalable applications." }
                  ].map((item, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        if (videoRef.current) videoRef.current.seek(item.time);
                      }}
                      className="w-full text-left p-4 rounded-2xl hover:bg-white/5 transition-colors flex gap-6 group"
                    >
                      <span className="text-xs font-mono text-primary shrink-0 pt-1">{Math.floor(item.time / 60)}:{(item.time % 60).toString().padStart(2, '0')}</span>
                      <p className="text-muted-foreground group-hover:text-foreground transition-colors">{item.text}</p>
                    </button>
                  ))}
                </motion.div>
              )}

              {activeTab === 'resources' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {[
                    { name: "Lesson Slides.pdf", size: "2.4 MB", type: "PDF" },
                    { name: "Exercise Dataset.csv", size: "1.1 MB", type: "CSV" },
                    { name: "Cheat Sheet.png", size: "800 KB", type: "Image" }
                  ].map((res, i) => (
                    <div key={i} className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                          <FileText size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{res.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{res.type} • {res.size}</p>
                        </div>
                      </div>
                      <button className="p-2 hover:bg-primary/10 hover:text-primary rounded-xl transition-all">
                        <SkipForward size={18} className="rotate-90" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </main>

        {/* Course Content Sidebar / Mobile Drawer */}
        <AnimatePresence>
          {(!focusMode || sidebarOpen) && (
            <>
              {/* Mobile Overlay */}
              {sidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSidebarOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                />
              )}
              
              <motion.aside 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn(
                  "fixed inset-y-0 right-0 w-full sm:w-96 lg:relative lg:inset-auto lg:w-96 border-l border-white/5 flex flex-col shrink-0 z-50 lg:z-40 shadow-2xl",
                  sidebarOpen ? "translate-x-0" : ""
                )}
                style={{ background: 'linear-gradient(180deg, #0f172a, #1e293b)' }}
              >
                <div className="p-6 border-b border-white/5 bg-black/20">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 shadow-[0_0_15px_rgba(250,204,21,0.1)]">
                          <Layout size={18} />
                        </div>
                        <h3 className="font-bold text-sm uppercase tracking-widest text-[#e5e7eb]">Course Content</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSidebarOpen(false)}
                          className="lg:hidden p-2 hover:bg-white/5 rounded-xl text-white/40"
                        >
                          <Plus size={20} className="rotate-45" />
                        </button>
                      </div>
                    </div>

                    {/* Source Indicator */}
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest",
                      course.sourceType === 'youtube' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                      course.sourceType === 'gdrive' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                      "bg-white/5 border-white/10 text-white/40"
                    )}>
                      {course.sourceType === 'youtube' && <Youtube size={12} />}
                      {course.sourceType === 'gdrive' && <Globe size={12} />}
                      {course.sourceType === 'local' && <FolderUp size={12} />}
                      <span>Course Source: {
                        course.sourceType === 'youtube' ? 'YouTube Playlist' : 
                        course.sourceType === 'gdrive' ? 'Google Drive' : 'Local Upload'
                      }</span>
                    </div>
                  </div>
                </div>

                {isManaging && (
                  <div className="p-4 bg-primary/5 border-b border-white/5">
                    <button 
                      onClick={() => addModuleInputRef.current?.click()}
                      disabled={isAddingModule}
                      className="w-full py-3 bg-primary text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                      {isAddingModule ? <Loader2 size={18} className="animate-spin" /> : <FolderPlus size={18} />}
                      Add New Module
                    </button>
                    <input 
                      ref={addModuleInputRef}
                      type="file"
                      // @ts-ignore
                      webkitdirectory=""
                      directory=""
                      className="hidden"
                      onChange={handleAddModule}
                    />
                  </div>
                )}

                <div className="flex-1 overflow-y-auto course-sidebar-scroll">
                  {course.modules?.map((mod) => {
                    const modProg = getModuleProgress(mod.id);
                    const isExpanded = expandedModuleId === mod.id;
                    
                    return (
                      <div 
                        key={mod.id} 
                        className={cn(
                          "border-b border-white/5 last:border-0 transition-all duration-300 bg-[#111827]",
                          modProg.percent === 100 ? "relative" : ""
                        )}
                      >
                        {/* Neon Border for Mastered Module */}
                        {modProg.percent === 100 && (
                          <div className="absolute inset-0 border-l-2 border-emerald-500 shadow-[inset_2px_0_10px_rgba(16,185,129,0.1)] pointer-events-none z-10" />
                        )}

                        {/* Module Header */}
                        <div 
                          onClick={() => setExpandedModuleId(isExpanded ? null : mod.id)}
                          className={cn(
                            "w-full px-6 py-5 text-left transition-all group relative overflow-hidden cursor-pointer",
                            isExpanded ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"
                          )}
                        >
                          {isExpanded && (
                            <motion.div 
                              layoutId="activeModuleGlow"
                              className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.02] to-transparent pointer-events-none"
                            />
                          )}
                          
                          <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                                modProg.percent === 100 ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-white/5 text-white/40 group-hover:text-amber-500"
                              )}>
                                {modProg.percent === 100 ? <CheckCircle2 size={16} /> : (isExpanded ? <ChevronRight size={16} className="rotate-90 transition-transform" /> : <ChevronRight size={16} />)}
                              </div>
                              <div>
                                {editingModuleId === mod.id ? (
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <input 
                                      autoFocus
                                      value={editModuleTitle}
                                      onChange={e => setEditModuleTitle(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && handleUpdateModule(mod.id)}
                                      className="bg-black/40 border border-amber-500/30 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 text-white"
                                    />
                                    <button onClick={() => handleUpdateModule(mod.id)} className="text-amber-500 hover:text-amber-400">
                                      <CheckCircle2 size={14} />
                                    </button>
                                    <button onClick={() => setEditingModuleId(null)} className="text-white/40 hover:text-white">
                                      <Plus size={14} className="rotate-45" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <h4 className={cn(
                                      "text-xs font-bold tracking-tight transition-colors",
                                      modProg.percent === 100 ? "text-emerald-500" : (isExpanded ? "text-white" : "text-white/60 group-hover:text-white")
                                    )}>
                                      {mod.title}
                                    </h4>
                                    {course.lessons?.some(l => l.moduleId === mod.id && l.type === 'pdf') && (
                                      <FileText size={12} className="text-red-400/60" />
                                    )}
                                  </div>
                                )}
                                {modProg.percent === 100 && (
                                  <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest flex items-center gap-1">
                                    <Sparkles size={10} /> Module Completed
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {isManaging && (
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                  <button 
                                    onClick={() => {
                                      setEditingModuleId(mod.id);
                                      setEditModuleTitle(mod.title);
                                    }}
                                    className="p-1.5 hover:bg-amber-500/20 text-white/30 hover:text-amber-500 rounded-lg transition-all"
                                  >
                                    <Settings size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteModule(mod.id)}
                                    className="p-1.5 hover:bg-red-500/20 text-white/30 hover:text-red-500 rounded-lg transition-all"
                                  >
                                    <Plus size={14} className="rotate-45" />
                                  </button>
                                </div>
                              )}
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-white/40">{modProg.total} Lessons</span>
                                <div className="text-[10px] font-bold text-emerald-500">{modProg.percent}%</div>
                              </div>
                            </div>
                          </div>

                          {/* Module Progress Bar */}
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative z-10">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${modProg.percent}%` }}
                              className="h-full transition-all"
                              style={{ background: 'linear-gradient(90deg, #facc15, #fde047)' }}
                            />
                          </div>
                        </div>

                        {/* Lessons List (Accordion Content) */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className="overflow-hidden bg-black/20"
                            >
                              <div className="py-2">
                                {filteredLessons(mod.id).map((lesson) => (
                                  <div
                                    key={lesson.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                      setActiveLesson(lesson);
                                      if (window.innerWidth < 1024) setSidebarOpen(false);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        setActiveLesson(lesson);
                                        if (window.innerWidth < 1024) setSidebarOpen(false);
                                      }
                                    }}
                                    className={cn(
                                      "w-full px-6 py-5 flex items-center gap-4 text-left transition-all group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
                                      activeLesson?.id === lesson.id ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"
                                    )}
                                  >
                                    {activeLesson?.id === lesson.id && (
                                      <motion.div 
                                        layoutId="activeLessonIndicator" 
                                        className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600 shadow-[0_0_15px_rgba(250,204,21,0.3)]" 
                                      />
                                    )}
                                    
                                    <div className="shrink-0 relative">
                                      {course.sourceType === 'youtube' && (
                                        <div className="w-20 h-12 rounded-xl overflow-hidden border border-white/5 mr-2 shadow-lg">
                                          <img 
                                            src={`https://img.youtube.com/vi/${lesson.youtubeId}/mqdefault.jpg`} 
                                            alt="" 
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                          />
                                        </div>
                                      )}
                                      {isLessonCompleted(lesson.id) ? (
                                        <motion.div 
                                          initial={{ scale: 0.8 }}
                                          animate={{ scale: 1 }}
                                          className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                        >
                                          <CheckCircle2 size={14} />
                                        </motion.div>
                                      ) : (
                                        <div className={cn(
                                          "w-6 h-6 rounded-full flex items-center justify-center border transition-all",
                                          activeLesson?.id === lesson.id ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-white/10 text-white/40 group-hover:border-amber-500/50"
                                        )}>
                                          {activeLesson?.id === lesson.id ? (
                                            lesson.type === 'pdf' ? <FileText size={10} className="animate-pulse" /> : <Play size={10} fill="currentColor" className="animate-pulse" />
                                          ) : (
                                            lesson.type === 'pdf' ? <FileText size={10} className="group-hover:scale-110 transition-transform" /> : <Circle size={10} className="group-hover:scale-110 transition-transform" />
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      {editingLessonId === lesson.id ? (
                                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                          <input 
                                            autoFocus
                                            type="text"
                                            value={editLessonTitle}
                                            onChange={e => setEditLessonTitle(e.target.value)}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') handleUpdateLesson(lesson.id);
                                              if (e.key === 'Escape') setEditingLessonId(null);
                                            }}
                                            className="w-full bg-black/40 border border-amber-500/30 rounded px-2 py-1 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                          />
                                          <button 
                                            onClick={() => handleUpdateLesson(lesson.id)}
                                            className="p-1 bg-amber-500 text-black rounded hover:bg-amber-400 transition-colors"
                                          >
                                            <CheckCircle2 size={12} />
                                          </button>
                                          <button 
                                            onClick={() => setEditingLessonId(null)}
                                            className="p-1 bg-white/10 text-white/60 rounded hover:bg-white/20 transition-colors"
                                          >
                                            <Plus size={12} className="rotate-45" />
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex items-center justify-between gap-2">
                                            <p className={cn(
                                              "text-xs font-bold truncate transition-colors flex items-center gap-2",
                                              activeLesson?.id === lesson.id ? "text-amber-500" : (isLessonCompleted(lesson.id) ? "text-white/40" : "text-white/80 group-hover:text-amber-500")
                                            )}>
                                              {lesson.type === 'pdf' && <FileText size={14} className="text-red-400 shrink-0" />}
                                              {lesson.title}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-3 mt-1.5">
                                            {activeLesson?.id === lesson.id && (
                                              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter animate-pulse drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">Now Playing</span>
                                            )}
                                            {isLessonBookmarked(lesson.id) && (
                                              <Bookmark size={10} className="text-amber-500" fill="currentColor" />
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    {/* Quick Actions on Hover */}
                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all translate-x-2 group-hover:translate-x-0">
                                      {isManaging && (
                                        <div className="flex items-center gap-1 mr-1" onClick={e => e.stopPropagation()}>
                                          <button 
                                            onClick={() => {
                                              setEditingLessonId(lesson.id);
                                              setEditLessonTitle(lesson.title);
                                            }}
                                            className="p-1.5 hover:bg-yellow-500/20 text-yellow-500/60 hover:text-yellow-500 rounded-lg transition-all"
                                          >
                                            <Settings size={14} />
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteLesson(lesson.id)}
                                            className="p-1.5 hover:bg-red-500/20 text-yellow-500/60 hover:text-red-500 rounded-lg transition-all"
                                          >
                                            <Plus size={14} className="rotate-45" />
                                          </button>
                                        </div>
                                      )}
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleBookmark(lesson.id);
                                        }}
                                        className={cn(
                                          "p-2 rounded-lg transition-colors",
                                          isLessonBookmarked(lesson.id) ? "text-amber-500 bg-amber-500/10" : "text-white/40 hover:bg-yellow-500/10 hover:text-amber-500"
                                        )}
                                      >
                                        <Bookmark size={14} fill={isLessonBookmarked(lesson.id) ? "currentColor" : "none"} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  
                  {/* Empty State for Modules */}
                  {(!course.modules || course.modules.length === 0) && (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-yellow-500/5 rounded-[2rem] flex items-center justify-center mx-auto mb-4 text-yellow-500/40">
                        <Layout size={32} />
                      </div>
                      <p className="text-sm font-bold text-yellow-500/60 mb-4">No modules yet</p>
                    </div>
                  )}
                  
                </div>
                
                {/* Sidebar Footer */}
                <div className="p-6 border-t border-white/5 bg-black/20 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Course Progress</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white">{progressStats.percent}% Completed</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Assistant Panel */}
        <StudyAssistant 
          isOpen={showAssistantChat}
          onClose={() => setShowAssistantChat(false)}
          context={{
            courseName: course.title,
            moduleName: course.modules?.find(m => m.id === activeLesson?.moduleId)?.title || 'Unknown Module',
            lessonTitle: activeLesson?.title || 'Unknown Lesson',
            getCurrentTime: () => videoRef.current?.getCurrentTime() || 0
          }}
        />

        {/* Persistent Assistant FAB */}
        {!showAssistantChat && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAssistantChat(true)}
            className="fixed bottom-8 right-8 w-14 h-14 bg-emerald-500 text-black rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center z-50 border-2 border-emerald-400/50 group"
          >
            <Sparkles size={24} className="group-hover:animate-pulse" />
            <div className="absolute -top-12 right-0 bg-emerald-500 text-black text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-emerald-400/50">
              Ask Assistant
            </div>
          </motion.button>
        )}
      </div>

    </div>
  );
};
