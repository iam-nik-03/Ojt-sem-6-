import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { 
  Send, 
  Sparkles, 
  X, 
  MessageSquare, 
  ChevronDown, 
  History,
  Lightbulb,
  BookOpen,
  HelpCircle,
  Code,
  RotateCcw,
  Loader2,
  Book,
  GraduationCap,
  Minus,
  Maximize2,
  GripHorizontal,
  Maximize,
  Move
} from 'lucide-react';
import Markdown from 'react-markdown';
import { GoogleGenAI as AssistantClient } from "@google/genai";
import { useTheme } from '../../store/ThemeContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface StudyAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  context: {
    courseName: string;
    moduleName: string;
    lessonTitle: string;
    getCurrentTime: () => number;
  };
}

const QUICK_SUGGESTIONS: any[] = [];
const STUDY_TOOLS: any[] = [];

export const StudyAssistant: React.FC<StudyAssistantProps> = ({ isOpen, onClose, context }) => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Window State Memory
  const [windowState, setWindowState] = useState(() => {
    const saved = localStorage.getItem('assistant_window_state');
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        x: 0,
        y: 0
      };
    }

    return saved ? JSON.parse(saved) : {
      width: 380,
      height: 500,
      x: window.innerWidth - 420,
      y: window.innerHeight - 560
    };
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Viewport Boundary Helper
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

  useEffect(() => {
    localStorage.setItem('assistant_window_state', JSON.stringify(windowState));
  }, [windowState]);
  
  const ASSISTANT_MODEL = "gemini-3-flash-preview";

  useEffect(() => {
    const savedHistory = localStorage.getItem(`assistant_history_${context.courseName}`);
    if (savedHistory) {
      try {
        setMessages(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load assistant history", e);
      }
    }
  }, [context.courseName]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`assistant_history_${context.courseName}`, JSON.stringify(messages));
    }
  }, [messages, context.courseName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Initialize client right before use to ensure up-to-date config
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key is not configured. Please check your environment variables.");
      }
      
      const assistantClient = new AssistantClient({ apiKey });

      const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      const contextString = `
Current Context:
Course: ${context.courseName}
Module: ${context.moduleName}
Lesson: ${context.lessonTitle}
Video Timestamp: ${formatTime(context.getCurrentTime())}
`;

      const systemInstruction = `You are a helpful study assistant for a student watching a course.
Your goal is to help the student understand the course content better.
When answering, follow this format:
1. Explanation: A simple and clear explanation of the concept.
2. Example: A short, practical example (use code blocks if relevant).
3. Key Takeaway: A brief summary of the most important point.

Context about the current lesson will be provided to you. Use it to give relevant answers.
If the student asks something unrelated to the course, politely guide them back to the topic.
Use Markdown for formatting, especially for code blocks.`;

      const response = await assistantClient.models.generateContent({
        model: ASSISTANT_MODEL,
        contents: [
          { role: 'user', parts: [{ text: contextString + "\n\nQuestion: " + text }] }
        ],
        config: {
          systemInstruction: systemInstruction,
        }
      });

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.text || "I'm sorry, I couldn't generate a response.",
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Assistant Error:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm("Clear chat history?")) {
      setMessages([]);
      localStorage.removeItem(`assistant_history_${context.courseName}`);
    }
  };

  const handleResize = (e: React.MouseEvent | React.TouchEvent, direction: 'right' | 'bottom' | 'corner') => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startWidth = windowState.width;
    const startHeight = windowState.height;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      setWindowState((prev: any) => {
        let newWidth = prev.width;
        let newHeight = prev.height;

        if (direction === 'right' || direction === 'corner') {
          newWidth = Math.max(320, startWidth + deltaX);
          // Viewport boundary check for width
          if (prev.x + newWidth > window.innerWidth) {
            newWidth = window.innerWidth - prev.x;
          }
        }

        if (direction === 'bottom' || direction === 'corner') {
          newHeight = Math.max(350, startHeight + deltaY);
          // Viewport boundary check for height
          if (prev.y + newHeight > window.innerHeight) {
            newHeight = window.innerHeight - prev.y;
          }
        }

        return { ...prev, width: newWidth, height: newHeight };
      });
    };

    const onEnd = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onEnd);
  };

  return (
    <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            drag={!isMaximized && !isMobile}
            dragControls={dragControls}
            dragConstraints={constraintsRef}
            dragElastic={0}
            dragMomentum={false}
            dragListener={false}
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: isMobile ? 0 : windowState.x,
              y: isMobile ? 0 : windowState.y,
              height: isMobile ? '100%' : (isMinimized ? 'auto' : (isMaximized ? 'calc(100vh - 48px)' : windowState.height)),
              width: isMobile ? '100%' : (isMinimized ? '280px' : (isMaximized ? 'calc(100vw - 48px)' : windowState.width)),
            }}
            onDragEnd={(_, info) => {
              if (isMobile) return;
              setWindowState((prev: any) => {
                const newX = clamp(prev.x + info.offset.x, 0, window.innerWidth - (isMinimized ? 280 : prev.width));
                const newY = clamp(prev.y + info.offset.y, 0, window.innerHeight - (isMinimized ? 64 : prev.height));
                return { ...prev, x: newX, y: newY };
              });
            }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
            style={{
              boxShadow: theme === 'dark' ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.1)'
            }}
            className={cn(
              "fixed top-0 left-0 border border-border flex flex-col shadow-2xl pointer-events-auto overflow-hidden transition-all duration-500 bg-card",
              isMinimized ? "rounded-2xl" : (isMobile ? "rounded-none" : "rounded-[2rem]")
            )}
          >
            {/* Header / Drag Handle */}
            <div 
              onPointerDown={(e) => !isMobile && dragControls.start(e)}
              className={cn(
                "p-4 border-b border-border flex items-center justify-between bg-card select-none",
                !isMobile && "cursor-grab active:cursor-grabbing"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 border border-blue-500/20">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-xs tracking-tight text-foreground">Study Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Context Aware</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!isMobile && (
                  <>
                    <button 
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all"
                    >
                      <Minus size={14} />
                    </button>
                    <button 
                      onClick={() => setIsMaximized(!isMaximized)}
                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all"
                    >
                      <Maximize size={14} />
                    </button>
                  </>
                )}
                <button 
                  onClick={onClose}
                  className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-8 course-sidebar-scroll min-h-0 bg-card">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-6">
                      <div className="w-16 h-16 bg-muted rounded-[2rem] flex items-center justify-center text-muted-foreground border border-border">
                        <MessageSquare size={32} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm mb-1 text-foreground">How can I help?</h4>
                        <p className="text-[11px] text-muted-foreground max-w-[200px] mx-auto">
                          Ask me about <strong>{context.lessonTitle}</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[90%]",
                        msg.role === 'user' ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div className={cn(
                        "p-4 rounded-2xl text-xs leading-relaxed transition-all",
                        msg.role === 'user' 
                          ? "bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white font-medium shadow-[0_2px_6px_rgba(0,0,0,0.08)]" 
                          : "bg-muted border border-border text-foreground p-5"
                      )}>
                        <div className={cn(
                          "markdown-body prose prose-sm max-w-none text-[11px] leading-relaxed",
                          msg.role === 'user' ? "prose-invert" : (theme === 'dark' ? "prose-invert" : "prose-slate")
                        )}>
                          <Markdown
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-foreground font-bold mt-4 mb-2" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-foreground font-bold mt-3 mb-1" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-foreground font-bold mt-2 mb-1" {...props} />,
                              code: ({node, ...props}) => <code className="bg-background/50 px-1 rounded font-mono text-foreground" {...props} />,
                              pre: ({node, ...props}) => <pre className="bg-background/50 p-3 rounded-lg font-mono text-foreground overflow-x-auto my-2" {...props} />
                            }}
                          >
                            {msg.content}
                          </Markdown>
                        </div>
                      </div>
                      <span className="text-[9px] text-muted-foreground mt-1.5 font-bold uppercase tracking-widest">
                        {msg.role === 'user' ? 'You' : 'Assistant'}
                      </span>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex flex-col items-start max-w-[90%]">
                      <div className="p-3 rounded-2xl bg-muted border border-border rounded-tl-none flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin text-blue-600" />
                        <span className="text-[11px] text-muted-foreground animate-pulse">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-5 border-t border-border bg-card space-y-4 relative">
                  <div className="relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Ask a question..."
                      className="w-full bg-card border border-border rounded-xl py-3 pl-3 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 min-h-[44px] max-h-[120px] tablet:max-h-[80px] resize-none transition-all"
                    />
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 bottom-2 p-1.5 bg-[#2563EB] text-white rounded-xl hover:bg-[#1D4ED8] transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Send size={14} />
                    </button>
                  </div>

                  {/* Resize Handles */}
                  {!isMaximized && !isMinimized && !isMobile && (
                    <>
                      {/* Right edge */}
                      <div 
                        onMouseDown={(e) => handleResize(e, 'right')}
                        className="absolute top-0 right-0 w-1.5 h-full cursor-ew-resize hover:bg-foreground/5 transition-colors"
                      />
                      {/* Bottom edge */}
                      <div 
                        onMouseDown={(e) => handleResize(e, 'bottom')}
                        className="absolute bottom-0 left-0 w-full h-1.5 cursor-ns-resize hover:bg-foreground/5 transition-colors"
                      />
                      {/* Corner */}
                      <div 
                        onMouseDown={(e) => handleResize(e, 'corner')}
                        onTouchStart={(e) => handleResize(e, 'corner')}
                        className="absolute bottom-1 right-1 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 group z-10"
                      >
                        <div className="w-2 h-2 border-r-2 border-b-2 border-border group-hover:border-muted-foreground/50 transition-colors rounded-br-[2px]" />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
