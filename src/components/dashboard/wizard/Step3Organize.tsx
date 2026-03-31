import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GripVertical, Plus, Trash2, Edit3, 
  ChevronDown, ChevronRight, Play, CheckCircle2,
  FolderOpen, Save, X
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DraftMetadata } from '../../../utils/draftStore';
import { cn } from '../../../utils/cn';

interface Step3Props {
  data: DraftMetadata;
  onChange: (data: DraftMetadata) => void;
}

const SortableLesson = ({ lesson, onRemove }: { lesson: any, onRemove: (id: string) => void, key?: any }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="flex items-center justify-between p-2 tablet:p-3 bg-white/5 border border-white/5 rounded-lg tablet:rounded-xl group hover:border-white/10 transition-all mb-2"
    >
      <div className="flex items-center gap-2 tablet:gap-3 min-w-0">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1.5 tablet:p-1">
          <GripVertical size={16} className="tablet:w-4 tablet:h-4" />
        </div>
        <div className="w-7 h-7 tablet:w-8 tablet:h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
          <Play size={12} className="tablet:w-3.5 tablet:h-3.5" />
        </div>
        <p className="text-[11px] tablet:text-sm font-medium truncate">{lesson.title}</p>
      </div>
      <button 
        onClick={() => onRemove(lesson.id)}
        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors laptop:opacity-0 laptop:group-hover:opacity-100"
      >
        <Trash2 size={14} className="tablet:w-4 tablet:h-4" />
      </button>
    </div>
  );
};

