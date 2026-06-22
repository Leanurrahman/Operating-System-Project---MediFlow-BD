import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Server as SocketIOServer } from "socket.io";
import { 
  UserRole, 
  RequestStatus, 
  AmbulanceStatus, 
  EmergencyType, 
  Severity
} from "./src/types.js";

// Setup standard Node globals for ESM environment
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- IN-MEMORY DATABASE STATE (SIMULATED COVERS OF FIREBASE COLLECTIONS) ---
  let usersList = [
    { uid: "patient1", name: "Ahmed Rahman", email: "ahm@gmail.com", role: UserRole.PATIENT, phone: "01712345678", bloodGroup: "A+", createdAt: new Date().toISOString() },
    { uid: "operator1", name: "Rafiq Islam", email: "rafiq@gmail.com", role: UserRole.OPERATOR, phone: "01812345678", createdAt: new Date().toISOString() },
    { uid: "admin1", name: "Dr. Leanur Rahman", email: "rahmanleanur@gmail.com", role: UserRole.ADMIN, phone: "01912345678", createdAt: new Date().toISOString() }
  ];

  let ambulancesList = [
    { id: "amb1", plateNumber: "Dhaka Metro-Chha-11-2091", driverName: "Kamil Ahsan", phone: "01511223344", status: AmbulanceStatus.AVAILABLE, currentLocKey: "mirpur", type: "ICU-Support", capacity: 1 },
    { id: "amb2", plateNumber: "Dhaka Metro-Chha-15-4432", driverName: "Zakir Hossen", phone: "01722334455", status: AmbulanceStatus.AVAILABLE, currentLocKey: "dhanmondi", type: "AC", capacity: 1 },
    { id: "amb3", plateNumber: "Dhaka Metro-Chha-12-8871", driverName: "Siddique Ali", phone: "01833445566", status: AmbulanceStatus.AVAILABLE, currentLocKey: "shahbagh", type: "Non-AC", capacity: 1 },
    { id: "amb4", plateNumber: "Dhaka Metro-Chha-18-5522", driverName: "Sumon Khan", phone: "01944556677", status: AmbulanceStatus.AVAILABLE, currentLocKey: "uttara", type: "ICU-Support", capacity: 1 },
    { id: "amb5", plateNumber: "Dhaka Metro-Chha-21-9988", driverName: "Liton Das", phone: "01611224455", status: AmbulanceStatus.AVAILABLE, currentLocKey: "gulshan", type: "AC", capacity: 1 }
  ];

  let hospitalsList = [
    { id: "hosp1", name: "Dhaka Medical College Hospital", location: "Shahbagh, Dhaka", locKey: "shahbagh", distanceKm: 2.1, icuBeds: { total: 40, occupied: 32 }, oxygenCylinders: { total: 100, occupied: 78 }, ventilators: { total: 25, occupied: 19 }, operationTheaters: { total: 10, occupied: 7 }, doctors: { total: 120, active: 85 }, emergencyLoad: 4 },
    { id: "hosp2", name: "Kurmitola General Hospital", location: "Uttara, Dhaka", locKey: "uttara", distanceKm: 8.5, icuBeds: { total: 20, occupied: 18 }, oxygenCylinders: { total: 80, occupied: 74 }, ventilators: { total: 15, occupied: 14 }, operationTheaters: { total: 4, occupied: 3 }, doctors: { total: 60, active: 40 }, emergencyLoad: 2 },
    { id: "hosp3", name: "Suhrawardy Hospital", location: "Sher-e-Bangla Nagar", locKey: "sherinagar", distanceKm: 5.3, icuBeds: { total: 15, occupied: 14 }, oxygenCylinders: { total: 60, occupied: 52 }, ventilators: { total: 10, occupied: 9 }, operationTheaters: { total: 4, occupied: 2 }, doctors: { total: 50, active: 30 }, emergencyLoad: 1 },
    { id: "hosp4", name: "Evercare Hospital", location: "Bashundhara R/A", locKey: "bashundhara", distanceKm: 12.0, icuBeds: { total: 30, occupied: 20 }, oxygenCylinders: { total: 90, occupied: 65 }, ventilators: { total: 20, occupied: 12 }, operationTheaters: { total: 8, occupied: 4 }, doctors: { total: 95, active: 62 }, emergencyLoad: 0 },
    { id: "hosp5", name: "BIRDEM General Hospital", location: "Shahbagh, Dhaka", locKey: "shahbagh", distanceKm: 2.4, icuBeds: { total: 18, occupied: 16 }, oxygenCylinders: { total: 50, occupied: 48 }, ventilators: { total: 8, occupied: 7 }, operationTheaters: { total: 3, occupied: 3 }, doctors: { total: 45, active: 25 }, emergencyLoad: 3 }
  ];

  let emergencyRequestsList = [
    { id: "req1", patientName: "Farid Uddin", phone: "01711122233", emergencyType: EmergencyType.HEART_ATTACK, symptoms: "Severe chest pain and heavy breathing", severity: Severity.CRITICAL, location: "Mirpur 10", locKey: "mirpur", needIcu: true, needOxygen: true, needVentilator: true, status: RequestStatus.ON_ROUTE, createdAt: new Date(Date.now() - 15 * 60000).toISOString(), assignedAmbulanceId: "amb1", assignedHospitalId: "hosp1", arrivalTime: 1, burstTime: 6, remainingTime: 3, priorityValue: 1, waitingTime: 2, turnaroundTime: 0, responseTime: 1, originalSeverityValue: 1, starvationCounter: 0 },
    { id: "req2", patientName: "Sumaya Akter", phone: "01822233344", emergencyType: EmergencyType.ACCIDENT, symptoms: "Pedestrian collision, severe leg injury", severity: Severity.HIGH, location: "Dhanmondi 32", locKey: "dhanmondi", needIcu: false, needOxygen: true, needVentilator: false, status: RequestStatus.DISPATCHED, createdAt: new Date(Date.now() - 10 * 60000).toISOString(), assignedAmbulanceId: "amb2", assignedHospitalId: "hosp3", arrivalTime: 3, burstTime: 8, remainingTime: 8, priorityValue: 2, waitingTime: 5, turnaroundTime: 0, responseTime: 2, originalSeverityValue: 2, starvationCounter: 0 },
    { id: "req3", patientName: "Afsana Begum", phone: "01933344455", emergencyType: EmergencyType.PREGNANCY, symptoms: "Active labor complications", severity: Severity.HIGH, location: "Uttara Sector 4", locKey: "uttara", needIcu: false, needOxygen: false, needVentilator: false, status: RequestStatus.PENDING, createdAt: new Date(Date.now() - 5 * 60000).toISOString(), arrivalTime: 5, burstTime: 5, remainingTime: 5, priorityValue: 2, waitingTime: 0, turnaroundTime: 0, responseTime: 0, originalSeverityValue: 2, starvationCounter: 0 }
  ];

  let medicinesList = [
    { id: "med1", name: "Nitroglycerin Spray", category: "Heart Disease", price: 250, stock: 40, description: "Instant relief spray for acute chest pain." },
    { id: "med2", name: "EpiPen 0.3mg Auto-injector", category: "Allergy/Anaphylaxis", price: 6500, stock: 15, description: "Emergency epinephrine injector auto device." },
    { id: "med3", name: "Duolin Inhaler Respul", category: "Asthma/COPD", price: 180, stock: 120, description: "Aerosol bronchodilator for rapid relief." },
    { id: "med4", name: "Aspirin 81mg EC Tablets", category: "Blood Thinner", price: 15, stock: 200, description: "Chewable low-dose aspirin used in cardiac crisis." },
    { id: "med5", name: "Paracetamol IV Infusion 100ml", category: "Analgesic", price: 110, stock: 80, description: "Intravenous drop fever and pain controller." }
  ];

  let medicineOrdersList = [
    { id: "order1", userId: "patient1", items: [{ medicineId: "med1", name: "Nitroglycerin Spray", quantity: 1, price: 250 }], totalAmount: 250, deliveryAddress: "Mirpur 10, Block C", status: "Scheduled", createdAt: new Date().toISOString() }
  ];

  let bloodDonorsList = [
    { id: "donor1", name: "Raihan Kabir", bloodGroup: "O+", phone: "01788776655", location: "Dhanmondi", lastDonated: "2026-03-12", isAvailable: true },
    { id: "donor2", name: "Farhana Jamil", bloodGroup: "AB-", phone: "01833445522", location: "Mirpur", lastDonated: "2025-11-20", isAvailable: true },
    { id: "donor3", name: "Sabbir Rahman", bloodGroup: "B+", phone: "01988992211", location: "Shahbagh", lastDonated: "2026-05-01", isAvailable: true },
    { id: "donor4", name: "Tania Sultana", bloodGroup: "A-", phone: "01655667788", location: "Uttara", lastDonated: "2026-02-15", isAvailable: true }
  ];

  let notificationsList = [
    { id: "n1", title: "Accident Emergency Reported", message: "Sumaya Akter reported a Road Accident in Dhanmondi.", type: "alert", timestamp: new Date().toISOString() },
    { id: "n2", title: "Ambulance Dispatched", message: "Ambulance Dhaka Metro-Chha-15-4432 is on route to Dhanmondi.", type: "success", timestamp: new Date().toISOString() }
  ];

  // --- BANKERS ALGORITHM MATRIX CONFIGURATION (COVERS allocations) ---
  // Default vector lengths: 3 resource types list: [ICU, Oxygen, Ventilator]
  let bankerMatrix = {
    // Current allocations to each hospital
    allocation: {
      "hosp1": [8, 15, 6],
      "hosp2": [4, 12, 3],
      "hosp3": [2, 8, 2],
      "hosp4": [3, 10, 4],
      "hosp5": [5, 11, 2]
    },
    // Maximum demand for each hospital
    maxNeed: {
      "hosp1": [10, 20, 8],
      "hosp2": [5, 15, 4],
      "hosp3": [4, 10, 3],
      "hosp4": [6, 12, 5],
      "hosp5": [6, 14, 4]
    },
    // Available unallocated reserves in the central pool
    available: [3, 5, 2],
    // Automatically computed need: maxNeed - allocation
    need: {}
  };

  // Re-calculate needs
  const recodeNeed = () => {
    bankerMatrix.need = {};
    for (const hId in bankerMatrix.maxNeed) {
      const max = bankerMatrix.maxNeed[hId];
      const alloc = bankerMatrix.allocation[hId];
      bankerMatrix.need[hId] = max.map((val, idx) => Math.max(0, val - alloc[idx]));
    }
  };
  recodeNeed();

  // --- ENDPOINTS ---

  // User auth endpoints
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = usersList.find(u => u.email === email);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "User not found or incorrect." });
    }
  });

  app.post("/api/auth/register", (req, res) => {
    const { name, email, role, phone, bloodGroup } = req.body;
    if (usersList.some(u => u.email === email)) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }
    const newUser = {
      uid: "user_" + Date.now(),
      name,
      email,
      role: role,
      phone,
      bloodGroup,
      createdAt: new Date().toISOString()
    };
    usersList.push(newUser);
    res.json({ success: true, user: newUser });
  });

  app.get("/api/users", (req, res) => {
    res.json(usersList);
  });

  // Emergency requests endpoints (and Smart Severity Detection!)
  app.post("/api/emergencies", (req, res) => {
    const { patientName, phone, emergencyType, symptoms, location, locKey, needIcu, needOxygen, needVentilator } = req.body;
    
    // SMART SEVERITY DETECTION
    let severity = Severity.LOW;
    let priorityValue = 4;
    let burstTime = 4;
    
    const textToAnalyze = `${emergencyType} ${symptoms}`.toLowerCase();
    
    if (
      textToAnalyze.includes("chest pain") || 
      textToAnalyze.includes("heart attack") || 
      textToAnalyze.includes("unconscious") || 
      textToAnalyze.includes("not breathing") ||
      textToAnalyze.includes("cardiac") ||
      textToAnalyze.includes("stroke")
    ) {
      severity = Severity.CRITICAL;
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
      severity = Severity.HIGH;
      priorityValue = 2;
      burstTime = 8;
    } else if (
      textToAnalyze.includes("fever") || 
      textToAnalyze.includes("pain") || 
      textToAnalyze.includes("vomiting")
    ) {
      severity = Severity.MEDIUM;
      priorityValue = 3;
      burstTime = 5;
    }

    const newRequest = {
      id: "req_" + Date.now(),
      patientName: patientName || "Emergency Patient",
      phone: phone || "01700000000",
      emergencyType: emergencyType || EmergencyType.GENERAL,
      symptoms: symptoms || "No symptoms description details",
      severity,
      location: location || "Dhaka Central",
      locKey: locKey || "shahbagh",
      needIcu: !!needIcu,
      needOxygen: !!needOxygen,
      needVentilator: !!needVentilator,
      status: RequestStatus.PENDING,
      createdAt: new Date().toISOString(),
      arrivalTime: emergencyRequestsList.length + 1,
      burstTime,
      remainingTime: burstTime,
      priorityValue,
      waitingTime: 0,
      turnaroundTime: 0,
      responseTime: 0,
      originalSeverityValue: priorityValue,
      starvationCounter: 0
    };

    emergencyRequestsList.push(newRequest);

    // Create notifications for admins
    notificationsList.unshift({
      id: "n_" + Date.now(),
      title: "New Smart SOS Emergency",
      message: `${newRequest.patientName} (${newRequest.severity}) at ${newRequest.location}`,
      type: "alert",
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, emergency: newRequest });
  });

  app.get("/api/emergencies", (req, res) => {
    res.json(emergencyRequestsList);
  });

  app.patch("/api/emergencies/:id", (req, res) => {
    const { id } = req.params;
    const { status, assignedAmbulanceId, assignedHospitalId } = req.body;
    const reqIndex = emergencyRequestsList.findIndex(e => e.id === id);
    if (reqIndex !== -1) {
      const emergency = emergencyRequestsList[reqIndex];
      emergency.status = status || emergency.status;
      if (assignedAmbulanceId) {
        emergency.assignedAmbulanceId = assignedAmbulanceId;
        // Update vehicle status
        const amb = ambulancesList.find(a => a.id === assignedAmbulanceId);
        if (amb) {
          if (status === RequestStatus.COMPLETED || status === RequestStatus.ARRIVED) {
            amb.status = AmbulanceStatus.AVAILABLE;
          } else {
            amb.status = AmbulanceStatus.ASSIGNED;
          }
        }
      }
      if (assignedHospitalId) {
        emergency.assignedHospitalId = assignedHospitalId;
        // Update hospital load
        const hosp = hospitalsList.find(h => h.id === assignedHospitalId);
        if (hosp) {
          if (status === RequestStatus.COMPLETED) {
            hosp.emergencyLoad = Math.max(0, hosp.emergencyLoad - 1);
          } else {
            hosp.emergencyLoad += 1;
          }
        }
      }

      notificationsList.unshift({
        id: "n_" + Date.now(),
        title: "Emergency Request Updated",
        message: `Request for ${emergency.patientName} updated to status: ${emergency.status}`,
        type: "success",
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, emergency });
    } else {
      res.status(404).json({ success: false, message: "Emergency not found." });
    }
  });

  // Ambulances & Hospitals Listing
  app.get("/api/ambulances", (req, res) => {
    res.json(ambulancesList);
  });

  app.patch("/api/ambulances/:id", (req, res) => {
    const { id } = req.params;
    const { status, currentLocKey } = req.body;
    const amb = ambulancesList.find(a => a.id === id);
    if (amb) {
      amb.status = status || amb.status;
      amb.currentLocKey = currentLocKey || amb.currentLocKey;
      res.json({ success: true, ambulance: amb });
    } else {
      res.status(404).json({ success: false, message: "Ambulance not found." });
    }
  });

  app.get("/api/hospitals", (req, res) => {
    res.json(hospitalsList);
  });

  app.get("/api/notifications", (req, res) => {
    res.json(notificationsList);
  });

  // Medicine Store & Blood Donors
  app.get("/api/medicines", (req, res) => {
    res.json(medicinesList);
  });

  app.get("/api/medicine-orders", (req, res) => {
    res.json(medicineOrdersList);
  });

  app.post("/api/medicine-orders", (req, res) => {
    const { userId, items, totalAmount, deliveryAddress } = req.body;
    const newOrder = {
      id: "order_" + Date.now(),
      userId: userId || "patient1",
      items: items || [],
      totalAmount: totalAmount || 0,
      deliveryAddress: deliveryAddress || "Dhaka, Bangladesh",
      status: "Scheduled",
      createdAt: new Date().toISOString()
    };
    medicineOrdersList.unshift(newOrder);
    res.json({ success: true, order: newOrder });
  });

  app.get("/api/blood-donors", (req, res) => {
    res.json(bloodDonorsList);
  });

  app.post("/api/blood-donors", (req, res) => {
    const { name, bloodGroup, phone, location } = req.body;
    const newDonor = {
      id: "donor_" + Date.now(),
      name,
      bloodGroup,
      phone,
      location,
      lastDonated: "2026-06-01",
      isAvailable: true
    };
    bloodDonorsList.unshift(newDonor);
    res.json({ success: true, donor: newDonor });
  });

  // --- DISASTER SIMULATION MODE ---
  app.post("/api/simulation/disaster", (req, res) => {
    const { scenario } = req.body;
    let disasterRequests = [];
    let scenarioTitle = "Disaster Signal";
    let locationName = "Dhaka City";
    let type = EmergencyType.GENERAL;

    if (scenario === "bus") {
      scenarioTitle = "Heavy Highway Bus Collision";
      locationName = "Utholi, Manikganj Highway";
      type = EmergencyType.ACCIDENT;
      disasterRequests = [
        { id: "dis_b1", patientName: "Jashim Uddin", phone: "017-Bus1", emergencyType: EmergencyType.ACCIDENT, symptoms: "Multiple compound fractures, internal bleeding", severity: Severity.CRITICAL, location: locationName, locKey: "mirpur", needIcu: true, needOxygen: true, needVentilator: true, status: RequestStatus.PENDING, createdAt: new Date().toISOString(), arrivalTime: 10, burstTime: 9, remainingTime: 9, priorityValue: 1, waitingTime: 0, turnaroundTime: 0, responseTime: 0, originalSeverityValue: 1, starvationCounter: 0 },
        { id: "dis_b2", patientName: "Ayesha Bibi", phone: "017-Bus2", emergencyType: EmergencyType.ACCIDENT, symptoms: "Head trauma, unconsciousness", severity: Severity.CRITICAL, location: locationName, locKey: "sherinagar", needIcu: true, needOxygen: true, needVentilator: true, status: RequestStatus.PENDING, createdAt: new Date().toISOString(), arrivalTime: 10, burstTime: 8, remainingTime: 8, priorityValue: 1, waitingTime: 0, turnaroundTime: 0, responseTime: 0, originalSeverityValue: 1, starvationCounter: 0 },
        { id: "dis_b3", patientName: "Raju Baisu", phone: "017-Bus3", emergencyType: EmergencyType.ACCIDENT, symptoms: "Shattered shoulder, shock", severity: Severity.HIGH, location: locationName, locKey: "sherinagar", needIcu: false, needOxygen: true, needVentilator: false, status: RequestStatus.PENDING, createdAt: new Date().toISOString(), arrivalTime: 12, burstTime: 5, remainingTime: 5, priorityValue: 2, waitingTime: 0, turnaroundTime: 0, responseTime: 0, originalSeverityValue: 2, starvationCounter: 0 }
      ];
    } else if (scenario === "launch") {
      scenarioTitle = "Sadarghat Launch Capsize";
      locationName = "Sadarghat River Launch Terminal";
      type = EmergencyType.GENERAL;
      disasterRequests = [
        { id: "dis_l1", patientName: "Siddik Mia", phone: "018-L1", emergencyType: EmergencyType.GENERAL, symptoms: "Near drowning water recovery, asphyxia", severity: Severity.CRITICAL, location: locationName, locKey: "shahbagh", needIcu: true, needOxygen: true, needVentilator: true, status: RequestStatus.PENDING, createdAt: new Date().toISOString(), arrivalTime: 11, burstTime: 10, remainingTime: 10, priorityValue: 1, waitingTime: 0, turnaroundTime: 0, responseTime: 0, originalSeverityValue: 1, starvationCounter: 0 },
        { id: "dis_l2", patientName: "Salma Begum", phone: "018-L2", emergencyType: EmergencyType.GENERAL, symptoms: "Hypothermia and shock", severity: Severity.HIGH, location: locationName, locKey: "shahbagh", needIcu: false, needOxygen: true, needVentilator: false, status: RequestStatus.PENDING, createdAt: new Date().toISOString(), arrivalTime: 11, burstTime: 6, remainingTime: 6, priorityValue: 2, waitingTime: 0, turnaroundTime: 0, responseTime: 0, originalSeverityValue: 2, starvationCounter: 0 }
      ];
    } else if (scenario === "fire") {
      scenarioTitle = "Gazipur Factory Fire Rescue";
      locationName = "Industrial Zone, Gazipur";
      type = EmergencyType.FIRE_INJURY;
      disasterRequests = [
        { id: "dis_f1", patientName: "Kabir Hossen", phone: "019-F1", emergencyType: EmergencyType.FIRE_INJURY, symptoms: "3rd-degree severe body burns, toxic smoke inhalation", severity: Severity.CRITICAL, location: locationName, locKey: "uttara", needIcu: true, needOxygen: true, needVentilator: true, status: RequestStatus.PENDING, createdAt: new Date().toISOString(), arrivalTime: 12, burstTime: 10, remainingTime: 10, priorityValue: 1, waitingTime: 0, turnaroundTime: 0, responseTime: 0, originalSeverityValue: 1, starvationCounter: 0 },
        { id: "dis_f2", patientName: "Faridul Haque", phone: "019-F2", emergencyType: EmergencyType.FIRE_INJURY, symptoms: "Smoke suffocation, critical breathing failure", severity: Severity.CRITICAL, location: locationName, locKey: "uttara", needIcu: false, needOxygen: true, needVentilator: true, status: RequestStatus.PENDING, createdAt: new Date().toISOString(), arrivalTime: 13, burstTime: 9, remainingTime: 9, priorityValue: 1, waitingTime: 0, turnaroundTime: 0, responseTime: 0, originalSeverityValue: 1, starvationCounter: 0 }
      ];
    } else {
      res.status(400).json({ success: false, message: "Invalid scenario selection" });
      return;
    }

    // Append requests
    emergencyRequestsList = [...emergencyRequestsList, ...disasterRequests];

    // Trigger Banker matrix resource drain simulating sudden disaster load
    bankerMatrix.available[0] = Math.max(0, bankerMatrix.available[0] - 2); // deplete idle ICUs
    bankerMatrix.available[1] = Math.max(0, bankerMatrix.available[1] - 4); // deplete Oxygen cylinders
    recodeNeed();

    notificationsList.unshift({
      id: "n_dis_" + Date.now(),
      title: "🚨 DISASTER DECLARATION: " + scenarioTitle,
      message: `Critically dispatched mass resources to ${locationName}. Emergency lists updated immediately.`,
      type: "alert",
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, addedCount: disasterRequests.length, message: `Injected disaster scenarios successfully into critical OS algorithms queues!` });
  });

  // STARVATION PREVENTION & AGING CONTROLLER
  app.post("/api/simulation/aging", (req, res) => {
    let affectedCount = 0;
    // Walk over all PENDING emergencies, and increment starvation counter.
    // If starvation reaches threshold (e.g., 3), increase priority (decrease priorityValue)!
    emergencyRequestsList = emergencyRequestsList.map(item => {
      if (item.status === RequestStatus.PENDING) {
        const nextCounter = item.starvationCounter + 1;
        let pVal = item.priorityValue;
        let severityValue = item.severity;

        if (nextCounter >= 3) {
          // Promote!
          if (pVal > 1) {
            pVal -= 1;
            affectedCount++;
            severityValue = pVal === 1 ? Severity.CRITICAL : (pVal === 2 ? Severity.HIGH : Severity.MEDIUM);
          }
        }
        return {
          ...item,
          starvationCounter: nextCounter >= 3 ? 0 : nextCounter, // reset counter on promotion
          priorityValue: pVal,
          severity: severityValue
        };
      }
      return item;
    });

    if (affectedCount > 0) {
      notificationsList.unshift({
        id: "n_aging_" + Date.now(),
        title: "Starvation Aging Cycle Run",
        message: `Aging algorithm executed. Promoted ${affectedCount} critical pending patients to avoid CPU/Ambulance starvation!`,
        type: "info",
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, promoted: affectedCount });
  });

  // --- COMPUTE SCHEDULING ALGORITHMS PRE-RUN ---
  app.post("/api/simulation/schedule", (req, res) => {
    const { algorithm, timeQuantum } = req.body; // "FCFS" | "SJF" | "SRTF" | "Priority" | "RoundRobin"
    const qt = timeQuantum ? Number(timeQuantum) : 2;

    // Filter pending requests to mock schedule them
    const pendingRequests = emergencyRequestsList.slice().filter(r => r.status === RequestStatus.PENDING || r.status === RequestStatus.DISPATCHED);
    
    if (pendingRequests.length === 0) {
      return res.json({ success: true, message: "Queue is empty. No requests to schedule.", results: [], stats: {
        algorithm, avgWaitingTime: 0, avgTurnaroundTime: 0, avgResponseTime: 0, cpuUtilization: 0, fairnessIndex: 1
      }});
    }

    // Clone requests to safely run scheduling
    let jobs = pendingRequests.map((r, i) => ({
      id: r.id,
      patientName: r.patientName,
      arrivalTime: r.arrivalTime || i,
      burstTime: r.burstTime || 4,
      remainingTime: r.burstTime || 4,
      priorityValue: r.priorityValue || 3,
      waitingTime: 0,
      turnaroundTime: 0,
      responseTime: -1,
      completedTime: 0
    }));

    let timeline = [];
    let currentTime = 0;
    const totalJobsCount = jobs.length;

    if (algorithm === "FCFS") {
      // Sort by arrival time
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
    } else if (algorithm === "SJF") { // Shortest Job First - Non-preemptive
      let finished = new Set();
      while (finished.size < totalJobsCount) {
        // Find available jobs at currentTime
        let available = jobs.filter(j => j.arrivalTime <= currentTime && !finished.has(j.id));
        if (available.length === 0) {
          currentTime++;
          continue;
        }
        // Pick one with min burst time
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
    } else if (algorithm === "SRTF") { // Shortest Remaining Time First - Preemptive
      let finished = new Set();
      while (finished.size < totalJobsCount) {
        let available = jobs.filter(j => j.arrivalTime <= currentTime && !finished.has(j.id));
        if (available.length === 0) {
          currentTime++;
          continue;
        }
        // Pick minimum remaining time
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
    } else if (algorithm === "Priority") { // Priority Scheduling (Smaller value = higher priority)
      let finished = new Set();
      while (finished.size < totalJobsCount) {
        let available = jobs.filter(j => j.arrivalTime <= currentTime && !finished.has(j.id));
        if (available.length === 0) {
          currentTime++;
          continue;
        }
        // Pick highest priority patient (priorityValue ascends, so 1 is first)
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
    } else if (algorithm === "RoundRobin") { // Round Robin
      let queue = [];
      let index = 0;
      let finished = new Set();
      
      // Sort initial queue by arrival
      jobs.sort((a, b) => a.arrivalTime - b.arrivalTime);
      
      // Load first arrivals
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

        // Load newly arrived jobs while this ran
        loadQueue();

        if (currentJob.remainingTime > 0) {
          queue.push(currentJob); // queue again at back
        } else {
          currentJob.completedTime = currentTime;
          currentJob.turnaroundTime = currentJob.completedTime - currentJob.arrivalTime;
          currentJob.waitingTime = currentJob.turnaroundTime - currentJob.burstTime;
          finished.add(currentJob.id);
        }
      }
    }

    // Calculate Averages
    const totalWaitingTime = jobs.reduce((sum, j) => sum + Math.max(0, j.waitingTime), 0);
    const totalTurnaroundTime = jobs.reduce((sum, j) => sum + Math.max(0, j.turnaroundTime), 0);
    const totalResponseTime = jobs.reduce((sum, j) => sum + Math.max(0, j.responseTime), 0);

    const avgWaitingTime = Number((totalWaitingTime / totalJobsCount).toFixed(2));
    const avgTurnaroundTime = Number((totalTurnaroundTime / totalJobsCount).toFixed(2));
    const avgResponseTime = Number((totalResponseTime / totalJobsCount).toFixed(2));
    const cpuUtilization = 100; // Complete run utilisation simulation
    const fairnessIndex = Number((1 / (1 + (avgWaitingTime / 20))).toFixed(2)); // mock index

    res.json({
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
    });
  });

  // --- BANKERS ALGORITHM API ---
  app.get("/api/simulation/bankers", (req, res) => {
    recodeNeed();
    // Verify safe state detection
    const processes = Object.keys(bankerMatrix.maxNeed);
    const numRes = bankerMatrix.available.length;

    // Make local copy for compute
    let Work = [...bankerMatrix.available];
    let Finish = {};
    processes.forEach(p => Finish[p] = false);

    let safeSequence = [];
    let isSafe = true;

    for (let step = 0; step < processes.length; step++) {
      let foundProcess = false;
      for (const p of processes) {
        if (!Finish[p]) {
          // Check if Need[p] <= Work
          let canAllocate = true;
          for (let r = 0; r < numRes; r++) {
            if (bankerMatrix.need[p][r] > Work[r]) {
              canAllocate = false;
              break;
            }
          }

          if (canAllocate) {
            // Allocate temporarily
            for (let r = 0; r < numRes; r++) {
              Work[r] += bankerMatrix.allocation[p][r];
            }
            Finish[p] = true;
            safeSequence.push(p);
            foundProcess = true;
            break;
          }
        }
      }

      if (!foundProcess) {
        isSafe = false;
        break;
      }
    }

    res.json({
      success: true,
      matrix: {
        allocation: bankerMatrix.allocation,
        maxNeed: bankerMatrix.maxNeed,
        available: bankerMatrix.available,
        need: bankerMatrix.need
      },
      isSafe,
      safeSequence: isSafe ? safeSequence.map(p => hospitalsList.find(h => h.id === p)?.name || p) : [],
      statusText: isSafe ? "SAFE STATE" : "UNSAFE STATE (DEADLOCK ROADALERT!)",
      warningAlert: !isSafe ? "Deadlock Risk! The medical system does not have enough safety reserves to fulfill simultaneous peak operation theater/oxygen claims." : null
    });
  });

  app.post("/api/simulation/bankers/claim", (req, res) => {
    const { hospitalId, requestVector } = req.body; // array e.g., [1, 2, 0]
    
    if (!bankerMatrix.allocation[hospitalId]) {
      return res.status(404).json({ success: false, message: "Hospital node not in matrix." });
    }

    const reqVec = requestVector.map(Number);
    const currentNeed = bankerMatrix.need[hospitalId];
    const avail = bankerMatrix.available;

    // Criteria 1: Request <= Need
    for (let i = 0; i < reqVec.length; i++) {
      if (reqVec[i] > currentNeed[i]) {
        return res.json({ success: false, isSafe: false, message: `Requested resources exceed maximum declared need limit! (Claim: ${reqVec[i]} > Need: ${currentNeed[i]})` });
      }
    }

    // Criteria 2: Request <= Available
    for (let i = 0; i < reqVec.length; i++) {
      if (reqVec[i] > avail[i]) {
        return res.json({ success: false, isSafe: false, message: `Requested resources exceed currently active available reserve pool vectors! (Claim: ${reqVec[i]} > Avail: ${avail[i]})` });
      }
    }

    // Try allocation simulation
    for (let i = 0; i < reqVec.length; i++) {
      bankerMatrix.available[i] -= reqVec[i];
      bankerMatrix.allocation[hospitalId][i] += reqVec[i];
    }
    recodeNeed();

    // Check if this results in a safe sequence
    const processes = Object.keys(bankerMatrix.maxNeed);
    let Work = [...bankerMatrix.available];
    let Finish = {};
    processes.forEach(p => Finish[p] = false);

    let isSafe = true;
    for (let step = 0; step < processes.length; step++) {
      let foundProcess = false;
      for (const p of processes) {
        if (!Finish[p]) {
          let canAllocate = true;
          for (let r = 0; r < reqVec.length; r++) {
            if (bankerMatrix.need[p][r] > Work[r]) {
              canAllocate = false;
              break;
            }
          }
          if (canAllocate) {
            for (let r = 0; r < reqVec.length; r++) {
              Work[r] += bankerMatrix.allocation[p][r];
            }
            Finish[p] = true;
            foundProcess = true;
            break;
          }
        }
      }
      if (!foundProcess) {
        isSafe = false;
        break;
      }
    }

    if (isSafe) {
      notificationsList.unshift({
        id: "n_bank_" + Date.now(),
        title: "Banker's Resource Allocated Safely",
        message: `Allocated ${JSON.stringify(reqVec)} resources to ${hospitalsList.find(h => h.id === hospitalId)?.name}`,
        type: "success",
        timestamp: new Date().toISOString()
      });
      res.json({ success: true, isSafe: true, message: "Resource claimed successfully. Safe sequence verified intact." });
    } else {
      // Rollback! UNSAFE STATE ID
      for (let i = 0; i < reqVec.length; i++) {
        bankerMatrix.available[i] += reqVec[i];
        bankerMatrix.allocation[hospitalId][i] -= reqVec[i];
      }
      recodeNeed();

      notificationsList.unshift({
        id: "n_bank_warn_" + Date.now(),
        title: "⚠️ RESOURCE CLAIM DENIED",
        message: `Rejected unsafe claims request to protect health resource deadlock!`,
        type: "warning",
        timestamp: new Date().toISOString()
      });

      res.json({ success: false, isSafe: false, message: "Claim request DENIED/ROLLBACK! Accepting this request would drive the emergency health pool into an UNSAFE deadlocked state!" });
    }
  });


  // --- VITE DEV OR STATIC SERVER WORKFLOW ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`MediFlow BD back-end running successfully on http://localhost:${PORT}`);
  });

  // Attach Socket.io to the server instances
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const activeConnections = new Map(); // Track connected users and roles

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join room
    socket.on("join_room", ({ roomId, userId, role }) => {
      socket.join(roomId);
      activeConnections.set(socket.id, { roomId, userId, role });
      console.log(`[Socket] User ${userId} (${role}) joined Room ${roomId}`);
      
      // Notify others that a user joined
      socket.to(roomId).emit("user_connected_status", { userId, role, connected: true });
    });

    // Leave room
    socket.on("leave_room", ({ roomId, userId }) => {
      socket.leave(roomId);
      console.log(`[Socket] User ${userId} left Room ${roomId}`);
      socket.to(roomId).emit("user_connected_status", { userId, connected: false });
    });

    // Handle incoming dynamic message broadcast
    socket.on("send_message", (messageData) => {
      const { roomId } = messageData;
      console.log(`[Socket] Message in room ${roomId} from ${messageData.senderId}`);
      // Broadcast message to everyone in the room except sender (or can include sender)
      socket.to(roomId).emit("receive_message", messageData);
    });

    // Handle typing status
    socket.on("typing_status", ({ roomId, userId, isTyping, userName }) => {
      socket.to(roomId).emit("typing_update", { userId, isTyping, userName });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      const userInfo = activeConnections.get(socket.id);
      if (userInfo) {
        const { roomId, userId, role } = userInfo;
        console.log(`[Socket] Client disconnected: ${socket.id} (User: ${userId})`);
        socket.to(roomId).emit("user_connected_status", { userId, role, connected: false });
        activeConnections.delete(socket.id);
      }
    });
  });
}

startServer();
