import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, 'data.json');

dotenv.config();
const PORT = Number(process.env.PORT || 8080);
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const app = express();
const allowedOrigins = [
  process.env.APP_URL,
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:4173',
].filter(Boolean);
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
app.use(cors({
  origin(origin, callback) {
    // Allow server-to-server tools and same-machine dev ports.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || localhostOriginPattern.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS: origin not allowed'));
  },
}));
app.use(express.json({ limit: '1mb' }));

const sessions = new Map();
const execFileAsync = promisify(execFile);

const defaultDb = {
  users: {},
  tasks: {},
  notes: {},
  groups: {},
  userState: {},
};

async function loadDb() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    return { ...defaultDb, ...JSON.parse(raw) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      await saveDb(defaultDb);
      return { ...defaultDb };
    }
    throw error;
  }
}

async function saveDb(db) {
  await fs.writeFile(DATA_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function nowIso() {
  return new Date().toISOString();
}

function authMiddleware(req, res, next) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.user = {
    uid: session.uid,
    email: session.email,
    name: session.name,
    picture: session.picture,
  };
  next();
}

function requireString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
}

async function postJsonViaCurl(url, payload, options = {}) {
  const args = [
    '-sS',
    '-X',
    'POST',
    url,
    '-H',
    'Content-Type: application/json',
  ];
  if (options.apiKeyHeader) {
    args.push('-H', `X-goog-api-key: ${options.apiKeyHeader}`);
  }
  args.push('-d', JSON.stringify(payload));
  const { stdout } = await execFileAsync('curl', args);
  try {
    return JSON.parse(stdout);
  } catch {
    return { raw: stdout };
  }
}

async function verifyGoogleIdToken(idToken) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw new Error('Invalid Google token');
  }

  const payload = await response.json();
  if (!payload.sub || !payload.email) {
    throw new Error('Google token missing required claims');
  }

  if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('Token audience does not match GOOGLE_CLIENT_ID');
  }

  return {
    uid: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture || '',
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'synapse-backend',
    time: nowIso(),
    features: ['tasks', 'notes', 'groups', 'google-login', 'ai-ask'],
  });
});

app.post('/api/ai/ask', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Server Gemini key is not configured. Set GEMINI_API_KEY in .env',
      });
    }

    const question = requireString(req.body?.question, 'question');
    const modelName = typeof req.body?.model === 'string' && req.body.model.trim()
      ? req.body.model.trim()
      : GEMINI_DEFAULT_MODEL;

    const prompt = `You are SYNAPSE Study Vault assistant. Student question: ${question}`;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;
    const body = await postJsonViaCurl(endpoint, {
      contents: [{ parts: [{ text: prompt }] }],
    }, { apiKeyHeader: GEMINI_API_KEY });

    if (body?.error) {
      const apiError = body?.error?.message || 'Gemini API returned error';
      throw new Error(apiError);
    }

    const answer =
      body?.candidates?.[0]?.content?.parts?.[0]?.text ||
      body?.candidates?.[0]?.output ||
      '';
    if (!answer) throw new Error('Gemini returned no text content');

    res.json({ answer, model: modelName });
  } catch (error) {
    const message = error?.message || 'AI request failed';
    const status = typeof message === 'string' && message.includes('429') ? 429 : 500;
    res.status(status).json({ error: message });
  }
});

