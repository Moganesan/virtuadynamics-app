const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true },
  battery: { type: Number, default: 100 },
  signalStrength: { type: Number, default: -50 },
  status: { type: String, enum: ["disconnected", "scanning", "connected"], default: "disconnected" },
  pairedAt: { type: Date, default: Date.now },
});

deviceSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Device", deviceSchema);
