import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { DraftMetadata } from '../../../utils/draftStore';
import { cn } from '../../../utils/cn';

interface Step1Props {
  data: DraftMetadata;
  onChange: (data: DraftMetadata) => void;
}

const CATEGORIES = ['Programming', 'Design', 'Marketing', 'Business', 'Music', 'Photography'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export const Step1Info: React.FC<Step1Props> = ({ data, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ ...data, thumbnail: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ ...data, thumbnail: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 tablet:space-y-12">
      <div className="grid grid-cols-1 laptop:grid-cols-2 gap-6 tablet:gap-12">
        {/* Left: General Info */}
        <div className="space-y-4 tablet:space-y-8">
          <div>
            <label className="text-[10px] tablet:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 tablet:mb-3 block">
              Course Title
            </label>
            <input 
              type="text" 
              value={data.title}
              onChange={(e) => onChange({ ...data, title: e.target.value })}
              placeholder="e.g. Learn Python for Data Science" 
              className="w-full bg-white/5 border border-white/10 rounded-xl tablet:rounded-2xl px-4 tablet:px-6 py-3 tablet:py-4 text-sm tablet:text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 tablet:mb-3">
              <label className="text-[10px] tablet:text-xs font-bold uppercase tracking-widest text-muted-foreground block">
                Description
              </label>
              <span className={cn(
                "text-[8px] tablet:text-[10px] font-bold",
                data.description.length > 450 ? "text-amber-500" : "text-muted-foreground"
              )}>
                {data.description.length} / 500
              </span>
            </div>
            <textarea 
              value={data.description}
              onChange={(e) => onChange({ ...data, description: e.target.value.slice(0, 500) })}
              placeholder="Describe what students will learn..." 
              rows={isMobile ? 3 : 4}
              className="w-full bg-white/5 border border-white/10 rounded-xl tablet:rounded-2xl px-4 tablet:px-6 py-3 tablet:py-4 text-xs tablet:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 tablet:gap-6">
            <div>
              <label className="text-[10px] tablet:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 tablet:mb-3 block">
                Category
              </label>
              <select 
                value={data.category}
                onChange={(e) => onChange({ ...data, category: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl tablet:rounded-2xl px-4 tablet:px-6 py-3 tablet:py-4 text-xs tablet:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] tablet:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 tablet:mb-3 block">
                Difficulty
              </label>
              <select 
                value={data.difficulty}
                onChange={(e) => onChange({ ...data, difficulty: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl tablet:rounded-2xl px-4 tablet:px-6 py-3 tablet:py-4 text-xs tablet:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
              >
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Right: Thumbnail Upload */}
        <div>
          <label className="text-[10px] tablet:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 tablet:mb-3 block">
            Course Thumbnail
          </label>
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "relative aspect-video rounded-xl tablet:rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 tablet:gap-4 overflow-hidden group",
              isDragging ? "border-primary bg-primary/5" : "border-white/10 bg-white/5 hover:border-white/20",
              data.thumbnail ? "border-none" : ""
            )}
          >
            {data.thumbnail ? (
              <>
                <img 
                  src={data.thumbnail} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 laptop:opacity-0 laptop:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 tablet:gap-4">
                  <button 
                    onClick={() => onChange({ ...data, thumbnail: null })}
                    className="p-2.5 tablet:p-3 bg-red-500 text-white rounded-xl tablet:rounded-2xl hover:bg-red-600 transition-all active:scale-95"
                  >
                    <X size={18} className="tablet:w-5 tablet:h-5" />
                  </button>
                  <label className="p-2.5 tablet:p-3 bg-primary text-white rounded-xl tablet:rounded-2xl hover:bg-primary/90 transition-all active:scale-95 cursor-pointer">
                    <Upload size={18} className="tablet:w-5 tablet:h-5" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleThumbnailUpload} />
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 tablet:w-16 tablet:h-16 bg-white/5 rounded-lg tablet:rounded-[1.5rem] flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <ImageIcon size={20} className="tablet:w-8 tablet:h-8" />
                </div>
                <div className="text-center px-4">
                  <p className="text-[10px] tablet:text-sm font-bold mb-0.5 tablet:mb-1">Drop thumbnail here</p>
                  <p className="text-[8px] tablet:text-xs text-muted-foreground">or click to browse</p>
                </div>
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                />
              </>
            )}
          </div>
          <p className="text-[8px] tablet:text-[10px] text-muted-foreground mt-2 tablet:mt-4 leading-relaxed">
            Recommended size: 1280x720px (16:9). Supported formats: JPG, PNG, WebP.
          </p>
        </div>
      </div>
    </div>
  );
};
