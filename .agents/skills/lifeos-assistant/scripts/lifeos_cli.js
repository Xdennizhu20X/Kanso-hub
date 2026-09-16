#!/usr/bin/env node

/**
 * LifeOS Assistant CLI Helper
 * Permite a agentes de IA o al usuario interactuar rápidamente con LifeOS desde la terminal.
 *
 * Uso:
 *   node lifeos_cli.js summary
 *   node lifeos_cli.js task add "Título" --priority high --desc "Detalles"
 *   node lifeos_cli.js note add "Título" "Contenido en markdown" --category snippet
 *   node lifeos_cli.js session log "Título" --id <convId> --agent antigravity
 */

const fs = require('fs');
const path = require('path');

const API_BASE = (process.env.LIFEOS_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
const API_KEY = process.env.LIFEOS_API_KEY || '';

async function request(endpoint, options = {}) {
  if (!API_KEY) {
    console.error('Error: Debes definir la variable de entorno LIFEOS_API_KEY con tu token (lifeos_pat_...).');
    process.exit(1);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      ...options.headers,
    },
  });

  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (!res.ok) {
      console.error(`Error (${res.status}):`, json.error || json.message || text);
      process.exit(1);
    }
    return json;
  } catch {
    if (!res.ok) {
      console.error(`Error (${res.status}):`, text);
      process.exit(1);
    }
    return text;
  }
}

async function main() {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help') {
    console.log(`
LifeOS CLI Assistant
--------------------
Comandos disponibles:
  summary                            Obtiene el resumen diario y briefing de hoy
  projects                           Lista los proyectos activos con sus IDs
  task list                          Lista las tareas pendientes
  task add <titulo> [opciones]       Crea una nueva tarea
    --desc <descripcion>
    --priority <low|medium|high>
    --project <projectId>
  note add <titulo> <contenido>      Crea una nueva nota o snippet
    --category <idea|snippet|learning|reminder|other>
    --tags <tag1,tag2>
  session log <titulo>               Registra una sesión de agente de IA
    --id <conversationId>
    --agent <antigravity|claudecode|cursor|opencode>
    --desc <descripcion>
    --command <comando>
    `);
    return;
  }

  if (command === 'summary') {
    const data = await request('/api/agent/summary');
    console.log('\n=== RESUMEN DIARIO LIFEOS ===');
    console.log(`Usuario: ${data.briefing.userName} | Fecha: ${data.briefing.currentDate}`);
    console.log(`Tareas pendientes: ${data.stats.pendingTasksCount}`);
    console.log(`Hábitos completados hoy: ${data.stats.habitsCompletedToday} / ${data.stats.totalHabitsToday}`);
    console.log('\n--- Tareas prioritarias ---');
    (data.tasks || []).slice(0, 5).forEach((t, i) => {
      console.log(`${i + 1}. [${t.priority.toUpperCase()}] ${t.title} (${t.status})`);
    });
    console.log('\n--- Hábitos de hoy ---');
    (data.todayHabits || []).forEach(h => {
      console.log(`- [${h.completedToday ? 'X' : ' '}] ${h.name} (Racha: ${h.currentStreak} días)`);
    });
    return;
  }

  if (command === 'projects') {
    const projects = await request('/api/agent/projects');
    console.log('\n=== PROYECTOS ACTIVOS ===');
    projects.forEach(p => console.log(`- [${p._id}] ${p.name}`));
    return;
  }

  if (command === 'task') {
    const sub = args[0];
    if (sub === 'list') {
      const tasks = await request('/api/tasks?status=todo,in_progress');
      console.log('\n=== TAREAS ACTIVAS ===');
      tasks.forEach(t => console.log(`- [${t._id}] (${t.priority}) ${t.title} [${t.status}]`));
      return;
    }

    if (sub === 'add') {
      const title = args[1];
      if (!title) {
        console.error('Error: Debes proporcionar un título para la tarea.');
        return;
      }
      let priority = 'medium';
      let description = '';
      let projectId = null;

      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--priority') priority = args[++i];
        if (args[i] === '--desc') description = args[++i];
        if (args[i] === '--project') projectId = args[++i];
      }

      const res = await request('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title, priority, description, projectId }),
      });
      console.log('✓ Tarea creada exitosamente:', res.title, `(ID: ${res._id})`);
      return;
    }
  }

  if (command === 'note' && args[0] === 'add') {
    const title = args[1];
    const content = args[2] || '';
    let category = 'snippet';
    let tags = [];

    for (let i = 3; i < args.length; i++) {
      if (args[i] === '--category') category = args[++i];
      if (args[i] === '--tags') tags = args[++i].split(',').map(s => s.trim());
    }

    const res = await request('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ title, content, category, tags }),
    });
    console.log('✓ Nota guardada exitosamente:', res.title, `(ID: ${res._id})`);
    return;
  }

  if (command === 'session' && args[0] === 'log') {
    const title = args[1];
    let conversationId = '';
    let agent = 'antigravity';
    let description = '';
    let customCommand = '';

    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--id') conversationId = args[++i];
      if (args[i] === '--agent') agent = args[++i];
      if (args[i] === '--desc') description = args[++i];
      if (args[i] === '--command') customCommand = args[++i];
    }

    const res = await request('/api/agent-sessions', {
      method: 'POST',
      body: JSON.stringify({
        title,
        conversationId,
        agent,
        description,
        command: customCommand,
      }),
    });
    console.log('✓ Sesión de agente registrada exitosamente:', res.title);
    console.log('  Comando para reanudar:', res.command);
    return;
  }

  console.log(`Comando no reconocido: ${command}. Ejecuta "node lifeos_cli.js help" para ver opciones.`);
}

main().catch(err => {
  console.error('Error no controlado:', err);
  process.exit(1);
});
