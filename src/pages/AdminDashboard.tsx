import React, { useEffect, useState } from 'react';
import { Users, Shield, Calendar, CheckCircle2, XCircle, Search, Ban, Unlock, LogOut, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  isBlocked?: boolean;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  blockedUsers: number;
  adminUsers: number;
}

export const AdminDashboard: React.FC = () => {
  const { signOut } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, blockedUsers: 0, adminUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as UserData[];
      
      setUsers(usersData);
      
      const newStats = {
        totalUsers: usersData.length,
        blockedUsers: usersData.filter(u => u.isBlocked).length,
        adminUsers: usersData.filter(u => u.email === '03xnik@gmail.com').length
      };
      setStats(newStats);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleBlockUser = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isBlocked: !currentStatus
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-5rem)] laptop:min-h-[calc(100vh-6rem)] bg-background p-4 tablet:p-6 laptop:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col laptop:flex-row laptop:items-center justify-between gap-6 mb-8 tablet:mb-12">
          <div className="flex flex-col tablet:flex-row tablet:items-center justify-between w-full gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Shield className="text-primary w-6 h-6" />
                </div>
                <h1 className="text-2xl tablet:text-3xl font-bold text-foreground">Admin Dashboard</h1>
              </div>
              <p className="text-sm tablet:text-base text-muted-foreground">Manage users and monitor platform activity</p>
            </div>

            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-destructive/10 text-destructive font-bold hover:bg-destructive/20 transition-all active:scale-95 w-fit"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 laptop:grid-cols-3 gap-4 tablet:gap-6 mb-8 tablet:mb-12">
          <div className="glass rounded-3xl p-6 border border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-3xl p-6 border border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Admins</p>
                <p className="text-2xl font-bold text-foreground">{stats.adminUsers}</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-3xl p-6 border border-border/50 sm:col-span-2 laptop:col-span-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Blocked Users</p>
                <p className="text-2xl font-bold text-foreground">{stats.blockedUsers}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative w-full laptop:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-muted/50 border border-border rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full transition-all"
            />
          </div>
        </div>

        <div className="glass rounded-[2rem] overflow-hidden shadow-xl border border-border/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">User Details</th>
                  <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Role</th>
                  <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Joined On</th>
                  <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <span className="text-muted-foreground font-medium">Loading user database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Search className="w-12 h-12 text-muted-foreground/20" />
                        <span className="text-muted-foreground font-medium">No users found matching your search.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, i) => (
                    <motion.tr 
                      key={u.uid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/10 group-hover:scale-105 transition-transform">
                            {u.displayName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <p className="font-bold text-foreground truncate">{u.displayName || 'Anonymous User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5",
                          u.email === '03xnik@gmail.com' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          {u.email === '03xnik@gmail.com' && <Shield size={10} />}
                          {u.email === '03xnik@gmail.com' ? 'admin' : 'user'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">
                        {u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.email !== '03xnik@gmail.com' && (
                          <button
                            onClick={() => toggleBlockUser(u.uid, !!u.isBlocked)}
                            className={cn(
                              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95",
                              u.isBlocked 
                                ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" 
                                : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                            )}
                          >
                            {u.isBlocked ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                Unblock
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5" />
                                Block
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
