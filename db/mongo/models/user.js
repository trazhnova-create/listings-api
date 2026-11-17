const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Поле email обязательно'],
      unique: true, 
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Некорректный email'],
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);


userSchema.methods.toSafeObject = function () {
  return { id: this.id, email: this.email, role: this.role, createdAt: this.createdAt };
};

module.exports = mongoose.model('User', userSchema);