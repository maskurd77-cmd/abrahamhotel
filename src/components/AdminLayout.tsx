import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ChefHat, FileText, Settings, LogOut, BarChart3, UserCog, Coffee } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import { User } from '../types';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setCurrentUser({ user_id: docSnap.id, ...docSnap.data() } as User);
          } else {
             // Fallback for default superadmin hardcoded in previous versions if not in db
             setCurrentUser({ username: 'SuperAdmin', role: 'admin', email: user.email || '', phone_number: '', permissions: [] });
          }
        });
        return () => unsubUser();
      } else {
        navigate('/pos-shinglbana-manager-2026');
      }
    });
    return () => unsubAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/pos-shinglbana-manager-2026');
  };

  const navItems = [
    { to: '/pos-shinglbana-manager-2026/pos', icon: LayoutDashboard, label: 'Restaurant POS', id: 'pos' },
    { to: '/pos-shinglbana-manager-2026/tables', icon: Coffee, label: 'Restaurant Tables', id: 'tables' },
    { to: '/pos-shinglbana-manager-2026/rooms', icon: Users, label: 'Hotel Rooms', id: 'rooms' },
    { to: '/pos-shinglbana-manager-2026/kds', icon: ChefHat, label: 'Kitchen Display (KDS)', id: 'kds' },
    { to: '/pos-shinglbana-manager-2026/products', icon: FileText, label: 'Menu Management', id: 'products' },
    { to: '/pos-shinglbana-manager-2026/reports', icon: BarChart3, label: 'Reports', id: 'reports' },
    { to: '/pos-shinglbana-manager-2026/staff', icon: UserCog, label: 'Staff & Roles', id: 'staff' },
    { to: '/pos-shinglbana-manager-2026/settings', icon: Settings, label: 'Settings', id: 'settings' },
  ];

  const visibleNavItems = navItems.filter(item => {
    if (currentUser?.role === 'admin') return true;
    if (currentUser?.permissions && currentUser.permissions.includes(item.id)) return true;
    return false;
  });

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans text-slate-800 flex overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-[#0F172A] text-white flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-slate-700">
          <div className="w-10 h-10 bg-[#D4AF37] rounded-lg flex items-center justify-center font-bold text-slate-900">S</div>
          <div>
            <h1 className="text-lg font-bold leading-none tracking-tight">SHINGLBANA</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Royal Resort POS</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {visibleNavItems.map((item) => (
             <NavLink
               key={item.to}
               to={item.to}
               className={({ isActive }) => cn(
                 "flex items-center gap-3 p-3 rounded-md transition-colors duration-200",
                 isActive 
                  ? "bg-[#1E293B] border-l-4 border-[#D4AF37] text-white shadow-[inset_0_0_0_0_transparent]" 
                  : "text-slate-400 hover:text-white"
               )}
             >
               {({ isActive }) => (
                 <>
                   {isActive ? (
                      <div className="relative flex items-center justify-center w-5 h-5">
                         <div className="absolute w-2 h-2 bg-[#D4AF37] rounded-full shadow-[0_0_8px_#D4AF37]"></div>
                      </div>
                   ) : (
                      <item.icon className="w-5 h-5" />
                   )}
                   <span className="text-sm font-medium">{item.label}</span>
                 </>
               )}
             </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="bg-slate-800 rounded p-3 mb-4">
            <p className="text-[10px] text-slate-400 uppercase mb-1">Admin Console</p>
            <p className="text-xs font-mono truncate text-slate-300">/pos-shinglbana-manager-2026</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md font-medium text-red-400 hover:bg-slate-800 transition text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Cloud Online</span>
            <span className="text-slate-400 text-sm hidden sm:inline">| System Architecture: V2.4</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold">{currentUser?.username || 'Loading...'}</p>
              <p className="text-[10px] text-slate-500 uppercase">Role: {currentUser?.role || 'Guest'}</p>
            </div>
            <div className="w-10 h-10 bg-[#F1F5F9] rounded-full border-2 border-[#D4AF37] flex items-center justify-center text-slate-500 font-bold uppercase">
               {currentUser?.username?.[0] || 'A'}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
           <Outlet />
        </main>
      </div>
    </div>
  );
}