const ModuleSection = ({ 
  module, 
  lessons, 
  onRename, 
  onRemove, 
  onRemoveLesson 
}: { 
  module: any, 
  lessons: any[], 
  onRename: (id: string, name: string) => void,
  onRemove: (id: string) => void,
  onRemoveLesson: (id: string) => void,
  key?: any
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(module.title);

  const handleSave = () => {
    onRename(module.id, newName);
    setIsEditing(false);
  };

  return (
    <div className="glass rounded-2xl tablet:rounded-[2rem] border border-white/5 overflow-hidden mb-4 tablet:mb-6">
      <div className="px-4 tablet:px-6 py-3 tablet:py-4 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3 tablet:gap-4 flex-1 min-w-0">
          <div className="w-8 h-8 tablet:w-10 tablet:h-10 bg-primary/20 rounded-lg tablet:rounded-xl flex items-center justify-center text-primary flex-shrink-0">
            <FolderOpen size={18} className="tablet:w-5 tablet:h-5" />
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-lg px-2 tablet:px-3 py-1 text-xs tablet:text-sm focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-[120px] sm:max-w-xs"
                autoFocus
              />
              <button onClick={handleSave} className="p-1 tablet:p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all">
                <Save size={14} className="tablet:w-4 tablet:h-4" />
              </button>
              <button onClick={() => setIsEditing(false)} className="p-1 tablet:p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                <X size={14} className="tablet:w-4 tablet:h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 tablet:gap-3 min-w-0">
              <h4 className="font-bold text-sm tablet:text-lg truncate">{module.title}</h4>
              <button 
                onClick={() => setIsEditing(true)}
                className="p-1 tablet:p-1.5 text-muted-foreground hover:text-primary transition-all"
              >
                <Edit3 size={12} className="tablet:w-3.5 tablet:h-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 tablet:gap-4 ml-2">
          <span className="hidden sm:block text-[10px] tablet:text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {lessons.length} Lessons
          </span>
          <button 
            onClick={() => onRemove(module.id)}
            className="p-1.5 tablet:p-2 text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} className="tablet:w-[18px] tablet:h-[18px]" />
          </button>
        </div>
      </div>

      <div className="p-4 tablet:p-6 bg-[#0B0F1A]/50">
        <SortableContext items={lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {lessons.length === 0 ? (
            <div className="text-center py-6 tablet:py-8 border border-dashed border-white/10 rounded-xl tablet:rounded-2xl">
              <p className="text-[10px] tablet:text-xs text-muted-foreground">No lessons. Drag here.</p>
            </div>
          ) : (
            lessons.map(lesson => (
              <SortableLesson key={lesson.id} lesson={lesson} onRemove={onRemoveLesson} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

export const Step3Organize: React.FC<Step3Props> = ({ data, onChange }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // If dropped over another module or another lesson
    const activeLesson = data.lessons.find(l => l.id === activeId);
    if (!activeLesson) return;

    // Check if overId is a module ID
    const overModule = data.modules.find(m => m.id === overId);
    if (overModule) {
      const newLessons = data.lessons.map(l => 
        l.id === activeId ? { ...l, moduleId: overId } : l
      );
      onChange({ ...data, lessons: newLessons });
      return;
    }

    // Check if overId is a lesson ID
    const overLesson = data.lessons.find(l => l.id === overId);
    if (overLesson) {
      if (activeLesson.moduleId !== overLesson.moduleId) {
        const newLessons = data.lessons.map(l => 
          l.id === activeId ? { ...l, moduleId: overLesson.moduleId } : l
        );
        onChange({ ...data, lessons: newLessons });
      } else {
        const oldIndex = data.lessons.findIndex(l => l.id === activeId);
        const newIndex = data.lessons.findIndex(l => l.id === overId);
        const newLessons = arrayMove(data.lessons, oldIndex, newIndex);
        onChange({ ...data, lessons: newLessons });
      }
    }
  };

  const addModule = () => {
    const newModule = {
      id: crypto.randomUUID(),
      title: `New Module ${data.modules.length + 1}`,
      order: data.modules.length
    };
    onChange({ ...data, modules: [...data.modules, newModule] });
  };

  const renameModule = (id: string, title: string) => {
    onChange({
      ...data,
      modules: data.modules.map(m => m.id === id ? { ...m, title } : m)
    });
  };

  const removeModule = (id: string) => {
    if (confirm('Are you sure? Lessons in this module will be moved to default.')) {
      onChange({
        ...data,
        modules: data.modules.filter(m => m.id !== id),
        lessons: data.lessons.map(l => l.moduleId === id ? { ...l, moduleId: 'default' } : l)
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 tablet:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 tablet:mb-8">
        <div>
          <h3 className="text-xl tablet:text-2xl font-bold mb-1">Organize Your Course</h3>
          <p className="text-xs tablet:text-sm text-muted-foreground">Drag and drop lessons to organize them into modules.</p>
        </div>
        <button 
          onClick={addModule}
          className="bg-primary/10 text-primary px-4 tablet:px-6 py-2.5 tablet:py-3 rounded-xl tablet:rounded-2xl text-sm font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-2 border border-primary/20 w-full sm:w-auto"
        >
          <Plus size={18} />
          Add Module
        </button>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4 tablet:space-y-6">
          {data.modules.map((module) => (
            <ModuleSection 
              key={module.id}
              module={module}
              lessons={data.lessons.filter(l => l.moduleId === module.id)}
              onRename={renameModule}
              onRemove={removeModule}
              onRemoveLesson={(id) => onChange({ ...data, lessons: data.lessons.filter(l => l.id !== id) })}
            />
          ))}

          {/* Uncategorized Lessons */}
          {data.lessons.some(l => !data.modules.find(m => m.id === l.moduleId)) && (
            <ModuleSection 
              module={{ id: 'default', title: 'Uncategorized Lessons' }}
              lessons={data.lessons.filter(l => !data.modules.find(m => m.id === l.moduleId))}
              onRename={() => {}}
              onRemove={() => {}}
              onRemoveLesson={(id) => onChange({ ...data, lessons: data.lessons.filter(l => l.id !== id) })}
            />
          )}
        </div>
      </DndContext>
    </div>
  );
};
