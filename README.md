# Kanso Hub (簡素) - Minimalist Workspace & AI Agent Hub

> **Kanso (簡素)**: *El principio Zen de la simplicidad, claridad y eliminación de lo superfluo.*

**Kanso Hub** es una plataforma web full-stack de alto rendimiento diseñada bajo una filosofía minimalista y zen, orientada a desarrolladores, creadores y equipos. Centraliza la gestión de proyectos, tareas (Kanban interactivo), notas inteligentes, hábitos, rutinas, calendario, metas con hitos, boveda de contraseñas de alta seguridad y un hub nativo para agentes autónomos de Inteligencia Artificial.

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16 (App Router + Turbopack) + React 19 + TypeScript
- **Estilos & UI**: Tailwind CSS v4 + Lucide Icons + Recharts (Diseño minimalista Dark/Light)
- **Drag & Drop**: @dnd-kit (Core, Sortable, Utilities)
- **Backend**: Node.js + Express 5 + TypeScript
- **Base de Datos**: MongoDB + Mongoose 9 (con índices compuestos optimizados)
- **Seguridad**:
  - Encriptación AES-256-GCM (contraseñas con clave maestra PBKDF2)
  - Autenticación JWT con rotación y Personal Access Tokens (`kanso_pat_...`)
  - Rate Limiting (`express-rate-limit`) en endpoints críticos y proxies
  - Protección SSRF avanzada para prevención de accesos a redes privadas/loopback/cloud metadata
- **Contenedores**: Docker & Docker Compose
- **MCP Server**: Model Context Protocol Server sobre `stdio` para agentes de IA

---

## 🚀 Despliegue en la Nube (Recomendado)

