import React from 'react';
import { motion } from 'motion/react';
import { User, Sun, Moon, Sparkles, Menu, Headphones, Download, Loader2 } from 'lucide-react';
import { useTheme } from '../store/ThemeContext';
import { useSidebar } from '../store/SidebarContext';
import { UserMenu } from './UserMenu';
import { DownloadProjectButton } from './DownloadProjectButton';
import { cn } from '../utils/cn';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { toggle } = useSidebar();

  return (
    <header className="fixed top-0 left-0 laptop:left-72 right-0 h-20 laptop:h-24 bg-background/80 backdrop-blur-xl border-b border-border/50 z-50 px-6 laptop:px-12 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggle}
          className="laptop:hidden p-3 hover:bg-muted rounded-2xl transition-all text-muted-foreground active:scale-90"
        >
          <Menu size={22} />
        </button>
        <div className="hidden laptop:block">
          <h1 className="text-xl font-bold tracking-tight text-foreground/90">
            Workspace
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 laptop:gap-8">
        <div className="hidden tablet:block">
          <DownloadProjectButton />
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="p-3 laptop:p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all text-foreground shadow-sm group"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun size={20} className="group-hover:rotate-45 transition-transform" />
          ) : (
            <Moon size={20} className="group-hover:-rotate-12 transition-transform" />
          )}
        </motion.button>

        <div className="hidden laptop:block h-10 w-px bg-border/50"></div>

        <UserMenu />
      </div>
    </header>
  );
};
