import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { resolveMx } from 'node:dns/promises';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildLocalCourseAdvisorResult,
  callDeepSeekCourseAdvisor,
  validateCourseAdvisorInput
} from './course-advisor.mjs';
import {
  RecommendationError,
  callDeepSeekRecommendation,
  findProgrammeCandidates,
  validateStudentProfile
} from './programme-recommender.mjs';
import { createStorage } from './storage.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const DB_FILE = process.env.APP_DB_FILE || join(__dirname, 'data', 'app-data.json');
const PROGRAMMES_JSON_FILE = process.env.PROGRAMMES_JSON_FILE || join(__dirname, '..', 'src', 'data', 'programmes.json');
const PLATFORM_DATA_JSON_FILE = process.env.PLATFORM_DATA_JSON_FILE || join(__dirname, '..', 'src', 'data', 'platformData.json');
const ADVISOR_KNOWLEDGE_JSON_FILE = process.env.ADVISOR_KNOWLEDGE_JSON_FILE || join(__dirname, '..', 'src', 'data', 'advisorKnowledge.json');
const DEEPSEEK_V4_FLASH_MODEL = 'deepseek-v4-flash';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map((item) => item.trim()).filter(Boolean);
const storage = createStorage({
  dbFile: DB_FILE,
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
});
const adminTokens = new Map();
const adminAccounts = process.env.ADMIN_ACCOUNTS_JSON ? JSON.parse(process.env.ADMIN_ACCOUNTS_JSON) : [];
const sessionSecret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEEPSEEK_API_KEY || 'otter-local-session-secret';

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

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || randomBytes(4).toString('hex');
}

function normalizePost(body, existing = null) {
  const now = nowIso();
  const sectionId = String(body.sectionId || existing?.sectionId || '').trim();
  const title = String(body.title || existing?.title || '').trim();
  const content = String(body.content || existing?.content || '').trim();
  if (!sectionId) throw new Error('缺少板块');
  if (title.length < 2) throw new Error('标题至少 2 个字符');
  if (content.length < 5) throw new Error('正文至少 5 个字符');
  const schoolId = String(body.schoolId || existing?.schoolId || 'shared').trim();
  if (!['eduhk', 'lingnan', 'shared'].includes(schoolId)) throw new Error('学校可见范围不正确');
  const status = String(body.status || existing?.status || 'published').trim();
  if (!['published', 'draft', 'deleted', 'archived'].includes(status)) throw new Error('状态不正确');
  const tags = Array.isArray(body.tags) ? body.tags : existing?.tags || [];
  const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls : existing?.imageUrls || [];
  return {
    id: String(body.id || existing?.id || `post_${sectionId}_${slugify(title)}_${Date.now()}`),
    sectionId,
    title,
    summary: String(body.summary ?? existing?.summary ?? '').trim(),
    content,
    tags: tags.map((item) => String(item).trim()).filter(Boolean).slice(0, 20),
    region: String(body.region ?? existing?.region ?? '').trim(),
    source: String(body.source ?? existing?.source ?? '').trim(),
    authorRole: String(body.authorRole ?? existing?.authorRole ?? '管理员').trim() || '管理员',
    status,
    shared: Boolean(body.shared ?? existing?.shared ?? schoolId === 'shared'),
    recommended: Boolean(body.recommended ?? existing?.recommended ?? false),
    pinned: Boolean(body.pinned ?? existing?.pinned ?? false),
    ownerId: String(body.ownerId ?? existing?.ownerId ?? '').trim(),
    schoolId,
    imageUrls: imageUrls.map((item) => String(item).trim()).filter(Boolean).slice(0, 12),
    metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : existing?.metadata || {},
    createdAt: existing?.createdAt || body.createdAt || now,
    updatedAt: now
  };
}

function parsePositiveInteger(value, fallback, max = 500) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(Math.floor(number), max);
}