### 1. Frontend en Vercel
1. Conecta tu repositorio de GitHub `kanso-hub` en [Vercel](https://vercel.com).
2. En la configuración del proyecto:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
3. Variables de Entorno en Vercel:
   - `NEXT_PUBLIC_API_URL`: URL pública de tu backend (ej. `https://tu-backend.up.railway.app` o `https://tu-backend.onrender.com`)

### 2. Backend en Railway / Render
1. Conecta tu repositorio de GitHub `kanso-hub`.
2. Configuración del servicio:
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
3. Variables de Entorno en el backend:
   - `PORT`: `5000` (o el asignado automáticamente por el proveedor)
   - `MONGODB_URI`: Cadena de conexión de MongoDB Atlas (`mongodb+srv://...`)
   - `JWT_SECRET`: Clave secreta segura para JWT
   - `CORS_ORIGIN`: URL de tu frontend en Vercel (ej. `https://kanso-hub.vercel.app`)
   - `TELEGRAM_BOT_TOKEN`: (Opcional) Token de tu bot de Telegram de [@BotFather](https://t.me/botfather)
   - `GITHUB_TOKEN` / `GITHUB_USERNAME`: (Opcional) Para sincronización del Daily Standup

---

## 🐳 Despliegue Rápido con Docker

Para levantar toda la infraestructura localmente con un solo comando (MongoDB + Backend + Frontend):

```bash
docker-compose up -d --build
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **MongoDB**: `localhost:27017`

---

## 💻 Desarrollo Local

### Requisitos previos
- Node.js 20+
- MongoDB 6+ local o cluster de MongoDB Atlas

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env    # Configura tus variables
npm run dev             # Modo desarrollo con recarga automática
npm run build           # Compilación TypeScript
npm start               # Modo producción
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # Configura NEXT_PUBLIC_API_URL
npm run dev                 # Modo desarrollo Turbopack
npm run build               # Compilación de producción
npm start                   # Servidor de producción
```

### 3. MCP Server (Model Context Protocol)

```bash
cd mcp-server
npm install
npm run build
```

---

## ✨ Módulos y Funcionalidades

1. **Dashboard Centralizado**:
   - Resumen en tiempo real de tareas pendientes, hábitos completados y metas activas.
   - Gráfico de productividad semanal interactivo y alineado con los días del calendario.

2. **Calendario Dual (Mes y Semana)**:
   - **Vista Mensual**: Navegación por meses, vista de eventos por color y badges de estado.
   - **Vista Semanal**: Detalle por horas y días con badges de horario y visualización limpia.
   - Creación rápida de eventos y filtros por categoría/tipo.

3. **Gestor de Tareas Kanban**:
   - Drag & Drop fluido e interactivo entre columnas (*Pendiente*, *En Progreso*, *Completada*).
   - Filtro reactivo por proyecto específico o visualización global.
   - Vistas conmutables entre tablero Kanban y lista compacta.

4. **Proyectos Integrados**:
   - Indicadores de progreso en porcentaje calculados automáticamente según las tareas asociadas.
   - Enlace directo desde cada proyecto al tablero Kanban filtrado.
   - Desasociación segura de tareas al eliminar proyectos.

5. **Notas Inteligentes**:
   - Búsqueda en tiempo real por título, contenido y etiquetas (`#tags`).
   - Filtrado rápido por categorías (Idea, Snippet, Aprendizaje, Recordatorio).
   - Fijación de notas importantes (`pinned`).

6. **Tracker de Hábitos**:
   - Visualización de racha de los últimos 7 días con días exactos de la semana.
   - Cálculo automático de rachas consecutivas (streaks) y ratio de cumplimiento.

7. **Metas con Hitos (Milestones)**:
   - Desglose de metas en hitos específicos.
   - Barra de progreso interactiva que se recalcula instantáneamente al completar hitos.
   - Filtros por estado y fecha objetivo.

8. **Bóveda de Contraseñas (Vault)**:
   - Encriptación AES-256-GCM en el servidor con clave maestra PBKDF2.
   - Generador integrado de contraseñas de alta seguridad.
   - Desencriptación segura mediante `POST /api/passwords/:id/decrypt` (sin exponer credenciales en la URL).
   - Acciones de revelar contraseña y copia al portapapeles en 1 clic.

9. **Herramientas & Recursos**:
   - Extracción automática de metadatos (título, descripción, favicon/open-graph) con validación SSRF.
   - Contador de herramientas revisadas y filtrado por categorías.

10. **Rutinas Diarias**:
    - Programación de bloques de tiempo y hábitos matutinos/vespertinos.
    - Frecuencia y progreso semanal preciso.

11. **Sesiones de Agentes IA (Coding Agents Hub)**:
    - Registro centralizado de conversaciones con agentes de codificación (`Antigravity`, `Claude Code`, `OpenCode`, `Cursor`, etc.).
    - Copia rápida en 1 clic del comando de reanudación exacto (`agy --conversation=<id>`, `claude --resume <id>`, etc.).
    - Separación y filtrado por cuenta de usuario (Personal vs Trabajo), proyecto, etiquetas y estado.
    - Búsqueda en tiempo real e integración con la paleta de comandos (`Ctrl + K`).

12. **Diseño Adaptativo & Temas**:
    - Tema Oscuro y Claro conmutables y sincronizados con la base de datos del usuario.
    - Menú lateral deslizante y cabecera optimizada para teléfonos móviles y tablets.

---

## 🔒 API Endpoints Principales

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Registro de usuario |
| `POST` | `/api/auth/login` | Login con token JWT |
| `GET` | `/api/auth/me` | Perfil del usuario autenticado |
| `POST` | `/api/auth/master-key` | Configurar o verificar clave maestra |
| `PUT` | `/api/auth/preferences` | Guardar tema y preferencias de notificación |
| `GET/POST` | `/api/projects` | Listar y crear proyectos |
| `PUT/DELETE`| `/api/projects/:id` | Actualizar o eliminar proyecto (desasocia tareas) |
| `GET/POST` | `/api/tasks` | Listar y crear tareas |
| `PUT/DELETE`| `/api/tasks/:id` | Actualizar estado o eliminar tarea |
| `GET/POST` | `/api/calendar` | Listar y crear eventos de calendario |
| `GET/POST` | `/api/notes` | Listar y crear notas |
| `GET/POST` | `/api/habits` | Listar y crear hábitos |
| `POST` | `/api/habits/:id/toggle`| Marcar o desmarcar hábito para hoy |
| `GET/POST` | `/api/goals` | Listar y crear metas |
| `POST` | `/api/goals/:id/milestones` | Añadir hito a una meta |
| `PUT` | `/api/goals/:id/milestones/:mId` | Marcar o desmarcar hito completado |
| `DELETE` | `/api/goals/:id/milestones/:mId` | Eliminar hito de una meta |
| `GET/POST` | `/api/passwords` | Listar y crear credenciales encriptadas |
| `POST` | `/api/passwords/:id/decrypt` | Desencriptar credencial de forma segura |
| `GET/POST` | `/api/resources` | Listar y guardar URLs/recursos con metadata |
| `GET` | `/api/image-proxy` | Proxy seguro de imágenes con validación SSRF y rate limit |
| `GET/POST` | `/api/agent-sessions` | Listar con filtros y registrar sesiones de agentes IA |
| `GET` | `/api/agent-sessions/accounts` | Obtener listado único de cuentas configuradas |
| `GET/PUT/DELETE` | `/api/agent-sessions/:id` | Obtener, actualizar o eliminar una sesión de agente |
| `GET/POST` | `/api/api-keys` | Listar y generar Claves de API / Tokens de Acceso Personal (`kanso_pat_...`) |
| `DELETE` | `/api/api-keys/:id` | Revocar una Clave de API |
| `GET` | `/api/agent/summary` | Briefing matutino/contextual para agentes IA (tareas, hábitos, rutinas, sesiones) |
| `GET` | `/api/agent/projects` | Lista simplificada de proyectos activos para asistentes de código |
| `POST` | `/api/agent/tasks/batch` | Creación atómica en lote de múltiples tareas (Task Decomposition) |
| `POST` | `/api/agent/quick-log` | Registro simultáneo de sesión, notas de arquitectura y tareas completadas |
| `GET` | `/api/agent/github-activity` | Consulta actividad y commits públicos de hoy desde GitHub |
| `GET` | `/api/backup/export` | Exportación completa de todos los datos del usuario en formato JSON |

---

## ⚡ Superpoderes para Desarrolladores

1. **Modo Enfoque & Pomodoro Tracker**:
   - Temporizador flotante y maximizable (Pomodoro 25m, Deep Work 50m, pausas cortas y largas).
   - Vinculación directa con tareas del tablero Kanban y acumulación de minutos reales (`actualMinutes`).
   - Generador nativo de Ruido Rosa/Lluvia mediante Web Audio API (100% offline, sin dependencias externas).

2. **Progressive Web App (PWA)**:
   - Instalable en escritorio (Windows/macOS) y dispositivos móviles (Android/iOS) con apariencia nativa.
   - Icono de alta resolución y Service Worker integrado (`sw.js`) con caché estática offline.

3. **Bot de Telegram (Captura Rápida On-the-Go)**:
   - Vinculación segura de chat vía `/start kanso_pat_...`.
   - Comandos: `/task <título>`, `/note <texto>`, `/pasos <número>`, `/summary`.
   - Captura rápida de mensajes de texto directos como tareas en el Inbox.

4. **Sincronización Git / GitHub & Daily Standup**:
   - Detección automática de commits del día vía GitHub API.
   - Inclusión de commits, tareas cerradas, hábitos cumplidos y sesiones de agentes IA en el reporte unificado de **Daily Standup**.

5. **Soberanía y Respaldo de Datos (1-Click Export)**:
   - Descarga de todas las colecciones personales (proyectos, tareas, notas, hábitos, rutinas, metas, credenciales encriptadas y sesiones de agentes) en un archivo `.json` estandarizado.

---

## 🤖 Ecosistema para Agentes de Inteligencia Artificial

Kanso Hub incluye integración nativa de primera clase para agentes de codificación autónomos (**Google Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, etc.):

1. **Tokens de Acceso Personal (PAT)**:
   - Generados en `/settings` con encriptación SHA-256 en base de datos.
   - Autenticación transparente mediante encabezado `Authorization: Bearer kanso_pat_...` (con retrocompatibilidad para `lifeos_pat_...`).

2. **Kanso Hub MCP Server (`/mcp-server`)**:
   - Servidor compatible con el estándar **Model Context Protocol** sobre stdio.
   - Herramientas: `kanso_get_summary`, `kanso_list_projects`, `kanso_create_task`, `kanso_create_batch_tasks`, `kanso_list_tasks`, `kanso_update_task_status`, `kanso_create_note`, `kanso_log_agent_session`.
   - Retrocompatibilidad automática con llamadas `lifeos_*`.

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT.
