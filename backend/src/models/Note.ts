import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  category: { type: String, enum: ['idea', 'snippet', 'learning', 'reminder', 'other'], default: 'other' },
  tags: [{ type: String }],
  pinned: { type: Boolean, default: false },
}, { timestamps: true });

noteSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });

export default mongoose.model('Note', noteSchema);
