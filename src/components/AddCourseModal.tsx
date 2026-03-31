import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderPlus, Youtube, Cloud, Loader2, CheckCircle2, AlertCircle, Trash2, Edit3, ChevronRight, PlayCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { extractYoutubeVideoId, extractPlaylistId, fetchYoutubePlaylist } from '../utils/youtube';
import { extractDriveId, fetchGDriveCourse } from '../utils/gdrive';
import { parseLocalFolder, parseGDriveFolder, parseYoutubePlaylist } from '../utils/courseParser';
import { Lesson, Module } from '../types';

interface AddCourseModalProps {
  onClose: () => void;
  onSave: (course: { title: string; modules: Module[]; lessons: Lesson[] }) => Promise<void>;
}

type ImportSource = 'local' | 'drive' | 'youtube';

export const AddCourseModal: React.FC<AddCourseModalProps> = ({ onClose, onSave }) => {
  const [source, setSource] = useState<ImportSource>('local');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  
  // Preview state
  const [previewCourse, setPreviewCourse] = useState<{ title: string; modules: Module[]; lessons: Lesson[] } | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [progress, setProgress] = useState(0);

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);
    setProgress(0);
    
    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 100);

    try {
      const parsed = parseLocalFolder(files);
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        setPreviewCourse(parsed);
        setEditedTitle(parsed.title);
      }, 300);
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || "Failed to process local files.");
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    try {
      if (source === 'youtube') {
        const playlistId = extractPlaylistId(url);
        if (!playlistId) throw new Error("Invalid YouTube playlist URL or ID.");
        
        const data = await fetchYoutubePlaylist(playlistId);
        const parsed = parseYoutubePlaylist(data.title, data.videos);
        setPreviewCourse(parsed);
        setEditedTitle(parsed.title);
      } else if (source === 'drive') {
        const driveId = extractDriveId(url);
        if (!driveId) throw new Error("Invalid Google Drive folder or file URL.");
        
        const data = await fetchGDriveCourse(driveId);
        const parsed = parseGDriveFolder(data.title, data.files);
        setPreviewCourse(parsed);
        setEditedTitle(parsed.title);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch content.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!previewCourse) return;
    
    setLoading(true);
    try {
      await onSave({
        ...previewCourse,
        title: editedTitle
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save course.");
    } finally {
      setLoading(false);
    }
  };

  const removeLesson = (lessonId: string) => {
    if (!previewCourse) return;
    const updatedLessons = previewCourse.lessons.filter(l => l.id !== lessonId);
    setPreviewCourse({ ...previewCourse, lessons: updatedLessons });
  };

  const renderSourceSelector = () => (
    <div className="grid grid-cols-3 gap-3 mb-8">
      {[
        { id: 'local', icon: FolderPlus, label: 'Local Folder', color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { id: 'drive', icon: Cloud, label: 'Google Drive', color: 'text-green-500', bg: 'bg-green-500/10' },
        { id: 'youtube', icon: Youtube, label: 'YouTube', color: 'text-red-500', bg: 'bg-red-500/10' },
      ].map((item) => (
        <button
          key={item.id}
          onClick={() => {
            setSource(item.id as ImportSource);
            setError(null);
            setUrl('');
            setPreviewCourse(null);
          }}
          className={cn(
            "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95",
            source === item.id 
              ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" 
              : "border-border bg-muted/30 hover:border-primary/30 hover:bg-muted/50"
          )}
        >
          <div className={cn("p-3 rounded-xl", item.bg, item.color)}>
            <item.icon size={24} />
          </div>
          <span className="text-xs font-bold">{item.label}</span>
        </button>
      ))}
    </div>
  );

  const renderInput = () => {
    if (source === 'local') {
      return (
        <div className="space-y-4">
          <div 
            onClick={() => !loading && fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed border-border rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? (
              <div className="w-full max-w-[200px] space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all">
                  <FolderPlus size={32} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-foreground text-lg">Click to upload folder</p>
                  <p className="text-sm text-muted-foreground mt-1">Select a folder containing videos or PDFs</p>
                </div>
              </>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLocalUpload}
              className="hidden"
              {...{ webkitdirectory: "", directory: "" } as any}
              multiple
            />
          </div>
          <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
            Supported: MP4, MKV, WEBM, PDF
          </p>
        </div>
      );
    }

    return (
      <form onSubmit={handleUrlSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground/80 ml-1">
            {source === 'youtube' ? 'Playlist URL' : 'Folder Link'}
          </label>
          <div className="relative group">
            {source === 'youtube' ? (
              <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-red-500 transition-colors" size={18} />
            ) : (
              <Cloud className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-green-500 transition-colors" size={18} />
            )}
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={source === 'youtube' ? "https://youtube.com/playlist?list=..." : "https://drive.google.com/drive/folders/..."}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-muted/50 border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50 font-medium"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <ChevronRight size={20} />}
          Fetch Content
        </button>
      </form>
    );
  };

  const renderPreview = () => {
    if (!previewCourse) return null;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-2xl border border-border">
          <div className="flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                  className="bg-background border border-primary rounded-lg px-3 py-1 text-lg font-bold w-full focus:outline-none"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h3 className="text-lg font-bold text-foreground truncate">{editedTitle}</h3>
                <button 
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Edit3 size={14} />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {previewCourse.lessons.length} lessons found
            </p>
          </div>
          <button 
            onClick={() => setPreviewCourse(null)}
            className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-all"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-border">
          {previewCourse.lessons.map((lesson, idx) => (
            <div 
              key={lesson.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border group hover:border-primary/30 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {lesson.type === 'video' || lesson.type === 'youtube' ? (
                    <PlayCircle size={12} className="text-blue-500" />
                  ) : (
                    <FileText size={12} className="text-orange-500" />
                  )}
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    {lesson.type}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => removeLesson(lesson.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={loading || previewCourse.lessons.length === 0}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
          Create Course
        </button>
      </motion.div>
    );
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-hide rounded-[2.5rem] bg-card border border-border shadow-2xl"
        >
          <div className="p-8 sm:p-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Add New Course</h2>
                <p className="text-sm text-muted-foreground mt-1">Choose a source to import your content</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-2xl hover:bg-muted transition-all text-muted-foreground hover:text-foreground active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {!previewCourse && renderSourceSelector()}

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-3"
              >
                <AlertCircle size={18} className="shrink-0" />
                {error}
              </motion.div>
            )}

            {!previewCourse ? renderInput() : renderPreview()}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
