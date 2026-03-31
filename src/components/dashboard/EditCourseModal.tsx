import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit3, Save } from 'lucide-react';
import { Course } from '../../types';

interface EditCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, newTitle: string, newThumbnail?: string) => void;
  course: Course | null;
}

export const EditCourseModal: React.FC<EditCourseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  course
}) => {
  const [title, setTitle] = useState('');
  const [thumbnail, setThumbnail] = useState<string | undefined>(undefined);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setThumbnail(course.thumbnail);
    }
  }, [course]);

  const handleSave = () => {
    if (course && title.trim()) {
      onSave(course.id, title.trim(), thumbnail);
      onClose();
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnail(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#121826] border border-white/10 rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                <Edit3 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Edit Course</h3>
                <p className="text-muted-foreground text-sm">Update course information.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 block">
                  Course Thumbnail
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl overflow-hidden cursor-pointer group hover:border-primary/50 transition-all"
                >
                  {thumbnail ? (
                    <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      <Edit3 size={32} className="mb-2" />
                      <span className="text-xs font-bold">Click to upload thumbnail</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Edit3 size={24} className="text-white" />
                  </div>
                </div>
                <input 
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbnailChange}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                  Course Title
                </label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="Enter course title..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-foreground font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!title.trim()}
                  className="flex-1 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Save size={18} />
                  Save Changes
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
