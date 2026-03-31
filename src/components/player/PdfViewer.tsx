import React, { useState, useEffect, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  Maximize, 
  Minimize,
  Download,
  FileText,
  ExternalLink,
  Search,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PdfViewerProps {
  src: string;
  title?: string;
  onComplete?: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ src, title, onComplete }) => {
  const [zoom, setZoom] = useState(() => {
    const savedZoom = localStorage.getItem('pdf-viewer-zoom');
    return savedZoom ? parseInt(savedZoom) : 100;
  });
  const [page, setPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('pdf-viewer-zoom', zoom.toString());
  }, [zoom]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = title || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openExternal = () => {
    window.open(src, '_blank');
  };

  const getIframeSrc = () => {
    if (src.startsWith('blob:')) return src;
    
    let baseUrl = src;
    const params: string[] = [];
    
    params.push('toolbar=0');
    params.push('navpanes=0');
    params.push('scrollbar=1');
    params.push('view=FitH');
    params.push(`page=${page}`);
    
    if (searchQuery) {
      params.push(`search=${encodeURIComponent(searchQuery)}`);
    }
    
    return `${baseUrl}#${params.join('&')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex flex-col w-full h-full bg-[#1a1a1a] rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 ring-1 ring-white/5"
    >
      {/* PDF Header/Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/40 backdrop-blur-md border-b border-white/5 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-red-500">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white truncate max-w-[200px] md:max-w-md">
              {title || 'PDF Document'}
            </h3>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">PDF Viewer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex items-center">
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 200, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="overflow-hidden mr-2"
                >
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search in PDF..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          // Force iframe reload with search param
                          setPage(page); 
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500/50"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={cn(
                "p-2.5 rounded-xl transition-all border border-white/5",
                isSearchOpen ? "bg-red-500/20 text-red-500 border-red-500/20" : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
              )}
              title="Search in PDF"
            >
              <Search size={18} />
            </button>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/5 mr-2">
            <button 
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"
              title="Previous Page"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-[10px] text-white/40 uppercase font-bold">Page</span>
              <input 
                type="number" 
                min={1}
                value={page}
                onChange={(e) => setPage(parseInt(e.target.value) || 1)}
                className="w-10 bg-transparent text-center text-xs font-bold text-white focus:outline-none"
              />
            </div>
            <button 
              onClick={() => setPage(prev => prev + 1)}
              className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"
              title="Next Page"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/5 mr-2">
            <button 
              onClick={() => setZoom(prev => Math.max(50, prev - 10))}
              className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            <span className="px-3 text-xs font-bold text-white/80 min-w-[60px] text-center">
              {zoom}%
            </span>
            <button 
              onClick={() => setZoom(prev => Math.min(300, prev + 10))}
              className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
          </div>

            <button 
              onClick={handleDownload}
              className="p-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-all border border-white/5"
              title="Download PDF"
            >
              <Download size={18} />
            </button>

            <button 
              onClick={openExternal}
              className="p-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-all border border-white/5"
              title="Open in New Tab"
            >
              <ExternalLink size={18} />
            </button>

          <button 
            onClick={toggleFullscreen}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-all border border-white/5"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
          
          {/* Completion button removed - handled by parent CoursePlayer */}
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 relative overflow-hidden bg-[#2a2a2a] flex justify-center">
        <div 
          className="w-full h-full transition-all duration-300 origin-top flex justify-center"
          style={{ 
            width: zoom > 100 ? `${zoom}%` : '100%',
            height: '100%'
          }}
        >
          <object
            data={getIframeSrc()}
            type="application/pdf"
            className="w-full h-full border-0 rounded-lg shadow-2xl bg-white"
          >
            <iframe
              src={getIframeSrc()}
              className="w-full h-full border-0 rounded-lg shadow-2xl bg-white"
              title={title}
            >
              <div className="flex flex-col items-center justify-center h-full gap-4 text-white p-8 text-center">
                <FileText size={48} className="text-red-500 opacity-50" />
                <p className="text-lg font-bold">Unable to display PDF</p>
                <p className="text-sm text-white/60">Your browser might not support viewing PDFs in this player.</p>
                <button 
                  onClick={openExternal}
                  className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all"
                >
                  Open in New Tab
                </button>
              </div>
            </iframe>
          </object>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
        <span>Interactive PDF Viewer</span>
        <span>Scroll to read • Use toolbar to zoom</span>
      </div>
    </div>
  );
};
