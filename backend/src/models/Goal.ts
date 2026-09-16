import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
  targetDate: { type: Date, required: true },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  milestones: [{
    name: { type: String, required: true },
    completed: { type: Boolean, default: false },
  }],
  status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },
}, { timestamps: true });

goalSchema.index({ userId: 1, status: 1, targetDate: 1 });

export default mongoose.model('Goal', goalSchema);
