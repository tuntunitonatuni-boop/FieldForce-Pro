
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import AttendancePanel from './components/AttendancePanel';
import LiveMap from './components/LiveMap';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import { User, Role } from './types';
import { getFieldAssistantAdvice } from './services/geminiService';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  const [isTracking, setIsTracking] = useState(false);
  const [trackingData, setTrackingData] = useState<Record<string, { lat: number, lng: number, lastUpdate: string }>>({});
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || 'User',
            role: session.user.user_metadata?.role || Role.OFFICER,
            branch_id: session.user.user_metadata?.branch_id || 'b1',
          });
        }
      } catch (err) {
        console.error("Auth session check failed", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || 'User',
          role: session.user.user_metadata?.role || Role.OFFICER,
          branch_id: session.user.user_metadata?.branch_id || 'b1',
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Tracking Logic
  useEffect(() => {
    if (!user || !isTracking) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setTrackingData(prev => ({
          ...prev,
          [user.id]: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            lastUpdate: new Date().toISOString()
          }
        }));
      },
      (err) => console.error("GPS Tracking Error:", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, isTracking]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsTracking(false);
  };

  const fetchAIAdvice = async () => {
    if (!user) return;
    setIsAdviceLoading(true);
    const advice = await getFieldAssistantAdvice(user.name, user.role, activeTab);
    setAiAdvice(advice);
    setIsAdviceLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-white font-medium animate-pulse">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthComplete={() => {}} />;
  }

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        {activeTab === 'attendance' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <AttendancePanel user={user} onAttendanceChange={(a) => console.log('Attendance Logged:', a)} />
          </div>
        )}

        {activeTab === 'tracking' && (
          <div className="flex-1 flex flex-col space-y-4 h-full min-h-[500px] pb-20 md:pb-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-4">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <div>
                  <h4 className="font-bold text-slate-800 tracking-tight">ট্র্যাকিং স্ট্যাটাস: {isTracking ? 'সক্রিয়' : 'বন্ধ'}</h4>
                  <p className="text-xs text-slate-500">লাইভ লোকেশন ড্যাশবোর্ডে পাঠানো হচ্ছে</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTracking(!isTracking)}
                className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold transition-all ${
                  isTracking 
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'
                }`}
              >
                {isTracking ? 'ভিজিট শেষ করুন' : 'ফিল্ড ভিজিট শুরু করুন'}
              </button>
            </div>
            <div className="flex-1">
              <LiveMap users={[user]} trackingData={trackingData} currentUser={user} />
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && <Dashboard currentUser={user} />}

        {/* AI Assistant FAB */}
        <div className="fixed right-6 bottom-24 md:bottom-8 z-30">
          <div className="relative group">
            {aiAdvice && (
              <div className="absolute bottom-16 right-0 w-80 bg-white p-5 rounded-2xl shadow-2xl border border-slate-100 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-bold text-slate-800 flex items-center">
                    <span className="mr-2">💡</span>
                    AI পরামর্শ
                  </h5>
                  <button onClick={() => setAiAdvice('')} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l18 18" /></svg>
                  </button>
                </div>
                <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {aiAdvice}
                </div>
              </div>
            )}
            <button 
              onClick={fetchAIAdvice}
              disabled={isAdviceLoading}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-110 active:scale-95 ${
                isAdviceLoading ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isAdviceLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
