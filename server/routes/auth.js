const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const NotificationSettings = require("../models/NotificationSettings");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/session — exchange external auth user for a local JWT
router.post("/session", async (req, res) => {
  try {
    const { externalUserId, email } = req.body;
    if (!externalUserId || !email) {
      return res.status(400).json({ success: false, message: "externalUserId and email are required" });
    }

    let user = await User.findOne({ externalUserId: String(externalUserId) });
    if (!user) {
      user = await User.create({
        externalUserId: String(externalUserId),
        email,
        profile: { height: "", weight: "" },
      });
      await NotificationSettings.create({
        userId: user._id,
        emergencyAlerts: true,
        vitalWarnings: true,
        droneStatusUpdates: false,
        weeklyHealthReports: true,
      });
    } else if (user.email !== email) {
      // Keep email in sync if it changed on VirtuaLogin side
      user.email = email;
      await user.save();
    }

    const token = jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token });
  } catch (err) {
    console.error("Session error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

module.exports = router;
