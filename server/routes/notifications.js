const express = require("express");
const { notificationSettings } = require("../data/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

function getOrCreate(userId) {
  let settings = notificationSettings.find((s) => s.userId === userId);
  if (!settings) {
    settings = {
      userId,
      emergencyAlerts: true,
      vitalWarnings: true,
      droneStatusUpdates: true,
      weeklyHealthReports: false,
    };
    notificationSettings.push(settings);
  }
  return settings;
}

// GET /api/notifications — get own notification settings
router.get("/", (req, res) => {
  const settings = getOrCreate(req.user.id);
  const { userId: _, ...data } = settings;
  res.json({ success: true, data });
});

// PUT /api/notifications — replace all notification settings
router.put("/", (req, res) => {
  const settings = getOrCreate(req.user.id);
  const { emergencyAlerts, vitalWarnings, droneStatusUpdates, weeklyHealthReports } = req.body;

  if (emergencyAlerts !== undefined) settings.emergencyAlerts = Boolean(emergencyAlerts);
  if (vitalWarnings !== undefined) settings.vitalWarnings = Boolean(vitalWarnings);
  if (droneStatusUpdates !== undefined) settings.droneStatusUpdates = Boolean(droneStatusUpdates);
  if (weeklyHealthReports !== undefined) settings.weeklyHealthReports = Boolean(weeklyHealthReports);

  const { userId: _, ...data } = settings;
  res.json({ success: true, message: "Notification settings updated", data });
});

// PATCH /api/notifications/:key — toggle a single setting
router.patch("/:key", (req, res) => {
  const VALID_KEYS = ["emergencyAlerts", "vitalWarnings", "droneStatusUpdates", "weeklyHealthReports"];
  const { key } = req.params;

  if (!VALID_KEYS.includes(key)) {
    return res.status(400).json({ success: false, message: `key must be one of: ${VALID_KEYS.join(", ")}` });
  }

  const settings = getOrCreate(req.user.id);
  const { value } = req.body;

  settings[key] = value !== undefined ? Boolean(value) : !settings[key]; // toggle if no value provided

  const { userId: _, ...data } = settings;
  res.json({ success: true, message: `${key} updated`, data });
});

module.exports = router;
