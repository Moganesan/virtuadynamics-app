const mongoose = require("mongoose");

const droneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ["standby", "active", "charging", "offline"], default: "standby" },
  location: { type: String, default: "Unknown" },
  battery: { type: Number, default: 100 },
  speed: { type: Number, default: 0 },
  apiUrl: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

droneSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Drone", droneSchema);
