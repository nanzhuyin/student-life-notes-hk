import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import postsData from './data/posts.json';
import platformDataJson from './data/platformData.json';
import type {
  CategoryKey,
  CategoryMeta,
  Course,
  CourseTypeKey,
  NotePost,
  PlatformData,
  Programme,
  School,
  SchoolId,
  SharedPost
} from './types';

const DISCLAIMER = '本网站为个人/学生自发整理的信息工具，内容仅供参考，不代表任何学校或机构官方立场。';
const APP_NAME = 'Otter';
const APP_VERSION = 'v1.29';
const BETA_NOTICE = '内测版本：邮箱注册、登录和联系作者信箱已开放；内容仍由管理员整理后发布。';
const APP_BASE_URL = (import.meta as unknown as { env?: Record<string, string> }).env?.BASE_URL || '/';
const APP_LOGO_SRC = `${APP_BASE_URL}images/otter-avatar.png`;
const FILTER_STORAGE_PREFIX = 'student-life-notes:filters:';
const SCROLL_STORAGE_PREFIX = 'student-life-notes:scroll:';
const ANALYTICS_STORAGE_KEY = 'student-life-notes:analytics-events';
const ANALYTICS_SESSION_KEY = 'student-life-notes:analytics-session';
const USER_STORAGE_KEY = 'student-life-notes:user';
const LOCAL_USERS_STORAGE_KEY = 'student-life-notes:local-users';
const SUPPORT_STORAGE_KEY = 'student-life-notes:support-tickets';
const LIVE_VISIT_STORAGE_KEY = 'student-life-notes:live-visits';
const ADMIN_TOKEN_STORAGE_KEY = 'student-life-notes:admin-token';
const DYNAMIC_POSTS_STORAGE_KEY = 'student-life-notes:dynamic-posts';
const API_BASE_URL = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
const platformData = platformDataJson as PlatformData;
const legacyPosts = postsData as NotePost[];

if (typeof document !== 'undefined') {
  document.title = `${APP_NAME} ${APP_VERSION} 内测版`;
}

const sectionCategories: CategoryMeta[] = [
  { key: 'course_catalog', name: '专业课程知识库', description: '按学校、项目和课程查看独立课程资料', accent: 'red' },
  { key: 'hk_rent', name: '香港租房', description: '租房区域、预算、合同和看房经验', accent: 'warm' },
  { key: 'sz_commute', name: '港深通勤', description: '深圳居住、口岸和跨境路线', accent: 'green' },
  { key: 'hk_life', name: '新生入学指导', description: '到港路线、生活办理和开学提醒', accent: 'orange' },
  { key: 'nearby_food', name: '附近美食', description: '校园周边餐饮、价格和位置参考', accent: 'blue' },
  { key: 'transport_spots', name: '出行与景点', description: '日常目的地路线和周末探索', accent: 'mint' }
];

const sectionIdByCategory: Record<CategoryKey, string> = {
  course_catalog: 'courses',
  hk_rent: 'housing',
  sz_commute: 'commute',
  hk_life: 'new-student',
  nearby_food: 'food',
  transport_spots: 'travel'
};

const categoryBySectionId: Record<string, CategoryKey> = {
  housing: 'hk_rent',
  commute: 'sz_commute',
  'new-student': 'hk_life',
  food: 'nearby_food',
  travel: 'transport_spots'
};

const postEditorConfig: Record<string, { tags: string[]; metadata: string[]; regionLabel: string }> = {
  housing: {
    regionLabel: '地区 / 小区',
    tags: ['租房', '新界', '九龙', '港岛', '深圳', '单人', '合租', '整租', '预算', '近交通', '有定位'],
    metadata: ['预算', '房型', '居住人数', '地图地址']
  },
  commute: {
    regionLabel: '路线 / 口岸',
    tags: ['港深通勤', '深圳湾口岸', '福田口岸', '落马洲', '巴士', '地铁', '打车', '预算', '适合新生'],
    metadata: ['出发地', '目的地', '口岸', '预计时间', '预计费用']
  },
  'new-student': {
    regionLabel: '主题 / 适用范围',
    tags: ['新生入学指导', '到达路线', '电话卡', '银行卡', '八达通', '签证', '缴费', '生活办理'],
    metadata: ['主题类型', '适用阶段', '办理渠道']
  },
  food: {
    regionLabel: '校内外 / 地区',
    tags: ['附近美食', '校内', '校外', '日常吃饭', '价格友好', '聚餐', '茶餐厅', '有定位'],
    metadata: ['范围', '价格范围', '菜系', '地图地址']
  },
  travel: {
    regionLabel: '地区 / 景点',
    tags: ['出行与景点', '香港', '深圳', '新界', '九龙', '港岛', '交通路线', '周末', '有定位'],
    metadata: ['地区', '交通方式', '预计时间', '预计费用', '地图地址']
  }
};

const courseTypeOptions: Array<{ key: CourseTypeKey | 'all'; label: string }> = [
  { key: 'all', label: '全部类型' },
  { key: 'core', label: '核心课' },
  { key: 'elective', label: '选修课' },
  { key: 'project', label: '项目 / 研究' },
  { key: 'general', label: '普通课程' }
];

type Route =
  | { name: 'home' }
  | { name: 'courses' }
  | { name: 'course'; id: string }
  | { name: 'section'; id: string }
  | { name: 'post'; id: string }
  | { name: 'search'; keyword: string }
  | { name: 'register' }
  | { name: 'login' }
  | { name: 'favorites' }
  | { name: 'admin' }
  | { name: 'about' }
  | { name: 'policy' };

type CourseFilterState = {
  programmeId: string;
  levelFilter: string;
  facultyFilter: string;
  typeKey: CourseTypeKey | 'all';
  keyword: string;
};

type SectionFilterState = {
  regionFilter: string;
  tagFilter: string;
  sortKey: 'latest' | 'recommended';
  keyword: string;
};

type ScrollMode = 'top' | 'restore';

type RouteState = {
  route: Route;
  key: string;
  scrollMode: ScrollMode;
};

type AnalyticsEvent = {
  id: string;
  timestamp: string;
  type: 'page_view' | 'page_leave' | 'school_switch' | 'favorite_toggle' | 'export';
  schoolId: SchoolId;
  routeName: string;
  feature: string;
  path: string;
  userId?: string;
  username?: string;
  userRole?: 'guest' | 'registered' | 'admin';
  targetId?: string;
  durationSeconds?: number;
};

type RegisteredUser = {
  id: string;
  email: string;
  username: string;
  schoolId: SchoolId;
  createdAt?: string;
  updatedAt?: string;
};

type SupportTicket = {
  id: string;
  userId?: string;
  username?: string;
  schoolId?: SchoolId | '';
  type: string;
  contact: string;
  message: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'closed' | string;
  adminNote?: string;
  adminReply?: string;
  createdAt: string;
  updatedAt?: string;
};

let pendingScrollMode: ScrollMode | null = null;
let appNavigationDepth = 0;

function getRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [routePart = '', queryPart = ''] = hash.split('?');
  const [path = '', ...rest] = routePart.split('/');

  if (!path) return { name: 'home' };
  if (path === 'courses') return { name: 'courses' };
  if (path === 'course' && rest[0]) return { name: 'course', id: decodeURIComponent(rest[0]) };
  if (path === 'section' && rest[0]) return { name: 'section', id: rest[0] };
  if (path === 'category' && rest[0]) return { name: 'section', id: sectionIdByCategory[rest[0] as CategoryKey] || rest[0] };
  if (path === 'post' && rest[0]) return { name: 'post', id: decodeURIComponent(rest[0]) };
  if (path === 'search') return { name: 'search', keyword: new URLSearchParams(queryPart).get('q') || '' };
  if (path === 'register') return { name: 'register' };
  if (path === 'login') return { name: 'login' };
  if (path === 'plan' || path === 'favorites') return { name: 'favorites' };
  if (path === 'admin') return { name: 'admin' };
  if (path === 'about') return { name: 'about' };
  if (path === 'policy') return { name: 'policy' };
  return { name: 'home' };
}

function normalizeRouteKey(hash = window.location.hash) {
  let value = hash || '#/';
  if (!value.startsWith('#')) value = `#${value}`;
  return value === '#' ? '#/' : value;
}

function routeKeyForPath(path: string) {
  if (path.startsWith('#')) return normalizeRouteKey(path);
  return normalizeRouteKey(`#${path.startsWith('/') ? path : `/${path}`}`);
}

function routeKeyFromUrl(url?: string) {
  if (!url) return normalizeRouteKey();
  try {
    return normalizeRouteKey(new URL(url).hash);
  } catch {
    return normalizeRouteKey();
  }
}

function isLocalPreviewHost() {
  return typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

function getSessionId() {
  try {
    const existing = sessionStorage.getItem(ANALYTICS_SESSION_KEY);
    if (existing) return existing;
    const next = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(ANALYTICS_SESSION_KEY, next);
    return next;
  } catch {
    return 'session-unavailable';
  }
}

function readAnalyticsEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    return raw ? JSON.parse(raw) as AnalyticsEvent[] : [];
  } catch {
    return [];
  }
}

function writeAnalyticsEvents(events: AnalyticsEvent[]) {
  try {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(events.slice(-3000)));
  } catch {
    // Ignore storage quota and private-mode failures.
  }
}

function readSupportTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(SUPPORT_STORAGE_KEY);
    return raw ? JSON.parse(raw) as SupportTicket[] : [];
  } catch {
    return [];
  }
}

function readLiveVisits() {
  try {
    const saved = Number(localStorage.getItem(LIVE_VISIT_STORAGE_KEY) || '');
    if (Number.isFinite(saved) && saved > 0) return saved;
  } catch {
    // Ignore storage failures.
  }
  const pageViews = readAnalyticsEvents().filter((event) => event.type === 'page_view').length;
  return Math.max(96, pageViews + 96);
}

function writeLiveVisits(value: number) {
  try {
    localStorage.setItem(LIVE_VISIT_STORAGE_KEY, String(value));
  } catch {
    // Ignore storage failures.
  }
}

function writeSupportTickets(tickets: SupportTicket[]) {
  try {
    localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify(tickets.slice(-500)));
  } catch {
    // Local fallback only; ignore storage failures.
  }
}

function readLocalDynamicPosts(): SharedPost[] {
  try {
    const raw = localStorage.getItem(DYNAMIC_POSTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) as SharedPost[] : [];
  } catch {
    return [];
  }
}

function writeLocalDynamicPosts(posts: SharedPost[]) {
  try {
    localStorage.setItem(DYNAMIC_POSTS_STORAGE_KEY, JSON.stringify(posts));
  } catch {
    // Local fallback only.
  }
}

type LocalRegisteredUser = RegisteredUser & { passwordHash?: string };

function readLocalRegisteredUsers(): LocalRegisteredUser[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) as LocalRegisteredUser[] : [];
  } catch {
    return [];
  }
}

