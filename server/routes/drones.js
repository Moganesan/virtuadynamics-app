const express = require("express");
const Drone = require("../models/Drone");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const VALID_STATUSES = ["standby", "active", "charging", "offline"];

router.use(authenticate);

// GET /api/drones — list all drones
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const drones = await Drone.find(query);
    res.json({ success: true, data: drones, total: drones.length });
  } catch (err) {
    console.error("Get drones error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/drones/:id
router.get("/:id", async (req, res) => {
  try {
    const drone = await Drone.findById(req.params.id);
    if (!drone) return res.status(404).json({ success: false, message: "Drone not found" });

    res.json({ success: true, data: drone });
  } catch (err) {
    console.error("Get drone error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/drones — add a new drone
router.post("/", async (req, res) => {
  try {
    const { name, status, location, battery, speed } = req.body;

    if (!name) return res.status(400).json({ success: false, message: "Drone name is required" });
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const drone = await Drone.create({
      name,
      status: status || "standby",
      location: location || "Unknown",
      battery: battery ?? 100,
      speed: speed ?? 0,
    });

    const io = req.app.get("io");
    io.emit("drones:new", drone.toJSON());

    res.status(201).json({ success: true, data: drone });
  } catch (err) {
    console.error("Create drone error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PUT /api/drones/:id — update drone
router.put("/:id", async (req, res) => {
  try {
    const { name, status, location, battery, speed } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    if (location !== undefined) updates.location = location;
    if (battery !== undefined) updates.battery = battery;
    if (speed !== undefined) updates.speed = speed;

    const drone = await Drone.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!drone) return res.status(404).json({ success: false, message: "Drone not found" });

    const io = req.app.get("io");
    io.emit("drones:updated", drone.toJSON());

    res.json({ success: true, data: drone });
  } catch (err) {
    console.error("Update drone error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PATCH /api/drones/:id/status — quick status update
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const drone = await Drone.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!drone) return res.status(404).json({ success: false, message: "Drone not found" });

    const io = req.app.get("io");
    io.emit("drones:statusChanged", drone.toJSON());

    res.json({ success: true, data: drone });
  } catch (err) {
    console.error("Patch drone status error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// DELETE /api/drones/:id
router.delete("/:id", async (req, res) => {
  try {
    const drone = await Drone.findByIdAndDelete(req.params.id);
    if (!drone) return res.status(404).json({ success: false, message: "Drone not found" });

    const io = req.app.get("io");
    io.emit("drones:deleted", { id: drone._id.toString() });

    res.json({ success: true, message: "Drone deleted" });
  } catch (err) {
    console.error("Delete drone error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
