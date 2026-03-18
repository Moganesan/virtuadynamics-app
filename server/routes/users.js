const express = require("express");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// GET /api/users/me — get local health data
router.get("/me", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PUT /api/users/me — update local health data (height, weight)
router.put("/me", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { height, weight } = req.body;
    if (height !== undefined) user.profile.height = height;
    if (weight !== undefined) user.profile.weight = weight;
    await user.save();

    res.json({
      success: true,
      message: "Health data updated",
      user: {
        id: user._id.toString(),
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// DELETE /api/users/me — delete own local account
router.delete("/me", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, message: "Account deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
