import { useEffect, useRef, useState } from "react";
import { BANGLADESH_LOCATIONS } from "../utils/locationData";

export default function CommandCenterMap({ 
  hospitals = [], 
  ambulances = [], 
  activeRequests = [],
  selectedDivision = "",
  selectedDistrict = "",
  selectedArea = "",
  setSelectedDivision = () => {},
  setSelectedDistrict = () => {},
  setSelectedArea = () => {}
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // 1. Inject Leaflet JS and CSS scripts from CDN dynamically to avoid React 19 peer conflict
  useEffect(() => {
    if (window.L) {
      setIsLeafletReady(true);
      return;
    }

    try {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.id = "leaflet-cdn-css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.id = "leaflet-cdn-js";
      script.async = true;
      script.onload = () => {
        setIsLeafletReady(true);
      };
      script.onerror = () => {
        console.error("Leaflet CDN loaded with error, fallback initiated.");
        setLoadError(true);
      };
      document.head.appendChild(script);
    } catch (e) {
      console.error("Link inject error", e);
      setLoadError(true);
    }
  }, []);

  // 2. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const L = window.L;
      // Initialize map centered at Bangladesh center
      const map = L.map(mapContainerRef.current, {
        center: [23.6850, 90.3563],
        zoom: 7,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: false
      });

      // Load clean OpenStreetMap Standard tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(map);

      // Create a separate LayerGroup for our markers
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    } catch (e) {
      console.error("Failed map initialization:", e);
      setLoadError(true);
    }

    return () => {
      // Don't tear down the map on quick renders unless completely necessary
    };
  }, [isLeafletReady]);

  // 3. Pan and Zoom to the selected Division/District/Area
  useEffect(() => {
    if (!isLeafletReady || !mapInstanceRef.current) return;

    let lat = 23.6850;
    let lng = 90.3563;
    let zoom = 7;

    if (selectedDivision) {
      const divData = BANGLADESH_LOCATIONS[selectedDivision];
      if (divData) {
        lat = divData.lat || 23.8103;
        lng = divData.lng || 90.4125;
        zoom = 9;

        if (selectedDistrict) {
          const distData = divData.districts[selectedDistrict];
          if (distData) {
            lat = distData.lat || lat;
            lng = distData.lng || lng;
            zoom = 11;

            if (selectedArea) {
              const areaData = distData.areas[selectedArea];
              if (areaData) {
                lat = areaData.lat || lat;
                lng = areaData.lng || lng;
                zoom = 13;
              }
            }
          }
        }
      }
    }

    try {
      mapInstanceRef.current.setView([lat, lng], zoom, {
        animate: true,
        duration: 1.2
      });
    } catch (err) {
      console.warn("View animation warning", err);
    }
  }, [isLeafletReady, selectedDivision, selectedDistrict, selectedArea]);

  // 4. Update markers dynamically based on state
  useEffect(() => {
    if (!isLeafletReady || !mapInstanceRef.current || !markersLayerRef.current) return;

    const L = window.L;
    markersLayerRef.current.clearLayers();

    // RENDER HOSPITALS (Clinics)
    hospitals.forEach((h) => {
      const coords = h.coordinates || { lat: 23.8103, lng: 90.4125 };
      if (!coords.lat || !coords.lng) return;

      const totalICU = h.totalICU || (h.icuBeds?.total) || 12;
      const occupiedICU = h.icuBeds?.occupied || 0;
      const loadPercent = totalICU > 0 ? (occupiedICU / totalICU) * 100 : 30;

      const color = loadPercent > 85 ? "#dc2626" : "#ea580c";

      const hospitalIcon = L.divIcon({
        className: "custom-map-pin",
        html: `<div style="background-color: ${color};" class="flex items-center justify-center w-8 h-8 rounded-full text-white font-extrabold text-xs border-2 border-white shadow-lg">H</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([coords.lat, coords.lng], { icon: hospitalIcon })
        .addTo(markersLayerRef.current)
        .bindPopup(`
          <div class="p-2 font-sans text-xs text-slate-800" style="min-width: 180px;">
            <p class="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1 text-sm">${h.hospitalName || h.name}</p>
            <p class="mb-1 text-slate-500 text-[11px]">📍 Zone: ${h.area || h.location || 'Dhaka Coast'}</p>
            <div class="grid grid-cols-2 gap-1 text-[10px] mt-1.5 font-mono text-slate-600">
               <div>ICU Beds: <strong>${occupiedICU}/${totalICU}</strong></div>
               <div>Oxygen: <strong>Ready</strong></div>
               <div>Physicians: <strong>On Duty</strong></div>
            </div>
            <span class="text-[9px] block text-orange-500 font-extrabold uppercase mt-1">✓ Dynamic Commission Node</span>
          </div>
        `);
    });

    // RENDER LIVE FLEET AMBULANCES
    ambulances.forEach((a) => {
      const coords = a.coordinates || { lat: 23.8103, lng: 90.4125 };
      if (!coords.lat || !coords.lng) return;

      const isAvailable = (a.status || "").toLowerCase() === "available";
      const color = isAvailable ? "#16a34a" : "#ca8a04";

      const ambulanceIcon = L.divIcon({
        className: "custom-map-pin-amb",
        html: `<div style="background-color: ${color};" class="flex items-center justify-center w-7 h-7 rounded-full text-white font-mono text-[10px] font-bold border-2 border-white shadow-md animate-pulse">🚒</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      L.marker([coords.lat, coords.lng], { icon: ambulanceIcon })
        .addTo(markersLayerRef.current)
        .bindPopup(`
          <div class="p-2 font-sans text-xs text-slate-800" style="min-width: 170px;">
            <p class="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">Ambulance: ${a.vehicleNumber}</p>
            <p class="mb-1 text-slate-600">👤 Driver: <strong>${a.driverName || 'Operator'}</strong></p>
            <p class="mb-1 text-slate-500 text-[10px]">📞 Contact: <a href="tel:${a.driverPhone}" class="text-orange-600 underline">${a.driverPhone}</a></p>
            <span class="${isAvailable ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} text-[9px] font-bold px-1.5 py-0.5 rounded-lg border">
              Fleet Status: ${isAvailable ? 'AVAILABLE / STANDBY' : 'ASSIGNED TO RESCUE'}
            </span>
          </div>
        `);
    });

    // RENDER PATIENT EMERGENCY INCIDENTS
    activeRequests.forEach((req) => {
      const coords = req.coordinates || { lat: 23.8103, lng: 90.4125 };
      if (!coords.lat || !coords.lng) return;

      const isCritical = (req.severity || "").toLowerCase() === "critical";
      const color = isCritical ? "#dc2626" : "#f59e0b";

      const requestIcon = L.divIcon({
        className: "custom-map-pin-req",
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-950 text-white font-sans text-[9px] font-black border-2 border-destructive shadow-lg">
            <span class="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60 animate-ping"></span>
            💥 SOS
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([coords.lat, coords.lng], { icon: requestIcon })
        .addTo(markersLayerRef.current)
        .bindPopup(`
          <div class="p-2 font-sans text-xs text-slate-800" style="min-width: 180px;">
            <p class="font-bold text-red-600 border-b border-red-100 pb-1 mb-1">🚨 CASUALTY REPORTED</p>
            <p class="font-bold mb-0 text-slate-900">${req.patientName || 'Emergency Caller'}</p>
            <p class="text-[11px] text-slate-500 mt-1 mb-1">Type: <strong>${req.emergencyType}</strong></p>
            <p class="text-slate-500 font-sans text-[10px] mb-2">"${req.symptoms || 'Cardiac collapse'}"</p>
            <div class="px-2 py-1 bg-red-600/10 border border-red-200 text-red-600 font-bold font-mono py-0.5 text-[9px] text-center rounded-lg">
              SEVERITY LEVEL: ${req.severity ? req.severity.toUpperCase() : 'HIGH'}
            </div>
          </div>
        `);
    });

  }, [isLeafletReady, hospitals, ambulances, activeRequests]);

  return (
    <div className="relative bg-white border border-slate-200 rounded-3xl p-5 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-display font-black text-slate-900 flex items-center gap-2 uppercase font-mono tracking-tight">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
            Bangladesh Emergency Command Center Map
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Real-time dynamic satellite positioning & asset dispatch routing</p>
        </div>
        <div className="bg-orange-600/10 px-2.5 py-1 rounded-xl text-[9px] text-orange-600 font-mono font-bold border border-orange-200 uppercase tracking-wider">
          LIVE MAP SATELLITE FEED
        </div>
      </div>

      {/* Clean horizontal filter bar */}
      <div className="mt-4 p-3 bg-orange-50/20 border border-orange-100 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          {/* Division Dropdown */}
          <div className="w-full">
            <select
              value={selectedDivision}
              onChange={(e) => {
                const div = e.target.value;
                setSelectedDivision(div);
                if (div && BANGLADESH_LOCATIONS[div]) {
                  const districts = Object.keys(BANGLADESH_LOCATIONS[div].districts);
                  const firstDist = districts[0] || "";
                  setSelectedDistrict(firstDist);
                  if (firstDist && BANGLADESH_LOCATIONS[div].districts[firstDist]) {
                    const areas = Object.keys(BANGLADESH_LOCATIONS[div].districts[firstDist].areas);
                    setSelectedArea(areas[0] || "");
                  } else {
                    setSelectedArea("");
                  }
                } else {
                  setSelectedDistrict("");
                  setSelectedArea("");
                }
              }}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/25 transition-all font-sans font-medium hover:border-slate-300"
            >
              <option value="">All Divisions</option>
              {Object.keys(BANGLADESH_LOCATIONS).map((div) => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>
          </div>

          {/* District Dropdown */}
          <div className="w-full">
            <select
              value={selectedDistrict}
              onChange={(e) => {
                const dist = e.target.value;
                setSelectedDistrict(dist);
                if (selectedDivision && dist && BANGLADESH_LOCATIONS[selectedDivision]?.districts[dist]) {
                  const areas = Object.keys(BANGLADESH_LOCATIONS[selectedDivision].districts[dist].areas);
                  setSelectedArea(areas[0] || "");
                } else {
                  setSelectedArea("");
                }
              }}
              disabled={!selectedDivision}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/25 transition-all font-sans font-medium disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 hover:border-slate-300"
            >
              <option value="">All Districts</option>
              {selectedDivision &&
                Object.keys(BANGLADESH_LOCATIONS[selectedDivision]?.districts || {}).map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
            </select>
          </div>

          {/* Area/Upazila Dropdown */}
          <div className="w-full">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              disabled={!selectedDistrict}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/25 transition-all font-sans font-medium disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 hover:border-slate-300"
            >
              <option value="">All Areas/Upazilas</option>
              {selectedDivision &&
                selectedDistrict &&
                Object.keys(BANGLADESH_LOCATIONS[selectedDivision]?.districts[selectedDistrict]?.areas || {}).map((ar) => (
                  <option key={ar} value={ar}>{ar}</option>
                ))}
            </select>
          </div>

          {/* Reset Filters button */}
          <div className="w-full">
            <button
              type="button"
              disabled={!selectedDivision && !selectedDistrict && !selectedArea}
              onClick={() => {
                setSelectedDivision("");
                setSelectedDistrict("");
                setSelectedArea("");
              }}
              className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-bold rounded-xl transition-all cursor-pointer font-sans shadow-xs flex-shrink-0"
            >
              Clear Zone Filters
            </button>
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="flex flex-col items-center justify-center h-[340px] bg-slate-50 rounded-2xl border border-slate-200 mt-4 text-center p-6 space-y-2 font-mono text-xs">
          <p className="text-red-500 font-bold">⚠️ Leaflet CDN Loading Blocked or Suspended</p>
          <p className="text-slate-400 text-[10px]">Coordinates are preserved. Check your internet connection or workspace firewall.</p>
        </div>
      ) : (
        <div 
          ref={mapContainerRef} 
          className="relative w-full h-[340px] rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden mt-4 shadow-inner z-10"
        />
      )}

      {/* Map Legend */}
      <div className="flex flex-wrap gap-4 justify-center mt-3.5 text-[10px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-600 inline-block"></span> Clinic Hub
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-600 inline-block"></span> Available Ambulance
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500 inline-block"></span> Dispatched Fleet
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-600 inline-block"></span> Active Casualty Call
        </span>
      </div>
    </div>
  );
}
