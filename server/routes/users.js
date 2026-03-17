const express = require("express");
const { users } = require("../data/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/users/me — get local health data
router.get("/me", (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  // Return only local data (profile info is managed by VirtuaLogin)
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      profile: user.profile, // { height, weight }
    },
  });
});

// PUT /api/users/me — update local health data (height, weight)
router.put("/me", (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const { height, weight } = req.body;

  if (!user.profile) user.profile = { height: "", weight: "" };
  if (height !== undefined) user.profile.height = height;
  if (weight !== undefined) user.profile.weight = weight;

  res.json({
    success: true,
    message: "Health data updated",
    user: {
      id: user.id,
      email: user.email,
      profile: user.profile,
    },
  });
});

// DELETE /api/users/me — delete own local account
router.delete("/me", (req, res) => {
  const index = users.findIndex((u) => u.id === req.user.id);
  if (index === -1) return res.status(404).json({ success: false, message: "User not found" });

  users.splice(index, 1);
  res.json({ success: true, message: "Account deleted" });
});

module.exports = router;
