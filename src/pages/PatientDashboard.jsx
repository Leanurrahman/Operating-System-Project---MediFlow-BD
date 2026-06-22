import { useState, useEffect } from "react";
import { 
  AlertOctagon, 
  Search, 
  Mic, 
  MicOff, 
  Truck, 
  ShoppingBag,
  Droplets,
  Trash2,
  History,
  X,
  Filter
} from "lucide-react";
import { EmergencyType, RequestStatus } from "../types";
import { BANGLADESH_LOCATIONS } from "../utils/locationData";
import BDLocationSelector from "../components/BDLocationSelector";
import { motion, AnimatePresence } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { addDoc, collection, serverTimestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { formatFirestoreTimestamp } from "../utils/format";

export default function PatientDashboard({ requests = [], onSOSSubmit, medicines, onOrderSubmit, bloodDonors, onRegisterDonor }) {
  const { currentUser } = useAuth();
  
  // Intelligent State for advanced emergency requests stream features
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [showAllLogsModal, setShowAllLogsModal] = useState(false);
  const [modalTab, setModalTab] = useState("active");
  const [modalSearch, setModalSearch] = useState("");

  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    type: "", // "single" or "bulk"
    targetId: null,
    message: "",
  });

  const isArchived = (status) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === "completed" || s === "admitted";
  };

  const deleteLog = (id) => {
    setDeleteConfirmation({
      isOpen: true,
      type: "single",
      targetId: id,
      message: "Are you sure you want to permanently delete this emergency request from Firestore?"
    });
  };

  const clearCompletedLogs = () => {
    const targetLogs = requests.filter(req => isArchived(req.status));
    if (targetLogs.length === 0) {
      showToast("No completed or admitted logs to clear.", "info");
      return;
    }
    setDeleteConfirmation({
      isOpen: true,
      type: "bulk",
      targetId: null,
      message: `Are you sure you want to permanently delete all ${targetLogs.length} finished logs from the database?`
    });
  };

  const executeDelete = async () => {
    const { type, targetId } = deleteConfirmation;
    setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
    
    if (type === "single") {
      try {
        await deleteDoc(doc(db, "emergencyRequests", targetId));
        showToast("✓ Log successfully deleted.", "info");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, "emergencyRequests/" + targetId);
      }
    } else if (type === "bulk") {
      const targetLogs = requests.filter(req => isArchived(req.status));
      try {
        let cleared = 0;
        for (const req of targetLogs) {
          await deleteDoc(doc(db, "emergencyRequests", req.id));
          cleared++;
        }
        showToast(`✓ Cleared ${cleared} logs from Firestore.`, "info");
      } catch (error) {
        console.error("Bulk delete failed:", error);
        showToast("An error occurred during clearing.", "error");
      }
    }
  };

  // Sort logically (newest first) - shows all emergencies for the public Real-time Logs Stream
  const sortedAllRequests = [...requests]
    .sort((a, b) => {
      const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
      const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
      return dateB - dateA;
    });

  const activeRequests = sortedAllRequests.filter(req => !isArchived(req.status));
  const archivedRequests = sortedAllRequests.filter(req => isArchived(req.status));

  const FILTER_STATUSES = ["All", "pending", "ambulance_assigned", "waiting_resource", "admitted", "completed"];

  const STATUS_LABELS = {
    "All": "All",
    "pending": "Pending",
    "ambulance_assigned": "Ambulance Assigned",
    "assigned": "Ambulance Assigned",
    "waiting_resource": "Waiting Resource",
    "admitted": "Admitted",
    "completed": "Completed"
  };

  const STATUS_LABELS_FULL = {
    "pending": "Pending",
    "ambulance_assigned": "Ambulance Assigned",
    "assigned": "Ambulance Assigned",
    "waiting_resource": "Waiting Resource",
    "admitted": "Admitted",
    "completed": "Completed",
    "closed": "Completed",
    "finish": "Completed",
    "on route": "On Route",
    "on_route": "On Route",
    "patient picked up": "Patient Picked Up",
    "patient_picked": "Patient Picked Up",
    "arrived at hospital": "Arrived at Hospital",
    "reached_hospital": "Arrived at Hospital",
    "reached_hosp": "Arrived at Hospital"
  };

  const getStatusLabel = (status) => {
    if (!status) return "Pending";
    const normalized = status.toLowerCase();
    return STATUS_LABELS_FULL[normalized] || status;
  };

  const filterLogByStatusValue = (req, filterVal) => {
    if (filterVal === "All") return true;
    const s = (req.status || "").toLowerCase();
    
    // Normalize alternate status representations to prevent filter gaps
    let normalized = s;
    if (s === "assigned") normalized = "ambulance_assigned";
    if (s === "closed" || s === "finish") normalized = "completed";
    
    // Debug logging to help identify missing status mappings
    const isMapped = ["pending", "ambulance_assigned", "waiting_resource", "admitted", "completed", "on route", "on_route", "patient picked up", "patient_picked", "arrived at hospital", "reached_hospital", "reached_hosp"].includes(normalized);
    if (!isMapped) {
      console.warn(`[DEBUG] Missing/Incomplete status matching for: "${s}" (ID: ${req.id})`);
    }

    return normalized === filterVal.toLowerCase();
  };

  const filteredActive = activeRequests.filter(r => filterLogByStatusValue(r, selectedStatusFilter));
  const filteredHistory = archivedRequests.filter(r => filterLogByStatusValue(r, selectedStatusFilter));

  const renderCompactCard = (req) => {
    const category = req.emergencyCategory || req.emergencyType || "General Emergency";
    const locationText = req.location || [req.exactAddress, req.area, req.district, req.division].filter(Boolean).join(", ");
    const severity = req.severity || "high";
    const isCritical = severity.toLowerCase() === "critical" || severity.toLowerCase() === "high";
    
    let formattedTime = "";
    if (req.createdAt) {
      const d = req.createdAt.toDate ? req.createdAt.toDate() : new Date(req.createdAt);
      if (!isNaN(d.getTime())) {
        formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }

    return (
      <div key={req.id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-1.5 transition duration-150 hover:border-orange-550 text-left">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block max-w-[124px]">
                {req.patientName || "Anonymous"}
              </span>
              <span className={`text-[8.5px] font-mono font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide leading-none ${
                isCritical ? "bg-red-50 text-red-700 border border-red-200" : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}>
                {severity.toUpperCase()}
              </span>
              {formattedTime && (
                <span className="text-[9px] text-slate-400 font-mono">
                  {formattedTime}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 mt-0.5 text-[9px] text-orange-600 font-mono font-bold flex-wrap">
              <span>{category}</span>
              {req.phone && (
                <span className="text-slate-400 font-normal">· {req.phone}</span>
              )}
            </div>
            
            <div className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1 font-sans">
              <span className="shrink-0">📍</span>
              <span className="truncate max-w-[180px]" title={locationText}>{locationText}</span>
            </div>

            {isArchived(req.status) && (
              <div className="mt-1 flex items-center gap-1 text-[8.5px] font-mono text-emerald-600 bg-emerald-55 px-1.5 py-0.5 rounded border border-emerald-100 flex-wrap">
                <span>✓ FINISHED:</span>
                <span>{formatFirestoreTimestamp(req.completedAt || req.updatedAt || req.createdAt)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[8.5px] font-mono font-extrabold px-1.5 py-0.5 rounded-md border uppercase whitespace-nowrap ${
              (() => {
                const s = (req.status || "").toLowerCase();
                if (s === "pending") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-450 dark:border-amber-900";
                if (s === "ambulance_assigned" || s === "assigned") return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900";
                if (s === "waiting_resource") return "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-400 dark:border-pink-900";
                if (s === "admitted") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900";
                if (s === "completed" || s === "closed" || s === "finish") return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800";
                if (s === "on route" || s === "on_route") return "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-850";
                if (s === "patient picked up" || s === "patient_picked") return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-850";
                if (s === "arrived at hospital" || s === "reached_hospital" || s === "reached_hosp") return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-850";
                return "bg-slate-50 text-slate-600 border-slate-200";
              })()
            }`}>
              {getStatusLabel(req.status)}
            </span>
            
            <button
              type="button"
              onClick={() => deleteLog(req.id)}
              className="p-1 hover:bg-neutral-50 text-slate-400 hover:text-red-650 rounded-lg transition cursor-pointer"
              title="Delete permanently"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [emType, setEmType] = useState(EmergencyType.GENERAL);
  const [symptoms, setSymptoms] = useState("");
  
  // Bangladesh Location States for SOS Submission Form
  const [selectedDivision, setSelectedDivision] = useState("Dhaka");
  const [selectedDistrict, setSelectedDistrict] = useState("Dhaka");
  const [selectedArea, setSelectedArea] = useState("Mirpur");
  const [exactAddress, setExactAddress] = useState("Mirpur 10 Crossroads");

  const [locKey, setLocKey] = useState("mirpur");
  const [locationName, setLocationName] = useState("Mirpur 10 Crossroads");
  const [icu, setIcu] = useState(false);
  const [oxygen, setOxygen] = useState(false);
  const [vent, setVent] = useState(false);

  // Advanced SOS Details modal states
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [sosModalSource, setSosModalSource] = useState("");
  const [modalCategory, setModalCategory] = useState("General Emergency");
  const [modalSymptoms, setModalSymptoms] = useState("");
  const [modalDivision, setModalDivision] = useState("Dhaka");
  const [modalDistrict, setModalDistrict] = useState("Dhaka");
  const [modalArea, setModalArea] = useState("Mirpur");
  const [modalExactAddress, setModalExactAddress] = useState("");
  const [modalPhone, setModalPhone] = useState("");
  const [modalPatientName, setModalPatientName] = useState("");
  const [modalIcuNeeded, setModalIcuNeeded] = useState(false);
  const [modalOxygenNeeded, setModalOxygenNeeded] = useState(false);
  const [modalVentilatorNeeded, setModalVentilatorNeeded] = useState(false);
  const [modalHeavyBleeding, setModalHeavyBleeding] = useState(false);
  const [modalUnconscious, setModalUnconscious] = useState(false);
  const [modalPriority, setModalPriority] = useState("Medium");

  // Dynamic automatic priority scoring
  useEffect(() => {
    const cat = (modalCategory || "General Emergency").toLowerCase();
    const sym = (modalSymptoms || "").toLowerCase();

    const isFireBurn = cat.includes("fire") || sym.includes("fire") || sym.includes("burn");
    const hasBreathingProblem = cat.includes("breathing") || sym.includes("breathing") || sym.includes("breath") || modalOxygenNeeded || modalVentilatorNeeded;
    const isStrokeOrHeartAttack = cat.includes("stroke") || cat.includes("heart attack") || cat.includes("paralysis");
    const isBikeAccident = cat.includes("bike");
    const hasBleedingOrUnconscious = modalHeavyBleeding || modalUnconscious || sym.includes("bleed") || sym.includes("unconscious") || sym.includes("uncon");
    const hasLowOxygenRule = cat.includes("low oxygen") || cat.includes("oxygen") || modalOxygenNeeded || sym.includes("low oxygen") || sym.includes("oxygen");
    const isGeneralEmergency = cat.includes("general emergency");

    let calculated = "Medium";

    if (isFireBurn && hasBreathingProblem) {
      calculated = "Critical";
    } else if (isStrokeOrHeartAttack) {
      calculated = "Critical";
    } else if (isBikeAccident && hasBleedingOrUnconscious) {
      calculated = "Critical";
    } else if (hasLowOxygenRule || cat.includes("breathing problem")) {
      calculated = "High";
    } else if (isGeneralEmergency) {
      calculated = "Medium";
    } else if (modalIcuNeeded || modalUnconscious || modalHeavyBleeding) {
      calculated = "Critical";
    } else if (modalOxygenNeeded || modalVentilatorNeeded) {
      calculated = "High";
    }

    setModalPriority(calculated);
  }, [
    modalCategory,
    modalSymptoms,
    modalIcuNeeded,
    modalOxygenNeeded,
    modalVentilatorNeeded,
    modalHeavyBleeding,
    modalUnconscious
  ]);

  const groupHistoryByDateAndCategory = (historyList) => {
    const groups = {};
    historyList.forEach((req) => {
      let dateStr = "Unknown Date";
      if (req.createdAt) {
        const d = req.createdAt.toDate ? req.createdAt.toDate() : new Date(req.createdAt);
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        }
      }
      const category = req.emergencyCategory || req.emergencyType || "General Emergency";
      if (!groups[dateStr]) {
        groups[dateStr] = {};
      }
      if (!groups[dateStr][category]) {
        groups[dateStr][category] = [];
      }
      groups[dateStr][category].push(req);
    });
    return groups;
  };

  const renderResourcesText = (req) => {
    if (!req.requiredResources) return "None";
    if (Array.isArray(req.requiredResources)) {
      return req.requiredResources.length > 0 ? req.requiredResources.join(", ") : "None";
    }
    if (typeof req.requiredResources === "object") {
      return Object.entries(req.requiredResources)
        .filter(([_, value]) => !!value)
        .map(([key]) => key.toUpperCase())
        .join(", ") || "None";
    }
    return String(req.requiredResources);
  };

  const renderGroupedHistory = (historyItems) => {
    if (!historyItems || historyItems.length === 0) {
      return (
        <div className="text-center py-6 text-slate-400 font-mono text-xs">
          No previous historical records found in archives.
        </div>
      );
    }
    const grouped = groupHistoryByDateAndCategory(historyItems);
    return (
      <div className="space-y-4">
        {Object.entries(grouped).map(([date, categories]) => (
          <div key={date} className="space-y-2">
            <h4 className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 pb-1 pt-1">
              ⌛ {date}
            </h4>
            {Object.entries(categories).map(([category, items]) => (
              <div key={category} className="pl-1 space-y-1.5">
                <span className="text-[9px] font-bold font-mono text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded border border-orange-200/50 uppercase tracking-wide">
                  🏷️ {category}
                </span>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {items.map((req) => {
                    const locationText = req.location || [req.exactAddress, req.area, req.district, req.division].filter(Boolean).join(", ");
                    const severity = req.severity || req.priority || "high";
                    const isCritical = severity.toLowerCase() === "critical" || severity.toLowerCase() === "high";
                    let formattedTime = "";
                    if (req.createdAt) {
                      const d = req.createdAt.toDate ? req.createdAt.toDate() : new Date(req.createdAt);
                      if (!isNaN(d.getTime())) {
                        formattedTime = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      }
                    }
                    return (
                      <div key={req.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-2xs text-left hover:border-orange-500 transition duration-150">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {req.patientName || "Anonymous"}
                              </span>
                              <span className={`text-[8.5px] font-mono font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide leading-none ${
                                isCritical ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200" : "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200"
                              }`}>
                                {severity.toUpperCase()}
                              </span>
                              {formattedTime && (
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {formattedTime}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-350 font-sans mt-1">
                              <strong>Symptoms:</strong> {req.symptoms}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              <strong>Urgency Details:</strong> {renderResourcesText(req)}
                            </p>
                            <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1 font-sans">
                              <span>📍</span>
                              <span className="truncate" title={locationText}>{locationText}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[8.5px] font-mono font-extrabold px-1.5 py-0.5 rounded border uppercase whitespace-nowrap ${
                              (() => {
                                const s = (req.status || "").toLowerCase();
                                if (s === "pending") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-450 dark:border-amber-900";
                                if (s === "admitted") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900";
                                if (s === "completed" || s === "closed" || s === "finish") return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800";
                                return "bg-slate-50 text-slate-600 border-slate-200";
                              })()
                            }`}>
                              {getStatusLabel(req.status)}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteLog(req.id)}
                              className="p-1 hover:bg-neutral-50 dark:hover:bg-slate-800 text-slate-400 hover:text-red-650 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Voice SOS recognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Pharmacy state
  const [pharmacySearch, setPharmacySearch] = useState("");
  const [cart, setCart] = useState({});
  const [shippingAddress, setShippingAddress] = useState("Mirpur 10, Block C");
  
  // Bangladesh Location States for Medicine Order
  const [medDivision, setMedDivision] = useState("Dhaka");
  const [medDistrict, setMedDistrict] = useState("Dhaka");
  const [medArea, setMedArea] = useState("Mirpur");

  const [orderFeedback, setOrderFeedback] = useState("");

  // Blood group state
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("");
  const [showRegForm, setShowRegForm] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regBlood, setRegBlood] = useState("O+");
  
  // Bangladesh Location States for Blood Donor Registration
  const [donorDivision, setDonorDivision] = useState("Dhaka");
  const [donorDistrict, setDonorDistrict] = useState("Dhaka");
  const [donorArea, setDonorArea] = useState("Mirpur");

  const [regLoc, setRegLoc] = useState("Mirpur 10");
  const [regFeedback, setRegFeedback] = useState("");

  const handleRegisterDonorSubmit = async (e) => {
    e.preventDefault();
    if (!regName || !regPhone) return;
    try {
      await onRegisterDonor({
        name: regName,
        phone: regPhone,
        bloodGroup: regBlood,
        division: donorDivision,
        district: donorDistrict,
        area: donorArea,
        location: `${donorArea}, ${donorDistrict}, ${donorDivision}`
      });
      setRegFeedback("✓ Registered successfully as a live blood donor!");
      setRegName("");
      setRegPhone("");
      setTimeout(() => {
        setRegFeedback("");
        setShowRegForm(false);
      }, 4000);
    } catch {
      setRegFeedback("Registration failed.");
    }
  };

  // Checking voice support
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      setVoiceSupported(true);
    }
  }, []);

  // Real-time symptoms severity detector
  let smartSeverity = "Low";
  const textToCheck = `${emType} ${symptoms}`.toLowerCase();
  if (
    textToCheck.includes("chest") || 
    textToCheck.includes("heart") || 
    textToCheck.includes("breathing") || 
    textToCheck.includes("unconscious") ||
    textToCheck.includes("stroke")
  ) {
    smartSeverity = "CRITICAL PRIORITY";
  } else if (
    textToCheck.includes("accident") || 
    textToCheck.includes("bleeding") || 
    textToCheck.includes("fracture") || 
    textToCheck.includes("fire") || 
    textToCheck.includes("burn") ||
    textToCheck.includes("labor") ||
    textToCheck.includes("pregnancy")
  ) {
    smartSeverity = "HIGH PRIORITY";
  } else if (symptoms.length > 5) {
    smartSeverity = "MEDIUM PRIORITY";
  }

  // Custom alerts queue inside the dashboard
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // SOS submit trigger
  const [sosStateText, setSosStateText] = useState("");
  const handleSubmitSOS = async (e) => {
    if (e) e.preventDefault();
    
    // 1. Validation of all required fields in the layout form before opening modal
    if (!patientName || !patientName.trim()) {
      showToast("Patient Name is required.", "error");
      return;
    }
    if (!phone || !phone.trim()) {
      showToast("Phone number is required.", "error");
      return;
    }
    if (!selectedDivision) {
      showToast("Division selection is required.", "error");
      return;
    }
    if (!selectedDistrict) {
      showToast("District selection is required.", "error");
      return;
    }
    if (!selectedArea) {
      showToast("Area selection is required.", "error");
      return;
    }
    if (!exactAddress || !exactAddress.trim()) {
      showToast("Exact Address / Landmark is required.", "error");
      return;
    }
    if (!symptoms || !symptoms.trim()) {
      showToast("Symptoms description is required.", "error");
      return;
    }

    // Check duplicate unfinished SOS
    const hasUnfinished = requests.some(r => r.patientId === (currentUser?.uid || "anonymous_patient") && !isArchived(r.status));
    if (hasUnfinished) {
      showToast("You already have an active emergency request. Please wait or cancel previous request.", "error");
      return;
    }

    setSosModalSource("form");
    
    // Map current form values to modal states
    let initialCat = emType === EmergencyType.STROKE ? "Stroke / Paralysis" 
      : emType === EmergencyType.HEART_ATTACK ? "Cardiac Crisis / Heart Attack"
      : emType === EmergencyType.ACCIDENT ? "Highway / Factory Accident"
      : emType === EmergencyType.FIRE_INJURY ? "Fire / Chemical Burns"
      : emType === EmergencyType.PREGNANCY ? "Pregnancy Labor Obstetric"
      : emType || "General Emergency";

    const ALLOWED_CATEGORIES = [
      "Bike Accident",
      "Road Accident",
      "Fire Burn",
      "Stroke / Paralysis",
      "Heart Attack",
      "Pregnancy Labor",
      "Breathing Problem / Low Oxygen",
      "Severe Bleeding",
      "Unconscious Patient",
      "General Emergency",
      "Other"
    ];

    if (!ALLOWED_CATEGORIES.includes(initialCat)) {
      if (initialCat.includes("Stroke")) initialCat = "Stroke / Paralysis";
      else if (initialCat.includes("Attack") || initialCat.includes("Cardiac")) initialCat = "Heart Attack";
      else if (initialCat.includes("Accident")) initialCat = "Road Accident";
      else if (initialCat.includes("Fire") || initialCat.includes("Burn")) initialCat = "Fire Burn";
      else if (initialCat.includes("Pregnancy")) initialCat = "Pregnancy Labor";
      else initialCat = "General Emergency";
    }

    setModalCategory(initialCat);
    setModalSymptoms(symptoms.trim());
    setModalDivision(selectedDivision);
    setModalDistrict(selectedDistrict);
    setModalArea(selectedArea);
    setModalExactAddress(exactAddress.trim());
    setModalPhone(phone.trim());
    setModalPatientName(patientName.trim());

    // Map checkboxes already selected in form
    setModalIcuNeeded(!!icu);
    setModalOxygenNeeded(!!oxygen);
    setModalVentilatorNeeded(!!vent);
    setModalHeavyBleeding(false);
    setModalUnconscious(false);

    setIsSOSModalOpen(true);
  };

  // Immediate One-Click SOS helper triggers details modal first
  const handleImmediateSOS = async () => {
    // Check for duplicate active SOS
    const hasUnfinished = requests.some(r => r.patientId === (currentUser?.uid || "anonymous_patient") && !isArchived(r.status));
    if (hasUnfinished) {
      showToast("You already have an active emergency request. Please wait or cancel previous request.", "error");
      return;
    }

    setSosModalSource("instant");
    setModalCategory("General Emergency");
    setModalSymptoms("URGENT ONE-CLICK SOS: Please dispatch close clinical ambulance team immediately!");
    
    // Set standard defaults or use current selection
    setModalDivision(selectedDivision || "Dhaka");
    setModalDistrict(selectedDistrict || "Dhaka");
    setModalArea(selectedArea || "Mirpur");
    setModalExactAddress(exactAddress || "Mirpur 10 Crossroads");
    setModalPhone(currentUser?.phone || "01712345678");
    setModalPatientName(currentUser?.name || "SOS Patient");

    // Defaults for instant SOS: pre-check oxygen/icu
    setModalIcuNeeded(true);
    setModalOxygenNeeded(true);
    setModalVentilatorNeeded(false);
    setModalHeavyBleeding(false);
    setModalUnconscious(false);

    setIsSOSModalOpen(true);
  };

  const handleConfirmSOSDispatch = async () => {
    if (!modalPhone || !modalPhone.trim()) {
      showToast("Phone number is required.", "error");
      return;
    }
    if (!modalSymptoms || !modalSymptoms.trim()) {
      showToast("Symptoms/details description is required.", "error");
      return;
    }
    if (!modalExactAddress || !modalExactAddress.trim()) {
      showToast("Exact Address is required.", "error");
      return;
    }
    if (!modalPatientName || !modalPatientName.trim()) {
      showToast("Patient Name is required.", "error");
      return;
    }

    setSosStateText("Dispatching Emergency Dispatch Vector...");

    // Create requiredResources array
    const requiredResourcesList = [];
    if (modalIcuNeeded) requiredResourcesList.push("ICU Needed");
    if (modalOxygenNeeded) requiredResourcesList.push("Oxygen Needed");
    if (modalVentilatorNeeded) requiredResourcesList.push("Ventilator Needed");
    if (modalHeavyBleeding) requiredResourcesList.push("Heavy Bleeding");
    if (modalUnconscious) requiredResourcesList.push("Unconscious");

    const customRequestId = "req_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const estTime = modalPriority === "Critical" ? 8 : (modalPriority === "High" ? 6 : 4);
    const pValue = modalPriority === "Critical" ? 1 : (modalPriority === "High" ? 2 : 3);
    const incomingArrival = requests.length + 1;

    const docData = {
      incidentId: customRequestId,
      requestId: customRequestId, // backward compatibility
      patientId: currentUser?.uid || "anonymous_patient",
      patientName: modalPatientName.trim(),
      patientPhone: modalPhone.trim(),
      phone: modalPhone.trim(), // backward compatibility
      emergencyCategory: modalCategory,
      emergencyType: modalCategory, // backward compatibility
      symptoms: modalSymptoms.trim(),
      division: modalDivision,
      district: modalDistrict,
      area: modalArea,
      exactAddress: modalExactAddress.trim(),
      location: `${modalExactAddress.trim()}, ${modalArea}, ${modalDistrict}, ${modalDivision}`, // backward compatibility
      priority: modalPriority,
      severity: modalPriority.toLowerCase(), // backward compatibility
      requiredResources: requiredResourcesList,
      requestedResources: { // backward compatibility
        icu: !!modalIcuNeeded,
        oxygen: !!modalOxygenNeeded,
        ventilator: !!modalVentilatorNeeded
      },
      status: "pending",
      createdAt: serverTimestamp(),
      arrivalTime: incomingArrival,
      estimatedServiceTime: estTime,
      burstTime: estTime,
      remainingTime: estTime,
      priorityValue: pValue,
      starvationCounter: 0,
      waitingTime: 0,
      turnaroundTime: 0,
      responseTime: 0
    };

    try {
      const result = await onSOSSubmit(docData);
      if (result && !result.success) {
        showToast(`🚨 ${result.error || "Submission failed."}`, "error");
        setSosStateText(result.error || "Submission failed.");
        return;
      }
      
      // Clear forms
      setSymptoms("");
      setExactAddress("");
      setIcu(false);
      setOxygen(false);
      setVent(false);
      setPatientName("");
      setPhone("");

      // Close Modal
      setIsSOSModalOpen(false);

      showToast("🚨 Emergency SOS incident dispatched successfully!", "success");
      setSosStateText("🚨 One-Click SOS sent! Dispatching closest available ambulance immediately!");
      setTimeout(() => setSosStateText(""), 5050);
    } catch (error) {
      showToast("Transmission failure. Failed to save request.", "error");
      setSosStateText("Transmission failure. Please try again.");
      console.error("Firebase Error: ", error);
    }
  };

  // Voice Speech dispatcher
  const startSpeechRecognition = () => {
    if (!voiceSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setSymptoms(speechToText);
      
      // Smart location/type matching e.g., "Accident at Dhanmondi"
      const lower = speechToText.toLowerCase();
      if (lower.includes("mirpur")) {
        setLocKey("mirpur");
        setLocationName("Mirpur 10 Crossroads");
      } else if (lower.includes("dhanmondi")) {
        setLocKey("dhanmondi");
        setLocationName("Dhanmondi 32");
      } else if (lower.includes("shahbagh")) {
        setLocKey("shahbagh");
        setLocationName("Shahbagh DMCH area");
      } else if (lower.includes("uttara")) {
        setLocKey("uttara");
        setLocationName("Uttara Sector 4");
      } else if (lower.includes("gulshan")) {
        setLocKey("gulshan");
        setLocationName("Gulshan Circle 2");
      }

      if (lower.includes("accident") || lower.includes("crash")) {
        setEmType(EmergencyType.ACCIDENT);
      } else if (lower.includes("heart") || lower.includes("chest")) {
        setEmType(EmergencyType.HEART_ATTACK);
      } else if (lower.includes("stroke") || lower.includes("paralyzed")) {
        setEmType(EmergencyType.STROKE);
      } else if (lower.includes("burn") || lower.includes("fire")) {
        setEmType(EmergencyType.FIRE_INJURY);
      } else if (lower.includes("pregnancy") || lower.includes("labor") || lower.includes("baby")) {
        setEmType(EmergencyType.PREGNANCY);
      }
    };

    recognition.start();
  };

  // Pharmacy handles
  const handleAddToCart = (med) => {
    setCart(prev => ({
      ...prev,
      [med.id]: (prev[med.id] || 0) + 1
    }));
  };

  const computeCartTotal = () => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const med = medicines.find(m => m.id === id);
      return sum + (med ? med.price * qty : 0);
    }, 0);
  };

  const handleCheckout = async () => {
    if (Object.keys(cart).length === 0) return;
    const items = Object.entries(cart).map(([id, qty]) => {
      const med = medicines.find(m => m.id === id);
      return {
        medicineId: id,
        name: med?.name || "Medicine",
        quantity: qty,
        price: med?.price || 0
      };
    });

    try {
      await onOrderSubmit({
        items,
        totalAmount: computeCartTotal(),
        deliveryAddress: shippingAddress,
        division: medDivision,
        district: medDistrict,
        area: medArea
      });
      setOrderFeedback("✓ Order placed! Pharmacist dispatches are priority scheduled.");
      setCart({});
      setTimeout(() => setOrderFeedback(""), 4000);
    } catch {
      setOrderFeedback("Order failed. Connection timeout.");
    }
  };

  const filteredMedicines = medicines.filter(
    m => m.name.toLowerCase().includes(pharmacySearch.toLowerCase()) || 
         m.category.toLowerCase().includes(pharmacySearch.toLowerCase())
  );

  const cleanPhoneForDialing = (phone) => {
    if (!phone) return "";
    // Remove all spaces and non-digit/non-plus characters to format for system dialer
    let clean = phone.replace(/[^0-9+]/g, "");
    
    // Format to standard Bangladesh dial code when possible (+880XXXXXXXXX)
    if (clean.startsWith("0")) {
      clean = "+880" + clean.slice(1);
    } else if (clean.startsWith("880") && !clean.startsWith("+")) {
      clean = "+" + clean;
    } else if (/^[1-9]/.test(clean) && clean.length === 10) {
      clean = "+880" + clean;
    }
    return clean;
  };

  const filteredDonors = bloodDonors.filter(
    d => !selectedBloodGroup || d.bloodGroup === selectedBloodGroup
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
      {/* Floating Alerts Stack */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className={`p-4 rounded-2xl shadow-xl pointer-events-auto border flex items-center gap-3 text-xs font-mono font-bold transition-all ${
                toast.type === "success" 
                  ? "bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/40" 
                  : "bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/40"
              }`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                toast.type === "success" ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-pulse"
              }`} />
              <div className="flex-1">{toast.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* LEFT: SOS TRIGGER & VOICE ASSIST DESK */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* BIG RED INSTANT SOS GAUGE */}
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-3xl p-6 text-center shadow-xs space-y-4">
          <div className="flex h-14 w-14 rounded-full bg-red-600/10 border border-red-400 dark:border-red-800 mx-auto items-center justify-center text-red-650 dark:text-red-400">
            <AlertOctagon className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-display font-extrabold text-red-900 dark:text-red-200 tracking-tight">EMERGENCY SOS PORTAL</h3>
            <p className="text-xs text-red-700/90 dark:text-red-300/80 font-medium">One-click immediate dispatch of an emergency ambulance in Dhaka</p>
          </div>
          <button
            onClick={handleImmediateSOS}
            className="w-full py-4 bg-red-600 hover:bg-red-700 font-bold font-mono text-xs uppercase tracking-wider rounded-xl text-white transition-all select-none shadow-md shadow-red-600/20 hover:-translate-y-0.5 cursor-pointer"
          >
            🚨 Trigger Instant Emergency Dispatch
          </button>
          {sosStateText && (
            <div className="text-xs text-red-700 dark:text-red-400 font-mono text-center pt-2 animate-pulse font-semibold">
              {sosStateText}
            </div>
          )}
        </div>

        {/* SOS REPORT FORM WITH SMART SEVERITY */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">Priority SOS Submission Form</h3>
            <p className="text-xs text-slate-550">Dynamic inputs match dispatcher algorithms instantly</p>
          </div>

          <form onSubmit={handleSubmitSOS} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">PATIENT NAME</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:border-orange-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">PHONE NUMBER</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-955/50 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:border-orange-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">EMERGENCY CATEGORY</label>
                <select
                  value={emType}
                  onChange={(e) => setEmType(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-orange-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
                >
                  <option value={EmergencyType.HEART_ATTACK}>Cardiac Crisis / Heart Attack</option>
                  <option value={EmergencyType.ACCIDENT}>Highway / Factory Accident</option>
                  <option value={EmergencyType.STROKE}>Stroke / Paralysis signs</option>
                  <option value={EmergencyType.FIRE_INJURY}>Fire / Chemical Burns</option>
                  <option value={EmergencyType.PREGNANCY}>Pregnancy Labor Obstetric</option>
                  <option value={EmergencyType.GENERAL}>General High Emergency</option>
                </select>
              </div>

              <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-805 rounded-2xl space-y-3">
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono font-black block uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1.5">🚨 EMERGENCY LOCATION (BANGLADESH NATIONWIDE)</span>
                <BDLocationSelector
                  division={selectedDivision}
                  district={selectedDistrict}
                  area={selectedArea}
                  setDivision={setSelectedDivision}
                  setDistrict={setSelectedDistrict}
                  setArea={setSelectedArea}
                  simpleLayout={true}
                />
                
                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">EXACT VILLAGE ADDRESS / STREET NO / HOUSE LANDMARK</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. House 14, Road 2, Block C, Uttara Sector 4"
                    value={exactAddress}
                    onChange={(e) => setExactAddress(e.target.value)}
                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-850 dark:text-slate-100 font-mono focus:outline-none focus:border-orange-600 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Symptoms textbox + Voice mic */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">DESCRIBE SYMPTOMS (OR REPORT BY SPEECH)</label>
                
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={startSpeechRecognition}
                    className={`p-1 px-3 rounded-full border text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
                      isListening 
                        ? "bg-red-50 text-red-600 border-red-200 animate-pulse" 
                        : "bg-slate-100 text-orange-605 border-slate-200 hover:bg-slate-250 hover:bg-slate-200 text-orange-600 cursor-pointer"
                    }`}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-orange-600" />}
                    {isListening ? "Listening..." : "Speech Request"}
                  </button>
                )}
              </div>

              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g. Sharp pain shooting down left arm, cold sweats..."
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-3 text-xs focus:outline-none focus:border-orange-600 focus:bg-white dark:focus:bg-slate-900 transition-all mt-1"
              />
            </div>

            {/* Smart Severity Prediction Banner */}
            <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-mono border transition-all duration-300 ${
              smartSeverity.includes("CRITICAL") 
                ? "bg-red-50 border-red-200 text-red-650 text-red-600 font-semibold dark:bg-red-950/40 dark:border-red-950 dark:text-red-400" 
                : smartSeverity.includes("HIGH") 
                  ? "bg-amber-50 border-amber-200 text-amber-700 font-semibold dark:bg-amber-950/40 dark:border-amber-950 dark:text-amber-400"
                  : smartSeverity.includes("MEDIUM")
                    ? "bg-yellow-50 border-yellow-200 text-yellow-600 dark:bg-yellow-950/40 dark:border-yellow-950 dark:text-yellow-400"
                    : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
            }`}>
              <div>
                <span className="font-extrabold block">🧠 Live Severity Analyzer:</span>
                <span className="block text-[10px] opacity-80 mt-0.5">
                  Assigned priority adapts queue weight factors for optimal OS performance indexes.
                </span>
              </div>
              <span className="font-mono text-xs uppercase font-extrabold px-2.5 py-1 rounded border">{smartSeverity}</span>
            </div>

            {/* Additional support parameters checkboxes */}
            <div className="grid grid-cols-3 gap-3 font-mono text-[10px]">
              <label className="flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={icu} onChange={(e) => setIcu(e.target.checked)} className="accent-orange-600 w-3.5 h-3.5" />
                <span className="font-bold">ICU REQUEST</span>
              </label>
              <label className="flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={oxygen} onChange={(e) => setOxygen(e.target.checked)} className="accent-orange-600 w-3.5 h-3.5" />
                <span className="font-bold">LOW OXYGEN</span>
              </label>
              <label className="flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-955 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={vent} onChange={(e) => setVent(e.target.checked)} className="accent-orange-600 w-3.5 h-3.5" />
                <span className="font-bold">VENTILATOR</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-mono font-bold text-xs rounded-xl transition shadow-md shadow-orange-600/10 cursor-pointer"
            >
              DISPATCH SMART QUEUE AMBULANCE REQUEST
            </button>
          </form>
        </div>

        {/* TRACK ACTIVE REPORTS / DISPATCH STATE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1 px-1.5 bg-orange-600/10 rounded-lg text-orange-600">
                <Truck className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-150 font-mono uppercase tracking-wider">
                  Active Emergency Logs Stream
                </h3>
                <p className="text-[10px] text-slate-400 font-sans">Showing latest 5 active feeds</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => {
                  setModalSearch("");
                  setModalTab("active");
                  setShowAllLogsModal(true);
                }}
                className="text-[10px] text-orange-600 hover:text-orange-700 hover:underline font-mono font-bold cursor-pointer transition"
              >
                View All ({requests.length})
              </button>
            </div>
          </div>

          {/* Inline Status Filter Row */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {FILTER_STATUSES.map((statusKey) => (
              <button
                key={statusKey}
                type="button"
                onClick={() => setSelectedStatusFilter(statusKey)}
                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-lg border transition whitespace-nowrap cursor-pointer ${
                  selectedStatusFilter === statusKey
                    ? "bg-orange-600 text-white border-orange-600 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                {STATUS_LABELS[statusKey] || statusKey}
              </button>
            ))}
          </div>

          {/* Active Logs List */}
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {filteredActive.length === 0 ? (
              <p className="text-[10px] text-slate-400 py-6 font-mono text-center">No active priority dispatches mapped.</p>
            ) : (
              filteredActive.slice(0, 5).map(renderCompactCard)
            )}
          </div>

          {/* EMERGENCY HISTORY SECTION */}
          {filteredHistory.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 font-mono">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <History className="w-3.5 h-3.5" />
                  <span>Separated Emergency History</span>
                </div>
                
                {/* Clear Completed Logs button */}
                <button
                   type="button"
                   onClick={clearCompletedLogs}
                   className="px-2 py-0.5 text-[9px] font-mono font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950 border border-red-200 dark:border-red-900 hover:border-red-350 rounded-lg transition duration-150 cursor-pointer"
                >
                  Clear Completed
                </button>
              </div>
              
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {renderGroupedHistory(filteredHistory.slice(0, 10))}
              </div>
            </div>
          )}
        </div>

        {/* View All Logs Modal */}
        {showAllLogsModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transform transition-all">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-orange-600" />
                    Emergency Dispatch Control Room
                  </h3>
                  <p className="text-xs text-slate-400">View, search, slide, and manage active and historical critical patient streams</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllLogsModal(false)}
                  className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Toolbar */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search bar */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2 w-4 h-4 text-slate-400 animate-pulse" />
                    <input
                      type="text"
                      placeholder="Search patient, phone, symptoms, address..."
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-orange-500 transition-all text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  
                  {/* Clear Completed Logs */}
                  <button
                    type="button"
                    onClick={clearCompletedLogs}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer font-sans"
                  >
                    Clear Terminal Logs
                  </button>
                </div>

                {/* Filters */}
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {FILTER_STATUSES.map((statusKey) => (
                    <button
                      key={statusKey}
                      type="button"
                      onClick={() => setSelectedStatusFilter(statusKey)}
                      className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-lg border transition whitespace-nowrap cursor-pointer ${
                        selectedStatusFilter === statusKey
                          ? "bg-orange-600 text-white border-orange-600"
                          : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      {STATUS_LABELS[statusKey] || statusKey}
                    </button>
                  ))}
                </div>
                
                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 mt-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setModalTab("active")}
                    className={`pb-2 text-xs font-mono font-bold border-b-2 transition ${
                      modalTab === "active"
                        ? "border-orange-600 text-orange-600"
                        : "border-transparent text-slate-450 hover:text-slate-600"
                    }`}
                  >
                    Active Feeds ({filteredActive.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("history")}
                    className={`pb-2 text-xs font-mono font-bold border-b-2 transition ${
                      modalTab === "history"
                        ? "border-orange-600 text-orange-600"
                        : "border-transparent text-slate-450 hover:text-slate-600"
                    }`}
                  >
                    Archived Terminal Logs ({filteredHistory.length})
                  </button>
                </div>
              </div>

              {/* Scrollable logs */}
              <div className="p-4 overflow-y-auto space-y-2.5 flex-1 min-h-0 bg-slate-50/20">
                {modalTab === "active" ? (
                  filteredActive.filter(r => {
                    if (!modalSearch) return true;
                    const q = modalSearch.toLowerCase();
                    return (
                      (r.patientName || "").toLowerCase().includes(q) ||
                      (r.phone || "").toLowerCase().includes(q) ||
                      (r.symptoms || "").toLowerCase().includes(q) ||
                      (r.exactAddress || "").toLowerCase().includes(q) ||
                      (r.area || "").toLowerCase().includes(q) ||
                      (r.emergencyType || "").toLowerCase().includes(q) ||
                      (r.emergencyCategory || "").toLowerCase().includes(q)
                    );
                  }).length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-mono text-xs">
                      No matching active logs found.
                    </div>
                  ) : (
                    filteredActive
                      .filter(r => {
                        if (!modalSearch) return true;
                        const q = modalSearch.toLowerCase();
                        return (
                          (r.patientName || "").toLowerCase().includes(q) ||
                          (r.phone || "").toLowerCase().includes(q) ||
                          (r.symptoms || "").toLowerCase().includes(q) ||
                          (r.exactAddress || "").toLowerCase().includes(q) ||
                          (r.area || "").toLowerCase().includes(q) ||
                          (r.emergencyType || "").toLowerCase().includes(q) ||
                          (r.emergencyCategory || "").toLowerCase().includes(q)
                        );
                      })
                      .map(renderCompactCard)
                  )
                ) : (
                  renderGroupedHistory(
                    filteredHistory.filter(r => {
                      if (!modalSearch) return true;
                      const q = modalSearch.toLowerCase();
                      return (
                        (r.patientName || "").toLowerCase().includes(q) ||
                        (r.phone || "").toLowerCase().includes(q) ||
                        (r.symptoms || "").toLowerCase().includes(q) ||
                        (r.exactAddress || "").toLowerCase().includes(q) ||
                        (r.area || "").toLowerCase().includes(q) ||
                        (r.emergencyType || "").toLowerCase().includes(q) ||
                        (r.emergencyCategory || "").toLowerCase().includes(q)
                      );
                    })
                  )
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAllLogsModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-bold rounded-xl transition cursor-pointer"
                >
                  Close Controller
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: PHARMACY STORE & BLOOD DONOR SEARCH */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* PHARMACY CORNER */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-display font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <ShoppingBag className="text-orange-600 w-4.5 h-4.5" />
                Emergency Drug Support
              </h3>
              <p className="text-[11px] text-slate-400">Priority scheduled pharmacist deliveries</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search heart pills, injections, sprays..."
              value={pharmacySearch}
              onChange={(e) => setPharmacySearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-orange-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
          </div>

          {/* Medicines Cards List */}
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {filteredMedicines.map((med) => (
              <div key={med.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 text-xs text-slate-850 dark:text-slate-100 text-slate-800">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">{med.name}</span>
                  <span className="text-[10px] text-slate-500 block font-mono">{med.category} • BDT {med.price}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddToCart(med)}
                  className="px-3 py-1.5 bg-orange-600/10 hover:bg-orange-600 hover:text-white font-mono font-bold text-[10px] rounded-lg transition cursor-pointer"
                >
                  + Add Cart
                </button>
              </div>
            ))}
          </div>

          {/* Mini Cart and checkout */}
          {Object.keys(cart).length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-850 pt-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono text-slate-600 dark:text-slate-400">
                <span>Items: {Object.values(cart).reduce((a, b) => Number(a) + Number(b), 0)} pc</span>
                <span className="font-bold text-orange-600">Total BDT {computeCartTotal()}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <span className="text-[10px] text-slate-500 font-mono font-bold block uppercase tracking-wider">Priority Delivery Zone</span>
                <BDLocationSelector
                  division={medDivision}
                  district={medDistrict}
                  area={medArea}
                  setDivision={setMedDivision}
                  setDistrict={setMedDistrict}
                  setArea={setMedArea}
                  simpleLayout={true}
                />
              </div>
              <input
                type="text"
                placeholder="Exact shipping/delivery Address details"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-orange-600 focus:bg-white dark:focus:bg-slate-900 transition-all font-mono"
              />
              <button
                type="button"
                onClick={handleCheckout}
                className="w-full py-2.5 bg-orange-600 text-white hover:bg-orange-700 font-bold font-mono text-[11px] rounded-xl transition cursor-pointer"
              >
                Place Pharmacy Priority Order
              </button>
            </div>
          )}

          {orderFeedback && (
            <div className="text-[10px] font-mono text-emerald-600 mt-2 text-center animate-pulse font-bold">
              {orderFeedback}
            </div>
          )}
        </div>

        {/* BLOOD DONORS SUPPORT MODULE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-display font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Droplets className="text-red-500 w-4.5 h-4.5" />
              Blood Donors Support Center
            </h3>
            <p className="text-[11px] text-slate-400">Instantly lookup verified city donor groups</p>
          </div>

          {/* Quick group filter tags */}
          <div className="flex flex-wrap gap-1">
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => (
              <button
                type="button"
                key={`blood-group-${group}`}
                onClick={() => setSelectedBloodGroup(selectedBloodGroup === group ? "" : group)}
                className={`px-3 py-1.5 text-[10px] font-bold font-mono rounded-lg border transition-all cursor-pointer ${
                  selectedBloodGroup === group
                    ? "bg-red-600 text-white border-red-500 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                }`}
              >
                {group}
              </button>
            ))}
          </div>

          {/* Donors List Stack */}
          {filteredDonors.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-red-100 bg-red-50/20 rounded-xl font-mono text-xs text-slate-400">
              No matching blood donors in database.
            </div>
          ) : (
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {filteredDonors.map((donor) => (
                <div key={donor.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-850 dark:text-slate-100 text-slate-800">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{donor.name} ({donor.bloodGroup})</span>
                    <span className="text-[10px] text-slate-500 block font-mono">Location: {donor.location}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <a
                      href={`tel:${cleanPhoneForDialing(donor.phone)}`}
                      title="Tap to call donor"
                      className="px-2.5 py-1 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 font-extrabold font-mono text-[9px] rounded-lg block text-center transition cursor-pointer"
                    >
                      Call: {donor.phone}
                    </a>
                    <span className="text-[8px] text-emerald-600 block font-mono mt-1 font-bold">READY TO DONATE</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Register self as blood donor */}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-mono text-slate-500 select-none">Become a clinical life saver?</span>
              <button
                type="button"
                onClick={() => setShowRegForm(!showRegForm)}
                className="text-[10px] font-mono font-bold text-red-600 hover:underline cursor-pointer"
              >
                {showRegForm ? "Cancel Registration" : "+ Register As Donor"}
              </button>
            </div>

            {regFeedback && (
              <p className="text-[10px] text-center font-bold text-emerald-600 font-mono animate-pulse">{regFeedback}</p>
            )}

            {showRegForm && (
              <form onSubmit={handleRegisterDonorSubmit} className="space-y-2 text-xs font-mono p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div>
                  <label className="text-[9px] text-slate-400 block">DONOR FULL NAME:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Raihan Kabir"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 block">MOBILE NO:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 01788776655"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">BLOOD GROUP:</label>
                    <select
                      value={regBlood}
                      onChange={(e) => setRegBlood(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-slate-800 dark:text-slate-100"
                    >
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="py-2.5 border-t border-slate-200 dark:border-slate-800 mt-2 space-y-1.5">
                  <label className="text-[9px] text-slate-500 font-bold block uppercase">Donor Geographic Residence</label>
                  <BDLocationSelector
                    division={donorDivision}
                    district={donorDistrict}
                    area={donorArea}
                    setDivision={setDonorDivision}
                    setDistrict={setDonorDistrict}
                    setArea={setDonorArea}
                    simpleLayout={true}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded cursor-pointer"
                >
                  Confirm Live Registration
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Emergency Details Modal ("What happened?") */}
        <AnimatePresence>
          {isSOSModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/70 dark:bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 z-[99] overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 30 }}
                className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 dark:border-slate-800 text-left overflow-hidden my-4"
              >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-red-600 to-orange-600 text-white flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-red-100 block">
                      ⚠️ EMERGENCY DISPATCH PROTOCOL
                    </span>
                    <h3 className="text-lg font-display font-black tracking-tight mt-0.5" id="emergency-modal-title">
                      What happened?
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSOSModalOpen(false)}
                    className="p-1.5 hover:bg-white/10 text-white rounded-lg transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form fields in modal container */}
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Patient Name */}
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      PATIENT NAME / IDENTITY *
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-155 focus:outline-none focus:border-red-500 bg-white"
                      value={modalPatientName}
                      onChange={(e) => setModalPatientName(e.target.value)}
                      placeholder="Enter full name of the patient"
                    />
                  </div>

                  {/* Phone number and Emergency Category in a Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                        EMERGENCY CATEGORY *
                      </label>
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-800 dark:text-slate-155 focus:outline-none focus:border-red-500 cursor-pointer bg-white"
                        value={modalCategory}
                        onChange={(e) => setModalCategory(e.target.value)}
                      >
                        <option value="Bike Accident">Bike Accident</option>
                        <option value="Road Accident">Road Accident</option>
                        <option value="Fire Burn">Fire Burn</option>
                        <option value="Stroke / Paralysis">Stroke / Paralysis</option>
                        <option value="Heart Attack">Heart Attack</option>
                        <option value="Pregnancy Labor">Pregnancy Labor</option>
                        <option value="Breathing Problem / Low Oxygen">Breathing Problem / Low Oxygen</option>
                        <option value="Severe Bleeding">Severe Bleeding</option>
                        <option value="Unconscious Patient">Unconscious Patient</option>
                        <option value="General Emergency">General Emergency</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                        CONTACT PHONE NUMBER *
                      </label>
                      <input
                        type="tel"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-155 focus:outline-none focus:border-red-500 bg-white"
                        value={modalPhone}
                        onChange={(e) => setModalPhone(e.target.value)}
                        placeholder="Enter active phone number"
                      />
                    </div>
                  </div>

                  {/* Symptoms Textarea */}
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      CONDITIONS / VISUAL SYMPTOMS *
                    </label>
                    <textarea
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-sans text-slate-800 dark:text-slate-155 focus:outline-none focus:border-red-500 bg-white"
                      value={modalSymptoms}
                      onChange={(e) => setModalSymptoms(e.target.value)}
                      placeholder="Describe the condition: bleeding, fracture, burn area, unconscious, chest pain, breathing difficulty..."
                    />
                  </div>

                  {/* Location fields */}
                  <div className="border-t border-b border-slate-100 dark:border-slate-850 py-3 space-y-3">
                    <span className="text-[10px] font-mono font-extrabold text-slate-500 dark:text-slate-400 block tracking-widest uppercase">
                      Geographic Emergency Venue
                    </span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] font-mono font-bold text-slate-400 block mb-0.5">DIVISION</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-155 focus:outline-none bg-white"
                          value={modalDivision}
                          onChange={(e) => setModalDivision(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono font-bold text-slate-400 block mb-0.5">DISTRICT</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-155 focus:outline-none bg-white"
                          value={modalDistrict}
                          onChange={(e) => setModalDistrict(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono font-bold text-slate-400 block mb-0.5">AREA / UPAZILA</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-155 focus:outline-none bg-white"
                          value={modalArea}
                          onChange={(e) => setModalArea(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-400 block mb-0.5">EXACT ADDRESS / LANDMARK *</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-155 focus:outline-none focus:border-red-500 bg-white"
                        value={modalExactAddress}
                        onChange={(e) => setModalExactAddress(e.target.value)}
                        placeholder="e.g. Near Mirpur 10 metro station, Block B, Road 4"
                      />
                    </div>
                  </div>

                  {/* Urgency Factor Checkboxes Row */}
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                      SPECIFIC URGENCY COMPLICATIONS (CHECK ALL THAT APPLY)
                    </label>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <label className="inline-flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer text-[11px] font-mono text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 dark:border-slate-700 text-red-600 focus:ring-red-500"
                          checked={modalIcuNeeded}
                          onChange={(e) => setModalIcuNeeded(e.target.checked)}
                        />
                        <span>ICU Needed</span>
                      </label>

                      <label className="inline-flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer text-[11px] font-mono text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 dark:border-slate-700 text-red-600 focus:ring-red-500"
                          checked={modalOxygenNeeded}
                          onChange={(e) => setModalOxygenNeeded(e.target.checked)}
                        />
                        <span>Oxygen Needed</span>
                      </label>

                      <label className="inline-flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer text-[11px] font-mono text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 dark:border-slate-700 text-red-600 focus:ring-red-500"
                          checked={modalVentilatorNeeded}
                          onChange={(e) => setModalVentilatorNeeded(e.target.checked)}
                        />
                        <span>Ventilator</span>
                      </label>

                      <label className="inline-flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer text-[11px] font-mono text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 dark:border-slate-700 text-red-600 focus:ring-red-500"
                          checked={modalHeavyBleeding}
                          onChange={(e) => setModalHeavyBleeding(e.target.checked)}
                        />
                        <span className="text-red-650 font-extrabold">Heavy Bleeding</span>
                      </label>

                      <label className="inline-flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer text-[11px] font-mono text-slate-700 dark:text-slate-300 col-span-2 sm:col-span-1">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 dark:border-slate-700 text-red-600 focus:ring-red-500"
                          checked={modalUnconscious}
                          onChange={(e) => setModalUnconscious(e.target.checked)}
                        />
                        <span className="text-red-700 font-extrabold animate-pulse">Unconscious</span>
                      </label>
                    </div>
                  </div>

                  {/* Calculated Priority Board */}
                  <div className="p-3 bg-red-50/55 dark:bg-red-950/20 border border-red-150 dark:border-red-900/40 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                      <span className="text-[10px] font-mono font-bold text-slate-605 dark:text-slate-400">
                        ENGINE AUTO-CALCULATED PRIORITY:
                      </span>
                    </div>

                    <span className={`px-3 py-1 rounded-xl text-xs font-mono font-black border tracking-wide uppercase transition-all duration-350 ${
                      modalPriority === "Critical"
                        ? "bg-red-600 text-white border-red-500 animate-pulse"
                        : modalPriority === "High"
                          ? "bg-orange-500 text-white border-orange-400"
                          : "bg-blue-600 text-white border-blue-500"
                    }`}>
                      🔥 {modalPriority} Priority
                    </span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSOSModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSOSDispatch}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-sans font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1 font-mono"
                  >
                    🚀 Trigger Instant Dispatch
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmation.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60]"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-100 space-y-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl shrink-0">
                    <Trash2 className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 font-mono uppercase tracking-wide">
                      Confirm Deletion
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {deleteConfirmation.message}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-mono font-bold rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={executeDelete}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold rounded-xl shadow-xs transition cursor-pointer font-sans"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
