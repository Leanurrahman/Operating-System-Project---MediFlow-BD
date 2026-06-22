import { useState, useEffect, useMemo } from "react";
import { 
  Building2, 
  Cpu, 
  Truck,
  PlusCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Settings,
  ShoppingBag,
  Heart,
  Trash2,
  AlertCircle
} from "lucide-react";
import { 
  RequestStatus, 
  AmbulanceStatus
} from "../types";
import LiveQueueGantt from "../components/LiveQueueGantt";
import BankersVisualizer from "../components/BankersVisualizer";
import { BANGLADESH_LOCATIONS } from "../utils/locationData";
import BDLocationSelector from "../components/BDLocationSelector";

export default function HospitalAdmin({
  hospitals = [],
  ambulances = [],
  requests = [],
  onChangeResource,
  onAssignDispatch,
  onRequestUpdate,
  bankerMatrix,
  onClaimVerify,
  isBankersSafe,
  safeSequence,
  warningAlert,
  onRunScheduler,
  schedulerStats,
  schedulerTimeline,
  schedulerResults,
  onAgeToggle,
  onAddAmbulance,
  onAddHospital,
  bankersDemoMode = "manual",
  onSetBankersDemoMode,
  onAddMedicine,
  onAddBloodDonor,
  onProvisionDefaults,
  onResetDemoData,
  isLoading
}) {
  const [selectedAlgo, setSelectedAlgo] = useState("FCFS");
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    deleteStatic: false,
    isProcessing: false,
    feedback: ""
  });
  const [timeQuantum, setTimeQuantum] = useState(2);
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedFeedback, setSchedFeedback] = useState("");

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Assign dispatch states
  const [targetAmbulance, setTargetAmbulance] = useState({});
  const [targetHospital, setTargetHospital] = useState({});
  const [dispatchFeedback, setDispatchFeedback] = useState({});

  // Selected filter and search terms for the comprehensive tracking panel
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState("all");
  const [selectedAreaFilter, setSelectedAreaFilter] = useState("all");

  const uniqueTypes = useMemo(() => {
    const types = new Set();
    (requests || []).forEach(r => {
      const t = r.emergencyCategory || r.emergencyType;
      if (t) types.add(t);
    });
    return Array.from(types).sort();
  }, [requests]);

  const uniqueAreas = useMemo(() => {
    const areas = new Set();
    (requests || []).forEach(r => {
      if (r.area) areas.add(r.area);
    });
    return Array.from(areas).sort();
  }, [requests]);

  // Filter core requests for the comprehensive incident panel
  const filteredRequests = (requests || []).filter((req) => {
    // 1. Search filter
    if (searchTerm && !req.patientName?.toLowerCase()?.includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // 1b. Emergency Type filter
    if (selectedTypeFilter !== "all") {
      const type = (req.emergencyCategory || req.emergencyType || "").toLowerCase();
      if (type !== selectedTypeFilter.toLowerCase()) {
        return false;
      }
    }

    // 1c. Priority filter
    if (selectedPriorityFilter !== "all") {
      const priority = (req.priority || req.severity || "").toLowerCase();
      if (priority !== selectedPriorityFilter.toLowerCase()) {
        return false;
      }
    }

    // 1d. Location/Area filter
    if (selectedAreaFilter !== "all") {
      const area = (req.area || "").toLowerCase();
      if (area !== selectedAreaFilter.toLowerCase()) {
        return false;
      }
    }

    // 2. Status Category filter
    const status = (req.status || "").toLowerCase();
    if (selectedFilter === "pending") {
      return status === "pending" || status === "waiting_resource" || req.deadlockRisk;
    }
    if (selectedFilter === "ambulance_assigned") {
      return status === "ambulance_assigned" || status === "assigned";
    }
    if (selectedFilter === "active_triage") {
      return status === "on_route" || status === "picked_up" || status === "arrived_at_hospital" || status === "patient picked up" || status === "patient picked" || status === "on route" || status === "reached hospital";
    }
    if (selectedFilter === "admitted") {
      return status === "admitted";
    }
    if (selectedFilter === "completed") {
      return status === "completed" || status === "cancelled";
    }
    return true; // "all"
  });

  // Accordion drawer for dynamic asset additions
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [hospForm, setHospForm] = useState({
    hospitalName: "",
    division: "Dhaka",
    district: "Dhaka",
    area: "Mirpur",
    contact: "",
    totalICU: 20,
    totalOxygen: 50,
    totalVentilators: 15,
    totalDoctors: 30,
    totalOT: 4
  });
  const [ambForm, setAmbForm] = useState({
    vehicleNumber: "",
    driverName: "",
    driverPhone: "",
    division: "Dhaka",
    district: "Dhaka",
    area: "Mirpur",
    capacity: 1,
    operatorId: ""
  });
  const [medForm, setMedForm] = useState({ name: "", category: "Heart Disease", price: 150, stock: 40, description: "", prescriptionRequired: false });
  const [donorForm, setDonorForm] = useState({
    name: "",
    bloodGroup: "O+",
    phone: "",
    division: "Dhaka",
    district: "Dhaka",
    area: "Mirpur",
    availability: true
  });
  const [isSeeding, setIsSeeding] = useState(false);
  const [commissionFeedback, setCommissionFeedback] = useState("");

  const handleRunSchedClick = async () => {
    setIsScheduling(true);
    setSchedFeedback("");
    try {
      await onRunScheduler(selectedAlgo, timeQuantum);
      setSchedFeedback("✓ Scheduling queue calculated. Gantt updated below!");
      setTimeout(() => setSchedFeedback(""), 4000);
    } catch {
      setSchedFeedback("Failure triggering OS scheduling core.");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleAssignClick = async (reqId) => {
    const ambId = targetAmbulance[reqId];
    const hospId = targetHospital[reqId];
    if (!ambId || !hospId) return;

    setDispatchFeedback(prev => ({ ...prev, [reqId]: "Dispatching..." }));
    try {
      await onAssignDispatch(reqId, ambId, hospId);
      setDispatchFeedback(prev => ({ ...prev, [reqId]: "✓ Dispatched" }));
    } catch {
      setDispatchFeedback(prev => ({ ...prev, [reqId]: "Timeout" }));
    }
  };

  const handleAddHospSubmit = async (e) => {
    e.preventDefault();
    if (!hospForm.hospitalName) return;

    let lat = 23.8103;
    let lng = 90.4125;
    try {
      const areaData = BANGLADESH_LOCATIONS[hospForm.division]?.districts[hospForm.district]?.areas[hospForm.area];
      if (areaData) {
        lat = areaData.lat;
        lng = areaData.lng;
      }
    } catch (err) {
      console.warn("Hospital coordinate look up fail", err);
    }

    const payload = {
      ...hospForm,
      location: `${hospForm.area}, ${hospForm.district}, ${hospForm.division}`,
      coordinates: { lat, lng }
    };

    const res = await onAddHospital(payload);
    if (res.success) {
      setCommissionFeedback("🏥 Hospital Center commissioned dynamically!");
      setHospForm({
        hospitalName: "",
        division: "Dhaka",
        district: "Dhaka",
        area: "Mirpur",
        contact: "",
        totalICU: 20,
        totalOxygen: 50,
        totalVentilators: 15,
        totalDoctors: 30,
        totalOT: 4
      });
      setTimeout(() => setCommissionFeedback(""), 3000);
    } else {
      setCommissionFeedback("❌ Failed to add hospital.");
      setTimeout(() => setCommissionFeedback(""), 3000);
    }
  };

  const handleAddAmbSubmit = async (e) => {
    e.preventDefault();
    if (!ambForm.vehicleNumber || !ambForm.driverName) return;

    let lat = 23.8103;
    let lng = 90.4125;
    try {
      const areaData = BANGLADESH_LOCATIONS[ambForm.division]?.districts[ambForm.district]?.areas[ambForm.area];
      if (areaData) {
        lat = areaData.lat;
        lng = areaData.lng;
      }
    } catch (err) {
      console.warn("Ambulance coordinate look up fail", err);
    }

    const payload = {
      ...ambForm,
      location: `${ambForm.area}, ${ambForm.district}, ${ambForm.division}`,
      coordinates: { lat, lng }
    };

    const res = await onAddAmbulance(payload);
    if (res.success) {
      setCommissionFeedback("🚒 Response Fleet Vehicle commissioned successfully!");
      setAmbForm({
        vehicleNumber: "",
        driverName: "",
        driverPhone: "",
        division: "Dhaka",
        district: "Dhaka",
        area: "Mirpur",
        capacity: 1,
        operatorId: ""
      });
      setTimeout(() => setCommissionFeedback(""), 3000);
    } else {
      setCommissionFeedback("❌ Failed to register fleet vehicle.");
      setTimeout(() => setCommissionFeedback(""), 3000);
    }
  };

  const handleAddMedSubmit = async (e) => {
    e.preventDefault();
    if (!medForm.name) return;
    const res = await onAddMedicine(medForm);
    if (res.success) {
      setCommissionFeedback("💊 Lifesaver pharmaceutical medicine stocked dynamically!");
      setMedForm({ name: "", category: "Heart Disease", price: 150, stock: 40, description: "", prescriptionRequired: false });
      setTimeout(() => setCommissionFeedback(""), 3000);
    } else {
      setCommissionFeedback("❌ Failed to stock medicine.");
      setTimeout(() => setCommissionFeedback(""), 3000);
    }
  };

  const handleAddDonorSubmit = async (e) => {
    e.preventDefault();
    if (!donorForm.name || !donorForm.phone) return;

    const payload = {
      ...donorForm,
      location: `${donorForm.area}, ${donorForm.district}, ${donorForm.division}`
    };

    const res = await onAddBloodDonor(payload);
    if (res.success) {
      setCommissionFeedback("🩸 Live blood donor registered successfully!");
      setDonorForm({
        name: "",
        bloodGroup: "O+",
        phone: "",
        division: "Dhaka",
        district: "Dhaka",
        area: "Mirpur",
        availability: true
      });
      setTimeout(() => setCommissionFeedback(""), 3000);
    } else {
      setCommissionFeedback("❌ Failed to register blood donor.");
      setTimeout(() => setCommissionFeedback(""), 3000);
    }
  };

  const handleProvisionDefaultsClick = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    setCommissionFeedback("Seeding Bangladesh Emergency Network inside Firestore...");
    try {
      const res = await onProvisionDefaults();
      if (res && res.success) {
        setCommissionFeedback("✓ Success! Bangladesh Emergency Network seeded successfully with Hospitals, Ambulances, Medicines, and live Donors across divisions.");
      } else {
        setCommissionFeedback("❌ Error seeding Bangladesh Emergency Network.");
      }
    } catch (e) {
      setCommissionFeedback(`❌ Seeding failed: ${e.message || e}`);
    } finally {
      setIsSeeding(false);
      setTimeout(() => setCommissionFeedback(""), 5000);
    }
  };

  const handleResetConfirm = async () => {
    setResetModal((prev) => ({ ...prev, isProcessing: true, feedback: "Resetting database..." }));
    try {
      await onResetDemoData(resetModal.deleteStatic);
      setResetModal((prev) => ({
        ...prev,
        isProcessing: false,
        feedback: "✓ Success! Database reset complete."
      }));
      setTimeout(() => {
        setResetModal({ isOpen: false, deleteStatic: false, isProcessing: false, feedback: "" });
      }, 2000);
    } catch (err) {
      setResetModal((prev) => ({
        ...prev,
        isProcessing: false,
        feedback: `❌ Reset failed: ${err.message || err}`
      }));
    }
  };

  const pendingQueue = requests.filter(r => r.status === "pending" || r.status === RequestStatus.PENDING || r.status === "recommended_for_dispatch");
  const activeAmbulances = ambulances.filter(a => a.status === "available" || a.status === AmbulanceStatus.AVAILABLE);
  const recommendedPatient = requests.find(r => r.status === "recommended_for_dispatch");

  return (
    <div className="space-y-8 text-slate-800">

      {/* Bankers Deadlock Warning Alert Banner */}
      {!isBankersSafe && (
        <div id="bankers-deadlock-alert" className="bg-red-950 border-2 border-red-800 text-red-100 rounded-3xl p-5 shadow-2xl flex flex-col sm:flex-row items-center gap-4 animate-pulse">
          <AlertCircle className="w-12 h-12 text-red-500 shrink-0" />
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-display font-black uppercase tracking-wider text-red-405">
              🚨 Deadlock Threat Warning (Unsafe state detected!)
            </h4>
            <p className="text-xs font-mono text-slate-300">
              Unsafe state detected! Deadlocks are possible without active mitigation. Banker's avoidance locked resource dispatch queues.
            </p>
          </div>
        </div>
      )}

      {isBankersSafe && (
        <div id="bankers-safe-alert" className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex items-center justify-between gap-4 text-xs font-mono text-emerald-400">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="font-extrabold uppercase tracking-widest text-[9.5px]">MediFlow Safe Sequence Verified</span>
          </div>
          <span className="text-slate-400 text-[10px]">Zero deadlock risk detected in regional pools</span>
        </div>
      )}

      {/* Dynamic Command Console Output Summary Panel */}
      <div id="output-summary-panel" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-display font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-orange-500" />
              Platform Command Output Summary Panel
            </h3>
            <p className="text-xs text-slate-400">
              Live automated status outputs of local emergency requests, regional safety metrics, and systemic overrides
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full uppercase tracking-wider">
            SYSTEM ENGINE SECURE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Active Triage Metric Card */}
          <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest block">Active Triage Patients</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-display font-black text-white">{
                requests.filter(r => ["on_route", "picked_up", "arrived_at_hospital", "patient picked up", "on route", "reached hospital"].includes((r.status || "").toLowerCase())).length
              }</span>
              <span className="text-[11px] font-mono text-emerald-500">Live Listening</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Currently assigned to active emergency dispatch</p>
          </div>

          {/* Completed Incidents Metric Card */}
          <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest block">Completed Incidents</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-display font-black text-white">{
                requests.filter(r => ["completed", "admitted", "cancelled"].includes((r.status || "").toLowerCase())).length
              }</span>
              <span className="text-[11px] font-mono text-emerald-500">Resolved Archive</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Fully resolved or admitted patients</p>
          </div>

          {/* Unsafe emergency requests denied/blocked Metric Card */}
          <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest block">Blocked Deadlock Requests</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-3xl font-display font-black ${
                requests.filter(r => (r.status || "").toLowerCase() === "waiting_resource" || r.deadlockRisk).length > 0 ? "text-red-500" : "text-white"
              }`}>{
                requests.filter(r => (r.status || "").toLowerCase() === "waiting_resource" || r.deadlockRisk).length
              }</span>
              {requests.filter(r => (r.status || "").toLowerCase() === "waiting_resource" || r.deadlockRisk).length > 0 && (
                <span className="text-[10px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded font-bold animate-pulse">RISK DENIED</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Denied dynamically to avoid network deadlocks</p>
          </div>

          {/* Manual Adjustments Tracker */}
          <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest block">Manual Adjustments</span>
            <div className="mt-2 text-xs font-mono text-slate-300 space-y-1">
              {(() => {
                const adjustments = [];
                const baseline = {
                  hosp1: { icu: 40, oxygen: 100, vent: 25, doc: 120, ot: 10 },
                  hosp2: { icu: 20, oxygen: 80, vent: 15, doc: 60, ot:  4 },
                  hosp3: { icu: 15, oxygen: 60, vent: 10, doc: 50, ot:  4 },
                  hosp4: { icu: 30, oxygen: 90, vent: 20, doc: 95, ot:  8 },
                  hosp5: { icu: 18, oxygen: 50, vent: 8,  doc: 45, ot:  3 },
                };

                hospitals.forEach(h => {
                  const base = baseline[h.id];
                  if (base) {
                    const diffs = [];
                    if (h.icuBeds?.total !== base.icu) diffs.push(`ICU (${h.icuBeds?.total > base.icu ? '+' : ''}${Number(h.icuBeds?.total || 0) - base.icu})`);
                    if (h.oxygenCylinders?.total !== base.oxygen) diffs.push(`O2 (${h.oxygenCylinders?.total > base.oxygen ? '+' : ''}${Number(h.oxygenCylinders?.total || 0) - base.oxygen})`);
                    if (h.ventilators?.total !== base.vent) diffs.push(`Vent (${h.ventilators?.total > base.vent ? '+' : ''}${Number(h.ventilators?.total || 0) - base.vent})`);
                    if (h.doctors?.total !== base.doc) diffs.push(`Doc (${h.doctors?.total > base.doc ? '+' : ''}${Number(h.doctors?.total || 0) - base.doc})`);
                    if (h.operationTheaters?.total !== base.ot) diffs.push(`OT (${h.operationTheaters?.total > base.ot ? '+' : ''}${Number(h.operationTheaters?.total || 0) - base.ot})`);
                    
                    if (diffs.length > 0) {
                      adjustments.push(`${h.name.split(' ')[0]}: ${diffs.join(', ')}`);
                    }
                  }
                });

                if (adjustments.length === 0) {
                  return <span className="text-[10px] text-slate-500 italic">No manual capacity adjustments</span>;
                }
                return (
                  <div className="max-h-[50px] overflow-y-auto text-[9.5px] leading-tight space-y-0.5 text-orange-400 font-bold">
                    {adjustments.map((adj, i) => (
                      <div key={i} className="truncate">🔧 {adj}</div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Deviation from baseline resource levels</p>
          </div>
        </div>

        {/* Live Safety Sequence Checklist */}
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between col-span-4">
            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider block">Live Banker's Validation Path Tracker</span>
            <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-md ${
              isBankersSafe ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-red-950 text-red-400 border border-red-800"
            }`}>
              {isBankersSafe ? "✓ SYSTEM SECURED SAFE STATE" : "⚠️ WARNING UNSAFE STATE"}
            </span>
          </div>

          {isBankersSafe ? (
            <div className="space-y-2">
              <span className="text-[10.5px] text-slate-300 font-mono">
                System resolves the following clear-execute safety queue paths to zero deadlock (checklist verified):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-1">
                {safeSequence && safeSequence.length > 0 ? (
                  safeSequence.map((step, idx) => (
                    <div key={`checklist-${idx}`} className="flex items-center gap-2 bg-slate-900 border border-emerald-950/60 p-2.5 rounded-xl">
                      <div className="w-4 h-4 bg-emerald-950 text-emerald-400 flex items-center justify-center rounded-full text-[9px] font-extrabold border border-emerald-800 shrink-0">
                        ✓
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] text-slate-500 block uppercase font-mono font-bold font-black">PATH {idx + 1}</span>
                        <span className="text-[10.5px] text-slate-200 font-bold block truncate" title={step}>
                          {step}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-5 text-slate-500 italic text-[10.5px]">No active processes occupying deadlock vector pools. Idle standby safe.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-red-950/40 border border-red-900 rounded-xl flex items-center gap-3">
              <div className="w-5 h-5 bg-red-950 border border-red-800 text-red-400 flex items-center justify-center rounded-full font-bold font-mono text-xs animate-ping shrink-0">
                !
              </div>
              <p className="text-[10.5px] font-mono text-red-200">
                <b>CRITICAL BLOCKED:</b> No safety path is resolved across current clinician vectors. Manual adjustments or completing pending incidents is required to clear deadlock.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- ASSET COMMISSIONING CONTROL TERM (100% DYNAMIC COMPLIANT) --- */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 text-white">
            <span className="text-[10px] bg-orange-600/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-md font-mono font-bold tracking-widest uppercase">DYNAMIC NODE WORKSPACE</span>
            <h3 className="text-base font-display font-black text-white flex items-center gap-2 mt-1">
              <Settings className="w-5 h-5 text-orange-500 animate-spin-slow" />
              Core Infrastructure Provisioner
            </h3>
            <p className="text-xs text-neutral-400">Register clinics, mobilize driver fleets, stock medicine inventories dynamically</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={handleProvisionDefaultsClick}
              disabled={isSeeding}
              className={`px-4 py-2 text-xs font-mono font-bold rounded-xl transition shadow-lg text-center cursor-pointer ${
                isSeeding 
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed" 
                  : "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-orange-600/10"
              }`}
            >
              {isSeeding ? "⚡ Seeding Bangladesh Engine..." : "🚀 Seed Bangladesh Emergency Network"}
            </button>

            <button
              type="button"
              onClick={() => setResetModal({ isOpen: true, deleteStatic: false, isProcessing: false, feedback: "" })}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold rounded-xl shadow-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5 border border-red-500/30"
            >
              <Trash2 className="w-3.5 h-3.5 animate-pulse" />
              Reset Demo Data
            </button>

            <button
              type="button"
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold rounded-xl transition border border-slate-700 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isPanelOpen ? "Hide Builders" : "Show Custom Forms"}
              {isPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {commissionFeedback && (
          <div className="mt-4 p-2 text-center text-xs font-bold font-mono text-orange-300 bg-orange-500/10 border border-orange-500/25 rounded-xl animate-pulse">
            {commissionFeedback}
          </div>
        )}

        {isPanelOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-800 text-slate-300">
            
            {/* a) Add Hospital Center Form */}
            <form onSubmit={handleAddHospSubmit} className="space-y-4 p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">1. Clinical Center</span>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">HOSPITAL NAME:</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Kurmitola General Hospital" 
                      value={hospForm.hospitalName}
                      onChange={(e) => setHospForm({...hospForm, hospitalName: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="py-2 border-t border-slate-800 mt-2">
                    <BDLocationSelector
                      division={hospForm.division}
                      district={hospForm.district}
                      area={hospForm.area}
                      setDivision={(div) => setHospForm(prev => ({ ...prev, division: div }))}
                      setDistrict={(dist) => setHospForm(prev => ({ ...prev, district: dist }))}
                      setArea={(area) => setHospForm(prev => ({ ...prev, area: area }))}
                      darkTheme={true}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <label className="text-slate-400 block mb-1">ICU BEDS:</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        value={hospForm.totalICU}
                        onChange={(e) => setHospForm({...hospForm, totalICU: Number(e.target.value)})}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">OXYGEN TANKS:</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        value={hospForm.totalOxygen}
                        onChange={(e) => setHospForm({...hospForm, totalOxygen: Number(e.target.value)})}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full mt-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold font-mono text-xs rounded-xl cursor-pointer transition">
                Commission Center
              </button>
            </form>

            {/* b) Add Ambulance Vehicle Form */}
            <form onSubmit={handleAddAmbSubmit} className="space-y-4 p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                  <Truck className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">2. Mobilize Driver</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">VEHICLE PLATE NUMBER:</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Dhaka Metro-Chha-15-4432" 
                      value={ambForm.vehicleNumber}
                      onChange={(e) => setAmbForm({...ambForm, vehicleNumber: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">DRIVER HUMAN NAME:</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Kamil Ahsan" 
                      value={ambForm.driverName}
                      onChange={(e) => setAmbForm({...ambForm, driverName: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="py-2 border-t border-slate-800 mt-2">
                    <BDLocationSelector
                      division={ambForm.division}
                      district={ambForm.district}
                      area={ambForm.area}
                      setDivision={(div) => setAmbForm(prev => ({ ...prev, division: div }))}
                      setDistrict={(dist) => setAmbForm(prev => ({ ...prev, district: dist }))}
                      setArea={(area) => setAmbForm(prev => ({ ...prev, area: area }))}
                      darkTheme={true}
                    />
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full mt-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold font-mono text-xs rounded-xl cursor-pointer transition">
                Mobilize Driver
              </button>
            </form>

            {/* c) Add Medicine Stock Form */}
            <form onSubmit={handleAddMedSubmit} className="space-y-4 p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                  <PlusCircle className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">3. Stock Drugs</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">MEDICINE NAME:</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Nitroglycerin Spray" 
                      value={medForm.name}
                      onChange={(e) => setMedForm({...medForm, name: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono block mb-1">PRICE (BDT):</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        value={medForm.price}
                        onChange={(e) => setMedForm({...medForm, price: Number(e.target.value)})}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-mono block mb-1">QTY PIECES:</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        value={medForm.stock}
                        onChange={(e) => setMedForm({...medForm, stock: Number(e.target.value)})}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">PHARMA CATEGORY:</label>
                    <select 
                      value={medForm.category}
                      onChange={(e) => setMedForm({...medForm, category: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                    >
                      <option value="Heart Disease">Heart/Cardiovascular</option>
                      <option value="Allergy/Anaphylaxis">Allergy Emergency</option>
                      <option value="Asthma/COPD">Bronchodilators</option>
                      <option value="Blood Thinner">Blood Thinners Table</option>
                      <option value="Analgesic">Critical IV Infusion</option>
                    </select>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full mt-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold font-mono text-xs rounded-xl cursor-pointer transition">
                Stock Inventory
              </button>
            </form>

            {/* d) Add Blood Donor Form */}
            <form onSubmit={handleAddDonorSubmit} className="space-y-4 p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                  <Heart className="w-4 h-4 text-orange-500 mb-0.5" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">4. Blood Recruits</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">DONOR NAME:</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Mahadi Hasan" 
                      value={donorForm.name}
                      onChange={(e) => setDonorForm({...donorForm, name: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div className="py-2 border-t border-slate-800 mt-2">
                    <BDLocationSelector
                      division={donorForm.division}
                      district={donorForm.district}
                      area={donorForm.area}
                      setDivision={(div) => setDonorForm(prev => ({ ...prev, division: div }))}
                      setDistrict={(dist) => setDonorForm(prev => ({ ...prev, district: dist }))}
                      setArea={(area) => setDonorForm(prev => ({ ...prev, area: area }))}
                      darkTheme={true}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">GROUP / RH FACTOR:</label>
                    <select
                      value={donorForm.bloodGroup}
                      onChange={(e) => setDonorForm({...donorForm, bloodGroup: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                    >
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">PHONE NUMBER:</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 01788776655" 
                      value={donorForm.phone}
                      onChange={(e) => setDonorForm({...donorForm, phone: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full mt-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold font-mono text-xs rounded-xl cursor-pointer transition">
                Register Donor
              </button>
            </form>

          </div>
        )}
      </section>

      {/* 1. CLINICAL RESOURCES COUNTERS GRID */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
        <div>
          <h3 className="text-sm font-display font-bold text-slate-800 flex items-center gap-1.5 uppercase font-mono tracking-tight">
            <Building2 className="text-orange-600 w-4.5 h-4.5" />
            Live Hospital Ward Grid Reserves
          </h3>
          <p className="text-xs text-slate-500">Increase or decrease ICU / Oxygen reserves manually to balance loads</p>
        </div>

        {/* BANKER'S DEMO MODE CONTROL PANEL */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider block mb-1 uppercase font-extrabold text-orange-605">
                Banker’s Algorithm Presentation Demo Panel
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-600 font-semibold">Current Mode:</span>
                <span id="bankers-mode-badge" className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-black uppercase tracking-wider border ${
                  bankersDemoMode === "safe" 
                    ? "bg-green-50 text-green-700 border-green-200" 
                    : bankersDemoMode === "deadlock" 
                      ? "bg-red-50 text-red-650 border-red-200 animate-pulse" 
                      : "bg-orange-50 text-orange-700 border-orange-200"
                }`}>
                  {bankersDemoMode === "safe" && "Safe Demo"}
                  {bankersDemoMode === "deadlock" && "Deadlock Demo"}
                  {bankersDemoMode === "manual" && "Manual Mode"}
                </span>
              </div>
            </div>

            {/* Mode selection buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                id="btn-demo-safe"
                type="button"
                onClick={() => onSetBankersDemoMode("safe")}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition shadow-2xs ${
                  bankersDemoMode === "safe"
                    ? "bg-orange-600 text-white hover:bg-orange-700 border border-orange-605"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Safe State Preset
              </button>

              <button
                id="btn-demo-deadlock"
                type="button"
                onClick={() => onSetBankersDemoMode("deadlock")}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition shadow-2xs ${
                  bankersDemoMode === "deadlock"
                    ? "bg-orange-600 text-white hover:bg-orange-700 border border-orange-605"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Deadlock Risk Preset
              </button>

              <button
                id="btn-demo-manual"
                type="button"
                onClick={() => onSetBankersDemoMode("manual")}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition shadow-2xs ${
                  bankersDemoMode === "manual"
                    ? "bg-orange-600 text-white hover:bg-orange-700 border border-orange-605"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Manual Mode
              </button>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="text-xs text-slate-600 font-sans border-t border-slate-150 pt-3">
            {bankersDemoMode === "safe" && (
              <p>
                <strong>Safe Demo:</strong> Sets low-to-medium resource needs across all hospitals. Central reserves easily cover potential allocations; safe sequence guaranteed.
              </p>
            )}
            {bankersDemoMode === "deadlock" && (
              <p className="text-red-700 font-medium">
                <strong>Deadlock Demo:</strong> Drains central available resources to critical minimums whilst hospitals declare elevated pending resource claims. Safe state check fails; warning alert is activated.
              </p>
            )}
            {bankersDemoMode === "manual" && (
              <p>
                <strong>Manual Mode:</strong> Fine-tune resources using controls below. Safety outcomes adapt in real-time.
              </p>
            )}
          </div>
        </div>

        {hospitals.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 bg-slate-50 rounded-2xl p-6 space-y-4">
            <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Clinical Hospitals Commissioned Yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              The Firestore database has no active medical centers. Click the button below or "Seed Bangladesh Emergency Network" in the Core Infrastructure Provisioner panel above to instantly seed all core hospitals, ambulances, and emergency resources.
            </p>
            <button
              type="button"
              onClick={handleProvisionDefaultsClick}
              disabled={isSeeding}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-mono font-bold rounded-xl transition shadow-lg text-center cursor-pointer ${
                isSeeding
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-orange-600/10"
              }`}
            >
              {isSeeding ? "⚡ Seeding Dhaka Network..." : "🚀 Instantly Seed Dhaka Emergency Network"}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-150 rounded-2xl">
            <table className="w-full text-left font-mono text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Hospital Center</th>
                  <th className="py-2.5 px-3 text-center">ICU Beds [Occ/Total]</th>
                  <th className="py-2.5 px-3 text-center">Oxygen Cylinders</th>
                  <th className="py-2.5 px-3 text-center">Ventilators</th>
                  <th className="py-2.5 px-3 text-center">Op Theaters</th>
                  <th className="py-2.5 px-3 text-center">Doctors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {hospitals.map((hosp) => (
                  <tr key={hosp.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-semibold text-slate-800 truncate max-w-[140px]" title={hosp.name}>
                      {hosp.name}
                    </td>
                    
                    {/* ICU Beds Adjust */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => onChangeResource(hosp.id, "icu", false)} className="px-1.5 bg-slate-100 hover:bg-slate-200 text-orange-600 rounded font-black cursor-pointer">-</button>
                        <span>{hosp.icuBeds?.occupied || 0} / {hosp.icuBeds?.total || 20}</span>
                        <button onClick={() => onChangeResource(hosp.id, "icu", true)} className="px-1.5 bg-slate-100 hover:bg-slate-200 text-orange-600 rounded font-black cursor-pointer">+</button>
                      </div>
                    </td>

                    {/* Oxygen adjusts */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => onChangeResource(hosp.id, "oxygen", false)} className="px-1.5 bg-slate-100 hover:bg-slate-200 text-orange-600 rounded font-black cursor-pointer">-</button>
                        <span>{hosp.oxygenCylinders?.occupied || 0} / {hosp.oxygenCylinders?.total || 50}</span>
                        <button onClick={() => onChangeResource(hosp.id, "oxygen", true)} className="px-1.5 bg-slate-100 hover:bg-slate-200 text-orange-600 rounded font-black cursor-pointer">+</button>
                      </div>
                    </td>

                    {/* Ventilators adjusts */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => onChangeResource(hosp.id, "ventilator", false)} className="px-1.5 bg-slate-100 hover:bg-slate-200 text-orange-600 rounded font-black cursor-pointer">-</button>
                        <span>{hosp.ventilators?.occupied || 0} / {hosp.ventilators?.total || 15}</span>
                        <button onClick={() => onChangeResource(hosp.id, "ventilator", true)} className="px-1.5 bg-slate-100 hover:bg-slate-200 text-orange-600 rounded font-black cursor-pointer">+</button>
                      </div>
                    </td>

                    {/* Operation Theaters */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => onChangeResource(hosp.id, "ot", false)} className="px-1.5 bg-slate-100 hover:bg-slate-200 text-orange-600 rounded font-black cursor-pointer">-</button>
                        <span>{hosp.operationTheaters?.occupied || 0} / {hosp.operationTheaters?.total || 4}</span>
                        <button onClick={() => onChangeResource(hosp.id, "ot", true)} className="px-1.5 bg-slate-100 hover:bg-slate-200 text-orange-600 rounded font-black cursor-pointer">+</button>
                      </div>
                    </td>

                    {/* Doctors */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => onChangeResource(hosp.id, "doctor", false)} className="px-1.5 bg-slate-100 hover:bg-slate-200 text-orange-600 rounded font-black cursor-pointer">-</button>
                        <span className="text-orange-600 font-bold">{hosp.doctors?.active || 30} / {hosp.doctors?.total || 40} ON DUTY</span>
                        <button onClick={() => onChangeResource(hosp.id, "doctor", true)} className="px-1.5 bg-slate-100 hover:bg-slate-200 text-orange-600 rounded font-black cursor-pointer">+</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2. PENDING REQUESTS DISPATCH PORT (INCIDENT ASSIGNER) */}
      <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 text-slate-800">
        <div>
          <h3 className="text-sm font-display font-bold text-slate-800 flex items-center gap-1.5 uppercase font-mono tracking-tight">
            <Truck className="text-orange-600 w-4.5 h-4.5" />
            Unassigned Emergency Incidents Queue ({pendingQueue.length})
          </h3>
          <p className="text-xs text-slate-500">Match incoming casualty calls with available fleets and hospital reserves</p>
        </div>

        {/* Next Recommended Dispatch Alert Block */}
        {recommendedPatient && (
          <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-2 border-orange-500 rounded-2xl p-5 mb-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="bg-orange-600 text-white font-mono font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                  NEXT RECOMMENDED DISPATCH
                </span>
                <span className="font-mono text-[9px] text-orange-600 font-extrabold uppercase">
                  OS ROUTED & SCHEDULE-RECOMMENDED
                </span>
              </div>
              <h4 className="text-sm font-display font-black text-slate-900 leading-tight flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-orange-500" />
                {recommendedPatient.patientName}
              </h4>
              <p className="text-[11px] font-mono text-slate-600">
                Location: <span className="font-bold text-slate-800 uppercase">{recommendedPatient.location || "N/A"}</span> | Severity: <span className="text-red-650 font-extrabold uppercase">{recommendedPatient.severity || "N/A"}</span> | Condition: <span className="font-bold text-slate-800">{recommendedPatient.emergencyType || "N/A"}</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 text-xs font-mono">
              {/* Select Ambulance */}
              <div className="flex flex-col gap-1 min-w-[190px]">
                <label className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">SELECT AMBULANCE POOL</label>
                <select
                  value={targetAmbulance[recommendedPatient.id] || ""}
                  onChange={(e) => setTargetAmbulance(prev => ({ ...prev, [recommendedPatient.id]: e.target.value }))}
                  className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-[11px] focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-slate-800 font-bold"
                >
                  <option value="">-- Choose Fleetwood --</option>
                  {ambulances.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.driverName} ({a.vehicleNumber || a.plate || "No Plate"}) - {a.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recommend Hospital */}
              <div className="flex flex-col gap-1 min-w-[190px]">
                <label className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">RECOMMEND HOSPITAL POOL</label>
                <select
                  value={targetHospital[recommendedPatient.id] || ""}
                  onChange={(e) => setTargetHospital(prev => ({ ...prev, [recommendedPatient.id]: e.target.value }))}
                  className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-[11px] focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-slate-800 font-bold"
                >
                  <option value="">-- Select Hospital --</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.hospitalName || h.name} (ICU: {h.totalICU || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={!targetAmbulance[recommendedPatient.id] || !targetHospital[recommendedPatient.id]}
                onClick={async () => {
                  try {
                    await onAssignDispatch(recommendedPatient.id, targetAmbulance[recommendedPatient.id], targetHospital[recommendedPatient.id]);
                  } catch (e) {
                    console.error("Recommended dispatch assignment failed:", e);
                  }
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-slate-100 disabled:to-slate-250 text-white disabled:text-slate-400 font-mono font-black text-[10px] rounded-xl shadow-md cursor-pointer transition-all uppercase tracking-wider flex items-center justify-center gap-1 min-w-[150px] disabled:cursor-not-allowed"
              >
                <Truck className="w-3.5 h-3.5" />
                Dispatch Recommended Patient
              </button>
            </div>
          </div>
        )}

        {pendingQueue.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <p className="text-xs font-mono text-slate-400">All active ambulance requests have been dispatched safely.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingQueue.map((req) => (
              <div key={req.id} className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 text-xs font-mono">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-sans font-black text-sm text-slate-800 dark:text-slate-100">{req.patientName || "Casuality Case"}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider ${
                      String(req.priority || req.severity).toLowerCase() === "critical"
                        ? "bg-red-105 text-red-700 border-red-200 animate-pulse"
                        : String(req.priority || req.severity).toLowerCase() === "high"
                          ? "bg-orange-105 text-orange-700 border-orange-200"
                          : "bg-blue-105 text-blue-700 border-blue-200"
                    }`}>
                      {req.priority || req.severity || "MEDIUM"}
                    </span>
                    <span className="bg-slate-205 text-slate-750 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-750 text-[9px] font-bold px-2 py-0.5 rounded-md font-mono shrink-0">
                      Category: {req.emergencyCategory || req.emergencyType || "General Emergency"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-850 pt-2 font-mono">
                    <div>
                      <span className="text-slate-400 block tracking-widest text-[8px] uppercase font-black">Symptoms / Conditions</span>
                      <p className="text-slate-800 dark:text-slate-150 font-sans mt-0.5 leading-relaxed bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-2">
                        {req.symptoms || "Urgent rescue requested."}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div>
                        <span className="text-slate-400 block tracking-widest text-[8px] uppercase font-black">Location Address</span>
                        <span className="text-slate-800 dark:text-slate-150 font-bold">
                          {req.exactAddress || "N/A"}, {req.area || "N/A"}, {req.district || "N/A"}, {req.division || "N/A"}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block tracking-widest text-[8px] uppercase font-black">Required Resources</span>
                        <span className="inline-flex gap-1.5 flex-wrap mt-0.5">
                          {req.requiredResources && req.requiredResources.length > 0 ? (
                            req.requiredResources.map((res, i) => (
                              <span key={i} className="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-150 dark:border-red-900/40 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                                ✙ {res}
                              </span>
                            ))
                          ) : (
                            Object.entries(req.requestedResources || {}).filter(([_, val]) => val).map(([key, _]) => (
                              <span key={key} className="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-150 dark:border-red-900/40 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                                ✙ {key.toUpperCase()}
                              </span>
                            ))
                          )}
                          {(!req.requiredResources || req.requiredResources.length === 0) && (!req.requestedResources || Object.values(req.requestedResources).every(v => !v)) && (
                            <span className="text-slate-400 text-[9px] italic">No active complex devices mapped</span>
                          )}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block tracking-widest text-[8px] uppercase font-black">Reported Time</span>
                        <span className="text-indigo-650 dark:text-indigo-400 font-bold">
                          🕒 {req.createdAt ? (req.createdAt.toDate ? req.createdAt.toDate().toLocaleString() : new Date(req.createdAt).toLocaleString()) : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto min-w-0 mt-3 lg:mt-0">
                  <select
                    value={targetAmbulance[req.id] || ""}
                    onChange={(e) => setTargetAmbulance(prev => ({ ...prev, [req.id]: e.target.value }))}
                    className="w-full lg:w-auto bg-white border text-xs border-slate-200 text-slate-705 rounded-xl px-2.5 py-2 sm:py-1.5 focus:border-orange-500 focus:outline-none max-w-full sm:max-w-[240px] truncate"
                  >
                    <option value="">Select Ambulance</option>
                    {[...activeAmbulances].sort((a, b) => {
                      const scoreA = (a.area === req.area ? 2 : 0) + (a.district === req.district ? 1 : 0);
                      const scoreB = (b.area === req.area ? 2 : 0) + (b.district === req.district ? 1 : 0);
                      return scoreB - scoreA;
                    }).map(a => {
                       if (isMobile) {
                         let pref = "";
                         if (a.area === req.area) pref = "✦ Near";
                         else if (a.district === req.district) pref = "★ Dist";
                         else {
                           const rawZone = a.area || a.district || "Zone";
                           pref = `(${rawZone.length > 8 ? rawZone.substring(0, 6) + ".." : rawZone})`;
                         }

                         // Limit driver name length
                         const drName = a.driverName || "Driver";
                         const shortName = drName.split(" ").slice(0, 2).join(" ");
                         const displayName = shortName.length > 12 ? shortName.substring(0, 10) + ".." : shortName;

                         // Simplify vehicle registration for BD plates
                         let vehNo = a.vehicleNumber || "";
                         vehNo = vehNo.replace(/Dhaka\s*/gi, "D.").replace(/Metro\s*/gi, "M.");
                         if (vehNo.length > 20) {
                           vehNo = vehNo.substring(vehNo.length - 12);
                         }

                         return (
                           <option key={`disp-v-${a.id}`} value={a.id}>
                             {pref} - {displayName} [{vehNo}]
                           </option>
                         );
                       } else {
                         let pref = "";
                         if (a.area === req.area) pref = "✦ Near Team";
                         else if (a.district === req.district) pref = "★ In District";
                         else pref = `(${a.area || a.district || 'Out of zone'})`;

                         return (
                           <option key={`disp-v-${a.id}`} value={a.id}>
                             {pref} - {a.driverName} ({a.vehicleNumber})
                           </option>
                         );
                       }
                    })}
                  </select>

                  <select
                    value={targetHospital[req.id] || ""}
                    onChange={(e) => setTargetHospital(prev => ({ ...prev, [req.id]: e.target.value }))}
                    className="w-full lg:w-auto bg-white border text-xs border-slate-200 text-slate-705 rounded-xl px-2.5 py-2 sm:py-1.5 focus:border-orange-500 focus:outline-none max-w-full sm:max-w-[240px] truncate"
                  >
                    <option value="">Recommend Hospital</option>
                    {[...hospitals].sort((a, b) => {
                      const isASame = a.district === req.district;
                      const isBSame = b.district === req.district;
                      if (isASame && !isBSame) return -1;
                      if (!isASame && isBSame) return 1;
                      return 0;
                    }).map(h => {
                       const occupancy = h.icuBeds?.total ? ((h.icuBeds.occupied / h.icuBeds.total) * 100) : 40;
                       if (isMobile) {
                         const suffix = h.district === req.district ? "★ Same Dist" : `(${h.district || 'Alt'})`;
                         
                         // Shorten common Bangladesh hospital suffixes to keep descriptions compact
                         const hName = (h.hospitalName || h.name || "Hospital")
                           .replace(/Medical College Hospital/gi, "MCH")
                           .replace(/General Hospital/gi, "Gen Hosp")
                           .replace(/Specialized Hospital/gi, "Spec Hosp")
                           .replace(/Hospital/gi, "Hosp");

                         const shortHName = hName.length > 20 ? hName.substring(0, 18) + ".." : hName;

                         return (
                           <option key={`disp-h-${h.id}`} value={h.id}>
                             {suffix} - {shortHName} ({occupancy.toFixed(0)}% ICU)
                           </option>
                         );
                       } else {
                         const suffix = h.district === req.district ? "★ Same District" : `(${h.district || 'Alternative Zone'})`;
                         return (
                           <option key={`disp-h-${h.id}`} value={h.id}>
                             {suffix} - {h.hospitalName || h.name} ({occupancy.toFixed(0)}% ICU Occ)
                           </option>
                         );
                       }
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleAssignClick(req.id)}
                    disabled={!targetAmbulance[req.id] || !targetHospital[req.id]}
                    className="w-full lg:w-auto text-center px-4 py-2 sm:py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-mono font-bold text-[10px] rounded-xl transition disabled:opacity-40 shadow-xs cursor-pointer tracking-wider shrink-0"
                  >
                    {dispatchFeedback[req.id] || "Dispatch Rescue"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* COMPREHENSIVE INCIDENT CONTROL PANEL */}
      <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 text-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-display font-black text-slate-800 flex items-center gap-1.5 uppercase font-mono tracking-tight">
              <span className="inline-block w-2.5 h-2.5 bg-orange-600 rounded-full animate-ping" />
              Comprehensive Incident Monitor & Lifecycle Controller ({requests.length})
            </h3>
            <p className="text-xs text-slate-500">
              Trace real-time patient states, audit allocations, and release locked resources dynamically
            </p>
          </div>
          
          {/* Filters and search layout */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="admin-search-name"
              type="text"
              placeholder="🔍 Search name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 text-slate-800 focus:outline-none w-36"
            />
            
            <select
              id="admin-filter-type"
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 text-slate-800 focus:outline-none max-w-[130px]"
            >
              <option value="all">⚡ All Types</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              id="admin-filter-priority"
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 text-slate-800 focus:outline-none"
            >
              <option value="all">🔥 All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              id="admin-filter-area"
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 text-slate-800 focus:outline-none max-w-[125px]"
            >
              <option value="all">📍 All Locations</option>
              {uniqueAreas.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          {["all", "pending", "ambulance_assigned", "active_triage", "admitted", "completed"].map((stat) => (
            <button
              key={stat}
              type="button"
              onClick={() => setSelectedFilter(stat)}
              className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition select-none ${
                selectedFilter === stat
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-50 text-slate-550 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {stat === "all" ? "📋 All Cases" 
                : stat === "pending" ? "⏳ Pending / Unsafe"
                : stat === "ambulance_assigned" ? "🚒 Dispatched"
                : stat === "active_triage" ? "🛣️ En Route"
                : stat === "admitted" ? "🏨 Admitted"
                : "✅ Completed"}
            </button>
          ))}
        </div>

        {/* Incidents List Grid */}
        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50 font-mono text-xs text-slate-400">
              No matching incidents found under the "{selectedFilter}" category.
            </div>
          ) : (
            filteredRequests.map((req) => {
              const isUnsafe = req.deadlockRisk || req.bankerStatus === "unsafe" || req.status === "waiting_resource";
              
              return (
                <div 
                  key={`lifecycle-req-${req.id}`}
                  className={`p-4 bg-white rounded-2xl border-2 transition shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono ${
                    isUnsafe 
                      ? "border-red-600 bg-red-500/[0.02]" 
                      : req.status === "admitted"
                        ? "border-emerald-305 bg-emerald-500/[0.01]"
                        : req.status === "completed" || req.status === "completed"
                          ? "border-slate-200 opacity-80"
                          : "border-slate-200"
                  }`}
                >
                  {/* Left patient metadata details */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-sans font-black text-[13px] text-slate-800">{req.patientName || "Anonymous Case"}</span>
                      
                      <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase border font-mono tracking-widest ${
                        isUnsafe
                          ? "bg-red-600 text-white border-red-700 animate-pulse"
                          : req.status === "completed" || req.status === "completed"
                            ? "bg-slate-100 text-slate-500 border-slate-200"
                            : req.status === "admitted"
                              ? "bg-emerald-500 text-white border-emerald-600"
                              : "bg-orange-500 text-white border-orange-600"
                      }`}>
                        {isUnsafe ? "⚠️ DEADLOCK BLOCKED" : req.status?.toUpperCase()?.replace("_", " ")}
                      </span>

                      {req.assignedAmbulancePlate && (
                        <span className="bg-slate-100 border border-slate-250 text-slate-650 text-[9px] px-2 py-0.5 rounded font-mono">
                          Ambulance: {req.assignedAmbulancePlate}
                        </span>
                      )}

                      {req.assignedHospitalName && (
                        <span className="bg-slate-100 border border-slate-250 text-slate-650 text-[9px] px-2 py-0.5 rounded font-mono truncate max-w-[170px]" title={req.assignedHospitalName}>
                          Recommended: {req.assignedHospitalName}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[9.5px] text-slate-550 border-t border-slate-150/40 pt-2">
                      <div>
                        <span className="text-slate-400 block tracking-widest text-[8px] uppercase font-black">Emergency Category</span>
                        <span className="font-bold text-slate-705 text-[10px]">{req.emergencyCategory || req.emergencyType || "General"}</span>
                      </div>
                      
                      <div>
                        <span className="text-slate-400 block tracking-widest text-[8px] uppercase font-black">Region Node</span>
                        <span className="font-bold text-slate-705 text-[10px]">{req.area || "Dhaka"}, {req.district || "Dhaka"}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block tracking-widest text-[8px] uppercase font-black">Requested Demands</span>
                        <span className="inline-flex gap-1 flex-wrap mt-[1px]">
                          {(req.needICU || req.requestedResources?.icu) && (
                            <span className="bg-red-50 text-red-600 border border-red-150 px-1 rounded text-[7.5px] font-bold">ICU</span>
                          )}
                          {(req.needOxygen || req.requestedResources?.oxygen) && (
                            <span className="bg-orange-50 text-orange-600 border border-orange-150 px-1 rounded text-[7.5px] font-bold">OXY</span>
                          )}
                          {(req.needVentilator || req.requestedResources?.ventilator) && (
                            <span className="bg-sky-50 text-sky-600 border border-sky-150 px-1 rounded text-[7.5px] font-bold">VENT</span>
                          )}
                          {(!req.needICU && !req.requestedResources?.icu && !req.needOxygen && !req.requestedResources?.oxygen && !req.needVentilator && !req.requestedResources?.ventilator) && (
                            <span className="text-slate-450 italic">None</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {isUnsafe && (
                      <div className="bg-red-500/10 text-red-650 p-2 rounded-xl text-[10px] font-bold border border-red-205 flex items-center gap-1 animate-pulse mt-2">
                        Deadlock risk detected! Cannot assign patient at this moment.
                      </div>
                    )}
                  </div>

                  {/* Right actions dropdown control */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:self-center">
                    <div className="flex flex-col gap-0.5 min-w-[130px]">
                      <span className="text-[7.5px] font-bold text-slate-400 font-mono tracking-wider uppercase">TRANSITION STATE</span>
                      <select
                        value={req.status}
                        onChange={async (e) => {
                          const nStatus = e.target.value;
                          if (!nStatus) return;
                          if (onRequestUpdate) {
                            await onRequestUpdate(req.id, nStatus);
                          }
                        }}
                        className="bg-white border text-[11px] border-slate-200 text-slate-705 rounded-xl px-2 py-1.5 font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                      >
                        <option value="">-- Actions --</option>
                        <option value="pending">⏳ Set Pending</option>
                        <option value="ambulance_assigned">🚒 Mark Dispatched</option>
                        <option value="on_route">🛣️ Mark On Route</option>
                        <option value="picked_up">♿ Mark Picked Up</option>
                        <option value="admitted">🏨 Admit to Hospital</option>
                        <option value="completed">✅ Complete Trip (Frees Reserves)</option>
                        <option value="cancelled">❌ Cancel Case (Frees Reserves)</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 3. DYNAMIC SCHEDULERS GATES */}
      <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xs space-y-5 text-slate-800">
        <div>
          <h3 className="text-sm font-display font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
            <Cpu className="w-4.5 h-4.5 text-orange-600" />
            Ambulance Queue Schedulers Gate
          </h3>
          <p className="text-xs text-slate-500">Configure OS processor and ready-queue parameters to optimize triage turnaround</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 p-4 sm:p-5 border border-slate-200 rounded-2xl">
          <div className="flex flex-col gap-1.5 text-xs font-mono min-w-0 w-full">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ALGORITHM MODEL</span>
            <select
              value={selectedAlgo}
              onChange={(e) => setSelectedAlgo(e.target.value)}
              className="w-full max-w-full min-w-0 bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500 focus:outline-none truncate"
            >
              <option value="FCFS">
                {isMobile ? "FCFS (First-Come)" : "FCFS (First-Come, First-Served Sched)"}
              </option>
              <option value="SJF">
                {isMobile ? "SJF (Shortest Job)" : "SJF (Non-preemptive Shortest Job First)"}
              </option>
              <option value="SRTF">
                {isMobile ? "SRTF (Preemptive SRTF)" : "SRTF (Preemptive Shortest Remaining Time First)"}
              </option>
              <option value="Priority">
                {isMobile ? "Priority (Severity)" : "Priority (Severity-based Priority Preemption)"}
              </option>
              <option value="RoundRobin">
                {isMobile ? "Round Robin (Time Q.)" : "Round Robin (Time-Slice Circular Sched Model)"}
              </option>
            </select>
          </div>

          {selectedAlgo === "RoundRobin" && (
            <div className="flex flex-col gap-1.5 text-xs font-mono min-w-0 w-full">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TIME QUANTUM (Ticks limit)</span>
              <input
                type="number"
                min="1"
                value={timeQuantum}
                onChange={(e) => setTimeQuantum(Number(e.target.value))}
                className="w-full max-w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:orange-500 text-slate-800"
              />
            </div>
          )}

          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={handleRunSchedClick}
              disabled={isScheduling}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 font-bold text-white text-xs font-mono rounded-xl transition disabled:opacity-40 select-none w-full cursor-pointer shadow-xs"
            >
              {isScheduling ? "Re-computing..." : "Execute Queue Scheduler"}
            </button>
          </div>

          {schedFeedback && (
            <span className="text-[10px] text-emerald-600 font-bold font-mono block md:col-span-3 text-center">{schedFeedback}</span>
          )}
        </div>

        {/* GANNT SCHEDULER BOARD IMPLEMENTATION */}
        <LiveQueueGantt 
          algorithmName={selectedAlgo}
          timeline={schedulerTimeline}
          results={schedulerResults}
          onAgeToggle={onAgeToggle}
          isLoading={isScheduling}
        />
      </section>

      {/* 4. BANKERS MATRIX VISUALIZER */}
      <BankersVisualizer 
        matrix={bankerMatrix}
        isSafe={isBankersSafe}
        safeSequence={safeSequence}
        warningAlert={warningAlert}
        onClaimVerify={onClaimVerify}
        hospitals={hospitals}
      />

      {/* Custom Reset Modal */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 space-y-4 text-left">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800 font-mono uppercase tracking-wide">
                  Confirm Database Reset
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to reset the database? This will persistently clear all <strong>emergencyRequests</strong>, <strong>schedulingResults</strong>, <strong>notifications</strong>, and <strong>gpsLogs</strong>.
                </p>
              </div>
            </div>

            {/* Checklist interface logic */}
            <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={resetModal.deleteStatic}
                  onChange={(e) => setResetModal(prev => ({ ...prev, deleteStatic: e.target.checked }))}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-500/30 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">Delete lookup entities as well?</span>
                  <span className="text-slate-500 block mt-0.5 text-[11px]">
                    If checked, this will also wipe static entities: <strong>Hospitals</strong>, <strong>Ambulances</strong>, <strong>Medicines</strong>, and <strong>Blood Donors</strong>.
                  </span>
                </div>
              </label>
            </div>

            {resetModal.feedback && (
              <p className="text-xs font-mono font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100 text-center animate-pulse">
                {resetModal.feedback}
              </p>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={resetModal.isProcessing}
                onClick={() => setResetModal({ isOpen: false, deleteStatic: false, isProcessing: false, feedback: "" })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-mono font-bold rounded-xl transition cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetModal.isProcessing}
                onClick={handleResetConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              >
                {resetModal.isProcessing ? "Processing Reset..." : "Yes, Execute Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
