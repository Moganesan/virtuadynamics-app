const express = require("express");
const Device = require("../models/Device");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const VALID_STATUSES = ["disconnected", "scanning", "connected"];

router.use(authenticate);

// GET /api/devices — list own devices (smart rings)
router.get("/", async (req, res) => {
  try {
    const devices = await Device.find({ userId: req.user.id });
    res.json({ success: true, data: devices, total: devices.length });
  } catch (err) {
    console.error("Get devices error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/devices/:id
router.get("/:id", async (req, res) => {
  try {
    const device = await Device.findOne({ _id: req.params.id, userId: req.user.id });
    if (!device) return res.status(404).json({ success: false, message: "Device not found" });

    res.json({ success: true, data: device });
  } catch (err) {
    console.error("Get device error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/devices — pair/add a device
router.post("/", async (req, res) => {
  try {
    const { name, battery, signalStrength, status } = req.body;

    if (!name) return res.status(400).json({ success: false, message: "Device name is required" });
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const device = await Device.create({
      userId: req.user.id,
      name,
      battery: battery ?? 100,
      signalStrength: signalStrength ?? -50,
      status: status || "disconnected",
    });

    res.status(201).json({ success: true, data: device });
  } catch (err) {
    console.error("Create device error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PUT /api/devices/:id — update device info
router.put("/:id", async (req, res) => {
  try {
    const { name, battery, signalStrength, status } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (battery !== undefined) updates.battery = battery;
    if (signalStrength !== undefined) updates.signalStrength = signalStrength;
    if (status !== undefined) updates.status = status;

    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: updates },
      { new: true }
    );
    if (!device) return res.status(404).json({ success: false, message: "Device not found" });

    res.json({ success: true, data: device });
  } catch (err) {
    console.error("Update device error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PATCH /api/devices/:id/status — connect/disconnect device
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status },
      { new: true }
    );
    if (!device) return res.status(404).json({ success: false, message: "Device not found" });

    res.json({ success: true, data: device });
  } catch (err) {
    console.error("Patch device status error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// DELETE /api/devices/:id — unpair device
router.delete("/:id", async (req, res) => {
  try {
    const device = await Device.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!device) return res.status(404).json({ success: false, message: "Device not found" });

    res.json({ success: true, message: "Device unpaired and deleted" });
  } catch (err) {
    console.error("Delete device error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
