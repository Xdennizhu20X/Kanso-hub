#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

const API_BASE_URL = (process.env.KANSO_API_URL || process.env.LIFEOS_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const API_KEY = process.env.KANSO_API_KEY || process.env.LIFEOS_API_KEY || '';

async function fetchKanso(endpoint: string, options: RequestInit = {}) {
  if (!API_KEY) {
    throw new Error('KANSO_API_KEY (o LIFEOS_API_KEY) no está configurada. Proporciona tu Personal Access Token (kanso_pat_...).');
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedError = errorText;
    try {
      const json = JSON.parse(errorText);
      parsedError = json.error || json.message || errorText;
    } catch {
      // Keep errorText
    }
    throw new Error(`Kanso Hub API Error (${response.status}): ${parsedError}`);
  }

  return response.json();
}

const server = new Server(
  {
    name: 'kanso-hub-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tool list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'kanso_get_summary',
        description: 'Obtiene el resumen diario completo del usuario en Kanso Hub: tareas pendientes y en progreso, hábitos de hoy, proyectos activos, bloques de rutina y sesiones recientes de agentes.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'kanso_list_projects',
        description: 'Lista los proyectos activos del usuario en Kanso Hub con sus IDs, nombres, colores y estados.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'kanso_create_task',
        description: 'Crea una nueva tarea en Kanso Hub, opcionalmente asignada a un proyecto.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Título de la tarea' },
            description: { type: 'string', description: 'Descripción o detalles de la tarea' },
            projectId: { type: 'string', description: 'ID de MongoDB del proyecto al que pertenece' },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Prioridad de la tarea (low, medium, high)',
            },
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'done'],
              description: 'Estado inicial de la tarea',
            },
            dueDate: { type: 'string', description: 'Fecha de vencimiento en formato ISO o YYYY-MM-DD' },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Etiquetas asociadas a la tarea',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'kanso_create_batch_tasks',
        description: 'Crea múltiples tareas de una sola vez en Kanso Hub. Muy útil cuando descompones un requerimiento, feature o sprint en varias subtareas.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'ID opcional del proyecto común para todas las tareas' },
            tasks: {
              type: 'array',
              description: 'Lista de tareas a crear',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                  dueDate: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                },
                required: ['title'],
              },
            },
          },
          required: ['tasks'],
        },
      },
      {
        name: 'kanso_list_tasks',
        description: 'Consulta tareas existentes en Kanso Hub con filtros por estado y/o proyecto.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'done'],
              description: 'Filtrar por estado',
            },
            projectId: {
              type: 'string',
              description: 'Filtrar por ID de proyecto',
            },
          },
        },
      },
      {
        name: 'kanso_update_task_status',
        description: 'Actualiza el estado de una tarea existente en Kanso Hub (por ejemplo al finalizarla en un sprint o sesión).',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ID de la tarea' },
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'done'],
              description: 'Nuevo estado de la tarea',
            },
          },
          required: ['taskId', 'status'],
        },
      },
      {
        name: 'kanso_create_note',
        description: 'Crea una nota, snippet de código, recordatorio o registro de aprendizaje en Kanso Hub.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Título de la nota' },
            content: { type: 'string', description: 'Contenido en formato Markdown' },
            category: {
              type: 'string',
              enum: ['idea', 'snippet', 'learning', 'reminder', 'other'],
              description: 'Categoría de la nota',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Etiquetas para clasificar la nota',
            },
          },
          required: ['title', 'content'],
        },
      },
      {
        name: 'kanso_log_agent_session',
        description: 'Registra una sesión de agente de IA (Antigravity, Claude Code, Cursor, etc.) en Kanso Hub con comando para reanudarla y notas.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Título representativo de la sesión' },
            agent: {
              type: 'string',
              enum: ['antigravity', 'claudecode', 'opencode', 'cursor', 'codestral', 'other'],
              description: 'Agente de IA utilizado',
            },
            conversationId: { type: 'string', description: 'ID de conversación o sesión del agente' },
            description: { type: 'string', description: 'Resumen de lo trabajado o logrado en la sesión' },
            account: { type: 'string', description: 'Cuenta asociada (ej: Personal, Trabajo)' },
            command: { type: 'string', description: 'Comando de terminal para reanudar (ej: agy --conversation=...)' },
            tags: { type: 'array', items: { type: 'string' } },
            projectId: { type: 'string', description: 'ID de proyecto asociado en Kanso Hub' },
            status: { type: 'string', enum: ['active', 'resolved', 'archived'] },
          },
          required: ['title', 'agent', 'conversationId'],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  // Normalize tool name so both kanso_ and lifeos_ prefixes work identically
  const canonicalName = name.replace(/^lifeos_/, 'kanso_');

  try {
    switch (canonicalName) {
      case 'kanso_get_summary': {
        const summary = await fetchKanso('/api/agent/summary');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      case 'kanso_list_projects': {
        const projects = await fetchKanso('/api/agent/projects');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      }

      case 'kanso_create_task': {
        const task = await fetchKanso('/api/tasks', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        return {
          content: [
            {
              type: 'text',
              text: `Tarea creada con éxito:\n${JSON.stringify(task, null, 2)}`,
            },
          ],
        };
      }

      case 'kanso_create_batch_tasks': {
        const result = await fetchKanso('/api/agent/tasks/batch', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'kanso_list_tasks': {
        const params = new URLSearchParams();
        if ((args as any).status) params.append('status', (args as any).status);
        if ((args as any).projectId) params.append('projectId', (args as any).projectId);
        const query = params.toString() ? `?${params.toString()}` : '';
        const tasks = await fetchKanso(`/api/tasks${query}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tasks, null, 2),
            },
          ],
        };
      }

      case 'kanso_update_task_status': {
        const { taskId, status } = args as any;
        const updated = await fetchKanso(`/api/tasks/${taskId}`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        });
        return {
          content: [
            {
              type: 'text',
              text: `Estado de la tarea actualizado a "${status}":\n${JSON.stringify(updated, null, 2)}`,
            },
          ],
        };
      }

      case 'kanso_create_note': {
        const note = await fetchKanso('/api/notes', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        return {
          content: [
            {
              type: 'text',
              text: `Nota guardada exitosamente:\n${JSON.stringify(note, null, 2)}`,
            },
          ],
        };
      }

      case 'kanso_log_agent_session': {
        const session = await fetchKanso('/api/agent-sessions', {
          method: 'POST',
          body: JSON.stringify(args),
        });
        return {
          content: [
            {
              type: 'text',
              text: `Sesión de agente registrada exitosamente en Kanso Hub:\n${JSON.stringify(session, null, 2)}`,
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Herramienta desconocida: ${name}`);
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error ejecutando ${name}: ${error.message}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Kanso Hub MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error in Kanso Hub MCP Server:', err);
  process.exit(1);
});
