const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { emergencyContacts } = require("../data/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const VALID_ROLES = ["Friend", "Relative", "Doctor"];

router.use(authenticate);

// GET /api/contacts — list own emergency contacts
router.get("/", (req, res) => {
  const contacts = emergencyContacts.filter((c) => c.userId === req.user.id);
  res.json({ success: true, data: contacts, total: contacts.length });
});

// GET /api/contacts/:id
router.get("/:id", (req, res) => {
  const contact = emergencyContacts.find((c) => c.id === req.params.id && c.userId === req.user.id);
  if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });

  res.json({ success: true, data: contact });
});

// POST /api/contacts — add emergency contact
router.post("/", (req, res) => {
  const { name, phone, role } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: "name and phone are required" });
  }
  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: `role must be one of: ${VALID_ROLES.join(", ")}` });
  }

  // Duplicate phone check per user
  const duplicate = emergencyContacts.find((c) => c.userId === req.user.id && c.phone === phone);
  if (duplicate) {
    return res.status(409).json({ success: false, message: "A contact with this phone number already exists" });
  }

  const contact = {
    id: uuidv4(),
    userId: req.user.id,
    name,
    phone,
    role: role || "Friend",
    createdAt: new Date().toISOString(),
  };
  emergencyContacts.push(contact);

  res.status(201).json({ success: true, data: contact });
});

// PUT /api/contacts/:id — update contact
router.put("/:id", (req, res) => {
  const contact = emergencyContacts.find((c) => c.id === req.params.id && c.userId === req.user.id);
  if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });

  const { name, phone, role } = req.body;

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: `role must be one of: ${VALID_ROLES.join(", ")}` });
  }

  if (name !== undefined) contact.name = name;
  if (phone !== undefined) contact.phone = phone;
  if (role !== undefined) contact.role = role;

  res.json({ success: true, data: contact });
});

// DELETE /api/contacts/:id
router.delete("/:id", (req, res) => {
  const index = emergencyContacts.findIndex((c) => c.id === req.params.id && c.userId === req.user.id);
  if (index === -1) return res.status(404).json({ success: false, message: "Contact not found" });

  emergencyContacts.splice(index, 1);
  res.json({ success: true, message: "Contact deleted" });
});

module.exports = router;
