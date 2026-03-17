const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { vitals } = require("../data/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// GET /api/vitals — list own vitals (optionally paginated)
router.get("/", (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const userVitals = vitals
    .filter((v) => v.userId === req.user.id)
    .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
    .slice(Number(offset), Number(offset) + Number(limit));

  res.json({ success: true, data: userVitals, total: vitals.filter((v) => v.userId === req.user.id).length });
});

// GET /api/vitals/latest — latest vital record
router.get("/latest", (req, res) => {
  const userVitals = vitals.filter((v) => v.userId === req.user.id).sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
  if (!userVitals.length) return res.status(404).json({ success: false, message: "No vitals found" });

  res.json({ success: true, data: userVitals[0] });
});

// GET /api/vitals/:id
router.get("/:id", (req, res) => {
  const record = vitals.find((v) => v.id === req.params.id && v.userId === req.user.id);
  if (!record) return res.status(404).json({ success: false, message: "Vital record not found" });

  res.json({ success: true, data: record });
});

// POST /api/vitals — create a vitals record
router.post("/", (req, res) => {
  const { heartRate, bloodOxygen, temperature, bloodPressure, trend } = req.body;

  if (heartRate === undefined || bloodOxygen === undefined) {
    return res.status(400).json({ success: false, message: "heartRate and bloodOxygen are required" });
  }

  const record = {
    id: uuidv4(),
    userId: req.user.id,
    heartRate,
    bloodOxygen,
    temperature: temperature ?? null,
    bloodPressure: bloodPressure ?? null,
    trend: trend || "flat", // 'up' | 'down' | 'flat'
    recordedAt: new Date().toISOString(),
  };
  vitals.push(record);

  res.status(201).json({ success: true, data: record });
});

// PUT /api/vitals/:id — update a vitals record
router.put("/:id", (req, res) => {
  const record = vitals.find((v) => v.id === req.params.id && v.userId === req.user.id);
  if (!record) return res.status(404).json({ success: false, message: "Vital record not found" });

  const { heartRate, bloodOxygen, temperature, bloodPressure, trend } = req.body;
  if (heartRate !== undefined) record.heartRate = heartRate;
  if (bloodOxygen !== undefined) record.bloodOxygen = bloodOxygen;
  if (temperature !== undefined) record.temperature = temperature;
  if (bloodPressure !== undefined) record.bloodPressure = bloodPressure;
  if (trend !== undefined) record.trend = trend;

  res.json({ success: true, data: record });
});

// DELETE /api/vitals/:id
router.delete("/:id", (req, res) => {
  const index = vitals.findIndex((v) => v.id === req.params.id && v.userId === req.user.id);
  if (index === -1) return res.status(404).json({ success: false, message: "Vital record not found" });

  vitals.splice(index, 1);
  res.json({ success: true, message: "Vital record deleted" });
});

module.exports = router;
