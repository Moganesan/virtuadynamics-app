const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { users, otpStore, notificationSettings } = require("../data/db");
const { JWT_SECRET, authenticate } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  const { username, email, password, confirm_password } = req.body;

  if (!username || !email || !password || !confirm_password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ success: false, message: "Passwords do not match" });
  }
  if (users.find((u) => u.email === email)) {
    return res.status(409).json({ success: false, message: "Email already registered" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    username,
    email,
    password: hashed,
    isVerified: false,
    profile: { age: "", height: "", weight: "", address: "" },
    createdAt: new Date().toISOString(),
  };
  users.push(user);

  // Default notification settings
  notificationSettings.push({
    userId: user.id,
    emergencyAlerts: true,
    vitalWarnings: true,
    droneStatusUpdates: true,
    weeklyHealthReports: false,
  });

  res.status(201).json({ success: true, message: "Account created. Please verify your email." });
});

// POST /api/auth/signin
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  const user = users.find((u) => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }
  if (!user.isVerified) {
    return res.status(403).json({ success: false, message: "Email not verified" });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  const { password: _, ...userWithoutPassword } = user;

  res.json({ success: true, token, user: userWithoutPassword });
});

// POST /api/auth/otp  — request OTP
router.post("/otp", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email is required" });

  const user = users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; // 10 min

  // In production: send OTP via email service
  console.log(`[OTP] ${email}: ${otp}`);

  res.json({ success: true, message: "OTP sent to email" });
});

// POST /api/auth/otp/verify
router.post("/otp/verify", (req, res) => {
  const { email, auth_otp } = req.body;
  if (!email || !auth_otp) {
    return res.status(400).json({ success: false, message: "Email and OTP are required" });
  }

  const record = otpStore[email];
  if (!record || record.otp !== auth_otp || Date.now() > record.expiresAt) {
    return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
  }

  const user = users.find((u) => u.email === email);
  if (user) user.isVerified = true;
  delete otpStore[email];

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
  const { password: _, ...userWithoutPassword } = user;

  res.json({ success: true, message: "Email verified", token, user: userWithoutPassword });
});

// POST /api/auth/logout
router.post("/logout", authenticate, (req, res) => {
  // Stateless JWT — client should discard the token
  res.json({ success: true, message: "Logged out successfully" });
});

// POST /api/auth/session — exchange external auth user for a local JWT
// Called after external login to obtain a local token for our own API.
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
      profile: { age: "", height: "", weight: "", address: "" },
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

module.exports = router;
