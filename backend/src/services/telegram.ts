import crypto from 'crypto';
import User from '../models/User';
import ApiKey from '../models/ApiKey';
import Task from '../models/Task';
import Note from '../models/Note';
import Habit from '../models/Habit';
import Resource from '../models/Resource';
import { fetchUrlMetadata } from './metadata';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

let isPolling = false;
let lastUpdateId = 0;

async function sendTelegramMessage(chatId: string | number, text: string, options: any = {}) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        ...options,
      }),
    });
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

async function handleTelegramMessage(message: any) {
  const chatId = message.chat?.id;
  const text = (message.text || '').trim();
  if (!chatId || !text) return;

  // 1. Linking command: /start [kanso_pat_...]
  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const token = parts[1]?.trim();

    if (!token) {
      // Check if user is already linked
      const existingUser = await User.findOne({ telegramChatId: String(chatId) });
      if (existingUser) {
        await sendTelegramMessage(
          chatId,
          `👋 ¡Hola *${existingUser.name}*! Tu cuenta de Kanso Hub ya está conectada.\n\n` +
          `*Comandos disponibles:*\n` +
          `• \`/task <título>\` - Crear tarea rápida\n` +
          `• \`/note <contenido>\` - Guardar nota / snippet\n` +
          `• \`/tool <enlace>\` - Guardar herramienta / recurso\n` +
          `• \`/pasos <número>\` - Registrar pasos de hoy\n` +
          `• \`/summary\` - Resumen del día`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `👋 *¡Bienvenido al Bot de Kanso Hub!*\n\n` +
          `Para conectar este chat con tu cuenta:\n` +
          `1. Entra a tu Kanso Hub en la web y ve a *Configuración* -> *Claves de API*\n` +
          `2. Genera una clave y escribe aquí:\n\n` +
          `\`/start kanso_pat_tu_clave_aqui\``
        );
      }
      return;
    }

    if (token.startsWith('kanso_pat_') || token.startsWith('lifeos_pat_')) {
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      const apiKey = await ApiKey.findOne({ keyHash });

      if (!apiKey) {
        await sendTelegramMessage(chatId, `❌ Clave de API inválida o revocada. Revisa en tu Kanso Hub.`);
        return;
      }

      const user = await User.findById(apiKey.userId);
      if (!user) {
        await sendTelegramMessage(chatId, `❌ Usuario no encontrado.`);
        return;
      }

      user.telegramChatId = String(chatId);
      await user.save();

      await sendTelegramMessage(
        chatId,
        `✅ *¡Conectado exitosamente!* Hola *${user.name}*, ahora puedes enviar tareas y notas directamente desde aquí.`
      );
      return;
    }
  }

  // Check if current chat is linked to a user
  const user = await User.findOne({ telegramChatId: String(chatId) });
  if (!user) {
    await sendTelegramMessage(
      chatId,
      `⚠️ Este chat aún no está vinculado. Escribe:\n\`/start kanso_pat_tu_token\` para sincronizarlo.`
    );
    return;
  }

  // 2. Command: /task [title] [--priority high]
  if (text.startsWith('/task ') || text.startsWith('/t ')) {
    const rawContent = text.replace(/^\/(task|t)\s+/, '');
    let priority: 'low' | 'medium' | 'high' = 'medium';
    let title = rawContent;

    if (title.includes('--high')) {
      priority = 'high';
      title = title.replace('--high', '').trim();
    } else if (title.includes('--low')) {
      priority = 'low';
      title = title.replace('--low', '').trim();
    }

    const newTask = (await Task.create({
      userId: user._id,
      title,
      priority,
      status: 'todo',
    })) as any;

    await sendTelegramMessage(
      chatId,
      `✅ *Tarea guardada:* ${newTask.title}\nPrioridad: *${priority.toUpperCase()}*`
    );
    return;
  }


  // 3. Command: /note [content]
  if (text.startsWith('/note ') || text.startsWith('/n ')) {
    const content = text.replace(/^\/(note|n)\s+/, '');
    const firstLine = content.split('\n')[0].slice(0, 60);

    await Note.create({
      userId: user._id,
      title: firstLine || 'Nota desde Telegram',
      content,
      category: 'snippet',
      tags: ['telegram', 'quick-capture'],
    });

    await sendTelegramMessage(chatId, `📝 *Nota guardada en Kanso Hub:* "${firstLine}"`);
    return;
  }

  // 4. Command: /pasos [number]
  if (text.startsWith('/pasos ')) {
    const valueStr = text.replace('/pasos ', '').trim();
    const val = parseInt(valueStr, 10);
    if (isNaN(val)) {
      await sendTelegramMessage(chatId, `Por favor ingresa un número válido. Ej: \`/pasos 8500\``);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const habit = await Habit.findOne({
      userId: user._id,
      $or: [{ name: /pasos/i }, { unit: /pasos/i }],
    });

    if (!habit) {
      await sendTelegramMessage(chatId, `No encontré un hábito de 'pasos' en tu Kanso Hub.`);
      return;
    }

    let dailyLog = habit.dailyValues.find(dv => dv.date === todayStr);
    if (dailyLog) {
      dailyLog.value = val;
    } else {
      habit.dailyValues.push({ date: todayStr, value: val });
    }

    if (val >= (habit.targetValue || 10000)) {
      const idx = habit.completedDates.findIndex(d => d.toISOString().split('T')[0] === todayStr);
      if (idx < 0) habit.completedDates.push(new Date());
    }

    await habit.save();
    await sendTelegramMessage(
      chatId,
      `🚶‍♂️ *Pasos de hoy actualizados:* ${val.toLocaleString()} / ${habit.targetValue?.toLocaleString()} pasos.\n` +
      `Racha actual: *${habit.currentStreak} días*`
    );
    return;
  }

  // 5. Command: /summary
  if (text === '/summary' || text === '/resumen') {
    const pendingTasks = await Task.find({
      userId: user._id,
      status: { $in: ['todo', 'in_progress'] },
    }).sort({ priority: -1 }).limit(5);

    const habits = await Habit.find({ userId: user._id });
    const todayStr = new Date().toISOString().split('T')[0];
    const completedCount = habits.filter(h =>
      (h.completedDates || []).some(d => d.toISOString().split('T')[0] === todayStr)
    ).length;

    let response = `📊 *Resumen Diario Kanso Hub*\n`;
    response += `Tareas activas: *${pendingTasks.length}*\n`;
    response += `Hábitos hoy: *${completedCount} / ${habits.length}*\n\n`;

    if (pendingTasks.length > 0) {
      response += `*Tareas prioritarias:*\n`;
      pendingTasks.forEach(t => {
        response += `• [${t.priority.toUpperCase()}] ${t.title}\n`;
      });
    }

    await sendTelegramMessage(chatId, response);
    return;
  }

  // 6. Command: /tool, /link, /recurso or direct shared URL
  if (text.startsWith('/tool ') || text.startsWith('/link ') || text.startsWith('/recurso ') || /^https?:\/\//i.test(text)) {
    const rawUrl = text.replace(/^\/(tool|link|recurso)\s+/, '').trim();
    const urlMatch = rawUrl.match(/https?:\/\/[^\s]+/i);
    const targetUrl = urlMatch ? urlMatch[0] : rawUrl;

    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      await sendTelegramMessage(chatId, `⏳ *Obteniendo información del enlace...*`);
      try {
        const meta = await fetchUrlMetadata(targetUrl);
        const resource = (await Resource.create({
          userId: user._id,
          url: targetUrl,
          title: meta.title || targetUrl,
          description: meta.description || '',
          image: meta.image || '',
          favicon: meta.favicon || '',
          siteName: meta.siteName || '',
          author: meta.author || '',
          category: 'other',
          tags: ['telegram', 'shared'],
          reviewed: false,
        })) as any;

        await sendTelegramMessage(
          chatId,
          `🔖 *Herramienta guardada en Kanso Hub:*\n\n` +
          `📌 *${resource.title}*\n` +
          (meta.description ? `_${meta.description.slice(0, 140)}..._\n\n` : '\n') +
          `🌐 ${targetUrl}`
        );
        return;
      } catch (err: any) {
        const resource = (await Resource.create({
          userId: user._id,
          url: targetUrl,
          title: targetUrl,
          category: 'other',
          tags: ['telegram', 'shared'],
        })) as any;
        await sendTelegramMessage(chatId, `🔖 *Herramienta guardada:* ${targetUrl}`);
        return;
      }
    }
  }

  // Fallback: If regular text, save as quick task
  const newTask = (await Task.create({
    userId: user._id,
    title: text,
    priority: 'medium',
    status: 'todo',
  })) as any;

  await sendTelegramMessage(
    chatId,
    `📥 *Captura rápida guardada como tarea:*\n"${newTask.title}"`
  );
}

async function pollUpdates() {
  if (!BOT_TOKEN) return;

  try {
    const url = `${TELEGRAM_API}/getUpdates?offset=${lastUpdateId + 1}&timeout=25`;
    const res = await fetch(url);
    if (!res.ok) {
      setTimeout(pollUpdates, 5000);
      return;
    }

    const data = (await res.json()) as any;
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {

        lastUpdateId = update.update_id;
        if (update.message) {
          await handleTelegramMessage(update.message);
        }
      }
    }
  } catch (error) {
    // Network or timeout, wait before retrying
  }

  if (isPolling) {
    setTimeout(pollUpdates, 1000);
  }
}

export function startTelegramBot() {
  if (!BOT_TOKEN) {
    console.log('ℹ️  TELEGRAM_BOT_TOKEN no está configurado. Bot de Telegram deshabilitado.');
    return;
  }

  if (isPolling) return;
  isPolling = true;
  console.log('🤖 Bot de Telegram de Kanso Hub iniciado correctamente.');
  pollUpdates();
}

export function stopTelegramBot() {
  isPolling = false;
}
