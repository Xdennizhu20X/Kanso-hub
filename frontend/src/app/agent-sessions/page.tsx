'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Bot, Terminal, Copy, Check, Plus, Search, X, Edit2, Trash2,
  FolderKanban, Sparkles, Filter, CheckCircle2, Archive, Play, Tag,
  ExternalLink, User, Layers
} from 'lucide-react';

interface Project {
  _id: string;
  name: string;
  color: string;
}

interface AgentSession {
  _id: string;
  title: string;
  description: string;
  agent: 'antigravity' | 'claudecode' | 'opencode' | 'cursor' | 'codestral' | 'other';
  account: string;
  conversationId: string;
  command: string;
  projectId?: Project | null;
  tags: string[];
  status: 'active' | 'resolved' | 'archived';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const AGENTS: Record<string, { label: string; badgeClass: string; defaultCmd: (id: string) => string }> = {
  antigravity: {
    label: 'Antigravity (AGY)',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    defaultCmd: (id) => `agy --conversation=${id}`,
  },
  claudecode: {
    label: 'Claude Code',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    defaultCmd: (id) => `claude --resume ${id}`,
  },
  opencode: {
    label: 'OpenCode',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    defaultCmd: (id) => `opencode --session ${id}`,
  },
  cursor: {
    label: 'Cursor Agent',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    defaultCmd: (id) => `cursor --conversation ${id}`,
  },
  codestral: {
    label: 'Codestral',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    defaultCmd: (id) => `codestral ${id}`,
  },
  other: {
    label: 'Otro Agente',
    badgeClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
    defaultCmd: (id) => id,
  },
};

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  active: { label: 'Activa', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  resolved: { label: 'Resuelta', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  archived: { label: 'Archivada', class: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
};

export default function AgentSessionsPage() {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<AgentSession | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    agent: 'antigravity' as AgentSession['agent'],
    account: 'Personal',
    conversationId: '',
    command: '',
    projectId: '',
    tags: '',
    status: 'active' as AgentSession['status'],
    notes: '',
  });

  const loadData = () => {
    Promise.all([
      api.get<AgentSession[]>('/api/agent-sessions').catch(() => []),
      api.get<Project[]>('/api/projects').catch(() => []),
    ]).then(([s, p]) => {
      setSessions(s);
      setProjects(p);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute distinct accounts
  const distinctAccounts = useMemo(() => {
    const set = new Set(sessions.map(s => s.account).filter(Boolean));
    return Array.from(set);
  }, [sessions]);

  const handleOpenCreate = () => {
    setEditingSession(null);
    setForm({
      title: '',
      description: '',
      agent: 'antigravity',
      account: distinctAccounts[0] || 'Personal',
      conversationId: '',
      command: '',
      projectId: '',
      tags: '',
      status: 'active',
      notes: '',
    });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (session: AgentSession) => {
    setEditingSession(session);
    setForm({
      title: session.title,
      description: session.description,
      agent: session.agent,
      account: session.account,
      conversationId: session.conversationId,
      command: session.command,
      projectId: session.projectId?._id || '',
      tags: session.tags ? session.tags.join(', ') : '',
      status: session.status,
      notes: session.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleConversationIdChange = (id: string) => {
    const cleanId = id.trim();
    const generator = AGENTS[form.agent]?.defaultCmd || ((i: string) => i);
    setForm(prev => ({
      ...prev,
      conversationId: cleanId,
      command: prev.command && !prev.command.includes(prev.conversationId) ? prev.command : generator(cleanId),
    }));
  };

  const handleAgentChange = (newAgent: AgentSession['agent']) => {
    const generator = AGENTS[newAgent]?.defaultCmd || ((i: string) => i);
    setForm(prev => ({
      ...prev,
      agent: newAgent,
      command: prev.conversationId ? generator(prev.conversationId) : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = {
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      projectId: form.projectId || null,
    };

    try {
      if (editingSession) {
        const updated = await api.put<AgentSession>(`/api/agent-sessions/${editingSession._id}`, body);
        setSessions(sessions.map(s => s._id === editingSession._id ? updated : s));
      } else {
        const created = await api.post<AgentSession>('/api/agent-sessions', body);
        setSessions([created, ...sessions]);
      }
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la sesión');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta conversación guardada?')) return;
    await api.delete(`/api/agent-sessions/${id}`);
    setSessions(sessions.filter(s => s._id !== id));
  };

  const handleCopyCommand = (command: string, id: string) => {
    navigator.clipboard.writeText(command);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleStatus = async (session: AgentSession) => {
    const nextStatus = session.status === 'active' ? 'resolved' : 'active';
    const updated = await api.put<AgentSession>(`/api/agent-sessions/${session._id}`, { status: nextStatus });
    setSessions(sessions.map(s => s._id === session._id ? updated : s));
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (agentFilter !== 'all' && session.agent !== agentFilter) return false;
      if (accountFilter !== 'all' && session.account !== accountFilter) return false;
      if (statusFilter !== 'all' && session.status !== statusFilter) return false;
      if (selectedTag && !session.tags?.some(t => t.toLowerCase() === selectedTag.toLowerCase())) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = session.title.toLowerCase().includes(q);
        const matchDesc = session.description.toLowerCase().includes(q);
        const matchId = session.conversationId.toLowerCase().includes(q);
        const matchCmd = session.command?.toLowerCase().includes(q);
        const matchTag = session.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchId && !matchCmd && !matchTag) return false;
      }
      return true;
    });
  }, [sessions, agentFilter, accountFilter, statusFilter, selectedTag, searchQuery]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-muted)] text-[var(--accent)] flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Sesiones de Agentes IA</h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Control y comandos directos de tus conversaciones en Antigravity, Claude Code, OpenCode y más
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto shadow-sm"
        >
          <Plus size={14} />
          Guardar conversación
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Buscar por título, ID de conversación, tags o comando..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Account filter */}
            <select
              value={accountFilter}
              onChange={e => setAccountFilter(e.target.value)}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">Todas las cuentas</option>
              {distinctAccounts.map(acc => (
                <option key={acc} value={acc}>👤 {acc}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="resolved">Resueltas</option>
              <option value="archived">Archivadas</option>
            </select>
          </div>
        </div>

        {/* Agent Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setAgentFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              agentFilter === 'all'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)]'
            }`}
          >
            Todos ({sessions.length})
          </button>

          {Object.entries(AGENTS).map(([key, config]) => {
            const count = sessions.filter(s => s.agent === key).length;
            if (count === 0 && agentFilter !== key) return null;
            return (
              <button
                key={key}
                onClick={() => setAgentFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  agentFilter === key
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)]'
                }`}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Selected tag banner */}
        {selectedTag && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 w-fit">
            <Tag size={12} />
            <span>Filtrando por etiqueta: <strong>#{selectedTag}</strong></span>
            <button onClick={() => setSelectedTag(null)} className="hover:text-blue-200 ml-1">
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSessions.map(session => {
          const agentInfo = AGENTS[session.agent] || AGENTS.other;
          const statusInfo = STATUS_LABELS[session.status] || STATUS_LABELS.active;
          const isCopied = copiedId === session._id;

          return (
            <div
              key={session._id}
              className={`bg-[var(--bg-secondary)] rounded-xl p-5 border transition-all flex flex-col justify-between group ${
                session.status === 'resolved'
                  ? 'border-emerald-500/20 opacity-90'
                  : 'border-[var(--border)] hover:border-[var(--border-hover)]'
              }`}
            >
              <div>
                {/* Card Top Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${agentInfo.badgeClass}`}>
                      {agentInfo.label}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border)] flex items-center gap-1">
                      <User size={10} />
                      {session.account}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusInfo.class}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => handleToggleStatus(session)}
                      className="p-1.5 sm:p-1 rounded text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--bg-tertiary)]"
                      title={session.status === 'active' ? 'Marcar como resuelta' : 'Reabrir sesión'}
                    >
                      <CheckCircle2 size={14} />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(session)}
                      className="p-1.5 sm:p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-tertiary)]"
                      title="Editar sesión"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(session._id)}
                      className="p-1.5 sm:p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-tertiary)]"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5 line-clamp-1">
                  {session.title}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-4 line-clamp-2 leading-relaxed">
                  {session.description || 'Sin descripción detallada.'}
                </p>

                {/* Direct Terminal Command Box */}
                <div className="mb-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-2.5 flex items-center justify-between gap-2 group/cmd">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Terminal size={13} className="text-[var(--accent)] flex-shrink-0" />
                    <code className="text-xs font-mono text-[var(--text-primary)] truncate selection:bg-[var(--accent)] selection:text-white">
                      {session.command || session.conversationId}
                    </code>
                  </div>

                  <button
                    onClick={() => handleCopyCommand(session.command || session.conversationId, session._id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all flex-shrink-0 ${
                      isCopied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[var(--bg-tertiary)] hover:bg-[var(--accent)] hover:text-white text-[var(--text-secondary)]'
                    }`}
                    title="Copiar comando completo para tu terminal"
                  >
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Bottom Footer: Project, Tags & Timestamp */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {session.projectId && (
                    <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: session.projectId.color }} />
                      {session.projectId.name}
                    </span>
                  )}

                  {session.tags?.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                        selectedTag === tag
                          ? 'bg-blue-500/20 text-blue-300 font-medium'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>

                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {new Date(session.updatedAt || session.createdAt).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            </div>
          );
        })}

        {filteredSessions.length === 0 && sessions.length > 0 && (
          <div className="col-span-full bg-[var(--bg-secondary)] rounded-xl p-12 border border-[var(--border)] text-center">
            <p className="text-[var(--text-muted)] text-sm">No se encontraron sesiones con estos filtros.</p>
            <button
              onClick={() => { setSearchQuery(''); setAgentFilter('all'); setAccountFilter('all'); setStatusFilter('all'); setSelectedTag(null); }}
              className="mt-3 text-[var(--accent)] text-sm font-medium hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="col-span-full bg-[var(--bg-secondary)] rounded-xl p-12 border border-[var(--border)] text-center">
            <Bot size={36} className="mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
            <h3 className="text-sm font-medium text-[var(--text-primary)]">No hay conversaciones de agentes registradas</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
              Guarda tus IDs de conversación de Antigravity (agy), Claude Code u OpenCode para reanudarlas con un solo clic.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              Registrar primera conversación
            </button>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-xl bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-[var(--accent)]" />
                <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                  {editingSession ? 'Editar conversación de agente' : 'Guardar nueva conversación'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--bg-tertiary)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {error && <p className="text-[var(--danger)] text-xs">{error}</p>}

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Título de la sesión *
                </label>
                <input
                  type="text"
                  placeholder="ej. Refactor auth middleware y SSRF en backend"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Agente de IA *
                  </label>
                  <select
                    value={form.agent}
                    onChange={e => handleAgentChange(e.target.value as AgentSession['agent'])}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    {Object.entries(AGENTS).map(([key, info]) => (
                      <option key={key} value={key}>{info.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Cuenta o Perfil *
                  </label>
                  <input
                    type="text"
                    list="account-suggestions"
                    placeholder="ej. Personal, Trabajo, Cuenta 2"
                    value={form.account}
                    onChange={e => setForm({ ...form, account: e.target.value })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                    required
                  />
                  <datalist id="account-suggestions">
                    {distinctAccounts.map(acc => (
                      <option key={acc} value={acc} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Conversation ID / Session ID *
                </label>
                <input
                  type="text"
                  placeholder="ej. eac5d797-4f70-4a1c-adb5-2f107acae1ad"
                  value={form.conversationId}
                  onChange={e => handleConversationIdChange(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--text-primary)] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Comando directo de reanudación (autogenerado o editable)
                </label>
                <div className="relative">
                  <Terminal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="ej. agy --conversation=eac5d797-4f70-4a1c-adb5-2f107acae1ad"
                    value={form.command}
                    onChange={e => setForm({ ...form, command: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg text-xs font-mono text-[var(--text-primary)] outline-none"
                  />
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Este es el comando exacto que se copiará al portapapeles para pegar en tu terminal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Proyecto asociado (opcional)
                  </label>
                  <select
                    value={form.projectId}
                    onChange={e => setForm({ ...form, projectId: e.target.value })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    <option value="">Sin proyecto</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Estado
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as AgentSession['status'] })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    <option value="active">Activa (En curso)</option>
                    <option value="resolved">Resuelta</option>
                    <option value="archived">Archivada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Etiquetas (separadas por coma)
                </label>
                <input
                  type="text"
                  placeholder="ej. backend, bugfix, auth, docker"
                  value={form.tags}
                  onChange={e => setForm({ ...form, tags: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Descripción / Resumen de lo trabajado
                </label>
                <textarea
                  placeholder="Explica brevemente qué se resolvió, decisiones clave o qué quedó pendiente..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  {editingSession ? 'Actualizar sesión' : 'Guardar sesión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
