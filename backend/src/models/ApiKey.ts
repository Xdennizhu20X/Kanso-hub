import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  keyHash: { type: String, required: true, unique: true },
  prefix: { type: String, required: true },
  scopes: [{ type: String, default: 'all' }],
  lastUsedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

apiKeySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('ApiKey', apiKeySchema);
