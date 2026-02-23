import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth, storage } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import { updateProfile } from 'firebase/auth';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Search, LogOut, MessageSquare, Moon, Sun, MoreVertical, User as UserIcon, Camera, X, Check, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserData {
  uid: string;
  displayName: string;
  photoURL: string;
  online: boolean;
  lastSeen: number;
  lastMessage?: string;
  lastMessageTime?: number;
}

const Users = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [uploading, setUploading] = useState(false);
  const { user, isDarkMode, toggleDarkMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setNewDisplayName(user.displayName || '');
    }
  }, [user]);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.values(data) as UserData[];
        setUsers(userList.filter(u => u.uid !== user?.uid));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const startChat = (otherUser: UserData) => {
    const chatId = [user?.uid, otherUser.uid].sort().join('_');
    navigate(`/chat/${chatId}`, { state: { otherUser } });
  };

  const filteredUsers = users.filter(u => 
    (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Header */}
      <header className="glass px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-start to-primary-end flex items-center justify-center text-white shadow-lg">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-display font-bold">Yuji Chat</h1>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <img 
                src={user?.photoURL || undefined} 
                alt="Profile" 
                className="w-8 h-8 rounded-lg object-cover"
              />
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-2 w-48 glass rounded-2xl p-2 shadow-2xl z-20"
                  >
                    <div className="px-3 py-2 mb-2 border-bottom border-slate-200 dark:border-slate-800">
                      <p className="text-sm font-semibold truncate">{user?.displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setShowProfileModal(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-1"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">Profile Settings</span>
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full p-4 md:p-6">
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-12"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass p-4 rounded-2xl flex gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
            ))
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <motion.button
                key={u.uid}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => startChat(u)}
                className="w-full glass p-4 rounded-2xl flex items-center gap-4 hover:bg-white dark:hover:bg-slate-900 transition-all group"
              >
                <div className="relative shrink-0">
                  <img 
                    src={u.photoURL || undefined} 
                    alt={u.displayName} 
                    className="w-12 h-12 rounded-xl object-cover shadow-md"
                  />
                  {u.online && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                  )}
                </div>
                
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className="font-semibold truncate">{u.displayName}</h3>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      {u.online ? 'Online' : (u.lastSeen ? formatDistanceToNow(u.lastSeen, { addSuffix: true }) : 'Offline')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                    {u.lastMessage || 'Start a new conversation'}
                  </p>
                </div>
              </motion.button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <UserIcon className="w-16 h-16 mb-4 opacity-20" />
              <p>No users found</p>
            </div>
          )}
        </div>
      </main>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !uploading && setShowProfileModal(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass rounded-[32px] p-8 shadow-2xl"
            >
              <button 
                onClick={() => !uploading && setShowProfileModal(false)}
                className="absolute top-6 right-6 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>

              <div className="text-center space-y-6">
                <h2 className="text-2xl font-display font-bold">Edit Profile</h2>
                
                <div className="relative inline-block group">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-xl ring-4 ring-white dark:ring-slate-900 mx-auto">
                    <img 
                      src={user?.photoURL || undefined} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  <div className="space-y-2">
                    <label className="text-sm font-medium px-1">Display Name</label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        className="input-field"
                        placeholder="Your name"
                      />
                    </div>
                  </div>
                  
                  <button 
                    onClick={async () => {
                      if (!user || !newDisplayName.trim()) return;
                      setUploading(true);
                      try {
                        await updateProfile(user, { displayName: newDisplayName });
                        await update(ref(db, `users/${user.uid}`), { displayName: newDisplayName });
                        setShowProfileModal(false);
                      } catch (err) {
                        console.error("Update failed:", err);
                      } finally {
                        setUploading(false);
                      }
                    }}
                    disabled={uploading || newDisplayName === user?.displayName}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Save Changes</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;
