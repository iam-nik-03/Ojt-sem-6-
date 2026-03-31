import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, 
  Library, 
  BarChart3, 
  User, 
  LogOut,
  Zap,
  X,
  Settings,
  Shield
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useSidebar } from '../store/SidebarContext';
import { useAuth } from '../contexts/AuthContext';
import { DownloadProjectButton } from './DownloadProjectButton';

const navItems = [
  { icon: LayoutGrid, label: 'Workspace', path: '/' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { isOpen, close } = useSidebar();
  const { signOut, user, isAdmin } = useAuth();

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] laptop:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed left-0 top-0 bottom-0 w-72 bg-card/50 backdrop-blur-2xl border-r border-border/50 z-[70] flex flex-col transition-all duration-500 laptop:translate-x-0",
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="p-8 laptop:p-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 group" onClick={close}>
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 group-hover:scale-110 transition-all duration-500 group-hover:rotate-6">
              <Zap size={24} className="text-primary-foreground fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight leading-none mb-1 text-foreground">
                SkillStudio
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                Learning Hub
              </span>
            </div>
          </Link>
          <button 
            onClick={close}
            className="laptop:hidden p-2.5 hover:bg-muted rounded-xl transition-all active:scale-90"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 px-6 space-y-1.5 overflow-y-auto course-sidebar-scroll">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={close}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                  active 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <item.icon 
                  size={20} 
                  className={cn(
                    "transition-all duration-300 relative z-10",
                    active ? "scale-110" : "group-hover:scale-110"
                  )} 
                />
                <span className="font-bold text-sm tracking-wide relative z-10">{item.label}</span>
                
                {!active && (
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              to="/admin"
              onClick={close}
              className={cn(
                "flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                location.pathname === '/admin'
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Shield size={20} className={cn(
                "transition-all duration-300 relative z-10",
                location.pathname === '/admin' ? "scale-110" : "group-hover:scale-110"
              )} />
              <span className="font-bold text-sm tracking-wide relative z-10">Admin Panel</span>
              {location.pathname !== '/admin' && (
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </Link>
          )}
        </nav>

        {user && (
          <div className="p-6 border-t border-border/50 space-y-4">
            <div className="px-5">
              <DownloadProjectButton />
            </div>
            <button
              onClick={() => {
                signOut();
                close();
              }}
              className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-destructive hover:bg-destructive/10 transition-all duration-300 group"
            >
              <LogOut size={20} className="group-hover:scale-110 transition-transform" />
              <span className="font-bold text-sm tracking-wide">Sign Out</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
