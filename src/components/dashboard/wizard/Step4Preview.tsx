import React from 'react';
import { motion } from 'motion/react';
import { Play, Clock, BookOpen, ChevronRight, Info } from 'lucide-react';
import { DraftMetadata } from '../../../utils/draftStore';
import { cn } from '../../../utils/cn';

interface Step4Props {
  data: DraftMetadata;
}

export const Step4Preview: React.FC<Step4Props> = ({ data }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 tablet:space-y-12 pb-8 tablet:pb-12">
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl tablet:rounded-2xl p-4 tablet:p-6 flex items-center gap-3 tablet:gap-4 text-amber-500">
        <Info size={20} className="tablet:w-6 tablet:h-6 flex-shrink-0" />
        <div>
          <p className="font-bold text-xs tablet:text-sm">Preview Mode</p>
          <p className="text-[10px] tablet:text-xs opacity-80">This is exactly how students will see your course after publishing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 tablet:gap-12">
        {/* Left: Course Content */}
        <div className="lg:col-span-2 space-y-8 tablet:space-y-12">
          {/* Hero Area */}
          <div className="space-y-4 tablet:space-y-6">
            <h1 className="text-2xl tablet:text-4xl font-bold tracking-tight">{data.title || 'Untitled Course'}</h1>
            <p className="text-muted-foreground leading-relaxed text-sm tablet:text-lg">
              {data.description || 'No description provided yet.'}
            </p>
            
            <div className="flex flex-wrap gap-4 tablet:gap-6">
              <div className="flex items-center gap-1.5 tablet:gap-2 text-[10px] tablet:text-sm font-bold text-muted-foreground">
                <BookOpen size={14} className="text-primary tablet:w-[18px] tablet:h-[18px]" />
                {data.lessons.length} Lessons
              </div>
              <div className="flex items-center gap-1.5 tablet:gap-2 text-[10px] tablet:text-sm font-bold text-muted-foreground">
                <Clock size={14} className="text-primary tablet:w-[18px] tablet:h-[18px]" />
                {data.lessons.length * 10} mins estimated
              </div>
              <div className="px-2.5 tablet:px-3 py-0.5 tablet:py-1 bg-primary/10 text-primary rounded-full text-[8px] tablet:text-[10px] font-bold uppercase tracking-widest border border-primary/20">
                {data.difficulty}
              </div>
            </div>
          </div>

          {/* Video Placeholder */}
          <div className="aspect-video bg-white/5 rounded-2xl tablet:rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center gap-3 tablet:gap-4 group cursor-pointer overflow-hidden relative">
            {data.thumbnail ? (
              <img src={data.thumbnail} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="Thumbnail" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
            )}
            <div className="w-12 h-12 tablet:w-20 tablet:h-20 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:scale-110 transition-all z-10">
              <Play size={20} fill="currentColor" className="tablet:w-8 tablet:h-8" />
            </div>
            <p className="text-[10px] tablet:text-sm font-bold z-10">Preview Sample Lesson</p>
          </div>

          {/* Curriculum */}
          <div className="space-y-4 tablet:space-y-8">
            <h3 className="text-lg tablet:text-2xl font-bold">Course Curriculum</h3>
            <div className="space-y-3 tablet:space-y-4">
              {data.modules.map((module, idx) => (
                <div key={module.id} className="glass rounded-2xl tablet:rounded-3xl border border-white/5 overflow-hidden">
                  <div className="px-4 tablet:px-6 py-3 tablet:py-4 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3 tablet:gap-4">
                      <span className="text-[10px] tablet:text-xs font-bold text-primary opacity-50">0{idx + 1}</span>
                      <h4 className="font-bold text-xs tablet:text-base">{module.title}</h4>
                    </div>
                    <ChevronDown size={14} className="text-muted-foreground tablet:w-[18px] tablet:h-[18px]" />
                  </div>
                  <div className="p-2 tablet:p-4 space-y-1 tablet:space-y-2">
                    {data.lessons.filter(l => l.moduleId === module.id).map(lesson => (
                      <div key={lesson.id} className="flex items-center justify-between p-2 tablet:p-3 hover:bg-white/5 rounded-lg tablet:rounded-xl transition-all group cursor-pointer">
                        <div className="flex items-center gap-2 tablet:gap-3">
                          <Play size={12} className="text-muted-foreground group-hover:text-primary tablet:w-3.5 tablet:h-3.5" />
                          <span className="text-[11px] tablet:text-sm font-medium">{lesson.title}</span>
                        </div>
                        <span className="text-[8px] tablet:text-[10px] text-muted-foreground font-bold uppercase">10:00</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6 tablet:space-y-8">
          <div className="glass p-6 tablet:p-8 rounded-2xl tablet:rounded-[2.5rem] border border-white/5 lg:sticky lg:top-8">
            <div className="aspect-video rounded-xl tablet:rounded-2xl overflow-hidden mb-4 tablet:mb-6 border border-white/10">
              {data.thumbnail ? (
                <img src={data.thumbnail} className="w-full h-full object-cover" alt="Thumbnail" />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center text-muted-foreground text-xs">
                  No Thumbnail
                </div>
              )}
            </div>
            
            <div className="space-y-4 tablet:space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] tablet:text-sm">Category</span>
                <span className="font-bold text-[11px] tablet:text-sm">{data.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] tablet:text-sm">Level</span>
                <span className="font-bold text-[11px] tablet:text-sm">{data.difficulty}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] tablet:text-sm">Language</span>
                <span className="font-bold text-[11px] tablet:text-sm">English</span>
              </div>
              
              <div className="pt-4 tablet:pt-6 border-t border-white/5">
                <button className="w-full bg-primary text-white py-3 tablet:py-4 rounded-xl tablet:rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all text-xs tablet:text-base">
                  Enroll in Course
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChevronDown = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m6 9 6 6 6-6"/>
  </svg>
);
