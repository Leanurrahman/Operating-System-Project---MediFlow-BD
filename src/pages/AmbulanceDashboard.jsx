import React, { useState, useEffect, useRef } from "react";
import { 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Navigation, 
  Heart, 
  User, 
  Phone, 
  Clock, 
  Compass, 
  AlertCircle, 
  Volume2, 
  VolumeX,
  Shield, 
  Activity, 
  ListOrdered, 
  Radio, 
  Play,
  TrendingUp,
  Map,
  Sparkles
} from "lucide-react";
import { RequestStatus, AmbulanceStatus } from "../types";
import { formatFirestoreTimestamp } from "../utils/format";
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

// Static GPS waypoint presets with real latitude/longitude values
const LOCATION_COORDINATES = {
  mirpur: { lat: 23.8041, lng: 90.3525, name: "Mirpur 10" },
  dhanmondi: { lat: 23.7461, lng: 90.3742, name: "Dhanmondi 32" },
  shahbagh: { lat: 23.7375, lng: 90.3980, name: "Shahbagh DMCH" },
  uttara: { lat: 23.8759, lng: 90.3795, name: "Uttara Sector 4" },
  gulshan: { lat: 23.7925, lng: 90.4178, name: "Gulshan Circle 2" }
};

export default function AmbulanceDashboard({ 
  currentUser,
  ambulance, 
  assignedRequests = [], 
  onStatusUpdate, 
  onRequestUpdate,
  hospitals = [],
  isBankersSafe = true,
  warningAlert = null
}) {
  const [feedback, setFeedback] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("navigation"); // "navigation" or "logs"
  const [combatLogs, setCombatLogs] = useState([
    { id: 1, time: new Date(Date.now() - 40000).toLocaleTimeString(), text: "System Booting... Telemetry Online" },
    { id: 2, time: new Date(Date.now() - 30000).toLocaleTimeString(), text: "Listening on Dhaka VHF Channel 14" },
    { id: 3, time: new Date(Date.now() - 15000).toLocaleTimeString(), text: "GPS Connection Hooked" }
  ]);

  const [activeDispatchesList, setActiveDispatchesList] = useState([]);

  // Subscribe to activeDispatches collection in real-time
  useEffect(() => {
    const q = query(collection(db, "activeDispatches"));
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => {
        list.push({ ...d.data(), id: d.id });
      });
      setActiveDispatchesList(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "activeDispatches");
    });
    return () => unsub();
  }, []);

  // Persistent-like demo states for fuel, distance and ETA response multipliers
  const [fuel, setFuel] = useState(() => {
    const saved = localStorage.getItem("mediflow_operator_fuel");
    return saved ? Number(saved) : 92;
  });
  const [distanceCovered, setDistanceCovered] = useState(() => {
    const saved = localStorage.getItem("mediflow_operator_dist");
    return saved ? Number(saved) : 38.6;
  });
  const [avgResponseTime, setAvgResponseTime] = useState(13.4);

  // Leaflet map setup states
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    markers: null,
    route: null
  });
  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Play synthesized emergency sounds through Web Audio API
  const playSynthesizedSound = (type) => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      if (type === "new_incident") {
        // High attention alert
        [0, 0.2, 0.4].forEach((delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, now + delay);
          gain.gain.setValueAtTime(0.15, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.15);
          
          osc.start(now + delay);
          osc.stop(now + delay + 0.18);
        });
      } else if (type === "critical") {
        // Double tone pulse
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(554.37, now); // C#5
        osc1.frequency.linearRampToValueAtTime(659.25, now + 0.3); // E5
        
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(277.18, now); // C#4
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.5);
        osc2.stop(now + 0.5);
      } else if (type === "completed") {
        // Joyful ascending arpeggio
        const notes = [440.00, 554.37, 659.25, 880.00]; // A4, C#5, E5, A5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.1, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.12);
          
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.15);
        });
      } else if (type === "checkpoint") {
        // Diagnostic chirp
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(1046.50, now); // C6
        osc.frequency.exponentialRampToValueAtTime(2093.00, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {
      // Ignored
    }
  };

  // Helper coordinate mapper
  const getCoordinates = (locKeyOrName) => {
    if (!locKeyOrName) return { lat: 23.8103, lng: 90.4125 };
    const cleaned = locKeyOrName.toLowerCase();
    if (cleaned.includes("mirpur")) return LOCATION_COORDINATES.mirpur;
    if (cleaned.includes("dhanmondi")) return LOCATION_COORDINATES.dhanmondi;
    if (cleaned.includes("shahbagh") || cleaned.includes("dmch")) return LOCATION_COORDINATES.shahbagh;
    if (cleaned.includes("uttara")) return LOCATION_COORDINATES.uttara;
    if (cleaned.includes("gulshan")) return LOCATION_COORDINATES.gulshan;
    return { lat: 23.8103, lng: 90.4125 };
  };

  // Helper hospital coordinate mapper
  const getHospitalCoordinates = (hospitalId) => {
    const h = hospitals?.find(item => item.id === hospitalId);
    if (h && h.coordinates?.lat) return h.coordinates;
    if (h && h.locKey) return getCoordinates(h.locKey);
    // Preserved static mapper
    if (hospitalId === "hosp1") return LOCATION_COORDINATES.shahbagh;
    if (hospitalId === "hosp2") return LOCATION_COORDINATES.uttara;
    if (hospitalId === "hosp3") return LOCATION_COORDINATES.dhanmondi;
    if (hospitalId === "hosp4") return LOCATION_COORDINATES.gulshan;
    if (hospitalId === "hosp5") return LOCATION_COORDINATES.mirpur;
    return { lat: 23.8103, lng: 90.4125 };
  };

  // Add system telemetry logs
  const logTelemetry = (text) => {
    setCombatLogs((prev) => [
      { id: Date.now(), time: new Date().toLocaleTimeString(), text },
      ...prev.slice(0, 19)
    ]);
  };

  // Sound play triggers on incoming incidents and completions
  useEffect(() => {
    const operatorRequests = assignedRequests.filter(r => r.assignedAmbulanceId === ambulance?.id || r.assignedAmbulanceId === ambulance?.ambulanceId);
    const activeCount = operatorRequests.filter(r => 
      r.status !== "Completed" && 
      r.status !== "completed" && 
      r.status !== "admitted" && 
      r.status !== "Admitted" && 
      r.status !== "Cancelled"
    ).length;
    if (activeCount > 0) {
      const criticallySevere = operatorRequests.some(r => 
        r.severity === "Critical" && 
        r.status !== "Completed" && 
        r.status !== "completed" && 
        r.status !== "admitted" && 
        r.status !== "Admitted"
      );
      if (criticallySevere) {
        playSynthesizedSound("critical");
      } else {
        playSynthesizedSound("new_incident");
      }
    }
  }, [assignedRequests.length, ambulance?.id]);

  // Hook Leaflet CDN scripts dynamically to avoid react 19 compatibility blocks
  useEffect(() => {
    if (window.L) {
      setIsLeafletReady(true);
      return;
    }

    try {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.id = "leaflet-operator-css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.id = "leaflet-operator-js";
      script.async = true;
      script.onload = () => setIsLeafletReady(true);
      script.onerror = () => setMapError(true);
      document.head.appendChild(script);
    } catch {
      setMapError(true);
    }
  }, []);

  // Sync Leaflet Map Container
  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current || mapInstanceRef.current || !ambulance) return;

    try {
      const L = window.L;
      const initialCoords = LOCATION_COORDINATES[ambulance.currentLocKey?.toLowerCase()] || LOCATION_COORDINATES.mirpur;

      const map = L.map(mapContainerRef.current, {
        center: [initialCoords.lat, initialCoords.lng],
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: false
      });

      // Clear OpenStreetMap Standard tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(map);

      layersRef.current.markers = L.layerGroup().addTo(map);
      layersRef.current.route = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    } catch (err) {
      console.error(err);
      setMapError(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error("Error destroying leaflet instance on tab unmount", e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [isLeafletReady, ambulance, activeTab]);

  // Live Map Marker & Path Updates
  useEffect(() => {
    if (!isLeafletReady || !mapInstanceRef.current || !ambulance) return;

    const L = window.L;
    const map = mapInstanceRef.current;
    
    // Clear previous elements
    layersRef.current.markers.clearLayers();
    layersRef.current.route.clearLayers();

    const currentLoc = LOCATION_COORDINATES[ambulance.currentLocKey?.toLowerCase()] || LOCATION_COORDINATES.mirpur;
    
    // 1. Render Ambulance Marker (Green/Orange custom icon)
    const amAvailability = (ambulance.status || "").toLowerCase() === "available";
    const amColor = amAvailability ? "#16a34a" : "#ea580c";
    
    const ambIcon = L.divIcon({
      html: `
        <div class="flex flex-col items-center justify-center">
          <div style="background-color: ${amColor};" class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg text-white font-bold animate-bounce text-xs">
            🚒
          </div>
          <span class="bg-slate-900/90 text-[8px] font-mono font-black text-white px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap mt-0.5">
            ${ambulance.plateNumber || ambulance.vehicleNumber || 'Mediflow 01'}
          </span>
        </div>
      `,
      className: "mediflow-marker-icon",
      iconSize: [40, 48],
      iconAnchor: [20, 24]
    });

    const ambulanceMarker = L.marker([currentLoc.lat, currentLoc.lng], { icon: ambIcon })
      .addTo(layersRef.current.markers)
      .bindPopup(`
        <div class="p-2 font-mono text-xs text-slate-800" style="min-width: 160px;">
          <p class="font-bold border-b border-slate-100 pb-1 mb-1 text-slate-900">💻 MY TELEMETRY</p>
          <p>Driver: <b>${ambulance.driverName || 'Kamil Ahsan'}</b></p>
          <p>Status: <span class="text-orange-600 font-extrabold">${ambulance.status?.toUpperCase()}</span></p>
          <p class="text-[10px] text-slate-500">Coord: ${currentLoc.lat.toFixed(4)}, ${currentLoc.lng.toFixed(4)}</p>
        </div>
      `);

    // Pan map to ambulance with a smooth transition
    try {
      map.panTo([currentLoc.lat, currentLoc.lng], { animate: true, duration: 1.0 });
    } catch {
      // Ignored
    }

    // 2. Map route & checkpoints to patient
    const activeIncident = activeIncidents[0] || null;
    if (activeIncident) {
      const patientLoc = getCoordinates(activeIncident.location || activeIncident.locKey);
      
      // Render Patient Marker (Deep Red blinking SOS)
      const patIcon = L.divIcon({
        html: `
          <div class="flex flex-col items-center justify-center">
            <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-red-600 border-2 border-white text-white shadow-xl">
              <span class="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
              😷
            </div>
            <span class="bg-red-950 text-[8px] font-mono font-black text-red-100 px-1 py-0.5 rounded border border-red-800 whitespace-nowrap mt-0.5">
              SOS: ${activeIncident.patientName}
            </span>
          </div>
        `,
        className: "mediflow-patient-icon",
        iconSize: [40, 48],
        iconAnchor: [20, 24]
      });

      L.marker([patientLoc.lat, patientLoc.lng], { icon: patIcon })
        .addTo(layersRef.current.markers)
        .bindPopup(`
          <div class="p-2 font-sans text-xs text-slate-800" style="min-width: 170px;">
            <p class="font-bold text-red-600 border-b border-red-50 pb-1 mb-1">🚨 CASUALTY MARKER</p>
            <p><b>Name:</b> ${activeIncident.patientName}</p>
            <p><b>Condition:</b> ${activeIncident.emergencyType}</p>
            <p><b>Phone:</b> <a href="tel:${activeIncident.phone}" class="text-orange-600 underline">${activeIncident.phone}</a></p>
          </div>
        `);

      // Draw polyline connecting ambulance & patient or patient & hospital
      const isPickedUp = activeIncident.status === "Patient Picked Up" || activeIncident.status === "Patient Picked" || activeIncident.status === "Arrived at Hospital";
      
      if (isPickedUp && activeIncident.assignedHospitalId) {
        // Patient picked up! Route changes toward assigned hospital
        const hospitalLoc = getHospitalCoordinates(activeIncident.assignedHospitalId);
        
        // Render Hospital Destination PIN (Teal clinical marker)
        const hospIcon = L.divIcon({
          html: `
            <div class="flex flex-col items-center justify-center font-mono">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-teal-600 border-2 border-white text-white shadow-lg text-xs font-black">
                🏥
              </div>
              <span class="bg-teal-950 text-[8px] font-mono font-bold text-teal-100 px-1 py-0.5 rounded border border-teal-800 whitespace-nowrap mt-0.5">
                WARD DESTINATION
              </span>
            </div>
          `,
          className: "mediflow-hospital-icon",
          iconSize: [45, 48],
          iconAnchor: [22, 24]
        });

        L.marker([hospitalLoc.lat, hospitalLoc.lng], { icon: hospIcon })
          .addTo(layersRef.current.markers)
          .bindPopup(`
            <div class="p-2 font-mono text-xs text-slate-800">
              <p class="font-black text-teal-600 border-b border-teal-100 pb-1 mb-1">🏥 ASSIGNED HOSPITAL</p>
              <p>ID: ${activeIncident.assignedHospitalId}</p>
              <p class="text-[10px] text-slate-500">Destination Clinic</p>
            </div>
          `);

        // Draw active Blue transport polyline
        L.polyline([[currentLoc.lat, currentLoc.lng], [hospitalLoc.lat, hospitalLoc.lng]], {
          color: "#0d9488",
          weight: 4,
          dashArray: "10, 10",
          opacity: 0.85
        }).addTo(layersRef.current.route);

        // Zoom fit route coordinates
        try {
          const bounds = L.latLngBounds([[currentLoc.lat, currentLoc.lng], [hospitalLoc.lat, hospitalLoc.lng]]);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        } catch {}
      } else {
        // En route toward Patient: Draw orange search polyline
        L.polyline([[currentLoc.lat, currentLoc.lng], [patientLoc.lat, patientLoc.lng]], {
          color: "#ea580c",
          weight: 4,
          dashArray: "8, 8",
          opacity: 0.85
        }).addTo(layersRef.current.route);

        try {
          const bounds = L.latLngBounds([[currentLoc.lat, currentLoc.lng], [patientLoc.lat, patientLoc.lng]]);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        } catch {}
      }
    }

  }, [isLeafletReady, ambulance, assignedRequests, hospitals, activeTab]);

  // Declare/Change vehicle telemetry status
  const handleStatusChange = async (newStatus, currentLoc) => {
    try {
      await onStatusUpdate(ambulance.id, newStatus, currentLoc);
      
      // If the status is REACHED_HOSPITAL ("Reached Hospital"), automate incident completion
      if (newStatus === AmbulanceStatus.REACHED_HOSPITAL || newStatus === "Reached Hospital") {
        const activeReqsForAmb = activeIncidents.filter(r => r.assignedAmbulanceId === ambulance.id || r.assignedAmbulanceId === ambulance.ambulanceId);
        for (const req of activeReqsForAmb) {
          await onRequestUpdate(req.id, "completed");
          try {
            await deleteDoc(doc(db, "activeDispatches", "current_active"));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, "activeDispatches/current_active");
          }
        }
      }

      playSynthesizedSound("checkpoint");
      setFeedback(`✓ Telemetry State declared: ${newStatus}`);
      logTelemetry(`Telemetry declare toggled: ${newStatus} at Region ${currentLoc}`);
      setTimeout(() => setFeedback(""), 3500);
    } catch {
      setFeedback("🔒 Local declaration failure. Synchronization timeout.");
    }
  };

  // Step-by-Step progress handler on clinical requests
  const handleRequestTick = async (reqId, nextStatus, patientName) => {
    try {
      await onRequestUpdate(reqId, nextStatus);
      
      // Select synthesized sound profiles based on progression
      if (nextStatus === "completed" || nextStatus === "Completed" || nextStatus === "admitted" || nextStatus === "Admitted") {
        playSynthesizedSound("completed");
        logTelemetry(`SUCCESS: Incident case of ${patientName} locked. Completed status declared.`);
        try {
          await deleteDoc(doc(db, "activeDispatches", "current_active"));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, "activeDispatches/current_active");
        }
      } else if (nextStatus === "Patient Picked Up") {
        playSynthesizedSound("checkpoint");
        logTelemetry(`PATIENT SECURED: ${patientName} boarded. Rerouting to hospital node.`);
      } else {
        playSynthesizedSound("new_incident");
        logTelemetry(`TRANSITION: Request state of ${patientName} moved to [${nextStatus}]`);
      }

      setFeedback(`✓ Incident request transitioned to: ${nextStatus}`);
      setTimeout(() => setFeedback(""), 3500);
    } catch {
      setFeedback("🔒 Network lock failure. Command center declined transition.");
    }
  };

  // Click waypoint handler updates location state in Firebase
  const handleWaypointClick = async (wpKey, wpName) => {
    if (!ambulance) return;
    
    // Simulate fuel drain and odometer addition
    const finalFuel = Math.max(12, fuel - 3);
    const finalOdometer = distanceCovered + 4.2;
    setFuel(finalFuel);
    setDistanceCovered(finalOdometer);
    localStorage.setItem("mediflow_operator_fuel", String(finalFuel));
    localStorage.setItem("mediflow_operator_dist", String(finalOdometer));

    try {
      await onStatusUpdate(ambulance.id, ambulance.status, wpKey);
      playSynthesizedSound("checkpoint");
      logTelemetry(`GPS CHECKPOINT PASSED: Arrived at ${wpName}. Fuel remaining: ${finalFuel}%.`);
      setFeedback(`✓ Waypoint simulated successfully: ${wpName}`);
      setTimeout(() => setFeedback(""), 3000);
    } catch {
      setFeedback("GPS sync failure.");
    }
  };

  // Dynamic status badges styling
  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("available")) {
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
    }
    if (s.includes("route") || s.includes("en_route")) {
      return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    }
    if (s.includes("picked") || s.includes("patient_picked")) {
      return "bg-orange-500/10 text-orange-500 border-orange-500/30";
    }
    if (s.includes("reached") || s.includes("arrived")) {
      return "bg-teal-500/10 text-teal-500 border-teal-500/30";
    }
    if (s.includes("assigned")) {
      return "bg-sky-500/10 text-sky-500 border-sky-500/30";
    }
    return "bg-slate-500/10 text-slate-450 border-slate-500/20";
  };

  // Derive top telemetry metrics
  const operatorRequests = assignedRequests.filter(r => 
    r.assignedAmbulanceId === ambulance?.id || 
    r.assignedAmbulanceId === ambulance?.ambulanceId ||
    r.operatorId === currentUser?.uid ||
    r.assignedOperatorId === currentUser?.uid ||
    r.assignedOperatorEmail === currentUser?.email
  );

  const activeIncidents = assignedRequests.filter(r => {
    const s = (r.status || "").toLowerCase();
    const isMatchedOperatorOrAmbulance = 
      r.assignedOperatorId === currentUser?.uid || 
      r.operatorId === currentUser?.uid ||
      r.assignedOperatorEmail === currentUser?.email ||
      r.assignedAmbulanceId === ambulance?.id ||
      r.assignedAmbulanceId === ambulance?.ambulanceId;

    const isActiveStatus = 
      s === "ambulance_assigned" || 
      s === "assigned" || 
      s === "on route" || 
      s === "patient picked up" || 
      s === "arrived at hospital";

    return isMatchedOperatorOrAmbulance && isActiveStatus;
  }).map(r => {
    let displayStatus = r.status || "Assigned";
    if (displayStatus === "ambulance_assigned") displayStatus = "Assigned";
    return {
      ...r,
      status: displayStatus
    };
  });

  const completedIncidents = operatorRequests
    .filter(r => r.status === "Completed" || r.status === "completed" || r.status === "admitted" || r.status === "Admitted")
    .sort((a, b) => {
      const dateA = a.completedAt ? (a.completedAt.toDate ? a.completedAt.toDate() : new Date(a.completedAt)) : new Date(0);
      const dateB = b.completedAt ? (b.completedAt.toDate ? b.completedAt.toDate() : new Date(b.completedAt)) : new Date(0);
      return dateB - dateA;
    });

  const deliveredToday = operatorRequests.filter(r => 
    r.status === "Completed" || 
    r.status === "completed" || 
    r.status === "admitted" || 
    r.status === "Admitted" || 
    r.status === "Arrived at Hospital"
  ).length;

  if (!ambulance) {
    return (
      <div className="text-center py-24 bg-white border border-slate-200 rounded-3xl max-w-4xl mx-auto space-y-4">
        <Truck className="w-14 h-14 text-orange-600 mx-auto animate-pulse" />
        <h3 className="text-lg font-display font-black text-slate-800 uppercase tracking-wider">Establishing Ground Connection</h3>
        <p className="text-xs font-mono text-slate-500 max-w-md mx-auto">
          Searching clinical database nodes for operator ID matching {localStorage.getItem("expected_role")}. Please assert proper operator credentials or run a prefilled admin setup!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Bankers Deadlock Warning Alert Banner */}
      {!isBankersSafe && (
        <div className="bg-red-950 border-2 border-red-800 text-red-100 rounded-3xl p-5 shadow-2xl flex flex-col sm:flex-row items-center gap-4 animate-pulse">
          <AlertCircle className="w-12 h-12 text-red-500 shrink-0" />
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-display font-black uppercase tracking-wider text-red-400">
              🚨 Deadlock Threat Detected (Clinical Reserves Exhausted)
            </h4>
            <p className="text-xs font-mono text-red-300 font-extrabold uppercase tracking-wide">
              Deadlock Risk: Unsafe state detected
            </p>
            <p className="text-[11px] font-mono text-slate-400">
              {warningAlert || "No safe sequence satisfies regional requirements. Banker's avoidance engine has locked ambulance dispatch queues."}
            </p>
          </div>
        </div>
      )}

      {isBankersSafe && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex items-center justify-between gap-4 text-xs font-mono text-emerald-400">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="font-extrabold uppercase tracking-widest text-[9.5px]">MediFlow Safe Sequence Verified</span>
          </div>
          <span className="text-slate-400 text-[10px]">Zero deadlock risk detected in regional pools</span>
        </div>
      )}
      {/* 1. DYNAMIC SUMMARY STATUS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <Radio className="w-4 h-4 text-orange-500 animate-pulse" />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">ACTIVE INCIDENTS</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{activeIncidents.length}</span>
            <span className="text-[10px] text-slate-500">Cases</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <Heart className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">DELIVERED TODAY</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{deliveredToday}</span>
            <span className="text-[9px] text-emerald-500 font-mono font-bold">LIVE UNTIL 24H</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <Activity className="w-4 h-4 text-amber-500" />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">ODOMETER (KM)</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white font-mono">{distanceCovered.toFixed(1)}</span>
            <span className="text-[10px] text-slate-500">Total KM</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <Compass className="w-4 h-4 text-sky-400" />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">FUEL LEVEL</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[11px] font-mono font-bold">
              <span className={fuel < 25 ? "text-red-500" : "text-sky-400"}>{fuel}%</span>
              <span className="text-slate-500">RETAIN</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div 
                className={`h-full ${fuel < 25 ? "bg-red-500" : "bg-sky-400"}`} 
                style={{ width: `${fuel}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">RESPONSE TIME</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-mono">{avgResponseTime}</span>
            <span className="text-[9px] text-slate-400 font-mono">MINS (AVG)</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-orange-500 cursor-pointer" onClick={() => setSoundEnabled(false)} />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500 cursor-pointer" onClick={() => setSoundEnabled(true)} />
            )}
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">SIREN HARDWARE</span>
          </div>
          <button
            onClick={() => playSynthesizedSound("critical")}
            className="mt-2 text-center text-[10px] bg-red-600 hover:bg-red-700 text-white py-1 px-1.5 rounded-lg font-mono font-black border border-red-700 select-none uppercase tracking-wider"
          >
            🔊 PLAY TEST HORN
          </button>
        </div>

      </div>

      {feedback && (
        <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold px-4 py-3 rounded-xl text-center shadow-xs animate-pulse">
          {feedback}
        </div>
      )}

      {/* 2. THREE-COLUMN COMMAND COCKPIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUMN 1: DRIVER AND VEHICLE STATS (LEFT - Width 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-orange-500 to-amber-600" />
            
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] text-orange-500 font-mono tracking-widest uppercase font-extrabold block">
                  VEHICLE TELEMETRY CONSOLE
                </span>
                <h3 className="text-lg font-display font-black text-white mt-1">
                  Ambulance Cockpit
                </h3>
              </div>
              <div className="p-1 px-2.5 rounded-lg bg-orange-600/10 border border-orange-500/20 text-orange-500 text-[10px] font-mono font-bold uppercase tracking-wider">
                VHF STABLE
              </div>
            </div>

            <div className="mt-6 space-y-3 font-mono text-xs text-slate-300">
              <div className="flex justify-between border-b border-slate-800 pb-2.5">
                <span className="text-slate-500 text-[11px]">DRIVER OPERATOR:</span>
                <span className="text-white font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-500" />
                  {ambulance.driverName || "Kamil Ahsan"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2.5">
                <span className="text-slate-500 text-[11px]">PLATE VEHICLE NO:</span>
                <span className="text-white font-bold tracking-tight">{ambulance.plateNumber || ambulance.vehicleNumber || 'Dhaka Metro-Chha-11-2091'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2.5">
                <span className="text-slate-500 text-[11px]">VEHICLE CLASSIFY:</span>
                <span className="text-orange-500 font-bold uppercase">{ambulance.type || "ICU-Support"}</span>
              </div>
              <div className="flex justify-between pb-1.5">
                <span className="text-slate-500 text-[11px]">OPERATOR ID:</span>
                <span className="text-slate-400 text-[10px] break-all">{ambulance.operatorId || 'operator01@gmail.com'}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-500 text-[11px]">FLEET REGION STATE:</span>
                <span className={`px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wider font-extrabold border ${getStatusBadge(ambulance.status)}`}>
                  {ambulance.status || "STANDBY"}
                </span>
              </div>
            </div>

            {/* Quick Declarer Actions */}
            <div className="mt-8 space-y-3.5 pt-6 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono block uppercase tracking-wider font-extrabold flex items-center gap-1.5 text-orange-550">
                <Activity className="w-3.5 h-3.5 text-orange-500" /> 
                DECLARE VEHICLE STATUS
              </span>
              
              <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => handleStatusChange(AmbulanceStatus.AVAILABLE, ambulance.currentLocKey || "mirpur")}
                  className={`py-2.5 px-2 rounded-xl border font-bold transition-all cursor-pointer ${
                    (ambulance.status === "Available" || ambulance.status === "available" || ambulance.status === AmbulanceStatus.AVAILABLE) 
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md" 
                      : "bg-slate-800/50 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  🟢 AVAILABLE
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(AmbulanceStatus.ASSIGNED, ambulance.currentLocKey || "mirpur")}
                  className={`py-2.5 px-2 rounded-xl border font-bold transition-all cursor-pointer ${
                    (ambulance.status === "Assigned" || ambulance.status === "assigned" || ambulance.status === AmbulanceStatus.ASSIGNED) 
                      ? "bg-sky-600 text-white border-sky-600 shadow-md" 
                      : "bg-slate-800/50 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  🔵 ASSIGNED
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(AmbulanceStatus.ON_ROUTE, ambulance.currentLocKey || "mirpur")}
                  className={`py-2.5 px-2 rounded-xl border font-bold transition-all cursor-pointer ${
                    (ambulance.status === "On Route" || ambulance.status === "on_route" || ambulance.status === AmbulanceStatus.ON_ROUTE) 
                      ? "bg-amber-500 text-white border-amber-500 shadow-md" 
                      : "bg-slate-800/50 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  🟡 ON ROUTE
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(AmbulanceStatus.PATIENT_PICKED, ambulance.currentLocKey || "mirpur")}
                  className={`py-2.5 px-2 rounded-xl border font-bold transition-all cursor-pointer ${
                    (ambulance.status === "Patient Picked" || ambulance.status === "patient_picked" || ambulance.status === AmbulanceStatus.PATIENT_PICKED) 
                      ? "bg-orange-600 text-white border-orange-600 shadow-md" 
                      : "bg-slate-800/50 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  🟠 PICKED UP
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(AmbulanceStatus.REACHED_HOSPITAL, ambulance.currentLocKey || "mirpur")}
                  className={`py-2.5 px-2 rounded-xl border font-bold transition-all cursor-pointer ${
                    (ambulance.status === "Reached Hospital" || ambulance.status === "reached_hospital" || ambulance.status === AmbulanceStatus.REACHED_HOSPITAL) 
                      ? "bg-purple-600 text-white border-purple-600 shadow-md" 
                      : "bg-slate-800/50 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  🏥 REACHED HOSP
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(AmbulanceStatus.OFFLINE, ambulance.currentLocKey || "mirpur")}
                  className={`py-2.5 px-2 rounded-xl border font-bold transition-all cursor-pointer ${
                    (ambulance.status === "Offline" || ambulance.status === "offline" || ambulance.status === AmbulanceStatus.OFFLINE) 
                      ? "bg-stone-800 text-white border-stone-700" 
                      : "bg-slate-800/50 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  ⚫ OFFLINE
                </button>
              </div>
            </div>
          </div>

          {/* GPS Waypoint Simulation */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div>
              <span className="text-[9px] text-orange-500 font-mono tracking-widest uppercase font-extrabold block">
                SIMULATION STATION
              </span>
              <h4 className="text-[13px] font-bold text-white uppercase tracking-wider font-sans mt-0.5">
                Simulate GPS Checkpoint
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">
                Updates physical spatial coordinate logs. Triggers corresponding route calculations on map.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {Object.entries(LOCATION_COORDINATES).map(([key, item]) => {
                const isActive = ambulance.currentLocKey === key;
                return (
                  <button
                    type="button"
                    key={`checkpoint-${key}`}
                    onClick={() => handleWaypointClick(key, item.name)}
                    className={`flex items-center justify-between p-3 rounded-2xl text-left text-xs font-mono border transition-all cursor-pointer ${
                      isActive 
                        ? "bg-orange-600/15 border-orange-500 text-orange-400 font-extrabold" 
                        : "bg-slate-850/50 border-slate-800 text-slate-300 hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className={`w-4 h-4 ${isActive ? "text-orange-500 animate-pulse" : "text-slate-500"}`} />
                      <span>{item.name}</span>
                    </div>
                    {isActive ? (
                      <span className="text-[8px] bg-orange-600 text-white font-extrabold px-1.5 py-0.5 rounded animate-pulse">
                        CURRENT LOCATION
                      </span>
                    ) : (
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-slate-300">
                        LAT: {item.lat.toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* COLUMN 2 & 3: MAP FEED OR SYSTEM TELEMETRY (RIGHT - Width 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* MAP / TELEMETRY DIAL SWITCHER */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-850 bg-slate-900/60 font-sans">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                <h3 className="text-sm font-display font-black text-white uppercase tracking-tight font-mono">
                  OPERATOR SATELLITE RADAR
                </h3>
              </div>
              <div className="flex bg-slate-850 p-1 rounded-xl border border-slate-800 text-xs gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("navigation")}
                  className={`px-3 py-1.5 rounded-lg font-mono font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                    activeTab === "navigation" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Map className="w-3.5 h-3.5" />
                  Live Navigation Map
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("logs")}
                  className={`px-3 py-1.5 rounded-lg font-mono font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                    activeTab === "logs" ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Ground Telemetry Logs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("completed")}
                  className={`px-3 py-1.5 rounded-lg font-mono font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                    activeTab === "completed" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed ({completedIncidents.length})
                </button>
              </div>
            </div>

            {/* TAB CONTENT: LIVE MAP */}
            {activeTab === "navigation" && (
              <div className="p-5">
                {mapError ? (
                  <div className="h-[360px] bg-slate-950 flex flex-col items-center justify-center p-6 text-center border border-slate-800 rounded-2xl text-slate-400 space-y-4 font-mono">
                    <span className="text-xl">⚠️</span>
                    <p className="text-xs font-bold text-red-500 uppercase tracking-widest">MAP LOADING TERMINATED</p>
                    <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed">
                      Leaflet CDN was interrupted or could not be verified in the sandbox workspace. Spatial logs continue to execute successfully.
                    </p>
                  </div>
                ) : (
                  <div 
                    ref={mapContainerRef} 
                    className="h-[360px] w-full rounded-2xl bg-slate-950 border border-slate-850 z-10 shadow-inner overflow-hidden"
                  />
                )}

                <div className="flex flex-wrap gap-4 justify-center mt-4 text-[9px] font-mono text-slate-400 border-t border-slate-850 pt-3">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-orange-600 flex items-center justify-center text-white text-[5px]">🚒</span> My Ambulance
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-600 flex items-center justify-center text-white text-[5px]">😷</span> Active Patient SOS
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-teal-600 flex items-center justify-center text-white text-[5px]">🏥</span> Assigned Wards
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="border-b-2 border-dashed border-orange-500 w-4 inline-block"></span> Triage Search Route
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="border-b-2 border-dashed border-teal-500 w-4 inline-block"></span> Care Delivery Route
                  </span>
                </div>
              </div>
            )}

            {/* TAB CONTENT: SYSTEM TELEMETRY DUMPER LOGS */}
            {activeTab === "logs" && (
              <div className="p-5">
                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 h-[350px] overflow-y-auto font-mono text-xs text-slate-300 space-y-3.5 scrollbar-thin">
                  <div className="text-[10px] text-amber-500 font-extrabold pb-2 border-b border-slate-900 flex justify-between items-center">
                    <span>📡 VHF RADIO INTERCEPT PACKETS</span>
                    <span className="animate-pulse">● LIVE CONNECTION</span>
                  </div>
                  {combatLogs.map((log) => (
                    <div key={log.id} className="flex gap-3 text-[11px] leading-relaxed border-b border-slate-900 pb-2">
                      <span className="text-slate-500 font-black">{log.time}</span>
                      <span className="text-slate-400">»</span>
                      <span className="text-slate-200">{log.text}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-mono text-slate-500 mt-2 text-right">
                  System logs generated dynamically in synchronization with Firestore endpoints.
                </p>
              </div>
            )}

            {/* TAB CONTENT: COMPLETED AND ADMITTED INCIDENTS */}
            {activeTab === "completed" && (
              <div className="p-5 space-y-4">
                <div className="text-[10px] text-emerald-500 font-extrabold pb-2 border-b border-slate-900 flex justify-between items-center bg-transparent">
                  <span>🏥 COMPLETED TRIP RECORDS</span>
                  <span className="flex items-center gap-1 font-mono text-[9px] text-emerald-500 font-extrabold animate-pulse">
                    🟢 SYNCED TO FIRESTORE
                  </span>
                </div>

                {completedIncidents.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-mono text-xs">
                    No completed or admitted incidents on search logs.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                    {completedIncidents.map((req) => {
                      const linkedHospital = hospitals?.find(h => h.id === req.assignedHospitalId);
                      const hospitalDisplay = linkedHospital ? (linkedHospital.hospitalName || linkedHospital.name) : (req.assignedHospitalId || 'Dhaka Medical Complex');
                      const completedTime = formatFirestoreTimestamp(req.completedAt || req.updatedAt || req.createdAt);

                      return (
                        <div key={req.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2 font-mono text-xs text-slate-300">
                          <div className="flex justify-between items-start border-b border-slate-900 pb-2">
                            <div>
                              <span className="text-white font-bold block">{req.patientName || "Anonymous"}</span>
                              <span className="text-[10px] text-slate-500 block">ID: {req.id}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[8.5px] uppercase font-bold border ${
                              req.status?.toLowerCase() === "admitted"
                                ? "bg-purple-950 text-purple-400 border-purple-800"
                                : "bg-emerald-950 text-emerald-400 border-emerald-800"
                            }`}>
                              {req.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                            <div>
                              <span className="text-slate-500 text-[9px] block font-semibold uppercase">EMERGENCY TYPE</span>
                              <span className="text-slate-200 font-medium">{req.emergencyType || "General"}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[9px] block font-semibold uppercase">DELIVERY HOSP</span>
                              <span className="text-teal-400 font-medium">{hospitalDisplay}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[9px] block font-semibold uppercase">AMBULANCE</span>
                              <span className="text-orange-500 font-medium">{ambulance.plateNumber || ambulance.vehicleNumber || req.assignedAmbulanceId}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[9px] block font-semibold uppercase">COMPLETED TIME</span>
                              <span className="text-slate-300 font-semibold">{completedTime}</span>
                            </div>
                          </div>

                          <div className="border-t border-slate-900 pt-2 flex justify-between items-center text-[10px] text-slate-500">
                            <span>OPERATOR: <b className="text-slate-300">{ambulance.driverName}</b></span>
                            <span className="text-[10.5px] text-emerald-500 font-bold flex items-center gap-1">
                              ✓ Verified Ledger
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACTIVE DISPATCH INCIDENTS */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-850 pb-4">
              <div>
                <span className="text-[9px] text-orange-500 font-mono tracking-widest uppercase font-extrabold block">
                  INCIDENT MANIFEST
                </span>
                <h3 className="text-base font-display font-black text-white mt-0.5">
                  Assigned Dispatch Incidents
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-orange-600/10 text-orange-500 px-3 py-1 rounded-xl border border-orange-500/20 font-black uppercase tracking-wider">
                QUEUE FILTER: Operator Only Mode
              </span>
            </div>

            {activeIncidents.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-3xl space-y-3">
                <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs font-mono text-slate-400">Standby. VHF channel report clear.</p>
                <span className="text-[10px] text-slate-500 block max-w-sm mx-auto">
                  No active requests correspond to your operator tag. Go to the Admin dashboard and dispatch a patient to vehicle <b>{ambulance.driverName}</b> to trigger this queue!
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {activeIncidents.map((req) => {
                  const createdTimeStr = req.createdAt ? new Date(req.createdAt).toLocaleTimeString() : "N/A";
                  
                  // Calculate customized ETA and Distance based on the current GPS location key compared statically
                  const startLocKeyInApp = ambulance.currentLocKey || "mirpur";
                  const targetPatientKeyInApp = req.locKey || "mirpur";
                  let estEta = "2 Mins";
                  let estDistRemaining = "1.2 km";

                  if (startLocKeyInApp !== targetPatientKeyInApp) {
                    estEta = "8 Mins";
                    estDistRemaining = "4.8 km";
                  }
                  if (req.status === "Patient Picked Up") {
                    estEta = "12 Mins";
                    estDistRemaining = "6.5 km";
                  }

                  // Find assigned hospital names
                  const linkedHospital = hospitals?.find(h => h.id === req.assignedHospitalId);
                  const hospitalDisplay = linkedHospital ? (linkedHospital.hospitalName || linkedHospital.name) : (req.assignedHospitalId || 'Dhaka Medical Complex');

                  return (
                    <div key={req.id} className="bg-slate-950 border border-slate-850 rounded-2xl p-5 space-y-5">
                      {/* CARD HEADER */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-900 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-black text-[13px] tracking-tight">{req.patientName}</span>
                            <span className="text-[10px] font-mono text-orange-500">ID: {req.id.substring(0, 5)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            Category: <b className="text-orange-500">{req.emergencyCategory || req.emergencyType || "General Emergency"}</b>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded text-[9px] uppercase font-mono font-black border ${
                            String(req.priority || req.severity).toLowerCase() === "critical" 
                              ? "bg-red-950/70 text-red-550 border-red-700/60 animate-pulse" 
                              : String(req.priority || req.severity).toLowerCase() === "high"
                                ? "bg-amber-950/70 text-amber-550 border-amber-700/60"
                                : "bg-sky-950/70 text-sky-550 border-sky-700/60"
                          }`}>
                            {req.priority || req.severity || "MEDIUM"} PRIORITY
                          </span>
                        </div>
                      </div>

                      {/* CARD GRID INFO */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-[11px] text-slate-400 border-b border-slate-900 pb-4">
                        <div className="space-y-3">
                          <div>
                            <span className="text-slate-500 text-[9px] block uppercase tracking-wider font-extrabold pb-0.5">REGIONAL VENUE</span>
                            <span className="text-slate-200 font-bold block">
                              Division: {req.division || "N/A"} • District: {req.district || "N/A"} • Upazila: {req.area || "N/A"}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-500 text-[9px] block uppercase tracking-wider font-extrabold pb-0.5">EXACT ADDRESS / LANDMARK</span>
                            <span className="text-slate-200 font-bold block bg-slate-900 border border-slate-850 p-2 rounded-xl text-xs">
                              📍 {req.exactAddress || req.location || "N/A"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-slate-500 text-[9px] block uppercase tracking-wider font-extrabold pb-0.5">CONTACT PHONE</span>
                              <span className="text-slate-205 font-black block">
                                {req.patientPhone || req.phone || "017XXXXXXXX"}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[9px] block uppercase tracking-wider font-extrabold pb-0.5">DISPATCH ETA</span>
                              <span className="text-amber-500 font-black block">
                                {estEta} ({estDistRemaining})
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-slate-500 text-[9px] block uppercase tracking-wider font-extrabold pb-0.5">INCIDENT CONDITIONS / SYMPTOMS</span>
                            <p className="text-slate-300 font-sans leading-relaxed text-xs truncate max-w-full">
                              "{req.symptoms || "No additional visual symptoms given."}"
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* REQUIRED DISPATCH DEVICE / RESOURCES */}
                      <div>
                        <span className="text-slate-500 text-[9px] block uppercase tracking-wider font-extrabold pb-1.5 font-mono">
                          REQUIRED RESCUE RESOURCES
                        </span>
                        <div className="flex gap-2 flex-wrap">
                          {req.requiredResources && req.requiredResources.length > 0 ? (
                            req.requiredResources.map((resource, idx) => {
                              const icuStyle = resource.toLowerCase().includes("icu") ? "bg-red-950 text-red-405 border-red-900" : "bg-slate-900 text-slate-300 border-slate-800";
                              return (
                                <span key={idx} className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border ${icuStyle}`}>
                                  ✙ {resource}
                                </span>
                              );
                            })
                          ) : (
                            <>
                              {req.requestedResources?.icu && (
                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border bg-red-950 text-red-405 border-red-900 animate-pulse">
                                  ✙ ICU Bed Required
                                </span>
                              )}
                              {req.requestedResources?.oxygen && (
                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border bg-emerald-950 text-emerald-405 border-emerald-900">
                                  ✙ VIP Oxygen Required
                                </span>
                              )}
                              {req.requestedResources?.ventilator && (
                                <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border bg-blue-950 text-blue-405 border-blue-900">
                                  ✙ Ventilator Required
                                </span>
                              )}
                              {(!req.requestedResources || Object.values(req.requestedResources).every(v => !v)) && (
                                <span className="text-[10px] text-slate-500 italic font-mono">No heavy instrumentation mapped</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* CLINICS ASSIGNED */}
                      <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl space-y-1.5 text-slate-300 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500 text-[9px] font-extrabold">ASSIGNED HOSPITAL:</span>
                          <span className="text-teal-400 font-black uppercase text-[10px]">{hospitalDisplay}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 text-[9px] font-extrabold">DISPATCHED AMBULANCE:</span>
                          <span className="text-orange-500 font-bold">{ambulance.plateNumber || ambulance.vehicleNumber}</span>
                        </div>
                      </div>

                      {/* STEP-BY-STEP PROGRESS TRACKER BAR */}
                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] text-slate-500 font-mono block uppercase tracking-wider font-extrabold">
                          VISUAL DISPATCH MILESTONES
                        </span>
                        
                        <div className="relative">
                          {/* Background line */}
                          <div className="absolute top-[14px] left-3 right-3 h-0.5 bg-slate-800 z-0" />

                          {/* Dynamic progress bar width */}
                          <div 
                            className="absolute top-[14px] left-3 h-0.5 bg-gradient-to-r from-orange-500 to-emerald-500 z-0 transition-all duration-500"
                            style={{
                              width: 
                                req.status === "Pending" ? "0%" :
                                (req.status === "Dispatched" || req.status === "ambulance_assigned") ? "20%" :
                                req.status === "On Route" ? "40%" :
                                req.status === "Patient Picked Up" ? "60%" :
                                req.status === "Arrived at Hospital" ? "80%" : "100%"
                            }}
                          />

                          <div className="relative flex justify-between z-10 text-[9px] font-mono">
                            
                            {/* Milestone 1: REQUESTED */}
                            <div className="flex flex-col items-center">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-black transition-all ${
                                req.status === "Pending"
                                  ? "bg-red-950 text-red-500 border-red-500 animate-pulse scale-110"
                                  : "bg-slate-900 text-slate-500 border-slate-800"
                              }`}>
                                SOS
                              </div>
                              <span className={`mt-1 font-bold ${req.status === "Pending" ? "text-red-500" : "text-slate-500"}`}>REQUESTED</span>
                            </div>

                            {/* Milestone 2: ASSIGNED */}
                            <div className="flex flex-col items-center">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-black transition-all ${
                                (req.status === "Dispatched" || req.status === "ambulance_assigned" || req.status === "Assigned")
                                  ? "bg-sky-950 text-sky-400 border-sky-400 animate-pulse scale-110"
                                  : req.status !== "Pending"
                                    ? "bg-sky-900/30 text-sky-500 border-sky-850"
                                    : "bg-slate-900 text-slate-500 border-slate-800"
                              }`}>
                                DIS
                              </div>
                              <span className={`mt-1 font-bold ${(req.status === "Dispatched" || req.status === "ambulance_assigned" || req.status === "Assigned") ? "text-sky-450" : "text-slate-500"}`}>ASSIGNED</span>
                            </div>

                            {/* Milestone 3: EN ROUTE */}
                            <div className="flex flex-col items-center">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-black transition-all ${
                                req.status === "On Route"
                                  ? "bg-amber-950 text-amber-500 border-amber-500 animate-pulse scale-110"
                                  : (req.status !== "Pending" && req.status !== "Dispatched")
                                    ? "bg-amber-900/35 text-amber-500 border-amber-850"
                                    : "bg-slate-900 text-slate-500 border-slate-800"
                              }`}>
                                NAV
                              </div>
                              <span className={`mt-1 font-bold ${req.status === "On Route" ? "text-amber-500" : "text-slate-500"}`}>EN ROUTE</span>
                            </div>

                            {/* Milestone 4: PICKED UP */}
                            <div className="flex flex-col items-center">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-black transition-all ${
                                req.status === "Patient Picked Up"
                                  ? "bg-orange-950 text-orange-500 border-orange-500 animate-pulse scale-110"
                                  : (req.status === "Arrived at Hospital" || req.status === "Completed")
                                    ? "bg-orange-900/30 text-orange-500 border-orange-800"
                                    : "bg-slate-900 text-slate-500 border-slate-800"
                              }`}>
                                PAT
                              </div>
                              <span className={`mt-1 font-bold ${req.status === "Patient Picked Up" ? "text-orange-550" : "text-slate-500"}`}>PICKED UP</span>
                            </div>

                            {/* Milestone 5: REACHED HOSP */}
                            <div className="flex flex-col items-center">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-black transition-all ${
                                req.status === "Arrived at Hospital"
                                  ? "bg-teal-950 text-teal-500 border-teal-500 animate-pulse scale-110"
                                  : req.status === "Completed"
                                    ? "bg-teal-900/30 text-teal-500 border-teal-800"
                                    : "bg-slate-900 text-slate-500 border-slate-800"
                              }`}>
                                HOS
                              </div>
                              <span className={`mt-1 font-bold ${req.status === "Arrived at Hospital" ? "text-teal-400" : "text-slate-500"}`}>REACHED HOSP</span>
                            </div>

                            {/* Milestone 6: COMPLETED */}
                            <div className="flex flex-col items-center">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-black transition-all ${
                                req.status === "Completed"
                                  ? "bg-emerald-950 text-emerald-400 border-emerald-500 animate-pulse scale-110"
                                  : "bg-slate-900 text-slate-500 border-slate-800"
                              }`}>
                                LOCK
                              </div>
                              <span className={`mt-1 font-bold ${req.status === "Completed" ? "text-emerald-500" : "text-slate-500"}`}>COMPLETED</span>
                            </div>

                          </div>
                        </div>
                      </div>

                      {/* STEP INTERACTIVE ACTION BUTTONS */}
                      <div className="flex flex-wrap items-center gap-2 border-t border-slate-900 pt-4">
                        <span className="text-[9px] font-mono text-slate-500 block uppercase mr-2 font-black tracking-wider">
                          TRIGGER TRIP SHIFT:
                        </span>

                        {(req.status === "Pending" || req.status === "Dispatched" || req.status === "Assigned" || req.status === "ambulance_assigned") && (
                          <button
                            type="button"
                            onClick={() => handleRequestTick(req.id, "On Route", req.patientName)}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-mono font-black text-[10px] rounded-xl cursor-pointer shadow-md transition-all uppercase tracking-wider flex items-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 text-white animate-pulse" />
                            DEPLOY EN ROUTE TRIP
                          </button>
                        )}

                        {req.status === "On Route" && (
                          <button
                            type="button"
                            onClick={() => handleRequestTick(req.id, "Patient Picked Up", req.patientName)}
                            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-mono font-black text-[10px] rounded-xl cursor-pointer shadow-md transition-all uppercase tracking-wider flex items-center gap-1.5"
                          >
                            <Heart className="w-3.5 h-3.5 text-white animate-beat" />
                            SECURE PATIENT ONBOARD
                          </button>
                        )}

                        {req.status === "Patient Picked Up" && (
                          <button
                            type="button"
                            onClick={() => handleRequestTick(req.id, "Arrived at Hospital", req.patientName)}
                            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-mono font-black text-[10px] rounded-xl cursor-pointer shadow-md transition-all uppercase tracking-wider flex items-center gap-1.5"
                          >
                            <Compass className="w-3.5 h-3.5 text-white animate-spin" style={{ animationDuration: '3s' }} />
                            ARRIVED CLINICAL BAY
                          </button>
                        )}

                        {req.status === "Arrived at Hospital" && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleRequestTick(req.id, "completed", req.patientName)}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-500 via-green-600 to-teal-500 hover:opacity-90 text-white font-mono font-black text-[10px] rounded-xl cursor-pointer shadow-md transition-all uppercase tracking-wider flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              MARK COMPLETED (FREE FLEET)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequestTick(req.id, "admitted", req.patientName)}
                              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90 text-white font-mono font-black text-[10px] rounded-xl cursor-pointer shadow-md transition-all uppercase tracking-wider flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              MARK ADMITTED (FREE FLEET)
                            </button>
                          </div>
                        )}

                        {(req.status === "Completed" || req.status === "completed" || req.status === "admitted" || req.status === "Admitted") && (
                          <span className="text-[10px] font-mono text-emerald-500 font-extrabold uppercase tracking-wider bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/25 flex items-center gap-1.5 animate-pulse">
                            ✓ Job lock successfully archived on VHF network. Ready for next dispatch.
                          </span>
                        )}

                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
