import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#3b82f6' },
  status: { type: String, enum: ['active', 'paused', 'completed', 'archived'], default: 'active' },
}, { timestamps: true });

projectSchema.index({ userId: 1, status: 1 });

export default mongoose.model('Project', projectSchema);
