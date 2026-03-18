const express = require("express");
const NotificationSettings = require("../models/NotificationSettings");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

async function getOrCreate(userId) {
  let settings = await NotificationSettings.findOne({ userId });
  if (!settings) {
    settings = await NotificationSettings.create({
      userId,
      emergencyAlerts: true,
      vitalWarnings: true,
      droneStatusUpdates: true,
      weeklyHealthReports: false,
    });
  }
  return settings;
}

// GET /api/notifications — get own notification settings
router.get("/", async (req, res) => {
  try {
    const settings = await getOrCreate(req.user.id);
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PUT /api/notifications — replace all notification settings
router.put("/", async (req, res) => {
  try {
    const { emergencyAlerts, vitalWarnings, droneStatusUpdates, weeklyHealthReports } = req.body;
    const updates = {};
    if (emergencyAlerts !== undefined) updates.emergencyAlerts = Boolean(emergencyAlerts);
    if (vitalWarnings !== undefined) updates.vitalWarnings = Boolean(vitalWarnings);
    if (droneStatusUpdates !== undefined) updates.droneStatusUpdates = Boolean(droneStatusUpdates);
    if (weeklyHealthReports !== undefined) updates.weeklyHealthReports = Boolean(weeklyHealthReports);

    const settings = await NotificationSettings.findOneAndUpdate(
      { userId: req.user.id },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: "Notification settings updated", data: settings });
  } catch (err) {
    console.error("Update notifications error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PATCH /api/notifications/:key — toggle a single setting
router.patch("/:key", async (req, res) => {
  try {
    const VALID_KEYS = ["emergencyAlerts", "vitalWarnings", "droneStatusUpdates", "weeklyHealthReports"];
    const { key } = req.params;

    if (!VALID_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: `key must be one of: ${VALID_KEYS.join(", ")}` });
    }

    const settings = await getOrCreate(req.user.id);
    const { value } = req.body;
    settings[key] = value !== undefined ? Boolean(value) : !settings[key];
    await settings.save();

    res.json({ success: true, message: `${key} updated`, data: settings });
  } catch (err) {
    console.error("Patch notification error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
