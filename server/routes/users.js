const express = require("express");
const bcrypt = require("bcryptjs");
const { users } = require("../data/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/users/me — get own profile
router.get("/me", (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, user: userWithoutPassword });
});

// PUT /api/users/me — update own profile
router.put("/me", (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const { username, age, height, weight, address } = req.body;

  if (username) user.username = username;
  if (user.profile) {
    if (age !== undefined) user.profile.age = age;
    if (height !== undefined) user.profile.height = height;
    if (weight !== undefined) user.profile.weight = weight;
    if (address !== undefined) user.profile.address = address;
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, message: "Profile updated", user: userWithoutPassword });
});

// PUT /api/users/me/password — change password
router.put("/me/password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Both passwords are required" });
  }

  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(401).json({ success: false, message: "Current password is incorrect" });

  user.password = await bcrypt.hash(newPassword, 10);
  res.json({ success: true, message: "Password updated" });
});

// DELETE /api/users/me — delete own account
router.delete("/me", (req, res) => {
  const index = users.findIndex((u) => u.id === req.user.id);
  if (index === -1) return res.status(404).json({ success: false, message: "User not found" });

  users.splice(index, 1);
  res.json({ success: true, message: "Account deleted" });
});

module.exports = router;
