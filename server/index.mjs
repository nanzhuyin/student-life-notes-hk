import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'nanzhuyin-admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || 'b9b766c518d863ccc5d940e87b0845eeddb95eb67cd96b6a4a3ff1d7092e5b5b';
const DB_FILE = process.env.APP_DB_FILE || join(__dirname, 'data', 'app-data.json');
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map((item) => item.trim()).filter(Boolean);
const adminTokens = new Map();

const defaultDb = {
  users: [],
  analyticsEvents: [],
  supportTickets: []
};

function hashText(value) {
  return createHash('sha256').update(value).digest('hex');
}

function safeCompare(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${randomBytes(6).toString('hex')}`;
}

async function readDb() {
  try {
    return { ...defaultDb, ...JSON.parse(await readFile(DB_FILE, 'utf8')) };
  } catch {
    return structuredClone(defaultDb);
  }
}

async function writeDb(db) {
  await mkdir(dirname(DB_FILE), { recursive: true });
  await writeFile(DB_FILE, JSON.stringify(db, null, 2) + '\n');
}

function corsHeaders(req) {
  const origin = req.headers.origin || '*';
  const allowOrigin = allowedOrigins.includes('*') || allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Vary': 'Origin'
  };
}

function sendJson(req, res, status, body) {
  res.writeHead(status, {
    ...corsHeaders(req),
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function requireAdmin(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return token && adminTokens.has(token);
}

function buildAnalyticsSummary(events) {
  const pageViews = events.filter((event) => event.type === 'page_view');
  const leaves = events.filter((event) => event.type === 'page_leave');
  const totalDuration = leaves.reduce((sum, event) => sum + Number(event.durationSeconds || 0), 0);
  const bySchool = ['eduhk', 'lingnan'].map((schoolId) => {
    const schoolViews = pageViews.filter((event) => event.schoolId === schoolId);
    const schoolDuration = leaves
      .filter((event) => event.schoolId === schoolId)
      .reduce((sum, event) => sum + Number(event.durationSeconds || 0), 0);
    return {
      schoolId,
      views: schoolViews.length,
      duration: schoolDuration,
      average: schoolViews.length ? schoolDuration / schoolViews.length : 0
    };
  });
  const featureMap = new Map();
  for (const view of pageViews) {
    const item = featureMap.get(view.feature) || { feature: view.feature, views: 0, duration: 0 };
    item.views += 1;
    featureMap.set(view.feature, item);
  }
  for (const leave of leaves) {
    const item = featureMap.get(leave.feature) || { feature: leave.feature, views: 0, duration: 0 };
    item.duration += Number(leave.durationSeconds || 0);
    featureMap.set(leave.feature, item);
  }
  return {
    totalViews: pageViews.length,
    totalDuration,
    averageDuration: pageViews.length ? totalDuration / pageViews.length : 0,
    bySchool,
    features: Array.from(featureMap.values()).sort((a, b) => b.views - a.views || b.duration - a.duration),
    recent: events.slice(-20).reverse()
  };
}

async function route(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(req, res, 200, { ok: true, name: '港伴记 API', time: nowIso() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/register') {
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    const username = String(body.username || '').trim();
    const schoolId = String(body.schoolId || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('请填写有效邮箱');
    if (username.length < 2) throw new Error('用户名至少 2 个字符');
    if (!['eduhk', 'lingnan'].includes(schoolId)) throw new Error('请选择学校');
    const db = await readDb();
    let user = db.users.find((item) => item.email === email);
    if (user) {
      user.username = username;
      user.schoolId = schoolId;
      user.updatedAt = nowIso();
    } else {
      user = { id: createId('user'), email, username, schoolId, createdAt: nowIso(), updatedAt: nowIso() };
      db.users.push(user);
    }
    await writeDb(db);
    sendJson(req, res, 200, { user });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/analytics') {
    const body = await readJson(req);
    const db = await readDb();
    db.analyticsEvents.push({
      ...body,
      id: body.id || createId('event'),
      timestamp: body.timestamp || nowIso(),
      userAgent: req.headers['user-agent'] || '',
      ipHint: req.socket.remoteAddress || ''
    });
    db.analyticsEvents = db.analyticsEvents.slice(-20000);
    await writeDb(db);
    sendJson(req, res, 200, { ok: true });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/support') {
    const body = await readJson(req);
    const message = String(body.message || '').trim();
    const contact = String(body.contact || '').trim();
    if (message.length < 5) throw new Error('请填写建议或投稿内容');
    if (contact.length < 2) throw new Error('请填写联系方式');
    const db = await readDb();
    const ticket = {
      id: createId('ticket'),
      userId: body.userId || '',
      username: body.username || '',
      schoolId: body.schoolId || '',
      type: body.type || '建议',
      contact,
      message,
      status: 'new',
      adminNote: '',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    db.supportTickets.push(ticket);
    await writeDb(db);
    sendJson(req, res, 200, { ticket });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/login') {
    const body = await readJson(req);
    if (String(body.username || '').trim() === ADMIN_USERNAME && safeCompare(hashText(String(body.password || '')), ADMIN_PASSWORD_HASH)) {
      const token = randomBytes(24).toString('hex');
      adminTokens.set(token, { createdAt: Date.now() });
      sendJson(req, res, 200, { token });
      return;
    }
    sendJson(req, res, 401, { error: '账号或密码不正确' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/dashboard') {
    if (!requireAdmin(req)) {
      sendJson(req, res, 401, { error: '需要管理员登录' });
      return;
    }
    const db = await readDb();
    sendJson(req, res, 200, {
      users: db.users.slice(-100).reverse(),
      analyticsEvents: db.analyticsEvents,
      analytics: buildAnalyticsSummary(db.analyticsEvents),
      supportTickets: db.supportTickets.slice().reverse()
    });
    return;
  }

  const ticketMatch = url.pathname.match(/^\/api\/admin\/tickets\/([^/]+)$/);
  if (req.method === 'PATCH' && ticketMatch) {
    if (!requireAdmin(req)) {
      sendJson(req, res, 401, { error: '需要管理员登录' });
      return;
    }
    const body = await readJson(req);
    const db = await readDb();
    const ticket = db.supportTickets.find((item) => item.id === ticketMatch[1]);
    if (!ticket) {
      sendJson(req, res, 404, { error: '没有找到这条记录' });
      return;
    }
    ticket.status = body.status || ticket.status;
    ticket.adminNote = typeof body.adminNote === 'string' ? body.adminNote : ticket.adminNote;
    ticket.updatedAt = nowIso();
    await writeDb(db);
    sendJson(req, res, 200, { ticket });
    return;
  }

  sendJson(req, res, 404, { error: 'Not found' });
}

createServer(async (req, res) => {
  try {
    await route(req, res);
  } catch (error) {
    sendJson(req, res, 400, { error: error instanceof Error ? error.message : 'Bad request' });
  }
}).listen(PORT, () => {
  console.log(`港伴记 API listening on http://127.0.0.1:${PORT}`);
});
