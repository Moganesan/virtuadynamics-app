const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  externalUserId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true },
  profile: {
    height: { type: String, default: "" },
    weight: { type: String, default: "" },
  },
  createdAt: { type: Date, default: Date.now },
});

userSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
