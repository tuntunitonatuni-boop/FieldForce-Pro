
import React, { useState, useEffect } from 'react';
import { User, Branch, Attendance } from '../types';
import { getDistance, formatDate } from '../utils';
import { BRANCHES } from '../constants';

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
    // Load current attendance from local storage
    const saved = localStorage.getItem(`attendance_${user.id}_${new Date().toISOString().split('T')[0]}`);
    if (saved) setAttendance(JSON.parse(saved));

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setError("Please enable GPS for attendance."),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user.id]);

  const handleCheckIn = () => {
    if (!currentPos) return;

    setIsChecking(true);
    const distance = getDistance(currentPos.lat, currentPos.lng, assignedBranch.lat, assignedBranch.lng);

    if (distance <= assignedBranch.radius) {
      const newAttendance: Attendance = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: user.id,
        check_in: new Date().toISOString(),
        check_out: null,
        status: 'present',
        date: new Date().toISOString().split('T')[0]
      };
      setAttendance(newAttendance);
      localStorage.setItem(`attendance_${user.id}_${newAttendance.date}`, JSON.stringify(newAttendance));
      onAttendanceChange(newAttendance);
    } else {
      alert(`You are ${Math.round(distance - assignedBranch.radius)}m outside the geo-fence for ${assignedBranch.name}.`);
    }
    setIsChecking(false);
  };

  const handleCheckOut = () => {
    if (!attendance) return;
    const updated = { ...attendance, check_out: new Date().toISOString() };
    setAttendance(updated);
    localStorage.setItem(`attendance_${user.id}_${updated.date}`, JSON.stringify(updated));
    onAttendanceChange(updated);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
      <div className="bg-blue-600 p-8 text-white text-center">
        <h3 className="text-xl font-bold mb-1">Office Presence</h3>
        <p className="text-blue-100 text-sm">{assignedBranch.name}</p>
      </div>
      
      <div className="p-8">
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          {error}
        </div>}

        <div className="flex justify-between items-center mb-8">
          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Check In</p>
            <p className="text-lg font-mono font-semibold">{formatDate(attendance?.check_in || null)}</p>
          </div>
          <div className="h-8 w-px bg-slate-100"></div>
          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Check Out</p>
            <p className="text-lg font-mono font-semibold">{formatDate(attendance?.check_out || null)}</p>
          </div>
        </div>

        <div className="space-y-4">
          {!attendance?.check_in ? (
            <button
              onClick={handleCheckIn}
              disabled={isChecking || !currentPos}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
                isChecking || !currentPos ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isChecking ? 'Checking Geo-Fence...' : 'Mark Arrival'}
            </button>
          ) : !attendance.check_out ? (
            <button
              onClick={handleCheckOut}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-lg shadow-lg transition-all"
            >
              Mark Departure
            </button>
          ) : (
            <div className="text-center py-4 bg-slate-50 rounded-xl">
              <p className="text-slate-600 font-medium">Shift Completed</p>
              <p className="text-xs text-slate-400 mt-1">Great work today!</p>
            </div>
          )}
        </div>

        {currentPos && (
          <div className="mt-8 pt-6 border-t border-slate-50">
            <div className="flex items-center text-xs text-slate-400">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span>Current: {currentPos.lat.toFixed(4)}, {currentPos.lng.toFixed(4)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePanel;
