const mongoose = require("mongoose");

const emergencyContactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ["Friend", "Relative", "Doctor"], default: "Friend" },
  createdAt: { type: Date, default: Date.now },
});

emergencyContactSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("EmergencyContact", emergencyContactSchema);
