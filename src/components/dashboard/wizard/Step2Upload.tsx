import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderUp, X, FileVideo, 
  CheckCircle2, Loader2, Play, Trash2, AlertCircle
} from 'lucide-react';
import { DraftMetadata, draftStore } from '../../../utils/draftStore';
import { parseLocalFolder } from '../../../utils/courseParser';
import { cn } from '../../../utils/cn';

interface Step2Props {
  data: DraftMetadata;
  onChange: (data: DraftMetadata) => void;
}

export const Step2Upload: React.FC<Step2Props> = ({ data, onChange }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    setIsUploading(true);
    setProgress(0);
    
    try {
      const parsed = parseLocalFolder(e.target.files);
      
      // Save files to IndexedDB
      const totalFiles = parsed.lessons.length;
      let savedCount = 0;

      const newLessons = await Promise.all(parsed.lessons.map(async (lesson: any) => {
        if (lesson.file) {
          await draftStore.saveFile(lesson.id, lesson.file);
          savedCount++;
          setProgress(Math.round((savedCount / totalFiles) * 100));
        }
        const { file, ...rest } = lesson;
        return rest;
      }));

      onChange({
        ...data,
        modules: parsed.modules,
        lessons: [...data.lessons, ...newLessons]
      });

      setIsUploading(false);
      setProgress(100);
    } catch (err: any) {
      alert(err.message);
      setIsUploading(false);
    }
  };

  const removeLesson = async (id: string) => {
    await draftStore.deleteFile(id);
    onChange({ ...data, lessons: data.lessons.filter(l => l.id !== id) });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 tablet:space-y-12">
      <div className="grid grid-cols-1 laptop:grid-cols-2 gap-6 tablet:gap-12">
        {/* Upload Zone */}
        <div className="space-y-4 tablet:space-y-8">
          <div 
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={cn(
              "relative aspect-video rounded-xl tablet:rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 tablet:gap-4 overflow-hidden group cursor-pointer",
              isUploading ? "border-primary bg-primary/5 pointer-events-none" : "border-white/10 bg-white/5 hover:border-white/20"
            )}
          >
            <div className="w-10 h-10 tablet:w-16 tablet:h-16 bg-white/5 rounded-lg tablet:rounded-[1.5rem] flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
              {isUploading ? <Loader2 size={20} className="animate-spin tablet:w-8 tablet:h-8" /> : <FolderUp size={20} className="tablet:w-8 tablet:h-8" />}
            </div>
            <div className="text-center px-4">
              <p className="text-[10px] tablet:text-sm font-bold mb-0.5 tablet:mb-1">
                {isUploading ? 'Uploading files...' : 'Drop course folder here'}
              </p>
              <p className="text-[8px] tablet:text-xs text-muted-foreground">or click to browse</p>
            </div>
            {isUploading && (
              <div className="absolute bottom-0 left-0 w-full h-1 tablet:h-1.5 bg-white/5">
                <motion.div 
                  className="h-full bg-primary shadow-[0_0_10px_rgba(0,245,160,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              // @ts-ignore
              webkitdirectory="" 
              directory="" 
              multiple 
              className="hidden" 
              onChange={handleLocalUpload}
            />
          </div>
        </div>

        {/* File List */}
        <div className="space-y-3 tablet:space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-[10px] tablet:text-xs font-bold uppercase tracking-widest text-muted-foreground block">
              Uploaded Files ({data.lessons.length})
            </label>
            {data.lessons.length > 0 && (
              <button 
                onClick={async () => {
                  if (confirm('Clear all uploaded files?')) {
                    await draftStore.clearFiles();
                    onChange({ ...data, lessons: [] });
                  }
                }}
                className="text-[10px] tablet:text-xs text-red-500 font-bold hover:text-red-400 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-2 tablet:space-y-3 max-h-[250px] tablet:max-h-[400px] overflow-y-auto pr-1 tablet:pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {data.lessons.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 tablet:py-12 border border-white/5 rounded-xl tablet:rounded-3xl bg-white/5"
                >
                  <AlertCircle size={20} className="tablet:w-8 tablet:h-8 mx-auto mb-2 tablet:mb-3 text-muted-foreground opacity-20" />
                  <p className="text-[10px] tablet:text-sm text-muted-foreground">No files uploaded yet.</p>
                </motion.div>
              ) : (
                data.lessons.map((lesson) => (
                  <motion.div 
                    key={lesson.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-2.5 tablet:p-4 bg-white/5 border border-white/5 rounded-lg tablet:rounded-2xl group hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-2.5 tablet:gap-4 min-w-0">
                      <div className="w-7 h-7 tablet:w-10 tablet:h-10 bg-primary/10 rounded-lg tablet:rounded-xl flex items-center justify-center text-primary flex-shrink-0">
                        <FileVideo size={14} className="tablet:w-5 tablet:h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] tablet:text-sm font-bold truncate">{lesson.title}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeLesson(lesson.id)}
                      className="p-1.5 tablet:p-2 text-muted-foreground hover:text-red-500 transition-colors laptop:opacity-0 laptop:group-hover:opacity-100"
                    >
                      <Trash2 size={12} className="tablet:w-4 tablet:h-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
