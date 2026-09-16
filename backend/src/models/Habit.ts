import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
  kind: { type: String, enum: ['boolean', 'numeric'], default: 'boolean' },
  targetValue: { type: Number, default: 1 },
  unit: { type: String, default: '' },
  color: { type: String, default: '#10b981' },
  icon: { type: String, default: '✓' },
  completedDates: [{ type: Date }],
  dailyValues: [{
    date: { type: String }, // 'YYYY-MM-DD'
    value: { type: Number, default: 0 },
  }],
  currentStreak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
}, { timestamps: true });

habitSchema.index({ userId: 1 });

export default mongoose.model('Habit', habitSchema);