// Google sign-in endpoint: exchange Google id_token for app session token.
app.post('/api/auth/google', async (req, res) => {
  try {
    const idToken = requireString(req.body?.idToken, 'idToken');
    const googleUser = await verifyGoogleIdToken(idToken);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + SESSION_TTL_MS;

    sessions.set(token, { ...googleUser, expiresAt });

    const db = await loadDb();
    db.users[googleUser.uid] = {
      uid: googleUser.uid,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      lastLoginAt: nowIso(),
      createdAt: db.users[googleUser.uid]?.createdAt || nowIso(),
    };
    await saveDb(db);

    res.json({
      token,
      expiresAt,
      user: db.users[googleUser.uid],
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Google login failed' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const db = await loadDb();
  const user = db.users[req.user.uid] || req.user;
  res.json({ user });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/tasks', authMiddleware, async (req, res) => {
  const db = await loadDb();
  const tasks = Object.values(db.tasks)
    .filter((task) => task.ownerUid === req.user.uid)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  res.json({ tasks });
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const title = requireString(req.body?.title, 'title');
    const description = typeof req.body?.description === 'string' ? req.body.description : '';
    const status = ['todo', 'in-progress', 'done', 'backlog'].includes(req.body?.status) ? req.body.status : 'todo';
    const priority = ['low', 'medium', 'high'].includes(req.body?.priority) ? req.body.priority : 'medium';
    const type = ['Reading', 'Coding', 'Writing', 'Research'].includes(req.body?.type) ? req.body.type : 'Reading';
    const deadline = typeof req.body?.deadline === 'string' ? req.body.deadline : '';

    const db = await loadDb();
    const id = req.body?.id && typeof req.body.id === 'string' ? req.body.id : `task-${Date.now()}`;
    const timestamp = nowIso();
    db.tasks[id] = {
      id,
      title,
      description,
      status,
      priority,
      originalPriority: req.body?.originalPriority || priority,
      type,
      deadline,
      aiSuggested: Boolean(req.body?.aiSuggested),
      ownerUid: req.user.uid,
      createdAt: db.tasks[id]?.createdAt || timestamp,
      updatedAt: timestamp,
    };
    await saveDb(db);
    res.status(201).json({ task: db.tasks[id] });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid task payload' });
  }
});

app.patch('/api/tasks/:id', authMiddleware, async (req, res) => {
  const db = await loadDb();
  const task = db.tasks[req.params.id];
  if (!task || task.ownerUid !== req.user.uid) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const allowed = ['title', 'description', 'status', 'priority', 'originalPriority', 'type', 'deadline', 'aiSuggested'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) task[key] = req.body[key];
  }
  task.updatedAt = nowIso();
  await saveDb(db);
  res.json({ task });
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  const db = await loadDb();
  const task = db.tasks[req.params.id];
  if (!task || task.ownerUid !== req.user.uid) {
    return res.status(404).json({ error: 'Task not found' });
  }
  delete db.tasks[req.params.id];
  await saveDb(db);
  res.json({ ok: true });
});

app.get('/api/groups', authMiddleware, async (req, res) => {
  const db = await loadDb();
  const groups = Object.values(db.groups).filter(
    (group) => Array.isArray(group.members) && group.members.some((member) => member.uid === req.user.uid),
  );
  res.json({ groups });
});

app.post('/api/groups', authMiddleware, async (req, res) => {
  try {
    const name = requireString(req.body?.name, 'name');
    const id = `grp-${Date.now()}`;
    const code = (req.body?.code && String(req.body.code).trim()) || crypto.randomBytes(3).toString('hex').toUpperCase();
    const member = {
      uid: req.user.uid,
      name: req.user.name,
      joinedAt: nowIso(),
      isOwner: true,
    };

    const db = await loadDb();
    db.groups[id] = {
      id,
      name,
      code,
      ownerUid: req.user.uid,
      ownerName: req.user.name,
      createdAt: nowIso(),
      members: [member],
      messages: [{
        id: `msg-${Date.now()}`,
        senderUid: req.user.uid,
        senderName: 'System',
        text: `Group "${name}" created`,
        sentAt: nowIso(),
      }],
      notes: [],
    };
    await saveDb(db);
    res.status(201).json({ group: db.groups[id] });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid group payload' });
  }
});

app.post('/api/groups/join', authMiddleware, async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code is required' });

  const db = await loadDb();
  const group = Object.values(db.groups).find((g) => g.code === code);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  if (!group.members.some((member) => member.uid === req.user.uid)) {
    group.members.push({
      uid: req.user.uid,
      name: req.user.name,
      joinedAt: nowIso(),
      isOwner: false,
    });
    group.messages.push({
      id: `msg-${Date.now()}`,
      senderUid: req.user.uid,
      senderName: 'System',
      text: `${req.user.name} joined the group`,
      sentAt: nowIso(),
    });
    await saveDb(db);
  }

  res.json({ group });
});

app.post('/api/groups/:id/messages', authMiddleware, async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text is required' });

  const db = await loadDb();
  const group = db.groups[req.params.id];
  if (!group || !group.members.some((member) => member.uid === req.user.uid)) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const message = {
    id: `msg-${Date.now()}`,
    senderUid: req.user.uid,
    senderName: req.user.name,
    text,
    sentAt: nowIso(),
  };
  group.messages.push(message);
  await saveDb(db);
  res.status(201).json({ message });
});

