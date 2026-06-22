import { 
  AmbulanceStatus,
  EmergencyType,
  Severity,
  RequestStatus
} from "./types";

export const FALLBACK_AMBULANCES = [
  { id: "amb1", plateNumber: "Dhaka Metro-Chha-11-2091", driverName: "Kamil Ahsan", phone: "01511223344", status: AmbulanceStatus.AVAILABLE, currentLocKey: "mirpur", type: "ICU-Support", capacity: 1 },
  { id: "amb2", plateNumber: "Dhaka Metro-Chha-15-4432", driverName: "Zakir Hossen", phone: "01722334455", status: AmbulanceStatus.AVAILABLE, currentLocKey: "dhanmondi", type: "AC", capacity: 1 },
  { id: "amb3", plateNumber: "Dhaka Metro-Chha-12-8871", driverName: "Siddique Ali", phone: "01833445566", status: AmbulanceStatus.AVAILABLE, currentLocKey: "shahbagh", type: "Non-AC", capacity: 1 },
  { id: "amb4", plateNumber: "Dhaka Metro-Chha-18-5522", driverName: "Sumon Khan", phone: "01944556677", status: AmbulanceStatus.AVAILABLE, currentLocKey: "uttara", type: "ICU-Support", capacity: 1 },
  { id: "amb5", plateNumber: "Dhaka Metro-Chha-21-9988", driverName: "Liton Das", phone: "01611224455", status: AmbulanceStatus.AVAILABLE, currentLocKey: "gulshan", type: "AC", capacity: 1 }
];

export const FALLBACK_HOSPITALS = [
  { id: "hosp1", name: "Dhaka Medical College Hospital", location: "Shahbagh, Dhaka", locKey: "shahbagh", distanceKm: 2.1, icuBeds: { total: 40, occupied: 32 }, oxygenCylinders: { total: 100, occupied: 78 }, ventilators: { total: 25, occupied: 19 }, operationTheaters: { total: 10, occupied: 7 }, doctors: { total: 120, active: 85 }, emergencyLoad: 4 },
  { id: "hosp2", name: "Kurmitola General Hospital", location: "Uttara, Dhaka", locKey: "uttara", distanceKm: 8.5, icuBeds: { total: 20, occupied: 18 }, oxygenCylinders: { total: 80, occupied: 74 }, ventilators: { total: 15, occupied: 14 }, operationTheaters: { total: 4, occupied: 3 }, doctors: { total: 60, active: 40 }, emergencyLoad: 2 },
  { id: "hosp3", name: "Suhrawardy Hospital", location: "Sher-e-Bangla Nagar", locKey: "sherinagar", distanceKm: 5.3, icuBeds: { total: 15, occupied: 14 }, oxygenCylinders: { total: 60, occupied: 52 }, ventilators: { total: 10, occupied: 9 }, operationTheaters: { total: 4, occupied: 2 }, doctors: { total: 50, active: 30 }, emergencyLoad: 1 },
  { id: "hosp4", name: "Evercare Hospital", location: "Bashundhara R/A", locKey: "bashundhara", distanceKm: 12.0, icuBeds: { total: 30, occupied: 20 }, oxygenCylinders: { total: 90, occupied: 65 }, ventilators: { total: 20, occupied: 12 }, operationTheaters: { total: 8, occupied: 4 }, doctors: { total: 95, active: 62 }, emergencyLoad: 0 },
  { id: "hosp5", name: "BIRDEM General Hospital", location: "Shahbagh, Dhaka", locKey: "shahbagh", distanceKm: 2.4, icuBeds: { total: 18, occupied: 16 }, oxygenCylinders: { total: 50, occupied: 48 }, ventilators: { total: 8, occupied: 7 }, operationTheaters: { total: 3, occupied: 3 }, doctors: { total: 45, active: 25 }, emergencyLoad: 3 }
];

