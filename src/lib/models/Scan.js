import mongoose from 'mongoose';

const scanSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scanDate: { type: Date, required: true, index: true },
    weight: { type: Number, required: true },
    bodyFatPercent: { type: Number, required: true },
    leanMass: { type: Number, required: true },
    fatMass: { type: Number, required: true },
    visceralFat: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    source: { type: String, default: 'manual' },
  },
  { timestamps: true }
);

export default mongoose.models.Scan || mongoose.model('Scan', scanSchema);
