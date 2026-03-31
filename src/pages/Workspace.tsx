import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Bookmark, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  CheckCircle2, 
  X,
  Plus,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
  BookOpen,
  Compass,
  Library,
  Youtube,
  Users,
  Loader2,
  ChevronRight,
  History,
  FolderUp
} from 'lucide-react';
import { Course, Lesson, Module } from '../types';
import { CourseCard } from '../components/dashboard/CourseCard';
import { DeleteConfirmationModal } from '../components/dashboard/DeleteConfirmationModal';
import { ShareModal } from '../components/dashboard/ShareModal';
import { EditCourseModal } from '../components/dashboard/EditCourseModal';
import { AddCourseModal } from '../components/AddCourseModal';
import { useFileStore } from '../store/FileStore';
import { cn } from '../utils/cn';
import { getCourses, getCourseDetail, deleteCourse, updateCourse, saveCourse, getCoursesWithDetails } from '../utils/courseDB';
import { api } from '../utils/api';

interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  videoCount: number;
  isMock?: boolean;
}

const CATEGORIES = [
  'Programming', 'Design', 'Business', 'Data Science', 'Marketing', 'Photography', 'Music'
];

const RECENT_SEARCHES = [
  'React Course', 'Python for Beginners', 'UI/UX Design', 'Web Development'
];

