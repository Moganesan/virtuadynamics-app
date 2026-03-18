const mongoose = require("mongoose");

const vitalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  heartRate: { type: Number },
  bloodOxygen: { type: Number },
  temperature: { type: Number, default: null },
  bloodPressure: { type: String, default: null },
  trend: { type: String, enum: ["up", "down", "flat"], default: "flat" },
  recordedAt: { type: Date, default: Date.now },
});

vitalSchema.index({ userId: 1, recordedAt: -1 });

vitalSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Vital", vitalSchema);
