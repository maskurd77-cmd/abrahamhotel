import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSetupState, setIsSetupState] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/pos-shinglbana-manager-2026/pos');
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSetupState) {
        // Create Super Admin
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            user_id: userCredential.user.uid,
            username: email.split('@')[0],
            email: email,
            phone_number: '',
            role: 'admin'
          });
        } catch (dbErr) {
          console.warn("Firestore rules might be blocking writes. Auth succeeded though.", dbErr);
        }
        toast.success('Super Admin Created Successfully!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Welcome back.');
      }
      navigate('/pos-shinglbana-manager-2026/pos');
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] font-sans">
      <div className="w-full max-w-md bg-[#0F172A] border-t-4 border-[#D4AF37] rounded-xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Subtle decorative gold line */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] opacity-[0.03] rounded-bl-full pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[#D4AF37] rounded-lg flex items-center justify-center font-bold text-slate-900 text-2xl mb-4 shadow-[0_0_15px_rgba(212,175,55,0.3)]">S</div>
          <h1 className="text-xl font-bold text-white tracking-tight leading-none text-center">SHINGLBANA POS</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1.5 text-center">Admin Console Authentication</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1E293B] border border-slate-700 rounded-md px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[#D4AF37] outline-none transition-colors"
              placeholder="admin@shinglbana.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1E293B] border border-slate-700 rounded-md px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[#D4AF37] outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#D4AF37] hover:bg-[#c4a133] text-[#0F172A] font-bold py-2.5 rounded-md transition-colors mt-2 text-sm"
          >
            {loading ? 'Authenticating...' : (isSetupState ? 'Initialize Super Admin' : 'Secure Login')}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-800 pt-4">
          <button 
            type="button" 
            onClick={() => setIsSetupState(!isSetupState)}
            className="text-[10px] uppercase font-bold tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
          >
            {isSetupState ? 'Return to Login' : 'Initial System Setup'}
          </button>
        </div>
      </div>
    </div>
  );
}
