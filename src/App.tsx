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
  School,
  SchoolId,
  SharedPost
} from './types';

const DISCLAIMER = '本网站为个人/学生自发整理的信息工具，内容仅供参考，不代表任何学校或机构官方立场。';
const APP_NAME = 'Otter';
const APP_VERSION = 'v1.12';
const APP_BASE_URL = (import.meta as unknown as { env?: Record<string, string> }).env?.BASE_URL || '/';
const APP_LOGO_SRC = `${APP_BASE_URL}images/otter-avatar.png`;
const ADMIN_USERNAME = 'nanzhuyin-admin';
const ADMIN_PASSWORD_HASH = 'b9b766c518d863ccc5d940e87b0845eeddb95eb67cd96b6a4a3ff1d7092e5b5b';
const DEFAULT_ADMIN_ACCOUNTS = [
  { username: 'otter-admin', passwordHash: 'aee6f0ecf531724f671db225e30f91d3cf21e89bb0ab639431ad237e9174caa3', role: 'owner' },
  { username: 'content-reviewer', passwordHash: '389ebe877a1ed402f4cf8e6efd08d8f0dae2a3153ef2e57136f5ac1a591dcf42', role: 'editor' },
  { username: 'support-desk', passwordHash: '2639c55742f526036b0ecc605e00b6fad2df03b81cdfbd72cdf3ec3f0c6aaba8', role: 'support' }
];
const FILTER_STORAGE_PREFIX = 'student-life-notes:filters:';
const SCROLL_STORAGE_PREFIX = 'student-life-notes:scroll:';
const ANALYTICS_STORAGE_KEY = 'student-life-notes:analytics-events';
const ANALYTICS_SESSION_KEY = 'student-life-notes:analytics-session';
const USER_STORAGE_KEY = 'student-life-notes:user';
const SUPPORT_STORAGE_KEY = 'student-life-notes:support-tickets';
const ADMIN_TOKEN_STORAGE_KEY = 'student-life-notes:admin-token';
const API_BASE_URL = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
const platformData = platformDataJson as PlatformData;
const legacyPosts = postsData as NotePost[];

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

