import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  courseTitle: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  courseTitle
}) => {
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
            className="relative w-full max-w-md bg-[#121826] border border-white/10 rounded-3xl p-6 tablet:p-8 shadow-2xl"
          >
            <div className="flex items-center gap-3 tablet:gap-4 mb-4 tablet:mb-6">
              <div className="w-10 h-10 tablet:w-12 tablet:h-12 bg-red-500/20 rounded-xl tablet:rounded-2xl flex items-center justify-center text-red-500">
                <AlertTriangle size={20} className="tablet:w-6 tablet:h-6" />
              </div>
              <div>
                <h3 className="text-lg tablet:text-xl font-bold">Delete Course</h3>
                <p className="text-muted-foreground text-[10px] tablet:text-sm uppercase tracking-widest font-bold">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl tablet:rounded-2xl p-3 tablet:p-4 mb-6 tablet:mb-8 border border-white/5">
              <p className="text-[10px] tablet:text-xs text-muted-foreground mb-1">Course Title</p>
              <p className="text-sm tablet:text-base font-medium text-foreground line-clamp-1">{courseTitle}</p>
            </div>

            <p className="text-xs tablet:text-sm text-muted-foreground mb-6 tablet:mb-8 leading-relaxed">
              Are you sure you want to delete this course? All progress, notes, and bookmarks will be permanently removed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 tablet:px-6 py-3 tablet:py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-foreground text-sm tablet:text-base font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-[1.5] px-4 tablet:px-6 py-3 tablet:py-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm tablet:text-base font-medium transition-colors shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
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
