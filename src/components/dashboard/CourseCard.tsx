import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Play, Edit3, Trash2, Share2, Clock, CheckCircle2, FolderUp, MoreHorizontal, Globe, Lock, Layout, Youtube } from 'lucide-react';
import { Course } from '../../types';
import { cn } from '../../utils/cn';

interface CourseCardProps {
  course: Course;
  onDelete: (id: string, title: string) => void;
  onShare: (course: Course) => void;
  onEdit: (course: Course) => void;
  index: number;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onDelete,
  onShare,
  onEdit,
  index
}) => {
  const [bgImage, setBgImage] = useState<string | null>(() => {
    return localStorage.getItem(`course-bg-${course.id}`);
  });

  const completedLessons = course.progress?.filter(p => p.completed).length || 0;
  const totalLessons = course.lessons?.length || 0;
  const moduleCount = course.modules?.length || 0;
  const totalDuration = course.lessons?.reduce((acc, l) => acc + (l.duration || 0), 0) || 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const formatTotalDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds === 0) return null;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  useEffect(() => {
    if (!bgImage) {
      // Extract keywords from title (words > 3 chars)
      const keywords = course.title
        .split(/[\s@]+/)
        .filter(w => w.length > 3)
        .join(',');
      
      const query = keywords || 'education,technology';
      // Use a more stable Unsplash URL format that doesn't require a redirect fetch
      // source.unsplash.com is deprecated and has CORS issues when fetched.
      // We'll use the URL directly in the style, and store it to avoid re-calculation.
      const imageUrl = `https://images.unsplash.com/featured/?${encodeURIComponent(query)}`;
      
      setBgImage(imageUrl);
      localStorage.setItem(`course-bg-${course.id}`, imageUrl);
    }
  }, [course.id, course.title, bgImage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative h-full"
    >
      <div className="relative bg-card rounded-[2rem] border border-border overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 group-hover:border-primary/20 h-full flex flex-col">
        {/* Subtle Background Image */}
        {bgImage && (
          <div 
            className="absolute inset-0 z-0 opacity-20 blur-[1px] transition-opacity duration-500 group-hover:opacity-30"
            style={{
              backgroundImage: `url(${bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-card/80 via-card/90 to-card" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Thumbnail Area */}
          <div className="relative aspect-video bg-muted overflow-hidden">
          {course.thumbnail ? (
            <img 
              src={course.thumbnail} 
              alt={course.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 group-hover:scale-110 transition-transform duration-700">
              <FolderUp size={48} className="text-secondary/40" />
            </div>
          )}
          
          {/* Overlay Actions - Simplified for Lofi */}
          <div className="absolute inset-0 bg-black/60 laptop:opacity-0 laptop:group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 tablet:gap-3 backdrop-blur-[2px] z-20">
            <Link 
              to={`/course/${course.id}`}
              className="w-12 h-12 tablet:w-16 tablet:h-16 bg-primary text-primary-foreground rounded-2xl tablet:rounded-3xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              <Play size={24} fill="currentColor" className="tablet:w-8 tablet:h-8" />
            </Link>
          </div>

          {/* Type Badge */}
          <div className="absolute top-2 tablet:top-4 left-2 tablet:left-4 flex flex-col gap-1 tablet:gap-2 z-30">
            <div className={cn(
              "px-3 py-1 backdrop-blur-md border rounded-full text-[10px] tablet:text-xs font-bold uppercase tracking-widest flex items-center gap-1.5",
              course.sourceType === 'youtube' ? "bg-red-500/20 border-red-500/20 text-red-400" :
              course.sourceType === 'gdrive' ? "bg-blue-500/20 border-blue-500/20 text-blue-400" :
              "bg-muted/80 border-border text-muted-foreground"
            )}>
              {course.sourceType === 'youtube' && <Youtube size={12} />}
              {course.sourceType === 'gdrive' && <Globe size={12} />}
              {course.sourceType === 'local' && <FolderUp size={12} />}
              <span className="hidden sm:inline">
                {course.sourceType === 'youtube' ? 'YouTube Playlist' : 
                 course.sourceType === 'gdrive' ? 'Google Drive' : 'Local Upload'}
              </span>
              <span className="sm:hidden">
                {course.sourceType === 'youtube' ? 'YouTube' : 
                 course.sourceType === 'gdrive' ? 'Drive' : 'Local'}
              </span>
            </div>
            {course.isPublic !== undefined && (
              <div className={cn(
                "px-3 py-1 backdrop-blur-md border rounded-full text-[10px] tablet:text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 w-fit",
                course.isPublic ? "bg-emerald-500/20 border-emerald-500/20 text-emerald-500" : "bg-amber-500/20 border-amber-500/20 text-amber-500"
              )}>
                {course.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                {course.isPublic ? 'Public' : 'Private'}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 tablet:p-6 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-3 mb-2 tablet:mb-3">
            <h3 className="text-sm tablet:text-base font-bold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
              {course.title}
            </h3>
            <button className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <MoreHorizontal size={18} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] tablet:text-xs text-muted-foreground mb-4 tablet:mb-6">
            <div className="flex items-center gap-1.5">
              <Layout size={12} className="text-primary/60" />
              {moduleCount} Modules
            </div>
            <div className="text-border">•</div>
            <div className="flex items-center gap-1.5">
              <Play size={12} className="text-primary/60" />
              {totalLessons} Lessons
            </div>
            {formatTotalDuration(totalDuration) && (
              <>
                <div className="text-border">•</div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-primary/60" />
                  {formatTotalDuration(totalDuration)}
                </div>
              </>
            )}
          </div>

          <div className="mt-auto space-y-2 tablet:space-y-3">
            <div className="flex items-center justify-between text-[10px] tablet:text-xs font-bold mb-1">
              <span className={cn(
                "px-2 py-0.5 rounded-full",
                progressPercent === 100 ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
              )}>
                {progressPercent === 100 ? 'Completed' : 'In Progress'}
              </span>
              <span className="text-muted-foreground">{progressPercent}%</span>
            </div>
            <div className="relative w-full h-1 tablet:h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "absolute top-0 left-0 h-full rounded-full transition-all duration-500",
                  progressPercent === 100 
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                    : "bg-gradient-to-r from-primary to-secondary shadow-[0_0_10px_rgba(108,124,255,0.3)]"
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
  );
};
