
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

  const getAchievement = (id: string, isBranch: boolean) => 0; 

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
    <div className="space-y-8 pb-32">
      {/* AI Insights Header */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-blue-400 font-black uppercase text-[10px] tracking-[0.2em] mb-4">Intelligence Report</h3>
          <p className="text-xl md:text-2xl font-bold leading-tight">
            "{aiInsight?.summary || "সিস্টেম ডাটা বিশ্লেষণ করছে..."}"
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {isSuperAdmin && selectedBranchId && (
            <button 
              onClick={() => setSelectedBranchId(null)}
              className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {selectedBranchId ? `${selectedBranch?.name} Performance` : "Branch Insights"}
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              {isBranchAdmin ? "Detailed Staff Metrics" : (selectedBranchId ? "Detailed Officer Metrics" : "Select a branch to view details")}
            </p>
          </div>
        </div>
      </div>

      {!selectedBranchId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {visibleBranches.map(branch => (
            <button 
              key={branch.id}
              onClick={() => setSelectedBranchId(branch.id)}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl text-left hover:scale-[1.02] transition-all group"
            >
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">ID: {branch.id}</p>
              <h4 className="text-xl font-black text-slate-800 mb-6">{branch.name}</h4>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-1000 w-[10%]" />
              </div>
              <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-widest">Click to view officers</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5">Officer</th>
                  <th className="px-8 py-5">Target</th>
                  <th className="px-8 py-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {branchOfficers.map(officer => {
                  const isActive = trackingData[officer.id] && (Date.now() - new Date(trackingData[officer.id].lastUpdate).getTime()) < 600000;
                  return (
                    <tr key={officer.id} className="hover:bg-blue-50/30 transition-all">
                      <td className="px-8 py-5">
                        <p className="font-black text-slate-800">{officer.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">@{officer.username}</p>
                      </td>
                      <td className="px-8 py-5 font-black text-slate-700">৳{officer.target_monthly?.toLocaleString() || 0}</td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                          {isActive ? 'Online' : 'Offline'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
