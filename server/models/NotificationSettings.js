const mongoose = require("mongoose");

const notificationSettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  emergencyAlerts: { type: Boolean, default: true },
  vitalWarnings: { type: Boolean, default: true },
  droneStatusUpdates: { type: Boolean, default: false },
  weeklyHealthReports: { type: Boolean, default: true },
});

notificationSettingsSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.userId;
    return ret;
  },
});

module.exports = mongoose.model("NotificationSettings", notificationSettingsSchema);
