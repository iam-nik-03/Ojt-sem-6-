import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Settings,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface VideoPlayerProps {
  src: string;
  onEnded?: () => void;
  onNext?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  initialTime?: number;
  title?: string;
}

export const VideoPlayer = React.forwardRef<HTMLVideoElement, VideoPlayerProps>(({ 
  src, 
  onEnded, 
  onNext,
  onTimeUpdate,
  initialTime = 0,
  title
}, ref) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync local ref with forwarded ref
  useEffect(() => {
    if (!ref) return;
    if (typeof ref === 'function') {
      ref(localVideoRef.current);
    } else {
      ref.current = localVideoRef.current;
    }
  }, [ref]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [countdown, setCountdown] = useState(5);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = useCallback(() => {
    if (localVideoRef.current) {
      if (isPlaying) {
        localVideoRef.current.pause();
      } else {
        localVideoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const skip = useCallback((seconds: number) => {
    if (localVideoRef.current) {
      localVideoRef.current.currentTime += seconds;
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    
    switch (e.key.toLowerCase()) {
      case ' ':
        e.preventDefault();
        togglePlay();
        break;
      case 'arrowright':
        skip(10);
        break;
      case 'arrowleft':
        skip(-10);
        break;
      case 'f':
        toggleFullscreen();
        break;
    }
  }, [togglePlay, skip, toggleFullscreen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (localVideoRef.current && initialTime > 0) {
      localVideoRef.current.currentTime = initialTime;
    }
  }, [src, initialTime]);

  const handleTimeUpdate = () => {
    if (localVideoRef.current) {
      const current = localVideoRef.current.currentTime;
      const dur = localVideoRef.current.duration;
      setCurrentTime(current);
      setDuration(dur);
      onTimeUpdate?.(current, dur);
    }
  };

  const handleLoadedMetadata = () => {
    if (localVideoRef.current) {
      setDuration(localVideoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (localVideoRef.current) {
      localVideoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (localVideoRef.current) {
      localVideoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (localVideoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      localVideoRef.current.muted = newMuted;
      if (!newMuted && volume === 0) {
        setVolume(0.5);
        localVideoRef.current.volume = 0.5;
      }
    }
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, isMobile ? 5000 : 3000);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isEnded && autoPlayNext && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (isEnded && autoPlayNext && countdown === 0) {
      onNext?.();
    }
    return () => clearInterval(timer);
  }, [isEnded, autoPlayNext, countdown, onNext]);

  const handleVideoEnded = () => {
    setIsEnded(true);
    setIsPlaying(false);
    onEnded?.();
  };

  return (
    <div 
      ref={containerRef}
      className="relative group aspect-video bg-black rounded-2xl tablet:rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 ring-1 ring-white/5"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && !isMobile && setShowControls(false)}
      onTouchStart={handleMouseMove}
    >
      <video
        ref={localVideoRef}
        src={src}
        className="w-full h-full cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleVideoEnded}
        onPlay={() => { setIsPlaying(true); setIsEnded(false); }}
        onPause={() => setIsPlaying(false)}
        playsInline
      />

      {/* Auto Continue Overlay */}
      <AnimatePresence>
        {isEnded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <div className="text-center p-4 tablet:p-8 max-w-md w-full">
              <div className="w-16 h-16 tablet:w-20 tablet:h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4 tablet:mb-6">
                <CheckCircle2 size={32} className="tablet:w-10 tablet:h-10" />
              </div>
              <h3 className="text-xl tablet:text-2xl font-bold mb-1 tablet:mb-2">Lesson Completed!</h3>
              <p className="text-xs tablet:text-sm text-muted-foreground mb-6 tablet:mb-8">Great job on finishing this lesson.</p>
              
              <div className="flex flex-col gap-3 tablet:gap-4">
                {onNext && (
                  <button 
                    onClick={onNext}
                    className="w-full bg-primary text-black py-3.5 tablet:py-4 rounded-xl tablet:rounded-2xl text-sm tablet:text-base font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all active:scale-95"
                  >
                    Next Lesson {autoPlayNext && `(${countdown}s)`}
                    <ChevronRight size={18} className="tablet:w-5 tablet:h-5" />
                  </button>
                )}
                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[10px] tablet:text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <input 
                      type="checkbox" 
                      checked={autoPlayNext} 
                      onChange={(e) => setAutoPlayNext(e.target.checked)}
                      className="w-3.5 h-3.5 tablet:w-4 tablet:h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/50"
                    />
                    Autoplay next
                  </label>
                  <button 
                    onClick={() => {
                      if (localVideoRef.current) {
                        localVideoRef.current.currentTime = 0;
                        localVideoRef.current.play();
                        setIsEnded(false);
                      }
                    }}
                    className="text-[10px] tablet:text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
                  >
                    Replay
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Overlay */}
      <motion.div 
        initial={false}
        animate={{ opacity: showControls || !isPlaying ? 1 : 0, y: showControls || !isPlaying ? 0 : 10 }}
        className="absolute inset-x-0 bottom-0 z-30 p-3 tablet:p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"
      >
        <div className="pointer-events-auto space-y-2 tablet:space-y-4">
          {/* Progress Bar */}
          <div className="group/progress relative h-1 tablet:h-1.5 w-full bg-white/20 rounded-full cursor-pointer overflow-hidden">
            <input 
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="absolute inset-y-0 left-0 bg-primary transition-all duration-100"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 tablet:w-3 tablet:h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `${(currentTime / (duration || 1)) * 100}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 tablet:gap-4">
              <button 
                onClick={togglePlay}
                className="w-8 h-8 tablet:w-10 tablet:h-10 bg-white text-black rounded-lg tablet:rounded-xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
              >
                {isPlaying ? <Pause size={16} fill="currentColor" className="tablet:w-5 tablet:h-5" /> : <Play size={16} fill="currentColor" className="translate-x-0.5 tablet:w-5 tablet:h-5" />}
              </button>

              <div className="flex items-center gap-0.5 tablet:gap-1">
                <button onClick={() => skip(-10)} className="p-1.5 tablet:p-2 text-white/70 hover:text-white transition-colors">
                  <RotateCcw size={16} className="tablet:w-5 tablet:h-5" />
                </button>
                <button onClick={() => skip(10)} className="p-1.5 tablet:p-2 text-white/70 hover:text-white transition-colors">
                  <RotateCw size={16} className="tablet:w-5 tablet:h-5" />
                </button>
              </div>

              {!isMobile && (
                <div className="flex items-center gap-3 group/volume">
                  <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <div className="w-0 group-hover/volume:w-20 overflow-hidden transition-all duration-300 flex items-center">
                    <input 
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                    />
                  </div>
                </div>
              )}

              <div className="text-[10px] tablet:text-xs font-mono text-white/70">
                {formatTime(currentTime)} <span className="hidden sm:inline">/ {formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 tablet:gap-3">
              <div className="relative">
                <button 
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="px-2 tablet:px-3 py-1 tablet:py-1.5 bg-white/10 hover:bg-white/20 rounded-lg tablet:rounded-xl text-[10px] tablet:text-xs font-bold transition-colors flex items-center gap-1 text-white/90"
                >
                  {playbackSpeed}x <Settings size={12} className="tablet:w-3.5 tablet:h-3.5" />
                </button>
                <AnimatePresence>
                  {showSpeedMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full mb-2 right-0 bg-card border border-white/10 p-1.5 tablet:p-2 rounded-xl tablet:rounded-2xl shadow-2xl min-w-[80px] tablet:min-w-[100px] z-50"
                    >
                      {[0.5, 1, 1.5, 2].map(speed => (
                        <button 
                          key={speed}
                          onClick={() => {
                            if (localVideoRef.current) localVideoRef.current.playbackRate = speed;
                            setPlaybackSpeed(speed);
                            setShowSpeedMenu(false);
                          }}
                          className={cn(
                            "w-full px-3 tablet:px-4 py-1.5 tablet:py-2 text-left rounded-lg tablet:rounded-xl text-[10px] tablet:text-xs font-bold transition-colors",
                            playbackSpeed === speed ? "bg-primary text-black" : "hover:bg-white/5 text-white/70"
                          )}
                        >
                          {speed}x
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={toggleFullscreen}
                className="p-2 tablet:p-2.5 bg-white/10 hover:bg-white/20 rounded-lg tablet:rounded-xl transition-colors text-white/90"
              >
                {isFullscreen ? <Minimize size={16} className="tablet:w-[18px] tablet:h-[18px]" /> : <Maximize size={16} className="tablet:w-[18px] tablet:h-[18px]" />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>

  );
});