export const Workspace: React.FC = () => {
  const { deleteFilesForCourse, setFiles } = useFileStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeView, setActiveView] = useState<'library' | 'discover'>('library');
  const [activeTab, setActiveTab] = useState<'all' | 'review'>('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddCourse, setShowAddCourse] = useState(false);
  
  // Discover State
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverResults, setDiscoverResults] = useState<YouTubePlaylist[]>([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<YouTubePlaylist[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const discoverResultsRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({
    isOpen: false,
    id: '',
    title: ''
  });
  const [shareModal, setShareModal] = useState<{ isOpen: boolean; course: Course | null }>({
    isOpen: false,
    course: null
  });
  const [editModal, setEditModal] = useState<{ isOpen: boolean; course: Course | null }>({
    isOpen: false,
    course: null
  });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
    fetchFeatured();
  }, []);

  const fetchFeatured = async () => {
    try {
      const { data, error } = await api.get<YouTubePlaylist[]>('/api/youtube/search?q=programming%20tutorials');
      if (data) setFeaturedPlaylists(data.slice(0, 6));
    } catch (err) {
      console.error('Failed to fetch featured playlists:', err);
    }
  };

  // Discover Search Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (discoverQuery.trim()) {
        searchPlaylists(discoverQuery);
      } else {
        setDiscoverResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [discoverQuery]);

  const fetchCourses = async () => {
    try {
      const data = await getCoursesWithDetails();
      setCourses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const searchPlaylists = async (query: string) => {
    setDiscoverLoading(true);
    setDiscoverError(null);
    console.log(`Starting search for: ${query}`);
    try {
      const { data, error } = await api.get<YouTubePlaylist[]>(`/api/youtube/search?q=${encodeURIComponent(query)}`);
      console.log('Search response:', { data, error });
      if (error) throw new Error(error);
      setDiscoverResults(data || []);
      if (data && data.length > 0 && activeView === 'discover') {
        setTimeout(() => {
          discoverResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (err: any) {
      console.error('Search failed:', err);
      setDiscoverError(err.message);
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleStartCourse = async (playlist: YouTubePlaylist) => {
    try {
      setDiscoverLoading(true);
      const { data: playlistData, error } = await api.get<any>(`/api/youtube/playlist/${playlist.id}`);
      if (error || !playlistData) throw new Error(error || 'Failed to fetch playlist details');

      const courseId = crypto.randomUUID();
      const course = {
        id: courseId,
        title: playlistData.title,
        sourceType: 'youtube',
        thumbnail: playlistData.thumbnail,
        modules: [
          {
            id: crypto.randomUUID(),
            courseId: courseId,
            title: 'Course Content',
            orderIndex: 0
          }
        ],
        lessons: playlistData.videos.map((v: any, index: number) => ({
          id: crypto.randomUUID(),
          courseId: courseId,
          moduleId: '', // Handled by saveCourse
          title: v.title,
          youtubeId: v.id || v.videoId,
          orderIndex: index,
          type: 'youtube'
        }))
      };

      await saveCourse(course);
      await fetchCourses();
      showToast('Course imported successfully');
      navigate(`/course/${courseId}`);
    } catch (err: any) {
      showToast('Error starting course: ' + err.message, 'error');
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleAddCourse = async (courseData: { title: string; modules: Module[]; lessons: Lesson[] }) => {
    try {
      const courseId = crypto.randomUUID();
      
      // Handle local files
      const lessonsWithFiles = courseData.lessons.filter(l => l.file);
      if (lessonsWithFiles.length > 0) {
        await Promise.all(lessonsWithFiles.map(async (l) => {
          if (l.file) await setFiles(l.id, l.file);
        }));
      }

      // Determine source type
      let sourceType: 'local' | 'gdrive' | 'youtube' = 'local';
      if (courseData.lessons.some(l => l.drive_id)) sourceType = 'gdrive';
      if (courseData.lessons.some(l => l.youtubeId)) sourceType = 'youtube';

      await saveCourse({
        id: courseId,
        title: courseData.title,
        sourceType,
        modules: courseData.modules,
        lessons: courseData.lessons.map(({ file, ...rest }) => rest),
        createdAt: new Date().toISOString()
      });

      showToast('Course created successfully');
      fetchCourses();
    } catch (err: any) {
      showToast(err.message || 'Failed to create course', 'error');
      throw err;
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleDeleteConfirm = async () => {
    try {
      const detail = await getCourseDetail(deleteModal.id);
      if (detail) {
        const lessonIds = detail.lessons?.map((l: any) => l.id) || [];
        await deleteFilesForCourse(lessonIds);
      }

      await deleteCourse(deleteModal.id);
      setCourses(prev => prev.filter(c => c.id !== deleteModal.id));
      showToast('Course deleted successfully');
    } catch (err) {
      showToast('Failed to delete course', 'error');
    } finally {
      setDeleteModal({ isOpen: false, id: '', title: '' });
    }
  };

  const handleEditSave = async (id: string, title: string, thumbnail?: string) => {
    try {
      await updateCourse(id, { title, thumbnail });
      setCourses(prev => prev.map(c => c.id === id ? { ...c, title, thumbnail } : c));
      showToast('Course updated successfully');
    } catch (err) {
      showToast('Failed to update course', 'error');
    }
  };

  const handleTogglePublic = async (isPublic: boolean) => {
    if (!shareModal.course) return;
    try {
      await updateCourse(shareModal.course.id, { isPublic });
      setCourses(prev => prev.map(c => c.id === shareModal.course?.id ? { ...c, isPublic } : c));
      setShareModal(prev => ({ ...prev, course: prev.course ? { ...prev.course, isPublic } : null }));
      showToast(`Course is now ${isPublic ? 'public' : 'private'}`);
    } catch (err) {
      showToast('Failed to update visibility', 'error');
    }
  };

  const filteredCourses = useMemo(() => {
    let result = activeTab === 'all' 
      ? courses 
      : courses.filter(c => c.bookmarks && c.bookmarks.length > 0);
    
    if (searchQuery) {
      result = result.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    return result;
  }, [courses, activeTab, searchQuery]);

  const stats = useMemo(() => {
    const totalLessons = courses.reduce((acc, c) => acc + (c.lessons?.length || 0), 0);
    const completedLessons = courses.reduce((acc, c) => acc + (c.progress?.filter(p => p.completed).length || 0), 0);
    return {
      total: courses.length,
      completed: completedLessons,
      totalLessons,
      percent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
    };
  }, [courses]);

  return (
    <div className="relative min-h-screen bg-background selection:bg-primary/20">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-5rem)] laptop:min-h-[calc(100vh-6rem)] space-y-8 sm:space-y-12">
        {/* Toast Notification */}
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 50, x: '-50%' }}
              className={cn(
                "fixed bottom-8 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-xl",
                toast.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500"
              )}
            >
              {toast.type === 'success' ? <CheckCircle2 size={20} /> : <X size={20} />}
              <span className="font-bold text-sm tracking-wide">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Navigation Bar */}
        <nav className="flex items-center justify-between gap-4 sticky top-20 laptop:top-24 z-40 py-2 bg-background/50 backdrop-blur-md -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:rotate-12 transition-transform cursor-pointer">
              <Sparkles className="text-primary-foreground" size={20} />
            </div>
            <span className="text-xl font-black tracking-tighter hidden xs:block">SkillStudio</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex bg-muted/30 p-1 rounded-2xl border border-border">
              <button 
                onClick={() => setActiveView('library')}
                className={cn(
                  "px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                  activeView === 'library' ? "bg-card text-primary shadow-lg" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Library size={16} />
                <span className="hidden sm:inline">Library</span>
              </button>
              <button 
                onClick={() => setActiveView('discover')}
                className={cn(
                  "px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                  activeView === 'discover' ? "bg-card text-primary shadow-lg" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Compass size={16} />
                <span className="hidden sm:inline">Discover</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Unified Hero Section */}
        <section className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] border border-border/50 glass-card">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
          </div>
          
          <div className="relative z-10 p-6 sm:p-10 lg:p-16">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 lg:gap-16">
              {/* Left Side: Content */}
              <div className="space-y-6 sm:space-y-8 max-w-2xl">
                <div className="space-y-4">
                  <motion.div
                    key={activeView + '-title'}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/10 text-primary text-[10px] font-black uppercase tracking-widest"
                  >
                    {activeView === 'library' ? <Library size={12} /> : <Compass size={12} />}
                    {activeView === 'library' ? 'Workplace' : 'Exploration'}
                  </motion.div>
                  
                  <motion.h1 
                    key={activeView + '-h1'}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]"
                  >
                    {activeView === 'library' ? (
                      <>Your <span className="text-primary">Learning</span> Dashboard</>
                    ) : (
                      <>Master any topic with <span className="text-red-500">YouTube</span></>
                    )}
                  </motion.h1>
                  
                  <motion.p 
                    key={activeView + '-p'}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-muted-foreground text-sm sm:text-lg max-w-xl leading-relaxed"
                  >
                    {activeView === 'library' 
                      ? 'Track your progress, manage your personalized course library, and continue your learning journey.' 
                      : "Search for any topic and we'll find the best playlists to convert into structured, distraction-free courses."}
                  </motion.p>
                </div>

                {activeView === 'discover' && (
                  <div className="relative group max-w-xl">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                      <input 
                        type="text" 
                        value={discoverQuery}
                        onChange={(e) => setDiscoverQuery(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="What do you want to learn today?" 
                        className="w-full bg-background border border-border rounded-2xl py-3.5 sm:py-4 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm sm:text-lg font-medium shadow-2xl"
                      />
                      {discoverLoading && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <Loader2 className="animate-spin text-primary" size={20} />
                        </div>
                      )}
                    </div>

                    {/* Suggestions */}
                    <AnimatePresence>
                      {showSuggestions && !discoverQuery && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 right-0 mt-4 glass border border-border rounded-2xl p-4 sm:p-6 shadow-2xl z-50 text-left"
                        >
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                            <History size={14} />
                            Recent Searches
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {RECENT_SEARCHES.map(search => (
                              <button
                                key={search}
                                onClick={() => setDiscoverQuery(search)}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium group"
                              >
                                <Search size={16} className="text-muted-foreground group-hover:text-primary" />
                                {search}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {activeView === 'discover' && (
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setDiscoverQuery(cat);
                          searchPlaylists(cat);
                        }}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-muted/50 border border-border hover:border-primary/50 hover:bg-primary/5 text-[10px] sm:text-xs font-bold transition-all hover:scale-105 active:scale-95"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats section removed */}
            </div>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {activeView === 'library' ? (
            <motion.div
              key="library-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 sm:space-y-8"
            >
              {/* Library Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex bg-muted/30 p-1 rounded-2xl border border-border w-full sm:w-fit overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setActiveTab('all')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                      activeTab === 'all' ? "bg-card text-primary shadow-lg" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All Courses
                  </button>
                  <button 
                    onClick={() => setActiveTab('review')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                      activeTab === 'review' ? "bg-card text-primary shadow-lg" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Bookmark size={14} />
                    Bookmarked
                  </button>
                </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => setShowAddCourse(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-2xl text-xs font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary/20 whitespace-nowrap"
                    >
                      <Plus size={16} />
                      Add Course
                    </button>
                    <div className="relative group flex-1 sm:flex-none">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text"
                      placeholder="Search library..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-full sm:w-64"
                    />
                  </div>
                  <div className="flex bg-muted/30 p-1 rounded-2xl border border-border shrink-0">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        viewMode === 'grid' ? "bg-card text-primary shadow-lg" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        viewMode === 'list' ? "bg-card text-primary shadow-lg" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <List size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Library Content */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-card rounded-[2rem] overflow-hidden animate-pulse border border-border/50">
                      <div className="aspect-video bg-muted/50" />
                      <div className="p-6 space-y-4">
                        <div className="h-6 bg-muted/50 rounded-lg w-3/4" />
                        <div className="space-y-2">
                          <div className="h-4 bg-muted/50 rounded-lg w-full" />
                          <div className="h-4 bg-muted/50 rounded-lg w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCourses.length > 0 ? (
                <div className={cn(
                  "grid gap-6",
                  viewMode === 'grid' 
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                    : "grid-cols-1"
                )}>
                  {filteredCourses.map((course, index) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      index={index}
                      onDelete={(id, title) => setDeleteModal({ isOpen: true, id, title })}
                      onShare={(course) => setShareModal({ isOpen: true, course })}
                      onEdit={(course) => setEditModal({ isOpen: true, course })}
                    />
                  ))}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-20 text-center space-y-6 max-w-2xl mx-auto border-dashed border-2 border-border/50"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FolderUp size={40} className="text-primary sm:w-12 sm:h-12" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-black">No courses found</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">Try adjusting your search or filters, or import a new course to get started.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddCourse(true)}
                    className="px-6 py-3 sm:px-8 sm:py-4 bg-primary text-primary-foreground rounded-2xl font-bold inline-flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 text-sm"
                  >
                    <Plus size={20} />
                    Add Course
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="discover-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 sm:space-y-12"
            >
              {/* Discover Results */}
              <div ref={discoverResultsRef} className="scroll-mt-24">
                {discoverError ? (
                  <div className="text-center py-12 sm:py-20 glass-card rounded-[2.5rem] sm:rounded-[3rem] border border-red-500/20">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                      <X size={32} className="sm:w-10 sm:h-10" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black mb-2">Search Failed</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-8 px-4">{discoverError}</p>
                    <button 
                      onClick={() => searchPlaylists(discoverQuery)}
                      className="px-6 py-3 sm:px-8 sm:py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm"
                    >
                      Try Again
                    </button>
                  </div>
                ) : discoverResults.length > 0 ? (
                  <div className="space-y-6 sm:space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="text-primary" size={24} />
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight">Search Results</h2>
                        {discoverResults.some(r => r.isMock) && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/20 animate-pulse">
                            Demo Mode
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          setDiscoverQuery('');
                          setDiscoverResults([]);
                        }}
                        className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                      >
                        Clear Search
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                      {discoverResults.map((playlist, i) => (
                        <motion.div 
                          key={playlist.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="glass-card rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden group border border-border/50 hover:border-primary/30 transition-all shadow-xl flex flex-col"
                        >
                          <div className="aspect-video relative overflow-hidden">
                            <img 
                              src={playlist.thumbnail} 
                              alt={playlist.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                                <Play fill="currentColor" size={20} className="sm:w-6 sm:h-6" />
                              </div>
                            </div>
                            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-black/70 backdrop-blur-md rounded-xl text-[9px] sm:text-[10px] font-bold text-white flex items-center gap-1.5 sm:gap-2 border border-white/10">
                              <Youtube size={12} className="text-red-500 sm:w-3.5 sm:h-3.5" />
                              {playlist.videoCount} Videos
                            </div>
                          </div>
                          <div className="p-6 sm:p-8 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 mb-4 sm:mb-6">
                              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/10">YouTube</span>
                              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-muted text-muted-foreground px-3 py-1 rounded-full flex items-center gap-1.5">
                                <Users size={12} />
                                {playlist.channelTitle}
                              </span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                              {playlist.title}
                            </h3>
                            <p className="text-sm sm:text-base text-muted-foreground mb-8 sm:mb-10 line-clamp-2 leading-relaxed flex-1">
                              {playlist.description || "No description provided."}
                            </p>
                            <button 
                              onClick={() => handleStartCourse(playlist)}
                              className="w-full py-4 sm:py-5 bg-primary text-primary-foreground rounded-2xl text-sm sm:text-base font-bold hover:opacity-90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-primary/20 group/btn"
                            >
                              <Play size={18} fill="currentColor" />
                              Start Course
                              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : discoverLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="glass-card h-[400px] sm:h-[450px] rounded-[2rem] sm:rounded-[2.5rem] animate-pulse border border-border/50" />
                    ))}
                  </div>
                ) : featuredPlaylists.length > 0 ? (
                  <div className="space-y-6 sm:space-y-8">
                    <div className="flex items-center gap-3">
                      <Sparkles className="text-primary" size={24} />
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight">Featured Playlists</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                      {featuredPlaylists.map((playlist, i) => (
                        <motion.div 
                          key={playlist.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="glass-card rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden group border border-border/50 hover:border-primary/30 transition-all shadow-xl flex flex-col"
                        >
                          <div className="aspect-video relative overflow-hidden">
                            <img 
                              src={playlist.thumbnail} 
                              alt={playlist.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                                <Play fill="currentColor" size={20} className="sm:w-6 sm:h-6" />
                              </div>
                            </div>
                            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-black/70 backdrop-blur-md rounded-xl text-[9px] sm:text-[10px] font-bold text-white flex items-center gap-1.5 sm:gap-2 border border-white/10">
                              <Youtube size={12} className="text-red-500 sm:w-3.5 sm:h-3.5" />
                              {playlist.videoCount} Videos
                            </div>
                          </div>
                          <div className="p-6 sm:p-8 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 mb-4 sm:mb-6">
                              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/10">YouTube</span>
                              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-muted text-muted-foreground px-3 py-1 rounded-full flex items-center gap-1.5">
                                <Users size={12} />
                                {playlist.channelTitle}
                              </span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                              {playlist.title}
                            </h3>
                            <p className="text-sm sm:text-base text-muted-foreground mb-8 sm:mb-10 line-clamp-2 leading-relaxed flex-1">
                              {playlist.description || "No description provided."}
                            </p>
                            <button 
                              onClick={() => handleStartCourse(playlist)}
                              className="w-full py-4 sm:py-5 bg-primary text-primary-foreground rounded-2xl text-sm sm:text-base font-bold hover:opacity-90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-primary/20 group/btn"
                            >
                              <Play size={18} fill="currentColor" />
                              Start Course
                              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 sm:py-20 space-y-6 sm:space-y-8">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary/5 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 sm:mb-8 relative">
                      <div className="absolute inset-0 bg-primary/10 rounded-[2rem] sm:rounded-[2.5rem] animate-ping opacity-20"></div>
                      <Sparkles size={40} className="text-primary sm:w-12 sm:h-12" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight">Discover New Skills</h3>
                      <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto px-4">
                        Search for topics you want to learn and we'll find the best YouTube playlists for you.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, id: '', title: '' })}
          onConfirm={handleDeleteConfirm}
          courseTitle={deleteModal.title}
        />

        <ShareModal
          isOpen={shareModal.isOpen}
          onClose={() => setShareModal({ isOpen: false, course: null })}
          courseTitle={shareModal.course?.title || ''}
          courseId={shareModal.course?.id || ''}
          isPublic={shareModal.course?.isPublic || false}
          onTogglePublic={handleTogglePublic}
        />

        <EditCourseModal
          isOpen={editModal.isOpen}
          onClose={() => setEditModal({ isOpen: false, course: null })}
          onSave={handleEditSave}
          course={editModal.course}
        />

        {/* Add Course Modal */}
        <AnimatePresence>
          {showAddCourse && (
            <AddCourseModal 
              onClose={() => setShowAddCourse(false)}
              onSave={handleAddCourse}
            />
          )}
        </AnimatePresence>

        <footer className="mt-auto pt-10 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-muted-foreground text-sm">
          <p className="text-center sm:text-left">© 2026 SkillStudio. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span>Crafted by</span>
            <span className="font-bold text-foreground tracking-widest uppercase text-[10px] px-2 py-1 bg-muted rounded-lg border border-border">
              Nik
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
