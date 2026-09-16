import mongoose from 'mongoose';

const agentSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  agent: {
    type: String,
    enum: ['antigravity', 'claudecode', 'opencode', 'cursor', 'codestral', 'other'],
    default: 'antigravity',
  },
  account: { type: String, default: 'Personal' },
  conversationId: { type: String, required: true },
  command: { type: String, default: '' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  tags: [{ type: String }],
  status: { type: String, enum: ['active', 'resolved', 'archived'], default: 'active' },
  notes: { type: String, default: '' },
}, { timestamps: true });

agentSessionSchema.index({ userId: 1, agent: 1, account: 1 });
agentSessionSchema.index({ userId: 1, status: 1 });
agentSessionSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model('AgentSession', agentSessionSchema);