function postSearchText(post) {
  return [
    post.id,
    post.sectionId,
    post.title,
    post.summary,
    post.content,
    post.region,
    post.source,
    post.authorRole,
    post.schoolId,
    ...(post.tags || []),
    ...Object.values(post.metadata || {})
  ].join(' ').toLowerCase();
}

function matchesBooleanParam(value, actual) {
  if (!value) return true;
  if (['1', 'true', 'yes'].includes(value.toLowerCase())) return Boolean(actual);
  if (['0', 'false', 'no'].includes(value.toLowerCase())) return !actual;
  return true;
}

function buildPostListResponse(posts, searchParams) {
  const schoolId = String(searchParams.get('schoolId') || '').trim();
  const sectionId = String(searchParams.get('sectionId') || '').trim();
  const keyword = String(searchParams.get('keyword') || searchParams.get('q') || '').trim().toLowerCase();
  const recommended = String(searchParams.get('recommended') || '').trim();
  const pinned = String(searchParams.get('pinned') || '').trim();
  const page = parsePositiveInteger(searchParams.get('page'), 1, 100000);
  const pageSize = parsePositiveInteger(searchParams.get('pageSize') || searchParams.get('limit'), 500, 500);
  const filtered = posts
    .filter((post) => !sectionId || post.sectionId === sectionId)
    .filter((post) => !schoolId || post.schoolId === 'shared' || post.schoolId === schoolId)
    .filter((post) => matchesBooleanParam(recommended, post.recommended))
    .filter((post) => matchesBooleanParam(pinned, post.pinned))
    .filter((post) => !keyword || postSearchText(post).includes(keyword))
    .slice()
    .sort((a, b) => {
      const pinnedDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pinnedDiff) return pinnedDiff;
      const recommendedDiff = Number(Boolean(b.recommended)) - Number(Boolean(a.recommended));
      if (recommendedDiff) return recommendedDiff;
      return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
    });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return {
    posts: filtered.slice(start, start + pageSize),
    total,
    page,
    pageSize
  };
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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
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

