import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'other' },
  tags: [{ type: String }],
  reviewed: { type: Boolean, default: false },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  image: { type: String, default: '' },
  favicon: { type: String, default: '' },
  siteName: { type: String, default: '' },
  author: { type: String, default: '' },
  metadataFetched: { type: Boolean, default: false },
}, { timestamps: true });

resourceSchema.index({ userId: 1, category: 1, reviewed: 1 });

export default mongoose.model('Resource', resourceSchema);
