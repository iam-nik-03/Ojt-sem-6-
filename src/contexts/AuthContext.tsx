import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  isBlocked?: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isBlocked: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = '03xnik@gmail.com';
const PROFILE_CACHE_KEY = 'skillstudio_user_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;

    // Handle redirect result for Google Sign-In
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect Sign-In Error:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Sync with backend to set auth_token cookie
        try {
          await fetch('/api/auth/google-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: user.displayName,
              uid: user.uid,
              photoURL: user.photoURL
            })
          });
        } catch (err) {
          console.error("Backend sync error:", err);
        }

        const userDoc = doc(db, 'users', user.uid);
        
        // Setup real-time updates
        unsubProfile = onSnapshot(userDoc, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            setProfile(data);
            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
          } else {
            // Handle new user creation if profile doesn't exist
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'User',
              photoURL: user.photoURL || '',
              role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
              isBlocked: false,
              createdAt: new Date().toISOString()
            };
            setDoc(userDoc, newProfile).then(() => {
              setProfile(newProfile);
              localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(newProfile));
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile snapshot error:", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        localStorage.removeItem(PROFILE_CACHE_KEY);
        if (unsubProfile) unsubProfile();
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const isAdmin = profile?.email === ADMIN_EMAIL;
  const isBlocked = profile?.isBlocked === true;

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    
    // Create profile explicitly to ensure name is saved
    const userDoc = doc(db, 'users', result.user.uid);
    const newProfile: UserProfile = {
      uid: result.user.uid,
      email: email,
      displayName: name,
      photoURL: '',
      role: email === ADMIN_EMAIL ? 'admin' : 'user',
      isBlocked: false,
      createdAt: new Date().toISOString()
    };
    await setDoc(userDoc, newProfile);
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      // Handle specific error cases
      if (error.code === 'auth/popup-blocked') {
        console.warn("Google Sign-In: Popup blocked, falling back to redirect...");
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError: any) {
          throw new Error('Sign-in popup was blocked and redirect failed. Please allow popups for this site.');
        }
      } else if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, not a system error
        console.log("Google Sign-In: Popup closed by user.");
        return;
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Another popup request was made, not a system error
        console.log("Google Sign-In: Cancelled popup request.");
        return;
      } else {
        console.error("Google Sign-In Error:", error);
        if (error.code === 'auth/operation-not-allowed') {
          throw new Error('Google Sign-In is not enabled in the Firebase Console. Please enable it under Authentication > Sign-in method.');
        } else if (error.code === 'auth/unauthorized-domain') {
          throw new Error(`This domain (${window.location.hostname}) is not authorized for Firebase Authentication. Please add it to the "Authorized domains" list in the Firebase Console.`);
        } else if (error.code === 'auth/network-request-failed') {
          throw new Error('Network error. Please check your internet connection and try again.');
        } else {
          throw new Error(error.message || 'An unexpected error occurred during Google Sign-In');
        }
      }
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) throw new Error('No user logged in');
    
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await firebaseUpdatePassword(user, newPassword);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error("Backend logout error:", err);
    }
    localStorage.removeItem(PROFILE_CACHE_KEY);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin, 
      isBlocked, 
      signIn, 
      signUp, 
      signInWithGoogle, 
      resetPassword,
      updateUserPassword,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
