const express = require("express");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { users, notificationSettings } = require("../data/db");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/session — exchange external auth user for a local JWT
// Called after external login (VirtuaLogin) to obtain a local token for
// health-data, contacts, notifications, and device endpoints.
router.post("/session", (req, res) => {
  const { externalUserId, email, username } = req.body;
  if (!externalUserId || !email) {
    return res.status(400).json({ success: false, message: "externalUserId and email are required" });
  }

  let user = users.find((u) => u.externalUserId === String(externalUserId));
  if (!user) {
    user = {
      id: uuidv4(),
      externalUserId: String(externalUserId),
      email,
      username: username || email.split("@")[0],
      // Local-only health data (profile info like name, DOB, address is on VirtuaLogin)
      profile: { height: "", weight: "" },
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    notificationSettings.push({
      userId: user.id,
      emergencyAlerts: true,
      vitalWarnings: true,
      droneStatusUpdates: false,
      weeklyHealthReports: true,
    });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ success: true, token });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  // Stateless JWT — client should discard the token
  res.json({ success: true, message: "Logged out successfully" });
});

module.exports = router;