function writeLocalRegisteredUsers(users: LocalRegisteredUser[]) {
  try {
    localStorage.setItem(LOCAL_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // Local fallback only.
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  if (!API_BASE_URL) throw new Error('未配置后端地址');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '请求失败');
  return data as T;
}

function isValidEmailShape(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && !email.includes('..');
}

function isStrongEnoughPassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function statusLabel(status: string) {
  return {
    pending: '待处理',
    reviewing: '处理中',
    resolved: '已处理',
    closed: '已关闭',
    new: '待处理'
  }[status] || status;
}

async function registerUser(input: { email: string; username: string; password: string; schoolId: SchoolId }) {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim();
  if (!API_BASE_URL) {
    const users = readLocalRegisteredUsers();
    const existingByEmail = users.find((item) => item.email.toLowerCase() === email);
    const existingByName = users.find((item) => item.username.toLowerCase() === username.toLowerCase());
    if (existingByName && existingByName.email.toLowerCase() !== email) throw new Error('用户名已被使用，请换一个');
    const passwordHash = await hashText(input.password);
    if (existingByEmail?.passwordHash && existingByEmail.passwordHash !== passwordHash) throw new Error('邮箱或密码不正确');
    const user = {
      ...(existingByEmail || {}),
      id: existingByEmail?.id || `local-user-${Date.now()}`,
      email,
      username,
      schoolId: input.schoolId,
      passwordHash,
      createdAt: existingByEmail?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    writeLocalRegisteredUsers(existingByEmail ? users.map((item) => item.email.toLowerCase() === email ? user : item) : users.concat(user));
    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  }
  const data = await apiRequest<{ user: RegisteredUser }>('/api/register', {
    method: 'POST',
    body: JSON.stringify({ ...input, email, username })
  });
  return data.user;
}

async function loginUser(input: { account: string; password: string }) {
  if (!API_BASE_URL) {
    const user = readLocalRegisteredUsers().find((item) => item.email.toLowerCase() === input.account.toLowerCase() || item.username.toLowerCase() === input.account.toLowerCase());
    if (!user) throw new Error('本机没有这个账号记录，请先注册');
    if (user.passwordHash && user.passwordHash !== await hashText(input.password)) throw new Error('账号或密码不正确');
    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  }
  const data = await apiRequest<{ user: RegisteredUser }>('/api/login', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  return data.user;
}

async function fetchMailbox(user: RegisteredUser) {
  const email = user.email.trim().toLowerCase();
  const userId = user.id && user.id !== 'guest-browser' ? user.id : '';
  if (!API_BASE_URL) {
    return readSupportTickets()
      .filter((ticket) => (userId && ticket.userId === userId) || (email && ticket.contact.toLowerCase() === email))
      .slice()
      .reverse();
  }
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (email) params.set('email', email);
  const data = await apiRequest<{ tickets: SupportTicket[] }>(`/api/mailbox?${params.toString()}`);
  return data.tickets || [];
}

function sendAnalyticsEvent(event: AnalyticsEvent) {
  if (!API_BASE_URL) return;
  void apiRequest('/api/analytics', {
    method: 'POST',
    body: JSON.stringify(event)
  }).catch(() => {
    // Keep the local copy when the network is unavailable.
  });
}

async function submitSupportTicket(input: Omit<SupportTicket, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
  if (!API_BASE_URL) {
    const ticket: SupportTicket = {
      ...input,
      id: `local-ticket-${Date.now()}`,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    writeSupportTickets(readSupportTickets().concat(ticket));
    return ticket;
  }
  const data = await apiRequest<{ ticket: SupportTicket }>('/api/support', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  return data.ticket;
}

async function fetchDynamicPosts(adminToken = '') {
  if (!API_BASE_URL) return readLocalDynamicPosts();
  const query = adminToken ? '?includeDrafts=1' : '';
  const data = await apiRequest<{ posts: SharedPost[] }>(`/api/posts${query}`, adminToken ? {
    headers: { Authorization: `Bearer ${adminToken}` }
  } : {});
  return data.posts || [];
}

async function saveAdminPost(post: SharedPost, adminToken: string) {
  const normalized: SharedPost = {
    ...post,
    id: post.id || `post_${post.sectionId}_${Date.now()}`,
    updatedAt: new Date().toISOString(),
    createdAt: post.createdAt || new Date().toISOString()
  };
  if (!API_BASE_URL) {
    const existing = readLocalDynamicPosts();
    const next = existing.some((item) => item.id === normalized.id)
      ? existing.map((item) => item.id === normalized.id ? normalized : item)
      : [normalized, ...existing];
    writeLocalDynamicPosts(next);
    return normalized;
  }
  if (!adminToken) throw new Error('需要管理员登录后才能保存内容');
  const isExisting = Boolean(post.id);
  const data = await apiRequest<{ post: SharedPost }>(isExisting ? `/api/admin/posts/${encodeURIComponent(post.id)}` : '/api/admin/posts', {
    method: isExisting ? 'PUT' : 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(normalized)
  });
  return data.post;
}

function routeFeature(route: Route) {
  if (route.name === 'home') return '首页';
  if (route.name === 'courses') return '课程库';
  if (route.name === 'course') return '课程详情';
  if (route.name === 'section') return '生活分区';
  if (route.name === 'post') return '生活内容详情';
  if (route.name === 'search') return '搜索';
  if (route.name === 'register') return '注册';
  if (route.name === 'login') return '登录';
  if (route.name === 'favorites') return '我的收藏';
  if (route.name === 'admin') return '管理端';
  if (route.name === 'policy') return '隐私与诚信';
  return '关于';
}

function routeTarget(route: Route) {
  if ('id' in route) return route.id;
  if (route.name === 'search') return route.keyword;
  return undefined;
}

function recordAnalyticsEvent(input: Omit<AnalyticsEvent, 'id' | 'timestamp' | 'path'> & { path?: string }) {
  const event: AnalyticsEvent = {
    ...input,
    id: `${getSessionId()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    path: input.path || normalizeRouteKey()
  };
  writeAnalyticsEvents(readAnalyticsEvents().concat(event));
  sendAnalyticsEvent(event);
  return event;
}

async function hashText(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function saveScrollPosition(key = routeKeyFromUrl()) {
  try {
    sessionStorage.setItem(`${SCROLL_STORAGE_PREFIX}${key}`, String(window.scrollY || 0));
  } catch {
    // Ignore private-mode storage failures; scrolling still works for forward navigation.
  }
}

function getSavedScrollPosition(key: string) {
  try {
    const value = Number(sessionStorage.getItem(`${SCROLL_STORAGE_PREFIX}${key}`) || '0');
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function go(path: string) {
  const nextKey = routeKeyForPath(path);
  if (nextKey === routeKeyFromUrl()) {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    return;
  }

  saveScrollPosition();
  pendingScrollMode = 'top';
  appNavigationDepth += 1;
  window.location.hash = path;
}

function goBack(fallbackPath = '/') {
  if (appNavigationDepth > 0) {
    saveScrollPosition();
    pendingScrollMode = 'restore';
    window.history.back();
    return;
  }

  go(fallbackPath);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function useRoute() {
  const [state, setState] = useState<RouteState>(() => ({
    route: getRoute(),
    key: routeKeyFromUrl(),
    scrollMode: 'top'
  }));

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

    const onHashChange = (event: HashChangeEvent) => {
      saveScrollPosition(routeKeyFromUrl(event.oldURL));
      const nextKey = routeKeyFromUrl(event.newURL);
      const scrollMode = pendingScrollMode || 'restore';
      pendingScrollMode = null;
      if (scrollMode === 'restore' && appNavigationDepth > 0) appNavigationDepth -= 1;
      setState({ route: getRoute(), key: nextKey, scrollMode });
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return state;
}

function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  });

  const save = (next: T) => {
    setValue(next);
    localStorage.setItem(key, JSON.stringify(next));
  };

  return [value, save] as const;
}

function getStoredObject<T>(key: string, fallback: T) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...(JSON.parse(raw) as Partial<T>) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredObject<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function clearTransientFilters() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(FILTER_STORAGE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
}

function getSchool(id: SchoolId) {
  return platformData.schools.find((school) => school.id === id) || platformData.schools[0];
}

function getProgrammes(schoolId: SchoolId) {
  return platformData.programmes.filter((programme) => programme.schoolId === schoolId);
}

function getCourses(schoolId: SchoolId) {
  return platformData.courses.filter((course) => course.schoolId === schoolId);
}

function getCourse(id: string) {
  return platformData.courses.find((course) => course.id === id);
}

function getProgramme(id: string) {
  return platformData.programmes.find((programme) => programme.id === id);
}

function getStorageKey(kind: string, schoolId: SchoolId) {
  return `student-life-notes:${kind}:${schoolId}`;
}

function courseMatches(course: Course, keyword: string) {
  const token = normalize(keyword);
  if (!token) return true;
  return [
    course.title,
    course.titleZh,
    course.courseCode,
    course.type,
    course.medium,
    course.programmeTitle,
    course.tags.join(' ')
  ]
    .join(' ')
    .toLowerCase()
    .includes(token);
}

function postMatches(post: SharedPost, keyword: string) {
  const token = normalize(keyword);
  if (!token) return true;
  return [post.title, post.summary || '', post.content, post.region || '', post.tags.join(' ')]
    .join(' ')
    .toLowerCase()
    .includes(token);
}

function propertyImage(fileName: string) {
  return `${APP_BASE_URL}images/properties/${fileName}`;
}

const housingImageRules: Array<{ keywords: string[]; url: string }> = [
  { keywords: ['港湾豪庭'], url: propertyImage('metro-harbour-view.jpg') },
  { keywords: ['叠茵庭一期C座', '叠茵庭'], url: propertyImage('parkland-villas.jpg') },
  { keywords: ['大兴花园一期', '大兴花园'], url: propertyImage('tai-hing-garden.jpg') },
  { keywords: ['聚康山庄'], url: propertyImage('beneville.jpg') },
  { keywords: ['傲云峰'], url: propertyImage('sky-tower.jpg') },
  { keywords: ['绿怡居'], url: propertyImage('botania-villa.jpg') },
  { keywords: ['豫丰花园'], url: propertyImage('the-sherwood.jpg') }
];

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getHousingName(post: SharedPost) {
  const regionParts = (post.region || '').split('/').map((item) => item.trim()).filter(Boolean);
  const regionName = regionParts.length ? regionParts[regionParts.length - 1] : '';
  if (regionName) return regionName;
  const community = post.content.match(/小区[：:]\s*([^\n，,。]+)/)?.[1]?.trim();
  if (community) return community;
  return post.title.replace(/\s*(HKD|RMB)\s*\d+.*$/i, '').replace(/租房经验$/, '').trim() || '租房信息';
}

function makeHousingPlaceholder(post: SharedPost) {
  const name = escapeSvgText(getHousingName(post));
  const district = escapeSvgText((post.region || '香港 / 租房参考').split('/').map((item) => item.trim()).filter(Boolean).slice(0, 2).join(' / ') || '租房参考');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fff5e8"/>
          <stop offset="55%" stop-color="#ffe4dc"/>
          <stop offset="100%" stop-color="#e9f3e2"/>
        </linearGradient>
        <linearGradient id="tower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f47b5f"/>
          <stop offset="100%" stop-color="#9c1f32"/>
        </linearGradient>
      </defs>
      <rect width="960" height="540" rx="42" fill="url(#bg)"/>
      <circle cx="780" cy="96" r="84" fill="#ffd9a8" opacity=".82"/>
      <path d="M0 382 C150 318 260 366 406 316 C542 270 681 292 960 226 L960 540 L0 540 Z" fill="#dcebd0"/>
      <g transform="translate(150 126)" opacity=".96">
        <rect x="0" y="86" width="132" height="276" rx="16" fill="url(#tower)"/>
        <rect x="158" y="38" width="152" height="324" rx="18" fill="#bb3348"/>
        <rect x="340" y="116" width="128" height="246" rx="16" fill="#f08b5b"/>
        ${Array.from({ length: 24 }).map((_, index) => {
          const x = [24, 72, 190, 246, 370, 418][index % 6];
          const y = 70 + Math.floor(index / 6) * 56;
          return `<rect x="${x}" y="${y}" width="24" height="20" rx="4" fill="#fff7ee" opacity=".72"/>`;
        }).join('')}
      </g>
      <rect x="78" y="64" width="356" height="58" rx="29" fill="#fff" opacity=".78"/>
      <text x="106" y="103" font-family="Arial, 'PingFang SC', sans-serif" font-size="28" font-weight="700" fill="#9c1f32">${district}</text>
      <text x="82" y="474" font-family="Arial, 'PingFang SC', sans-serif" font-size="54" font-weight="900" fill="#2b2024">${name}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getPostImage(post: SharedPost) {
  const isPropertySection = ['housing', 'commute'].includes(post.sectionId);
  const manual = post.imageUrls?.find((url) => url.trim());
  if (!isPropertySection && manual) return manual;
  if (!isPropertySection) return '';
  const text = [post.title, post.region || '', post.content].join(' ');
  const matched = housingImageRules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
  return matched?.url || makeHousingPlaceholder(post);
}

function getPostImages(post: SharedPost) {
  if (['housing', 'commute'].includes(post.sectionId)) {
    const generated = getPostImage(post);
    return generated ? [generated] : [];
  }
  const manual = post.imageUrls?.filter((url) => url.trim()) || [];
  if (manual.length) return manual;
  const generated = getPostImage(post);
  return generated ? [generated] : [];
}

function getSharedPostText(post: SharedPost) {
  return [post.id, post.title, post.summary || '', post.content, post.region || '', post.tags.join(' ')]
    .join(' ')
    .toLowerCase();
}

function isEduhkSharedPost(post: SharedPost) {
  const text = getSharedPostText(post);
  return text.includes('eduhk') || text.includes('aiep') || text.includes('教育大学') || text.includes('教大');
}

function mergeSharedPosts(dynamicPosts: SharedPost[]) {
  const byId = new Map<string, SharedPost>();
  for (const post of platformData.sharedPosts) byId.set(post.id, post);
  for (const post of dynamicPosts) byId.set(post.id, post);
  return Array.from(byId.values()).filter((post) => post.status !== 'deleted' && post.status !== 'archived');
}

function getVisibleSharedPosts(schoolId: SchoolId, dynamicPosts: SharedPost[] = []) {
  return mergeSharedPosts(dynamicPosts).filter((post) => {
    if (post.schoolId === 'shared') return true;
    if (post.schoolId) return post.schoolId === schoolId;
    return schoolId === 'eduhk' ? isEduhkSharedPost(post) : !isEduhkSharedPost(post);
  });
}

function uniqueCompact(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map((value) => (value || '').trim()).filter(Boolean)));
}

function formatCreditsText(course: Course) {
  if (typeof course.credits === 'number' && course.credits > 0) return `${course.credits} 学分`;
  const text = course.creditsText.trim();
  if (!text) return '以项目说明为准';
  return text
    .replace(/\bcps\b/gi, '学分')
    .replace(/\bcredits?\b/gi, '学分');
}

function formatFacultyName(value = '') {
  const facultyMap: Record<string, string> = {
    文科方向: '文学院',
    商科方向: '商学院',
    社科方向: '社会科学院',
    数据科学方向: '数据科学学院',
    跨学科方向: '跨学科研究学院',
    研究生项目方向: '研究生院',
    '校级中心': '校级中心',
    '跨院 / 独立项目': '其他',
    其他: '其他'
  };
  return facultyMap[value] || value || '其他';
}

function displayCourseInfo(value: string) {
  return value.trim() || '以项目说明为准';
}

function getUnitText(item: { faculty?: string; unitName?: string; unitLabel?: string; parentUnit?: string }) {
  const faculty = formatFacultyName(item.faculty || '');
  const unitName = item.unitName || item.faculty || '';
  const unitLabel = item.unitLabel || (faculty.includes('学院') ? '学院' : '单位');
  if (!unitName || unitName === item.faculty || unitName === faculty) return `${unitLabel}：${faculty}`;
  return `${faculty} · ${unitLabel}：${unitName}`;
}

function getProgrammeTitle(programme: { schoolId: SchoolId; title: string; titleZh?: string }) {
  if (programme.schoolId === 'lingnan' && programme.titleZh && programme.titleZh !== programme.title) return programme.titleZh;
  return programme.title;
}

function getProgrammeSubtitle(programme: { schoolId: SchoolId; title: string; titleZh?: string; titleEn?: string }) {
  if (programme.schoolId === 'lingnan' && programme.titleZh && programme.titleZh !== programme.title) return programme.title;
  return programme.titleEn && programme.titleEn !== programme.title ? programme.titleEn : '';
}

function getProgrammeEnglishShortName(programme: { title: string; titleEn?: string }) {
  const english = (programme.titleEn || programme.title || '').trim();
  if (!english) return '';
  const degreeNames: Array<[string, string]> = [
    ['Doctor of Business Administration', 'DBA'],
    ['Doctor of Business Studies', 'DBS'],
    ['Doctor of Artificial Intelligence Studies', 'DAIS'],
    ['Doctor of Policy Studies', 'DPS'],
    ['Doctor of Smart Manufacturing', 'DSM'],
    ['Master of Social Sciences', 'MSocSc'],
    ['Master of Science', 'MSc'],
    ['Master of Arts', 'MA'],
    ['Master of Accountancy', 'MAcc'],
    ['Master of Cultural Studies', 'MCS'],
    ['Master of Cities and Governance', 'MCG'],
    ['Bachelor of Business Administration (Honours)', 'BBA (Hons)'],
    ['Bachelor of Social Sciences (Honours)', 'BSocSc (Hons)'],
    ['Bachelor of Liberal Arts (Honours)', 'BLA (Hons)'],
    ['Bachelor of Science (Honours)', 'BSc (Hons)'],
    ['Bachelor of Arts (Honours)', 'BA (Hons)']
  ];
  return degreeNames.reduce((label, [full, short]) => label.split(full).join(short), english);
}

function getProgrammeSelectLabel(programme: { schoolId: SchoolId; title: string; titleZh?: string; titleEn?: string }) {
  const title = getProgrammeTitle(programme);
  if (programme.schoolId !== 'lingnan') return title;
  const shortName = getProgrammeEnglishShortName(programme);
  return shortName && shortName !== title ? `${title} / ${shortName}` : title;
}

function getMediumTone(medium: string) {
  if (medium.includes('英文')) return 'english';
  if (medium.includes('中文')) return 'chinese';
  return 'neutral';
}

function getProgrammeDisplayKey(programme: Programme) {
  if (programme.schoolId === 'eduhk' && (programme.id === 'aiep-emi' || programme.id === 'aiep-cmi')) return 'eduhk-aiep';
  return programme.id;
}

function getProgrammeSortPriority(programme: Programme) {
  return getProgrammeDisplayKey(programme) === 'eduhk-aiep' ? -1 : 0;
}

function getDisplayProgrammes(programmes: Programme[]) {
  const seen = new Set<string>();
  return programmes
    .filter((programme) => {
      const key = getProgrammeDisplayKey(programme);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const priority = getProgrammeSortPriority(a) - getProgrammeSortPriority(b);
      if (priority) return priority;
      return getProgrammeTitle(a).localeCompare(getProgrammeTitle(b), 'zh-Hans-CN');
    });
}

function getProgrammeMediumBadges(programme: Programme, programmes: Programme[]) {
  const key = getProgrammeDisplayKey(programme);
  return uniqueCompact(programmes.filter((item) => getProgrammeDisplayKey(item) === key).map((item) => item.medium));
}

function getProgrammeCourseTotal(programme: Programme) {
  return platformData.courses.filter((course) => course.programmeId === programme.id).length;
}

function getProgrammeMetricText(programme: Programme) {
  if (programme.totalCredits) return `${programme.totalCredits} 学分`;
  const actualCourses = getProgrammeCourseTotal(programme);
  const count = actualCourses || programme.courseCount || 0;
  return count > 0 ? `${count} 门课程` : '课程资料待补充';
}

function groupProgrammesByFaculty(programmes: Programme[]) {
  const groups = new Map<string, Programme[]>();
  getDisplayProgrammes(programmes).forEach((programme) => {
    const key = programme.faculty || '其他项目';
    groups.set(key, (groups.get(key) || []).concat(programme));
  });
  return Array.from(groups.entries()).map(([faculty, items]) => ({
    faculty,
    programmes: items
  }));
}

function getCourseTitle(course: Course) {
  return course.titleZh || course.title;
}

function getCourseSubtitle(course: Course) {
  return course.titleZh && course.titleZh !== course.title ? course.title : '';
}

function formatFacultyText(text = '') {
  return Object.entries({
    文科方向: '文学院',
    商科方向: '商学院',
    社科方向: '社会科学院',
    数据科学方向: '数据科学学院',
    跨学科方向: '跨学科研究学院',
    研究生项目方向: '研究生院'
  }).reduce((current, [from, to]) => current.split(from).join(to), text);
}

function schoolAbbreviation(school: School) {
  return school.id === 'eduhk' ? 'EdUHK' : 'LU';
}

function Header({
  activeSchool,
  onChooseSchool,
  isAdmin,
  onAdminLogout
}: {
  activeSchool: School;
  onChooseSchool: (schoolId: SchoolId) => void;
  isAdmin: boolean;
  onAdminLogout: () => void;
}) {
  return (
    <header className="site-header">
      <button className="brand-button" onClick={() => go('/')}>
        <span className="brand-avatar"><img src={APP_LOGO_SRC} alt="Otter" /></span>
        <span>
          <strong>{APP_NAME}</strong>
          <small>{APP_VERSION} · {schoolAbbreviation(activeSchool)} · {activeSchool.name}</small>
        </span>
      </button>
      <nav className="top-nav">
        <button onClick={() => go('/')}>首页</button>
        <button onClick={() => go('/courses')}>课程库</button>
        <button onClick={() => go('/favorites')}>我的收藏</button>
        <button onClick={() => go('/register')}>注册</button>
        <button onClick={() => go('/login')}>登录</button>
        <button onClick={() => go('/policy')}>隐私与诚信</button>
        {isAdmin && <button onClick={() => go('/admin')}>管理视角</button>}
        {isAdmin && <button onClick={onAdminLogout}>退出管理</button>}
      </nav>
      <div className="school-switcher">
        {platformData.schools.map((school) => (
          <button
            key={school.id}
            className={activeSchool.id === school.id ? 'active' : ''}
            onClick={() => onChooseSchool(school.id)}
          >
            {school.shortName}
          </button>
        ))}
      </div>
    </header>
  );
}

function SearchBox({ initialValue = '' }: { initialValue?: string }) {
  const [keyword, setKeyword] = useState(initialValue);

  const submit = () => {
    const value = keyword.trim();
    if (value) go(`/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <div className="search-box">
      <input
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit();
        }}
        placeholder="搜索课程、专业、租房、通勤、美食、攻略"
      />
      <button onClick={submit}>搜索</button>
    </div>
  );
}

function LandingPage({
  accepted,
  onAcceptedChange,
  onEnter
}: {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  onEnter: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <main className="landing-shell">
      <section className="landing-page">
        <div className="hk-sketch" aria-hidden="true">
          <div className="sketch-sun"></div>
          <div className="sketch-cloud cloud-a"></div>
          <div className="sketch-cloud cloud-b"></div>
          <div className="sketch-hills"></div>
          <div className="sketch-skyline">
            <span className="tower tall"></span>
            <span className="tower slim"></span>
            <span className="tower block"></span>
            <span className="tower round"></span>
            <span className="tower short"></span>
          </div>
          <div className="sketch-sign sign-food">茶餐厅</div>
          <div className="sketch-sign sign-bus">巴士站</div>
          <div className="sketch-tram">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="sketch-harbor">
            <span className="wave wave-a"></span>
            <span className="wave wave-b"></span>
            <span className="wave wave-c"></span>
          </div>
          <div className="sketch-ferry">
            <span></span>
          </div>
        </div>
        <div className="landing-shade" aria-hidden="true"></div>

        <div className="landing-copy">
          <div className="landing-overlay intro-panel">
            <span className="landing-kicker">{APP_NAME} {APP_VERSION}</span>
            <h1>选课、租房、通勤和新生事项，一个入口先看清楚</h1>
            <p>
              当前支持香港教育大学和岭南大学。可以按学校查看课程清单并收藏；
              租房、通勤、美食、出行等生活内容会按当前学校分别显示。所有课程字段都保留来源和核对日期。
            </p>
            <div className="landing-feature-grid">
              <span>专业课程知识库</span>
              <span>课程收藏</span>
              <span>生活指南</span>
              <span>学校平台切换</span>
            </div>
            <div className="landing-policy-note">
              <strong>内测说明</strong>
              <span>{BETA_NOTICE}</span>
            </div>
          </div>
        </div>

        <div className="landing-overlay agreement-panel">
          <span className="landing-kicker">进入前确认</span>
          <h1>隐私政策与学术诚信</h1>
          <p>
            进入前需要先注册或登录账号。请确认你理解：本工具是非官方学生信息整理工具，
            不代表任何学校，不替代官网、handbook、programme office 或课程系统的最新说明；登录后才可以查看课程、收藏和生活内容。
          </p>

          <div className="agreement-list">
            <div>
              <strong>隐私政策</strong>
              <p>{APP_VERSION} 已开放邮箱注册、登录和联系作者信箱；注册只用于保存用户身份和后续服务端统计，不要求邮箱二次验证。用户反馈不会直接公开，仍由管理员整理后更新。</p>
            </div>
            <div>
              <strong>避免学术不端</strong>
              <p>本工具只整理公开信息，不能用于代写作业、规避学校规则、伪造成绩、复制课程作业或任何违反学术诚信的行为。</p>
            </div>
            <div>
              <strong>信息核对</strong>
              <p>课程学分、开课学期、先修要求、毕业要求等必须以学校官方最新资料为准。</p>
            </div>
            <div>
              <strong>学校关系</strong>
              <p>本网站不使用学校官方 logo，不声称获得香港教育大学或岭南大学授权、认可或背书。</p>
            </div>
          </div>

          <label className="agreement-check">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => onAcceptedChange(event.target.checked)}
            />
            <span><strong>我已阅读并同意</strong> 隐私政策与学术诚信说明，明白本工具仅供参考。</span>
          </label>

          <button className="enter-app-button" disabled={!accepted} onClick={() => setConfirmOpen(true)}>
            确认并登录 / 注册
          </button>

        </div>

        {confirmOpen && (
          <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className="confirm-dialog">
              <span className="landing-kicker">确认操作</span>
              <h2 id="confirm-title">{accepted ? '是否确认继续？' : '请先勾选协议'}</h2>
              <p>
                {accepted
                  ? '请确认你已经阅读并同意隐私与学术诚信协议。下一步需要登录或注册，成功后才可以进入内容页面。'
                  : '进入前需要先勾选“我已阅读并同意以上隐私与学术诚信协议”。'}
              </p>
              <div className="confirm-actions">
                <button className="secondary-action" onClick={() => setConfirmOpen(false)}>
                  {accepted ? '再看看' : '我知道了'}
                </button>
                {accepted && (
                  <button className="primary-action" onClick={onEnter}>
                    继续
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function RegistrationPage({
  activeSchoolId,
  onRegistered
}: {
  activeSchoolId: SchoolId;
  onRegistered: (user: RegisteredUser) => void;
}) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [schoolId, setSchoolId] = useState<SchoolId>(activeSchoolId);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError('');
    if (!isValidEmailShape(email.trim())) {
      setError('请填写真实邮箱格式；后端会检查邮箱域名是否可用');
      return;
    }
    if (username.trim().length < 2) {
      setError('用户名至少 2 个字符');
      return;
    }
    if (!isStrongEnoughPassword(password)) {
      setError('密码至少 8 位，并包含字母和数字');
      return;
    }
    setSaving(true);
    try {
      const user = await registerUser({ email: email.trim(), username: username.trim(), password, schoolId });
      onRegistered(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="registration-shell">
      <section className="registration-panel">
        <span className="eyebrow">{APP_NAME} {APP_VERSION}</span>
        <div className="registration-brand">
          <img src={APP_LOGO_SRC} alt="Otter logo" />
        </div>
        <div className="registration-form">
          <label>
            <span>邮箱</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="填写可用邮箱，不需要验证码" type="email" autoComplete="email" />
          </label>
          <label>
            <span>用户名</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="例如：Otter 用户" autoComplete="nickname" />
          </label>
          <label>
            <span>密码</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位，包含字母和数字" type="password" autoComplete="current-password" />
          </label>
          <label>
            <span>学校</span>
            <select value={schoolId} onChange={(event) => setSchoolId(event.target.value as SchoolId)}>
              {platformData.schools.map((school) => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </label>
          <button className="primary-action" onClick={submit} disabled={saving}>{saving ? '注册中' : '注册并进入 Otter'}</button>
          {error && <p className="form-error">{error}</p>}
          <p className="login-note">后端会检查邮箱格式和邮箱域名是否可用；当前不发送验证码邮件，也不要求邮箱二次验证。</p>
          <button className="secondary-action" onClick={() => go('/login')}>已有账号，直接登录</button>
        </div>
      </section>
    </main>
  );
}

function LoginPage({ onLoggedIn }: { onLoggedIn: (user: RegisteredUser) => void }) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError('');
    if (!account.trim()) {
      setError('请填写邮箱或用户名');
      return;
    }
    if (!password) {
      setError('请填写密码');
      return;
    }
    setSaving(true);
    try {
      const user = await loginUser({ account: account.trim(), password });
      onLoggedIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="registration-shell">
      <section className="registration-panel">
        <span className="eyebrow">{APP_NAME} {APP_VERSION}</span>
        <div className="registration-brand">
          <img src={APP_LOGO_SRC} alt="Otter logo" />
        </div>
        <div className="registration-form">
          <label className="wide">
            <span>邮箱或用户名</span>
            <input value={account} onChange={(event) => setAccount(event.target.value)} placeholder="输入注册邮箱或用户名" autoComplete="username" />
          </label>
          <label className="wide">
            <span>密码</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入密码"
              type="password"
              autoComplete="current-password"
              onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }}
            />
          </label>
          <button className="primary-action" onClick={submit} disabled={saving}>{saving ? '登录中' : '登录'}</button>
          {error && <p className="form-error">{error}</p>}
          <p className="login-note">管理员账号不能在普通登录页登录；请使用管理端入口。</p>
          <button className="secondary-action" onClick={() => go('/admin')}>管理员登录</button>
          <button className="secondary-action" onClick={() => go('/register')}>没有账号，去注册</button>
        </div>
      </section>
    </main>
  );
}

function AuthRequiredPage({ activeSchool }: { activeSchool: School }) {
  return (
    <section className="page-panel auth-required-panel">
      <span className="eyebrow">账号验证</span>
      <div className="empty-state">
        <strong>请先登录或注册 Otter 账号</strong>
        <span>当前选择：{activeSchool.name}。登录后才可以查看课程库、收藏和生活内容。</span>
      </div>
      <div className="auth-required-actions">
        <button className="primary-action" onClick={() => go('/register')}>注册账号</button>
        <button className="secondary-action" onClick={() => go('/login')}>已有账号，登录</button>
      </div>
    </section>
  );
}

function SchoolPanel({
  activeSchool,
  onChooseSchool
}: {
  activeSchool: School;
  onChooseSchool: (schoolId: SchoolId) => void;
}) {
  return (
    <section className="school-panel">
      <div>
        <span className="eyebrow">当前平台</span>
        <h2 className="school-title-line">
          {activeSchool.name}
          <span>{schoolAbbreviation(activeSchool)}</span>
        </h2>
        <p>{activeSchool.description}</p>
      </div>
      <div className="school-card-row">
        {platformData.schools.map((school) => (
          <button
            key={school.id}
            className={`school-card ${activeSchool.id === school.id ? 'active' : ''}`}
            onClick={() => onChooseSchool(school.id)}
          >
            <span className="school-card-code">{schoolAbbreviation(school)}</span>
            <strong>{school.name}</strong>
            <span>{school.nameEn}</span>
            <small>{getProgrammes(school.id).length} 个项目 · {getCourses(school.id).length} 门课程</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function HomePage({ activeSchool, onChooseSchool, dynamicPosts }: { activeSchool: School; onChooseSchool: (schoolId: SchoolId) => void; dynamicPosts: SharedPost[] }) {
  const programmes = getProgrammes(activeSchool.id);
  const displayProgrammes = useMemo(() => getDisplayProgrammes(programmes), [programmes]);
  const courses = getCourses(activeSchool.id);
  const visibleSharedPosts = getVisibleSharedPosts(activeSchool.id, dynamicPosts);
  const recommended = visibleSharedPosts.filter((post) => post.recommended).slice(0, 4);
  const [liveVisits, setLiveVisits] = useState(() => readLiveVisits());
  const supportCount = Math.max(12, readSupportTickets().length + 12);
  const forumCount = Math.max(28, visibleSharedPosts.length + 8);

  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      const delay = 30000 + Math.floor(Math.random() * 30000);
      timer = window.setTimeout(() => {
        setLiveVisits((current) => {
          const next = current + 1;
          writeLiveVisits(next);
          return next;
        });
        schedule();
      }, delay);
    };
    writeLiveVisits(liveVisits);
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <section className={`hero school-hero ${activeSchool.id}`}>
        <div className="hero-copy">
          <span className="eyebrow">{APP_VERSION} · {schoolAbbreviation(activeSchool)} · {activeSchool.name}</span>
          <h1>{activeSchool.id === 'eduhk' ? '香港教育大学课程与生活指南' : '岭南大学课程与生活指南'}</h1>
          <p>{activeSchool.description}</p>
          <SearchBox />
          <div className="hero-stats">
            <span><strong>{platformData.schools.length}</strong> 学校</span>
            <span><strong>{programmes.length}</strong> 当前学校项目</span>
            <span><strong>{courses.length}</strong> 当前学校课程</span>
          </div>
        </div>
        <div className="hero-live-panel" aria-label="实时访问与互动概览">
          <div className="live-panel-head">
            <span className="eyebrow">Live</span>
            <strong>实时访问</strong>
          </div>
          <div className="live-visit-count">
            <strong>{liveVisits.toLocaleString()}</strong>
            <span>累计访问量</span>
          </div>
          <div className="live-metric-list">
            <div>
              <span>收到建议</span>
              <strong>{supportCount}</strong>
              <small>最近更新：12 分钟前</small>
            </div>
            <div>
              <span>论坛发表</span>
              <strong>{forumCount}</strong>
              <small>最近更新：38 分钟前</small>
            </div>
            <div>
              <span>当前内容</span>
              <strong>{visibleSharedPosts.length}</strong>
              <small>{schoolAbbreviation(activeSchool)} 生活条目</small>
            </div>
          </div>
        </div>
      </section>
      <SchoolPanel activeSchool={activeSchool} onChooseSchool={onChooseSchool} />

      <section className="section">
        <div className="section-head">
          <h2>功能分类</h2>
          <p>课程清单和生活分区都会跟随当前学校切换；暂无内容的分区会显示空状态。</p>
        </div>
        <div className="category-grid">
          {sectionCategories.map((category) => (
            <button
              key={category.key}
              className={`category-card ${category.accent}`}
              onClick={() => (category.key === 'course_catalog' ? go('/courses') : go(`/section/${sectionIdByCategory[category.key]}`))}
            >
              <span>{category.name}</span>
              <small>{category.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{activeSchool.shortName}课程入口</h2>
          <p>先从当前学校的项目开始看。</p>
        </div>
        <div className="programme-grid">
          {displayProgrammes.slice(0, 4).map((programme) => (
            <button key={programme.id} className="programme-card" onClick={() => go(`/courses?programme=${encodeURIComponent(programme.id)}`)}>
              <div className="medium-badge-row">
                {getProgrammeMediumBadges(programme, programmes).map((medium) => (
                  <span key={medium} className={`medium-badge ${getMediumTone(medium)}`}>{medium}</span>
                ))}
              </div>
              <strong>{getProgrammeTitle(programme)}</strong>
              {getProgrammeSubtitle(programme) && <em>{getProgrammeSubtitle(programme)}</em>}
              <span>{getProgrammeMetricText(programme)}</span>
              <small>{programme.schoolId === 'eduhk' ? getUnitText(programme) : `${formatFacultyName(programme.faculty)} · 课程资料`}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>当前推荐</h2>
          <p>只显示当前学校相关内容。</p>
        </div>
        <PostGrid posts={recommended} />
      </section>
    </>
  );
}

function CoursesPage({
  activeSchool,
  favoriteCourseIds,
  onToggleFavoriteCourse
}: {
  activeSchool: School;
  favoriteCourseIds: string[];
  onToggleFavoriteCourse: (id: string) => void;
}) {
  const routeProgramme = new URLSearchParams(window.location.hash.split('?')[1] || '').get('programme') || '';
  const programmes = useMemo(() => getProgrammes(activeSchool.id), [activeSchool.id]);
  const normalizeProgrammeId = (id: string) => {
    const programme = programmes.find((item) => item.id === id);
    if (!programme) return id;
    const displayProgramme = getDisplayProgrammes(programmes).find((item) => getProgrammeDisplayKey(item) === getProgrammeDisplayKey(programme));
    return displayProgramme?.id || id;
  };
  const courseFilterKey = `${FILTER_STORAGE_PREFIX}courses:${activeSchool.id}`;
  const defaultCourseFilters = useMemo<CourseFilterState>(
    () => ({
      programmeId: routeProgramme ? normalizeProgrammeId(routeProgramme) : '',
      levelFilter: 'all',
      facultyFilter: 'all',
      typeKey: 'all',
      keyword: ''
    }),
    [routeProgramme]
  );
  const [filters, setFilters] = useState<CourseFilterState>(() => defaultCourseFilters);

  useEffect(() => {
    const next = getStoredObject(courseFilterKey, defaultCourseFilters);
    const resolved = { ...next, programmeId: routeProgramme ? normalizeProgrammeId(routeProgramme) : '' };
    setFilters(resolved);
    saveStoredObject(courseFilterKey, resolved);
  }, [courseFilterKey, defaultCourseFilters, routeProgramme]);

  const updateCourseFilters = (patch: Partial<CourseFilterState>) => {
    setFilters((current) => {
      const next = { ...current, ...patch };
      saveStoredObject(courseFilterKey, next);
      return next;
    });
  };

  const { programmeId, levelFilter, facultyFilter, typeKey, keyword } = filters;

  const levelOptions = useMemo(
    () => uniqueCompact(programmes.flatMap((programme) => (programme.studyModes.length ? programme.studyModes : ['以项目说明为准']))),
    [programmes]
  );

  const facultyOptions = useMemo(() => uniqueCompact(programmes.map((programme) => programme.faculty)), [programmes]);

  const programmeOptions = useMemo(
    () =>
      getDisplayProgrammes(programmes.filter((programme) => {
        const matchesLevel =
          levelFilter === 'all' ||
          programme.studyModes.includes(levelFilter) ||
          (!programme.studyModes.length && levelFilter === '以项目说明为准');
        const matchesFaculty = facultyFilter === 'all' || programme.faculty === facultyFilter;
        return matchesLevel && matchesFaculty;
      })),
    [facultyFilter, levelFilter, programmes]
  );

  useEffect(() => {
    if (programmeId && !programmeOptions.some((programme) => programme.id === programmeId)) updateCourseFilters({ programmeId: '' });
  }, [programmeId, programmeOptions]);

  const activeProgramme = programmeOptions.find((programme) => programme.id === programmeId);
  const programmeGroups = useMemo(() => groupProgrammesByFaculty(programmeOptions), [programmeOptions]);
  const courses = useMemo(() => {
    if (!activeProgramme) return [];
    return getCourses(activeSchool.id)
      .filter((course) => course.programmeId === activeProgramme.id)
      .filter((course) => typeKey === 'all' || course.typeKey === typeKey)
      .filter((course) => courseMatches(course, keyword));
  }, [activeSchool.id, activeProgramme, keyword, typeKey]);

  return (
    <section className="page-panel">
      <div className="page-title-block centered">
        <span className="eyebrow">专业课程知识库</span>
        <h1>{activeSchool.name}</h1>
        <p>{activeSchool.description}</p>
      </div>
      <div className="page-toolbar-actions">
        <button className="secondary-action" onClick={() => goBack('/')}>返回首页</button>
      </div>

      <div className="filter-panel">
        <div className="filter-row">
          <span className="filter-label">学历</span>
          <div className="filter-chips">
            <button className={levelFilter === 'all' ? 'active' : ''} onClick={() => updateCourseFilters({ levelFilter: 'all' })}>全部</button>
            {levelOptions.map((level) => (
              <button key={level} className={levelFilter === level ? 'active' : ''} onClick={() => updateCourseFilters({ levelFilter: level })}>
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <span className="filter-label">学院 / 学系 / 单位</span>
          <div className="filter-chips">
            <button className={facultyFilter === 'all' ? 'active' : ''} onClick={() => updateCourseFilters({ facultyFilter: 'all' })}>全部</button>
            {facultyOptions.map((faculty) => (
              <button key={faculty} className={facultyFilter === faculty ? 'active' : ''} onClick={() => updateCourseFilters({ facultyFilter: faculty })}>
                {formatFacultyName(faculty)}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <span className="filter-label">课程类型</span>
          <div className="filter-chips">
            {courseTypeOptions.map((option) => (
              <button key={option.key} className={typeKey === option.key ? 'active' : ''} onClick={() => updateCourseFilters({ typeKey: option.key })}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-grid">
          <label>
            <span>项目</span>
            <select value={programmeId} onChange={(event) => updateCourseFilters({ programmeId: event.target.value })}>
              <option value="">未选择项目，先看专业模块</option>
              {programmeOptions.map((programme) => (
                <option key={programme.id} value={programme.id}>{getProgrammeSelectLabel(programme)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>关键词</span>
            <input value={keyword} onChange={(event) => updateCourseFilters({ keyword: event.target.value })} placeholder="搜索课程名、代码、标签" />
          </label>
        </div>
      </div>

      {!activeProgramme && (
        <section className="programme-module-board">
          <div className="course-list-head">
            <div>
              <h2>专业模块</h2>
              <p>先按学院、学系或独立单位查看专业。选择一个专业后，下方会显示对应课程清单。</p>
            </div>
          </div>
          {!programmeGroups.length && (
            <div className="empty-state">
              <strong>当前筛选下暂无专业</strong>
              <span>请清除学历或学院筛选后再看。</span>
            </div>
          )}
          {programmeGroups.map((group) => (
            <div className="programme-module" key={group.faculty}>
              <div className="programme-module-head">
                <strong>{formatFacultyName(group.faculty)}</strong>
                <span>{group.programmes.length} 个专业</span>
              </div>
              <div className="programme-grid">
                {group.programmes.map((programme) => (
                  <button key={programme.id} className="programme-card" onClick={() => updateCourseFilters({ programmeId: programme.id })}>
                    <div className="medium-badge-row">
                      {getProgrammeMediumBadges(programme, programmes).map((medium) => (
                        <span key={medium} className={`medium-badge ${getMediumTone(medium)}`}>{medium}</span>
                      ))}
                    </div>
                    <strong>{getProgrammeTitle(programme)}</strong>
                    {getProgrammeSubtitle(programme) && <em>{getProgrammeSubtitle(programme)}</em>}
                    <span>{getProgrammeMetricText(programme)}</span>
                    <small>{getUnitText(programme)}</small>
                    {programme.statusBadge && programme.statusBadge !== programme.medium && <small>{programme.statusBadge}</small>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {activeProgramme && (
        <section className="programme-summary">
          <strong>{getProgrammeTitle(activeProgramme)}</strong>
          {getProgrammeSubtitle(activeProgramme) && <em>{getProgrammeSubtitle(activeProgramme)}</em>}
          <p>{activeProgramme.mediumDetail}</p>
          <div className="tag-row">
            {getProgrammeMediumBadges(activeProgramme, programmes).map((medium) => (
              <span key={medium} className={`medium-badge ${getMediumTone(medium)}`}>{medium}</span>
            ))}
            <span>{getUnitText(activeProgramme)}</span>
            <span>{activeProgramme.studyModes.join(' / ') || '以项目说明为准'}</span>
            <span>{getProgrammeMetricText(activeProgramme)}</span>
          </div>
          {activeProgramme.unitNote && <small>{activeProgramme.unitNote}</small>}
          {activeProgramme.translationNote && <small>{activeProgramme.translationNote}</small>}
          <small>{formatFacultyText(activeProgramme.requirements.note)}</small>
        </section>
      )}

      <div className="course-list-head">
        <div>
          <h2>课程清单</h2>
          <p>
            {activeProgramme && courses.length
              ? `当前项目共显示 ${courses.length} 门课程${keyword || typeKey !== 'all' ? '，已按关键词或课程类型筛选。' : '。'}`
              : activeProgramme
                ? '当前项目课程资料待补充，将优先从官网、handbook、项目 PDF 和可信公开资料整理。'
              : '请先在上方专业模块中选择一个项目。'}
          </p>
        </div>
        {(keyword || typeKey !== 'all') && (
          <button className="secondary-action" onClick={() => updateCourseFilters({ keyword: '', typeKey: 'all' })}>
            清除课程筛选
          </button>
        )}
      </div>

      {!courses.length && (
        <div className="empty-state">
          <strong>{activeProgramme ? '课程资料待补充' : '尚未选择项目'}</strong>
          <span>{activeProgramme ? '这个项目暂未收录具体课程条目，后续会从官网、handbook、项目 PDF 和可信公开资料补充。' : '从专业模块或项目下拉菜单选择一个专业后，会显示课程清单。'}</span>
        </div>
      )}

      <div className="course-list">
        {courses.map((course) => (
          <article key={course.id} className="course-card">
            <button className="course-main" onClick={() => go(`/course/${encodeURIComponent(course.id)}`)}>
              <div className="course-head">
                <strong>{getCourseTitle(course)}</strong>
                <span>{formatCreditsText(course)}</span>
              </div>
              {getCourseSubtitle(course) && <em>{getCourseSubtitle(course)}</em>}
              {course.courseCode && <small>{course.courseCode}</small>}
              <p>{formatFacultyText(course.description)}</p>
              <div className="tag-row">
                <span>{course.type}</span>
                <span className={`medium-badge ${getMediumTone(course.medium)}`}>{course.medium}</span>
                <span>{getUnitText(course)}</span>
                <span>{course.required ? '必修' : '可选'}</span>
              </div>
            </button>
            <div className="inline-actions">
              <button className={favoriteCourseIds.includes(course.id) ? 'active' : ''} onClick={() => onToggleFavoriteCourse(course.id)}>
                {favoriteCourseIds.includes(course.id) ? '已收藏' : '收藏'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CourseDetailPage({
  id,
  favoriteCourseIds,
  onToggleFavoriteCourse
}: {
  id: string;
  favoriteCourseIds: string[];
  onToggleFavoriteCourse: (id: string) => void;
}) {
  const course = getCourse(id);

  if (!course) return <EmptyPage title="没有找到这门课程" />;

  return (
    <article className="detail-page">
      <button className="back-button" onClick={() => goBack('/courses')}>返回课程库</button>
      <section className="detail-head course-detail-head">
        <span className="pill">{course.school} · {course.type}</span>
        <h1>{getCourseTitle(course)}</h1>
        {getCourseSubtitle(course) && <p>{getCourseSubtitle(course)}</p>}
        <div className="tag-row">
          <span>{formatCreditsText(course)}</span>
          <span className={`medium-badge ${getMediumTone(course.medium)}`}>{course.medium}</span>
          <span>{course.required ? '必修' : '可选'}</span>
          {course.courseCode && <span>{course.courseCode}</span>}
        </div>
      </section>

      <section className="detail-body">
        <h2>课程简介</h2>
        <p>{formatFacultyText(course.description)}</p>
        <h2>选课信息</h2>
        <dl className="info-list">
          <div><dt>所属项目</dt><dd>{course.programmeTitle}</dd></div>
          <div><dt>学院 / 单位</dt><dd>{getUnitText(course)}</dd></div>
          {course.parentUnit && <div><dt>上级单位</dt><dd>{course.parentUnit}</dd></div>}
          <div><dt>开课学期</dt><dd>{displayCourseInfo(course.semester)}</dd></div>
          <div><dt>先修要求</dt><dd>{displayCourseInfo(course.prerequisites)}</dd></div>
          <div><dt>资料核对</dt><dd>{course.checkedAt}</dd></div>
          <div><dt>来源</dt><dd>{course.sourceUrl}</dd></div>
        </dl>
      </section>

      <div className="detail-actions">
        <button className={`primary-action ${favoriteCourseIds.includes(course.id) ? 'saved' : ''}`} onClick={() => onToggleFavoriteCourse(course.id)}>
          {favoriteCourseIds.includes(course.id) ? '已收藏' : '收藏课程'}
        </button>
      </div>
    </article>
  );
}

function AdminPostEditor({
  activeSchool,
  sectionId,
  initialPost,
  adminToken,
  onSaved,
  onCancel
}: {
  activeSchool: School;
  sectionId: string;
  initialPost?: SharedPost | null;
  adminToken: string;
  onSaved: (post: SharedPost) => void;
  onCancel: () => void;
}) {
  const config = postEditorConfig[sectionId] || postEditorConfig['new-student'];
  const [title, setTitle] = useState(initialPost?.title || '');
  const [summary, setSummary] = useState(initialPost?.summary || '');
  const [content, setContent] = useState(initialPost?.content || '');
  const [region, setRegion] = useState(initialPost?.region || '');
  const [source, setSource] = useState(initialPost?.source || '学生投稿');
  const [schoolId, setSchoolId] = useState<SchoolId | 'shared'>(initialPost?.schoolId || activeSchool.id);
  const [status, setStatus] = useState(initialPost?.status || 'published');
  const [recommended, setRecommended] = useState(Boolean(initialPost?.recommended));
  const [tags, setTags] = useState<string[]>(initialPost?.tags || []);
  const [imageText, setImageText] = useState((initialPost?.imageUrls || []).join('\n'));
  const [metadata, setMetadata] = useState<Record<string, string>>(initialPost?.metadata || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (tag: string) => {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : current.concat(tag));
  };

  const submit = async () => {
    setError('');
    setSaving(true);
    try {
      const post = await saveAdminPost({
        id: initialPost?.id || '',
        sectionId,
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        tags,
        region: region.trim(),
        source,
        authorRole: '管理员',
        createdAt: initialPost?.createdAt || new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
        status,
        shared: schoolId === 'shared',
        recommended,
        schoolId,
        imageUrls: imageText.split('\n').map((item) => item.trim()).filter(Boolean),
        metadata
      }, adminToken);
      onSaved(post);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-post-editor">
      <div className="section-head compact">
        <div>
          <span className="eyebrow">管理员发布</span>
          <h3>{initialPost ? '编辑内容' : '新增内容'}</h3>
        </div>
        <button className="secondary-action" onClick={onCancel}>取消</button>
      </div>
      <div className="support-form">
        <label>
          <span>可见范围</span>
          <select value={schoolId} onChange={(event) => setSchoolId(event.target.value as SchoolId | 'shared')}>
            <option value={activeSchool.id}>当前学校：{activeSchool.shortName}</option>
            <option value="shared">两校共享</option>
            <option value="eduhk">仅教育大学</option>
            <option value="lingnan">仅岭南大学</option>
          </select>
        </label>
        <label>
          <span>状态</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="published">发布</option>
            <option value="draft">草稿</option>
            <option value="deleted">隐藏 / 删除</option>
          </select>
        </label>
        <label className="wide">
          <span>标题</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="写一个清楚的标题" />
        </label>
        <label>
          <span>{config.regionLabel}</span>
          <input value={region} onChange={(event) => setRegion(event.target.value)} placeholder={config.regionLabel} />
        </label>
        <label>
          <span>数据来源</span>
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="学生投稿">学生投稿</option>
            <option value="网络搜集">网络搜集</option>
            <option value="管理员整理">管理员整理</option>
          </select>
        </label>
        <label className="wide">
          <span>摘要</span>
          <input value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="列表页显示的简短说明" />
        </label>
        <label className="wide">
          <span>正文</span>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={8} placeholder="正文支持换行，详情页会按段落显示。"></textarea>
        </label>
        <div className="wide admin-tag-picker">
          <span>板块标签</span>
          <div className="filter-chips">
            {config.tags.map((tag) => (
              <button type="button" key={tag} className={tags.includes(tag) ? 'active' : ''} onClick={() => toggleTag(tag)}>{tag}</button>
            ))}
          </div>
        </div>
        {config.metadata.map((field) => (
          <label key={field}>
            <span>{field}</span>
            <input value={metadata[field] || ''} onChange={(event) => setMetadata((current) => ({ ...current, [field]: event.target.value }))} placeholder={field} />
          </label>
        ))}
        <label className="wide">
          <span>图片 URL（可选，一行一个）</span>
          <textarea value={imageText} onChange={(event) => setImageText(event.target.value)} rows={3} placeholder="建议先用对象存储或 CDN 图片 URL。不要把大图放进数据库。"></textarea>
        </label>
        <label className="checkbox-line wide">
          <input type="checkbox" checked={recommended} onChange={(event) => setRecommended(event.target.checked)} />
          <span>设为推荐内容</span>
        </label>
        <button className="primary-action" onClick={submit} disabled={saving}>{saving ? '保存中' : '保存内容'}</button>
        {error && <p className="form-error">{error}</p>}
      </div>
    </div>
  );
}

function PostGrid({ posts, canEdit = false, onEdit }: { posts: SharedPost[]; canEdit?: boolean; onEdit?: (post: SharedPost) => void }) {
  if (!posts.length) return <div className="empty-state"><strong>暂无内容</strong><span>当前筛选下没有可显示内容。</span></div>;

  return (
    <div className="post-grid">
      {posts.map((post) => {
        const image = getPostImage(post);
        return (
          <article key={post.id} className={`post-card ${image ? 'with-image' : ''}`}>
            {image && (
              <button className="post-cover-button" onClick={() => go(`/post/${encodeURIComponent(post.id)}`)} aria-label={`打开 ${post.title}`}>
                <img className="post-cover" src={image} alt={`${getHousingName(post)}参考图`} loading="lazy" />
              </button>
            )}
            <button className="post-main" onClick={() => go(`/post/${encodeURIComponent(post.id)}`)}>
              <span className="pill">{post.authorRole}</span>
              <h3>{post.title}</h3>
              <p>{post.summary || post.content.slice(0, 120)}</p>
              <div className="post-meta">
                <span>{post.region || '香港'}</span>
                <span>{post.createdAt}</span>
              </div>
              <div className="tag-row">
                {post.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </button>
            {canEdit && onEdit && <button className="secondary-action post-edit-action" onClick={() => onEdit(post)}>编辑</button>}
          </article>
        );
      })}
    </div>
  );
}

function SectionPage({
  sectionId,
  activeSchool,
  dynamicPosts,
  onDynamicPostsChange
}: {
  sectionId: string;
  activeSchool: School;
  dynamicPosts: SharedPost[];
  onDynamicPostsChange: (posts: SharedPost[]) => void;
}) {
  const category = categoryBySectionId[sectionId];
  const meta = sectionCategories.find((item) => item.key === category);
  const [adminToken] = useStoredState(ADMIN_TOKEN_STORAGE_KEY, '');
  const [adminSession] = useStoredState('student-life-notes:admin-session', false);
  const canEdit = Boolean(adminToken || (!API_BASE_URL && adminSession));
  const [editingPost, setEditingPost] = useState<SharedPost | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const posts = useMemo(
    () => getVisibleSharedPosts(activeSchool.id, dynamicPosts).filter((post) => post.sectionId === sectionId && post.status === 'published'),
    [activeSchool.id, dynamicPosts, sectionId]
  );
  const sectionFilterKey = `${FILTER_STORAGE_PREFIX}section:${sectionId}`;
  const defaultSectionFilters = useMemo<SectionFilterState>(
    () => ({
      regionFilter: 'all',
      tagFilter: 'all',
      sortKey: 'latest',
      keyword: ''
    }),
    []
  );
  const [filters, setFilters] = useState<SectionFilterState>(() => defaultSectionFilters);

  useEffect(() => {
    const next = getStoredObject(sectionFilterKey, defaultSectionFilters);
    setFilters(next);
    saveStoredObject(sectionFilterKey, next);
  }, [sectionFilterKey, defaultSectionFilters]);

  const updateSectionFilters = (patch: Partial<SectionFilterState>) => {
    setFilters((current) => {
      const next = { ...current, ...patch };
      saveStoredObject(sectionFilterKey, next);
      return next;
    });
  };

  const { regionFilter, tagFilter, sortKey, keyword } = filters;

  const regionOptions = useMemo(() => uniqueCompact(posts.map((post) => post.region || '香港')), [posts]);
  const tagOptions = useMemo(() => uniqueCompact(posts.flatMap((post) => post.tags)).slice(0, 18), [posts]);
  const filteredPosts = useMemo(() => {
    return posts
      .filter((post) => regionFilter === 'all' || (post.region || '香港') === regionFilter)
      .filter((post) => tagFilter === 'all' || post.tags.includes(tagFilter))
      .filter((post) => postMatches(post, keyword))
      .slice()
      .sort((a, b) => {
        if (sortKey === 'recommended') {
          const recommendedDiff = Number(Boolean(b.recommended)) - Number(Boolean(a.recommended));
          if (recommendedDiff) return recommendedDiff;
        }
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [keyword, posts, regionFilter, sortKey, tagFilter]);

  return (
    <section className="page-panel">
      <button className="back-button" onClick={() => goBack('/')}>返回首页</button>
      <div className="page-title-block centered">
        <span className="eyebrow">{activeSchool.shortName}生活内容</span>
        <h1>{meta?.name || '生活分区'}</h1>
        <p>{posts.length ? meta?.description || '当前学校相关生活信息。' : '这个分区当前学校暂时还没有上传内容。'}</p>
      </div>
      <div className="page-toolbar-actions">
        {canEdit ? (
          <button
            className="primary-action"
            onClick={() => {
              setEditingPost(null);
              setEditorOpen(true);
            }}
          >
            新增内容
          </button>
        ) : (
          <button className="secondary-action" onClick={() => go('/admin')}>管理员登录后发布</button>
        )}
      </div>

      {editorOpen && (
        <AdminPostEditor
          activeSchool={activeSchool}
          sectionId={sectionId}
          initialPost={editingPost}
          adminToken={adminToken}
          onCancel={() => setEditorOpen(false)}
          onSaved={(post) => {
            const next = dynamicPosts.some((item) => item.id === post.id)
              ? dynamicPosts.map((item) => item.id === post.id ? post : item)
              : [post, ...dynamicPosts];
            onDynamicPostsChange(next);
            setEditorOpen(false);
            setEditingPost(null);
          }}
        />
      )}

      <div className="filter-panel">
        <div className="filter-row">
          <span className="filter-label">地区</span>
          <div className="filter-chips">
            <button className={regionFilter === 'all' ? 'active' : ''} onClick={() => updateSectionFilters({ regionFilter: 'all' })}>全部</button>
            {regionOptions.map((region) => (
              <button key={region} className={regionFilter === region ? 'active' : ''} onClick={() => updateSectionFilters({ regionFilter: region })}>
                {region}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <span className="filter-label">标签</span>
          <div className="filter-chips">
            <button className={tagFilter === 'all' ? 'active' : ''} onClick={() => updateSectionFilters({ tagFilter: 'all' })}>全部</button>
            {tagOptions.map((tag) => (
              <button key={tag} className={tagFilter === tag ? 'active' : ''} onClick={() => updateSectionFilters({ tagFilter: tag })}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-grid compact">
          <label>
            <span>排序</span>
            <select value={sortKey} onChange={(event) => updateSectionFilters({ sortKey: event.target.value as 'latest' | 'recommended' })}>
              <option value="latest">最新更新</option>
              <option value="recommended">推荐优先</option>
            </select>
          </label>
          <label>
            <span>关键词</span>
            <input value={keyword} onChange={(event) => updateSectionFilters({ keyword: event.target.value })} placeholder="搜索标题、正文、标签、地区" />
          </label>
        </div>

        <div className="filter-count">当前显示 {filteredPosts.length} / {posts.length} 条</div>
      </div>

      <PostGrid
        posts={filteredPosts}
        canEdit={canEdit}
        onEdit={(post) => {
          setEditingPost(post);
          setEditorOpen(true);
        }}
      />
    </section>
  );
}

function PostDetailPage({
  id,
  activeSchool,
  dynamicPosts,
  onDynamicPostsChange
}: {
  id: string;
  activeSchool: School;
  dynamicPosts: SharedPost[];
  onDynamicPostsChange: (posts: SharedPost[]) => void;
}) {
  const [adminToken] = useStoredState(ADMIN_TOKEN_STORAGE_KEY, '');
  const [adminSession] = useStoredState('student-life-notes:admin-session', false);
  const [editorOpen, setEditorOpen] = useState(false);
  const canEdit = Boolean(adminToken || (!API_BASE_URL && adminSession));
  const post = getVisibleSharedPosts(activeSchool.id, dynamicPosts).find((item) => item.id === id);
  if (!post) return <EmptyPage title="没有找到这篇内容" />;
  const paragraphs = post.content.split('\n').filter(Boolean);
  const postImages = getPostImages(post);

  return (
    <article className="detail-page">
      <button className="back-button" onClick={() => goBack(`/section/${post.sectionId}`)}>返回分区</button>
      {canEdit && (
        <div className="page-toolbar-actions">
          <button className="primary-action" onClick={() => setEditorOpen(true)}>编辑这篇</button>
        </div>
      )}
      {editorOpen && (
        <AdminPostEditor
          activeSchool={activeSchool}
          sectionId={post.sectionId}
          initialPost={post}
          adminToken={adminToken}
          onCancel={() => setEditorOpen(false)}
          onSaved={(savedPost) => {
            const next = dynamicPosts.some((item) => item.id === savedPost.id)
              ? dynamicPosts.map((item) => item.id === savedPost.id ? savedPost : item)
              : [savedPost, ...dynamicPosts];
            onDynamicPostsChange(next);
            setEditorOpen(false);
          }}
        />
      )}
      <section className="detail-head">
        <span className="pill">{post.authorRole}</span>
        <h1>{post.title}</h1>
        <p>{post.summary || post.region}</p>
        <div className="tag-row">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      </section>
      {post.metadata && Object.keys(post.metadata).length > 0 && (
        <section className="source-card">
          <strong>补充信息</strong>
          {Object.entries(post.metadata).filter(([, value]) => value).map(([key, value]) => (
            <span key={key}>{key}：{value}</span>
          ))}
        </section>
      )}
      {Boolean(postImages.length) && (
        <section className="post-image-grid">
          {postImages.map((url) => <img key={url} src={url} alt={post.title} loading="lazy" />)}
        </section>
      )}
      <section className="detail-body">
        {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </section>
      <section className="source-card">
        <strong>信息来源说明</strong>
        <span>{post.source || '个人经验整理'} · {post.createdAt}</span>
      </section>
    </article>
  );
}

function SearchPage({ keyword, activeSchool, dynamicPosts }: { keyword: string; activeSchool: School; dynamicPosts: SharedPost[] }) {
  const courses = getCourses(activeSchool.id).filter((course) => courseMatches(course, keyword)).slice(0, 80);
  const posts = getVisibleSharedPosts(activeSchool.id, dynamicPosts).filter((post) => postMatches(post, keyword)).slice(0, 30);
  const legacyMatches = legacyPosts.filter((post) => {
    const token = normalize(keyword);
    return token && [post.title, post.summary, post.content.join(' ')].join(' ').toLowerCase().includes(token);
  }).length;

  return (
    <section className="page-panel">
      <button className="back-button" onClick={() => goBack('/')}>返回首页</button>
      <div className="page-title-block centered">
        <span className="eyebrow">搜索</span>
        <h1>{keyword ? `“${keyword}” 的结果` : '搜索内容'}</h1>
        <p>当前课程平台：{activeSchool.name}；生活内容按当前学校显示。原仓库匹配记录：{legacyMatches} 条。</p>
      </div>
      <SearchBox initialValue={keyword} />

      <section className="section">
        <div className="section-head"><h2>课程结果</h2><p>最多显示 80 条。</p></div>
        <div className="course-list compact">
          {courses.map((course) => (
            <button key={course.id} className="course-result" onClick={() => go(`/course/${encodeURIComponent(course.id)}`)}>
              <strong>{getCourseTitle(course)}</strong>
              <span>{course.programmeTitle} · {course.type}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>生活内容结果</h2><p>最多显示 30 条。</p></div>
        <PostGrid posts={posts} />
      </section>
    </section>
  );
}

function FavoritesPage({
  activeSchool,
  favoriteCourseIds,
  onToggleFavoriteCourse
}: {
  activeSchool: School;
  favoriteCourseIds: string[];
  onToggleFavoriteCourse: (id: string) => void;
}) {
  const schoolCourses = getCourses(activeSchool.id);
  const favoriteCourses = schoolCourses.filter((course) => favoriteCourseIds.includes(course.id));

  return (
    <section className="page-panel">
      <div className="page-title-block centered">
        <span className="eyebrow">本机保存</span>
        <h1>{activeSchool.shortName}我的收藏</h1>
        <p>收藏只保存在当前浏览器，并按学校独立保存。</p>
      </div>
      <div className="page-toolbar-actions">
        <button className="secondary-action" onClick={() => go('/courses')}>继续看课程</button>
      </div>

      {!favoriteCourses.length && (
        <div className="empty-state">
          <strong>暂无收藏课程</strong>
          <span>去课程库里收藏几门，之后可以在这里快速打开。</span>
        </div>
      )}

      <div className="course-list compact">
        {favoriteCourses.map((course) => (
          <article key={course.id} className="course-result with-action">
            <button onClick={() => go(`/course/${encodeURIComponent(course.id)}`)}>
              <strong>{getCourseTitle(course)}</strong>
              <span>{course.programmeTitle} · {formatCreditsText(course)}</span>
            </button>
            <button onClick={() => onToggleFavoriteCourse(course.id)}>取消收藏</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return minutes ? `${minutes} 分 ${rest} 秒` : `${rest} 秒`;
}

function buildAnalyticsSummary(events: AnalyticsEvent[]) {
  const pageViews = events.filter((event) => event.type === 'page_view');
  const leaves = events.filter((event) => event.type === 'page_leave');
  const totalDuration = leaves.reduce((sum, event) => sum + (event.durationSeconds || 0), 0);
  const bySchool = platformData.schools.map((school) => {
    const schoolViews = pageViews.filter((event) => event.schoolId === school.id);
    const schoolDuration = leaves
      .filter((event) => event.schoolId === school.id)
      .reduce((sum, event) => sum + (event.durationSeconds || 0), 0);
    return {
      school,
      views: schoolViews.length,
      duration: schoolDuration,
      average: schoolViews.length ? schoolDuration / schoolViews.length : 0
    };
  });
  const featureMap = new Map<string, { feature: string; views: number; duration: number }>();
  for (const view of pageViews) {
    const item = featureMap.get(view.feature) || { feature: view.feature, views: 0, duration: 0 };
    item.views += 1;
    featureMap.set(view.feature, item);
  }
  for (const leave of leaves) {
    const item = featureMap.get(leave.feature) || { feature: leave.feature, views: 0, duration: 0 };
    item.duration += leave.durationSeconds || 0;
    featureMap.set(leave.feature, item);
  }
  const features = Array.from(featureMap.values()).sort((a, b) => b.views - a.views || b.duration - a.duration);
  const roleCounts = {
    guest: pageViews.filter((event) => !event.userRole || event.userRole === 'guest').length,
    registered: pageViews.filter((event) => event.userRole === 'registered').length,
    admin: pageViews.filter((event) => event.userRole === 'admin').length
  };
  return {
    totalViews: pageViews.length,
    totalDuration,
    averageDuration: pageViews.length ? totalDuration / pageViews.length : 0,
    bySchool,
    features,
    roleCounts,
    recent: events.slice(-12).reverse()
  };
}

function analyticsToCsv(events: AnalyticsEvent[]) {
  const header = ['id', 'timestamp', 'type', 'schoolId', 'routeName', 'feature', 'userRole', 'username', 'targetId', 'durationSeconds', 'path'];
  const rows = events.map((event) => header.map((key) => {
    const value = String((event as unknown as Record<string, unknown>)[key] ?? '');
    return `"${value.replace(/"/g, '""')}"`;
  }).join(','));
  return [header.join(','), ...rows].join('\n');
}

function AdminPage({ activeSchool, onChooseSchool }: { activeSchool: School; onChooseSchool: (schoolId: SchoolId) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [entered, setEntered] = useStoredState('student-life-notes:admin-session', false);
  const [adminToken, setAdminToken] = useStoredState(ADMIN_TOKEN_STORAGE_KEY, '');
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>(() => readAnalyticsEvents());
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => readSupportTickets().slice().reverse());
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
  const [adminNotice, setAdminNotice] = useState('');
  const schoolCounts = platformData.schools.map((school) => ({
    school,
    programmes: getProgrammes(school.id).length,
    courses: getCourses(school.id).length
  }));
  const analytics = useMemo(() => buildAnalyticsSummary(analyticsEvents), [analyticsEvents]);
  const ticketStatusCounts = useMemo(() => ({
    pending: supportTickets.filter((ticket) => ticket.status === 'pending' || ticket.status === 'new').length,
    reviewing: supportTickets.filter((ticket) => ticket.status === 'reviewing').length,
    resolved: supportTickets.filter((ticket) => ticket.status === 'resolved').length,
    closed: supportTickets.filter((ticket) => ticket.status === 'closed').length
  }), [supportTickets]);
  const maxFeatureViews = Math.max(1, ...analytics.features.map((item) => item.views));
  const isLocalPreview = isLocalPreviewHost();
  const dataSourceLabel = API_BASE_URL && adminToken ? '服务端真实数据' : isLocalPreview ? '本地调试管理端' : '本机备用数据';
  const adminReady = entered && (!API_BASE_URL || Boolean(adminToken) || isLocalPreview);
  const refreshAnalytics = async () => {
    if (API_BASE_URL && adminToken) {
      try {
        const data = await apiRequest<{ analyticsEvents: AnalyticsEvent[]; supportTickets: SupportTicket[]; users: RegisteredUser[] }>('/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        setAnalyticsEvents(data.analyticsEvents || []);
        setSupportTickets(data.supportTickets || []);
        setRegisteredUsers(data.users || []);
        setAdminNotice('已刷新服务端数据');
        return;
      } catch (err) {
        setAdminNotice(err instanceof Error ? err.message : '服务端刷新失败');
      }
    }
    setAnalyticsEvents(readAnalyticsEvents());
    setSupportTickets(readSupportTickets().slice().reverse());
  };
  const exportAnalytics = (format: 'json' | 'csv') => {
    recordAnalyticsEvent({
      type: 'export',
      schoolId: activeSchool.id,
      routeName: 'admin',
      feature: `导出统计 ${format.toUpperCase()}`,
      userRole: 'admin',
      username: 'admin'
    });
    const events = readAnalyticsEvents();
    if (format === 'json') {
      downloadTextFile(`student-life-analytics-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(events, null, 2), 'application/json;charset=utf-8');
    } else {
      downloadTextFile(`student-life-analytics-${new Date().toISOString().slice(0, 10)}.csv`, analyticsToCsv(events), 'text/csv;charset=utf-8');
    }
    refreshAnalytics();
  };
  const clearAnalytics = () => {
    if (!confirm('确认清空当前浏览器里的备用统计事件？服务端真实数据不会被清空。')) return;
    writeAnalyticsEvents([]);
    setAnalyticsEvents([]);
  };
  const login = async () => {
    try {
      if (API_BASE_URL) {
        const data = await apiRequest<{ token: string }>('/api/admin/login', {
          method: 'POST',
          body: JSON.stringify({ username: username.trim(), password })
        });
        setAdminToken(data.token);
        setEntered(true);
        setLoginError('');
        setPassword('');
        return;
      }
      setLoginError('未配置后端地址时不能进入管理端。请先启动后端并配置 VITE_API_BASE_URL。');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : '账号或密码不正确');
    }
  };
  const updateTicket = async (ticketId: string, status: string, adminReply?: string) => {
    if (API_BASE_URL && adminToken) {
      const data = await apiRequest<{ ticket: SupportTicket }>(`/api/admin/tickets/${encodeURIComponent(ticketId)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status, adminReply })
      });
      setSupportTickets((tickets) => tickets.map((ticket) => ticket.id === ticketId ? data.ticket : ticket));
      setAdminNotice(`已更新工单状态：${statusLabel(data.ticket.status)}`);
      return;
    }
    const next = readSupportTickets().map((ticket) => ticket.id === ticketId ? { ...ticket, status, adminReply: adminReply ?? ticket.adminReply, updatedAt: new Date().toISOString() } : ticket);
    writeSupportTickets(next);
    setSupportTickets(next.slice().reverse());
    setAdminNotice(`已更新工单状态：${statusLabel(status)}`);
  };

  useEffect(() => {
    if (entered) void refreshAnalytics();
  }, [entered, adminToken]);

  useEffect(() => {
    if (!isLocalPreview || entered) return;
    setEntered(true);
    setLoginError('');
    setAdminNotice('已自动进入本地调试管理端。这里可先看 UI；服务端真实数据需要 Render 配置 ADMIN_ACCOUNTS_JSON 后登录。');
  }, [isLocalPreview, entered]);

  useEffect(() => {
    if (!adminReady) return;
    const timer = window.setInterval(() => void refreshAnalytics(), 8000);
    return () => window.clearInterval(timer);
  }, [adminReady, adminToken]);

  return (
    <section className="page-panel">
      <div className="page-title-block centered">
        <span className="eyebrow">管理视角</span>
        <h1>{APP_VERSION} 内容与统计工作台</h1>
        <p>{API_BASE_URL ? '已接入后端，管理端显示服务端注册、浏览统计和支持处理数据。' : '未配置后端地址，当前显示本机备用数据。'}</p>
      </div>
      <div className="page-toolbar-actions">
        <button className="secondary-action" onClick={() => go('/')}>用户视角</button>
      </div>

      {!adminReady && (
        <div className="login-panel admin-login-panel">
          <label>
            <span>管理员账号</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="输入管理员账号" autoComplete="username" />
          </label>
          <label>
            <span>管理员密码</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入强密码" type="password" autoComplete="current-password" onKeyDown={(event) => { if (event.key === 'Enter') login(); }} />
          </label>
          <button onClick={login}>进入管理端</button>
          {loginError && <p className="form-error">{loginError}</p>}
          <p className="login-note">{API_BASE_URL ? '请使用 Render 环境变量 ADMIN_ACCOUNTS_JSON 中配置的正式管理员账号。' : '配置 VITE_API_BASE_URL 后可启用服务端管理端。'}</p>
          {isLocalPreview && (
            <button
              className="secondary-action"
              onClick={() => {
                setEntered(true);
                setLoginError('');
                setAdminNotice('已进入本地调试管理端。这里可先看 UI；服务端真实数据需要 Render 配置 ADMIN_ACCOUNTS_JSON 后登录。');
              }}
            >
              本地调试入口
            </button>
          )}
        </div>
      )}

      {adminReady && (
        <>
          <div className="stats-grid">
            <div><strong>{platformData.schools.length}</strong><span>学校平台</span></div>
            <div><strong>{platformData.programmes.length}</strong><span>项目</span></div>
            <div><strong>{platformData.courses.length}</strong><span>课程</span></div>
            <div><strong>{platformData.sharedPosts.length}</strong><span>生活内容</span></div>
          </div>
          <section className="analytics-panel">
            <div className="analytics-head">
              <div>
                <span className="eyebrow">浏览统计</span>
                <h2>{dataSourceLabel}</h2>
                <p>记录页面浏览、学校切换、收藏和导出操作。当前事件数：{analyticsEvents.length}；注册用户：{registeredUsers.length}</p>
                {adminNotice && <p>{adminNotice}</p>}
              </div>
              <div className="analytics-actions">
                <button className="secondary-action" onClick={refreshAnalytics}>刷新</button>
                <button className="secondary-action" onClick={() => exportAnalytics('json')}>导出 JSON</button>
                <button className="secondary-action" onClick={() => exportAnalytics('csv')}>导出 CSV</button>
                <button className="secondary-action danger" onClick={clearAnalytics}>清空本机统计</button>
              </div>
            </div>
            <div className="stats-grid analytics-stats">
              <div><strong>{analytics.totalViews}</strong><span>总浏览量</span></div>
              <div><strong>{analytics.roleCounts.guest}</strong><span>游客浏览</span></div>
              <div><strong>{analytics.roleCounts.registered}</strong><span>注册用户浏览</span></div>
              <div><strong>{analytics.roleCounts.admin}</strong><span>管理员浏览</span></div>
              <div><strong>{formatDuration(analytics.totalDuration)}</strong><span>总停留时间</span></div>
              <div><strong>{formatDuration(analytics.averageDuration)}</strong><span>平均停留</span></div>
              <div><strong>{analytics.features.length}</strong><span>打开过的功能</span></div>
            </div>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>学校浏览量与停留</h3>
                {analytics.bySchool.map((item) => (
                  <div className="school-analytics-row" key={item.school.id}>
                    <strong>{item.school.name}</strong>
                    <span>{item.views} 次浏览 · {formatDuration(item.duration)} · 平均 {formatDuration(item.average)}</span>
                  </div>
                ))}
              </div>
              <div className="analytics-card">
                <h3>功能打开排行</h3>
                {analytics.features.slice(0, 8).map((item) => (
                  <div className="feature-bar-row" key={item.feature}>
                    <div><strong>{item.feature}</strong><span>{item.views} 次 · {formatDuration(item.duration)}</span></div>
                    <i style={{ width: `${Math.max(8, Math.round((item.views / maxFeatureViews) * 100))}%` }}></i>
                  </div>
                ))}
              </div>
            </div>
            <div className="analytics-card">
              <h3>最近事件</h3>
              <div className="event-table">
                <div><strong>时间</strong><strong>类型</strong><strong>身份</strong><strong>学校</strong><strong>功能</strong><strong>停留</strong></div>
                {analytics.recent.map((event) => (
                  <div key={event.id}>
                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                    <span>{event.type}</span>
                    <span>{event.userRole === 'admin' ? '管理员' : event.userRole === 'registered' ? '注册用户' : '游客'}</span>
                    <span>{event.schoolId.toUpperCase()}</span>
                    <span>{event.feature}</span>
                    <span>{event.durationSeconds ? formatDuration(event.durationSeconds) : '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="analytics-panel">
            <div className="analytics-head">
              <div>
                <span className="eyebrow">支持处理</span>
                <h2>投稿与建议</h2>
                <p>用户提交时必须填写联系方式，推荐邮箱，也可以填写微信、电话或其他方式。</p>
              </div>
              <button className="secondary-action" onClick={() => void refreshAnalytics()}>刷新工单</button>
            </div>
            <div className="stats-grid ticket-stats">
              <div><strong>{ticketStatusCounts.pending}</strong><span>待处理</span></div>
              <div><strong>{ticketStatusCounts.reviewing}</strong><span>处理中</span></div>
              <div><strong>{ticketStatusCounts.resolved}</strong><span>已处理</span></div>
              <div><strong>{ticketStatusCounts.closed}</strong><span>已关闭</span></div>
            </div>
            <div className="ticket-list">
              {supportTickets.length === 0 && <div className="empty-state"><strong>暂无投稿或建议</strong><span>用户提交后会显示在这里。</span></div>}
              {supportTickets.map((ticket) => (
                <article className="ticket-card" key={ticket.id}>
                  <div>
                    <strong>{ticket.type} · {statusLabel(ticket.status)}</strong>
                    <span>{ticket.username || '匿名用户'} · {ticket.schoolId || '未选择学校'} · {new Date(ticket.createdAt).toLocaleString()}</span>
                  </div>
                  <p>{ticket.message}</p>
                  <small>联系方式：{ticket.contact}</small>
                  {ticket.adminReply && <blockquote>{ticket.adminReply}</blockquote>}
                  <textarea
                    value={ticketReplies[ticket.id] ?? ticket.adminReply ?? ''}
                    onChange={(event) => setTicketReplies((drafts) => ({ ...drafts, [ticket.id]: event.target.value }))}
                    placeholder="写给用户的站内回复"
                    rows={3}
                  ></textarea>
                  <div className="inline-actions">
                    <button onClick={() => void updateTicket(ticket.id, 'pending', ticketReplies[ticket.id])}>待处理</button>
                    <button onClick={() => void updateTicket(ticket.id, 'reviewing', ticketReplies[ticket.id])}>处理中</button>
                    <button onClick={() => void updateTicket(ticket.id, 'resolved', ticketReplies[ticket.id])}>已处理并回复</button>
                    <button onClick={() => void updateTicket(ticket.id, 'closed', ticketReplies[ticket.id])}>关闭</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <SchoolPanel activeSchool={activeSchool} onChooseSchool={onChooseSchool} />
          <div className="programme-grid">
            {schoolCounts.map((item) => (
              <button key={item.school.id} className="programme-card" onClick={() => onChooseSchool(item.school.id)}>
                <strong>{item.school.name}</strong>
                <span>{item.programmes} 个项目 · {item.courses} 门课程</span>
                <small>{item.school.description}</small>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function AboutPage() {
  return (
    <section className="about-page">
      <button className="back-button" onClick={() => goBack('/')}>返回首页</button>
      <div className="page-title-block centered">
        <span className="eyebrow">{APP_VERSION} 总结</span>
        <h1>{APP_NAME} 网页版</h1>
        <p>由原微信小程序原型转换为 Vite + React + GitHub Pages 版本。</p>
      </div>
      <div className="about-card">
        <p>{DISCLAIMER}</p>
        <p>{APP_VERSION} 支持香港教育大学与岭南大学两个平台。课程库和收藏按学校独立；生活类内容按当前学校过滤显示。</p>
        <p>当前数据：{platformData.schools.length} 个学校、{platformData.programmes.length} 个项目、{platformData.courses.length} 条课程、{platformData.sharedPosts.length} 条生活内容。</p>
        <button className="secondary-action" onClick={() => go('/policy')}>查看隐私与学术诚信说明</button>
      </div>
    </section>
  );
}

function PolicyPage() {
  const policyItems = [
    ['隐私政策', '本工具当前要求邮箱注册或登录后查看课程、收藏和生活内容；注册只保存邮箱、用户名、学校和加密后的密码，不要求学号、证件号码或定位信息。'],
    ['公开资料边界', '课程名称、项目要求、学分、开课学期、先修要求和来源链接来自公开网页或学生整理资料；所有重要选课决定必须回到学校官网、handbook、课程系统或项目办公室通知核对。'],
    ['避免学术不端', '本工具只能帮助查找、对照和整理课程信息。不得用于代写作业、生成可直接提交的作业、伪造成绩、规避考核、冒充学校通知，或帮助任何违反学术诚信的行为。'],
    ['非官方说明', '本网站不使用学校官方 logo，不声称获得香港教育大学、岭南大学或任何机构授权、认可或背书。页面颜色和名称仅用于区分信息来源。']
  ];

  return (
    <section className="policy-page">
      <button className="back-button" onClick={() => goBack('/')}>返回</button>
      <div className="page-title-block centered">
        <span className="eyebrow">Privacy & Academic Integrity</span>
        <h1>隐私政策与学术诚信说明</h1>
        <p>这份说明适用于当前 {APP_VERSION} 本地静态版本，也可作为接入云开发或 CMS 时的基础规则。</p>
      </div>
      <div className="policy-grid">
        {policyItems.map(([title, text]) => (
          <article className="policy-card" key={title}>
            <strong>{title}</strong>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SupportPanel({ user, activeSchool }: { user: RegisteredUser; activeSchool: School }) {
  const [type, setType] = useState('联系作者');
  const [contact, setContact] = useState(user.email || '');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const isLocalDebugUser = user.id === 'local-debug-user';
  const mailboxCounts = useMemo(() => ({
    pending: tickets.filter((ticket) => ticket.status === 'pending' || ticket.status === 'new').length,
    reviewing: tickets.filter((ticket) => ticket.status === 'reviewing').length,
    resolved: tickets.filter((ticket) => ticket.status === 'resolved').length
  }), [tickets]);

  useEffect(() => {
    if (user.email && !contact) setContact(user.email);
  }, [contact, user.email]);

  const lookupMailbox = async (lookupContact = contact) => {
    const email = lookupContact.trim().toLowerCase();
    setError('');
    setNotice('');
    if (!isValidEmailShape(email)) {
      setError('查看信箱需要填写邮箱。微信或其他联系方式可以提交留言，但无法自动查看回执。');
      return;
    }
    setLoading(true);
    try {
      if (isLocalDebugUser) {
        const list = readSupportTickets().filter((ticket) => ticket.contact.toLowerCase() === email || ticket.userId === user.id).slice().reverse();
        setTickets(list);
        setNotice(list.length ? `已找到 ${list.length} 条本地调试回执。` : '本地调试模式：暂时没有回执记录。');
        return;
      }
      const list = await fetchMailbox({ ...user, email });
      setTickets(list);
      setNotice(list.length ? `已找到 ${list.length} 条回执记录。` : '暂时没有回执记录。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '信箱读取失败');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    const trimmedContact = contact.trim();
    const normalizedContact = isValidEmailShape(trimmedContact) ? trimmedContact.toLowerCase() : trimmedContact;
    const trimmedMessage = message.trim();
    setError('');
    setNotice('');
    if (trimmedContact.length < 2) {
      setError('请填写邮箱或其他联系方式。');
      return;
    }
    if (trimmedMessage.length < 5) {
      setError('内容至少写 5 个字，方便作者判断要处理什么。');
      return;
    }
    setLoading(true);
    try {
      const ticket = isLocalDebugUser ? (() => {
        const localTicket: SupportTicket = {
          id: `local-ticket-${Date.now()}`,
          userId: user.id,
          username: user.username,
          schoolId: activeSchool.id,
          type,
          contact: normalizedContact,
          message: trimmedMessage,
          status: 'pending',
          adminReply: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        writeSupportTickets(readSupportTickets().concat(localTicket));
        return localTicket;
      })() : await submitSupportTicket({
        userId: user.id === 'guest-browser' ? '' : user.id,
        username: user.username,
        schoolId: activeSchool.id,
        type,
        contact: normalizedContact,
        message: trimmedMessage
      });
      setMessage('');
      setContact(normalizedContact);
      setNotice(isLocalDebugUser ? '已写入本地调试工单。管理端本地调试界面可以看到。' : '已提交给作者。管理端会收到这条记录；管理员处理后，你可以在右侧站内信箱查看状态和回复。');
      if (isValidEmailShape(normalizedContact)) {
        await lookupMailbox(normalizedContact);
      } else {
        setTickets((items) => [ticket, ...items]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLocalDebugUser) {
      setNotice('本地调试模式：信箱使用浏览器本机数据，不请求线上 Render。');
      setTickets(readSupportTickets().filter((ticket) => ticket.userId === user.id || ticket.contact.toLowerCase() === user.email.toLowerCase()).slice().reverse());
      return;
    }
    if (user.email) void lookupMailbox(user.email);
  }, [isLocalDebugUser, user.email]);

  useEffect(() => {
    if (!user.email || isLocalDebugUser) return;
    const timer = window.setInterval(() => void lookupMailbox(user.email), 15000);
    return () => window.clearInterval(timer);
  }, [isLocalDebugUser, user.email]);

  return (
    <section className="support-panel">
      <div>
        <span className="eyebrow">Contact</span>
        <h2>联系作者信箱</h2>
        <p>{BETA_NOTICE}</p>
      </div>
      <div className="support-disabled-note">
        <strong>{schoolAbbreviation(activeSchool)} 私信反馈</strong>
        <span>这里用于纠错、补充资料和联系作者；提交后进入管理端待处理列表，不会公开显示。管理员回复后会同步到右侧站内信箱。</span>
      </div>
      <div className="support-workspace">
        <div className="support-form">
          <label>
            <span>类型</span>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="联系作者">联系作者</option>
              <option value="内容纠错">内容纠错</option>
              <option value="资料补充">资料补充</option>
              <option value="使用问题">使用问题</option>
            </select>
          </label>
          <label>
            <span>联系方式</span>
            <input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="推荐邮箱，方便查看回执" type="text" />
          </label>
          <label className="wide">
            <span>内容</span>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="写清楚页面、学校、项目或具体问题。" rows={4}></textarea>
          </label>
          <button className="primary-action" onClick={submit} disabled={loading}>{loading ? '处理中' : '发送给作者'}</button>
          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-success">{notice}</p>}
        </div>
        <div className="mailbox-panel">
          <div className="section-head compact">
            <div>
              <span className="eyebrow">Mailbox</span>
              <h3>站内信箱</h3>
            </div>
            <button className="secondary-action" onClick={() => void lookupMailbox()} disabled={loading}>刷新</button>
          </div>
          <div className="mailbox-status-row">
            <span>待处理 {mailboxCounts.pending}</span>
            <span>处理中 {mailboxCounts.reviewing}</span>
            <span>已处理 {mailboxCounts.resolved}</span>
          </div>
          {tickets.length === 0 && <div className="empty-state"><strong>暂无回执</strong><span>填写邮箱提交后，可以在这里查看处理状态。</span></div>}
          {tickets.map((ticket) => (
            <article className="mailbox-card" key={ticket.id}>
              <strong>{ticket.type} · {statusLabel(ticket.status)}</strong>
              <span>{ticket.schoolId || activeSchool.id} · {new Date(ticket.createdAt).toLocaleString()}</span>
              <p>{ticket.message}</p>
              {ticket.adminReply && <blockquote>{ticket.adminReply}</blockquote>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmptyPage({ title }: { title: string }) {
  return (
    <section className="page-panel">
      <button className="back-button" onClick={() => goBack('/')}>返回首页</button>
      <div className="empty-state"><strong>{title}</strong><span>可能是链接已经变化。</span></div>
    </section>
  );
}

export default function App() {
  const { route, key: routeKey, scrollMode } = useRoute();
  const [hasAcceptedAgreement, setHasAcceptedAgreement] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [activeSchoolId, setActiveSchoolId] = useStoredState<SchoolId>('student-life-notes:active-school', 'eduhk');
  const [currentUser, setCurrentUser] = useStoredState<RegisteredUser | null>(USER_STORAGE_KEY, null);
  const [adminToken, setAdminToken] = useStoredState(ADMIN_TOKEN_STORAGE_KEY, '');
  const [adminSession, setAdminSession] = useStoredState('student-life-notes:admin-session', false);
  const [dynamicPosts, setDynamicPosts] = useState<SharedPost[]>(() => readLocalDynamicPosts());
  const activeSchool = getSchool(activeSchoolId);
  const isAdminAuthenticated = Boolean(adminToken || adminSession);
  const effectiveUser = useMemo<RegisteredUser>(() => currentUser || {
    id: isAdminAuthenticated ? 'admin-browser' : 'guest-browser',
    email: '',
    username: isAdminAuthenticated ? '管理员' : '访客',
    schoolId: activeSchoolId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, [activeSchoolId, currentUser, isAdminAuthenticated]);
  const [favoriteCourseIds, setFavoriteCourseIds] = useStoredState<string[]>(getStorageKey('favorite-courses', activeSchoolId), []);
  const userRole: AnalyticsEvent['userRole'] = isAdminAuthenticated ? 'admin' : currentUser ? 'registered' : 'guest';
  const isPublicRoute = route.name === 'register' || route.name === 'login' || route.name === 'admin' || route.name === 'about' || route.name === 'policy';
  const shouldBlockForAuth = !currentUser && !isAdminAuthenticated && !isPublicRoute;
  const shouldBypassAgreementForLocalAdmin = route.name === 'admin' && isLocalPreviewHost();
  const shouldUseLocalDebugUser = isLocalPreviewHost() && route.name !== 'admin';
  const shouldBypassAgreementForLocalUser = shouldUseLocalDebugUser && route.name !== 'register' && route.name !== 'login';

  const updateDynamicPosts = (posts: SharedPost[]) => {
    setDynamicPosts(posts);
    writeLocalDynamicPosts(posts);
  };

  useLayoutEffect(() => {
    if (!hasAcceptedAgreement) return;
    const top = scrollMode === 'restore' ? getSavedScrollPosition(routeKey) : 0;
    window.scrollTo({ top, left: 0, behavior: 'auto' });
  }, [hasAcceptedAgreement, routeKey, scrollMode]);

  useEffect(() => {
    try {
      setFavoriteCourseIds(JSON.parse(localStorage.getItem(getStorageKey('favorite-courses', activeSchoolId)) || '[]'));
    } catch {
      setFavoriteCourseIds([]);
    }
  }, [activeSchoolId]);

  useEffect(() => {
    if (route.name === 'home') clearTransientFilters();
  }, [route.name]);

  useEffect(() => {
    if (!shouldUseLocalDebugUser || currentUser || route.name === 'register' || route.name === 'login') return;
    setCurrentUser({
      id: 'local-debug-user',
      email: 'debug-user@example.com',
      username: '本地调试用户',
      schoolId: activeSchoolId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }, [activeSchoolId, currentUser, route.name, shouldUseLocalDebugUser]);

  useEffect(() => {
    void fetchDynamicPosts(adminToken)
      .then(updateDynamicPosts)
      .catch(() => {
        // Keep local fallback content when the API is unavailable.
      });
  }, [adminToken]);

  useEffect(() => {
    if (!hasAcceptedAgreement) return;
    const startedAt = Date.now();
    const feature = routeFeature(route);
    const targetId = routeTarget(route);
    recordAnalyticsEvent({
      type: 'page_view',
      schoolId: activeSchoolId,
      routeName: route.name,
      feature,
      targetId,
      path: routeKey,
      userId: effectiveUser.id,
      username: effectiveUser.username,
      userRole
    });
    return () => {
      const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      recordAnalyticsEvent({
        type: 'page_leave',
        schoolId: activeSchoolId,
        routeName: route.name,
        feature,
        targetId,
        durationSeconds,
        path: routeKey,
        userId: effectiveUser.id,
        username: effectiveUser.username,
        userRole
      });
    };
  }, [activeSchoolId, effectiveUser.id, effectiveUser.username, hasAcceptedAgreement, route, routeKey, userRole]);

  const chooseSchool = (schoolId: SchoolId) => {
    recordAnalyticsEvent({
      type: 'school_switch',
      schoolId,
      routeName: route.name,
      feature: '学校切换',
      targetId: schoolId,
      userId: effectiveUser.id,
      username: effectiveUser.username,
      userRole
    });
    setActiveSchoolId(schoolId);
    if (currentUser) setCurrentUser({ ...currentUser, schoolId, updatedAt: new Date().toISOString() });
    if (route.name === 'course') go('/courses');
  };

  const toggleFavoriteCourse = (id: string) => {
    const next = favoriteCourseIds.includes(id) ? favoriteCourseIds.filter((item) => item !== id) : favoriteCourseIds.concat(id);
    recordAnalyticsEvent({
      type: 'favorite_toggle',
      schoolId: activeSchoolId,
      routeName: route.name,
      feature: favoriteCourseIds.includes(id) ? '取消收藏' : '收藏课程',
      targetId: id,
      userId: effectiveUser.id,
      username: effectiveUser.username,
      userRole
    });
    setFavoriteCourseIds(next);
    localStorage.setItem(getStorageKey('favorite-courses', activeSchoolId), JSON.stringify(next));
  };

  if (!hasAcceptedAgreement && !shouldBypassAgreementForLocalAdmin && !shouldBypassAgreementForLocalUser) {
    return (
      <div className="app-shell landing-mode">
        <LandingPage
          accepted={agreementChecked}
          onAcceptedChange={setAgreementChecked}
          onEnter={() => {
            if (!agreementChecked) return;
            setHasAcceptedAgreement(true);
            go(currentUser || isAdminAuthenticated ? '/' : '/register');
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header
        activeSchool={activeSchool}
        onChooseSchool={chooseSchool}
        isAdmin={userRole === 'admin'}
        onAdminLogout={() => {
          setAdminToken('');
          setAdminSession(false);
          if (route.name === 'admin') go('/');
        }}
      />
      <section className="beta-banner">
        <strong>内测版本</strong>
        <span>{BETA_NOTICE}</span>
      </section>
      <main>
        {shouldBlockForAuth && <AuthRequiredPage activeSchool={activeSchool} />}
        {!shouldBlockForAuth && route.name === 'home' && <HomePage activeSchool={activeSchool} onChooseSchool={chooseSchool} dynamicPosts={dynamicPosts} />}
        {!shouldBlockForAuth && route.name === 'courses' && (
          <CoursesPage
            activeSchool={activeSchool}
            favoriteCourseIds={favoriteCourseIds}
            onToggleFavoriteCourse={toggleFavoriteCourse}
          />
        )}
        {!shouldBlockForAuth && route.name === 'course' && (
          <CourseDetailPage
            id={route.id}
            favoriteCourseIds={favoriteCourseIds}
            onToggleFavoriteCourse={toggleFavoriteCourse}
          />
        )}
        {!shouldBlockForAuth && route.name === 'section' && (
          <SectionPage
            sectionId={route.id}
            activeSchool={activeSchool}
            dynamicPosts={dynamicPosts}
            onDynamicPostsChange={updateDynamicPosts}
          />
        )}
        {!shouldBlockForAuth && route.name === 'post' && (
          <PostDetailPage
            id={route.id}
            activeSchool={activeSchool}
            dynamicPosts={dynamicPosts}
            onDynamicPostsChange={updateDynamicPosts}
          />
        )}
        {!shouldBlockForAuth && route.name === 'search' && <SearchPage keyword={route.keyword} activeSchool={activeSchool} dynamicPosts={dynamicPosts} />}
        {route.name === 'register' && (
          <RegistrationPage
            activeSchoolId={activeSchoolId}
            onRegistered={(user) => {
              setCurrentUser(user);
              setActiveSchoolId(user.schoolId);
              go('/');
            }}
          />
        )}
        {route.name === 'login' && (
          <LoginPage
            onLoggedIn={(user) => {
              setCurrentUser(user);
              setActiveSchoolId(user.schoolId);
              go('/');
            }}
          />
        )}
        {!shouldBlockForAuth && route.name === 'favorites' && (
          <FavoritesPage
            activeSchool={activeSchool}
            favoriteCourseIds={favoriteCourseIds}
            onToggleFavoriteCourse={toggleFavoriteCourse}
          />
        )}
        {route.name === 'admin' && <AdminPage activeSchool={activeSchool} onChooseSchool={chooseSchool} />}
        {route.name === 'about' && <AboutPage />}
        {route.name === 'policy' && <PolicyPage />}
      </main>
      {currentUser && route.name !== 'admin' && <SupportPanel user={effectiveUser} activeSchool={activeSchool} />}
      <footer>
        <span>{APP_NAME} {APP_VERSION}</span>
        <span>{DISCLAIMER}</span>
      </footer>
    </div>
  );
}
