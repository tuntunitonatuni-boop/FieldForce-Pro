
import React, { useEffect, useRef, useState } from 'react';
import { User, Role } from '../types';

interface LiveMapProps {
  users: User[];
  trackingData: Record<string, { lat: number; lng: number; lastUpdate: string; name?: string; role?: string; branch_id?: string }>;
  currentUser: User;
}

const LiveMap: React.FC<LiveMapProps> = ({ users, trackingData, currentUser }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  // Check if Leaflet is loaded
  useEffect(() => {
    const checkLeaflet = setInterval(() => {
      if ((window as any).L) {
        setIsLeafletReady(true);
        clearInterval(checkLeaflet);
      }
    }, 100);
    return () => clearInterval(checkLeaflet);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || !isLeafletReady || mapRef.current) return;

    try {
      const L = (window as any).L;
      // Initialize map
      mapRef.current = L.map(mapContainerRef.current).setView([23.8103, 90.4125], 10);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Force a resize calculation to ensure tiles load
      const handleResize = () => {
        if (mapRef.current) mapRef.current.invalidateSize();
      };
      
      // Trigger multiple times to catch animation frames
      setTimeout(handleResize, 100);
      setTimeout(handleResize, 500);
      setTimeout(handleResize, 1000);
      
      // Add window resize listener
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };

    } catch (e) {
      console.error("Map init error:", e);
    }
  }, [isLeafletReady]);

  // Handle Markers
  useEffect(() => {
    if (!mapRef.current || !isLeafletReady) return;
    const L = (window as any).L;

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

    // Remove old markers
    Object.keys(markersRef.current).forEach(id => {
      if (!visibleUserIds.includes(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Auto-center logic
    if (visibleUserIds.includes(currentUser.id) && Object.keys(markersRef.current).length === 1) {
      const myData = trackingData[currentUser.id];
      // Only flyTo if distance is significant to avoid jitter
      mapRef.current.flyTo([myData.lat, myData.lng], 15, { animate: true, duration: 1 });
    }
    
    // Refresh size occasionally
    mapRef.current.invalidateSize();

  }, [trackingData, currentUser, isLeafletReady]);

  if (!isLeafletReady) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-2xl">
        <p className="text-slate-500 font-medium animate-pulse">ম্যাপ লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative" style={{ minHeight: '100%', minWidth: '100%' }}>
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 z-0 bg-slate-100" 
        style={{ width: '100%', height: '100%' }}
      />
      
      <div className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur p-3 rounded-xl shadow-xl text-xs border border-slate-200 min-w-[140px]">
        <h4 className="font-bold mb-2 text-slate-800 border-b border-slate-100 pb-1 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
          লাইভ লোকেশন
        </h4>
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white shadow-sm"></div>
            <span className="font-bold text-[10px] text-slate-600">অফিসার</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-white shadow-sm"></div>
            <span className="font-bold text-[10px] text-slate-600">এডমিন</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white shadow-sm"></div>
            <span className="font-bold text-[10px] text-slate-600">সুপার এডমিন</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
