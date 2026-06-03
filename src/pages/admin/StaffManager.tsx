import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '../../lib/firebase';
import { User } from '../../types';
import toast from 'react-hot-toast';
import { Plus, Trash2, Shield, User as UserIcon, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function StaffManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier'>('cashier');

  useEffect(() => {
    const q = collection(db, 'users');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ user_id: doc.id, ...doc.data() } as User)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please fill all fields");

    setIsAdding(true);
    try {
      // Use secondary app to create user without signing out the current admin
      const secondaryApp = initializeApp(firebaseConfig, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      
      // Save data in firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        user_id: userCredential.user.uid,
        username: email.split('@')[0],
        email: email,
        phone_number: '',
        role: role
      });

      // Sign out from the secondary instance
      await signOut(secondaryAuth);
      
      toast.success('Staff member created successfully!');
      setEmail('');
      setPassword('');
      setRole('cashier');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error creating user');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Delete this user? (This only deletes from Firestore, Auth deletion requires Admin SDK)')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('User removed from directory.');
    } catch (error) {
      console.error(error);
      toast.error('Error deleting user');
    }
  };

  if (loading) return <div className="text-slate-500 animate-pulse">Loading staff directory...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Staff & Roles</h2>
          <p className="text-slate-500 text-sm mt-1">Manage system access for Cashiers and Administrators</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Creation Form */}
        <div className="lg:col-span-1 border border-slate-200 bg-white rounded-lg p-6 shadow-sm self-start">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            Provision New Staff
          </h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email / Login ID</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition"
                placeholder="staff@shinglbana.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Temporary Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition"
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">System Role</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole('cashier')}
                  className={cn(
                    "flex-1 py-2 px-3 flex items-center justify-center gap-2 rounded text-sm transition-colors border",
                    role === 'cashier' ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  )}
                >
                  <UserIcon className="w-4 h-4" />
                  Cashier
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={cn(
                    "flex-1 py-2 px-3 flex items-center justify-center gap-2 rounded text-sm transition-colors border",
                    role === 'admin' ? "bg-red-50 text-red-700 border-red-200 font-medium" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  )}
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="w-full bg-slate-900 text-white font-medium py-2 rounded-md hover:bg-slate-800 transition disabled:opacity-50"
            >
              {isAdding ? "Provisioning..." : "Create Account"}
            </button>
          </form>
        </div>

        {/* User Directory */}
        <div className="lg:col-span-2">
          <div className="border border-slate-200 bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">User Identity</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.user_id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{u.username || "Unknown"}</div>
                      <div className="text-slate-500 text-xs">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                           Cashier
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(u.user_id!)}
                        className="text-slate-400 hover:text-red-500 transition p-1"
                        title="Remove User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                      No staff accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
