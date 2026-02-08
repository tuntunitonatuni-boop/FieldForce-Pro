
import React, { useState, useEffect } from 'react';
import { User, Branch, Attendance } from '../types';
import { getDistance, formatDate } from '../utils';
import { supabase } from '../lib/supabase';

interface AttendancePanelProps {
  user: User;
  branches: Branch[];
  onAttendanceChange: (attendance: Attendance) => void;
}

const AttendancePanel: React.FC<AttendancePanelProps> = ({ user, branches, onAttendanceChange }) => {
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  const assignedBranch = branches.find(b => b.id === user.branch_id) || branches[0] || { id: 'temp', name: 'Loading...', lat: 0, lng: 0, radius: 250 };

  const fetchLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("আপনার ডিভাইসে জিওলোকেশন সাপোর্ট করছে না।");
      return;
    }

    const success = (pos: GeolocationPosition) => {
      setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setGpsAccuracy(pos.coords.accuracy);
      setError(null);
    };

    const fail = (err: GeolocationPositionError) => {
      console.warn("Location error:", err);
      if (err.code === 1) setError("GPS পারমিশন ব্লক করা আছে। অ্যাপ সেটিংস থেকে লোকেশন পারমিশন অন করুন।");
      else if (err.code === 2) setError("GPS সিগন্যাল পাওয়া যাচ্ছে না। দয়া করে খোলা জায়গায় যান এবং ফোনের লোকেশন অন করুন।");
      else if (err.code === 3) setError("লোকেশন বের করতে বেশি সময় লাগছে। আবার চেষ্টা করুন।");
      else setError("লোকেশন সার্ভিস কাজ করছে না।");
    };

    navigator.geolocation.getCurrentPosition(success, fail, { 
      enableHighAccuracy: true, 
      timeout: 15000, 
      maximumAge: 10000 
    });
  };

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', today).maybeSingle();
        if (data) {
          setAttendance({
            id: String(data.id),
            user_id: data.user_id,
            check_in: data.check_in,
            check_out: data.check_out,
            status: data.status as any,
            date: data.date
          });
        }
      } catch (e) { console.error(e); }
    };
    fetchAttendance();
    
    // Initial fetch
    fetchLocation();

    // Watch position
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsAccuracy(pos.coords.accuracy);
        setError(null);
      },
      (err) => {
        // Only show error if we don't have a position yet
        if (!currentPos) {
           if (err.code === 1) setError("GPS পারমিশন নেই।");
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user.id]);

  const handleCheckIn = async () => {
    if (!currentPos || !assignedBranch.id) {
        fetchLocation(); // Try again
        return alert("লোকেশন পাওয়া যাচ্ছে না। অনুগ্রহ করে অপেক্ষা করুন অথবা GPS অন আছে কিনা চেক করুন।");
    }
    
    setIsChecking(true);
    const distance = getDistance(currentPos.lat, currentPos.lng, assignedBranch.lat, assignedBranch.lng);
    const radius = assignedBranch.radius || 250;

    // Allow a small buffer for GPS inaccuracy (e.g., +20 meters)
    const allowedRadius = radius + 20;

    if (distance <= allowedRadius) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();
        const { data, error: insertError } = await supabase.from('attendance').insert({
          user_id: user.id,
          check_in: now,
          status: 'present', // Initial status when checking in at office
          date: today
        }).select().single();

        if (insertError) throw insertError;
        const newAttendance: Attendance = {
          id: String(data.id),
          user_id: data.user_id,
          check_in: data.check_in,
          check_out: null,
          status: 'present',
          date: data.date
        };
        setAttendance(newAttendance);
        onAttendanceChange(newAttendance);
        // Haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(200);
      } catch (err) { alert("চেক-ইন করতে সমস্যা হয়েছে। ইন্টারনেট কানেকশন চেক করুন।"); }
    } else {
      alert(`আপনি অফিস থেকে ${Math.round(distance - radius)} মিটার দূরে আছেন। চেক-ইন সম্ভব নয়।`);
    }
    setIsChecking(false);
  };

  const handleCheckOut = async () => {
    if (!attendance) return;
    if (!confirm("আপনি কি আজকের মতো ছুটি (Check Out) নিতে চান?")) return;
    setIsChecking(true);
    try {
      const now = new Date().toISOString();
      await supabase.from('attendance').update({ check_out: now }).eq('id', attendance.id);
      setAttendance({ ...attendance, check_out: now });
      onAttendanceChange({ ...attendance, check_out: now });
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } catch (err) { alert("চেক-আউট করতে সমস্যা হয়েছে।"); }
    setIsChecking(false);
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-140px)] justify-between space-y-4">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        <div className="relative z-10">
          <p className="text-blue-200 text-xs font-black uppercase tracking-widest mb-1 md:mb-2">আপনার ব্রাঞ্চ</p>
          <h3 className="text-xl md:text-2xl font-black leading-tight break-words">{assignedBranch.name}</h3>
          <div className="flex items-center space-x-2 mt-3 md:mt-4">
             <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${attendance?.check_in && !attendance.check_out ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
             <p className="text-xs md:text-sm font-bold opacity-90">
               {attendance?.check_in && !attendance.check_out ? (attendance.status === 'on-field' ? 'Active (Field)' : 'Active (Office)') : 'Not Active'}
             </p>
          </div>
          {currentPos && (
             <p className="mt-2 text-[10px] text-blue-200 font-mono">
               GPS Accuracy: {gpsAccuracy ? Math.round(gpsAccuracy) + 'm' : '...'}
             </p>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={fetchLocation} className="px-3 py-1 bg-white border border-red-200 rounded-lg text-[10px] uppercase shadow-sm">Retry GPS</button>
        </div>
      )}

      {/* Main Action Area */}
      <div className="flex-1 flex flex-col justify-center items-center py-4">
          <div className="relative group">
            <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${attendance?.check_in && !attendance?.check_out ? 'bg-red-500/30' : 'bg-green-500/30'}`}></div>
            {!attendance?.check_in ? (
              <button 
                onClick={handleCheckIn} 
                disabled={isChecking} 
                className="relative w-44 h-44 md:w-56 md:h-56 rounded-full bg-white border-8 border-slate-50 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 group-hover:border-blue-50"
              >
                <div className={`w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center shadow-inner mb-2 ${currentPos ? 'bg-gradient-to-b from-green-400 to-green-600' : 'bg-slate-300'}`}>
                   <svg className="w-10 h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                </div>
                <span className="text-xs md:text-sm font-black text-slate-700 uppercase tracking-widest">
                   {currentPos ? 'Punch In' : 'Finding GPS...'}
                </span>
              </button>
            ) : !attendance.check_out ? (
              <button 
                onClick={handleCheckOut} 
                className="relative w-44 h-44 md:w-56 md:h-56 rounded-full bg-white border-8 border-slate-50 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center transition-all active:scale-95 group-hover:border-red-50"
              >
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-b from-red-500 to-red-600 flex items-center justify-center shadow-inner mb-2">
                   <svg className="w-10 h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </div>
                <span className="text-xs md:text-sm font-black text-slate-700 uppercase tracking-widest">Clock Out</span>
              </button>
            ) : (
               <div className="w-44 h-44 md:w-56 md:h-56 rounded-full bg-slate-100 border-4 border-slate-200 flex flex-col items-center justify-center text-slate-400">
                  <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-xs font-black uppercase tracking-widest">Done Today</span>
               </div>
            )}
          </div>
          <p className="mt-6 md:mt-8 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
            {isChecking ? 'Verifying location...' : (attendance?.check_in && !attendance.check_out ? 'Tap to end shift' : (attendance?.check_out ? 'Shift Completed' : (currentPos ? 'Tap to start shift' : 'Waiting for GPS...')))}
          </p>
      </div>

      {/* Stats Footer */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 shadow-lg border border-slate-100 grid grid-cols-2 gap-4 shrink-0">
         <div className="text-center p-1">
            <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase mb-1">Entry Time</p>
            <p className="text-base md:text-lg font-black text-slate-800">{formatDate(attendance?.check_in || null)}</p>
         </div>
         <div className="text-center p-1 border-l border-slate-100">
            <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase mb-1">Exit Time</p>
            <p className="text-base md:text-lg font-black text-slate-800">{formatDate(attendance?.check_out || null)}</p>
         </div>
      </div>
    </div>
  );
};

export default AttendancePanel;
