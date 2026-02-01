
import React, { useState, useEffect } from 'react';
import { User, Branch, Attendance } from '../types';
import { getDistance, formatDate } from '../utils';
import { BRANCHES } from '../constants';
import { supabase } from '../lib/supabase';

interface AttendancePanelProps {
  user: User;
  onAttendanceChange: (attendance: Attendance) => void;
}

const AttendancePanel: React.FC<AttendancePanelProps> = ({ user, onAttendanceChange }) => {
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const assignedBranch = BRANCHES.find(b => b.id === user.branch_id) || BRANCHES[0];

  useEffect(() => {
    const fetchAttendance = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (data && !error) {
        setAttendance({
          id: data.id,
          user_id: data.user_id,
          check_in: data.check_in,
          check_out: data.check_out,
          status: data.status as any,
          date: data.date
        });
      }
    };

    fetchAttendance();

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setError(null);
      },
      (err) => {
        switch(err.code) {
          case err.PERMISSION_DENIED:
            setError("লোকেশন পারমিশন বন্ধ। ব্রাউজার সেটিং থেকে এটি অন করুন।");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("লোকেশন পাওয়া যাচ্ছে না। জিপিএস অন করুন।");
            break;
          default:
            setError("লোকেশন পেতে সমস্যা হচ্ছে।");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user.id]);

  const handleCheckIn = async () => {
    if (!currentPos) {
      alert("লোকেশন পাওয়া যায়নি। দয়া করে কিছুক্ষণ অপেক্ষা করুন।");
      return;
    }

    setIsChecking(true);
    const distance = getDistance(currentPos.lat, currentPos.lng, assignedBranch.lat, assignedBranch.lng);

    if (distance <= assignedBranch.radius) {
      const { data, error } = await supabase.from('attendance').insert({
        user_id: user.id,
        check_in: new Date().toISOString(),
        status: 'present',
      }).select().single();

      if (!error && data) {
        const newAttendance: Attendance = {
          id: data.id,
          user_id: data.user_id,
          check_in: data.check_in,
          check_out: null,
          status: 'present',
          date: data.date
        };
        setAttendance(newAttendance);
        onAttendanceChange(newAttendance);
      } else {
        alert("ডাটাবেজ সেভ করতে সমস্যা হয়েছে।");
      }
    } else {
      alert(`আপনি অফিস থেকে ${Math.round(distance - assignedBranch.radius)} মিটার দূরে আছেন। চেক-ইন করতে অফিসের ২৫০ মিটারের মধ্যে থাকতে হবে।`);
    }
    setIsChecking(false);
  };

  const handleCheckOut = async () => {
    if (!attendance) return;
    const { error } = await supabase
      .from('attendance')
      .update({ check_out: new Date().toISOString() })
      .eq('id', attendance.id);

    if (!error) {
      const updated = { ...attendance, check_out: new Date().toISOString() };
      setAttendance(updated);
      onAttendanceChange(updated);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 w-full">
      <div className="bg-blue-600 p-8 text-white text-center">
        <h3 className="text-xl font-bold mb-1">অফিস হাজিরা</h3>
        <p className="text-blue-100 text-sm font-medium">{assignedBranch.name}</p>
      </div>
      
      <div className="p-8">
        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-100 flex items-start">
          <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          <span>{error}</span>
        </div>}

        <div className="flex justify-between items-center mb-8">
          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">প্রবেশ</p>
            <p className="text-lg font-mono font-bold text-slate-800">{formatDate(attendance?.check_in || null)}</p>
          </div>
          <div className="h-8 w-px bg-slate-100"></div>
          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">প্রস্থান</p>
            <p className="text-lg font-mono font-bold text-slate-800">{formatDate(attendance?.check_out || null)}</p>
          </div>
        </div>

        <div className="space-y-4">
          {!attendance?.check_in ? (
            <button
              onClick={handleCheckIn}
              disabled={isChecking || !currentPos}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
                isChecking || !currentPos ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white transform active:scale-95'
              }`}
            >
              {isChecking ? 'ভেরিফাই হচ্ছে...' : 'অফিসে প্রবেশ করুন'}
            </button>
          ) : !attendance.check_out ? (
            <button
              onClick={handleCheckOut}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95"
            >
              অফিস থেকে বিদায় নিন
            </button>
          ) : (
            <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-green-600 font-bold text-lg">ডিউটি শেষ!</p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">আগামীকাল আবার দেখা হবে</p>
            </div>
          )}
        </div>

        {currentPos && (
          <div className="mt-8 pt-6 border-t border-slate-50">
            <div className="flex items-center text-xs text-slate-400 font-medium">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span>বর্তমান লোকেশন সক্রিয়: {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePanel;
