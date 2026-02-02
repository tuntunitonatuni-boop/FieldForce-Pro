
import React from 'react';
import { User, Role } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, activeTab, setActiveTab, children }) => {
  const isSuperAdmin = user.role === Role.SUPER_ADMIN;
  const isBranchAdmin = user.role === Role.BRANCH_ADMIN;
  const isOfficer = user.role === Role.OFFICER;

  const getRoleLabel = (role: Role) => {
    if (role === Role.OFFICER) return "Credit Officer";
    return role.replace('_', ' ');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
            <h1 className="text-xl font-black tracking-tighter">FieldForce Pro</h1>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-[0.2em]">Operations Center</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5">
          <SidebarItem 
            active={activeTab === 'attendance'} 
            onClick={() => setActiveTab('attendance')}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Attendance"
          />
          <SidebarItem 
            active={activeTab === 'tracking'} 
            onClick={() => setActiveTab('tracking')}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            label="Field Visit"
          />
          {!isOfficer && (
            <SidebarItem 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
              label="Insights"
            />
          )}
          {(isSuperAdmin || isBranchAdmin) && (
            <SidebarItem 
              active={activeTab === 'management'} 
              onClick={() => setActiveTab('management')}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
              label={isSuperAdmin ? "Global Management" : "Staff Management"}
            />
          )}
          <SidebarItem 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            label="My Profile"
          />
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-slate-800/50 p-4 rounded-3xl border border-slate-700/50 flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-xl border-2 border-slate-700">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-black truncate">{user.name}</p>
              <p className="text-[10px] text-blue-400 font-bold uppercase truncate">{getRoleLabel(user.role)}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full py-4 bg-slate-800 hover:bg-red-600/10 hover:text-red-500 rounded-2xl text-xs font-black transition-all flex items-center justify-center space-x-2 border border-slate-700 hover:border-red-500/50 uppercase tracking-widest"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 md:px-10 sticky top-0 z-10">
          <h2 className="text-2xl font-black text-slate-800 capitalize tracking-tight">
            {activeTab === 'management' ? (isSuperAdmin ? 'Global Control' : 'Team Admin') : activeTab.replace('-', ' ')}
          </h2>
          <div className="md:hidden">
            <h1 className="text-lg font-black text-blue-600 tracking-tighter">FF Pro</h1>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 md:p-10">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 h-20 flex items-center justify-around z-20 pb-safe shadow-2xl">
        <MobileNavItem active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} label="Clock" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <MobileNavItem active={activeTab === 'tracking'} onClick={() => setActiveTab('tracking')} label="Field" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
        {!isOfficer && <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="Admin" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" /></svg>} />}
        <MobileNavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Me" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
      </nav>
    </div>
  );
};

const SidebarItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-4 px-5 py-4 rounded-[1.5rem] transition-all ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    {icon}<span className="font-black text-sm uppercase tracking-wider">{label}</span>
  </button>
);

const MobileNavItem: React.FC<{ active: boolean; onClick: () => void; label: string; icon: React.ReactNode }> = ({ active, onClick, label, icon }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all ${active ? 'text-blue-600' : 'text-slate-400'}`}>
    {icon}
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default Layout;
