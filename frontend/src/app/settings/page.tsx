'use client';

import { useState, useEffect } from 'react';
import { Bell, Mail, Save, Monitor, Moon, Sun, Check, Key, Plus, Trash2, Copy, Shield, Terminal, AlertCircle, Bot, Download, HardDrive, Send, GitBranch } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import { api } from '@/lib/api';

interface ApiKeyItem {
  _id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { user, updatePreferences } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [dailySummaryTime, setDailySummaryTime] = useState('20:00');
  const [githubUsername, setGithubUsername] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);



  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyExpiresDays, setKeyExpiresDays] = useState<number>(0);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [keyError, setKeyError] = useState('');

  useEffect(() => {
    if (user?.preferences) {
      setTheme(user.preferences.theme || 'dark');
      setEmailNotifications(user.preferences.emailNotifications ?? true);
      setPushNotifications(user.preferences.pushNotifications ?? true);
      setDailySummaryTime(user.preferences.dailySummaryTime || '20:00');
    }
    if (user?.githubUsername) {
      setGithubUsername(user.githubUsername);
    } else if (typeof window !== 'undefined') {
      const localTheme = localStorage.getItem('lifeos_theme') as 'dark' | 'light' | null;
      if (localTheme) setTheme(localTheme);
    }
    loadApiKeys();
  }, [user]);


  const loadApiKeys = async () => {
    try {
      setLoadingKeys(true);
      const data = await api.get<ApiKeyItem[]>('/api/api-keys');
      setApiKeys(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching API keys:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    try {
      setCreatingKey(true);
      setKeyError('');
      const res = await api.post<{ token: string; apiKey: ApiKeyItem }>('/api/api-keys', {
        name: keyName.trim(),
        scopes: ['all'],
        expiresDays: keyExpiresDays > 0 ? keyExpiresDays : undefined,
      });

      setNewlyCreatedToken(res.token);
      setApiKeys(prev => [res.apiKey, ...prev]);
      setKeyName('');
    } catch (err: any) {
      setKeyError(err.message || 'Error al crear la clave');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas revocar esta clave? Cualquier agente que la use perderá el acceso inmediatamente.')) {
      return;
    }
    try {
      await api.delete(`/api/api-keys/${id}`);
      setApiKeys(prev => prev.filter(k => k._id !== id));
    } catch (err: any) {
      alert(err.message || 'Error al revocar la clave');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleDownloadBackup = async () => {
    try {
      setDownloadingBackup(true);
      const data = await api.get('/api/backup/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `kanso_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error al descargar copia de seguridad');
    } finally {
      setDownloadingBackup(false);
    }
  };


  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    updatePreferences({ theme: newTheme });
  };

  const handleSave = async () => {
    setLoading(true);
    await updatePreferences(
      {
        theme,
        emailNotifications,
        pushNotifications,
        dailySummaryTime,
      },
      {
        githubUsername,
      }
    );
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };


  const [permissionState, setPermissionState] = useState<string>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission === 'granted') {
        setPushNotifications(true);
        updatePreferences({ pushNotifications: true });
        new Notification('¡Notificaciones LifeOS activadas!', {
          body: 'Recibirás alertas antes de tus bloques de rutina y tareas de hoy.',
          icon: '/favicon.ico',
        });
      }
    }
  };

  const sendTestNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Prueba de alerta LifeOS', {
        body: 'Este es un recordatorio de ejemplo para tus rutinas y tareas.',
        icon: '/favicon.ico',
      });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-8">Configuración</h1>

      <div className="max-w-3xl space-y-6">
        {/* Apariencia */}
        <div className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Monitor size={16} className="text-[var(--accent)]" />
            Apariencia
          </h2>
          <div className="flex gap-3">
            <button
              onClick={() => handleThemeChange('dark')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                theme === 'dark'
                  ? 'border-[var(--accent)] bg-[var(--bg-primary)] text-[var(--text-primary)]'
                  : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:border-[var(--border-hover)]'
              }`}
            >
              <Moon size={16} />
              Oscuro
            </button>
            <button
              onClick={() => handleThemeChange('light')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                theme === 'light'
                  ? 'border-[var(--accent)] bg-[var(--bg-primary)] text-[var(--text-primary)]'
                  : 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:border-[var(--border-hover)]'
              }`}
            >
              <Sun size={16} />
              Claro
            </button>
          </div>
        </div>

        {/* Notificaciones */}
        <div className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Bell size={16} className="text-[var(--accent)]" />
            Notificaciones y Recordatorios
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Alertas del navegador (Web Notifications)</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Avisos antes de iniciar bloques de rutina y recordatorios de tareas de hoy.
                  Estado: <strong className="text-[var(--text-secondary)]">{permissionState === 'granted' ? 'Concedido' : permissionState === 'denied' ? 'Bloqueado' : 'Por activar'}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {permissionState === 'granted' ? (
                  <button
                    type="button"
                    onClick={sendTestNotification}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-tertiary)] hover:bg-[var(--border-hover)] text-[var(--text-secondary)] transition-colors"
                  >
                    Probar alerta
                  </button>
                ) : (
                  <button
                    onClick={requestPushPermission}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors"
                  >
                    Activar en este navegador
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm flex items-center gap-2"><Mail size={14} /> Resumen diario por email</p>
                <p className="text-xs text-[var(--text-muted)]">Recibe un resumen de tu día</p>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  emailNotifications
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {emailNotifications ? 'Activado' : 'Desactivado'}
              </button>
            </div>
            {emailNotifications && (
              <div className="flex items-center gap-3 py-2">
                <span className="text-sm text-[var(--text-secondary)]">Hora del resumen:</span>
                <input
                  type="time"
                  value={dailySummaryTime}
                  onChange={e => setDailySummaryTime(e.target.value)}
                  className="bg-[var(--bg-primary)] rounded-lg px-3 py-1.5 border border-[var(--border)] text-sm text-[var(--text-primary)]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Claves de API y Conexión de Agentes (PAT) */}
        <div className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Key size={16} className="text-[var(--accent)]" />
              Claves de API y Tokens de Agentes IA (PAT)
            </h2>
            <button
              onClick={() => {
                setShowNewKeyModal(true);
                setNewlyCreatedToken(null);
                setKeyError('');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors self-start sm:self-auto"
            >
              <Plus size={14} />
              Generar Nueva Clave
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)] mb-4">
            Crea Tokens de Acceso Personal (PAT) para conectar <strong>Antigravity (agy)</strong>, <strong>Claude Code</strong>, <strong>Cursor</strong> o el <strong>Kanso Hub MCP Server</strong> para que creen tareas, rutinas, notas y registren sesiones de forma automatizada.
          </p>

          {/* Banner de token recién creado */}
          {newlyCreatedToken && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <div className="flex items-center gap-2 mb-2 font-medium text-sm">
                <Shield size={16} />
                ¡Tu clave de API se ha generado correctamente!
              </div>
              <p className="text-xs text-emerald-300/80 mb-2">
                Por seguridad, <strong>copia esta clave ahora mismo</strong>. No podrás volver a consultarla una vez que cierres esta pestaña.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-black/40 p-2.5 rounded-lg border border-emerald-500/20 font-mono text-xs text-emerald-200 break-all select-all">
                <span className="flex-1">{newlyCreatedToken}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(newlyCreatedToken)}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-sans text-xs font-medium transition-colors shrink-0"
                >
                  {copiedToken ? <Check size={14} /> : <Copy size={14} />}
                  {copiedToken ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          )}

          {/* Listado de Claves */}
          {loadingKeys ? (
            <div className="text-xs text-[var(--text-muted)] py-3">Cargando claves de API...</div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-[var(--border)] rounded-lg text-xs text-[var(--text-muted)]">
              No tienes ninguna clave de API creada. Genera una para conectar tus agentes de IA.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
              {apiKeys.map((key) => (
                <div key={key._id} className="p-3.5 flex items-center justify-between bg-[var(--bg-primary)]/50 hover:bg-[var(--bg-primary)] transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-[var(--text-primary)]">{key.name}</span>
                      <code className="text-xs px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-mono">
                        {key.prefix}
                      </code>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] flex items-center gap-2 flex-wrap">
                      <span>Creada: {new Date(key.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Último uso: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Nunca'}</span>
                      {key.expiresAt && (
                        <>
                          <span>•</span>
                          <span className={new Date(key.expiresAt) < new Date() ? 'text-red-400 font-medium' : ''}>
                            Expira: {new Date(key.expiresAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevokeKey(key._id)}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Revocar clave"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Guía rápida de uso */}
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
              <Terminal size={14} className="text-[var(--accent)]" />
              Ejemplo de uso en terminal o scripts:
            </div>
            <pre className="p-2.5 bg-black/40 rounded-lg border border-[var(--border)] font-mono text-[11px] text-[var(--text-muted)] overflow-x-auto">
              curl -H &quot;Authorization: Bearer kanso_pat_...&quot; http://localhost:4000/api/tasks
            </pre>
          </div>
        </div>

        {/* Respaldo y Soberanía de Datos */}
        <div className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <HardDrive size={16} className="text-[var(--accent)]" />
              Respaldo y Soberanía de Datos
            </h2>
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={downloadingBackup}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-50 self-start sm:self-auto"
            >
              <Download size={14} />
              {downloadingBackup ? 'Generando archivo...' : 'Exportar Todo (.json)'}
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Descarga una copia de seguridad íntegra de todos tus proyectos, tareas, notas, hábitos, rutinas, metas, sesiones de agentes y credenciales encriptadas en un único archivo JSON estandarizado. Tus datos siempre te pertenecen.
          </p>
        </div>

        {/* Bot de Telegram (Captura Rápida) */}
        <div className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Send size={16} className="text-[#229ED9]" />
            Bot de Telegram (Captura Rápida On-the-Go)
          </h2>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Captura tareas, notas y registra pasos diarios desde tu celular enviando mensajes a tu bot de Telegram.
          </p>
          <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] space-y-2 text-xs">
            <div className="text-[var(--text-secondary)] font-medium">Instrucciones de conexión:</div>
            <ol className="list-decimal list-inside space-y-1 text-[var(--text-muted)]">
              <li>Configura <code className="text-[var(--accent)] font-mono">TELEGRAM_BOT_TOKEN</code> en <code className="font-mono">backend/.env</code> (obtenido de @BotFather).</li>
              <li>Abre una conversación con tu bot en Telegram y escribe:</li>
            </ol>
            <pre className="p-2 bg-black/40 rounded border border-[var(--border)] font-mono text-[11px] text-emerald-400 select-all">
              /start kanso_pat_tu_clave_de_api
            </pre>
            <div className="text-[11px] text-[var(--text-muted)] pt-1">
              Comandos soportados: <code className="text-[var(--text-secondary)]">/task [título]</code>, <code className="text-[var(--text-secondary)]">/note [texto]</code>, <code className="text-[var(--text-secondary)]">/pasos [número]</code>, <code className="text-[var(--text-secondary)]">/summary</code>.
            </div>
          </div>
        </div>

        {/* Integración con GitHub (Dev Activity) */}
        <div className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-sm font-medium mb-2 flex items-center gap-2">
            <GitBranch size={16} className="text-[var(--accent)]" />
            Integración con GitHub (Dev Activity & Commits)
          </h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Conecta tu usuario de GitHub para que tus commits y actividad de código diaria aparezcan automáticamente en tu <strong>Daily Standup</strong> y reportes de productividad.
          </p>
          <div className="max-w-md">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Nombre de usuario de GitHub
            </label>
            <div className="flex items-center">
              <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-primary)] px-2.5 py-2 rounded-l-lg border border-r-0 border-[var(--border)]">
                github.com/
              </span>
              <input
                type="text"
                placeholder="tu-usuario"
                value={githubUsername}
                onChange={e => setGithubUsername(e.target.value)}
                className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-r-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        </div>

        {/* Botón Guardar Preferencias */}
        <button



          onClick={handleSave}
          disabled={loading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            saved
              ? 'bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent)]'
              : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
          }`}
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'Guardado exitosamente' : loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {/* Modal Generar Clave de API */}
      {showNewKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 font-medium text-base text-[var(--text-primary)]">
                <Key size={18} className="text-[var(--accent)]" />
                Nueva Clave de API (Token PAT)
              </div>
              <button
                type="button"
                onClick={() => setShowNewKeyModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm"
              >
                ✕
              </button>
            </div>

            {keyError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                {keyError}
              </div>
            )}

            <form onSubmit={handleCreateApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Nombre descriptivo del Agente o Servicio
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Antigravity CLI, Claude Code MCP, Cursor"
                  value={keyName}
                  onChange={e => setKeyName(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Expiración
                </label>
                <select
                  value={keyExpiresDays}
                  onChange={e => setKeyExpiresDays(Number(e.target.value))}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value={0}>Sin expiración (recomendado para agentes personales)</option>
                  <option value={30}>30 días</option>
                  <option value={90}>90 días</option>
                  <option value={365}>1 año</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
                Esta clave tendrá permisos completos para crear tareas, consultar proyectos, añadir notas y sincronizar sesiones de agentes en tu cuenta.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewKeyModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingKey || !keyName.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors disabled:opacity-50"
                >
                  {creatingKey ? 'Generando...' : 'Crear Clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

