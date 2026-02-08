
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
  const [loadError, setLoadError] = useState(false);

  // 1. Robust Leaflet Loader
  useEffect(() => {
    // Check if L is already defined
    if ((window as any).L) {
      setIsLeafletReady(true);
      return;
    }

    let attempts = 0;
    const checkLeaflet = setInterval(() => {
      attempts++;
      if ((window as any).L) {
        setIsLeafletReady(true);
        clearInterval(checkLeaflet);
      } else if (attempts > 200) { // 10 seconds timeout
        setLoadError(true);
        clearInterval(checkLeaflet);
      }
    }, 50);

    return () => clearInterval(checkLeaflet);
  }, []);

  // 2. Map Initialization with ResizeObserver
  useEffect(() => {
    if (!mapContainerRef.current || !isLeafletReady || mapRef.current) return;

    try {
      const L = (window as any).L;

      // Init Map
      const map = L.map(mapContainerRef.current, {
        zoomControl: false, // We hide default zoom to save mobile space
        attributionControl: true,
        fadeAnimation: true,
        markerZoomAnimation: true
      }).setView([23.8103, 90.4125], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);

      mapRef.current = map;

      // CRITICAL FIX: ResizeObserver prevents grey tiles when container resizes
      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      
      resizeObserver.observe(mapContainerRef.current);

      // Force initial resize calculation after a short tick
      setTimeout(() => map.invalidateSize(), 200);

      return () => {
        resizeObserver.disconnect();
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (e) {
      console.error("Map Init Failed:", e);
      setLoadError(true);
    }
  }, [isLeafletReady]);

  // 3. Handle Markers & Updates
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

      const roleColor = data.role === Role.SUPER_ADMIN ? '#ef4444' : data.role === Role.BRANCH_ADMIN ? '#f97316' : '#3b82f6';
      const initials = (data.name || 'U').charAt(0).toUpperCase();
      
      // Responsive Marker Icon
      const customIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            transform: translate(0px, -50%);
          ">
            <div style="
              width: 44px;
              height: 44px;
              border-radius: 50%;
              background-color: ${roleColor};
              border: 3px solid white;
              box-shadow: 0 4px 10px rgba(0,0,0,0.2);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 900;
              font-size: 16px;
              text-transform: uppercase;
            ">
              ${initials}
            </div>
            <div style="
              margin-top: 4px;
              background: rgba(255, 255, 255, 0.95);
              padding: 2px 8px;
              border-radius: 6px;
              font-size: 10px;
              font-weight: 700;
              color: #1e293b;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              white-space: nowrap;
              border: 1px solid #e2e8f0;
            ">
              ${data.name?.split(' ')[0] || 'Unknown'}
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22] // Centered
      });

      if (markersRef.current[userId]) {
        // Smoothly animate to new position
        markersRef.current[userId].setLatLng([data.lat, data.lng]);
        markersRef.current[userId].setIcon(customIcon);
        markersRef.current[userId].setZIndexOffset(userId === currentUser.id ? 1000 : 0);
      } else {
        const marker = L.marker([data.lat, data.lng], { icon: customIcon }).addTo(mapRef.current);
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

    // Auto-center logic (Only if tracking self or only 1 user visible)
    if (visibleUserIds.includes(currentUser.id) && trackingData[currentUser.id]) {
      const myData = trackingData[currentUser.id];
      // Only pan if it's the first load OR user is solitary. 
      // We avoid aggressive panning if the user is dragging the map.
      if (Object.keys(markersRef.current).length === 1) {
         mapRef.current.setView([myData.lat, myData.lng], 15);
      }
    }

  }, [trackingData, currentUser, isLeafletReady]);

  // Loading / Error States
  if (loadError) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-red-50 text-red-600 p-4 text-center rounded-2xl border border-red-100">
        <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <p className="font-bold text-sm">Map Connection Failed</p>
        <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-white border border-red-200 rounded-lg shadow-sm text-xs font-bold uppercase tracking-widest hover:bg-red-50">
          Retry
        </button>
      </div>
    );
  }

  if (!isLeafletReady) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-2xl animate-pulse">
        <div className="flex flex-col items-center opacity-50">
          <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-500 rounded-full animate-spin mb-3"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initializing Satellites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative bg-slate-100 overflow-hidden isolate">
      {/* 
        Tailwind Conflict Fix: 
        We inject styles specifically for this component to ensure Leaflet images 
        don't get 'max-width: 100%' from Tailwind's reset.
      */}
      <style>{`
        .leaflet-pane img, 
        .leaflet-tile-container img { 
          max-width: none !important; 
          max-height: none !important; 
        }
        .leaflet-container {
          background: #f1f5f9;
          font-family: inherit;
        }
      `}</style>

      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 w-full h-full z-0" 
      />
      
      {/* Mobile-Friendly Legend */}
      <div className="absolute bottom-5 left-4 z-[400]">
        <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200/50 flex flex-col gap-2">
           <div className="flex items-center space-x-2">
             <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white"></div>
             <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide">Officer</span>
           </div>
           <div className="flex items-center space-x-2">
             <div className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white"></div>
             <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide">Admin</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
