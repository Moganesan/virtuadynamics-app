const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { incidents } = require("../data/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const VALID_SEVERITIES = ["critical", "warning", "resolved"];

router.use(authenticate);

// GET /api/incidents — list incidents (user-scoped or all if admin)
router.get("/", (req, res) => {
  const { severity, limit = 20, offset = 0 } = req.query;

  let result = incidents.filter((i) => i.userId === req.user.id || i.userId === null);
  if (severity) result = result.filter((i) => i.severity === severity);

  result = result
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(Number(offset), Number(offset) + Number(limit));

  res.json({ success: true, data: result, total: result.length });
});

// GET /api/incidents/:id
router.get("/:id", (req, res) => {
  const incident = incidents.find((i) => i.id === req.params.id);
  if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });

  res.json({ success: true, data: incident });
});

// POST /api/incidents — create incident
router.post("/", (req, res) => {
  const {
    date, time, anomalyType, severity, routedTo, routedRole,
    droneId, location, hasRecording, recordingDuration, notes,
  } = req.body;

  if (!anomalyType || !severity) {
    return res.status(400).json({ success: false, message: "anomalyType and severity are required" });
  }
  if (!VALID_SEVERITIES.includes(severity)) {
    return res.status(400).json({ success: false, message: `severity must be one of: ${VALID_SEVERITIES.join(", ")}` });
  }

  const now = new Date();
  const incident = {
    id: uuidv4(),
    userId: req.user.id,
    date: date || now.toISOString().split("T")[0],
    time: time || now.toTimeString().slice(0, 5),
    anomalyType,
    severity,
    routedTo: routedTo || null,
    routedRole: routedRole || null,
    droneId: droneId || null,
    location: location || null,
    hasRecording: hasRecording || false,
    recordingDuration: recordingDuration || null,
    notes: notes || "",
    createdAt: now.toISOString(),
  };
  incidents.push(incident);

  res.status(201).json({ success: true, data: incident });
});

// PUT /api/incidents/:id — update incident
router.put("/:id", (req, res) => {
  const incident = incidents.find((i) => i.id === req.params.id && i.userId === req.user.id);
  if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });

  const fields = ["date", "time", "anomalyType", "severity", "routedTo", "routedRole", "droneId", "location", "hasRecording", "recordingDuration", "notes"];
  for (const field of fields) {
    if (req.body[field] !== undefined) incident[field] = req.body[field];
  }

  if (incident.severity && !VALID_SEVERITIES.includes(incident.severity)) {
    return res.status(400).json({ success: false, message: `severity must be one of: ${VALID_SEVERITIES.join(", ")}` });
  }

  res.json({ success: true, data: incident });
});

// PATCH /api/incidents/:id/severity — quick severity update
router.patch("/:id/severity", (req, res) => {
  const incident = incidents.find((i) => i.id === req.params.id);
  if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });

  const { severity } = req.body;
  if (!severity || !VALID_SEVERITIES.includes(severity)) {
    return res.status(400).json({ success: false, message: `severity must be one of: ${VALID_SEVERITIES.join(", ")}` });
  }

  incident.severity = severity;
  res.json({ success: true, data: incident });
});

// DELETE /api/incidents/:id
router.delete("/:id", (req, res) => {
  const index = incidents.findIndex((i) => i.id === req.params.id && i.userId === req.user.id);
  if (index === -1) return res.status(404).json({ success: false, message: "Incident not found" });

  incidents.splice(index, 1);
  res.json({ success: true, message: "Incident deleted" });
});

module.exports = router;
