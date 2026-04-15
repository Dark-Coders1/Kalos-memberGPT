import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['member', 'coach'], default: 'member' },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', userSchema);
