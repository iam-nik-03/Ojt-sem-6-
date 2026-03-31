import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, LogOut, ChevronDown, LogIn, Shield, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SignInModal } from './SignInModal';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { DownloadProjectButton } from './DownloadProjectButton';

export const UserMenu: React.FC = () => {
  const { user, signOut, loading, isAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {!user ? (
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all active:scale-95"
        >
          <LogIn size={18} />
          Sign In
        </button>
      ) : (
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full rounded-lg object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={18} />
            )}
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
              {user.displayName || user.email?.split('@')[0]}
            </span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
              {user.email}
            </span>
          </div>
          <ChevronDown size={14} className={isDropdownOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      )}

      <AnimatePresence>
        {isModalOpen && <SignInModal onClose={() => setIsModalOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {isDropdownOpen && createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDropdownOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[280px] rounded-3xl bg-card border border-border shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 mx-auto mb-4">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full rounded-2xl object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={32} />
                  )}
                </div>
                <p className="text-lg font-bold text-foreground truncate">{user?.displayName || 'User'}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
              <div className="p-3 space-y-1">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-foreground hover:bg-primary/10 hover:text-primary transition-all text-sm font-bold"
                >
                  <User size={20} />
                  My Profile
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      navigate('/admin');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-foreground hover:bg-primary/10 hover:text-primary transition-all text-sm font-bold"
                  >
                    <Shield size={20} />
                    Admin Panel
                  </button>
                )}
                <div className="px-2 py-1">
                  <DownloadProjectButton />
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-destructive hover:bg-destructive/10 transition-all text-sm font-bold"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
};
