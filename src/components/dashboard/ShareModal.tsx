import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Globe, Lock, Link as LinkIcon, Users } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  courseId: string;
  isPublic: boolean;
  onTogglePublic: (isPublic: boolean) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  courseTitle,
  courseId,
  isPublic,
  onTogglePublic
}) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/course/${courseId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-500">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Share Course</h3>
                <p className="text-muted-foreground text-sm">Invite others to learn with you.</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Visibility Toggle */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {isPublic ? (
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
                        <Globe size={20} />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500">
                        <Lock size={20} />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm">{isPublic ? 'Public Access' : 'Private Access'}</p>
                      <p className="text-xs text-muted-foreground">
                        {isPublic ? 'Anyone with the link can view' : 'Only you can view this course'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onTogglePublic(!isPublic)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                      isPublic ? 'bg-emerald-500' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                        isPublic ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Link Copy */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                  Course Link
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-muted-foreground truncate flex items-center gap-2">
                    <LinkIcon size={14} />
                    {shareUrl}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="bg-primary text-white px-4 py-3 rounded-xl hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center min-w-[100px]"
                  >
                    {copied ? (
                      <Check size={18} className="animate-in zoom-in" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Copy size={18} />
                        <span className="font-bold text-sm">Copy</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Invite Options */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                    <Users size={20} />
                  </div>
                  <span className="text-xs font-bold">Invite Only</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                    <LinkIcon size={20} />
                  </div>
                  <span className="text-xs font-bold">Public Link</span>
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
