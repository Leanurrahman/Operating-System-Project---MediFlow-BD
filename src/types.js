/**
 * MediFlow BD - Domain Enums (JavaScript)
 */

export const UserRole = {
  PATIENT: "patient",
  OPERATOR: "ambulance_operator",
  ADMIN: "hospital_admin"
};

export const EmergencyType = {
  ACCIDENT: "Accident",
  HEART_ATTACK: "Heart Attack",
  STROKE: "Stroke",
  FIRE_INJURY: "Fire Injury",
  PREGNANCY: "Pregnancy Emergency",
  GENERAL: "General Emergency"
};

export const Severity = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low"
};

export const RequestStatus = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  DISPATCHED: "Dispatched",
  ON_ROUTE: "On Route",
  PICKED_UP: "Patient Picked Up",
  ARRIVED: "Arrived at Hospital",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

export const AmbulanceStatus = {
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  ON_ROUTE: "On Route",
  PATIENT_PICKED: "Patient Picked",
  REACHED_HOSPITAL: "Reached Hospital",
  OFFLINE: "Offline"
};
