---
name: lifeos-assistant
description: >-
  Connects directly with the user's LifeOS productivity system to manage Kanban tasks,
  decompose coding features into tasks, create architecture notes/snippets, check daily habits,
  and log AI coding agent sessions. Activate whenever the user mentions LifeOS, tasks, habits,
  daily routines, or asks to log the session or save architectural decisions into LifeOS.
---

# LifeOS Assistant Skill

This skill equips the agent with direct access to the user's **LifeOS** platform (Backend API + MCP Server) to automate productivity tracking while coding.

---

## 🔑 Authentication & Configuration

The skill communicates with the LifeOS backend via REST API or the LifeOS MCP Server.

- **Default URL**: `http://localhost:4000` (or `http://localhost:5000` depending on your environment, check `process.env.PORT`).
- **Auth Header**: `Authorization: Bearer <LIFEOS_API_KEY>`
  - The API key is a **Personal Access Token (PAT)** starting with `lifeos_pat_...` created in LifeOS Settings (`/settings`).

---

## 🛠️ Core Capabilities & Endpoints

### 1. Daily Briefing & Context (`GET /api/agent/summary`)
Use this to understand the user's current day, pending tasks, active projects, and habits:
```http
GET /api/agent/summary
Authorization: Bearer lifeos_pat_...
```
Returns:
- `briefing`: User name, formatted date, day of week.
- `stats`: Pending tasks count, habits completed today vs total, active projects count.
- `projects`: List of active projects with IDs and colors.
- `tasks`: In-progress and pending tasks sorted by priority and due date.
- `todayHabits`: Habits for today with streaks and completion status.
- `routineBlocks`: Scheduled time blocks for today.
- `recentSessions`: Recent AI agent sessions.

### 2. Task Decomposition (`POST /api/agent/tasks/batch`)
When planning a complex feature, refactoring, or bug fix:
1. Break down the plan into 2 to 5 actionable tasks.
2. Ask the user: *"¿Deseas que registre estas tareas en tu tablero Kanban de LifeOS?"*.
3. Post the batch:
```http
POST /api/agent/tasks/batch
Authorization: Bearer lifeos_pat_...
Content-Type: application/json

{
  "projectId": "66da...", // optional
  "tasks": [
    {
      "title": "Configurar middleware de autenticación PAT",
      "description": "Implementar soporte para tokens lifeos_pat_ con hash SHA-256",
      "priority": "high",
      "tags": ["backend", "auth"]
    },
    {
      "title": "Crear interfaz de gestión de tokens en Settings",
      "description": "Modal para generar y copiar tokens con expiración",
      "priority": "medium",
      "tags": ["frontend", "ui"]
    }
  ]
}
```

### 3. Log Agent Session (`POST /api/agent-sessions`)
When finishing work or when requested by the user:
```http
POST /api/agent-sessions
Authorization: Bearer lifeos_pat_...
Content-Type: application/json

{
  "title": "Implementación de tokens PAT y MCP Server",
  "description": "Se completó la Fase 1, 2 y 3 de la integración de agentes IA en LifeOS",
  "agent": "antigravity",
  "account": "Personal",
  "conversationId": "<conversation-id>",
  "command": "agy --conversation=<conversation-id>",
  "tags": ["mcp", "pat", "agent"],
  "status": "resolved"
}
```

### 4. Create Architecture Note or Snippet (`POST /api/notes`)
When a tricky bug is solved, a pattern is established, or an architectural decision is made:
```http
POST /api/notes
Authorization: Bearer lifeos_pat_...
Content-Type: application/json

{
  "title": "Patrón de Seguridad PAT con SHA-256 en LifeOS",
  "content": "Para evitar almacenar tokens en texto plano, los tokens PAT se generan con `crypto.randomBytes(24)` y se almacenan como hashes SHA-256...",
  "category": "snippet",
  "tags": ["security", "auth", "crypto"],
  "pinned": false
}
```

### 5. Atomic Quick-Log (`POST /api/agent/quick-log`)
Saves an agent session, an optional note, and marks tasks as completed in a single call:
```http
POST /api/agent/quick-log
Authorization: Bearer lifeos_pat_...
Content-Type: application/json

{
  "session": {
    "title": "Optimización de consultas en MongoDB",
    "agent": "antigravity",
    "conversationId": "...",
    "tags": ["mongodb", "performance"]
  },
  "note": {
    "title": "Índices compuestos optimizados",
    "content": "Explicación de índices para { userId: 1, status: 1 }...",
    "category": "learning"
  },
  "completedTaskIds": ["66da123..."]
}
```

---

## 📋 Proactive Agent Behaviors

1. **Suggest Saving Sessions**: If a long, productive coding session concludes with successful builds/tests, proactively ask if the user wants to log it to LifeOS with the resume command.
2. **Context-Aware Kanban**: If the user asks *"¿Qué tengo que hacer hoy?"*, query `GET /api/agent/summary` and give a concise, inspiring morning report.
3. **Respect Privacy**: Never send secrets, passwords, or raw `.env` contents to notes or task descriptions.
