const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { devices } = require("../data/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const VALID_STATUSES = ["disconnected", "scanning", "connected"];

router.use(authenticate);

// GET /api/devices — list own devices (smart rings)
router.get("/", (req, res) => {
  const userDevices = devices.filter((d) => d.userId === req.user.id);
  res.json({ success: true, data: userDevices, total: userDevices.length });
});

// GET /api/devices/:id
router.get("/:id", (req, res) => {
  const device = devices.find((d) => d.id === req.params.id && d.userId === req.user.id);
  if (!device) return res.status(404).json({ success: false, message: "Device not found" });

  res.json({ success: true, data: device });
});

// POST /api/devices — pair/add a device
router.post("/", (req, res) => {
  const { name, battery, signalStrength, status } = req.body;

  if (!name) return res.status(400).json({ success: false, message: "Device name is required" });
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  const device = {
    id: uuidv4(),
    userId: req.user.id,
    name,
    battery: battery ?? 100,
    signalStrength: signalStrength ?? -50, // RSSI in dBm
    status: status || "disconnected",
    pairedAt: new Date().toISOString(),
  };
  devices.push(device);

  res.status(201).json({ success: true, data: device });
});

// PUT /api/devices/:id — update device info
router.put("/:id", (req, res) => {
  const device = devices.find((d) => d.id === req.params.id && d.userId === req.user.id);
  if (!device) return res.status(404).json({ success: false, message: "Device not found" });

  const { name, battery, signalStrength, status } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  if (name !== undefined) device.name = name;
  if (battery !== undefined) device.battery = battery;
  if (signalStrength !== undefined) device.signalStrength = signalStrength;
  if (status !== undefined) device.status = status;

  res.json({ success: true, data: device });
});

// PATCH /api/devices/:id/status — connect/disconnect device
router.patch("/:id/status", (req, res) => {
  const device = devices.find((d) => d.id === req.params.id && d.userId === req.user.id);
  if (!device) return res.status(404).json({ success: false, message: "Device not found" });

  const { status } = req.body;
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  device.status = status;
  res.json({ success: true, data: device });
});

// DELETE /api/devices/:id — unpair device
router.delete("/:id", (req, res) => {
  const index = devices.findIndex((d) => d.id === req.params.id && d.userId === req.user.id);
  if (index === -1) return res.status(404).json({ success: false, message: "Device not found" });

  devices.splice(index, 1);
  res.json({ success: true, message: "Device unpaired and deleted" });
});

module.exports = router;
