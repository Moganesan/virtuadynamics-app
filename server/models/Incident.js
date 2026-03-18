const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  date: { type: String },
  time: { type: String },
  anomalyType: { type: String, required: true },
  severity: { type: String, enum: ["critical", "warning", "resolved"], required: true },
  routedTo: { type: String, default: null },
  routedRole: { type: String, default: null },
  droneId: { type: String, default: null },
  location: { type: String, default: null },
  hasRecording: { type: Boolean, default: false },
  recordingUrl: { type: String, default: null },
  recordingDuration: { type: String, default: null },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

incidentSchema.index({ userId: 1, createdAt: -1 });

incidentSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Incident", incidentSchema);