app.get('/api/groups/:id/notes', authMiddleware, async (req, res) => {
  const db = await loadDb();
  const group = db.groups[req.params.id];
  if (!group || !group.members.some((member) => member.uid === req.user.uid)) {
    return res.status(404).json({ error: 'Group not found' });
  }
  res.json({ notes: group.notes });
});

// Raw local-state sync to keep frontend behavior unchanged while adding backend persistence.
app.get('/api/sync/local-state', authMiddleware, async (req, res) => {
  const db = await loadDb();
  const state = db.userState[req.user.uid] || {
    tasks: [],
    groups: {},
    updatedAt: null,
  };
  res.json({ state });
});

app.put('/api/sync/local-state', authMiddleware, async (req, res) => {
  const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
  const groups = req.body?.groups && typeof req.body.groups === 'object' ? req.body.groups : {};

  const db = await loadDb();
  db.userState[req.user.uid] = {
    tasks,
    groups,
    updatedAt: nowIso(),
  };
  await saveDb(db);
  res.json({ ok: true, state: db.userState[req.user.uid] });
});

app.post('/api/groups/:id/notes', authMiddleware, async (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });

  const db = await loadDb();
  const group = db.groups[req.params.id];
  if (!group || !group.members.some((member) => member.uid === req.user.uid)) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const note = {
    id: `note-${Date.now()}`,
    title,
    content: typeof req.body?.content === 'string' ? req.body.content : '',
    authorUid: req.user.uid,
    authorName: req.user.name,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  group.notes.unshift(note);
  db.notes[note.id] = { ...note, groupId: group.id };
  await saveDb(db);
  res.status(201).json({ note });
});

app.patch('/api/groups/:id/notes/:noteId', authMiddleware, async (req, res) => {
  const db = await loadDb();
  const group = db.groups[req.params.id];
  if (!group || !group.members.some((member) => member.uid === req.user.uid)) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const note = group.notes.find((item) => item.id === req.params.noteId);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  if (note.authorUid !== req.user.uid && group.ownerUid !== req.user.uid) {
    return res.status(403).json({ error: 'Not allowed to edit this note' });
  }

  if (typeof req.body?.title === 'string' && req.body.title.trim()) note.title = req.body.title.trim();
  if (typeof req.body?.content === 'string') note.content = req.body.content;
  note.updatedAt = nowIso();
  db.notes[note.id] = { ...note, groupId: group.id };
  await saveDb(db);
  res.json({ note });
});

app.delete('/api/groups/:id/notes/:noteId', authMiddleware, async (req, res) => {
  const db = await loadDb();
  const group = db.groups[req.params.id];
  if (!group || !group.members.some((member) => member.uid === req.user.uid)) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const note = group.notes.find((item) => item.id === req.params.noteId);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  if (note.authorUid !== req.user.uid && group.ownerUid !== req.user.uid) {
    return res.status(403).json({ error: 'Not allowed to delete this note' });
  }

  group.notes = group.notes.filter((item) => item.id !== req.params.noteId);
  delete db.notes[req.params.noteId];
  await saveDb(db);
  res.json({ ok: true });
});

app.get('/google-login', (_req, res) => {
  res
    .type('html')
    .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Google Login</title>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #0b1220; color: #fff; }
      main { min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 20px; }
      .card { background: #111a2d; border: 1px solid #25314f; border-radius: 12px; padding: 24px; width: min(420px, 90vw); }
      pre { overflow: auto; background: #0a1020; padding: 12px; border-radius: 8px; }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        <h2>Login with Google</h2>
        <p>After sign in, your Google ID token is exchanged with this backend.</p>
        <div id="g_id_onload"
          data-client_id="${GOOGLE_CLIENT_ID}"
          data-callback="handleCredentialResponse">
        </div>
        <div class="g_id_signin" data-type="standard"></div>
        <pre id="result">Waiting for sign in...</pre>
      </div>
    </main>
    <script>
      async function handleCredentialResponse(response) {
        const result = document.getElementById('result');
        try {
          const exchange = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: response.credential })
          });
          const body = await exchange.json();
          result.textContent = JSON.stringify(body, null, 2);
        } catch (e) {
          result.textContent = 'Login failed: ' + (e?.message || String(e));
        }
      }
      window.handleCredentialResponse = handleCredentialResponse;
    </script>
  </body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`SYNAPSE backend running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Google login page: http://localhost:${PORT}/google-login`);
});
