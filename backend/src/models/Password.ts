import mongoose from 'mongoose';

const passwordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  site: { type: String, required: true },
  username: { type: String, required: true },
  encryptedPassword: { type: String, required: true },
  iv: { type: String, required: true },
  notes: { type: String, default: '' },
  category: { type: String, enum: ['work', 'personal', 'finance', 'social', 'other'], default: 'other' },
}, { timestamps: true });

passwordSchema.index({ userId: 1, category: 1 });

export default mongoose.model('Password', passwordSchema);
