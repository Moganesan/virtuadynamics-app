const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { drones } = require("../data/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const VALID_STATUSES = ["standby", "active", "charging", "offline"];

router.use(authenticate);

// GET /api/drones — list all drones
router.get("/", (req, res) => {
  const { status } = req.query;
  const result = status ? drones.filter((d) => d.status === status) : drones;
  res.json({ success: true, data: result, total: result.length });
});

// GET /api/drones/:id
router.get("/:id", (req, res) => {
  const drone = drones.find((d) => d.id === req.params.id);
  if (!drone) return res.status(404).json({ success: false, message: "Drone not found" });

  res.json({ success: true, data: drone });
});

// POST /api/drones — add a new drone
router.post("/", (req, res) => {
  const { name, status, location, battery, speed } = req.body;

  if (!name) return res.status(400).json({ success: false, message: "Drone name is required" });
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  const drone = {
    id: uuidv4(),
    name,
    status: status || "standby",
    location: location || "Unknown",
    battery: battery ?? 100,
    speed: speed ?? 0,
    createdAt: new Date().toISOString(),
  };
  drones.push(drone);

  res.status(201).json({ success: true, data: drone });
});

// PUT /api/drones/:id — update drone
router.put("/:id", (req, res) => {
  const drone = drones.find((d) => d.id === req.params.id);
  if (!drone) return res.status(404).json({ success: false, message: "Drone not found" });

  const { name, status, location, battery, speed } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  if (name !== undefined) drone.name = name;
  if (status !== undefined) drone.status = status;
  if (location !== undefined) drone.location = location;
  if (battery !== undefined) drone.battery = battery;
  if (speed !== undefined) drone.speed = speed;

  res.json({ success: true, data: drone });
});

// PATCH /api/drones/:id/status — quick status update
router.patch("/:id/status", (req, res) => {
  const drone = drones.find((d) => d.id === req.params.id);
  if (!drone) return res.status(404).json({ success: false, message: "Drone not found" });

  const { status } = req.body;
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  drone.status = status;
  res.json({ success: true, data: drone });
});

// DELETE /api/drones/:id
router.delete("/:id", (req, res) => {
  const index = drones.findIndex((d) => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: "Drone not found" });

  drones.splice(index, 1);
  res.json({ success: true, message: "Drone deleted" });
});

module.exports = router;
