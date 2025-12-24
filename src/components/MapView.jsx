import React from 'react';
import { Map } from 'lucide-react';

export default function MapView({ currentDay, location }) {
    const addresses = currentDay?.schedule?.filter(item => item.address && item.address.length > 2).map(item => encodeURIComponent(item.address)) || [];
    
    // 生成預覽地圖 (Iframe)
    let iframeSrc = `https://maps.google.com/maps?q=${encodeURIComponent(location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
    if (addresses.length > 0) {
        iframeSrc = `https://maps.google.com/maps?q=${addresses[0]}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    }

    // 生成外部開啟連結 (App Link)
    let externalLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    if (addresses.length > 0) {
        const destination = addresses[addresses.length - 1];
        const waypoints = addresses.slice(0, -1).join('|');
        externalLink = `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}`;
    }

    return (
      <div className="p-4 space-y-4">
        <div className="bg-white p-4 rounded-[2rem] shadow-sm text-center border border-slate-100">
          <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500"><Map size={20} /></div>
                  <div className="text-left">
                      <h3 className="text-sm font-extrabold text-slate-800">路線地圖</h3>
                      <p className="text-[10px] text-slate-400">{addresses.length} 個停靠點</p>
                  </div>
              </div>
              <a href={externalLink} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">Google Maps App</a>
          </div>
          <div className="w-full h-64 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative">
              <iframe title="Map Preview" width="100%" height="100%" frameBorder="0" scrolling="no" src={iframeSrc} className="w-full h-full opacity-90 hover:opacity-100 transition-opacity"></iframe>
              <div className="absolute inset-0 pointer-events-none border-4 border-white/50 rounded-2xl"></div>
          </div>
        </div>
      </div>
    )
}