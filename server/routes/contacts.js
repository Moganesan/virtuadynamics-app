const express = require("express");
const EmergencyContact = require("../models/EmergencyContact");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const VALID_ROLES = ["Friend", "Relative", "Doctor"];

router.use(authenticate);

// GET /api/contacts — list own emergency contacts
router.get("/", async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({ userId: req.user.id });
    res.json({ success: true, data: contacts, total: contacts.length });
  } catch (err) {
    console.error("Get contacts error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/contacts/:id
router.get("/:id", async (req, res) => {
  try {
    const contact = await EmergencyContact.findOne({ _id: req.params.id, userId: req.user.id });
    if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });

    res.json({ success: true, data: contact });
  } catch (err) {
    console.error("Get contact error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/contacts — add emergency contact
router.post("/", async (req, res) => {
  try {
    const { name, phone, role } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: "name and phone are required" });
    }
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: `role must be one of: ${VALID_ROLES.join(", ")}` });
    }

    const duplicate = await EmergencyContact.findOne({ userId: req.user.id, phone });
    if (duplicate) {
      return res.status(409).json({ success: false, message: "A contact with this phone number already exists" });
    }

    const contact = await EmergencyContact.create({
      userId: req.user.id,
      name,
      phone,
      role: role || "Friend",
    });

    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    console.error("Create contact error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PUT /api/contacts/:id — update contact
router.put("/:id", async (req, res) => {
  try {
    const { name, phone, role } = req.body;

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: `role must be one of: ${VALID_ROLES.join(", ")}` });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;

    const contact = await EmergencyContact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: updates },
      { new: true }
    );
    if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });

    res.json({ success: true, data: contact });
  } catch (err) {
    console.error("Update contact error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// DELETE /api/contacts/:id
router.delete("/:id", async (req, res) => {
  try {
    const contact = await EmergencyContact.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });

    res.json({ success: true, message: "Contact deleted" });
  } catch (err) {
    console.error("Delete contact error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