function writeSupportTickets(tickets: SupportTicket[]) {
  try {
    localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify(tickets.slice(-500)));
  } catch {
    // Local fallback only; ignore storage failures.
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
  if (!API_BASE_URL) {
    return {
      id: `local-user-${Date.now()}`,
      email: input.email,
      username: input.username,
      schoolId: input.schoolId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  const data = await apiRequest<{ user: RegisteredUser }>('/api/register', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  return data.user;
}

async function fetchMailbox(user: RegisteredUser) {
  if (!API_BASE_URL) {
    return readSupportTickets()
      .filter((ticket) => ticket.userId === user.id || ticket.contact.toLowerCase() === user.email.toLowerCase())
      .slice()
      .reverse();
  }
  const params = new URLSearchParams({ userId: user.id, email: user.email });
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

function routeFeature(route: Route) {
  if (route.name === 'home') return '首页';
  if (route.name === 'courses') return '课程库';
  if (route.name === 'course') return '课程详情';
  if (route.name === 'section') return '生活分区';
  if (route.name === 'post') return '生活内容详情';
  if (route.name === 'search') return '搜索';
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

function getSharedPostText(post: SharedPost) {
  return [post.id, post.title, post.summary || '', post.content, post.region || '', post.tags.join(' ')]
    .join(' ')
    .toLowerCase();
}

function isEduhkSharedPost(post: SharedPost) {
  const text = getSharedPostText(post);
  return text.includes('eduhk') || text.includes('aiep') || text.includes('教育大学') || text.includes('教大');
}

function getVisibleSharedPosts(schoolId: SchoolId) {
  return platformData.sharedPosts.filter((post) => (schoolId === 'eduhk' ? isEduhkSharedPost(post) : !isEduhkSharedPost(post)));
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
  onChooseSchool
}: {
  activeSchool: School;
  onChooseSchool: (schoolId: SchoolId) => void;
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
        <button onClick={() => go('/policy')}>隐私与诚信</button>
        <button onClick={() => go('/admin')}>管理视角</button>
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
              <strong>使用边界</strong>
              <span>非官方、非注册制、本机保存收藏；课程决策最终以学校官网、handbook 和项目办公室通知为准。</span>
            </div>
          </div>
        </div>

        <div className="landing-overlay agreement-panel">
          <span className="landing-kicker">进入前确认</span>
          <h1>隐私政策与学术诚信</h1>
          <p>
            你现在可以不注册、不登录，直接进入查看。进入前请确认你理解：本工具是非官方学生信息整理工具，
            不代表任何学校，不替代官网、handbook、programme office 或课程系统的最新说明。
          </p>

          <div className="agreement-list">
            <div>
              <strong>隐私政策</strong>
              <p>{APP_VERSION} 使用邮箱、用户名和学校创建浏览身份，不发送验证码；建议和投稿会提交到管理端处理。</p>
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
            确认进入
          </button>

        </div>

        {confirmOpen && (
          <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className="confirm-dialog">
              <span className="landing-kicker">确认操作</span>
              <h2 id="confirm-title">{accepted ? '是否确认进入？' : '请先勾选协议'}</h2>
              <p>
                {accepted
                  ? '请确认你已经阅读并同意隐私与学术诚信协议，理解本工具仅供参考，不代表任何学校官方立场。'
                  : '进入前需要先勾选“我已阅读并同意以上隐私与学术诚信协议”。'}
              </p>
              <div className="confirm-actions">
                <button className="secondary-action" onClick={() => setConfirmOpen(false)}>
                  {accepted ? '再看看' : '我知道了'}
                </button>
                {accepted && (
                  <button className="primary-action" onClick={onEnter}>
                    确认进入
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
          <div>
            <h1>创建你的 Otter 账号</h1>
            <p>使用真实邮箱、用户名和自设密码登录；不发送验证码。</p>
          </div>
        </div>
        <div className="registration-form">
          <label>
            <span>邮箱</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="推荐填写常用邮箱" type="email" autoComplete="email" />
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
          <button className="primary-action" onClick={submit} disabled={saving}>{saving ? '保存中' : '进入 Otter'}</button>
          {error && <p className="form-error">{error}</p>}
          <p className="login-note">邮箱不会发送验证码；后端会检查邮箱域名是否真实可用。已有邮箱再次进入时需要密码正确。</p>
        </div>
      </section>
    </main>
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

function HomePage({ activeSchool, onChooseSchool }: { activeSchool: School; onChooseSchool: (schoolId: SchoolId) => void }) {
  const programmes = getProgrammes(activeSchool.id);
  const courses = getCourses(activeSchool.id);
  const visibleSharedPosts = getVisibleSharedPosts(activeSchool.id);
  const recommended = visibleSharedPosts.filter((post) => post.recommended).slice(0, 4);

  return (
    <>
      <section className={`hero school-hero ${activeSchool.id}`}>
        <div className="hero-copy">
          <span className="eyebrow">{APP_VERSION} · {schoolAbbreviation(activeSchool)} · {activeSchool.name}</span>
          <h1>{activeSchool.id === 'eduhk' ? '教大课程按官方单位归类' : '岭南课程加入中文参考名'}</h1>
          <p>{activeSchool.description} 课程、收藏和生活内容都跟随当前学校切换，减少误看别校信息。</p>
          <SearchBox />
          <div className="hero-stats">
            <span><strong>{platformData.schools.length}</strong> 学校</span>
            <span><strong>{programmes.length}</strong> 当前学校项目</span>
            <span><strong>{courses.length}</strong> 当前学校课程</span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="visual-map">
            <span>{activeSchool.id === 'eduhk' ? 'FEHD / FHM / FLASS' : '文科 / 商科 / 社科'}</span>
            <span>{activeSchool.id === 'eduhk' ? 'Academies / Centres' : '数据科学 / 跨学科'}</span>
            <span>{visibleSharedPosts.length} 条生活内容</span>
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
          {programmes.slice(0, 4).map((programme) => (
            <button key={programme.id} className="programme-card" onClick={() => go(`/courses?programme=${encodeURIComponent(programme.id)}`)}>
              <strong>{programme.schoolId === 'eduhk' ? `${programme.medium} · ${getProgrammeTitle(programme)}` : getProgrammeTitle(programme)}</strong>
              {getProgrammeSubtitle(programme) && <em>{getProgrammeSubtitle(programme)}</em>}
              <span>{programme.totalCredits ? `${programme.totalCredits} 学分` : `${programme.courseCount || 0} 门课程`}</span>
              <small>{programme.schoolId === 'eduhk' ? getUnitText(programme) : `${formatFacultyName(programme.faculty)} · 中文参考译名`}</small>
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
  const courseFilterKey = `${FILTER_STORAGE_PREFIX}courses:${activeSchool.id}`;
  const defaultCourseFilters = useMemo<CourseFilterState>(
    () => ({
      programmeId: routeProgramme || programmes[0]?.id || '',
      levelFilter: 'all',
      facultyFilter: 'all',
      typeKey: 'all',
      keyword: ''
    }),
    [programmes, routeProgramme]
  );
  const [filters, setFilters] = useState<CourseFilterState>(() => defaultCourseFilters);

  useEffect(() => {
    const next = getStoredObject(courseFilterKey, defaultCourseFilters);
    const resolved = routeProgramme ? { ...next, programmeId: routeProgramme } : next;
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
      programmes.filter((programme) => {
        const matchesLevel =
          levelFilter === 'all' ||
          programme.studyModes.includes(levelFilter) ||
          (!programme.studyModes.length && levelFilter === '以项目说明为准');
        const matchesFaculty = facultyFilter === 'all' || programme.faculty === facultyFilter;
        return matchesLevel && matchesFaculty;
      }),
    [facultyFilter, levelFilter, programmes]
  );

  useEffect(() => {
    if (!programmeOptions.length) {
      updateCourseFilters({ programmeId: '' });
      return;
    }
    if (!programmeOptions.some((programme) => programme.id === programmeId)) {
      updateCourseFilters({ programmeId: programmeOptions[0].id });
    }
  }, [programmeId, programmeOptions]);

  const activeProgramme = programmeOptions.find((programme) => programme.id === programmeId) || programmeOptions[0];
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
              {programmeOptions.map((programme) => (
                <option key={programme.id} value={programme.id}>{getProgrammeTitle(programme)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>关键词</span>
            <input value={keyword} onChange={(event) => updateCourseFilters({ keyword: event.target.value })} placeholder="搜索课程名、代码、标签" />
          </label>
        </div>
      </div>

      {activeProgramme && (
        <section className="programme-summary">
          <strong>{getProgrammeTitle(activeProgramme)}</strong>
          {getProgrammeSubtitle(activeProgramme) && <em>{getProgrammeSubtitle(activeProgramme)}</em>}
          <p>{activeProgramme.mediumDetail}</p>
          <div className="tag-row">
            <span>{getUnitText(activeProgramme)}</span>
            <span>{activeProgramme.studyModes.join(' / ') || '以项目说明为准'}</span>
            <span>{activeProgramme.totalCredits ? `${activeProgramme.totalCredits} 学分` : `${activeProgramme.courseCount || courses.length} 门课程`}</span>
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
            {activeProgramme
              ? `当前项目共显示 ${courses.length} 门课程${keyword || typeKey !== 'all' ? '，已按关键词或课程类型筛选。' : '。'}`
              : '请先选择一个项目。'}
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
          <strong>当前筛选下暂无课程</strong>
          <span>本科项目有课程数据。请清除课程类型或关键词后再看。</span>
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
                <span>{course.medium}</span>
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
          <span>{course.medium}</span>
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

function PostGrid({ posts }: { posts: SharedPost[] }) {
  if (!posts.length) return <div className="empty-state"><strong>暂无内容</strong><span>当前筛选下没有可显示内容。</span></div>;

  return (
    <div className="post-grid">
      {posts.map((post) => (
        <article key={post.id} className="post-card">
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
        </article>
      ))}
    </div>
  );
}

function SectionPage({ sectionId, activeSchool }: { sectionId: string; activeSchool: School }) {
  const category = categoryBySectionId[sectionId];
  const meta = sectionCategories.find((item) => item.key === category);
  const posts = useMemo(
    () => getVisibleSharedPosts(activeSchool.id).filter((post) => post.sectionId === sectionId && post.status === 'published'),
    [activeSchool.id, sectionId]
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

      <PostGrid posts={filteredPosts} />
    </section>
  );
}

function PostDetailPage({ id, activeSchool }: { id: string; activeSchool: School }) {
  const post = getVisibleSharedPosts(activeSchool.id).find((item) => item.id === id);
  if (!post) return <EmptyPage title="没有找到这篇内容" />;
  const paragraphs = post.content.split('\n').filter(Boolean);

  return (
    <article className="detail-page">
      <button className="back-button" onClick={() => goBack(`/section/${post.sectionId}`)}>返回分区</button>
      <section className="detail-head">
        <span className="pill">{post.authorRole}</span>
        <h1>{post.title}</h1>
        <p>{post.summary || post.region}</p>
        <div className="tag-row">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      </section>
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

function SearchPage({ keyword, activeSchool }: { keyword: string; activeSchool: School }) {
  const courses = getCourses(activeSchool.id).filter((course) => courseMatches(course, keyword)).slice(0, 80);
  const posts = getVisibleSharedPosts(activeSchool.id).filter((post) => postMatches(post, keyword)).slice(0, 30);
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
  return {
    totalViews: pageViews.length,
    totalDuration,
    averageDuration: pageViews.length ? totalDuration / pageViews.length : 0,
    bySchool,
    features,
    recent: events.slice(-12).reverse()
  };
}

function analyticsToCsv(events: AnalyticsEvent[]) {
  const header = ['id', 'timestamp', 'type', 'schoolId', 'routeName', 'feature', 'targetId', 'durationSeconds', 'path'];
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
  const maxFeatureViews = Math.max(1, ...analytics.features.map((item) => item.views));
  const dataSourceLabel = API_BASE_URL && adminToken ? '服务端真实数据' : '本机备用数据';
  const adminReady = entered && (!API_BASE_URL || Boolean(adminToken));
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
      feature: `导出统计 ${format.toUpperCase()}`
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
      const passwordHash = await hashText(password);
      if (
        (username.trim() === ADMIN_USERNAME && passwordHash === ADMIN_PASSWORD_HASH) ||
        DEFAULT_ADMIN_ACCOUNTS.some((account) => account.username === username.trim() && account.passwordHash === passwordHash)
      ) {
        setEntered(true);
        setLoginError('');
        setPassword('');
        return;
      }
      setLoginError('账号或密码不正确');
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
      return;
    }
    const next = readSupportTickets().map((ticket) => ticket.id === ticketId ? { ...ticket, status, adminReply: adminReply ?? ticket.adminReply, updatedAt: new Date().toISOString() } : ticket);
    writeSupportTickets(next);
    setSupportTickets(next.slice().reverse());
  };

  useEffect(() => {
    if (entered) void refreshAnalytics();
  }, [entered, adminToken]);

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
          <p className="login-note">{API_BASE_URL ? '默认测试管理员：otter-admin / content-reviewer / support-desk。正式部署请用 ADMIN_ACCOUNTS_JSON 覆盖。' : '配置 VITE_API_BASE_URL 后可启用服务端真实统计。'}</p>
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
                <div><strong>时间</strong><strong>类型</strong><strong>学校</strong><strong>功能</strong><strong>停留</strong></div>
                {analytics.recent.map((event) => (
                  <div key={event.id}>
                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                    <span>{event.type}</span>
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
    ['隐私政策', '本工具当前不要求注册，不收集姓名、学号、证件号码、联系方式或定位信息。课程收藏仅保存在当前浏览器本机存储中，换设备或清理浏览器数据后不会自动同步。'],
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
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('建议');
  const [contact, setContact] = useState(user.email || '');
  const [message, setMessage] = useState('');
  const [mailboxTickets, setMailboxTickets] = useState<SupportTicket[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refreshMailbox = async () => {
    try {
      setMailboxTickets(await fetchMailbox(user));
    } catch {
      setMailboxTickets([]);
    }
  };

  useEffect(() => {
    void refreshMailbox();
    const timer = window.setInterval(() => void refreshMailbox(), 12000);
    return () => window.clearInterval(timer);
  }, [user.id, user.email]);

  const submit = async () => {
    setError('');
    setStatus('');
    if (!contact.trim()) {
      setError('请填写联系方式，推荐邮箱，也可以填写微信、电话或其他方式');
      return;
    }
    if (message.trim().length < 5) {
      setError('请填写更完整的投稿或建议内容');
      return;
    }
    setSaving(true);
    try {
      await submitSupportTicket({
        userId: user.id,
        username: user.username,
        schoolId: activeSchool.id,
        type,
        contact: contact.trim(),
        message: message.trim()
      });
      setMessage('');
      setStatus(API_BASE_URL ? '已发送到管理端' : '已保存到本机管理端备用数据');
      await refreshMailbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="support-panel">
      <div>
        <span className="eyebrow">Support</span>
        <h2>投稿和建议</h2>
        <p>发现信息需要更新，或想补充路线、课程经验、生活建议，可以在这里发送给管理端处理。</p>
      </div>
      <button className="secondary-action" onClick={() => setOpen((value) => !value)}>
        {open ? '收起窗口' : `站内信箱 ${mailboxTickets.length ? `(${mailboxTickets.length})` : ''}`}
      </button>
      {open && (
        <div className="support-workspace">
          <div className="support-form">
            <label>
              <span>类型</span>
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option>投稿</option>
                <option>建议</option>
                <option>纠错</option>
                <option>合作</option>
                <option>其他</option>
              </select>
            </label>
            <label>
              <span>联系方式</span>
              <input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="推荐邮箱，也可以填写微信 / 电话 / 其他" />
            </label>
            <label className="wide">
              <span>内容</span>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="写下投稿内容、建议、纠错位置或想补充的信息" rows={5}></textarea>
            </label>
            <button className="primary-action" onClick={submit} disabled={saving}>{saving ? '发送中' : '发送给管理端'}</button>
            {error && <p className="form-error">{error}</p>}
            {status && <p className="form-success">{status}</p>}
          </div>
          <div className="mailbox-panel">
            <div className="section-head compact">
              <h3>站内信箱</h3>
              <button className="secondary-action" onClick={() => void refreshMailbox()}>刷新</button>
            </div>
            {mailboxTickets.length === 0 && <p className="login-note">还没有提交记录。管理端回复后会显示在这里。</p>}
            {mailboxTickets.map((ticket) => (
              <article className="mailbox-card" key={ticket.id}>
                <strong>{ticket.type} · {statusLabel(ticket.status)}</strong>
                <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                <p>{ticket.message}</p>
                {ticket.adminReply && <blockquote>{ticket.adminReply}</blockquote>}
              </article>
            ))}
          </div>
        </div>
      )}
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
  const activeSchool = getSchool(activeSchoolId);
  const [favoriteCourseIds, setFavoriteCourseIds] = useStoredState<string[]>(getStorageKey('favorite-courses', activeSchoolId), []);

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
      userId: currentUser?.id,
      username: currentUser?.username
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
        userId: currentUser?.id,
        username: currentUser?.username
      });
    };
  }, [activeSchoolId, currentUser?.id, currentUser?.username, hasAcceptedAgreement, route, routeKey]);

  const chooseSchool = (schoolId: SchoolId) => {
    recordAnalyticsEvent({
      type: 'school_switch',
      schoolId,
      routeName: route.name,
      feature: '学校切换',
      targetId: schoolId,
      userId: currentUser?.id,
      username: currentUser?.username
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
      userId: currentUser?.id,
      username: currentUser?.username
    });
    setFavoriteCourseIds(next);
    localStorage.setItem(getStorageKey('favorite-courses', activeSchoolId), JSON.stringify(next));
  };

  if (!hasAcceptedAgreement) {
    return (
      <div className="app-shell landing-mode">
        <LandingPage
          accepted={agreementChecked}
          onAcceptedChange={setAgreementChecked}
          onEnter={() => {
            if (!agreementChecked) return;
            setHasAcceptedAgreement(true);
            go('/');
          }}
        />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="app-shell">
        <RegistrationPage
          activeSchoolId={activeSchoolId}
          onRegistered={(user) => {
            setCurrentUser(user);
            setActiveSchoolId(user.schoolId);
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header activeSchool={activeSchool} onChooseSchool={chooseSchool} />
      <main>
        {route.name === 'home' && <HomePage activeSchool={activeSchool} onChooseSchool={chooseSchool} />}
        {route.name === 'courses' && (
          <CoursesPage
            activeSchool={activeSchool}
            favoriteCourseIds={favoriteCourseIds}
            onToggleFavoriteCourse={toggleFavoriteCourse}
          />
        )}
        {route.name === 'course' && (
          <CourseDetailPage
            id={route.id}
            favoriteCourseIds={favoriteCourseIds}
            onToggleFavoriteCourse={toggleFavoriteCourse}
          />
        )}
        {route.name === 'section' && <SectionPage sectionId={route.id} activeSchool={activeSchool} />}
        {route.name === 'post' && <PostDetailPage id={route.id} activeSchool={activeSchool} />}
        {route.name === 'search' && <SearchPage keyword={route.keyword} activeSchool={activeSchool} />}
        {route.name === 'favorites' && (
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
      <SupportPanel user={currentUser} activeSchool={activeSchool} />
      <footer>
        <span>{APP_NAME} {APP_VERSION}</span>
        <span>{DISCLAIMER}</span>
      </footer>
    </div>
  );
}
