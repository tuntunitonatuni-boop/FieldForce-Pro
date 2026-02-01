
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

      const markerColor = data.role === Role.SUPER_ADMIN ? 'red' : data.role === Role.BRANCH_ADMIN ? 'orange' : 'blue';
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      if (markersRef.current[userId]) {
        markersRef.current[userId].setLatLng([data.lat, data.lng]);
      } else {
        const marker = L.marker([data.lat, data.lng], { icon }).addTo(mapRef.current)
          .bindPopup(`<b>${data.name || 'Unknown'}</b><br>${(data.role || '').replace('_', ' ')}<br><small>শেষ আপডেট: ${new Date(data.lastUpdate).toLocaleTimeString()}</small>`);
        markersRef.current[userId] = marker;
      }
    });

    Object.keys(markersRef.current).forEach(id => {
      if (!visibleUserIds.includes(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    if (visibleUserIds.length > 0 && mapRef.current.getZoom() < 12) {
      const firstId = visibleUserIds[0];
      mapRef.current.panTo([trackingData[firstId].lat, trackingData[firstId].lng]);
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
          লাইভ ম্যাপ
        </h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border border-white"></div>
            <span className="font-medium text-slate-600">Officer</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500 border border-white"></div>
            <span className="font-medium text-slate-600">Admin</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div>
            <span className="font-medium text-slate-600">Super Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
