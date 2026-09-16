import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  color: { type: String, default: '#3b82f6' },
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  masterKey: { type: String, default: null },
  categories: {
    type: Map,
    of: categorySchema,
    default: () => new Map([
      ['dev-tools', { key: 'dev-tools', label: 'Dev Tools', color: '#3b82f6' }],
      ['design', { key: 'design', label: 'Diseño', color: '#8b5cf6' }],
      ['ai', { key: 'ai', label: 'IA', color: '#10b981' }],
      ['learning', { key: 'learning', label: 'Aprendizaje', color: '#f59e0b' }],
      ['other', { key: 'other', label: 'Otro', color: '#71717a' }],
    ]),
  },
  preferences: {
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    dailySummaryTime: { type: String, default: '20:00' },
  },
  pushSubscription: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  telegramChatId: { type: String, default: null },
  githubUsername: { type: String, default: null },
}, { timestamps: true });

userSchema.index({ telegramChatId: 1 });

export default mongoose.model('User', userSchema);

