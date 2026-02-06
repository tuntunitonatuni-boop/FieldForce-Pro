
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

  const assignedBranch = branches.find(b => b.id === user.branch_id) || branches[0] || { id: 'temp', name: 'Loading...', lat: 0, lng: 0, radius: 250 };

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

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setError("Location services disabled."),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user.id]);

  const handleCheckIn = async () => {
    if (!currentPos || !assignedBranch.id) return;
    setIsChecking(true);
    const distance = getDistance(currentPos.lat, currentPos.lng, assignedBranch.lat, assignedBranch.lng);
    const radius = assignedBranch.radius || 250;

    if (distance <= radius) {
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
      } catch (err) { alert("Error checking in."); }
    } else {
      alert(`You are ${Math.round(distance - radius)}m away from office.`);
    }
    setIsChecking(false);
  };

  const handleCheckOut = async () => {
    if (!attendance) return;
    if (!confirm("Are you sure you want to clock out?")) return;
    setIsChecking(true);
    try {
      const now = new Date().toISOString();
      await supabase.from('attendance').update({ check_out: now }).eq('id', attendance.id);
      setAttendance({ ...attendance, check_out: now });
      onAttendanceChange({ ...attendance, check_out: now });
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } catch (err) { alert("Error checking out."); }
    setIsChecking(false);
  };

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2rem] p-6 md:p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden shrink-0 mt-2">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        <div className="relative z-10">
          <p className="text-blue-200 text-xs font-black uppercase tracking-widest mb-2">Assigned Branch</p>
          <h3 className="text-2xl font-black leading-tight break-words">{assignedBranch.name}</h3>
          <div className="flex items-center space-x-2 mt-4">
             <div className={`w-3 h-3 rounded-full ${attendance?.check_in && !attendance.check_out ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
             <p className="text-sm font-bold opacity-90">
               {attendance?.check_in && !attendance.check_out ? (attendance.status === 'on-field' ? 'Active (Field)' : 'Active (Office)') : 'Not Active'}
             </p>
          </div>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">{error}</div>}

      {/* Main Action Area */}
      <div className="flex-1 flex flex-col justify-center items-center py-2">
          <div className="relative group">
            <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${attendance?.check_in && !attendance?.check_out ? 'bg-red-500/30' : 'bg-green-500/30'}`}></div>
            {!attendance?.check_in ? (
              <button 
                onClick={handleCheckIn} 
                disabled={isChecking || !currentPos} 
                className="relative w-48 h-48 md:w-56 md:h-56 rounded-full bg-white border-8 border-slate-50 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 group-hover:border-blue-50"
              >
                <div className="w-32 h-32 rounded-full bg-gradient-to-b from-green-400 to-green-600 flex items-center justify-center shadow-inner mb-2">
                   <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                </div>
                <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Punch In</span>
              </button>
            ) : !attendance.check_out ? (
              <button 
                onClick={handleCheckOut} 
                className="relative w-48 h-48 md:w-56 md:h-56 rounded-full bg-white border-8 border-slate-50 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center transition-all active:scale-95 group-hover:border-red-50"
              >
                <div className="w-32 h-32 rounded-full bg-gradient-to-b from-red-500 to-red-600 flex items-center justify-center shadow-inner mb-2">
                   <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </div>
                <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Clock Out</span>
              </button>
            ) : (
               <div className="w-48 h-48 rounded-full bg-slate-100 border-4 border-slate-200 flex flex-col items-center justify-center text-slate-400">
                  <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-xs font-black uppercase tracking-widest">Done Today</span>
               </div>
            )}
          </div>
          <p className="mt-8 text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
            {isChecking ? 'Verifying location...' : (attendance?.check_in && !attendance.check_out ? 'Tap to end shift' : (attendance?.check_out ? 'Shift Completed' : 'Tap to start shift'))}
          </p>
      </div>

      {/* Stats Footer */}
      <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-slate-100 grid grid-cols-2 gap-4 shrink-0">
         <div className="text-center p-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Entry Time</p>
            <p className="text-lg font-black text-slate-800">{formatDate(attendance?.check_in || null)}</p>
         </div>
         <div className="text-center p-2 border-l border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Exit Time</p>
            <p className="text-lg font-black text-slate-800">{formatDate(attendance?.check_out || null)}</p>
         </div>
      </div>
    </div>
  );
};

export default AttendancePanel;
