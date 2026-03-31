import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { FileStoreProvider } from './store/FileStore';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './store/ThemeContext';
import { SidebarProvider } from './store/SidebarContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load pages
const Workspace = lazy(() => import('./pages/Workspace').then(m => ({ default: m.Workspace })));
const CoursePlayer = lazy(() => import('./pages/CoursePlayer').then(m => ({ default: m.CoursePlayer })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function BlockedScreen() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full glass p-8 rounded-2xl text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Account Blocked</h1>
        <p className="text-muted-foreground mb-6">Your account has been blocked by an administrator. Please contact support if you believe this is a mistake.</p>
        <button 
          onClick={() => signOut()}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading, user } = useAuth();
  
  if (loading) return null;
  if (!user || !isAdmin) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  const { isBlocked, loading, user, profile } = useAuth();
  const isPlayer = location.pathname.startsWith('/course/');

  // If we have a user and profile (even if still loading auth state), 
  // we can show the UI to avoid the "flash of loading"
  const showContent = !loading || (user && profile);

  if (!showContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && isBlocked) {
    return <BlockedScreen />;
  }

  if (isPlayer) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/course/:id" element={<CoursePlayer />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      <div className="flex-1 laptop:ml-72 relative">
        <Header />
        <main className="pt-20 laptop:pt-24 min-h-[calc(100vh-5rem)] laptop:min-h-[calc(100vh-6rem)]">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* All Routes are now public */}
              <Route path="/" element={<Workspace />} />
              <Route path="/courses" element={<Workspace />} />
              <Route path="/progress" element={<Workspace />} />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/import" element={<Workspace />} />
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              <Route path="/admin/dashboard" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <FileStoreProvider>
            <Router>
              <SidebarProvider>
                <AppRoutes />
              </SidebarProvider>
            </Router>
          </FileStoreProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
