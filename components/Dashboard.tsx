
import React, { useState, useEffect } from 'react';
import { User, Role, Attendance } from '../types';
import { getAttendanceSummaryAI } from '../services/geminiService';
import { MOCK_USERS } from '../constants';

interface DashboardProps {
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  const [aiInsight, setAiInsight] = useState<{ summary: string, punctualityRating: number } | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Filter staff based on role
  const managedStaff = MOCK_USERS.filter(u => {
    if (currentUser.role === Role.SUPER_ADMIN) return true;
    return u.branch_id === currentUser.branch_id && u.role === Role.OFFICER;
  });

  useEffect(() => {
    const fetchAI = async () => {
      setLoading(true);
      const res = await getAttendanceSummaryAI([
        { user: "Mike", status: "Present", time: "09:05" },
        { user: "Sarah", status: "Present", time: "08:55" }
      ]);
      setAiInsight(res);
      setLoading(false);
    };
    fetchAI();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Staff" value={managedStaff.length.toString()} color="blue" />
        <StatCard title="Active Field Visits" value="2" color="green" />
        <StatCard title="Daily Attendance" value="94%" color="amber" />
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <h3 className="text-lg font-bold">AI Performance Insight</h3>
          </div>
          {loading ? (
            <p className="animate-pulse">Analyzing workforce patterns...</p>
          ) : (
            <>
              <p className="text-indigo-50 font-medium mb-4">
                {aiInsight?.summary}
              </p>
              <div className="flex items-center space-x-4">
                <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-widest">
                  Punctuality: {aiInsight?.punctualityRating}/10
                </div>
              </div>
            </>
          )}
        </div>
        {/* Decorative background shape */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Branch Staff List</h3>
          <button className="text-blue-600 text-sm font-semibold hover:underline">Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {managedStaff.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 capitalize">{user.role.replace('_', ' ')}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase">On-Field</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">2 mins ago</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; color: 'blue' | 'green' | 'amber' }> = ({ title, value, color }) => {
  const colors = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-green-200 bg-green-50 text-green-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
  };
  return (
    <div className={`p-6 rounded-2xl border ${colors[color]} shadow-sm`}>
      <p className="text-sm font-semibold uppercase tracking-wider opacity-80">{title}</p>
      <p className="text-3xl font-black mt-2">{value}</p>
    </div>
  );
};

export default Dashboard;
