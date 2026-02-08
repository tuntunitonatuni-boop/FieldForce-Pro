
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import AttendancePanel from './components/AttendancePanel';
import LiveMap from './components/LiveMap';
import Dashboard from './components/Dashboard';
import ProfilePanel from './components/ProfilePanel';
import ManagementPanel from './components/ManagementPanel';
import ExpensePanel from './components/ExpensePanel';
import Auth from './components/Auth';
import { User, Role, Branch } from './types';
import { supabase } from './lib/supabase';
import { getDistance } from './utils';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  const [isTracking, setIsTracking] = useState(false);
  const [trackingData, setTrackingData] = useState<Record<string, any>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  const mapProfileData = (p: any): User => ({
    id: p.id,
    name: p.full_name || 'Staff Member',
    email: p.email || '',
    username: p.username,
    role: (p.role as Role) || Role.OFFICER,
    branch_id: p.branch_id || '',
    staff_pin: p.staff_pin,
    target_daily: p.target_daily,
    target_weekly: p.target_weekly,
    target_monthly: p.target_monthly,
    phone_number: p.phone_number,
    bio: p.bio
  });

  const fetchData = async () => {
    try {
      const { data: bData } = await supabase.from('branches').select('*');
      setBranches(bData || []);
      const { data: uData } = await supabase.from('profiles').select('*');
      if (uData) setAllUsers(uData.map(mapProfileData));
    } catch (e) {
      console.error("Data Fetch Error:", e);
    }
  };

  const syncUser = async (userId: string) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (profile) {
      const mappedUser = mapProfileData(profile);
      setUser(mappedUser);
      if (mappedUser.role === Role.DRIVER) setActiveTab('expenses');
      fetchData();
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await syncUser(session.user.id);
      setLoading(false);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) await syncUser(session.user.id);
      else { setUser(null); setAllUsers([]); setIsTracking(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const toggleTracking = async () => {
    if (!user) return;
    const newTrackingState = !isTracking;
    setIsTracking(newTrackingState);
    const today = new Date().toISOString().split('T')[0];
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const branch = branches.find(b => b.id === user.branch_id);
      let newStatus = 'on-field';
      if (!newTrackingState && branch) {
        const dist = getDistance(pos.coords.latitude, pos.coords.longitude, branch.lat, branch.lng);
        if (dist <= (branch.radius || 250)) newStatus = 'present';
      } else if (newTrackingState) {
        newStatus = 'on-field';
      }
      await supabase.from('attendance').update({ status: newStatus }).eq('user_id', user.id).eq('date', today);
      fetchData();
    });
  };

  useEffect(() => {
    if (!user || !isTracking) return;
    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          await supabase.from('movement_logs').insert({ 
            user_id: user.id, 
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude 
          });
        } catch (e) { console.error(e); }
      }, null, { enableHighAccuracy: true });
    };
    sendLocation();
    const interval = window.setInterval(sendLocation, 15000);
    return () => clearInterval(interval);
  }, [user, isTracking]);

  useEffect(() => {
    if (!user) return;
    const fetchLocations = async () => {
      try {
        const fiveMinsAgo = new Date(Date.now() - 300000).toISOString();
        const { data } = await supabase.from('movement_logs').select('*').gt('timestamp', fiveMinsAgo).order('timestamp', { ascending: false });
        if (data) {
          const latest: any = {};
          data.forEach((log: any) => {
            if (!latest[log.user_id]) {
              const profile = allUsers.find(u => u.id === log.user_id);
              if (user.role === Role.BRANCH_ADMIN && profile?.branch_id !== user.branch_id) return;
              if (user.role === Role.OFFICER && log.user_id !== user.id) return;
              latest[log.user_id] = { lat: log.lat, lng: log.lng, lastUpdate: log.timestamp, name: profile?.name, role: profile?.role, branch_id: profile?.branch_id };
            }
          });
          setTrackingData(latest);
        }
      } catch (e) { console.error(e); }
    };
    fetchLocations();
    const interval = window.setInterval(fetchLocations, 10000);
    return () => clearInterval(interval);
  }, [user, allUsers]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
      <p className="font-bold text-slate-400">FieldForce Pro লোডিং হচ্ছে...</p>
    </div>
  );

  if (!user) return <Auth onAuthComplete={fetchData} />;

  return (
    <Layout user={user} onLogout={() => supabase.auth.signOut()} activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="max-w-6xl mx-auto h-full relative flex flex-col min-h-0">
        {activeTab === 'attendance' && <AttendancePanel user={user} branches={branches} onAttendanceChange={fetchData} />}
        
        {activeTab === 'tracking' && (
          // Use flex-1 to fill the remaining space, but force a minimum height
          <div className="flex flex-col h-full space-y-4">
             {/* Header */}
             <div className="bg-white p-4 rounded-2xl border flex justify-between items-center shadow-sm shrink-0">
               <div>
                  <h4 className="font-black text-slate-800 text-sm">লাইভ লোকেশন</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{branches.find(b => b.id === user.branch_id)?.name || 'Branch'}</p>
               </div>
               <button 
                 onClick={toggleTracking} 
                 className={`px-4 py-2 rounded-xl font-black text-xs transition-all shadow-md ${isTracking ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-600 text-white'}`}
               >
                 {isTracking ? 'Stop' : 'Start'}
               </button>
             </div>

             {/* Map Container - Forced Height Calculation for Mobile & Desktop */}
             <div 
               className="w-full relative rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-slate-200"
               style={{ 
                 // On mobile (portrait), we want it to take most of the screen. 
                 // We use a calculated height based on viewport (dvh) minus header/nav.
                 // On desktop, we let flex handle it.
                 height: 'calc(100dvh - 220px)',
                 minHeight: '400px'
               }}
             >
               <LiveMap users={allUsers} trackingData={trackingData} currentUser={user} />
             </div>
          </div>
        )}

        {activeTab === 'expenses' && <ExpensePanel currentUser={user} allUsers={allUsers} />}
        {activeTab === 'dashboard' && <Dashboard currentUser={user} allUsers={allUsers} trackingData={trackingData} branches={branches} />}
        {activeTab === 'management' && <ManagementPanel currentUser={user} allUsers={allUsers} branches={branches} onRefresh={fetchData} />}
        {activeTab === 'profile' && <ProfilePanel user={user} branches={branches} onUpdate={(u) => setUser(u)} />}
      </div>
    </Layout>
  );
};

export default App;
