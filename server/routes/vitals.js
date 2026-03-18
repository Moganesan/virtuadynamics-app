const express = require("express");
const Vital = require("../models/Vital");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// GET /api/vitals — list own vitals (optionally paginated)
router.get("/", async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const total = await Vital.countDocuments({ userId: req.user.id });
    const data = await Vital.find({ userId: req.user.id })
      .sort({ recordedAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    res.json({ success: true, data, total });
  } catch (err) {
    console.error("Get vitals error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/vitals/latest — latest vital record
router.get("/latest", async (req, res) => {
  try {
    const vital = await Vital.findOne({ userId: req.user.id }).sort({ recordedAt: -1 });
    if (!vital) return res.status(404).json({ success: false, message: "No vitals found" });

    res.json({ success: true, data: vital });
  } catch (err) {
    console.error("Get latest vital error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/vitals/:id
router.get("/:id", async (req, res) => {
  try {
    const vital = await Vital.findOne({ _id: req.params.id, userId: req.user.id });
    if (!vital) return res.status(404).json({ success: false, message: "Vital record not found" });

    res.json({ success: true, data: vital });
  } catch (err) {
    console.error("Get vital error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/vitals — create a vitals record
router.post("/", async (req, res) => {
  try {
    const { heartRate, bloodOxygen, temperature, bloodPressure, trend } = req.body;

    if (heartRate === undefined || bloodOxygen === undefined) {
      return res.status(400).json({ success: false, message: "heartRate and bloodOxygen are required" });
    }

    const vital = await Vital.create({
      userId: req.user.id,
      heartRate,
      bloodOxygen,
      temperature: temperature ?? null,
      bloodPressure: bloodPressure ?? null,
      trend: trend || "flat",
    });

    const io = req.app.get("io");
    io.to(`user:${req.user.id}`).emit("vitals:new", vital.toJSON());

    res.status(201).json({ success: true, data: vital });
  } catch (err) {
    console.error("Create vital error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PUT /api/vitals/:id — update a vitals record
router.put("/:id", async (req, res) => {
  try {
    const { heartRate, bloodOxygen, temperature, bloodPressure, trend } = req.body;
    const updates = {};
    if (heartRate !== undefined) updates.heartRate = heartRate;
    if (bloodOxygen !== undefined) updates.bloodOxygen = bloodOxygen;
    if (temperature !== undefined) updates.temperature = temperature;
    if (bloodPressure !== undefined) updates.bloodPressure = bloodPressure;
    if (trend !== undefined) updates.trend = trend;

    const vital = await Vital.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: updates },
      { new: true }
    );
    if (!vital) return res.status(404).json({ success: false, message: "Vital record not found" });

    const io = req.app.get("io");
    io.to(`user:${req.user.id}`).emit("vitals:updated", vital.toJSON());

    res.json({ success: true, data: vital });
  } catch (err) {
    console.error("Update vital error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// DELETE /api/vitals/:id
router.delete("/:id", async (req, res) => {
  try {
    const vital = await Vital.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!vital) return res.status(404).json({ success: false, message: "Vital record not found" });

    res.json({ success: true, message: "Vital record deleted" });
  } catch (err) {
    console.error("Delete vital error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