export const FALLBACK_REQUESTS = [
  { id: "req1", patientName: "Farid Uddin", phone: "01711122233", emergencyType: EmergencyType.HEART_ATTACK, symptoms: "Severe chest pain and heavy breathing", severity: Severity.CRITICAL, location: "Mirpur 10", locKey: "mirpur", needIcu: true, needOxygen: true, needVentilator: true, status: RequestStatus.ON_ROUTE, createdAt: new Date(Date.now() - 15 * 60000).toISOString(), assignedAmbulanceId: "amb1", assignedHospitalId: "hosp1", arrivalTime: 1, burstTime: 6, remainingTime: 3, priorityValue: 1, waitingTime: 2, turnaroundTime: 0, responseTime: 1, originalSeverityValue: 1, starvationCounter: 0 },
  { id: "req2", patientName: "Sumaya Akter", phone: "01822233344", emergencyType: EmergencyType.ACCIDENT, symptoms: "Pedestrian collision, severe leg injury", severity: Severity.HIGH, location: "Dhanmondi 32", locKey: "dhanmondi", needIcu: false, needOxygen: true, needVentilator: false, status: RequestStatus.DISPATCHED, createdAt: new Date(Date.now() - 10 * 60000).toISOString(), assignedAmbulanceId: "amb2", assignedHospitalId: "hosp3", arrivalTime: 3, burstTime: 8, remainingTime: 8, priorityValue: 2, waitingTime: 5, turnaroundTime: 0, responseTime: 2, originalSeverityValue: 2, starvationCounter: 0 },
  { id: "req3", patientName: "Afsana Begum", phone: "01933344455", emergencyType: EmergencyType.PREGNANCY, symptoms: "Active labor complications", severity: Severity.HIGH, location: "Uttara Sector 4", locKey: "uttara", needIcu: false, needOxygen: false, needVentilator: false, status: RequestStatus.PENDING, createdAt: new Date(Date.now() - 5 * 60000).toISOString(), arrivalTime: 5, burstTime: 5, remainingTime: 5, priorityValue: 2, waitingTime: 0, turnaroundTime: 0, responseTime: 0, originalSeverityValue: 2, starvationCounter: 0 }
];

export const FALLBACK_MEDICINES = [
  { id: "med1", name: "Nitroglycerin Spray", category: "Heart Disease", price: 250, stock: 40, description: "Instant relief spray for acute chest pain." },
  { id: "med2", name: "EpiPen 0.3mg Auto-injector", category: "Allergy/Anaphylaxis", price: 6500, stock: 15, description: "Emergency epinephrine injector auto device." },
  { id: "med3", name: "Duolin Inhaler Respul", category: "Asthma/COPD", price: 180, stock: 120, description: "Aerosol bronchodilator for rapid relief." },
  { id: "med4", name: "Aspirin 81mg EC Tablets", category: "Blood Thinner", price: 15, stock: 200, description: "Chewable low-dose aspirin used in cardiac crisis." },
  { id: "med5", name: "Paracetamol IV Infusion 100ml", category: "Analgesic", price: 110, stock: 80, description: "Intravenous drop fever and pain controller." }
];

export const FALLBACK_BLOOD_DONORS = [
  { id: "donor1", name: "Raihan Kabir", bloodGroup: "O+", phone: "01788776655", location: "Dhanmondi", lastDonated: "2026-03-12", isAvailable: true },
  { id: "donor2", name: "Farhana Jamil", bloodGroup: "AB-", phone: "01833445522", location: "Mirpur", lastDonated: "2025-11-20", isAvailable: true },
  { id: "donor3", name: "Sabbir Rahman", bloodGroup: "B+", phone: "01988992211", location: "Shahbagh", lastDonated: "2026-05-01", isAvailable: true },
  { id: "donor4", name: "Tania Sultana", bloodGroup: "A-", phone: "01655667788", location: "Uttara", lastDonated: "2026-02-15", isAvailable: true }
];

export const FALLBACK_NOTIFICATIONS = [
  { id: "n1", title: "Accident Emergency Reported", message: "Sumaya Akter reported a Road Accident in Dhanmondi.", type: "alert", timestamp: new Date().toISOString() },
  { id: "n2", title: "Ambulance Dispatched", message: "Ambulance Dhaka Metro-Chha-15-4432 is on route to Dhanmondi.", type: "success", timestamp: new Date().toISOString() }
];

export const FALLBACK_BANKER_MATRIX = {
  allocation: {
    "hosp1": [8, 15, 6],
    "hosp2": [4, 12, 3],
    "hosp3": [2, 8, 2],
    "hosp4": [3, 10, 4],
    "hosp5": [5, 11, 2]
  },
  maxNeed: {
    "hosp1": [10, 20, 8],
    "hosp2": [5, 15, 4],
    "hosp3": [4, 10, 3],
    "hosp4": [6, 12, 5],
    "hosp5": [6, 14, 4]
  },
  available: [3, 5, 2],
  need: {
    "hosp1": [2, 5, 2],
    "hosp2": [1, 3, 1],
    "hosp3": [2, 2, 1],
    "hosp4": [3, 2, 1],
    "hosp5": [1, 3, 2]
  }
};
