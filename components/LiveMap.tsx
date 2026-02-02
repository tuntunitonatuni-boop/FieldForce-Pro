
import React, { useEffect, useRef, useState } from 'react';
import { User, Role } from '../types';

interface LiveMapProps {
  users: User[];
  trackingData: Record<string, { lat: number; lng: number; lastUpdate: string; name?: string; role?: string; branch_id?: string }>;
  currentUser: User;
}

declare const L: any;

const LiveMap: React.FC<LiveMapProps> = ({ users, trackingData, currentUser }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  useEffect(() => {
    const checkLeaflet = setInterval(() => {
      if (typeof L !== 'undefined') {
        setIsLeafletReady(true);
        clearInterval(checkLeaflet);
      }
    }, 100);
    return () => clearInterval(checkLeaflet);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || !isLeafletReady || mapRef.current) return;

    try {
      mapRef.current = L.map(mapContainerRef.current).setView([23.8103, 90.4125], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    } catch (e) {
      console.error("Map init error:", e);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isLeafletReady]);

  useEffect(() => {
    if (!mapRef.current || !isLeafletReady) return;

    const visibleUserIds = Object.keys(trackingData).filter(userId => {
      const data = trackingData[userId];
      if (currentUser.role === Role.SUPER_ADMIN) return true;
      if (currentUser.role === Role.BRANCH_ADMIN) return data.branch_id === currentUser.branch_id;
      return userId === currentUser.id;
    });

    visibleUserIds.forEach(userId => {
      const data = trackingData[userId];
      if (!data) return;

      const markerColor = data.role === Role.SUPER_ADMIN ? '#ef4444' : data.role === Role.BRANCH_ADMIN ? '#f97316' : '#3b82f6';
      const initials = (data.name || 'U').charAt(0).toUpperCase();
      
      const customIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div class="marker-pin">
            <div class="marker-avatar" style="background-color: ${markerColor}">
              ${initials}
            </div>
            <div class="marker-label">
              ${data.name || 'Unknown'}
            </div>
          </div>
        `,
        iconSize: [60, 50],
        iconAnchor: [30, 45]
      });

      if (markersRef.current[userId]) {
        markersRef.current[userId].setLatLng([data.lat, data.lng]);
        // Update content if name changes (unlikely but good for consistency)
        markersRef.current[userId].setIcon(customIcon);
      } else {
        const marker = L.marker([data.lat, data.lng], { icon: customIcon }).addTo(mapRef.current)
          .bindPopup(`
            <div class="p-1">
              <p class="font-bold text-slate-800">${data.name || 'Unknown'}</p>
              <p class="text-xs text-slate-500 capitalize">${(data.role || '').replace('_', ' ')}</p>
              <p class="text-[10px] text-slate-400 mt-1">সর্বশেষ: ${new Date(data.lastUpdate).toLocaleTimeString()}</p>
            </div>
          `);
        markersRef.current[userId] = marker;
      }
    });

    Object.keys(markersRef.current).forEach(id => {
      if (!visibleUserIds.includes(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Auto-center on current user if tracking is on and map is fresh
    if (visibleUserIds.includes(currentUser.id) && Object.keys(markersRef.current).length === 1) {
      const myData = trackingData[currentUser.id];
      mapRef.current.setView([myData.lat, myData.lng], 15);
    }
  }, [trackingData, currentUser, isLeafletReady]);

  if (!isLeafletReady) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-100 rounded-2xl border border-slate-200">
        <p className="text-slate-500 font-medium">ম্যাপ লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="h-full relative overflow-hidden rounded-2xl shadow-inner border border-slate-200">
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur p-4 rounded-xl shadow-xl text-xs border border-slate-200 min-w-[150px]">
        <h4 className="font-bold mb-3 text-slate-800 border-b border-slate-100 pb-2 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
          লাইভ লোকেশন
        </h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border border-white"></div>
            <span className="font-medium text-slate-600">অফিসার</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500 border border-white"></div>
            <span className="font-medium text-slate-600">এডমিন</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div>
            <span className="font-medium text-slate-600">সুপার এডমিন</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
