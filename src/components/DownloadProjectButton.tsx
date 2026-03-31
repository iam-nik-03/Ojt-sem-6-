import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const DownloadProjectButton: React.FC = () => {
  const { isAdmin } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isAdmin) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/export/generate-doc', {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project-documentation.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(`Failed to download project documentation: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
    >
      {isDownloading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Download Project Code
        </>
      )}
    </button>
  );
};
