import mongoose from 'mongoose';

const routineSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activity: { type: String, required: true },
  time: { type: String, required: true },
  endTime: { type: String, default: '' },
  category: { type: String, default: 'work' },
  frequency: { type: String, enum: ['daily', 'weekly', 'custom'], default: 'daily' },
  daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0=Sun, 1=Mon, ... 6=Sat
  color: { type: String, default: '#10b981' },
  completedDates: [{ type: String }], // ['2026-09-01', '2026-09-02']
  notes: { type: String, default: '' },
  archived: { type: Boolean, default: false },
}, { timestamps: true });

routineSchema.index({ userId: 1, archived: 1, time: 1 });

export default mongoose.model('Routine', routineSchema);
