import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Compass, PlusCircle, Shield, Sun, Moon, Download, Loader2 } from 'lucide-react';
import { useTheme } from '../store/ThemeContext';
import { DownloadProjectButton } from './DownloadProjectButton';

import { useAuth } from '../contexts/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform">
            <span className="text-primary-foreground font-bold text-xl">S</span>
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            SkillStudio
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link 
            to="/" 
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive('/') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid size={18} />
            Workspace
          </Link>
          <Link 
            to="/import" 
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive('/import') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <PlusCircle size={18} />
            Import Course
          </Link>
          {isAdmin && (
            <Link 
              to="/admin" 
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive('/admin') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Shield size={18} />
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <DownloadProjectButton />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-muted border border-border hover:bg-muted/80 transition-colors text-foreground"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </nav>
  );
};
