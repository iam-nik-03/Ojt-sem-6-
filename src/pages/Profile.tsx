import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  Shield, 
  Key, 
  LogOut, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Lock,
  Camera,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  History
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';

export const Profile: React.FC = () => {
  const { user, profile, signOut, updateUserPassword, resetPassword, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  if (!user || !profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <User size={40} className="text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Not Signed In</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          Please sign in to view and manage your profile settings.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          Go to Workspace
        </button>
      </div>
    );
  }

  const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateUserPassword(currentPassword, newPassword);
      setSuccess("Password updated successfully!");
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error("Password change error:", err);
      if (err.code === 'auth/wrong-password') {
        setError("Current password is incorrect");
      } else if (err.code === 'auth/requires-recent-login') {
        setError("Please sign out and sign in again to change your password.");
      } else {
        setError(err.message || "Failed to update password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user.email) return;
    setLoading(true);
    try {
      await resetPassword(user.email);
      setResetSent(true);
      setSuccess("Password reset email sent!");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 laptop:py-16">
      <div className="flex flex-col gap-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden bg-muted border-4 border-background shadow-2xl relative z-10">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={profile.displayName} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                    <User size={48} />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 z-20">
                <div className="p-2 bg-primary text-primary-foreground rounded-xl shadow-lg">
                  {isGoogleUser ? <Smartphone size={16} /> : <Mail size={16} />}
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                  {profile.displayName}
                </h1>
                {isAdmin && (
                  <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-muted-foreground font-medium flex items-center gap-2">
                <Mail size={16} />
                {profile.email}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-6 py-3 bg-destructive/10 text-destructive rounded-2xl font-bold hover:bg-destructive/20 transition-all active:scale-95"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Account Details Card */}
            <div className="glass rounded-3xl p-8 border border-border/50">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Account Security</h2>
                  <p className="text-sm text-muted-foreground">Manage your account access and security settings</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-background rounded-xl text-muted-foreground shadow-sm">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Login Provider</p>
                      <p className="font-bold text-foreground">{isGoogleUser ? 'Google Account' : 'Email & Password'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                    <CheckCircle2 size={14} />
                    Verified
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-background rounded-xl text-muted-foreground shadow-sm">
                      <History size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Member Since</p>
                      <p className="font-bold text-foreground">
                        {new Date(profile.createdAt).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Password Management */}
                <div className="pt-4">
                  {isGoogleUser ? (
                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-4">
                      <div className="p-2 bg-primary/10 text-primary rounded-xl mt-1">
                        <Lock size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground mb-1">Password Managed by Google</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Your account is secured via Google. You can manage your password and security settings directly in your Google Account dashboard.
                        </p>
                        <a 
                          href="https://myaccount.google.com/security" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-primary hover:underline"
                        >
                          Google Security Settings
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {!isChangingPassword ? (
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button 
                            onClick={() => setIsChangingPassword(true)}
                            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-muted hover:bg-muted/80 text-foreground rounded-2xl font-bold transition-all"
                          >
                            <Key size={18} />
                            Change Password
                          </button>
                          <button 
                            onClick={handleResetPassword}
                            disabled={loading || resetSent}
                            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 border border-border hover:bg-muted/30 text-foreground rounded-2xl font-bold transition-all disabled:opacity-50"
                          >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <RotateCcw size={18} />}
                            {resetSent ? 'Reset Email Sent' : 'Reset via Email'}
                          </button>
                        </div>
                      ) : (
                        <motion.form 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onSubmit={handlePasswordChange}
                          className="p-8 bg-muted/30 rounded-3xl border border-border/50 space-y-6"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold">Change Password</h3>
                            <button 
                              type="button"
                              onClick={() => setIsChangingPassword(false)}
                              className="text-sm font-bold text-muted-foreground hover:text-foreground"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Current Password</label>
                              <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                <input 
                                  type="password"
                                  required
                                  value={currentPassword}
                                  onChange={(e) => setCurrentPassword(e.target.value)}
                                  className="w-full bg-background border border-border/50 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                  placeholder="••••••••"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">New Password</label>
                                <div className="relative group">
                                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                  <input 
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-background border border-border/50 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    placeholder="••••••••"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Confirm New Password</label>
                                <div className="relative group">
                                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                  <input 
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-background border border-border/50 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    placeholder="••••••••"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <button 
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                          >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                            Update Password
                          </button>
                        </motion.form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            {/* Status Card */}
            <div className="glass rounded-3xl p-8 border border-border/50">
              <h3 className="text-lg font-bold mb-6">Account Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Verification</span>
                  <span className="text-sm font-bold text-green-500 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    Verified
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <span className="text-sm font-bold capitalize">{isAdmin ? 'Admin' : 'User'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Storage Usage</span>
                  <span className="text-sm font-bold">0.4 GB / 5 GB</span>
                </div>
                <div className="w-full bg-muted/50 h-2 rounded-full overflow-hidden mt-2">
                  <div className="bg-primary h-full w-[8%]" />
                </div>
              </div>
            </div>

            {/* Help Card */}
            <div className="glass rounded-3xl p-8 border border-border/50 bg-primary/5">
              <h3 className="text-lg font-bold mb-2">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                If you're having trouble with your account or have security concerns, our support team is here to help.
              </p>
              <button className="w-full py-3 bg-background border border-border/50 rounded-xl font-bold text-sm hover:bg-muted/50 transition-all">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 z-[100]"
          >
            <div className={cn(
              "px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border backdrop-blur-xl",
              error ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-green-500/10 border-green-500/20 text-green-500"
            )}>
              {error ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              <p className="font-bold text-sm">{error || success}</p>
              <button 
                onClick={() => { setError(null); setSuccess(null); }}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RotateCcw = ({ size, className }: { size: number, className?: string }) => (
  <History size={size} className={className} />
);

const X = ({ size, className }: { size: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
