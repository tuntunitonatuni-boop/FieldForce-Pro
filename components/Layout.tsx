
import React, { useState } from 'react';
import { User, Role } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, activeTab, setActiveTab, children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const isSuperAdmin = user.role === Role.SUPER_ADMIN;
  const isBranchAdmin = user.role === Role.BRANCH_ADMIN;
  const isOfficer = user.role === Role.OFFICER;
  const isDriver = user.role === Role.DRIVER;

  const getRoleLabel = (role: Role) => {
    if (role === Role.OFFICER) return "Credit Officer";
    if (role === Role.DRIVER) return "Driver";
    return role.replace('_', ' ');
  };

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 overflow-hidden font-sans">
      
      {/* --- MOBILE SIDEBAR (DRAWER) --- */}
      {/* Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel (Fixed on Mobile, Hidden on Desktop initially) */}
      <aside className={`
        fixed inset-y-0 left-0 z-[110] w-72 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:flex md:w-80 md:z-0 md:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

        <div className="p-8 relative z-10 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">FieldForce</h1>
              <p className="text-[8px] text-blue-400 font-bold uppercase tracking-widest leading-tight">Pro Admin</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white p-2 bg-slate-800 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 relative z-10 overflow-y-auto no-scrollbar">
          {!isDriver && (
            <SidebarItem active={activeTab === 'attendance'} onClick={() => handleNavClick('attendance')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Attendance" desc="Check-in & Out" />
          )}
          {!isDriver && (
            <SidebarItem active={activeTab === 'tracking'} onClick={() => handleNavClick('tracking')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} label="Field Visit" desc="Live Location" />
          )}
          {!isOfficer && !isDriver && (
            <SidebarItem active={activeTab === 'dashboard'} onClick={() => handleNavClick('dashboard')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} label="Insights" desc="Analytics & AI" />
          )}
          {(isSuperAdmin || isBranchAdmin || isDriver) && (
             <SidebarItem active={activeTab === 'expenses'} onClick={() => handleNavClick('expenses')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} label="Car Expenses" desc="Fuel & Maint." />
          )}
          {(isSuperAdmin || isBranchAdmin) && (
            <SidebarItem active={activeTab === 'management'} onClick={() => handleNavClick('management')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} label={isSuperAdmin ? "Control Center" : "Team Admin"} desc="Manage Staff" />
          )}
          <SidebarItem active={activeTab === 'profile'} onClick={() => handleNavClick('profile')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} label="My Profile" desc="Settings" />
        </nav>

        <div className="p-6 mt-auto relative z-10 shrink-0">
          <div className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-3xl border border-slate-700/50 flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-lg text-white shadow-lg">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{getRoleLabel(user.role)}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center space-x-2 border border-red-500/20 active:scale-95">
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header (Fixed height) */}
        <header className="h-16 md:h-20 bg-white/95 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 md:px-10 shrink-0 z-40">
          <div className="flex items-center">
             <button onClick={() => setSidebarOpen(true)} className="md:hidden mr-3 text-slate-700 p-2 rounded-full hover:bg-slate-100">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
             </button>
             <div>
               <h2 className="text-lg md:text-2xl font-black text-slate-800 capitalize leading-none">
                 {activeTab === 'management' ? (isSuperAdmin ? 'Global Control' : 'Team Admin') : activeTab.replace('-', ' ')}
               </h2>
             </div>
          </div>
          <div className="md:hidden w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
              {user.name.charAt(0)}
          </div>
        </header>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 relative">
          {/* Bottom padding for mobile nav */}
          <div className="p-4 md:p-10 pb-28 md:pb-10 min-h-full">
            {children}
          </div>
        </div>

        {/* --- BOTTOM NAVIGATION (Mobile Only) --- */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 h-[80px] pb-safe flex items-center justify-around z-[90] shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
          {!isDriver && (
            <MobileNavItem active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} label="Home" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} />
          )}
          {!isDriver && (
            <MobileNavItem active={activeTab === 'tracking'} onClick={() => setActiveTab('tracking')} label="Visit" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
          )}
          {(isSuperAdmin || isBranchAdmin) && (
            <MobileNavItem active={activeTab === 'management'} onClick={() => setActiveTab('management')} label="Team" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
          )}
          {isDriver && (
            <MobileNavItem active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} label="Expenses" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          )}
          <MobileNavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Profile" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
        </nav>
      </main>
    </div>
  );
};

const SidebarItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; desc: string }> = ({ active, onClick, icon, label, desc }) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-4 px-5 py-4 rounded-[1.5rem] transition-all duration-300 group ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    <div className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'}`}>
      {icon}
    </div>
    <div className="text-left">
      <span className="block font-black text-sm uppercase tracking-wider">{label}</span>
      <span className={`block text-[9px] font-bold uppercase tracking-widest ${active ? 'text-blue-200' : 'text-slate-600 group-hover:text-slate-500'}`}>{desc}</span>
    </div>
  </button>
);

const MobileNavItem: React.FC<{ active: boolean; onClick: () => void; label: string; icon: React.ReactNode }> = ({ active, onClick, label, icon }) => (
  <button 
    onClick={onClick} 
    className={`relative flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all duration-300 active:scale-90 tap-highlight-transparent ${active ? 'text-blue-600' : 'text-slate-400'}`}
  >
    {active && (
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-b-lg shadow-[0_0_10px_rgba(37,99,235,0.5)]"></span>
    )}
    <div className={`transition-transform duration-300 ${active ? '-translate-y-1' : ''}`}>
      {icon}
    </div>
    <span className={`text-[9px] font-black uppercase tracking-widest transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </button>
);

export default Layout;
