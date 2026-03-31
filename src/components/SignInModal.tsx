import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, Chrome, Loader2, User, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

interface SignInModalProps {
  onClose: () => void;
}

type AuthView = 'signin' | 'signup' | 'forgot-password';

export const SignInModal: React.FC<SignInModalProps> = ({ onClose }) => {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [view, setView] = useState<AuthView>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (view === 'signup') {
        if (!name.trim()) throw new Error('Please enter your name');
        await signUp(email, password, name);
        onClose();
      } else if (view === 'signin') {
        await signIn(email, password);
        onClose();
      } else if (view === 'forgot-password') {
        await resetPassword(email);
        setSuccess('Password reset link sent to your email!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google sign in');
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    switch (view) {
      case 'signup':
        return { title: 'Create Account', subtitle: 'Join our community today' };
      case 'forgot-password':
        return { title: 'Reset Password', subtitle: 'Enter your email to get a reset link' };
      default:
        return { title: 'Welcome Back', subtitle: 'Sign in to your account' };
    }
  };

  const header = renderHeader();

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide rounded-[2.5rem] bg-card border border-border shadow-2xl"
        >
          <div className="p-8 sm:p-10 flex flex-col items-center text-center">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-2xl hover:bg-muted transition-all text-muted-foreground hover:text-foreground active:scale-90"
            >
              <X size={20} />
            </button>

            {view === 'forgot-password' && (
              <button
                onClick={() => setView('signin')}
                className="absolute top-6 left-6 p-2 rounded-2xl hover:bg-muted transition-all text-muted-foreground hover:text-foreground active:scale-90 flex items-center gap-2 text-sm font-medium"
              >
                <ArrowLeft size={18} />
              </button>
            )}

            <div className="mb-10">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 mx-auto">
                <Lock size={32} />
              </div>
              <h2 className="text-3xl font-bold text-foreground tracking-tight mb-2">
                {header.title}
              </h2>
              <p className="text-muted-foreground">
                {header.subtitle}
              </p>
            </div>

            {success && view === 'forgot-password' ? (
              <div className="w-full space-y-6 py-4">
                <div className="w-20 h-20 bg-secondary/10 rounded-3xl flex items-center justify-center text-secondary mx-auto mb-2">
                  <Mail size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">Check your email</h3>
                  <p className="text-muted-foreground">
                    We've sent a password reset link to <span className="text-foreground font-medium">{email}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSuccess(null);
                    setView('signin');
                  }}
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 w-full">
                {view === 'signup' && (
                  <div className="space-y-2 text-left">
                    <label className="text-sm font-semibold text-foreground/80 ml-1">
                      Full Name
                    </label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-muted/50 border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-left">
                  <label className="text-sm font-semibold text-foreground/80 ml-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-muted/50 border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>

                {view !== 'forgot-password' && (
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-sm font-semibold text-foreground/80">
                        Password
                      </label>
                      {view === 'signin' && (
                        <button
                          type="button"
                          onClick={() => setView('forgot-password')}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-muted/50 border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium"
                  >
                    {error}
                  </motion.div>
                )}

                {success && view !== 'forgot-password' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-secondary/10 border border-secondary/20 text-secondary text-sm font-medium"
                  >
                    {success}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : null}
                  {view === 'signup' ? 'Create Account' : view === 'forgot-password' ? 'Send Reset Link' : 'Sign In'}
                </button>
              </form>
            )}

            {view !== 'forgot-password' && (
              <>
                <div className="relative flex justify-center text-xs uppercase w-full my-10">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <span className="relative bg-card px-4 text-muted-foreground font-medium">
                    Or continue with
                  </span>
                </div>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-muted border border-border text-foreground font-bold hover:bg-muted/80 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <Chrome size={20} />
                  Google
                </button>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                  {view === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button
                    onClick={() => setView(view === 'signup' ? 'signin' : 'signup')}
                    className="text-primary font-bold hover:underline transition-all"
                  >
                    {view === 'signup' ? 'Sign In' : 'Sign Up'}
                  </button>
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
