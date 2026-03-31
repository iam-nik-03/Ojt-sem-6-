import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Globe, Lock, Users, CheckCircle2, 
  ArrowRight, LayoutDashboard, Share2, Eye,
  Loader2
} from 'lucide-react';
import { DraftMetadata, draftStore } from '../../../utils/draftStore';
import { cn } from '../../../utils/cn';
import { saveCourse } from '../../../utils/courseDB';
import { useFileStore } from '../../../store/FileStore';

interface Step5Props {
  data: DraftMetadata;
  onPublish: () => void;
  onClearDraft: () => void;
}

export const Step5Publish: React.FC<Step5Props> = ({ data, onPublish, onClearDraft }) => {
  const { setFiles } = useFileStore();
  const [visibility, setVisibility] = useState<'public' | 'private' | 'invite'>('public');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    
    try {
      const courseId = crypto.randomUUID();

      // Migrate files from draft store to main file store
      await Promise.all(data.lessons.map(async (lesson) => {
        const file = await draftStore.getFile(lesson.id);
        if (file) {
          await setFiles(lesson.id, file);
        }
      }));

      await saveCourse({
        id: courseId,
        title: data.title,
        sourceType: 'local',
        isPublic: visibility === 'public',
        modules: data.modules,
        lessons: data.lessons,
        thumbnail: data.thumbnail,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setIsPublished(true);
      onClearDraft();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
    }
  };

  if (isPublished) {
    return (
      <div className="max-w-2xl mx-auto text-center py-6 tablet:py-12 space-y-6 tablet:space-y-8">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-14 h-14 tablet:w-24 tablet:h-24 bg-emerald-500/20 rounded-xl tablet:rounded-[2rem] flex items-center justify-center text-emerald-500 mx-auto shadow-2xl shadow-emerald-500/20"
        >
          <CheckCircle2 size={24} className="tablet:w-12 tablet:h-12" />
        </motion.div>
        
        <div className="space-y-2 tablet:space-y-4 px-4">
          <h2 className="text-xl tablet:text-4xl font-bold">Your course is live!</h2>
          <p className="text-muted-foreground text-xs tablet:text-lg">
            Congratulations! Your course "{data.title}" has been published successfully.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tablet:gap-4 pt-4 tablet:pt-8 px-4">
          <button 
            onClick={onPublish}
            className="flex flex-row sm:flex-col items-center gap-3 p-3.5 tablet:p-6 bg-white/5 border border-white/10 rounded-xl tablet:rounded-3xl hover:bg-white/10 transition-all group"
          >
            <div className="w-8 h-8 tablet:w-12 tablet:h-12 bg-primary/10 rounded-lg tablet:rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform flex-shrink-0">
              <Eye size={16} className="tablet:w-6 tablet:h-6" />
            </div>
            <span className="text-[11px] tablet:text-sm font-bold">View Course</span>
          </button>
          <button className="flex flex-row sm:flex-col items-center gap-3 p-3.5 tablet:p-6 bg-white/5 border border-white/10 rounded-xl tablet:rounded-3xl hover:bg-white/10 transition-all group">
            <div className="w-8 h-8 tablet:w-12 tablet:h-12 bg-amber-500/10 rounded-lg tablet:rounded-xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform flex-shrink-0">
              <Share2 size={16} className="tablet:w-6 tablet:h-6" />
            </div>
            <span className="text-[11px] tablet:text-sm font-bold">Share Link</span>
          </button>
          <button 
            onClick={onPublish}
            className="flex flex-row sm:flex-col items-center gap-3 p-3.5 tablet:p-6 bg-white/5 border border-white/10 rounded-xl tablet:rounded-3xl hover:bg-white/10 transition-all group"
          >
            <div className="w-8 h-8 tablet:w-12 tablet:h-12 bg-emerald-500/10 rounded-lg tablet:rounded-xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform flex-shrink-0">
              <LayoutDashboard size={16} className="tablet:w-6 tablet:h-6" />
            </div>
            <span className="text-[11px] tablet:text-sm font-bold">Workspace</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 tablet:space-y-12">
      <div className="text-center space-y-1.5 tablet:space-y-4 px-4">
        <h3 className="text-xl tablet:text-3xl font-bold">Ready to Publish?</h3>
        <p className="text-[10px] tablet:text-sm text-muted-foreground">Choose who can access your course before making it live.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tablet:gap-6 px-4">
        {[
          { id: 'public', title: 'Public', desc: 'Anyone can find and enroll.', icon: Globe, color: 'text-emerald-500' },
          { id: 'private', title: 'Private', desc: 'Only you can see this.', icon: Lock, color: 'text-amber-500' },
          { id: 'invite', title: 'Invite Only', desc: 'Only students with link.', icon: Users, color: 'text-primary' },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setVisibility(option.id as any)}
            className={cn(
              "p-4 tablet:p-8 rounded-xl tablet:rounded-[2.5rem] border-2 text-left transition-all flex flex-row sm:flex-col gap-3 tablet:gap-6 group items-center sm:items-start",
              visibility === option.id 
                ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10" 
                : "border-white/5 bg-white/5 hover:border-white/10"
            )}
          >
            <div className={cn(
              "w-9 h-9 tablet:w-14 tablet:h-14 rounded-lg tablet:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0",
              visibility === option.id ? "bg-primary text-white" : "bg-white/5 text-muted-foreground group-hover:text-foreground"
            )}>
              <option.icon size={18} className="tablet:w-7 tablet:h-7" />
            </div>
            <div className="space-y-0.5 tablet:space-y-2 min-w-0">
              <h4 className="text-sm tablet:text-xl font-bold">{option.title}</h4>
              <p className="text-[9px] tablet:text-sm text-muted-foreground leading-relaxed">{option.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="pt-4 tablet:pt-12 flex flex-col items-center gap-3 tablet:gap-6 px-4">
        <button
          onClick={handlePublish}
          disabled={isPublishing}
          className="bg-primary text-white px-6 tablet:px-12 py-3.5 tablet:py-5 rounded-xl tablet:rounded-[2rem] font-bold text-base tablet:text-xl shadow-2xl shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 tablet:gap-3 w-full sm:w-auto justify-center"
        >
          {isPublishing ? (
            <>
              <Loader2 size={18} className="animate-spin tablet:w-6 tablet:h-6" />
              Publishing...
            </>
          ) : (
            <>
              Publish Course
              <ArrowRight size={18} className="tablet:w-6 tablet:h-6" />
            </>
          )}
        </button>
        <p className="text-[9px] tablet:text-xs text-muted-foreground text-center">
          By publishing, you agree to our terms of service and instructor guidelines.
        </p>
      </div>
    </div>

  );
};
