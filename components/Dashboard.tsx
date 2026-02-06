
import React, { useState, useEffect } from 'react';
import { User, Role, Branch } from '../types';
import { getAttendanceSummaryAI } from '../services/geminiService';

interface DashboardProps {
  currentUser: User;
  allUsers: User[];
  trackingData: Record<string, any>;
  branches: Branch[];
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, allUsers, trackingData, branches }) => {
  const [aiInsight, setAiInsight] = useState<{ summary: string, punctualityRating: number } | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  
  // BRANCH ADMINS are strictly locked to their own branch
  const isSuperAdmin = currentUser.role === Role.SUPER_ADMIN;
  const isBranchAdmin = currentUser.role === Role.BRANCH_ADMIN;
  
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
    isBranchAdmin ? currentUser.branch_id : null
  );

  const visibleBranches = isSuperAdmin 
    ? branches 
    : branches.filter(b => b.id === currentUser.branch_id);

  const getBranchOfficers = (branchId: string) => {
    return allUsers.filter(u => u.role === Role.OFFICER && u.branch_id === branchId);
  };

  useEffect(() => {
    const fetchAI = async () => {
      setLoadingAI(true);
      // Only summarize relevant users for Branch Admin
      const relevantUsers = isBranchAdmin 
        ? allUsers.filter(u => u.branch_id === currentUser.branch_id)
        : allUsers.slice(0, 15);
        
      const sampleData = relevantUsers.map(s => ({ user: s.name, status: trackingData[s.id] ? "Online" : "Offline" }));
      const res = await getAttendanceSummaryAI(sampleData);
      setAiInsight(res);
      setLoadingAI(false);
    };
    fetchAI();
  }, [allUsers.length, currentUser.branch_id]);

  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  const branchOfficers = selectedBranchId ? getBranchOfficers(selectedBranchId) : [];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* AI Insights Header */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-[2rem] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden transition-all hover:scale-[1.01]">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/4 translate-x-1/4"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-4">
             <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
             <h3 className="text-blue-200 font-black uppercase text-[10px] tracking-[0.2em]">Live Intelligence</h3>
          </div>
          <p className="text-lg md:text-2xl font-bold leading-tight text-white/90">
            "{aiInsight?.summary || "Analyzing field data streams..."}"
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sticky top-0 z-10 bg-slate-50/90 backdrop-blur py-2">
        <div className="flex items-center space-x-3">
          {isSuperAdmin && selectedBranchId && (
            <button 
              onClick={() => setSelectedBranchId(null)}
              className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-600 active:scale-90 transition-transform"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {selectedBranchId ? `${selectedBranch?.name}` : "Overview"}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {isBranchAdmin ? "Staff Metrics" : (selectedBranchId ? "Branch Officers" : "Select Branch")}
            </p>
          </div>
        </div>
      </div>

      {!selectedBranchId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {visibleBranches.map(branch => (
            <button 
              key={branch.id}
              onClick={() => setSelectedBranchId(branch.id)}
              className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-lg text-left active:scale-[0.98] md:hover:scale-[1.02] transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">ID: {branch.id}</p>
                 <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                 </div>
              </div>
              <h4 className="text-xl font-black text-slate-800 mb-6">{branch.name}</h4>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 w-[10%]" />
              </div>
              <p className="text-[9px] font-black text-slate-400 mt-3 uppercase tracking-widest">View Details</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
           {branchOfficers.length === 0 ? (
             <div className="p-10 text-center text-slate-400 font-bold bg-white rounded-[2rem]">No officers found.</div>
           ) : (
             branchOfficers.map(officer => {
                const isActive = trackingData[officer.id] && (Date.now() - new Date(trackingData[officer.id].lastUpdate).getTime()) < 600000;
                return (
                  <div key={officer.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center font-black text-lg">
                        {officer.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-sm">{officer.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">@{officer.username}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-1 ${isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                          {isActive ? 'Online' : 'Offline'}
                        </span>
                        <p className="text-[10px] font-bold text-slate-500">Target: ৳{officer.target_monthly?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                )
             })
           )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
