
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
      (err) => setError("লোকেশন পাওয়া যাচ্ছে না। জিপিএস চেক করুন।"),
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
        alert("হাজিরা সফল হয়েছে!");
      } catch (err) { alert("হাজিরা দিতে সমস্যা হয়েছে।"); }
    } else {
      alert(`আপনি অফিস থেকে ${Math.round(distance - radius)} মিটার দূরে আছেন।`);
    }
    setIsChecking(false);
  };

  const handleCheckOut = async () => {
    if (!attendance) return;
    setIsChecking(true);
    try {
      const now = new Date().toISOString();
      await supabase.from('attendance').update({ check_out: now }).eq('id', attendance.id);
      setAttendance({ ...attendance, check_out: now });
      onAttendanceChange({ ...attendance, check_out: now });
      alert("ছুটি নিশ্চিত হয়েছে।");
    } catch (err) { alert("সমস্যা হয়েছে।"); }
    setIsChecking(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 w-full">
      <div className="bg-blue-600 p-8 text-white text-center">
        <h3 className="text-xl font-bold mb-1">অফিস হাজিরা</h3>
        <p className="text-blue-100 text-sm font-medium">{assignedBranch.name}</p>
        {attendance?.status && (
          <span className="inline-block mt-3 px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">
            অবস্থান: {attendance.status === 'present' ? 'অফিস' : 'ফিল্ড ভিজিট'}
          </span>
        )}
      </div>
      <div className="p-8">
        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold">{error}</div>}
        <div className="flex justify-between items-center mb-8 text-center">
          <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">প্রবেশ</p><p className="font-mono font-bold">{formatDate(attendance?.check_in || null)}</p></div>
          <div className="h-8 w-px bg-slate-100"></div>
          <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">প্রস্থান</p><p className="font-mono font-bold">{formatDate(attendance?.check_out || null)}</p></div>
        </div>
        <div className="space-y-4">
          {!attendance?.check_in ? (
            <button onClick={handleCheckIn} disabled={isChecking || !currentPos} className="w-full py-4 bg-green-500 text-white rounded-xl font-bold shadow-lg disabled:bg-slate-200">
              {isChecking ? 'ভেরিফাই হচ্ছে...' : 'হাজিরা দিন'}
            </button>
          ) : !attendance.check_out ? (
            <button onClick={handleCheckOut} className="w-full py-4 bg-red-500 text-white rounded-xl font-bold">ছুটি নিন</button>
          ) : (
            <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-green-600 font-bold">ডিউটি শেষ!</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendancePanel;
