const Drone = require("../models/Drone");
const Incident = require("../models/Incident");

async function seedIfEmpty() {
  // Seed drones
  const droneCount = await Drone.countDocuments();
  if (droneCount === 0) {
    await Drone.insertMany([
      { name: "VD-Responder Alpha", status: "active", location: "Zone A", battery: 85, speed: 45 },
      { name: "VD-Responder Beta", status: "standby", location: "Base", battery: 100, speed: 0 },
      { name: "VD-Responder Gamma", status: "charging", location: "Dock 3", battery: 42, speed: 0 },
      { name: "VD-Scout Delta", status: "offline", location: "Maintenance", battery: 0, speed: 0 },
    ]);
    console.log("Seeded 4 drones");
  }

  // Seed incidents
  const incidentCount = await Incident.countDocuments();
  if (incidentCount === 0) {
    await Incident.insertMany([
      {
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
      },
      {
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
      },
    ]);
    console.log("Seeded 2 incidents");
  }
}

module.exports = { seedIfEmpty };
