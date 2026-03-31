import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  Monitor,
  CheckCircle2,
  Gauge,
  Layers,
  Youtube,
  Download,
  CloudOff,
  Cloud,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { videoCache } from '../../utils/videoCache';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { extractYoutubeVideoId } from '../../utils/youtube';

export interface VideoPlayerHandle {
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isPaused: () => boolean;
  play: () => void;
  pause: () => void;
}

interface VideoPlayerProps {
  src?: string;
  youtubeId?: string;
  drive_id?: string;
  onComplete?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onDurationLoaded?: (duration: number) => void;
  initialTime?: number;
  autoPlayNext?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  title?: string;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(({
  src,
  youtubeId,
  drive_id,
  onComplete,
  onProgress,
  onDurationLoaded,
  initialTime = 0,
  autoPlayNext = false,
  onNext,
  onPrevious,
  title
}, ref) => {
  const effectiveYoutubeId = youtubeId || extractYoutubeVideoId(src || '');
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (videoRef.current) videoRef.current.currentTime = time;
    },
    getCurrentTime: () => videoRef.current?.currentTime || 0,
    getDuration: () => videoRef.current?.duration || 0,
    isPaused: () => videoRef.current?.paused ?? true,
    play: () => {
      if (!isReady) {
        const playOnReady = () => {
          videoRef.current?.play().catch(e => console.error("Play failed after ready:", e));
          videoRef.current?.removeEventListener('canplay', playOnReady);
        };
        videoRef.current?.addEventListener('canplay', playOnReady);
        return;
      }
      const playPromise = videoRef.current?.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Video playback failed:", error);
        });
      }
    },
    pause: () => videoRef.current?.pause(),
  }));
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    const saved = localStorage.getItem("videoPlaybackSpeed");
    return saved ? parseFloat(saved) : 1;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [quality, setQuality] = useState('Auto');
  const [isPiP, setIsPiP] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [feedback, setFeedback] = useState<'play' | 'pause' | 'rewind' | 'forward' | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTime = useRef(0);

  const triggerFeedback = (type: 'play' | 'pause' | 'rewind' | 'forward') => {
    setFeedback(type);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 500);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        if (!isReady) return; // Don't play if not ready
        videoRef.current.play().catch(error => {
          console.error("Video playback failed:", error);
        });
        triggerFeedback('play');
      } else {
        videoRef.current.pause();
        triggerFeedback('pause');
      }
    }
  }, [isReady]);

  const skip = useCallback((amount: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += amount;
      triggerFeedback(amount > 0 ? 'forward' : 'rewind');
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
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

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (error) {
      console.error('PiP failed', error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(5);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-5);
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, toggleFullscreen, toggleMute]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (onProgress) onProgress(video.currentTime, video.duration);
      
      // Auto-completion logic removed as per requirements
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsReady(true);
      video.playbackRate = playbackSpeed;
      if (onDurationLoaded) onDurationLoaded(video.duration);
      if (initialTime > 0) {
        video.currentTime = initialTime;
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: any) => {
      if (!src) return;
      console.error("Video element error:", video.error);
      
      // If we have a GDrive ID and the direct stream fails, try the embed fallback
      if (drive_id || src.includes('/api/stream/')) {
        setUseEmbedFallback(true);
        setError(null);
      } else {
        setError("The video could not be loaded. Check your connection or file format.");
      }
    };

    const handleCanPlay = () => {
      setError(null);
      setIsReady(true);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [src, onProgress, onComplete, onDurationLoaded, initialTime, autoPlayNext, onNext, isCompleted]);

  useEffect(() => {
    setUseEmbedFallback(false);
    setError(null);
    setIsReady(false);
    setIsPrivate(false);
  }, [src]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const handleInteraction = (e: React.MouseEvent) => {
    // If clicking on controls, don't trigger play/pause
    if ((e.target as HTMLElement).closest('.player-controls')) return;

    const now = Date.now();
    const DOUBLE_CLICK_DELAY = 300;
    
    if (now - lastClickTime.current < DOUBLE_CLICK_DELAY) {
      // Double click detected
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        if (x < rect.width / 2) {
          skip(-10);
        } else {
          skip(10);
        }
      }
      lastClickTime.current = 0;
    } else {
      // Single click potential
      lastClickTime.current = now;
      setTimeout(() => {
        if (lastClickTime.current === now) {
          togglePlay();
        }
      }, DOUBLE_CLICK_DELAY);
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleCache = async () => {
    if (!src || effectiveYoutubeId || isCached || isCaching) return;
    setIsCaching(true);
    videoCache.precache(src);
    
    // The Service Worker will send a CACHE_STATUS message when done
    // but we can also poll or just wait.
  };

  useEffect(() => {
    if (!src || effectiveYoutubeId) {
      setIsCached(false);
      return;
    }

    const checkCache = async () => {
      const cached = await videoCache.isCached(src);
      setIsCached(cached);
    };

    checkCache();

    // Listen for cache status updates from SW
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'CACHE_STATUS' && event.data.url === src) {
        setIsCached(event.data.isCached);
        if (event.data.isCached) setIsCaching(false);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, [src, effectiveYoutubeId]);

  const getEmbedUrl = (url: string | undefined, id?: string) => {
    if (id) {
      return `https://drive.google.com/file/d/${id}/preview`;
    }
    if (!url) return '';
    // Extract ID from various GDrive URL formats
    const idMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                    url.match(/id=([a-zA-Z0-9_-]+)/) ||
                    url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
    }
    return url;
  };

  const [hasError, setHasError] = useState(false);

  const handleYoutubeError = () => {
    setHasError(true);
    setError("Failed to load YouTube video. Please check your connection or the video URL.");
  };

  return (
    <div 
      ref={containerRef}
      className="relative group aspect-video bg-background rounded-[2rem] overflow-hidden shadow-2xl border border-border ring-1 ring-border select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={handleInteraction}
    >
      {effectiveYoutubeId ? (
        <div className="w-full h-full relative bg-black">
          {hasError ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <CloudOff size={32} className="text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Video Unavailable</h3>
                <p className="text-sm text-white/60 max-w-md">
                  This video could not be loaded. It might be private, deleted, or your connection might be blocked.
                </p>
              </div>
              <button 
                onClick={() => {
                  setHasError(false);
                  setError(null);
                }}
                className="px-6 py-2 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-colors"
              >
                Retry Loading
              </button>
            </div>
          ) : (
            <>
              <iframe
                src={`https://www.youtube.com/embed/${effectiveYoutubeId}?autoplay=1&rel=0${initialTime > 0 ? `&start=${Math.floor(initialTime)}` : ''}`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => {
                  setError(null);
                  setIsReady(true);
                }}
                onError={handleYoutubeError}
              />
              <div className="absolute top-4 left-4 bg-background/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border flex items-center gap-2 text-[10px] font-bold text-foreground/70 uppercase tracking-widest pointer-events-none">
                <Youtube size={12} className="text-red-500" />
                YouTube Player
              </div>
            </>
          )}
        </div>
      ) : useEmbedFallback ? (
        <div className="w-full h-full relative">
          <iframe
            src={getEmbedUrl(src, drive_id)}
            className="w-full h-full border-0"
            allow="autoplay"
            onLoad={() => {
              setError(null);
              setIsReady(true);
            }}
          />
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 text-[10px] font-bold text-white/70 uppercase tracking-widest pointer-events-none">
            <Layers size={12} className="text-primary" />
            Google Drive Player (Fallback)
          </div>
        </div>
      ) : (src ? (
        <video 
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          playsInline
          preload="metadata"
          onLoadStart={() => setError(null)}
        />
      ) : null)}

      {/* Error Overlay */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-500/30">
              <VolumeX size={40} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Playback Error</h3>
            <p className="text-foreground/60 max-w-md mb-8">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-muted/80 hover:bg-muted text-foreground rounded-2xl font-bold transition-all border border-border"
            >
              Reload Player
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Feedback Icons */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
          >
            <div className="w-20 h-20 bg-background/40 backdrop-blur-md rounded-full flex items-center justify-center text-foreground border border-border">
              {feedback === 'play' && <Play size={32} fill="currentColor" />}
              {feedback === 'pause' && <Pause size={32} fill="currentColor" />}
              {feedback === 'rewind' && <RotateCcw size={32} />}
              {feedback === 'forward' && <RotateCw size={32} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Overlay */}
      {!useEmbedFallback && (
        <motion.div 
          initial={false}
          animate={{ 
            opacity: showControls ? 1 : 0, 
          }}
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 flex flex-col justify-end pointer-events-none z-30"
        >
          <div className={cn(
            "w-full px-6 pb-6 pt-12 transition-transform duration-300 pointer-events-auto player-controls",
            showControls ? "translate-y-0" : "translate-y-4"
          )}>
            {/* Progress Bar Container */}
            <div 
              className="relative w-full mb-4 group/progress h-6 flex items-center cursor-pointer"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = Math.max(0, Math.min(1, x / rect.width));
                setHoverTime(percent * duration);
                setHoverX(x);
              }}
              onMouseLeave={() => setHoverTime(null)}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = Math.max(0, Math.min(1, x / rect.width));
                if (videoRef.current) {
                  videoRef.current.currentTime = percent * duration;
                }
              }}
            >
              {/* Hover Preview */}
              <AnimatePresence>
                {hoverTime !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-full mb-2 bg-black/90 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg text-[10px] font-mono text-white pointer-events-none"
                    style={{ left: hoverX, transform: 'translateX(-50%)' }}
                  >
                    {formatTime(hoverTime)}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative w-full h-1.5 group-hover/progress:h-2.5 bg-white/10 rounded-full overflow-hidden transition-all duration-200">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_15px_rgba(0,255,163,0.5)]"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              
              {/* Scrub handle */}
              <motion.div 
                className="absolute w-4 h-4 bg-white rounded-full shadow-xl border-2 border-primary opacity-0 group-hover/progress:opacity-100 transition-opacity z-10 pointer-events-none"
                style={{ left: `calc(${(currentTime / duration) * 100}% - 8px)` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-6">
                {/* Play/Pause */}
                <button 
                  onClick={togglePlay}
                  className="p-2 text-white hover:text-primary transition-all active:scale-90 hover:scale-110"
                >
                  {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                </button>

                {/* Skip Back/Forward */}
                <button 
                  onClick={() => skip(-10)}
                  className="p-2 text-white/80 hover:text-white transition-colors active:scale-90"
                  title="Backward 10s"
                >
                  <RotateCcw size={20} />
                </button>
                <button 
                  onClick={() => skip(10)}
                  className="p-2 text-white/80 hover:text-white transition-colors active:scale-90"
                  title="Forward 10s"
                >
                  <RotateCw size={20} />
                </button>

                {/* Next Lesson */}
                <button 
                  onClick={onNext}
                  className="p-2 text-white/80 hover:text-white disabled:opacity-30 active:scale-90"
                  disabled={!onNext}
                  title="Next Lesson"
                >
                  <SkipForward size={20} fill="currentColor" />
                </button>

                {/* Volume */}
                <div className="flex items-center gap-0 group/volume">
                  <button 
                    onClick={toggleMute}
                    className="p-2 text-white/80 hover:text-white transition-colors"
                  >
                    {isMuted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
                  </button>
                  <div className="w-0 group-hover/volume:w-20 overflow-hidden transition-all duration-300 flex items-center">
                    <input 
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-white/20 appearance-none cursor-pointer rounded-full accent-primary"
                    />
                  </div>
                </div>

                {/* Time Display */}
                <div className="ml-2 text-xs font-medium text-white/90 font-sans">
                  <span>{formatTime(currentTime)}</span>
                  <span className="mx-1 text-white/40">/</span>
                  <span>{formatTime(duration)}</span>
                </div>

                {/* Cache Button removed */}
              </div>

              <div className="flex items-center gap-1 md:gap-2">
                {/* Speed Selector */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setShowSpeedMenu(!showSpeedMenu);
                      setShowQualityMenu(false);
                    }}
                    className={cn(
                      "p-2 text-xs font-bold transition-all flex items-center gap-1",
                      showSpeedMenu ? "text-primary" : "text-white/80 hover:text-white"
                    )}
                  >
                    <Gauge size={18} />
                    <span className="hidden sm:inline">{playbackSpeed}x</span>
                  </button>
                  <AnimatePresence>
                    {showSpeedMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-4 right-0 bg-black/90 backdrop-blur-xl border border-white/10 p-1 rounded-xl shadow-2xl min-w-[100px] z-50"
                      >
                        {[0.75, 1, 1.25, 1.5, 2].map(speed => (
                          <button 
                            key={speed}
                            onClick={() => {
                              if (videoRef.current) videoRef.current.playbackRate = speed;
                              setPlaybackSpeed(speed);
                              localStorage.setItem("videoPlaybackSpeed", speed.toString());
                              setShowSpeedMenu(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-left rounded-lg text-xs font-bold transition-all",
                              playbackSpeed === speed ? "bg-primary text-black" : "text-white/60 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            {speed === 1 ? 'Normal' : `${speed}x`}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* PiP */}
                <button 
                  onClick={togglePiP}
                  className="p-2 text-white/80 hover:text-white transition-colors active:scale-90"
                  title="Picture in Picture"
                >
                  <Monitor size={20} />
                </button>

                {/* Fullscreen */}
                <button 
                  onClick={toggleFullscreen}
                  className="p-2 text-white hover:text-primary transition-colors active:scale-90"
                >
                  {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Completion Indicator Overlay */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-8 right-8 bg-emerald-500 text-white px-4 py-2 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-2xl border border-emerald-400/30"
          >
            <CheckCircle2 size={18} />
            Lesson Completed
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
