# LifeOS MCP Server (Model Context Protocol)

Servidor oficial de MCP para **LifeOS**. Permite que cualquier asistente de inteligencia artificial compatible con Model Context Protocol (Google Antigravity, Claude Code, Cursor, Windsurf, Claude Desktop) interactúe bidireccionalmente con tu aplicación LifeOS.

---

## 🛠️ Herramientas Expuestas para el Agente

| Herramienta | Descripción |
| :--- | :--- |
| `lifeos_get_summary` | Briefing matutino/diario con tareas activas, hábitos de hoy, proyectos y rutinas. |
| `lifeos_list_projects` | Lista proyectos existentes con sus IDs y colores. |
| `lifeos_create_task` | Crea una tarea en LifeOS (con prioridad, vencimiento, etiquetas y proyecto). |
| `lifeos_create_batch_tasks` | Desglosa un requerimiento o sprint y crea múltiples tareas de un solo golpe. |
| `lifeos_list_tasks` | Consulta y filtra tareas por estado (`todo`, `in_progress`, `done`) o proyecto. |
| `lifeos_update_task_status`| Cambia el estado de una tarea (ideal para marcarla completada al terminar de codear). |
| `lifeos_create_note` | Guarda notas, snippets de código, decisiones de arquitectura o recordatorios. |
| `lifeos_log_agent_session` | Registra la sesión actual del agente con su ID y comando para reanudar (`agy`, `claude`, etc.). |

---

## 🔑 Requisitos

1. Tener el backend de LifeOS corriendo (por defecto en `http://localhost:4000` o `http://localhost:5000`).
2. Generar un **Token de Acceso Personal (PAT)** en la interfaz web de LifeOS:
   - Ve a **Configuración** (`/settings`).
   - En la sección **Claves de API y Tokens de Agentes IA (PAT)**, haz clic en **Generar Nueva Clave**.
   - Asigna un nombre (ej: `Claude MCP` o `Antigravity CLI`) y copia el token generado (`lifeos_pat_...`).

---

## 🚀 Configuración en Clientes de IA

### 1. Google Antigravity (`agy`)

Añade la configuración en tu archivo de configuración de Antigravity MCP o en `~/.gemini/antigravity-cli/mcp/lifeos.json`:

```json
{
  "command": "node",
  "args": ["D:/apps/lifeos/mcp-server/dist/index.js"],
  "env": {
    "LIFEOS_API_URL": "http://localhost:4000",
    "LIFEOS_API_KEY": "lifeos_pat_tu_token_aqui"
  }
}
```

### 2. Claude Code CLI

Ejecuta en tu terminal:

```bash
claude mcp add lifeos node D:/apps/lifeos/mcp-server/dist/index.js -e LIFEOS_API_URL=http://localhost:4000 -e LIFEOS_API_KEY=lifeos_pat_tu_token_aqui
```

### 3. Cursor IDE (`.cursor/mcp.json`)

En la raíz de tu proyecto o configuración global de Cursor:

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "node",
      "args": ["D:/apps/lifeos/mcp-server/dist/index.js"],
      "env": {
        "LIFEOS_API_URL": "http://localhost:4000",
        "LIFEOS_API_KEY": "lifeos_pat_tu_token_aqui"
      }
    }
  }
}
```

### 4. Claude Desktop (`claude_desktop_config.json`)

En `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "node",
      "args": ["D:/apps/lifeos/mcp-server/dist/index.js"],
      "env": {
        "LIFEOS_API_URL": "http://localhost:4000",
        "LIFEOS_API_KEY": "lifeos_pat_tu_token_aqui"
      }
    }
  }
}
```

---

## 💻 Compilación y Desarrollo

```bash
cd mcp-server
npm install
npm run build
```
