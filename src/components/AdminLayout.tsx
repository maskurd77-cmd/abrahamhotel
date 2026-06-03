import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ChefHat, FileText, Settings, LogOut, BarChart3, UserCog } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/pos-shinglbana-manager-2026');
  };

  const navItems = [
    { to: '/pos-shinglbana-manager-2026/pos', icon: LayoutDashboard, label: 'POS Dashboard' },
    { to: '/pos-shinglbana-manager-2026/rooms', icon: Users, label: 'Rooms & Tables' },
    { to: '/pos-shinglbana-manager-2026/kds', icon: ChefHat, label: 'Kitchen Display (KDS)' },
    { to: '/pos-shinglbana-manager-2026/products', icon: FileText, label: 'Menu Management' },
    { to: '/pos-shinglbana-manager-2026/reports', icon: BarChart3, label: 'Reports' },
    { to: '/pos-shinglbana-manager-2026/staff', icon: UserCog, label: 'Staff & Roles' },
    { to: '/pos-shinglbana-manager-2026/settings', icon: Settings, label: 'Settings' },
  ];

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
          {navItems.map((item) => (
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
              <p className="text-sm font-bold">Abrahem SuperAdmin</p>
              <p className="text-[10px] text-slate-500 uppercase">Role: Solutions Architect</p>
            </div>
            <div className="w-10 h-10 bg-[#F1F5F9] rounded-full border-2 border-[#D4AF37] flex items-center justify-center text-slate-500 font-bold">
               A
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
