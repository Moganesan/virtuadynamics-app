const express = require("express");
const Incident = require("../models/Incident");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const VALID_SEVERITIES = ["critical", "warning", "resolved"];

router.use(authenticate);

// GET /api/incidents — list incidents (user-scoped + global)
router.get("/", async (req, res) => {
  try {
    const { severity, limit = 20, offset = 0 } = req.query;
    const query = { $or: [{ userId: req.user.id }, { userId: null }] };
    if (severity) query.severity = severity;

    const total = await Incident.countDocuments(query);
    const data = await Incident.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    res.json({ success: true, data, total });
  } catch (err) {
    console.error("Get incidents error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/incidents/:id
router.get("/:id", async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });

    res.json({ success: true, data: incident });
  } catch (err) {
    console.error("Get incident error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/incidents — create incident
router.post("/", async (req, res) => {
  try {
    const {
      date, time, anomalyType, severity, routedTo, routedRole,
      droneId, location, hasRecording, recordingUrl, recordingDuration, notes,
    } = req.body;

    if (!anomalyType || !severity) {
      return res.status(400).json({ success: false, message: "anomalyType and severity are required" });
    }
    if (!VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({ success: false, message: `severity must be one of: ${VALID_SEVERITIES.join(", ")}` });
    }

    const now = new Date();
    const incident = await Incident.create({
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
      recordingUrl: recordingUrl || null,
      recordingDuration: recordingDuration || null,
      notes: notes || "",
    });

    const io = req.app.get("io");
    io.emit("incidents:new", incident.toJSON());

    res.status(201).json({ success: true, data: incident });
  } catch (err) {
    console.error("Create incident error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PUT /api/incidents/:id — update incident
router.put("/:id", async (req, res) => {
  try {
    const fields = ["date", "time", "anomalyType", "severity", "routedTo", "routedRole", "droneId", "location", "hasRecording", "recordingUrl", "recordingDuration", "notes"];
    const updates = {};
    for (const field of fields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (updates.severity && !VALID_SEVERITIES.includes(updates.severity)) {
      return res.status(400).json({ success: false, message: `severity must be one of: ${VALID_SEVERITIES.join(", ")}` });
    }

    const incident = await Incident.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: updates },
      { new: true }
    );
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });

    res.json({ success: true, data: incident });
  } catch (err) {
    console.error("Update incident error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PATCH /api/incidents/:id/severity — quick severity update
router.patch("/:id/severity", async (req, res) => {
  try {
    const { severity } = req.body;
    if (!severity || !VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({ success: false, message: `severity must be one of: ${VALID_SEVERITIES.join(", ")}` });
    }

    const incident = await Incident.findByIdAndUpdate(req.params.id, { severity }, { new: true });
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });

    const io = req.app.get("io");
    io.emit("incidents:severityChanged", incident.toJSON());

    res.json({ success: true, data: incident });
  } catch (err) {
    console.error("Patch incident severity error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// DELETE /api/incidents/:id
router.delete("/:id", async (req, res) => {
  try {
    const incident = await Incident.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!incident) return res.status(404).json({ success: false, message: "Incident not found" });

    res.json({ success: true, message: "Incident deleted" });
  } catch (err) {
    console.error("Delete incident error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
