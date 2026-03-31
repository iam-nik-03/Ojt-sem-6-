import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronLeft, ChevronRight, Save, Trash2, 
  Info, Upload, Layout, Eye, Send, CheckCircle2,
  AlertCircle, Loader2
} from 'lucide-react';
import { draftStore, DraftMetadata } from '../../utils/draftStore';
import { cn } from '../../utils/cn';

// Import Wizard Steps
import { Step1Info } from './wizard/Step1Info';
import { Step2Upload } from './wizard/Step2Upload';
import { Step3Organize } from './wizard/Step3Organize';
import { Step4Preview } from './wizard/Step4Preview';
import { Step5Publish } from './wizard/Step5Publish';

interface CourseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: () => void;
}

const STEPS = [
  { id: 1, title: 'Course Info', icon: Info },
  { id: 2, title: 'Upload Content', icon: Upload },
  { id: 3, title: 'Organize Modules', icon: Layout },
  { id: 4, title: 'Preview Course', icon: Eye },
  { id: 5, title: 'Publish', icon: Send },
];

export const CourseWizard: React.FC<CourseWizardProps> = ({ isOpen, onClose, onPublish }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [metadata, setMetadata] = useState<DraftMetadata>({
    title: '',
    description: '',
    category: 'Programming',
    difficulty: 'Beginner',
    thumbnail: null,
    currentStep: 1,
    lastSaved: Date.now(),
    modules: [],
    lessons: []
  });
  const [isRestored, setIsRestored] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const draft = draftStore.getMetadata();
    if (draft) {
      setMetadata(draft);
      setCurrentStep(draft.currentStep);
      setIsRestored(true);
      setTimeout(() => setIsRestored(false), 5000);
    }
  }, []);

  // Auto-save every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOpen) {
        draftStore.saveMetadata({ ...metadata, currentStep });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [metadata, currentStep, isOpen]);

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleDiscard = async () => {
    if (confirm('Are you sure you want to discard this draft? All progress will be lost.')) {
      await draftStore.clearAll();
      setMetadata({
        title: '',
        description: '',
        category: 'Programming',
        difficulty: 'Beginner',
        thumbnail: null,
        currentStep: 1,
        lastSaved: Date.now(),
        modules: [],
        lessons: []
      });
      setCurrentStep(1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 laptop:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 100 }}
        className="relative w-full h-[95vh] sm:h-[90vh] max-w-6xl bg-[#0B0F1A] border-t sm:border border-white/10 rounded-t-[2rem] sm:rounded-[2rem] laptop:rounded-[3rem] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-4 tablet:px-8 py-3.5 tablet:py-6 border-b border-white/5 flex items-center justify-between bg-[#121826]/50">
          <div className="flex items-center gap-3 tablet:gap-4">
            <div className="w-8 h-8 tablet:w-10 tablet:h-10 bg-primary/20 rounded-lg tablet:rounded-xl flex items-center justify-center text-primary">
              {React.createElement(STEPS[currentStep - 1].icon, { size: 18 })}
            </div>
            <div>
              <h2 className="text-base tablet:text-xl font-bold truncate max-w-[120px] sm:max-w-none">Create Course</h2>
              <p className="text-[8px] tablet:text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Step {currentStep}/{STEPS.length}: {STEPS[currentStep - 1].title}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 tablet:gap-4">
            <AnimatePresence>
              {isRestored && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="hidden sm:flex bg-emerald-500/10 text-emerald-500 px-3 tablet:px-4 py-1.5 tablet:py-2 rounded-lg tablet:rounded-xl text-[10px] tablet:text-xs font-bold items-center gap-2 border border-emerald-500/20"
                >
                  <CheckCircle2 size={12} />
                  Restored
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              onClick={onClose}
              className="p-1.5 tablet:p-2 hover:bg-white/5 rounded-lg tablet:rounded-xl text-muted-foreground transition-colors"
            >
              <X size={18} className="tablet:w-6 tablet:h-6" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/5 relative">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_10px_rgba(0,245,160,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 tablet:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              {currentStep === 1 && <Step1Info data={metadata} onChange={setMetadata} />}
              {currentStep === 2 && <Step2Upload data={metadata} onChange={setMetadata} />}
              {currentStep === 3 && <Step3Organize data={metadata} onChange={setMetadata} />}
              {currentStep === 4 && <Step4Preview data={metadata} />}
              {currentStep === 5 && <Step5Publish data={metadata} onPublish={onPublish} onClearDraft={async () => await draftStore.clearAll()} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-4 tablet:px-8 py-4 tablet:py-6 border-t border-white/5 bg-[#121826]/50 flex items-center justify-between">
          <button 
            onClick={handleDiscard}
            className="flex items-center gap-1.5 tablet:gap-2 text-red-500 hover:text-red-400 text-[10px] tablet:text-sm font-bold transition-colors"
          >
            <Trash2 size={14} className="tablet:w-[18px] tablet:h-[18px]" />
            <span className="hidden sm:inline">Discard Draft</span>
            <span className="sm:hidden">Discard</span>
          </button>

          <div className="flex items-center gap-2 tablet:gap-4">
            <AnimatePresence>
              {showToast && (
                <motion.span 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="hidden sm:flex text-[10px] tablet:text-xs text-muted-foreground font-bold items-center gap-2"
                >
                  <Loader2 size={12} className="animate-spin" />
                  Saved
                </motion.span>
              )}
            </AnimatePresence>
            
            {currentStep > 1 && (
              <button 
                onClick={handleBack}
                className="px-3 tablet:px-6 py-2 tablet:py-3 rounded-lg tablet:rounded-2xl bg-white/5 hover:bg-white/10 text-foreground text-[10px] tablet:text-sm font-bold transition-all flex items-center gap-1.5 tablet:gap-2"
              >
                <ChevronLeft size={14} className="tablet:w-[18px] tablet:h-[18px]" />
                Back
              </button>
            )}
            
            {currentStep < STEPS.length ? (
              <button 
                onClick={handleNext}
                className="px-5 tablet:px-8 py-2 tablet:py-3 rounded-lg tablet:rounded-2xl bg-primary text-white text-[10px] tablet:text-sm font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20 flex items-center gap-1.5 tablet:gap-2"
              >
                Next
                <ChevronRight size={14} className="tablet:w-[18px] tablet:h-[18px]" />
              </button>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