function sendApiError(req, res, error) {
  if (error instanceof RecommendationError) {
    sendJson(req, res, error.status || 400, { ok: false, message: error.message, code: error.code });
    return;
  }
  sendJson(req, res, 500, { ok: false, message: error instanceof Error ? error.message : 'Internal error', code: 'INTERNAL_ERROR' });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function requireAdmin(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return token && (adminTokens.has(token) || isValidAdminToken(token));
}

function createSignedToken(kind, claims) {
  const payload = Buffer.from(JSON.stringify({
    ...claims,
    issuedAt: Date.now()
  })).toString('base64url');
  const signature = createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  return `${kind}.${payload}.${signature}`;
}

function isValidSignedToken(token, kind) {
  if (!token.startsWith(`${kind}.`)) return false;
  const [, payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  return safeCompare(signature, expected);
}

function createUserToken(user) {
  return createSignedToken('user', { userId: user.id, username: user.username });
}

function isValidUserToken(token) {
  return isValidSignedToken(token, 'user');
}

function createAdminToken(account) {
  return createSignedToken('admin', { username: account.username, role: account.role || 'admin' });
}

function isValidAdminToken(token) {
  return isValidSignedToken(token, 'admin');
}

function requireRecommendationUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  return adminTokens.has(token) || isValidAdminToken(token) || isValidUserToken(token);
}

async function loadBundledProgrammes() {
  return JSON.parse(await readFile(PROGRAMMES_JSON_FILE, 'utf8'));
}

async function loadPlatformData() {
  return JSON.parse(await readFile(PLATFORM_DATA_JSON_FILE, 'utf8'));
}

async function loadAdvisorKnowledge() {
  try {
    return JSON.parse(await readFile(ADVISOR_KNOWLEDGE_JSON_FILE, 'utf8'));
  } catch {
    return null;
  }
}

async function listProgrammeKnowledgeBase() {
  const rows = await storage.listProgrammes();
  if (rows.length) return rows;
  return loadBundledProgrammes();
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
    roleCounts: {
      guest: pageViews.filter((event) => !event.userRole || event.userRole === 'guest').length,
      registered: pageViews.filter((event) => event.userRole === 'registered').length,
      admin: pageViews.filter((event) => event.userRole === 'admin').length
    },
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

  if (req.method === 'GET' && url.pathname === '/api/posts') {
    try {
      const includeDrafts = url.searchParams.get('includeDrafts') === '1' ? Boolean(requireAdmin(req)) : false;
      const posts = await storage.listPosts({ includeDrafts });
      sendJson(req, res, 200, buildPostListResponse(posts, url.searchParams));
    } catch {
      sendJson(req, res, 200, { posts: [], total: 0, page: 1, pageSize: 500 });
    }
    return;
  }

  const publicPostMatch = url.pathname.match(/^\/api\/posts\/([^/]+)$/);
  if (req.method === 'GET' && publicPostMatch) {
    const postId = decodeURIComponent(publicPostMatch[1]);
    const post = (await storage.listPosts({ includeDrafts: Boolean(requireAdmin(req)) })).find((item) => item.id === postId);
    if (!post || ['deleted', 'archived'].includes(post.status)) {
      sendJson(req, res, 404, { error: 'Post not found' });
      return;
    }
    if (post.status !== 'published' && !requireAdmin(req)) {
      sendJson(req, res, 404, { error: 'Post not found' });
      return;
    }
    sendJson(req, res, 200, { post });
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
    const userWithSameName = await storage.findUserByUsername(username);
    if (userWithSameName && String(userWithSameName.email || '').toLowerCase() !== email) throw new Error('用户名已被使用，请换一个');
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
    sendJson(req, res, 200, { user: publicUser, token: createUserToken(publicUser) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/login') {
    const body = await readJson(req);
    const account = String(body.account || body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!account) throw new Error('请填写邮箱或用户名');
    if (!password) throw new Error('请填写密码');
    let user = account.includes('@') ? await storage.findUserByEmail(account) : await storage.findUserByUsername(account);
    if (!user || !safeCompare(user.passwordHash || '', hashText(password))) throw new Error('账号或密码不正确');
    const { passwordHash: _, ...publicUser } = user;
    sendJson(req, res, 200, { user: publicUser, token: createUserToken(publicUser) });
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
    const rawContact = String(body.contact || '').trim();
    const contact = isValidEmailShape(rawContact) ? rawContact.toLowerCase() : rawContact;
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

  if (req.method === 'POST' && url.pathname === '/api/recommend-programmes') {
    try {
      if (!requireRecommendationUser(req)) {
        sendJson(req, res, 401, { ok: false, message: '请先登录或使用管理员身份进入后再使用 AI 专业推荐。', code: 'AUTH_REQUIRED' });
        return;
      }
      const profile = validateStudentProfile(await readJson(req));
      const programmes = await listProgrammeKnowledgeBase();
      const candidates = findProgrammeCandidates(programmes, profile, 5).map((candidate) => candidate.programme);
      if (!candidates.length) throw new RecommendationError('NO_CANDIDATE_PROGRAMMES', 'No candidate programmes were found.', 404);
      const data = await callDeepSeekRecommendation({
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        model: DEEPSEEK_V4_FLASH_MODEL,
        profile,
        candidates
      });
      await storage.insertRecommendationLog({
        hasChosenProgramme: profile.hasChosenProgramme,
        selectedProgrammeId: profile.selectedProgrammeId,
        selectedProgrammeName: profile.selectedProgrammeName,
        undergraduateMajor: profile.undergraduateMajor,
        masterMajor: profile.masterMajor,
        mainCourses: profile.mainCourses,
        skills: profile.skills,
        interests: profile.interests,
        careerGoals: profile.careerGoals,
        preferredDirections: profile.preferredDirections,
        targetDegreeLevels: profile.targetDegreeLevels,
        studyPreferences: profile.studyPreferences,
        concerns: profile.concerns,
        workExperience: profile.workExperience,
        otherContext: profile.otherContext,
        retrievedProgrammeIds: candidates.map((programme) => programme.id),
        modelOutput: data
      });
      sendJson(req, res, 200, { ok: true, data });
    } catch (error) {
      sendApiError(req, res, error);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/course-advisor') {
    try {
      if (!requireRecommendationUser(req)) {
        sendJson(req, res, 401, { ok: false, message: '请先登录或使用管理员身份进入后再使用 AI 课程顾问。', code: 'AUTH_REQUIRED' });
        return;
      }
      const profile = validateCourseAdvisorInput(await readJson(req));
      const platformData = await loadPlatformData();
      const course = (platformData.courses || []).find((item) => item.id === profile.courseId);
      if (!course) {
        sendJson(req, res, 404, { ok: false, message: '没有找到这门课程', code: 'COURSE_NOT_FOUND' });
        return;
      }
      const programmeCourses = (platformData.courses || []).filter((item) => item.programmeId === course.programmeId);
      const advisorKnowledge = await loadAdvisorKnowledge();
      const courseKnowledge = (advisorKnowledge?.courseKnowledge || []).find((item) => item.id === course.id);
      const programmeCourseKnowledge = (advisorKnowledge?.courseKnowledge || []).filter((item) => item.programmeId === course.programmeId);
      const localResult = buildLocalCourseAdvisorResult({
        course,
        programmeCourses,
        profile,
        courseKnowledge,
        programmeCourseKnowledge,
        retrievalRules: advisorKnowledge?.retrievalRules || []
      });
      const data = await callDeepSeekCourseAdvisor({
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        model: DEEPSEEK_V4_FLASH_MODEL,
        profile,
        course,
        programmeCourses,
        courseKnowledge,
        programmeCourseKnowledge,
        retrievalRules: advisorKnowledge?.retrievalRules || [],
        localResult
      });
      sendJson(req, res, 200, { ok: true, data });
    } catch (error) {
      sendApiError(req, res, error);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/login') {
    const body = await readJson(req);
    const inputUsername = String(body.username || '').trim();
    const inputHash = hashText(String(body.password || ''));
    const account = adminAccounts.find((item) => item.username === inputUsername && safeCompare(item.passwordHash, inputHash));
    if (account) {
      const token = createAdminToken(account);
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
      analyticsEventTotal: db.analyticsEventTotal ?? db.analyticsEvents.length,
      analyticsEventsLoaded: db.analyticsEvents.length,
      analyticsEventsTruncated: Boolean(db.analyticsEventsTruncated),
      analytics: buildAnalyticsSummary(db.analyticsEvents),
      supportTickets: db.supportTickets.slice().reverse(),
      posts: (db.posts || []).slice().sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/programmes/import-bundled') {
    if (!requireAdmin(req)) {
      sendJson(req, res, 401, { error: '需要管理员登录' });
      return;
    }
    const programmes = await loadBundledProgrammes();
    const saved = await storage.upsertProgrammes(programmes);
    sendJson(req, res, 200, {
      ok: true,
      count: saved.length,
      withCourseInformation: saved.filter((programme) => (programme.courseDescriptions || []).length > 0).length,
      withoutCourseInformation: saved.filter((programme) => !(programme.courseDescriptions || []).length).length
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/posts') {
    if (!requireAdmin(req)) {
      sendJson(req, res, 401, { error: '需要管理员登录' });
      return;
    }
    const body = await readJson(req);
    const post = await storage.upsertPost(normalizePost(body));
    sendJson(req, res, 200, { post });
    return;
  }

  const postMatch = url.pathname.match(/^\/api\/admin\/posts\/([^/]+)$/);
  if (req.method === 'PUT' && postMatch) {
    if (!requireAdmin(req)) {
      sendJson(req, res, 401, { error: '需要管理员登录' });
      return;
    }
    const body = await readJson(req);
    const existing = (await storage.listPosts({ includeDrafts: true })).find((post) => post.id === decodeURIComponent(postMatch[1]));
    const post = await storage.upsertPost(normalizePost({ ...body, id: decodeURIComponent(postMatch[1]) }, existing));
    sendJson(req, res, 200, { post });
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
