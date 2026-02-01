
import React, { useEffect, useRef } from 'react';
import { User, Role } from '../types';

interface LiveMapProps {
  users: User[];
  trackingData: Record<string, { lat: number; lng: number; lastUpdate: string }>;
  currentUser: User;
}

declare const L: any;

const LiveMap: React.FC<LiveMapProps> = ({ users, trackingData, currentUser }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center (Downtown NYC)
    mapRef.current = L.map(mapContainerRef.current).setView([40.7128, -74.0060], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Filter which users we can see
    const visibleUsers = users.filter(u => {
      if (currentUser.role === Role.SUPER_ADMIN) return true;
      if (currentUser.role === Role.BRANCH_ADMIN) return u.branch_id === currentUser.branch_id;
      return u.id === currentUser.id;
    });

    // Update markers
    visibleUsers.forEach(user => {
      const pos = trackingData[user.id];
      if (!pos) return;

      if (markersRef.current[user.id]) {
        markersRef.current[user.id].setLatLng([pos.lat, pos.lng]);
      } else {
        const marker = L.marker([pos.lat, pos.lng]).addTo(mapRef.current)
          .bindPopup(`<b>${user.name}</b><br>${user.role.replace('_', ' ')}`);
        markersRef.current[user.id] = marker;
      }
    });

    // Remove stale markers
    Object.keys(markersRef.current).forEach(id => {
      if (!visibleUsers.find(u => u.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [trackingData, users, currentUser]);

  return (
    <div className="h-full relative overflow-hidden rounded-2xl shadow-inner border border-slate-200">
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      
      {/* Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg text-xs border border-slate-200">
        <h4 className="font-bold mb-2 text-slate-700">Live Status</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>Staff Location</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Updating in real-time</p>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
