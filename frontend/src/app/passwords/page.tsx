'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Eye, EyeOff, Trash2, Lock, Copy, Check, KeyRound, Sparkles } from 'lucide-react';

interface PasswordEntry {
  _id: string;
  site: string;
  username: string;
  encryptedPassword: string;
  notes: string;
  category: string;
}

const CATEGORIES: Record<string, string> = {
  work: 'Trabajo', personal: 'Personal', finance: 'Finanzas', social: 'Social', other: 'Otro'
};

const CATEGORY_STYLES: Record<string, string> = {
  work: 'bg-blue-500/10 text-blue-400',
  personal: 'bg-purple-500/10 text-purple-400',
  finance: 'bg-emerald-500/10 text-emerald-400',
  social: 'bg-pink-500/10 text-pink-400',
  other: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
};

export default function PasswordsPage() {
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [masterKey, setMasterKey] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [decryptedIds, setDecryptedIds] = useState<Set<string>>(new Set());
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ site: '', username: '', password: '', notes: '', category: 'other' });

  useEffect(() => {
    api.get<PasswordEntry[]>('/api/passwords').then(setPasswords).catch(() => {});
  }, []);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    let res = '';
    for (let i = 0; i < 16; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(f => ({ ...f, password: res }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!masterKey) {
      setError('Ingresa tu contraseña maestra para encriptar');
      return;
    }
    try {
      const created = await api.post<PasswordEntry>('/api/passwords', {
        ...form, masterKey
      });
      setPasswords([created, ...passwords]);
      setShowForm(false);
      setForm({ site: '', username: '', password: '', notes: '', category: 'other' });
    } catch (err: any) {
      setError(err.message || 'Error al guardar contraseña');
    }
  };

  const decryptPassword = async (id: string) => {
    if (decryptedIds.has(id)) {
      setDecryptedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      return;
    }
    if (!masterKey) {
      setError('Ingresa tu contraseña maestra arriba para desencriptar');
      return;
    }
    try {
      const res = await api.post<{ password: string }>(`/api/passwords/${id}/decrypt`, { masterKey });
      setDecryptedPasswords(prev => ({ ...prev, [id]: res.password }));
      setDecryptedIds(prev => new Set(prev).add(id));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Contraseña maestra incorrecta');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/passwords/${id}`);
    setPasswords(passwords.filter(p => p._id !== id));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contraseñas</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">Bóveda protegida con cifrado AES-256</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto">
          <Plus size={14} />
          Nueva contraseña
        </button>
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border)] mb-6">
        <div className="flex items-center gap-3">
          <Lock size={16} className="text-amber-400 flex-shrink-0" />
          <input type={showMasterKey ? 'text' : 'password'}
            placeholder="Contraseña maestra (necesaria para encriptar y ver contraseñas)"
            value={masterKey}
            onChange={e => { setMasterKey(e.target.value); setError(''); }}
            className="flex-1 bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
          <button onClick={() => setShowMasterKey(!showMasterKey)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1">
            {showMasterKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error && <p className="text-[var(--danger)] text-xs mt-2">{error}</p>}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--bg-secondary)] rounded-xl p-4 sm:p-6 border border-[var(--border)] mb-8">
          <h3 className="text-sm font-medium mb-4">Guardar nueva credencial</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" placeholder="Sitio o Servicio (ej. Github)" value={form.site}
              onChange={e => setForm({ ...form, site: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" required />
            <input type="text" placeholder="Usuario o Email" value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" required />
            <div className="relative">
              <input type="text" placeholder="Contraseña" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-[var(--bg-primary)] rounded-lg pl-3 pr-20 py-2 border border-[var(--border)] focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] font-mono placeholder:font-sans placeholder:text-[var(--text-muted)]" required />
              <button type="button" onClick={generatePassword}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-2 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--border-hover)] text-[var(--accent)] text-[11px] font-medium flex items-center gap-1 transition-colors">
                <Sparkles size={11} />
                Generar
              </button>
            </div>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)]">
              {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="text" placeholder="Notas (opcional)" value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] col-span-1 sm:col-span-2" />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Guardar</button>
            <button type="button" onClick={() => setShowForm(false)}
              className="bg-[var(--bg-tertiary)] hover:bg-[var(--border-hover)] px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] transition-colors">Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-2.5">
        {passwords.map(pw => {
          const isDecrypted = decryptedIds.has(pw._id);
          const plainText = decryptedPasswords[pw._id];
          return (
            <div key={pw._id} className="bg-[var(--bg-secondary)] rounded-xl px-4 sm:px-5 py-3.5 sm:py-4 border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center text-sm font-semibold text-[var(--text-primary)] flex-shrink-0">
                    {pw.site[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium truncate">{pw.site}</h3>
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${CATEGORY_STYLES[pw.category]}`}>
                        {CATEGORIES[pw.category]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[var(--text-muted)] text-xs truncate">{pw.username}</span>
                      <button
                        onClick={() => copyToClipboard(pw.username, `user-${pw._id}`)}
                        title="Copiar usuario"
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-0.5"
                      >
                        {copiedId === `user-${pw._id}` ? <Check size={12} className="text-[var(--accent)]" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password display & action */}
                <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]/40 w-full sm:w-auto">
                  <div className="flex items-center gap-2 bg-[var(--bg-primary)] px-3 py-1.5 rounded-lg border border-[var(--border)] flex-1 sm:flex-initial">
                    <span className={`text-xs font-mono select-all truncate ${isDecrypted ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)] tracking-widest'}`}>
                      {isDecrypted ? plainText : '••••••••••••'}
                    </span>
                    {isDecrypted && (
                      <button
                        onClick={() => copyToClipboard(plainText, `pw-${pw._id}`)}
                        title="Copiar contraseña"
                        className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors ml-auto sm:ml-1 p-0.5"
                      >
                        {copiedId === `pw-${pw._id}` ? <Check size={13} className="text-[var(--accent)]" /> : <Copy size={13} />}
                      </button>
                    )}
                    <button
                      onClick={() => decryptPassword(pw._id)}
                      title={isDecrypted ? 'Ocultar' : 'Ver contraseña'}
                      className="text-[var(--text-muted)] hover:text-amber-400 transition-colors ml-auto sm:ml-1 p-0.5"
                    >
                      {isDecrypted ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  <button onClick={() => handleDelete(pw._id)}
                    title="Eliminar"
                    className="text-[var(--text-muted)] hover:text-[var(--danger)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {pw.notes && (
                <p className="text-xs text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border)]/50">{pw.notes}</p>
              )}
            </div>
          );
        })}
        {passwords.length === 0 && (
          <div className="bg-[var(--bg-secondary)] rounded-xl p-12 border border-[var(--border)] text-center">
            <KeyRound size={32} className="mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
            <p className="text-[var(--text-muted)] text-sm">No hay contraseñas guardadas</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-[var(--accent)] text-sm font-medium hover:underline">
              Guardar primera contraseña
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
