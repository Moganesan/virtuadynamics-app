const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const vitalsRoutes = require("./routes/vitals");
const droneRoutes = require("./routes/drones");
const incidentRoutes = require("./routes/incidents");
const contactRoutes = require("./routes/contacts");
const deviceRoutes = require("./routes/devices");
const notificationRoutes = require("./routes/notifications");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vitals", vitalsRoutes);
app.use("/api/drones", droneRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// 404 fallback
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`VirtuaDynamics API running on http://localhost:${PORT}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST   /api/auth/signup`);
  console.log(`  POST   /api/auth/signin`);
  console.log(`  POST   /api/auth/otp`);
  console.log(`  POST   /api/auth/otp/verify`);
  console.log(`  POST   /api/auth/logout`);
  console.log(`  GET    /api/users/me`);
  console.log(`  PUT    /api/users/me`);
  console.log(`  PUT    /api/users/me/password`);
  console.log(`  DELETE /api/users/me`);
  console.log(`  GET    /api/vitals`);
  console.log(`  GET    /api/vitals/latest`);
  console.log(`  GET    /api/vitals/:id`);
  console.log(`  POST   /api/vitals`);
  console.log(`  PUT    /api/vitals/:id`);
  console.log(`  DELETE /api/vitals/:id`);
  console.log(`  GET    /api/drones`);
  console.log(`  GET    /api/drones/:id`);
  console.log(`  POST   /api/drones`);
  console.log(`  PUT    /api/drones/:id`);
  console.log(`  PATCH  /api/drones/:id/status`);
  console.log(`  DELETE /api/drones/:id`);
  console.log(`  GET    /api/incidents`);
  console.log(`  GET    /api/incidents/:id`);
  console.log(`  POST   /api/incidents`);
  console.log(`  PUT    /api/incidents/:id`);
  console.log(`  PATCH  /api/incidents/:id/severity`);
  console.log(`  DELETE /api/incidents/:id`);
  console.log(`  GET    /api/contacts`);
  console.log(`  GET    /api/contacts/:id`);
  console.log(`  POST   /api/contacts`);
  console.log(`  PUT    /api/contacts/:id`);
  console.log(`  DELETE /api/contacts/:id`);
  console.log(`  GET    /api/devices`);
  console.log(`  GET    /api/devices/:id`);
  console.log(`  POST   /api/devices`);
  console.log(`  PUT    /api/devices/:id`);
  console.log(`  PATCH  /api/devices/:id/status`);
  console.log(`  DELETE /api/devices/:id`);
  console.log(`  GET    /api/notifications`);
  console.log(`  PUT    /api/notifications`);
  console.log(`  PATCH  /api/notifications/:key`);
});
