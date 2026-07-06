import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { resolveMx } from 'node:dns/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStorage } from './storage.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const DB_FILE = process.env.APP_DB_FILE || join(__dirname, 'data', 'app-data.json');
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map((item) => item.trim()).filter(Boolean);
const storage = createStorage({
  dbFile: DB_FILE,
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
});
const adminTokens = new Map();
const defaultAdminAccounts = [
  { username: 'otter-admin', passwordHash: 'aee6f0ecf531724f671db225e30f91d3cf21e89bb0ab639431ad237e9174caa3', role: 'owner' },
  { username: 'content-reviewer', passwordHash: '389ebe877a1ed402f4cf8e6efd08d8f0dae2a3153ef2e57136f5ac1a591dcf42', role: 'editor' },
  { username: 'support-desk', passwordHash: '2639c55742f526036b0ecc605e00b6fad2df03b81cdfbd72cdf3ec3f0c6aaba8', role: 'support' }
];
const adminAccounts = process.env.ADMIN_ACCOUNTS_JSON ? JSON.parse(process.env.ADMIN_ACCOUNTS_JSON) : defaultAdminAccounts;

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

function isValidEmailShape(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && !email.includes('..');
}

async function assertReachableEmailDomain(email) {
  const domain = email.split('@')[1];
  try {
    const records = await resolveMx(domain);
    if (!records.length) throw new Error('missing mx');
  } catch {
    throw new Error('邮箱域名不可用，请填写真实可用邮箱');
  }
}

function isStrongEnoughPassword(password) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
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
    sendJson(req, res, 200, { ok: true, name: 'Otter API', storage: storage.type, time: nowIso() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/register') {
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const schoolId = String(body.schoolId || '').trim();
    if (!isValidEmailShape(email)) throw new Error('请填写有效邮箱');
    await assertReachableEmailDomain(email);
    if (username.length < 2) throw new Error('用户名至少 2 个字符');
    if (!isStrongEnoughPassword(password)) throw new Error('密码至少 8 位，并包含字母和数字');
    if (!['eduhk', 'lingnan'].includes(schoolId)) throw new Error('请选择学校');
    const passwordHash = hashText(password);
    let user = await storage.findUserByEmail(email);
    if (user) {
      if (!safeCompare(user.passwordHash || '', passwordHash)) throw new Error('邮箱或密码不正确');
      user.username = username;
      user.schoolId = schoolId;
      user.updatedAt = nowIso();
    } else {
      user = { id: createId('user'), email, username, schoolId, passwordHash, createdAt: nowIso(), updatedAt: nowIso() };
    }
    user = await storage.upsertUser(user);
    const { passwordHash: _, ...publicUser } = user;
    sendJson(req, res, 200, { user: publicUser });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/analytics') {
    const body = await readJson(req);
    await storage.insertAnalyticsEvent({
      ...body,
      id: body.id || createId('event'),
      timestamp: body.timestamp || nowIso(),
      userAgent: req.headers['user-agent'] || '',
      ipHint: req.socket.remoteAddress || ''
    });
    sendJson(req, res, 200, { ok: true });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/support') {
    const body = await readJson(req);
    const message = String(body.message || '').trim();
    const contact = String(body.contact || '').trim();
    if (message.length < 5) throw new Error('请填写建议或投稿内容');
    if (contact.length < 2) throw new Error('请填写联系方式');
    const ticket = {
      id: createId('ticket'),
      userId: body.userId || '',
      username: body.username || '',
      schoolId: body.schoolId || '',
      type: body.type || '建议',
      contact,
      message,
      status: 'pending',
      adminNote: '',
      adminReply: '',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    sendJson(req, res, 200, { ticket: await storage.insertSupportTicket(ticket) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/mailbox') {
    const userId = String(url.searchParams.get('userId') || '');
    const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
    if (!userId && !email) throw new Error('缺少用户信息');
    sendJson(req, res, 200, { tickets: await storage.getMailboxTickets({ userId, email }) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/login') {
    const body = await readJson(req);
    const inputUsername = String(body.username || '').trim();
    const inputHash = hashText(String(body.password || ''));
    const account = adminAccounts.find((item) => item.username === inputUsername && safeCompare(item.passwordHash, inputHash));
    if (account) {
      const token = randomBytes(24).toString('hex');
      adminTokens.set(token, { createdAt: Date.now(), username: account.username, role: account.role || 'admin' });
      sendJson(req, res, 200, { token, admin: { username: account.username, role: account.role || 'admin' } });
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
    const db = await storage.readAll();
    sendJson(req, res, 200, {
      users: db.users.slice(-100).reverse().map(({ passwordHash, ...user }) => user),
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
    const ticket = await storage.updateSupportTicket(ticketMatch[1], {
      status: body.status,
      adminNote: typeof body.adminNote === 'string' ? body.adminNote : undefined,
      adminReply: typeof body.adminReply === 'string' ? body.adminReply : undefined,
      updatedAt: nowIso()
    });
    if (!ticket) {
      sendJson(req, res, 404, { error: '没有找到这条记录' });
      return;
    }
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
  console.log(`Otter API listening on http://127.0.0.1:${PORT}`);
});
