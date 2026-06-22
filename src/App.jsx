import { useState, useEffect, useMemo, useRef } from "react";
import { 
  UserRole, 
  AmbulanceStatus, 
  EmergencyType, 
  Severity,
  RequestStatus
} from "./types";
import {
  FALLBACK_AMBULANCES,
  FALLBACK_HOSPITALS,
  FALLBACK_REQUESTS,
  FALLBACK_MEDICINES,
  FALLBACK_BLOOD_DONORS,
  FALLBACK_NOTIFICATIONS,
  FALLBACK_BANKER_MATRIX
} from "./fallbackData";
import MainLayout from "./components/MainLayout";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import PatientDashboard from "./pages/PatientDashboard";
import AmbulanceDashboard from "./pages/AmbulanceDashboard";
import HospitalAdmin from "./pages/HospitalAdmin";
import ComparisonArena from "./pages/ComparisonArena";
import DisasterSimulation from "./pages/DisasterSimulation";
import CommandCenterMap from "./components/CommandCenterMap";
import EmergencyChatSystem from "./components/EmergencyChatSystem";

import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { BANGLADESH_LOCATIONS } from "./utils/locationData";
import BDLocationSelector from "./components/BDLocationSelector";

// Firestore exports
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";

export default function App() {
  const { currentUser, loading, logout, setCurrentUser } = useAuth();

  // Login modal control states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [initialModalRole, setInitialModalRole] = useState("patient");

  const handleOpenLoginModal = (role = "patient") => {
    if (role === "admin" || role === "hospital_admin") {
      setInitialModalRole("admin");
    } else if (role === "operator" || role === "ambulance_operator") {
      setInitialModalRole("operator");
    } else {
      setInitialModalRole("patient");
    }
    setShowLoginModal(true);
  };

  useEffect(() => {
    if (!currentUser) {
      setActiveTab("home");
    }
  }, [currentUser]);

  // Selected administrative parameters for filtering
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("mediflow-theme");
    if (saved) return saved;
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("mediflow-theme", theme);
  }, [theme]);

  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  
  // Custom router state tracking
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [activeTab, setActiveTab] = useState("home");

  const navigate = (toPath) => {
    window.history.pushState({}, "", toPath);
    setCurrentPath(toPath);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync route path to default tabs
  useEffect(() => {
    if (currentUser) {
      if (currentPath === "/admin/dashboard" && activeTab !== "hospital" && activeTab !== "disaster" && activeTab !== "arena" && activeTab !== "home") {
        setActiveTab("hospital");
      } else if (currentPath === "/ambulance/dashboard" && activeTab !== "operator" && activeTab !== "home") {
        setActiveTab("operator");
      } else if (currentPath === "/user/dashboard" && activeTab !== "patient" && activeTab !== "arena" && activeTab !== "home") {
        setActiveTab("patient");
      }
    }
  }, [currentPath, currentUser]);

  // Auto-redirect logged-in users from root ("/") or "/login" to their active workspace dashboard on mount/auth load
  useEffect(() => {
    if (!loading && currentUser) {
      if (currentPath === "/" || currentPath === "" || currentPath === "/login") {
        if (currentUser.role === "hospital_admin") {
          navigate("/admin/dashboard");
          setActiveTab("hospital");
        } else if (currentUser.role === "ambulance_operator") {
          navigate("/ambulance/dashboard");
          setActiveTab("operator");
        } else if (currentUser.role === "patient") {
          navigate("/user/dashboard");
          setActiveTab("patient");
        }
      }
    }
  }, [currentUser, loading, currentPath]);

  // Master collections states, fully real-time synched with Firestore
  const [requests, setRequests] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [rawHospitals, setRawHospitals] = useState([]);
  const [resources, setResources] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [bloodDonors, setBloodDonors] = useState([]);

  // Bankers states
  const [bankerMatrix, setBankerMatrix] = useState({ allocation: {}, maxNeed: {}, available: [3, 5, 2], need: {} });
  const [isBankersSafe, setIsBankersSafe] = useState(true);
  const [safeSequence, setSafeSequence] = useState([]);
  const [warningAlert, setWarningAlert] = useState(null);
  const [bankersDemoMode, setBankersDemoMode] = useState("manual");

  // Schedulers states
  const [schedulerTimeline, setSchedulerTimeline] = useState([]);
  const [schedulerResults, setSchedulerResults] = useState([]);
  const [schedulerStats, setSchedulerStats] = useState(null);

  // Live onSnapshot listeners to Firestore collections
  useEffect(() => {
    if (!currentUser) return;

    // 1. Listen to emergencyRequests
    const unsubRequests = onSnapshot(collection(db, "emergencyRequests"), (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = d.data();
        list.push({ ...item, id: d.id }); // map document id for UI compatibility
      });
      // Sort requests so older ones come first
      list.sort((a, b) => {
        const getMs = (val) => {
          if (!val) return Date.now();
          if (typeof val.toDate === "function") return val.toDate().getTime();
          const t = new Date(val).getTime();
          return isNaN(t) ? Date.now() : t;
        };
        return getMs(a.createdAt) - getMs(b.createdAt);
      });
      setRequests(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "emergencyRequests"));

    // 2. Listen to ambulances
    const unsubAmbulances = onSnapshot(collection(db, "ambulances"), (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = d.data();
        list.push({ ...item, id: d.id });
      });

      // Auto-provision a default driver if list of ambulances is completely empty and user is operator
      if (list.length === 0 && currentUser.role === "ambulance_operator") {
        const autoAmbId = "amb_" + currentUser.uid;
        setDoc(doc(db, "ambulances", autoAmbId), {
          ambulanceId: autoAmbId,
          vehicleNumber: "Dhaka Metro-Chha-11-2091",
          driverName: currentUser.name || "Kamil Ahsan (Operator)",
          driverPhone: "01511223344",
          operatorId: currentUser.uid,
          location: "mirpur",
          status: "available",
          capacity: 1,
          createdAt: new Date().toISOString()
        });
      }
      setAmbulances(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "ambulances"));

    // 3. Listen to hospitals
    const unsubHospitals = onSnapshot(collection(db, "hospitals"), (snapH) => {
      const list = [];
      snapH.forEach((d) => {
        list.push({ ...d.data(), id: d.id });
      });
      setRawHospitals(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "hospitals"));

    // 3b. Listen to resources
    const unsubResources = onSnapshot(collection(db, "resources"), (snapR) => {
      const list = [];
      snapR.forEach((d) => {
        list.push({ ...d.data(), id: d.id });
      });
      setResources(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "resources"));

    // 4. Listen to medicines
    const unsubMedicines = onSnapshot(collection(db, "medicines"), (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = d.data();
        list.push({ ...item, id: d.id });
      });
      setMedicines(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "medicines"));

    // 5. Listen to bloodDonors
    const unsubBloodDonors = onSnapshot(collection(db, "bloodDonors"), (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = d.data();
        list.push({ ...item, id: d.id });
      });
      setBloodDonors(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "bloodDonors"));

    // 6. Listen to notifications
    const unsubNotifications = onSnapshot(collection(db, "notifications"), (snap) => {
      const list = [];
      snap.forEach((d) => {
        const item = d.data();
        list.push({ ...item, id: d.id });
      });
      // Sort by descending createdAt
      list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "notifications"));

    // 7. Listen to settings/bankers to synchronize the Bankers Demo Preset mode in real-time
    const unsubSettings = onSnapshot(doc(db, "settings", "bankers"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.bankersDemoMode) {
          setBankersDemoMode(data.bankersDemoMode);
        }
      }
    }, (err) => {
      console.warn("Unsubscribing / ignoring settings/bankers read error:", err);
    });

    return () => {
      unsubRequests();
      unsubAmbulances();
      unsubHospitals();
      unsubResources();
      unsubMedicines();
      unsubBloodDonors();
      unsubNotifications();
      unsubSettings();
    };
  }, [currentUser]);

  // Derive hospitals with resources dynamically to keep UI fully backward compatible
  const hospitals = useMemo(() => {
    return rawHospitals.map(h => {
      const hId = h.hospitalId || h.id;
      const dbRes = resources.find(r => (r.hospitalId || r.id) === hId);
      const res = {
        totalICU: Number(dbRes?.totalICU ?? 25),
        availableICU: Number(dbRes?.availableICU ?? 18),
        totalOxygen: Number(dbRes?.totalOxygen ?? 80),
        availableOxygen: Number(dbRes?.availableOxygen ?? 60),
        totalVentilators: Number(dbRes?.totalVentilators ?? 15),
        availableVentilators: Number(dbRes?.availableVentilators ?? 10),
        totalDoctors: Number(dbRes?.totalDoctors ?? 40),
        availableDoctors: Number(dbRes?.availableDoctors ?? 30),
        totalOT: Number(dbRes?.totalOT ?? 5),
        availableOT: Number(dbRes?.availableOT ?? 3)
      };
      
      const occupiedICU = Math.max(0, res.totalICU - res.availableICU);
      const occupiedOxygen = Math.max(0, res.totalOxygen - res.availableOxygen);
      const occupiedVentilators = Math.max(0, res.totalVentilators - res.availableVentilators);
      const occupiedOT = Math.max(0, res.totalOT - res.availableOT);

      return {
        id: hId,
        name: h.hospitalName || h.name || "Specialist Hospital",
        location: h.location || "Dhaka Venue",
        locKey: h.location?.toLowerCase().includes("mirpur") ? "mirpur" : (h.location?.toLowerCase().includes("dhanmondi") ? "dhanmondi" : "shahbagh"),
        distanceKm: Number(h.distanceKm ?? 2.1),
        icuBeds: { total: res.totalICU, occupied: occupiedICU },
        oxygenCylinders: { total: res.totalOxygen, occupied: occupiedOxygen },
        ventilators: { total: res.totalVentilators, occupied: occupiedVentilators },
        operationTheaters: { total: res.totalOT, occupied: occupiedOT },
        doctors: { total: res.totalDoctors, active: res.availableDoctors },
        emergencyLoad: requests.filter(r => (r.assignedHospitalId || r.hospitalId) === hId && r.status !== "completed" && r.status !== "admitted" && r.status !== "Completed" && r.status !== "Admitted" && r.status !== "Cancelled").length
      };
    });
  }, [rawHospitals, resources, requests]);

  // Derive Banker's matrix dynamically from live hospital state across 5 core parameters:
  // ICU Beds, Oxygen, Ventilators, Doctors, OP Theaters
  const derivedBankerMatrix = useMemo(() => {
    const allocation = {};
    const maxNeed = {};
    const need = {};
    
    // Default available vector for 5 key clinical resources
    let available = [15, 25, 12, 10, 5];
    if (bankersDemoMode === "deadlock") {
      available = [1, 2, 1, 1, 0];
    } else if (bankersDemoMode === "safe") {
      available = [50, 100, 30, 120, 15];
    } else {
      // Calculate active unallocated/available resources dynamically from Firestore logs
      let availICU = 0;
      let availOxy = 0;
      let availVent = 0;
      let availDoc = 0;
      let availOT = 0;
      resources.forEach(r => {
        availICU += Number(r.availableICU ?? r.totalICU ?? 0);
        availOxy += Number(r.availableOxygen ?? r.totalOxygen ?? 0);
        availVent += Number(r.availableVentilators ?? r.totalVentilators ?? 0);
        availDoc += Number(r.availableDoctors ?? r.totalDoctors ?? 0);
        availOT += Number(r.availableOT ?? r.totalOT ?? 0);
      });
      if (resources.length > 0) {
        available = [
          Math.max(1, availICU),
          Math.max(1, availOxy),
          Math.max(1, availVent),
          Math.max(1, availDoc),
          Math.max(1, availOT)
        ];
      }
    }
    
    hospitals.forEach(h => {
      const dbRes = resources.find(r => (r.hospitalId || r.id) === h.id);
      const allocVec = [
        Math.max(0, Number(h.icuBeds?.occupied ?? 0)),
        Math.max(0, Number(h.oxygenCylinders?.occupied ?? 0)),
        Math.max(0, Number(h.ventilators?.occupied ?? 0)),
        dbRes ? Math.max(0, Number(dbRes.totalDoctors || 30) - Number(dbRes.availableDoctors || 30)) : 5,
        Math.max(0, Number(h.operationTheaters?.occupied ?? 0))
      ];
      const maxVec = [
        Math.max(1, Number(h.icuBeds?.total ?? 25)),
        Math.max(1, Number(h.oxygenCylinders?.total ?? 80)),
        Math.max(1, Number(h.ventilators?.total ?? 15)),
        Math.max(1, Number(dbRes?.totalDoctors ?? 40)),
        Math.max(1, Number(h.operationTheaters?.total ?? 5))
      ];
      
      allocation[h.id] = allocVec;
      maxNeed[h.id] = maxVec;
      need[h.id] = maxVec.map((val, idx) => Math.max(0, val - allocVec[idx]));
    });

    return {
      allocation,
      maxNeed,
      available,
      need
    };
  }, [hospitals, resources, bankersDemoMode]);

  // Sync Banker's safety verification cycle reactively with the derived matrix state
  useEffect(() => {
    const matrix = derivedBankerMatrix;
    const processes = Object.keys(matrix.maxNeed);
    if (processes.length === 0) return;

    let Work = [...matrix.available];
    let Finish = {};
    processes.forEach(p => Finish[p] = false);

    let isSafe = true;
    let safeSeq = [];
    
    for (let step = 0; step < processes.length; step++) {
      let foundProcess = false;
      for (const p of processes) {
        if (!Finish[p]) {
          let canAllocate = true;
          const needVec = matrix.need[p];
          for (let r = 0; r < Work.length; r++) {
            if (needVec[r] > Work[r]) {
              canAllocate = false;
              break;
            }
          }
          if (canAllocate) {
            const allocVec = matrix.allocation[p];
            for (let r = 0; r < Work.length; r++) {
              Work[r] += allocVec[r];
            }
            Finish[p] = true;
            foundProcess = true;
            safeSeq.push(p);
            break;
          }
        }
      }
      if (!foundProcess) {
        isSafe = false;
        break;
      }
    }

    setIsBankersSafe(isSafe);
    setSafeSequence(safeSeq.map(hId => hospitals.find(h => h.id === hId)?.name || hId));
    if (!isSafe) {
      setWarningAlert("⚠️ RISK WARNING: Clinical resource allocations have driven the hospital ready queue into a deadlock danger zone!");
    } else {
      setWarningAlert(null);
    }
    setBankerMatrix(matrix);
  }, [derivedBankerMatrix, hospitals]);

  // Bankers Auto-Assignment Loop (ONLY active under "Safe Preset")
  const autoAssignInProgress = useRef(false);

  useEffect(() => {
    if (bankersDemoMode !== "safe") return;
    if (autoAssignInProgress.current) return;

    // Filter pending/waiting requests
    const pendingReqs = requests.filter(r => 
      r.status === "pending" || r.status === "waiting_resource"
    );
    if (pendingReqs.length === 0) return;

    // Extract the oldest pending candidate
    const reqObj = pendingReqs[0];

    // Search for first available transport asset
    const availableAmbulance = ambulances.find(a => a.status === "available");
    if (!availableAmbulance) return;

    // Calculate resources wanted by payload
    const needICU = reqObj.needICU || reqObj.requestedResources?.icu ? 1 : 0;
    const needOxygen = reqObj.needOxygen || reqObj.requestedResources?.oxygen ? 1 : 0;
    const needVentilator = reqObj.needVentilator || reqObj.requestedResources?.ventilator ? 1 : 0;
    const needDoctor = 1;
    const needOT = (reqObj.severity?.toLowerCase() === "critical" || reqObj.priority === "Critical" || reqObj.priority === 1 || reqObj.priority === "1") ? 1 : 0;

    // Find first hospital node with sufficient buffer
    const matchedHospital = hospitals.find(h => {
      const res = resources.find(r => r.hospitalId === h.id);
      if (!res) return false;

      const avICU = Number(res.availableICU ?? 0);
      const avOxy = Number(res.availableOxygen ?? 0);
      const avVent = Number(res.availableVentilators ?? 0);
      const avDoc = Number(res.availableDoctors ?? 0);
      const avOT = Number(res.availableOT ?? 0);

      return (
        avICU >= needICU &&
        avOxy >= needOxygen &&
        avVent >= needVentilator &&
        avDoc >= needDoctor &&
        avOT >= needOT
      );
    });

    if (matchedHospital) {
      autoAssignInProgress.current = true;
      console.log(`[AutoAssign] Dispatch trigger: request ${reqObj.id} to hospital ${matchedHospital.name}`);
      handleAssignDispatch(reqObj.id, availableAmbulance.id, matchedHospital.id)
        .then(() => {
          autoAssignInProgress.current = false;
        })
        .catch((err) => {
          console.error("AutoAssign execution error:", err);
          autoAssignInProgress.current = false;
        });
    }
  }, [requests, ambulances, hospitals, resources, bankersDemoMode]);

  // Bankers Deadlock blocker queue upgrade (Automatically moves 'pending' to 'waiting_resource' under Unsafe/Deadlock Presets)
  useEffect(() => {
    if (bankersDemoMode !== "deadlock") return;

    const pendingReqs = requests.filter(r => r.status === "pending");
    pendingReqs.forEach(async (r) => {
      try {
        const reqRef = doc(db, "emergencyRequests", r.id);
        await updateDoc(reqRef, {
          status: "waiting_resource",
          deadlockRisk: true,
          bankerStatus: "unsafe",
          lastCheckAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to transition request to waiting_resource:", err);
      }
    });
  }, [requests, bankersDemoMode]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    setActiveTab("home");
  };

  // --- ACTIONS CONTROLLER ---

  // Patient registers SOS Incident Request
  const handleSOSSubmit = async (data) => {
    // Check duplicate unfinished SOS
    const pId = currentUser?.uid || "anonymous_patient";
    const hasUnfinished = requests.some(r => r.patientId === pId && r.status !== "completed" && r.status !== "cancelled" && r.status !== "Completed" && r.status !== "Cancelled" && r.status !== "admitted" && r.status !== "Admitted");
    if (hasUnfinished) {
      return { success: false, error: "An active patient request already exists. Please resolve or cancel your ongoing emergency first." };
    }

    let pName = data.patientName || currentUser?.name || "Anonymous Patient";
    let pPhone = data.phone || data.patientPhone || "01723456789";
    let emType = data.emergencyType || data.emergencyCategory || "General Emergency";
    let symptomsText = data.symptoms || "One-click urgent assistance SOS signal.";
    let divisionVal = data.division || "Dhaka";
    let districtVal = data.district || "Dhaka";
    let areaVal = data.area || "Shahbagh";
    let addressVal = data.exactAddress || "University of Dhaka";
    let locationVal = data.location || `${addressVal}, ${areaVal}, ${districtVal}, ${divisionVal}`;

    let severity = data.severity || "LOW";
    let priorityValue = data.priorityValue || 4;
    let burstTime = data.burstTime || 4;

    if (!data.severity) {
      const textToAnalyze = `${emType} ${symptomsText}`.toLowerCase();
      if (
        textToAnalyze.includes("chest") || 
        textToAnalyze.includes("heart") || 
        textToAnalyze.includes("unconscious") || 
        textToAnalyze.includes("breathing") ||
        textToAnalyze.includes("cardiac") ||
        textToAnalyze.includes("stroke")
      ) {
        severity = "CRITICAL";
        priorityValue = 1;
        burstTime = 10;
      } else if (
        textToAnalyze.includes("accident") || 
        textToAnalyze.includes("bleeding") || 
        textToAnalyze.includes("fracture") || 
        textToAnalyze.includes("fire") || 
        textToAnalyze.includes("burn") ||
        textToAnalyze.includes("labor") ||
        textToAnalyze.includes("pregnancy")
      ) {
        severity = "HIGH";
        priorityValue = 2;
        burstTime = 8;
      } else if (symptomsText.length > 5) {
        severity = "MEDIUM";
        priorityValue = 3;
        burstTime = 5;
      }
    }

    const requestId = data.requestId || ("req_" + Date.now() + "_" + Math.floor(Math.random() * 1000));
    const newRequest = {
      incidentId: requestId,
      requestId,
      patientId: pId,
      patientName: pName,
      patientPhone: pPhone,
      phone: pPhone,
      emergencyCategory: emType,
      emergencyType: emType,
      symptoms: symptomsText,
      division: divisionVal,
      district: districtVal,
      area: areaVal,
      exactAddress: addressVal,
      location: locationVal,
      priority: data.priority || (severity === "CRITICAL" ? "Critical" : (severity === "HIGH" ? "High" : "Medium")),
      severity: severity.toLowerCase(),
      requiredResources: data.requiredResources || [],
      requestedResources: {
        icu: !!(data.needICU || data.needIcu || (data.requestedResources && data.requestedResources.icu)),
        oxygen: !!(data.needOxygen || (data.requestedResources && data.requestedResources.oxygen)),
        ventilator: !!(data.needVentilator || data.needVent || (data.requestedResources && data.requestedResources.ventilator))
      },
      status: "pending",
      createdAt: serverTimestamp(),
      arrivalTime: data.arrivalTime || (requests.length + 1),
      estimatedServiceTime: burstTime,
      burstTime,
      remainingTime: burstTime,
      priorityValue,
      starvationCounter: 0,
      waitingTime: 0,
      turnaroundTime: 0,
      responseTime: 0
    };

    try {
      await setDoc(doc(db, "emergencyRequests", requestId), newRequest);

      // Create unique emergency support chat room in Firestore
      const chatRoomId = "room_" + requestId;
      await setDoc(doc(db, "chatRooms", chatRoomId), {
        roomId: chatRoomId,
        emergencyId: requestId,
        userId: pId,
        operatorId: "",
        adminId: "hospital_admin",
        createdAt: new Date().toISOString(),
        status: "active"
      });

      // Write initial log system message to Firestore
      const systemMessageId = "msg_sys_init_" + Date.now();
      await setDoc(doc(db, "messages", systemMessageId), {
        messageId: systemMessageId,
        roomId: chatRoomId,
        senderId: "system",
        senderRole: "system",
        text: `Emergency support chat room created for request ${requestId}. Patient, Operators, and Admins can now chat in real-time.`,
        timestamp: new Date().toISOString(),
        read: false
      });
      
      await addDoc(collection(db, "notifications"), {
        userId: currentUser?.uid || "all",
        title: "Priority SOS Signal Mapped",
        message: `${newRequest.patientName} (${newRequest.priority}) in ${newRequest.area}`,
        type: "alert",
        read: false,
        createdAt: new Date().toISOString()
      });
      return { success: true, emergency: newRequest };
    } catch (e) {
      console.log("Error writing SOS:", e);
      return { success: false, error: e.message };
    }
  };

  // Patient places medicine support order
  const handleOrderSubmit = async (data) => {
    const orderId = "order_" + Date.now();
    const newOrder = {
      orderId,
      userId: currentUser?.uid || "ghost_buyer",
      items: data.items || [],
      totalPrice: data.totalAmount || 0,
      deliveryAddress: data.deliveryAddress || "Dhaka Base",
      status: "pending",
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "medicineOrders", orderId), newOrder);
      
      // Reactive stock adjustment in Firestore
      for (const item of (data.items || [])) {
        const medRef = doc(db, "medicines", item.medicineId);
        const medObj = medicines.find(m => m.id === item.medicineId);
        if (medObj) {
          await updateDoc(medRef, {
            stock: Math.max(0, medObj.stock - item.quantity)
          });
        }
      }

      await addDoc(collection(db, "notifications"), {
        userId: currentUser?.uid || "all",
        title: "Pharmacy Order Mapped",
        message: `Order #${orderId.slice(-4)} placed for BDT ${newOrder.totalPrice}`,
        type: "success",
        read: false,
        createdAt: new Date().toISOString()
      });
      return { success: true, order: newOrder };
    } catch (err) {
      console.log("Order submission error: ", err);
      return { success: false };
    }
  };

  // Admin adjust clinical resources
  const handleChangeResource = async (hospitalId, resourceKey, isIncrement) => {
    try {
      setBankersDemoMode("manual");
      const resRef = doc(db, "resources", hospitalId);
      const mergedH = hospitals.find(h => h.id === hospitalId);
      if (!mergedH) return;

      const change = isIncrement ? 1 : -1;
      
      let totalICU = mergedH.icuBeds.total;
      let availableICU = totalICU - mergedH.icuBeds.occupied;
      let totalOxygen = mergedH.oxygenCylinders.total;
      let availableOxygen = totalOxygen - mergedH.oxygenCylinders.occupied;
      let totalVentilators = mergedH.ventilators.total;
      let availableVentilators = totalVentilators - mergedH.ventilators.occupied;
      
      let totalDoctors = mergedH.doctors?.total || 40;
      let availableDoctors = mergedH.doctors?.active || 30;
      let totalOT = mergedH.operationTheaters?.total || 5;
      let availableOT = totalOT - mergedH.operationTheaters?.occupied || 3;

      if (resourceKey === "icu") {
        availableICU = Math.max(0, Math.min(totalICU, availableICU + change));
      } else if (resourceKey === "oxygen") {
        availableOxygen = Math.max(0, Math.min(totalOxygen, availableOxygen + change));
      } else if (resourceKey === "ventilator") {
        availableVentilators = Math.max(0, Math.min(totalVentilators, availableVentilators + change));
      } else if (resourceKey === "doctor") {
        availableDoctors = Math.max(0, Math.min(totalDoctors, availableDoctors + change));
      } else if (resourceKey === "ot") {
        availableOT = Math.max(0, Math.min(totalOT, availableOT + change));
      }

      await setDoc(resRef, {
        hospitalId,
        totalICU,
        availableICU,
        totalOxygen,
        availableOxygen,
        totalVentilators,
        availableVentilators,
        totalDoctors,
        availableDoctors,
        totalOT,
        availableOT,
        updatedAt: new Date().toISOString()
      }, { merge: true });

    } catch (e) {
      console.log("Error updating resources:", e);
    }
  };

  const handleSetBankersDemoMode = async (mode) => {
    setBankersDemoMode(mode);
    try {
      await setDoc(doc(db, "settings", "bankers"), { bankersDemoMode: mode }, { merge: true });
    } catch (e) {
      console.error("Failed to update bankersDemoMode in settings:", e);
    }
    if (mode === "manual") return;

    try {
      const hIds = ["hosp1", "hosp2", "hosp3", "hosp4", "hosp5"];
      if (mode === "safe") {
        const safeProfiles = {
          hosp1: { totalICU: 40, availableICU: 32, totalOxygen: 100, availableOxygen: 92, totalVentilators: 25, availableVentilators: 22, totalDoctors: 120, availableDoctors: 110, totalOT: 10, availableOT: 8 },
          hosp2: { totalICU: 20, availableICU: 18, totalOxygen: 80, availableOxygen: 72, totalVentilators: 15, availableVentilators: 14, totalDoctors: 60, availableDoctors: 55, totalOT: 4, availableOT: 3 },
          hosp3: { totalICU: 15, availableICU: 13, totalOxygen: 60, availableOxygen: 54, totalVentilators: 10, availableVentilators: 9, totalDoctors: 50, availableDoctors: 45, totalOT: 4, availableOT: 3 },
          hosp4: { totalICU: 30, availableICU: 27, totalOxygen: 90, availableOxygen: 81, totalVentilators: 20, availableVentilators: 18, totalDoctors: 95, availableDoctors: 85, totalOT: 8, availableOT: 7 },
          hosp5: { totalICU: 18, availableICU: 16, totalOxygen: 50, availableOxygen: 45, totalVentilators: 8, availableVentilators: 7, totalDoctors: 45, availableDoctors: 40, totalOT: 3, availableOT: 2 },
        };

        for (const hospId of hIds) {
          const profile = safeProfiles[hospId];
          await setDoc(doc(db, "resources", hospId), {
            hospitalId: hospId,
            totalICU: profile.totalICU,
            availableICU: profile.availableICU,
            totalOxygen: profile.totalOxygen,
            availableOxygen: profile.availableOxygen,
            totalVentilators: profile.totalVentilators,
            availableVentilators: profile.availableVentilators,
            totalDoctors: profile.totalDoctors,
            availableDoctors: profile.availableDoctors,
            totalOT: profile.totalOT,
            availableOT: profile.availableOT,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } else if (mode === "deadlock") {
        const deadlockProfiles = {
          hosp1: { totalICU: 40, availableICU: 2, totalOxygen: 100, availableOxygen: 4, totalVentilators: 25, availableVentilators: 1, totalDoctors: 120, availableDoctors: 10, totalOT: 10, availableOT: 0 },
          hosp2: { totalICU: 20, availableICU: 1, totalOxygen: 80, availableOxygen: 2, totalVentilators: 15, availableVentilators: 0, totalDoctors: 60, availableDoctors: 5, totalOT: 4, availableOT: 0 },
          hosp3: { totalICU: 15, availableICU: 1, totalOxygen: 60, availableOxygen: 3, totalVentilators: 10, availableVentilators: 0, totalDoctors: 50, availableDoctors: 4, totalOT: 4, availableOT: 0 },
          hosp4: { totalICU: 30, availableICU: 2, totalOxygen: 90, availableOxygen: 5, totalVentilators: 20, availableVentilators: 1, totalDoctors: 95, availableDoctors: 8, totalOT: 8, availableOT: 0 },
          hosp5: { totalICU: 18, availableICU: 0, totalOxygen: 50, availableOxygen: 1, totalVentilators: 8, availableVentilators: 0, totalDoctors: 45, availableDoctors: 3, totalOT: 3, availableOT: 0 },
        };

        for (const hospId of hIds) {
          const profile = deadlockProfiles[hospId];
          await setDoc(doc(db, "resources", hospId), {
            hospitalId: hospId,
            totalICU: profile.totalICU,
            availableICU: profile.availableICU,
            totalOxygen: profile.totalOxygen,
            availableOxygen: profile.availableOxygen,
            totalVentilators: profile.totalVentilators,
            availableVentilators: profile.availableVentilators,
            totalDoctors: profile.totalDoctors,
            availableDoctors: profile.availableDoctors,
            totalOT: profile.totalOT,
            availableOT: profile.availableOT,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }
    } catch (err) {
      console.log("Error updating resources for Bankers demo preset:", err);
    }
  };

  // Dispatch Assignment: Matches vehicle with recommendation clinic & validates safety using Banker's Algorithm
  const handleAssignDispatch = async (requestId, ambulanceId, hospitalId) => {
    try {
      const reqRef = doc(db, "emergencyRequests", requestId);
      const reqObj = requests.find(r => r.id === requestId);
      if (!reqObj) {
        return { success: false, message: "Request not found in database." };
      }

      // Check duplicate active assignment for the same patient to satisfy requirement 6
      const patientId = reqObj.patientId || "anonymous_patient";
      if (patientId && patientId !== "anonymous_patient") {
        const hasOtherActive = requests.some(r => 
          r.patientId === patientId && 
          r.id !== requestId &&
          (
            r.status === "ambulance_assigned" || 
            r.status === "On Route" || 
            r.status === "Patient Picked Up" || 
            r.status === "Arrived at Hospital" || 
            r.status === "admitted" || 
            r.status === "Admitted" || 
            r.status === "Patient Picked" ||
            r.status === "Reached Hospital" ||
            r.status === "patient_picked" ||
            r.status === "on_route"
          )
        );
        if (hasOtherActive) {
          return {
            success: false,
            message: `Assignment denied. A translation of active resources is already provisioned for patient ${reqObj.patientName || "Casualty"}.`
          };
        }
      }

      // Check overall safety and/or deadlock demo state first
      if (bankersDemoMode === "deadlock" || !isBankersSafe) {
        await updateDoc(reqRef, {
          deadlockRisk: true,
          bankerStatus: "unsafe",
          status: "waiting_resource",
          lastCheckAt: new Date().toISOString()
        });
        
        await addDoc(collection(db, "notifications"), {
          userId: "all",
          title: "Assignment Request Blocked due to Deadlock Risk",
          message: `Denied assignment for patient ${reqObj.patientName}: Deadlock Risk - Unsafe state detected.`,
          type: "alert",
          read: false,
          createdAt: new Date().toISOString()
        });

        return {
          success: false,
          isUnsafe: true,
          message: "Deadlock Risk: Unsafe state detected. Request assignment denied."
        };
      }

      // 1. Retrieve the hospital details and its resource stats from real-time resources state
      const res = resources.find(r => r.hospitalId === hospitalId) || {
        totalICU: 25, availableICU: 25,
        totalOxygen: 80, availableOxygen: 80,
        totalVentilators: 15, availableVentilators: 15,
        totalDoctors: 40, availableDoctors: 40,
        totalOT: 5, availableOT: 5
      };

      // 2. Define the patient request vector
      const needICU = reqObj.needICU || reqObj.requestedResources?.icu ? 1 : 0;
      const needOxygen = reqObj.needOxygen || reqObj.requestedResources?.oxygen ? 1 : 0;
      const needVentilator = reqObj.needVentilator || reqObj.requestedResources?.ventilator ? 1 : 0;
      const needDoctor = 1; // Every patient needs 1 doctor
      const needOT = (reqObj.severity?.toLowerCase() === "critical" || reqObj.priority === "Critical" || reqObj.priority === 1 || reqObj.priority === "1") ? 1 : 0;

      const requestedVector = [needICU, needOxygen, needVentilator, needDoctor, needOT];

      // 3. Simple capacity validation check first (Safety Pre-check)
      const currentAvailable = [
        Number(res.availableICU ?? 25),
        Number(res.availableOxygen ?? 80),
        Number(res.availableVentilators ?? 15),
        Number(res.availableDoctors ?? 40),
        Number(res.availableOT ?? 5)
      ];

      for (let i = 0; i < 5; i++) {
        if (requestedVector[i] > currentAvailable[i]) {
          // If we don't have enough resources even for the immediate next step, it's unsafe!
          await updateDoc(reqRef, {
            deadlockRisk: true,
            bankerStatus: "unsafe",
            status: "waiting_resource",
            lastCheckAt: new Date().toISOString()
          });
          return {
            success: false,
            isUnsafe: true,
            message: "Deadlock risk detected! Cannot assign patient at this moment due to insufficient available resources."
          };
        }
      }

      // 4. Implement complete Banker's safety state evaluation
      // All active requests assigned or admitted to this hospital (excluding completed and cancelled)
      const activeHospRequests = requests.filter(r => 
        r.assignedHospitalId === hospitalId && 
        r.id !== requestId &&
        r.status !== "completed" && r.status !== "cancelled" && 
        r.status !== "Completed" && r.status !== "Cancelled"
      );

      // Add the tentative patient to this list
      const tentativeList = [...activeHospRequests, { ...reqObj, assignedHospitalId: hospitalId, status: "ambulance_assigned" }];

      // Map processes for Banker's evaluation
      const processes = tentativeList.map(p => {
        const pICU = p.needICU || p.requestedResources?.icu ? 1 : 0;
        const pOxygen = p.needOxygen || p.requestedResources?.oxygen ? 1 : 0;
        const pVentilator = p.needVentilator || p.requestedResources?.ventilator ? 1 : 0;
        const pDoctor = 1;
        const pOT = (p.severity?.toLowerCase() === "critical" || p.priority === "Critical" || p.priority === 1 || p.priority === "1") ? 1 : 0;

        const maxNeed = [pICU, pOxygen, pVentilator, pDoctor, pOT];
        
        // If they are physically admitted, they hold resources.
        // Otherwise, they are en-route/assigned holding [0,0,0,0,0] tentatively
        const isAdmitted = p.status === "admitted" || p.status === "Admitted";
        const allocation = isAdmitted ? [...maxNeed] : [0, 0, 0, 0, 0];
        const remainingNeed = maxNeed.map((maxV, index) => Math.max(0, maxV - allocation[index]));

        return {
          id: p.id || p.requestId,
          name: p.patientName || "Casualty",
          allocation,
          maxNeed,
          need: remainingNeed
        };
      });

      // Total capacity of the hospital
      const totalCapacity = [
        Number(res.totalICU ?? 25),
        Number(res.totalOxygen ?? 80),
        Number(res.totalVentilators ?? 15),
        Number(res.totalDoctors ?? 40),
        Number(res.totalOT ?? 5)
      ];

      // Calculate vector Work (Total minus currently allocated to admitted patients)
      let Work = [...totalCapacity];
      processes.forEach(p => {
        for (let r = 0; r < 5; r++) {
          Work[r] -= p.allocation[r];
        }
      });
      Work = Work.map(v => Math.max(0, v));

      // Simulate safety sequence search of Banker's Algorithm
      const Finish = {};
      processes.forEach(p => {
        Finish[p.id] = false;
      });

      let isSafe = true;
      let safeSeq = [];

      for (let step = 0; step < processes.length; step++) {
        let found = false;
        for (const p of processes) {
          if (!Finish[p.id]) {
            let canBeSatisfied = true;
            for (let r = 0; r < 5; r++) {
              if (p.need[r] > Work[r]) {
                canBeSatisfied = false;
                break;
              }
            }
            if (canBeSatisfied) {
              for (let r = 0; r < 5; r++) {
                Work[r] += p.allocation[r];
              }
              Finish[p.id] = true;
              found = true;
              safeSeq.push(p.name);
              break;
            }
          }
        }
        if (!found) {
          isSafe = false;
          break;
        }
      }

      if (!isSafe) {
        // Unsafe State -> Deny assignment, flag deadlockRisk, change status to waiting_resource
        await updateDoc(reqRef, {
          deadlockRisk: true,
          bankerStatus: "unsafe",
          status: "waiting_resource",
          lastCheckAt: new Date().toISOString()
        });

        await addDoc(collection(db, "notifications"), {
          userId: "all",
          title: "Deadlock Risk Warning Raised",
          message: `Denied assignment for patient ${reqObj.patientName}: unsafe deadlock hazard.`,
          type: "alert",
          read: false,
          createdAt: new Date().toISOString()
        });

        return {
          success: false,
          isUnsafe: true,
          message: "Deadlock risk detected! Cannot assign patient at this moment."
        };
      }

      // Safe state! Assign ambulance and update database
      const selectedAmbulance = ambulances.find(a => a.id === ambulanceId);
      const selectedHospital = hospitals.find(h => h.id === hospitalId);
      
      const opId = selectedAmbulance?.operatorId || "operator01@gmail.com";
      const opName = selectedAmbulance?.driverName || "Kamil Ahsan";
      const ambPlate = selectedAmbulance?.vehicleNumber || selectedAmbulance?.plateNumber || selectedAmbulance?.plate || "";
      const hospName = selectedHospital?.hospitalName || selectedHospital?.name || "Dhaka Medical Complex";

      await updateDoc(reqRef, {
        status: "ambulance_assigned",
        assignedAmbulanceId: ambulanceId,
        assignedAmbulancePlate: ambPlate,
        assignedOperatorId: opId,
        assignedOperatorName: opName,
        assignedHospitalId: hospitalId,
        assignedHospitalName: hospName,
        dispatchStartedAt: serverTimestamp(),
        deadlockRisk: false,
        bankerStatus: "safe",
        lastCheckAt: new Date().toISOString()
      });

      // Real-time Chat Room Updates: Associate operator & write system messages
      try {
        const chatRoomId = "room_" + requestId;
        await setDoc(doc(db, "chatRooms", chatRoomId), {
          operatorId: opId,
        }, { merge: true });

        const timestampNow = new Date().toISOString();
        const baseTime = Date.now();
        
        await setDoc(doc(db, "messages", "msg_sys_amb_" + baseTime), {
          messageId: "msg_sys_amb_" + baseTime,
          roomId: chatRoomId,
          senderId: "system",
          senderRole: "system",
          text: `Ambulance Assigned: Vehicle ${ambPlate}, driven by ${opName}, has been assigned to this emergency.`,
          timestamp: timestampNow,
          read: false
        });

        await setDoc(doc(db, "messages", "msg_sys_opr_" + (baseTime + 1)), {
          messageId: "msg_sys_opr_" + (baseTime + 1),
          roomId: chatRoomId,
          senderId: "system",
          senderRole: "system",
          text: `Operator Joined: ${opName} is connected to this room.`,
          timestamp: timestampNow,
          read: false
        });

        await setDoc(doc(db, "messages", "msg_sys_hsp_" + (baseTime + 2)), {
          messageId: "msg_sys_hsp_" + (baseTime + 2),
          roomId: chatRoomId,
          senderId: "system",
          senderRole: "system",
          text: `Hospital Assigned: Patient allocated to ${hospName}. Resources reserved safely.`,
          timestamp: timestampNow,
          read: false
        });
      } catch (err) {
        console.warn("Failed to write assignment chat logs:", err);
      }

      // Reserve resources from Firestore for the assigned patient immediately
      const hResourceRef = doc(db, "resources", hospitalId);
      const nextAvailable = [
        Math.max(0, currentAvailable[0] - needICU),
        Math.max(0, currentAvailable[1] - needOxygen),
        Math.max(0, currentAvailable[2] - needVentilator),
        Math.max(0, currentAvailable[3] - needDoctor),
        Math.max(0, currentAvailable[4] - needOT)
      ];

      await setDoc(hResourceRef, {
        availableICU: nextAvailable[0],
        availableOxygen: nextAvailable[1],
        availableVentilators: nextAvailable[2],
        availableDoctors: nextAvailable[3],
        availableOT: nextAvailable[4],
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const ambRef = doc(db, "ambulances", ambulanceId);
      await updateDoc(ambRef, {
        status: "assigned"
      });

      // Log allocation and safety sequences
      await addDoc(collection(db, "allocations"), {
        requestId,
        hospitalId,
        availableResources: currentAvailable,
        maxNeed: [needICU, needOxygen, needVentilator, 1, needOT],
        allocation: requestedVector,
        need: [0, 0, 0, 0, 0],
        safeState: true,
        safeSequence: safeSeq,
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, "notifications"), {
        userId: "all",
        title: "Fleet Rescue Dispatch Approved",
        message: `Dispatched ${ambPlate} - Banker's Approved! Safe Sequence: ${safeSeq.join(" → ")}`,
        type: "success",
        read: false,
        createdAt: new Date().toISOString()
      });

      return { success: true, isSafe: true };
    } catch (e) {
      console.log("Dispatch error: ", e);
      return { success: false, message: e.message };
    }
  };

  // Operator vehicle states declarer
  const handleOperatorStatusUpdate = async (ambulanceId, status, locKey) => {
    try {
      const ambRef = doc(db, "ambulances", ambulanceId);
      const LOCATION_COORDINATES = {
        mirpur: { lat: 23.8041, lng: 90.3525 },
        dhanmondi: { lat: 23.7461, lng: 90.3742 },
        shahbagh: { lat: 23.7375, lng: 90.3980 },
        uttara: { lat: 23.8759, lng: 90.3795 },
        gulshan: { lat: 23.7925, lng: 90.4178 }
      };

      const coords = LOCATION_COORDINATES[locKey?.toLowerCase()] || null;
      const updatePayload = {
        status,
        location: locKey,
        currentLocKey: locKey
      };

      if (coords) {
        updatePayload.coordinates = coords;
        updatePayload.lat = coords.lat;
        updatePayload.lng = coords.lng;
      }

      await updateDoc(ambRef, updatePayload);
      return { success: true };
    } catch (e) {
      console.log("Operator update error:", e);
      return { success: false };
    }
  };

  // Operator incident state controls
  const handleOperatorRequestUpdate = async (requestId, status) => {
    try {
      const reqRef = doc(db, "emergencyRequests", requestId);
      const reqObj = requests.find(r => r.id === requestId);
      
      const isFinishingStatus = 
        status === "completed" || 
        status === "admitted" || 
        status === "Completed" || 
        status === "Admitted";

      const updateFields = { status };

      if (isFinishingStatus) {
        const normalizedStatus = status.toLowerCase();
        updateFields.status = normalizedStatus;
        updateFields.completedAt = serverTimestamp();
        updateFields.reachedHospitalAt = serverTimestamp();
        updateFields.progressStep = normalizedStatus;
        updateFields.operatorId = currentUser?.uid || "";
        updateFields.operatorName = currentUser?.name || currentUser?.driverName || "Operator";
        updateFields.ambulanceStatus = "available";
      }

      await updateDoc(reqRef, updateFields);

      // Write system messages for operator request status transitions
      try {
        const chatRoomId = "room_" + requestId;
        const timestampNow = new Date().toISOString();
        const baseTime = Date.now();
        const patientName = reqObj?.patientName || "Patient";
        const hospName = reqObj?.assignedHospitalName || "Hospital";

        let text = "";
        let writeMessage = false;

        const normalizedStatus = status.toLowerCase();
        if (normalizedStatus === "patient picked up" || normalizedStatus === "patient_picked") {
          text = `Patient Picked Up: ${patientName} has been successfully secured and picked up by the ambulance driver.`;
          writeMessage = true;
        } else if (normalizedStatus === "admitted") {
          text = `Patient Admitted: ${patientName} has been safely admitted into ${hospName}. Resources transitioned.`;
          writeMessage = true;
        } else if (normalizedStatus === "completed") {
          text = `Emergency Closed: Support incident has been successfully finished and closed.`;
          writeMessage = true;
        } else if (normalizedStatus === "cancelled") {
          text = `Emergency Cancelled: Support chat room closed.`;
          writeMessage = true;
        } else if (normalizedStatus === "on route" || normalizedStatus === "on_route") {
          text = `Transit Started: Ambulance is actively moving on route to patient's address block.`;
          writeMessage = true;
        } else if (normalizedStatus === "arrived at hospital" || normalizedStatus === "reached_hospital") {
          text = `Arrived at Hospital: Emergency vehicle has reached the admission desk of ${hospName}.`;
          writeMessage = true;
        }

        if (writeMessage) {
          await setDoc(doc(db, "messages", "msg_sys_stat_" + baseTime), {
            messageId: "msg_sys_stat_" + baseTime,
            roomId: chatRoomId,
            senderId: "system",
            senderRole: "system",
            text,
            timestamp: timestampNow,
            read: false
          });
        }
      } catch (err) {
        console.warn("Failed to write status update chat logs:", err);
      }

      // Releasing clinical resources back to hospital reserves if completed or cancelled
      if (reqObj && reqObj.assignedHospitalId && (status.toLowerCase() === "completed" || status.toLowerCase() === "cancelled")) {
        const hId = reqObj.assignedHospitalId;
        const resRef = doc(db, "resources", hId);
        const resObj = resources.find(r => r.hospitalId === hId);
        if (resObj) {
          const needICU = reqObj.needICU || reqObj.requestedResources?.icu ? 1 : 0;
          const needOxygen = reqObj.needOxygen || reqObj.requestedResources?.oxygen ? 1 : 0;
          const needVentilator = reqObj.needVentilator || reqObj.requestedResources?.ventilator ? 1 : 0;
          const needDoctor = 1;
          const needOT = (reqObj.severity?.toLowerCase() === "critical" || reqObj.priority === "Critical" || reqObj.priority === 1 || reqObj.priority === "1") ? 1 : 0;

          await setDoc(resRef, {
            availableICU: Math.min(resObj.totalICU || 25, (Number(resObj.availableICU) || 0) + needICU),
            availableOxygen: Math.min(resObj.totalOxygen || 80, (Number(resObj.availableOxygen) || 0) + needOxygen),
            availableVentilators: Math.min(resObj.totalVentilators || 15, (Number(resObj.availableVentilators) || 0) + needVentilator),
            availableDoctors: Math.min(resObj.totalDoctors || 40, (Number(resObj.availableDoctors) || 0) + needDoctor),
            availableOT: Math.min(resObj.totalOT || 5, (Number(resObj.availableOT) || 0) + needOT),
            updatedAt: new Date().toISOString()
          }, { merge: true });

          await addDoc(collection(db, "notifications"), {
            userId: "all",
            title: "Hospital Resources Released",
            message: `Emergency completed for ${reqObj.patientName || "Casualty"}. Resources successfully freed!`,
            type: "success",
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      }

      const activeReq = requests.find(r => r.id === requestId);
      if (activeReq && activeReq.assignedAmbulanceId) {
        const ambRef = doc(db, "ambulances", activeReq.assignedAmbulanceId);
        let ambStatus = "";

        if (status === "On Route") {
          ambStatus = "On Route";
        } else if (status === "Patient Picked Up") {
          ambStatus = "Patient Picked";
        } else if (status === "Arrived at Hospital") {
          ambStatus = "Reached Hospital";
        } else if (isFinishingStatus) {
          ambStatus = "available";
        }

        if (ambStatus) {
          let ambPayload = { status: ambStatus };
          if (isFinishingStatus) {
            const curAmbObj = ambulances.find(a => a.id === activeReq.assignedAmbulanceId);
            const currentDelivered = curAmbObj?.deliveredToday || 0;
            ambPayload = {
              status: "available",
              currentIncidentId: null,
              lastCompletedAt: serverTimestamp(),
              deliveredToday: currentDelivered + 1
            };
          }
          await updateDoc(ambRef, ambPayload);
        }
      }
      return { success: true };
    } catch (e) {
      console.log("Operator update request error:", e);
      return { success: false };
    }
  };

  // Bankers claim checker: validates safety and logs to Firestore for 5 clinical resources
  const handleClaimVerify = async (hospitalId, claimVector) => {
    const avail = bankerMatrix.available || [15, 25, 12, 10, 5];
    const currentNeed = bankerMatrix.need[hospitalId] || [0, 0, 0, 0, 0];

    for (let i = 0; i < claimVector.length; i++) {
      if (claimVector[i] > currentNeed[i]) {
        return { success: false, isSafe: false, message: `Vector overload! Requested bounds exceed declared peak need limit.` };
      }
      if (claimVector[i] > avail[i]) {
        return { success: false, isSafe: false, message: `Lack of buffer reserves! Insufficient active resources to clear safety parameters.` };
      }
    }

    const nextAvailable = avail.map((v, i) => v - claimVector[i]);
    const nextAlloc = {
      ...bankerMatrix.allocation,
      [hospitalId]: (bankerMatrix.allocation[hospitalId] || [0, 0, 0, 0, 0]).map((v, i) => v + claimVector[i])
    };
    const nextNeed = {
      ...bankerMatrix.need,
      [hospitalId]: (bankerMatrix.need[hospitalId] || [0, 0, 0, 0, 0]).map((v, i) => Math.max(0, v - claimVector[i]))
    };

    const processes = Object.keys(bankerMatrix.maxNeed);
    let Work = [...nextAvailable];
    let Finish = {};
    processes.forEach(p => Finish[p] = false);

    let isSafe = true;
    let safeSeq = [];
    
    for (let step = 0; step < processes.length; step++) {
      let foundProcess = false;
      for (const p of processes) {
        if (!Finish[p]) {
          let canAllocate = true;
          const pNeed = p === hospitalId ? (nextNeed[p] || [0, 0, 0, 0, 0]) : (bankerMatrix.need[p] || [0, 0, 0, 0, 0]);
          for (let r = 0; r < claimVector.length; r++) {
            if (pNeed[r] > Work[r]) {
              canAllocate = false;
              break;
            }
          }
          if (canAllocate) {
            const allocVec = nextAlloc[p] || [0, 0, 0, 0, 0];
            for (let r = 0; r < claimVector.length; r++) {
              Work[r] += allocVec[r];
            }
            Finish[p] = true;
            foundProcess = true;
            safeSeq.push(p);
            break;
          }
        }
      }
      if (!foundProcess) {
        isSafe = false;
        break;
      }
    }

    const activeInc = requests.find(r => r.assignedHospitalId === hospitalId && r.status !== "completed" && r.status !== "admitted" && r.status !== "Completed" && r.status !== "Admitted" && r.status !== "Cancelled") || null;
    const reqIdForLog = activeInc ? activeInc.id : "req_alloc_" + Date.now();

    // Save allocation results into allocations in Firestore
    await addDoc(collection(db, "allocations"), {
      requestId: reqIdForLog,
      hospitalId,
      availableResources: nextAvailable,
      maxNeed: bankerMatrix.maxNeed[hospitalId] || [0, 0, 0, 0, 0],
      allocation: nextAlloc[hospitalId] || [0, 0, 0, 0, 0],
      need: bankerMatrix.need[hospitalId] || [0, 0, 0, 0, 0],
      safeState: isSafe,
      safeSequence: safeSeq,
      createdAt: new Date().toISOString()
    });

    if (isSafe) {
      // Apply allocation directly in Firestore hospital resources doc
      const hResourceRef = doc(db, "resources", hospitalId);
      const hostHospital = hospitals.find(h => h.id === hospitalId);
      const dbRes = resources.find(r => r.hospitalId === hospitalId);
      if (hostHospital) {
        await setDoc(hResourceRef, {
          availableICU: Math.max(0, (hostHospital.icuBeds?.total || 25) - nextAlloc[hospitalId][0]),
          availableOxygen: Math.max(0, (hostHospital.oxygenCylinders?.total || 80) - nextAlloc[hospitalId][1]),
          availableVentilators: Math.max(0, (hostHospital.ventilators?.total || 15) - nextAlloc[hospitalId][2]),
          availableDoctors: Math.max(0, (dbRes?.totalDoctors || 40) - nextAlloc[hospitalId][3]),
          availableOT: Math.max(0, (hostHospital.operationTheaters?.total || 5) - nextAlloc[hospitalId][4]),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      if (activeInc) {
        await updateDoc(doc(db, "emergencyRequests", activeInc.id), {
          status: "admitted"
        });
      }

      await addDoc(collection(db, "notifications"), {
        userId: "all",
        title: "Banker's Safety Cleared",
        message: `Allocated safe pool resources to hosp_${hospitalId.slice(-4)}`,
        type: "success",
        read: false,
        createdAt: new Date().toISOString()
      });

      return { success: true, isSafe: true, message: "Resource allocation approved perfectly! Safety sequences preserved." };
    } else {
      if (activeInc) {
        await updateDoc(doc(db, "emergencyRequests", activeInc.id), {
          status: "waiting_resource"
        });
      }
      return { success: false, isSafe: false, message: "Resource claim DENIED! Unsafe deadlock condition detected." };
    }
  };

  // Queue scheduler execution algorithm core
  const handleRunScheduler = async (algorithm, timeQuantum) => {
    const qt = timeQuantum ? Number(timeQuantum) : 2;
    
    // 1. Dynamic load of all emergency requests from Firestore collection: emergencyRequests
    let snapshot = null;
    try {
      snapshot = await getDocs(collection(db, "emergencyRequests"));
    } catch (e) {
      console.error("Failed to fetch emergency requests in scheduler:", e);
    }

    let allFreshRequests = [];
    if (snapshot) {
      snapshot.forEach((d) => {
        allFreshRequests.push({ ...d.data(), id: d.id });
      });
    } else {
      allFreshRequests = requests || [];
    }

    // Fit only requests needing a scheduler rotation
    const pendingJobsFiltered = allFreshRequests.filter(r => 
      r.status === "pending" || 
      r.status === "ambulance_assigned" || 
      r.status === "hospital_assigned"
    );
    
    if (pendingJobsFiltered.length === 0) {
      const emptyRes = { success: true, message: "Active incidents queue is empty.", results: [], stats: {
        algorithm, avgWaitingTime: 0, avgTurnaroundTime: 0, avgResponseTime: 0, cpuUtilization: 0, fairnessIndex: 1
      }};
      setSchedulerTimeline([]);
      setSchedulerResults([]);
      setSchedulerStats(emptyRes.stats);
      return emptyRes;
    }

    let jobs = pendingJobsFiltered.map((r, i) => {
      const pName = r.patientName || "Emergency Caller";
      
      // Select appropriate arrivalTime
      let arrivalValue = i;
      if (r.arrivalTime !== undefined && r.arrivalTime !== null) {
        arrivalValue = Number(r.arrivalTime);
      } else if (r.arrival !== undefined && r.arrival !== null) {
        arrivalValue = Number(r.arrival);
      }

      // Select appropriate burstTime / estimatedServiceTime
      let serviceTime = 4;
      if (r.estimatedServiceTime !== undefined && r.estimatedServiceTime !== null) {
        serviceTime = Number(r.estimatedServiceTime);
      } else if (r.burstTime !== undefined && r.burstTime !== null) {
        serviceTime = Number(r.burstTime);
      }

      // Priority calculation
      let priValue = 3;
      if (r.priorityValue !== undefined && r.priorityValue !== null) {
        priValue = Number(r.priorityValue);
      } else if (r.priority !== undefined && r.priority !== null) {
        priValue = Number(r.priority);
      } else if (r.severity === "CRITICAL" || r.severity === "critical") {
        priValue = 1;
      } else if (r.severity === "HIGH" || r.severity === "high") {
        priValue = 2;
      }

      return {
        id: r.id || r.requestId || `gen_${i}_${Date.now()}`,
        patientName: pName,
        emergencyCategory: r.emergencyCategory || r.emergencyType || "General Emergency",
        severity: r.severity || "MEDIUM",
        arrivalTime: arrivalValue,
        estimatedServiceTime: serviceTime,
        burstTime: serviceTime,
        remainingTime: serviceTime,
        priorityValue: priValue,
        waitingTime: 0,
        turnaroundTime: 0,
        responseTime: -1,
        completedTime: 0
      };
    });

    let timeline = [];
    let currentTime = 0;
    const totalJobsCount = jobs.length;

    if (algorithm === "FCFS") {
      jobs.sort((a, b) => a.arrivalTime - b.arrivalTime);
      for (const job of jobs) {
        if (currentTime < job.arrivalTime) {
          currentTime = job.arrivalTime;
        }
        job.responseTime = currentTime - job.arrivalTime;
        job.waitingTime = currentTime - job.arrivalTime;
        
        for (let tick = 0; tick < job.burstTime; tick++) {
          timeline.push({ tick: currentTime, jobName: job.patientName, id: job.id });
          currentTime++;
        }
        job.completedTime = currentTime;
        job.turnaroundTime = job.completedTime - job.arrivalTime;
      }
    } else if (algorithm === "SJF") {
      let finished = new Set();
      while (finished.size < totalJobsCount) {
        let available = jobs.filter(j => j.arrivalTime <= currentTime && !finished.has(j.id));
        if (available.length === 0) {
          currentTime++;
          continue;
        }
        available.sort((a, b) => a.burstTime - b.burstTime);
        const nextJob = available[0];
        
        nextJob.responseTime = currentTime - nextJob.arrivalTime;
        nextJob.waitingTime = currentTime - nextJob.arrivalTime;
        
        for (let tick = 0; tick < nextJob.burstTime; tick++) {
          timeline.push({ tick: currentTime, jobName: nextJob.patientName, id: nextJob.id });
          currentTime++;
        }
        nextJob.completedTime = currentTime;
        nextJob.turnaroundTime = nextJob.completedTime - nextJob.arrivalTime;
        finished.add(nextJob.id);
      }
    } else if (algorithm === "SRTF") {
      let finished = new Set();
      while (finished.size < totalJobsCount) {
        let available = jobs.filter(j => j.arrivalTime <= currentTime && !finished.has(j.id));
        if (available.length === 0) {
          currentTime++;
          continue;
        }
        available.sort((a, b) => a.remainingTime - b.remainingTime);
        const currentJob = available[0];

        if (currentJob.responseTime === -1) {
          currentJob.responseTime = currentTime - currentJob.arrivalTime;
        }

        timeline.push({ tick: currentTime, jobName: currentJob.patientName, id: currentJob.id });
        currentJob.remainingTime--;
        currentTime++;

        if (currentJob.remainingTime === 0) {
          currentJob.completedTime = currentTime;
          currentJob.turnaroundTime = currentJob.completedTime - currentJob.arrivalTime;
          currentJob.waitingTime = currentJob.turnaroundTime - currentJob.burstTime;
          finished.add(currentJob.id);
        }
      }
    } else if (algorithm === "Priority") {
      let finished = new Set();
      while (finished.size < totalJobsCount) {
        let available = jobs.filter(j => j.arrivalTime <= currentTime && !finished.has(j.id));
        if (available.length === 0) {
          currentTime++;
          continue;
        }
        available.sort((a, b) => a.priorityValue - b.priorityValue);
        const nextJob = available[0];
        
        nextJob.responseTime = currentTime - nextJob.arrivalTime;
        nextJob.waitingTime = currentTime - nextJob.arrivalTime;
        
        for (let tick = 0; tick < nextJob.burstTime; tick++) {
          timeline.push({ tick: currentTime, jobName: nextJob.patientName, id: nextJob.id });
          currentTime++;
        }
        nextJob.completedTime = currentTime;
        nextJob.turnaroundTime = nextJob.completedTime - nextJob.arrivalTime;
        finished.add(nextJob.id);
      }
    } else if (algorithm === "RoundRobin") {
      let queue = [];
      let index = 0;
      let finished = new Set();
      jobs.sort((a, b) => a.arrivalTime - b.arrivalTime);
      
      const loadQueue = () => {
        while (index < jobs.length && jobs[index].arrivalTime <= currentTime) {
          queue.push(jobs[index]);
          index++;
        }
      };

      loadQueue();
      if (queue.length === 0 && index < jobs.length) {
        currentTime = jobs[index].arrivalTime;
        loadQueue();
      }

      while (finished.size < totalJobsCount) {
        if (queue.length === 0) {
          currentTime++;
          loadQueue();
          continue;
        }

        const currentJob = queue.shift();
        if (currentJob.responseTime === -1) {
          currentJob.responseTime = currentTime - currentJob.arrivalTime;
        }

        const runTime = Math.min(qt, currentJob.remainingTime);
        for (let i = 0; i < runTime; i++) {
          timeline.push({ tick: currentTime, jobName: currentJob.patientName, id: currentJob.id });
          currentTime++;
        }
        currentJob.remainingTime -= runTime;
        loadQueue();

        if (currentJob.remainingTime > 0) {
          queue.push(currentJob);
        } else {
          currentJob.completedTime = currentTime;
          currentJob.turnaroundTime = currentJob.completedTime - currentJob.arrivalTime;
          currentJob.waitingTime = currentJob.turnaroundTime - currentJob.burstTime;
          finished.add(currentJob.id);
        }
      }
    }

    const totalWaitingTime = jobs.reduce((sum, j) => sum + Math.max(0, j.waitingTime), 0);
    const totalTurnaroundTime = jobs.reduce((sum, j) => sum + Math.max(0, j.turnaroundTime), 0);
    const totalResponseTime = jobs.reduce((sum, j) => sum + Math.max(0, j.responseTime), 0);

    const avgWaitingTime = Number((totalWaitingTime / totalJobsCount).toFixed(2));
    const avgTurnaroundTime = Number((totalTurnaroundTime / totalJobsCount).toFixed(2));
    const avgResponseTime = Number((totalResponseTime / totalJobsCount).toFixed(2));
    const cpuUtilization = 100;
    const fairnessIndex = Number((1 / (1 + (avgWaitingTime / 20))).toFixed(2));

    const finalRes = {
      success: true,
      algorithm,
      results: jobs,
      timeline,
      stats: {
        algorithm,
        avgWaitingTime,
        avgTurnaroundTime,
        avgResponseTime,
        cpuUtilization,
        fairnessIndex
      }
    };

    setSchedulerTimeline(timeline);
    setSchedulerResults(jobs);
    setSchedulerStats(finalRes.stats);

    // Identify the first patient ID in the generated queue
    const orderedJobIds = [];
    for (const t of timeline) {
      if (t && t.id && !orderedJobIds.includes(t.id)) {
        orderedJobIds.push(t.id);
      }
    }
    if (orderedJobIds.length === 0 && jobs && jobs.length > 0) {
      orderedJobIds.push(jobs[0].id);
    }

    if (orderedJobIds.length > 0) {
      const firstJobId = orderedJobIds[0];
      
      // Demote current recommended ones back to "pending" if they are no longer first
      const recommendedRequests = allFreshRequests.filter(r => r.status === "recommended_for_dispatch" || r.status === "ambulance_assigned");
      for (const r of recommendedRequests) {
        if (r.id !== firstJobId) {
          try {
            const ref = doc(db, "emergencyRequests", r.id);
            await updateDoc(ref, { status: "pending" });
          } catch (e) {
            console.error("Failed to reset previous recommended status:", e);
          }
        }
      }

      // Promote the first patient to "ambulance_assigned" with dispatcher metadata
      try {
        const firstReqRef = doc(db, "emergencyRequests", firstJobId);
        await updateDoc(firstReqRef, {
          status: "ambulance_assigned",
          assignedOperatorId: "operator01@gmail.com",
          assignedOperatorEmail: "operator01@gmail.com",
          assignedOperatorName: "Kamil Ahsan",
          assignedAmbulancePlate: "Dhaka Metro-Chha-11-2091",
          assignedAmbulanceId: "amb_001",
          assignedHospitalName: "Dhaka Medical College Hospital",
          dispatchStartedAt: serverTimestamp()
        });
      } catch (e) {
        console.error("Failed to set ambulance_assigned status on first patient:", e);
      }
    }

    // 8. Save results to schedulingResults in Firestore
    await addDoc(collection(db, "schedulingResults"), {
      algorithm,
      inputRequests: jobs.map(j => ({ patientName: j.patientName, burstTime: j.burstTime, arrivalTime: j.arrivalTime })),
      sortedQueue: jobs,
      ganttChart: timeline,
      averageWaitingTime: avgWaitingTime,
      averageTurnaroundTime: avgTurnaroundTime,
      averageResponseTime: avgResponseTime,
      createdAt: new Date().toISOString()
    });

    return finalRes;
  };

  // Aging function prevents Ready Queue starvation
  const handleAgeToggle = async () => {
    try {
      const pendingJobs = requests.filter(r => r.status === "pending" || r.status === "waiting_resource");
      let promotedCount = 0;
      
      for (const req of pendingJobs) {
        const nextCounter = (req.starvationCounter || 0) + 1;
        let pVal = req.priorityValue || req.priority || 3;
        let severityValue = req.severity || "MEDIUM";

        let wasPromoted = false;
        if (nextCounter >= 2) { // lowered from 3 to 2 for instant responsive demo simulation feedback
          if (pVal > 1) {
            pVal -= 1;
            severityValue = pVal === 1 ? "CRITICAL" : (pVal === 2 ? "HIGH" : "MEDIUM");
            wasPromoted = true;
            promotedCount++;
          }
        }

        const reqRef = doc(db, "emergencyRequests", req.id);
        await updateDoc(reqRef, {
          starvationCounter: nextCounter >= 2 ? 0 : nextCounter,
          priorityValue: pVal,
          priority: pVal,
          severity: severityValue
        });
      }

      await addDoc(collection(db, "notifications"), {
        userId: "all",
        title: "Starvation Aging Cycle Run",
        message: `Starvation criteria evaluated. Evaluated ${pendingJobs.length} active emergency inquiries and promoted ${promotedCount} patients.`,
        type: "info",
        read: false,
        createdAt: new Date().toISOString()
      });

      // Always force-refresh the scheduler queue layout so metrics react instantly
      await handleRunScheduler("Priority");

      return { success: true, pendingCount: pendingJobs.length, promotedCount };
    } catch (e) {
      console.log("Starvation aging execution error: ", e);
      return { success: false, error: e.message || e };
    }
  };

  // Disaster simulations
  const handleTriggerDisaster = async (scenario) => {
    let disasterRequests = [];
    let scenarioTitle = "Disaster Incident";
    let locationName = "Dhaka Core";

    if (scenario === "bus") {
      scenarioTitle = "Heavy Highway Bus Collision";
      locationName = "Utholi, Manikganj Highway";
      disasterRequests = [
        { patientName: "Jashim Uddin", phone: "017-Bus1", emergencyType: "Accident Emergency", symptoms: "Multiple compound fractures, internal bleeding", severity: "CRITICAL", needICU: true, needOxygen: true, needVentilator: true },
        { patientName: "Ayesha Bibi", phone: "017-Bus2", emergencyType: "Accident Emergency", symptoms: "Head trauma, unconsciousness", severity: "CRITICAL", needICU: true, needOxygen: true, needVentilator: true },
        { patientName: "Raju Baisu", phone: "017-Bus3", emergencyType: "Accident Emergency", symptoms: "Shattered shoulder, shock", severity: "HIGH", needICU: false, needOxygen: true, needVentilator: false }
      ];
    } else if (scenario === "launch") {
      scenarioTitle = "Sadarghat Launch Capsize";
      locationName = "Sadarghat River Launch Terminal";
      disasterRequests = [
        { patientName: "Siddik Mia", phone: "018-L1", emergencyType: "General Emergency", symptoms: "Near drowning water recovery, asphyxia", severity: "CRITICAL", needICU: true, needOxygen: true, needVentilator: true },
        { patientName: "Salma Begum", phone: "018-L2", emergencyType: "General Emergency", symptoms: "Hypothermia and shock", severity: "HIGH", needICU: false, needOxygen: true, needVentilator: false }
      ];
    } else if (scenario === "fire") {
      scenarioTitle = "Gazipur Factory Fire Rescue";
      locationName = "Industrial Zone, Gazipur";
      disasterRequests = [
        { patientName: "Kabir Hossen", phone: "019-F1", emergencyType: "Fire Burn Injury", symptoms: "3rd-degree severe body burns, toxic smoke inhalation", severity: "CRITICAL", needICU: true, needOxygen: true, needVentilator: true },
        { patientName: "Faridul Haque", phone: "019-F2", emergencyType: "Fire Burn Injury", symptoms: "Smoke suffocation, critical breathing failure", severity: "CRITICAL", needICU: false, needOxygen: true, needVentilator: true }
      ];
    }

    try {
      for (const d of disasterRequests) {
        const requestId = "dis_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        let priorityValue = d.severity === "CRITICAL" ? 1 : 2;
        let burstTime = d.severity === "CRITICAL" ? 10 : 8;

        const newReq = {
          requestId,
          patientId: "disaster_source",
          patientName: d.patientName,
          phone: d.phone,
          emergencyType: d.emergencyType,
          symptoms: d.symptoms,
          severity: d.severity,
          location: d.location,
          needICU: d.needICU,
          needOxygen: d.needOxygen,
          needVentilator: d.needVentilator,
          priority: priorityValue,
          status: "pending",
          assignedAmbulanceId: "",
          assignedHospitalId: "",
          createdAt: new Date().toISOString(),
          // Scheduler compliance metrics
          arrivalTime: requests.length + 1,
          burstTime,
          remainingTime: burstTime,
          priorityValue,
          waitingTime: 0,
          turnaroundTime: 0,
          responseTime: 0,
          originalSeverityValue: priorityValue,
          starvationCounter: 0
        };

        await setDoc(doc(db, "emergencyRequests", requestId), newReq);
      }

      await addDoc(collection(db, "notifications"), {
        userId: "all",
        title: `🚨 DISASTER: ${scenarioTitle}`,
        message: `Mass emergency incidents active. Ready queue adapted.`,
        type: "alert",
        read: false,
        createdAt: new Date().toISOString()
      });

      return { success: true };
    } catch (e) {
      console.log("Disaster trigger failure: ", e);
      return { success: false };
    }
  };

  // --- ASSETS DYNAMIC PROVISIONING HANDLERS ---
  
  const handleAddAmbulance = async (ambulanceData) => {
    try {
      const ambId = "amb_" + Date.now();
      await setDoc(doc(db, "ambulances", ambId), {
        ambulanceId: ambId,
        vehicleNumber: ambulanceData.vehicleNumber,
        driverName: ambulanceData.driverName,
        driverPhone: ambulanceData.driverPhone,
        operatorId: ambulanceData.operatorId || "",
        division: ambulanceData.division || "Dhaka",
        district: ambulanceData.district || "Dhaka",
        area: ambulanceData.area || "Mirpur",
        location: ambulanceData.location || "Mirpur, Dhaka, Dhaka",
        coordinates: ambulanceData.coordinates || { lat: 23.8103, lng: 90.4125 },
        status: "available",
        capacity: Number(ambulanceData.capacity) || 1,
        createdAt: new Date().toISOString()
      });
      return { success: true };
    } catch (e) {
      console.log("Add fleet error: ", e);
      return { success: false };
    }
  };

  const handleAddHospital = async (hospitalData) => {
    try {
      const hospitalId = "hosp_" + Date.now();
      await setDoc(doc(db, "hospitals", hospitalId), {
        hospitalId,
        hospitalName: hospitalData.hospitalName,
        division: hospitalData.division || "Dhaka",
        district: hospitalData.district || "Dhaka",
        area: hospitalData.area || "Mirpur",
        location: hospitalData.location,
        contact: hospitalData.contact || "01755555555",
        coordinates: hospitalData.coordinates || { lat: 23.8103, lng: 90.4125 },
        status: "active",
        createdAt: new Date().toISOString()
      });

      // Match dynamic Banker's algorithms with automatic hospital resources provisioning
      await setDoc(doc(db, "resources", hospitalId), {
        hospitalId,
        totalICU: Number(hospitalData.totalICU) || 20,
        availableICU: Number(hospitalData.totalICU) || 20,
        totalOxygen: Number(hospitalData.totalOxygen) || 50,
        availableOxygen: Number(hospitalData.totalOxygen) || 50,
        totalVentilators: Number(hospitalData.totalVentilators) || 15,
        availableVentilators: Number(hospitalData.totalVentilators) || 15,
        totalDoctors: Number(hospitalData.totalDoctors) || 45,
        availableDoctors: Number(hospitalData.totalDoctors) || 45,
        totalOT: Number(hospitalData.totalOT) || 4,
        availableOT: Number(hospitalData.totalOT) || 4,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (e) {
      console.log("Add hospital error: ", e);
      return { success: false };
    }
  };

  const handleAddMedicine = async (medicineData) => {
    try {
      const medicineId = "med_" + Date.now();
      await setDoc(doc(db, "medicines", medicineId), {
        medicineId,
        name: medicineData.name,
        category: medicineData.category,
        price: Number(medicineData.price) || 150,
        stock: Number(medicineData.stock) || 50,
        description: medicineData.description || "Medical stock items",
        prescriptionRequired: !!medicineData.prescriptionRequired,
        createdAt: new Date().toISOString()
      });
      return { success: true };
    } catch (e) {
      console.log("Add medicine error: ", e);
      return { success: false };
    }
  };

  const handleRegisterBloodDonor = async (donorData) => {
    try {
      await setDoc(doc(db, "bloodDonors", currentUser.uid), {
        userId: currentUser.uid,
        name: donorData.name || currentUser.name,
        bloodGroup: donorData.bloodGroup || currentUser.bloodGroup || "O+",
        phone: donorData.phone || "01722334455",
        location: donorData.location || "Dhaka Cantt",
        availability: true,
        createdAt: new Date().toISOString()
      });
      return { success: true };
    } catch (e) {
      console.log("Register blood donor error: ", e);
      return { success: false };
    }
  };

  const handleAdminAddBloodDonor = async (donorData) => {
    try {
      const donorId = "donor_" + Date.now();
      await setDoc(doc(db, "bloodDonors", donorId), {
        userId: donorId,
        name: donorData.name,
        bloodGroup: donorData.bloodGroup,
        phone: donorData.phone,
        location: donorData.location,
        availability: donorData.availability !== undefined ? donorData.availability : true,
        createdAt: new Date().toISOString()
      });
      return { success: true };
    } catch (e) {
      console.log("Admin add donor error: ", e);
      return { success: false };
    }
  };

  // Commissioning batch helper for quick validation testing
  const handleProvisionDefaultAssets = async () => {
    try {
      // 1. Commission 5 hospitals with full dynamic Bangladesh locations and coordinate structures
      const SEED_HOSPITALS = [
        { id: "hosp1", name: "Dhaka Medical College Hospital", division: "Dhaka", district: "Dhaka", area: "Shahbagh", location: "Shahbagh, Dhaka, Dhaka", lat: 23.7375, lng: 90.3980, contact: "01711223301", icu: 40, oxygen: 100, ventilators: 25, docs: 120, ot: 10 },
        { id: "hosp2", name: "Kurmitola General Hospital", division: "Dhaka", district: "Dhaka", area: "Uttara", location: "Uttara, Dhaka, Dhaka", lat: 23.8759, lng: 90.3795, contact: "01711223302", icu: 20, oxygen: 80, ventilators: 15, docs: 60, ot: 4 },
        { id: "hosp3", name: "Suhrawardy Hospital", division: "Dhaka", district: "Dhaka", area: "Mirpur", location: "Mirpur, Dhaka, Dhaka", lat: 23.8041, lng: 90.3525, contact: "01711223303", icu: 15, oxygen: 60, ventilators: 10, docs: 50, ot: 4 },
        { id: "hosp4", name: "Evercare Hospital", division: "Dhaka", district: "Dhaka", area: "Gulshan", location: "Gulshan, Dhaka, Dhaka", lat: 23.7925, lng: 90.4178, contact: "01711223304", icu: 30, oxygen: 90, ventilators: 20, docs: 95, ot: 8 },
        { id: "hosp5", name: "BIRDEM General Hospital", division: "Dhaka", district: "Dhaka", area: "Dhanmondi", location: "Dhanmondi, Dhaka, Dhaka", lat: 23.7461, lng: 90.3742, contact: "01711223305", icu: 18, oxygen: 50, ventilators: 8, docs: 45, ot: 3 }
      ];

      for (const h of SEED_HOSPITALS) {
        const hospitalId = h.id;
        await setDoc(doc(db, "hospitals", hospitalId), {
          hospitalId,
          hospitalName: h.name,
          division: h.division,
          district: h.district,
          area: h.area,
          location: h.location,
          contact: h.contact,
          coordinates: { lat: h.lat, lng: h.lng },
          status: "active",
          createdAt: new Date().toISOString()
        });

        await setDoc(doc(db, "resources", hospitalId), {
          hospitalId,
          totalICU: h.icu,
          availableICU: h.icu,
          totalOxygen: h.oxygen,
          availableOxygen: h.oxygen,
          totalVentilators: h.ventilators,
          availableVentilators: h.ventilators,
          totalDoctors: h.docs,
          availableDoctors: h.docs,
          totalOT: h.ot,
          availableOT: h.ot,
          updatedAt: new Date().toISOString()
        });
      }

      // 2. Commission 5 ambulance fleet vehicles
      const SEED_AMBULANCES = [
        { id: "amb1", vehicleNumber: "Dhaka Metro-Chha-11-2091", driverName: "Kamil Ahsan", phone: "01511223344", division: "Dhaka", district: "Dhaka", area: "Mirpur", location: "Mirpur, Dhaka, Dhaka", lat: 23.8041, lng: 90.3525, capacity: 1 },
        { id: "amb2", vehicleNumber: "Dhaka Metro-Chha-15-4432", driverName: "Zakir Hossen", phone: "01722334455", division: "Dhaka", district: "Dhaka", area: "Dhanmondi", location: "Dhanmondi, Dhaka, Dhaka", lat: 23.7461, lng: 90.3742, capacity: 1 },
        { id: "amb3", vehicleNumber: "Dhaka Metro-Chha-12-8871", driverName: "Siddique Ali", phone: "01833445566", division: "Dhaka", district: "Dhaka", area: "Shahbagh", location: "Shahbagh, Dhaka, Dhaka", lat: 23.7375, lng: 90.3980, capacity: 1 },
        { id: "amb4", vehicleNumber: "Dhaka Metro-Chha-18-5522", driverName: "Sumon Khan", phone: "01944556677", division: "Dhaka", district: "Dhaka", area: "Uttara", location: "Uttara, Dhaka, Dhaka", lat: 23.8759, lng: 90.3795, capacity: 1 },
        { id: "amb5", vehicleNumber: "Dhaka Metro-Chha-21-9988", driverName: "Liton Das", phone: "01611224455", division: "Dhaka", district: "Dhaka", area: "Gulshan", location: "Gulshan, Dhaka, Dhaka", lat: 23.7925, lng: 90.4178, capacity: 1 }
      ];

      for (const a of SEED_AMBULANCES) {
        await setDoc(doc(db, "ambulances", a.id), {
          ambulanceId: a.id,
          vehicleNumber: a.vehicleNumber,
          driverName: a.driverName,
          driverPhone: a.phone,
          operatorId: a.id === "amb1" ? "operator01@gmail.com" : "",
          division: a.division,
          district: a.district,
          area: a.area,
          location: a.location,
          coordinates: { lat: a.lat, lng: a.lng },
          status: "available",
          capacity: a.capacity,
          createdAt: new Date().toISOString()
        });
      }

      // 3. Commission 10 store emergency medicine stock
      const SEED_MEDICINES = [
        { id: "med1", name: "Nitroglycerin Spray", category: "Heart Disease", price: 250, stock: 40, description: "Instant relief spray for acute chest pain." },
        { id: "med2", name: "EpiPen 0.3mg Auto-injector", category: "Allergy/Anaphylaxis", price: 6500, stock: 15, description: "Emergency epinephrine injector auto device." },
        { id: "med3", name: "Duolin Inhaler Respul", category: "Asthma/COPD", price: 180, stock: 120, description: "Aerosol bronchodilator for rapid relief." },
        { id: "med4", name: "Aspirin 81mg EC Tablets", category: "Blood Thinner", price: 15, stock: 200, description: "Chewable low-dose aspirin used in cardiac crisis." },
        { id: "med5", name: "Paracetamol IV Infusion 100ml", category: "Analgesic", price: 110, stock: 80, description: "Intravenous drop fever and pain controller." },
        { id: "med6", name: "Atropine Sulfate Injection", category: "Analgesic", price: 320, stock: 35, description: "Critical injection for severe bradycardia." },
        { id: "med7", name: "Morphine Injection 10mg", category: "Analgesic", price: 450, stock: 25, description: "Trauma pain management morphine injection." },
        { id: "med8", name: "Salbutamol Nebuliser Solution", category: "Asthma/COPD", price: 90, stock: 110, description: "Rescue bronchodilator inhalation solution." },
        { id: "med9", name: "Furosemide Injection 40mg", category: "Heart Disease", price: 140, stock: 55, description: "Loop diuretic for cardiac fluid loading emergencies." },
        { id: "med10", name: "Naloxone Injection 0.4mg/ml", category: "Allergy/Anaphylaxis", price: 1200, stock: 18, description: "Emergency opioid antagonist antidote formulation." }
      ];
      for (const m of SEED_MEDICINES) {
        await setDoc(doc(db, "medicines", m.id), {
          medicineId: m.id,
          name: m.name,
          category: m.category,
          price: m.price,
          stock: m.stock,
          description: m.description,
          prescriptionRequired: false,
          createdAt: new Date().toISOString()
        });
      }

      // 4. Commission 5 blood donors list
      const SEED_DONORS = [
        { id: "donor1", name: "Raihan Kabir", bloodGroup: "O+", phone: "01788776655", division: "Dhaka", district: "Dhaka", area: "Dhanmondi", location: "Dhanmondi, Dhaka, Dhaka", availability: true },
        { id: "donor2", name: "Farhana Jamil", bloodGroup: "AB-", phone: "01833445522", division: "Dhaka", district: "Dhaka", area: "Mirpur", location: "Mirpur, Dhaka, Dhaka", availability: true },
        { id: "donor3", name: "Sabbir Rahman", bloodGroup: "B+", phone: "01988992211", division: "Dhaka", district: "Dhaka", area: "Shahbagh", location: "Shahbagh, Dhaka, Dhaka", availability: true },
        { id: "donor4", name: "Tania Sultana", bloodGroup: "A-", phone: "01655667788", division: "Dhaka", district: "Dhaka", area: "Uttara", location: "Uttara, Dhaka, Dhaka", availability: true },
        { id: "donor5", name: "Mahadi Hasan", bloodGroup: "O-", phone: "01522334455", division: "Dhaka", district: "Dhaka", area: "Gulshan", location: "Gulshan, Dhaka, Dhaka", availability: true }
      ];
      for (const d of SEED_DONORS) {
        await setDoc(doc(db, "bloodDonors", d.id), {
          userId: d.id,
          name: d.name,
          bloodGroup: d.bloodGroup,
          phone: d.phone,
          division: d.division,
          district: d.district,
          area: d.area,
          location: d.location,
          availability: d.availability,
          createdAt: new Date().toISOString()
        });
      }

      // 5. Commission dynamic Bangladesh Division-Level master nodes
      const SEED_NODES = [
        { nodeId: "dhk", name: "Dhaka", lat: 23.8103, lng: 90.4125 },
        { nodeId: "ctg", name: "Chattogram", lat: 22.3569, lng: 91.7832 },
        { nodeId: "raj", name: "Rajshahi", lat: 24.3745, lng: 88.6042 },
        { nodeId: "khl", name: "Khulna", lat: 22.8456, lng: 89.5403 },
        { nodeId: "bar", name: "Barishal", lat: 22.7010, lng: 90.3535 },
        { nodeId: "syl", name: "Sylhet", lat: 24.8949, lng: 91.8687 },
        { nodeId: "rng", name: "Rangpur", lat: 25.7439, lng: 89.2752 },
        { nodeId: "mym", name: "Mymensingh", lat: 24.7471, lng: 90.4203 }
      ];
      for (const n of SEED_NODES) {
        await setDoc(doc(db, "dhakaNodes", n.nodeId), {
          nodeId: n.nodeId,
          name: n.name,
          lat: n.lat,
          lng: n.lng,
          createdAt: new Date().toISOString()
        });
      }

      // 6. Commission 5 default emergency requests representing our key patients
      const SEED_REQUESTS = [
        { id: "req_ahmed", patientName: "Ahmed Rahman", phone: "01712345678", emergencyCategory: "Stroke / Paralysis", emergencyType: "Stroke / Paralysis", division: "Dhaka", district: "Dhaka", area: "Mirpur", exactAddress: "Mirpur 10", location: "Mirpur 10, Mirpur, Dhaka, Dhaka", symptoms: "Left side weakness and slumber speech", severity: "CRITICAL", arrivalTime: 1, estimatedServiceTime: 5, status: "pending" },
        { id: "req_nusrat", patientName: "Nusrat Jahan", phone: "01812345679", emergencyCategory: "Fire Burn Injury", emergencyType: "Fire Burn Injury", division: "Dhaka", district: "Dhaka", area: "Dhanmondi", exactAddress: "Dhanmondi 32", location: "Dhanmondi 32, Dhanmondi, Dhaka, Dhaka", symptoms: "Chemical burn on hand", severity: "HIGH", arrivalTime: 3, estimatedServiceTime: 4, status: "pending" },
        { id: "req_tanvir", patientName: "Tanvir Ahmed", phone: "01912345680", emergencyCategory: "Highway Accident", emergencyType: "Highway Accident", division: "Dhaka", district: "Dhaka", area: "Shahbagh", exactAddress: "Shahbagh Intersection", location: "Shahbagh Intersection, Shahbagh, Dhaka, Dhaka", symptoms: "Mild head injury from rickshaw collision", severity: "MEDIUM", arrivalTime: 4, estimatedServiceTime: 6, status: "pending" },
        { id: "req_farhana", patientName: "Farhana Begum", phone: "01612345681", emergencyCategory: "Pregnancy Labor Obstetric", emergencyType: "Pregnancy Labor Obstetric", division: "Dhaka", district: "Dhaka", area: "Uttara", exactAddress: "Uttara Sector 4", location: "Uttara Sector 4, Uttara, Dhaka, Dhaka", symptoms: "Active labor pains", severity: "HIGH", arrivalTime: 5, estimatedServiceTime: 3, status: "pending" },
        { id: "req_mehedi", patientName: "Mehedi Hasan", phone: "01512345682", emergencyCategory: "General High Emergency", emergencyType: "General High Emergency", division: "Dhaka", district: "Dhaka", area: "Gulshan", exactAddress: "Gulshan 2 Circle", location: "Gulshan 2 Circle, Gulshan, Dhaka, Dhaka", symptoms: "Severe chest oppression and difficulty breathing", severity: "CRITICAL", arrivalTime: 6, estimatedServiceTime: 5, status: "pending" }
      ];

      for (const req of SEED_REQUESTS) {
        let pVal = req.severity === "CRITICAL" ? 1 : (req.severity === "HIGH" ? 2 : 3);
        await setDoc(doc(db, "emergencyRequests", req.id), {
          requestId: req.id,
          patientId: "seed_patient",
          patientName: req.patientName,
          phone: req.phone,
          emergencyCategory: req.emergencyCategory,
          emergencyType: req.emergencyType,
          division: req.division,
          district: req.district,
          area: req.area,
          exactAddress: req.exactAddress,
          location: req.location,
          symptoms: req.symptoms,
          severity: req.severity,
          needICU: req.severity === "CRITICAL",
          needOxygen: true,
          needVentilator: req.severity === "CRITICAL",
          priority: pVal,
          status: req.status,
          assignedAmbulanceId: "",
          assignedHospitalId: "",
          createdAt: new Date().toISOString(),
          arrivalTime: req.arrivalTime,
          estimatedServiceTime: req.estimatedServiceTime,
          burstTime: req.estimatedServiceTime,
          remainingTime: req.estimatedServiceTime,
          priorityValue: pVal,
          waitingTime: 0,
          turnaroundTime: 0,
          responseTime: 0,
          originalSeverityValue: pVal,
          starvationCounter: 0
        });
      }

      await addDoc(collection(db, "notifications"), {
        userId: "all",
        title: "All Default Assets Commissioned",
        message: "Quick-seeded hospitals, ambulances, emergency cases, blood groups, and medicine stocks in Firestore.",
        type: "success",
        read: false,
        createdAt: new Date().toISOString()
      });

      return { success: true };
    } catch (e) {
      console.log("Error provisioning default dataset: ", e);
      throw e;
    }
  };

  const handleResetDemoData = async (deleteStaticAsWell = false) => {
    try {
      const collectionsToClear = ["emergencyRequests", "schedulingResults", "notifications", "gpsLogs"];
      for (const colName of collectionsToClear) {
        const snap = await getDocs(collection(db, colName));
        for (const docSnap of snap.docs) {
          try {
            await deleteDoc(doc(db, colName, docSnap.id));
          } catch (e) {
            handleFirestoreError(e, OperationType.DELETE, `${colName}/${docSnap.id}`);
          }
        }
      }

      if (deleteStaticAsWell) {
        const staticCollections = ["hospitals", "resources", "ambulances", "medicines", "bloodDonors", "dhakaNodes"];
        for (const colName of staticCollections) {
          const snap = await getDocs(collection(db, colName));
          for (const docSnap of snap.docs) {
            try {
              await deleteDoc(doc(db, colName, docSnap.id));
            } catch (e) {
              handleFirestoreError(e, OperationType.DELETE, `${colName}/${docSnap.id}`);
            }
          }
        }
      }
      return { success: true };
    } catch (e) {
      console.log("Error resetting database:", e);
      throw e;
    }
  };

  // Sync operator assignment metrics
  const myAmbulance = ambulances.find((a) => a.operatorId === currentUser?.uid || a.operatorId === currentUser?.email || a.id === "amb1") || null;
  const myAssignedRequests = requests.filter(
    (r) => 
      (r.assignedAmbulanceId === myAmbulance?.id || r.assignedAmbulanceId === myAmbulance?.ambulanceId) ||
      (r.assignedOperatorId === currentUser?.uid || r.operatorId === currentUser?.uid) ||
      (r.assignedOperatorEmail === currentUser?.email)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* Role-Based Login Modal overlay */}
      {showLoginModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl my-8">
            <Auth 
              theme={theme}
              setTheme={setTheme}
              initialRole={initialModalRole}
              onClose={() => setShowLoginModal(false)}
              onLoginSuccess={(profile) => {
                setShowLoginModal(false);
                if (profile.role === "hospital_admin") {
                  navigate("/admin/dashboard");
                  setActiveTab("hospital");
                } else if (profile.role === "ambulance_operator") {
                  navigate("/ambulance/dashboard");
                  setActiveTab("operator");
                } else {
                  navigate("/user/dashboard");
                  setActiveTab("patient");
                }
              }} 
            />
          </div>
        </div>
      )}

      <MainLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        notifications={notifications}
        theme={theme}
        setTheme={setTheme}
        onLoginClick={handleOpenLoginModal}
      >
        {/* CommandCenterMap rendered directly if databases have data (authenticated only) */}
        {currentUser && activeTab !== "home" && activeTab !== "arena" && (
          <div className="mb-6">
            <CommandCenterMap 
              selectedDivision={selectedDivision}
              selectedDistrict={selectedDistrict}
              selectedArea={selectedArea}
              setSelectedDivision={setSelectedDivision}
              setSelectedDistrict={setSelectedDistrict}
              setSelectedArea={setSelectedArea}
              hospitals={
                hospitals.filter(h => {
                  const rawRecord = rawHospitals.find(raw => raw.hospitalId === h.id);
                  if (selectedDivision && (rawRecord?.division !== selectedDivision)) return false;
                  if (selectedDistrict && (rawRecord?.district !== selectedDistrict)) return false;
                  if (selectedArea && (rawRecord?.area !== selectedArea)) return false;
                  return true;
                })
              }
              ambulances={
                ambulances.filter(a => {
                  if (selectedDivision && (a.division !== selectedDivision)) return false;
                  if (selectedDistrict && (a.district !== selectedDistrict)) return false;
                  if (selectedArea && (a.area !== selectedArea)) return false;
                  return true;
                })
              }
              activeRequests={
                requests.filter(r => r.status !== "completed" && r.status !== "admitted" && r.status !== "Completed" && r.status !== "Admitted" && r.status !== "Cancelled").filter(r => {
                  if (selectedDivision && (r.division !== selectedDivision)) return false;
                  if (selectedDistrict && (r.district !== selectedDistrict)) return false;
                  if (selectedArea && (r.area !== selectedArea)) return false;
                  return true;
                })
              }
            />
          </div>
        )}

        {/* RENDERING SWITCHBOARD */}
        {activeTab === "home" && (
          <Home 
            setActiveTab={setActiveTab} 
            currentUserRole={currentUser?.role || null} 
            onLoginClick={handleOpenLoginModal} 
          />
        )}

        {currentPath === "/user/dashboard" && (
          <ProtectedRoute allowedRoles={["patient"]} currentPath={currentPath} onNavigate={navigate}>
            {activeTab === "patient" && (
              <PatientDashboard
                requests={requests}
                onSOSSubmit={handleSOSSubmit}
                medicines={medicines}
                onOrderSubmit={handleOrderSubmit}
                bloodDonors={bloodDonors}
                onRegisterDonor={handleRegisterBloodDonor}
              />
            )}
            {activeTab === "arena" && <ComparisonArena />}
          </ProtectedRoute>
        )}

        {currentPath === "/ambulance/dashboard" && (
          <ProtectedRoute allowedRoles={["ambulance_operator"]} currentPath={currentPath} onNavigate={navigate}>
            {activeTab === "operator" && (
              <AmbulanceDashboard
                currentUser={currentUser}
                ambulance={myAmbulance}
                assignedRequests={myAssignedRequests}
                onStatusUpdate={handleOperatorStatusUpdate}
                onRequestUpdate={handleOperatorRequestUpdate}
                hospitals={hospitals}
                isBankersSafe={isBankersSafe}
                warningAlert={warningAlert}
              />
            )}
          </ProtectedRoute>
        )}

        {currentPath === "/admin/dashboard" && (
          <ProtectedRoute allowedRoles={["hospital_admin"]} currentPath={currentPath} onNavigate={navigate}>
            {activeTab === "hospital" && (
              <HospitalAdmin
                hospitals={
                  hospitals.filter(h => {
                    const rawRecord = rawHospitals.find(raw => raw.hospitalId === h.id);
                    if (selectedDivision && (rawRecord?.division !== selectedDivision)) return false;
                    if (selectedDistrict && (rawRecord?.district !== selectedDistrict)) return false;
                    if (selectedArea && (rawRecord?.area !== selectedArea)) return false;
                    return true;
                  })
                }
                ambulances={
                  ambulances.filter(a => {
                    if (selectedDivision && (a.division !== selectedDivision)) return false;
                    if (selectedDistrict && (a.district !== selectedDistrict)) return false;
                    if (selectedArea && (a.area !== selectedArea)) return false;
                    return true;
                  })
                }
                requests={
                  requests.filter(r => {
                    if (selectedDivision && (r.division !== selectedDivision)) return false;
                    if (selectedDistrict && (r.district !== selectedDistrict)) return false;
                    if (selectedArea && (r.area !== selectedArea)) return false;
                    return true;
                  })
                }
                onChangeResource={handleChangeResource}
                onAssignDispatch={handleAssignDispatch}
                onRequestUpdate={handleOperatorRequestUpdate}
                bankerMatrix={bankerMatrix}
                onClaimVerify={handleClaimVerify}
                isBankersSafe={isBankersSafe}
                bankersDemoMode={bankersDemoMode}
                onSetBankersDemoMode={handleSetBankersDemoMode}
                safeSequence={safeSequence}
                warningAlert={warningAlert}
                onRunScheduler={handleRunScheduler}
                schedulerStats={schedulerStats}
                schedulerTimeline={schedulerTimeline}
                schedulerResults={schedulerResults}
                onAgeToggle={handleAgeToggle}
                onAddAmbulance={handleAddAmbulance}
                onAddHospital={handleAddHospital}
                onAddMedicine={handleAddMedicine}
                onAddBloodDonor={handleAdminAddBloodDonor}
                onProvisionDefaults={handleProvisionDefaultAssets}
                onResetDemoData={handleResetDemoData}
              />
            )}

            {activeTab === "arena" && <ComparisonArena />}

            {activeTab === "disaster" && (
              <DisasterSimulation onTriggerDisaster={handleTriggerDisaster} />
            )}
          </ProtectedRoute>
        )}

        {currentUser && currentPath !== "/admin/dashboard" && currentPath !== "/ambulance/dashboard" && currentPath !== "/user/dashboard" && activeTab !== "home" && (
          <div className="py-12 text-center text-xs font-mono text-slate-400">
            Initializing active workspace path...
          </div>
        )}

        {currentUser && (
          <EmergencyChatSystem currentUser={currentUser} />
        )}
      </MainLayout>
    </div>
  );
}
