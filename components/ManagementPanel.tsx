
import React, { useState } from 'react';
import { User, Branch, Role } from '../types';
import { supabase } from '../lib/supabase';

interface ManagementPanelProps {
  currentUser: User;
  allUsers: User[];
  branches: Branch[];
  onRefresh: () => void;
}

const ManagementPanel: React.FC<ManagementPanelProps> = ({ currentUser, allUsers, branches, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'branches' | 'admins' | 'officers' | 'drivers' | 'reports'>('officers');
  const [loading, setLoading] = useState(false);
  
  // User Management State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ 
    email: '', 
    username: '', 
    password: '', 
    name: '', 
    pin: '', 
    role: Role.OFFICER,
    branch_id: currentUser.branch_id // Default to admin's branch
  });

  // Branch Management State
  const [newBranch, setNewBranch] = useState({ id: '', name: '', lat: 0, lng: 0, radius: 100, target_amount: 0 });
  const [gettingLocation, setGettingLocation] = useState(false);

  // Report State
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));

  const isSuperAdmin = currentUser.role === Role.SUPER_ADMIN;
  const isBranchAdmin = currentUser.role === Role.BRANCH_ADMIN;

  const branchAdmins = isSuperAdmin ? allUsers.filter(u => u.role === Role.BRANCH_ADMIN) : [];
  const drivers = isSuperAdmin ? allUsers.filter(u => u.role === Role.DRIVER) : [];
  
  const creditOfficers = allUsers.filter(u => {
    if (isSuperAdmin) return u.role === Role.OFFICER;
    if (isBranchAdmin) return u.role === Role.OFFICER && u.branch_id === currentUser.branch_id;
    return false;
  });

  // --- BRANCH ACTIONS ---
  const getCurrentLocationForBranch = () => {
    if (!navigator.geolocation) return alert("আপনার ডিভাইসে GPS নেই।");
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewBranch({ ...newBranch, lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGettingLocation(false);
      },
      (err) => {
        alert("লোকেশন পাওয়া যায়নি: " + err.message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddBranch = async () => {
    if (!newBranch.id || !newBranch.name) return alert("ব্রাঞ্চ আইডি এবং নাম অবশ্যই দিতে হবে।");
    if (newBranch.lat === 0 || newBranch.lng === 0) return alert("ব্রাঞ্চের লোকেশন (Lat/Lng) সেট করা হয়নি।");

    setLoading(true);
    try {
      const { error } = await supabase.from('branches').insert(newBranch);
      if (error) throw error;
      setNewBranch({ id: '', name: '', lat: 0, lng: 0, radius: 100, target_amount: 0 });
      onRefresh();
      alert("ব্রাঞ্চ সফলভাবে তৈরি হয়েছে!");
    } catch (e: any) { 
      alert("ব্রাঞ্চ তৈরিতে সমস্যা হয়েছে: " + e.message); 
    }
    setLoading(false);
  };

  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    if (!isSuperAdmin) return;
    if (!confirm(`আপনি কি নিশ্চিতভাবে "${branchName}" ব্রাঞ্চটি মুছতে চান? এর ফলে ওই ব্রাঞ্চের ডাটাবেস এন্ট্রি মুছে যাবে (যদি কোনো ইউজার না থাকে)।`)) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('branches').delete().eq('id', branchId);
      if (error) {
        if (error.code === '23503') throw new Error("এই ব্রাঞ্চের অধীনে ইউজার রয়েছে। আগে ইউজারদের অন্য ব্রাঞ্চে সরিয়ে নিন অথবা ডিলিট করুন।");
        throw error;
      }
      alert("ব্রাঞ্চ সফলভাবে মুছে ফেলা হয়েছে।");
      onRefresh();
    } catch (e: any) {
      alert("ত্রুটি: " + e.message);
    }
    setLoading(false);
  };

  // --- USER ACTIONS ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetRole = isBranchAdmin ? Role.OFFICER : newUser.role;
    const targetBranch = isBranchAdmin ? currentUser.branch_id : newUser.branch_id;

    if (!targetBranch) return alert("দয়া করে ব্রাঞ্চ সিলেক্ট করুন।");
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.name,
            username: newUser.username.toLowerCase().trim(),
            role: targetRole,
            branch_id: targetBranch,
            staff_pin: newUser.pin
          }
        }
      });
      
      if (error) throw error;
      
      alert(`সফলভাবে ইউজার তৈরি হয়েছে!`);
      setShowAddForm(false);
      setNewUser({ 
        email: '', username: '', password: '', name: '', pin: '', 
        role: Role.OFFICER, 
        branch_id: isBranchAdmin ? currentUser.branch_id : '' 
      });
      onRefresh();
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUser.id) return alert("আপনি নিজেকে সরাতে পারবেন না।");
    if (!confirm(`আপনি কি নিশ্চিতভাবে ${userName}-কে সরাতে চান?`)) return;
    
    setLoading(true);
    try {
      await supabase.from('movement_logs').delete().eq('user_id', userId);
      await supabase.from('attendance').delete().eq('user_id', userId);
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      
      if (error) throw new Error(error.message);
      
      alert(`${userName}-এর ডাটা সফলভাবে মুছে ফেলা হয়েছে।`);
      onRefresh();
    } catch (e: any) { alert("ত্রুটি: " + e.message); }
    setLoading(false);
  };

  // --- REPORTING ACTIONS ---
  const handleDownloadReport = async () => {
    setLoading(true);
    try {
      // Fetch attendance for selected month
      // Note: We need to join with profiles manually since we are using simple queries
      let query = supabase.from('attendance').select('*').like('date', `${reportMonth}%`).order('date', { ascending: true });
      
      const { data: attendanceData, error } = await query;
      if (error) throw error;

      if (!attendanceData || attendanceData.length === 0) {
        alert("এই মাসের কোনো ডাটা পাওয়া যায়নি।");
        setLoading(false);
        return;
      }

      // Generate CSV
      let csvContent = "Date,Staff Name,Role,Branch,Status,Check In,Check Out\n";

      attendanceData.forEach((record: any) => {
        const staff = allUsers.find(u => u.id === record.user_id);
        // Filter for Branch Admin: only show their branch
        if (isBranchAdmin && staff?.branch_id !== currentUser.branch_id) return;
        
        if (staff) {
          const branchName = branches.find(b => b.id === staff.branch_id)?.name || 'Unknown';
          const checkIn = record.check_in ? new Date(record.check_in).toLocaleTimeString() : '-';
          const checkOut = record.check_out ? new Date(record.check_out).toLocaleTimeString() : '-';
          
          csvContent += `${record.date},"${staff.name}",${staff.role},"${branchName}",${record.status},${checkIn},${checkOut}\n`;
        }
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Attendance_Report_${reportMonth}.csv`;
      link.click();

    } catch (e: any) {
      alert("রিপোর্ট জেনারেট করতে সমস্যা হয়েছে: " + e.message);
    }
    setLoading(false);
  };

  // Helper to get list based on tab
  const getList = () => {
    switch(activeSubTab) {
      case 'admins': return branchAdmins;
      case 'drivers': return drivers;
      default: return creditOfficers;
    }
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Sub-Navigation */}
      <div className="flex space-x-6 border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveSubTab('officers')} className={`pb-4 px-2 whitespace-nowrap font-black text-xs uppercase tracking-widest transition-all ${activeSubTab === 'officers' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400'}`}>{isBranchAdmin ? 'আমার অফিসাররা' : 'ক্রেডিট অফিসার'}</button>
        {isSuperAdmin && (
          <>
            <button onClick={() => setActiveSubTab('admins')} className={`pb-4 px-2 whitespace-nowrap font-black text-xs uppercase tracking-widest transition-all ${activeSubTab === 'admins' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400'}`}>ব্রাঞ্চ এডমিন</button>
            <button onClick={() => setActiveSubTab('drivers')} className={`pb-4 px-2 whitespace-nowrap font-black text-xs uppercase tracking-widest transition-all ${activeSubTab === 'drivers' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400'}`}>ড্রাইভার</button>
            <button onClick={() => setActiveSubTab('branches')} className={`pb-4 px-2 whitespace-nowrap font-black text-xs uppercase tracking-widest transition-all ${activeSubTab === 'branches' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400'}`}>ব্রাঞ্চ ম্যানেজমেন্ট</button>
          </>
        )}
        <button onClick={() => setActiveSubTab('reports')} className={`pb-4 px-2 whitespace-nowrap font-black text-xs uppercase tracking-widest transition-all ${activeSubTab === 'reports' ? 'border-b-4 border-green-600 text-green-600' : 'text-slate-400'}`}>রিপোর্ট ও স্যালারি</button>
      </div>

      {/* REPORTING TAB */}
      {activeSubTab === 'reports' && (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl animate-in fade-in duration-500">
           <h3 className="text-xl font-black text-slate-800 mb-2">অ্যাটেন্ডেন্স রিপোর্ট</h3>
           <p className="text-sm text-slate-500 mb-6">পুরো মাসের হাজিরা এবং কাজের সময় ডাউনলোড করুন স্যালারি প্রসেসিংয়ের জন্য।</p>
           
           <div className="flex flex-col md:flex-row gap-4 items-end">
             <div className="w-full md:w-auto">
               <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Month</label>
               <input 
                  type="month" 
                  value={reportMonth} 
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-slate-700 outline-none"
                />
             </div>
             <button 
               onClick={handleDownloadReport} 
               disabled={loading}
               className="w-full md:w-auto px-8 py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg hover:bg-green-700 transition-all flex items-center justify-center space-x-2"
             >
               {loading ? (
                 <span>জেনারেট হচ্ছে...</span>
               ) : (
                 <>
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                   <span>Download Excel (CSV)</span>
                 </>
               )}
             </button>
           </div>
        </div>
      )}

      {/* BRANCH MANAGEMENT - Super Admin Only */}
      {activeSubTab === 'branches' && isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl h-fit">
            <h3 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest">নতুন ব্রাঞ্চ যোগ করুন</h3>
            <div className="space-y-4">
              <input type="text" placeholder="ID (যেমন: b10)" value={newBranch.id} onChange={e => setNewBranch({...newBranch, id: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold focus:border-blue-500 transition-all" />
              <input type="text" placeholder="ব্রাঞ্চের নাম" value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold focus:border-blue-500 transition-all" />
              
              <div className="grid grid-cols-2 gap-2">
                 <input type="number" placeholder="Lat" value={newBranch.lat || ''} onChange={e => setNewBranch({...newBranch, lat: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold text-xs" />
                 <input type="number" placeholder="Lng" value={newBranch.lng || ''} onChange={e => setNewBranch({...newBranch, lng: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold text-xs" />
              </div>
              
              <button 
                onClick={getCurrentLocationForBranch} 
                disabled={gettingLocation}
                className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center justify-center space-x-2"
              >
                 {gettingLocation ? (
                   <span className="animate-pulse">GPS Searching...</span>
                 ) : (
                   <>
                     <span>📍 Set Current Location</span>
                   </>
                 )}
              </button>

              <div className="pt-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Coverage Radius (Meters)</label>
                <input type="number" value={newBranch.radius} onChange={e => setNewBranch({...newBranch, radius: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold" />
              </div>

              <button onClick={handleAddBranch} disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all">
                {loading ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
              </button>
            </div>
          </div>
          <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
             <table className="w-full text-left hidden md:table">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                <tr><th className="px-8 py-5">Branch Name</th><th className="px-8 py-5">Location</th><th className="px-8 py-5 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {branches.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-800">{b.name}</p>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">ID: {b.id}</p>
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-500">
                      {b.lat.toFixed(4)}, {b.lng.toFixed(4)} <br/>
                      <span className="text-blue-500">Radius: {b.radius}m</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => handleDeleteBranch(b.id, b.name)} 
                        disabled={loading}
                        className="text-red-500 text-xs font-black uppercase tracking-widest hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Mobile Branch List */}
            <div className="md:hidden p-4 space-y-4">
              {branches.map(b => (
                  <div key={b.id} className="bg-slate-50 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-black text-slate-800">{b.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {b.id} • {b.radius}m</p>
                    </div>
                    <button onClick={() => handleDeleteBranch(b.id, b.name)} className="text-red-500 text-xs font-black uppercase bg-white p-2 rounded-lg shadow-sm">Delete</button>
                  </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* USER LISTS */}
      {activeSubTab !== 'branches' && activeSubTab !== 'reports' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-xl font-black text-slate-800 tracking-tight capitalize">{activeSubTab} List</h4>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">মোট: {getList().length} জন</p>
            </div>
            {(isSuperAdmin || (isBranchAdmin && activeSubTab === 'officers')) && (
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className={`px-4 py-3 md:px-6 rounded-2xl font-black text-sm transition-all shadow-lg ${showAddForm ? 'bg-slate-100 text-slate-600' : 'bg-green-600 text-white shadow-green-100 hover:bg-green-700'}`}
              >
                {showAddForm ? 'Cancel' : `+ New`}
              </button>
            )}
          </div>

          {showAddForm && (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-2xl animate-in slide-in-from-top duration-300">
              <h5 className="font-black text-slate-800 mb-6 uppercase text-[10px] tracking-widest">অ্যাকাউন্ট ইনফরমেশন</h5>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <input type="text" placeholder="পুরো নাম" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold" />
                <input type="text" placeholder="ইউজারনেম" required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold" />
                <input type="email" placeholder="ইমেইল" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold" />
                <input type="password" placeholder="পাসওয়ার্ড" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold" />
                
                {isSuperAdmin && (
                  <>
                    <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as Role})} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold">
                      <option value={Role.OFFICER}>Credit Officer</option>
                      <option value={Role.BRANCH_ADMIN}>Branch Admin</option>
                      <option value={Role.DRIVER}>Driver</option>
                    </select>
                    <select value={newUser.branch_id} onChange={e => setNewUser({...newUser, branch_id: e.target.value})} required className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold">
                      <option value="">ব্রাঞ্চ নির্বাচন করুন</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </>
                )}

                <div className="lg:col-span-3 pt-4">
                  <button type="submit" disabled={loading} className="w-full md:w-auto px-12 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all">
                    {loading ? 'অপেক্ষা করুন...' : 'অ্যাকাউন্ট তৈরি করুন'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                <tr><th className="px-8 py-5">Name</th><th className="px-8 py-5">Role</th><th className="px-8 py-5 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {getList().map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 group">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">{u.name.charAt(0)}</div>
                        <div>
                          <p className="font-black text-slate-800">{u.name} {u.id === currentUser.id && '(You)'}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {u.role.replace('_', ' ')}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {u.id !== currentUser.id && (
                        <button 
                          onClick={() => handleDeleteUser(u.id, u.name)} 
                          disabled={loading}
                          className="text-red-500 text-xs font-black uppercase tracking-widest hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {getList().map(u => (
              <div key={u.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">{u.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">@{u.username}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider">
                      {u.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {u.id !== currentUser.id && (
                  <button 
                    onClick={() => handleDeleteUser(u.id, u.name)} 
                    className="p-3 bg-red-50 text-red-500 rounded-xl active:scale-95 transition-transform"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementPanel;
