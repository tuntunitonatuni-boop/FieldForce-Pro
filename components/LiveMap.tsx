
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

  // Check if Leaflet is loaded from CDN
  useEffect(() => {
    let attempts = 0;
    const checkLeaflet = setInterval(() => {
      attempts++;
      if ((window as any).L) {
        setIsLeafletReady(true);
        clearInterval(checkLeaflet);
      } else if (attempts > 100) { // 5 seconds timeout
        setLoadError(true);
        clearInterval(checkLeaflet);
      }
    }, 50);
    return () => clearInterval(checkLeaflet);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || !isLeafletReady || mapRef.current) return;

    // Small delay to ensure container has dimensions
    const initTimer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      
      try {
        const L = (window as any).L;
        
        // Initialize map
        mapRef.current = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: true,
          fadeAnimation: true,
          markerZoomAnimation: true
        }).setView([23.8103, 90.4125], 10); // Default Dhaka
        
        // OpenStreetMap Standard Tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(mapRef.current);

        // Force invalidation to ensure tiles render
        mapRef.current.invalidateSize();
        
        // Monitor resize
        const resizeObserver = new ResizeObserver(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        });
        
        resizeObserver.observe(mapContainerRef.current);
        
        return () => {
          resizeObserver.disconnect();
          if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
          }
        };
      } catch (e) {
        console.error("Map Init Error:", e);
        setLoadError(true);
      }
    }, 100);

    return () => clearTimeout(initTimer);
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
        iconSize: [60, 60], // Roughly expected size
        iconAnchor: [30, 50]
      });

      if (markersRef.current[userId]) {
        markersRef.current[userId].setLatLng([data.lat, data.lng]);
        markersRef.current[userId].setIcon(customIcon);
      } else {
        const marker = L.marker([data.lat, data.lng], { icon: customIcon }).addTo(mapRef.current);
        markersRef.current[userId] = marker;
      }
    });

    // Cleanup
    Object.keys(markersRef.current).forEach(id => {
      if (!visibleUserIds.includes(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Auto-center on self
    if (visibleUserIds.includes(currentUser.id) && Object.keys(markersRef.current).length === 1) {
      const myData = trackingData[currentUser.id];
      mapRef.current.setView([myData.lat, myData.lng], 15);
    }
    
    // Frequent invalidation to fix grey tiles
    mapRef.current.invalidateSize();

  }, [trackingData, currentUser, isLeafletReady]);

  if (loadError) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-red-50 text-red-600 p-4 text-center">
        <p className="font-bold mb-2">ম্যাপ লোড করতে সমস্যা হয়েছে।</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white border border-red-200 rounded-lg shadow-sm text-sm font-bold">
          Reload Page
        </button>
      </div>
    );
  }

  if (!isLeafletReady) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-2"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative bg-slate-100">
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0" 
        style={{ width: '100%', height: '100%', zIndex: 0 }}
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[500] bg-white/90 backdrop-blur p-3 rounded-2xl shadow-lg border border-slate-200 pointer-events-none">
        <div className="space-y-1.5">
           <div className="flex items-center space-x-2">
             <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
             <span className="text-[10px] font-bold text-slate-600 uppercase">Officer</span>
           </div>
           <div className="flex items-center space-x-2">
             <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
             <span className="text-[10px] font-bold text-slate-600 uppercase">Admin</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
