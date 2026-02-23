import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { ref, set } from 'firebase/database';
import { motion } from 'motion/react';
import { UserPlus, Mail, Lock, User, AlertCircle, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gender) {
      setError('Please select your gender');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const photoURL = gender === 'male' 
        ? `https://api.dicebear.com/7.x/avataaars/svg?seed=Felix${user.uid}` 
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka${user.uid}`;

      await updateProfile(user, {
        displayName: name,
        photoURL: photoURL
      });

      await set(ref(db, `users/${user.uid}`), {
        uid: user.uid,
        displayName: name,
        email: email,
        photoURL: photoURL,
        gender: gender,
        online: true,
        lastSeen: Date.now()
      });

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <button 
        onClick={toggleDarkMode}
        className="fixed top-6 right-6 p-3 rounded-2xl glass hover:scale-110 transition-transform"
      >
        {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass p-8 rounded-[32px] space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-primary-start to-primary-end text-white mb-4 shadow-lg shadow-primary-start/20">
              <UserPlus className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-display font-bold">Create Account</h1>
            <p className="text-slate-500 dark:text-slate-400">Join Yuji Chat today</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium px-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field pl-12"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium px-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-12"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium px-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-12"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium px-1">Gender</label>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl border-2 cursor-pointer transition-all ${gender === 'male' ? 'border-primary-start bg-primary-start/10 text-primary-start' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
                  <input type="radio" name="gender" value="male" className="hidden" onChange={() => setGender('male')} />
                  <span className="font-medium">Male</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl border-2 cursor-pointer transition-all ${gender === 'female' ? 'border-primary-start bg-primary-start/10 text-primary-start' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}>
                  <input type="radio" name="gender" value="female" className="hidden" onChange={() => setGender('female')} />
                  <span className="font-medium">Female</span>
                </label>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Create Account <UserPlus className="w-5 h-5" /></>
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 dark:text-slate-400">
            Already have an account? {' '}
            <Link to="/login" className="text-primary-start font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
