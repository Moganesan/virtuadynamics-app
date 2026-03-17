// In-memory data store — replace collections with real DB calls as needed

const users = []; // Local users: { id, externalUserId, email, username, profile: { height, weight }, createdAt }
const otpStore = {}; // { email: { otp, expiresAt } }
const vitals = []; // { id, userId, heartRate, bloodOxygen, temperature, bloodPressure, trend, recordedAt }
const drones = [
  {
    id: "drone-1",
    name: "VD-Responder Alpha",
    status: "active",
    location: "Zone A",
    battery: 85,
    speed: 45,
    createdAt: new Date().toISOString(),
  },
  {
    id: "drone-2",
    name: "VD-Responder Beta",
    status: "standby",
    location: "Base",
    battery: 100,
    speed: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "drone-3",
    name: "VD-Responder Gamma",
    status: "charging",
    location: "Dock 3",
    battery: 42,
    speed: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "drone-4",
    name: "VD-Scout Delta",
    status: "offline",
    location: "Maintenance",
    battery: 0,
    speed: 0,
    createdAt: new Date().toISOString(),
  },
];
const incidents = [
  {
    id: "inc-1",
    userId: null,
    date: "2026-03-10",
    time: "14:32",
    anomalyType: "High Heart Rate",
    severity: "critical",
    routedTo: "Dr. Smith",
    routedRole: "Doctor",
    droneId: "drone-1",
    location: "Zone A - Block 5",
    hasRecording: true,
    recordingDuration: "2:45",
    notes: "Patient showed elevated HR above 160 BPM for 3 minutes.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "inc-2",
    userId: null,
    date: "2026-03-09",
    time: "09:15",
    anomalyType: "Low Blood Oxygen",
    severity: "warning",
    routedTo: "Nurse Johnson",
    routedRole: "Nurse",
    droneId: "drone-2",
    location: "Zone B - Block 2",
    hasRecording: false,
    recordingDuration: null,
    notes: "SpO2 dropped to 91%.",
    createdAt: new Date().toISOString(),
  },
];
const emergencyContacts = []; // per-user: { id, userId, name, phone, role }
const devices = []; // smart rings: { id, userId, name, battery, signalStrength, status, pairedAt }
const notificationSettings = []; // { userId, emergencyAlerts, vitalWarnings, droneStatusUpdates, weeklyHealthReports }

module.exports = {
  users,
  otpStore,
  vitals,
  drones,
  incidents,
  emergencyContacts,
  devices,
  notificationSettings,
};
