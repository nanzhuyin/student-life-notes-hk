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
const ADMIN_CODE = 'EDU-AIEP-2026';
const FILTER_STORAGE_PREFIX = 'student-life-notes:filters:';
const SCROLL_STORAGE_PREFIX = 'student-life-notes:scroll:';
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
  | { name: 'about' };

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
  if (!text || text.includes('待官方资料核对')) return '学分待补充';
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
    研究生项目方向: '研究生院'
  };
  return facultyMap[value] || value || '学院待补充';
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
        <span className="brand-mark">v1</span>
        <span>
          <strong>香港生活信息汇总</strong>
          <small>{activeSchool.name} · Student Life Notes</small>
        </span>
      </button>
      <nav className="top-nav">
        <button onClick={() => go('/')}>首页</button>
        <button onClick={() => go('/courses')}>课程库</button>
        <button onClick={() => go('/favorites')}>我的收藏</button>
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
            <span className="landing-kicker">香港生活信息汇总 v1</span>
            <h1>把香港生活信息和课程清单放到同一个入口</h1>
            <p>
              当前支持香港教育大学和岭南大学。可以按学校查看课程清单并收藏；
              租房、通勤、美食、出行等生活内容会按当前学校分别显示。
            </p>
            <div className="landing-feature-grid">
              <span>专业课程知识库</span>
              <span>课程收藏</span>
              <span>生活指南</span>
              <span>学校平台切换</span>
            </div>
          </div>
        </div>

        <div className="landing-overlay agreement-panel">
          <span className="landing-kicker">进入前确认</span>
          <h1>隐私与学术诚信协议</h1>
          <p>
            你现在可以不注册、不登录，直接进入查看。进入前请确认你理解：本工具是非官方学生信息整理工具，
            不代表任何学校，不替代官网、handbook、programme office 或课程系统的最新说明。
          </p>

          <div className="agreement-list">
            <div>
              <strong>隐私说明</strong>
              <p>v1 不要求注册账号。课程收藏保存在你当前浏览器；本次确认只在当前页面有效，刷新后会重新显示。</p>
            </div>
            <div>
              <strong>学术诚信</strong>
              <p>本工具只帮助查阅和整理公开课程信息，不能用于代写作业、规避学校规则、伪造成绩或任何学术不端行为。</p>
            </div>
            <div>
              <strong>信息核对</strong>
              <p>课程学分、开课学期、先修要求、毕业要求等必须以学校官方最新资料为准；不确定字段会明确标注待核对。</p>
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
            <span>我已阅读并同意以上隐私与学术诚信协议，明白本工具仅供参考。</span>
          </label>

          <button className="enter-app-button" onClick={() => setConfirmOpen(true)}>
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
        <h2>{activeSchool.name}</h2>
        <p>{activeSchool.description}</p>
      </div>
      <div className="school-card-row">
        {platformData.schools.map((school) => (
          <button
            key={school.id}
            className={`school-card ${activeSchool.id === school.id ? 'active' : ''}`}
            onClick={() => onChooseSchool(school.id)}
          >
            <strong>{school.name}</strong>
            <span>{school.nameEn}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function HomePage({ activeSchool }: { activeSchool: School }) {
  const programmes = getProgrammes(activeSchool.id);
  const courses = getCourses(activeSchool.id);
  const visibleSharedPosts = getVisibleSharedPosts(activeSchool.id);
  const recommended = visibleSharedPosts.filter((post) => post.recommended).slice(0, 4);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">v1 · 双学校平台 / 网页版</span>
          <h1>香港生活信息汇总，放到同一个入口</h1>
          <p>先选学校查看课程清单，也可以收藏课程；生活内容按当前学校显示，避免混在一起看错。</p>
          <SearchBox />
          <div className="hero-stats">
            <span><strong>{platformData.schools.length}</strong> 学校</span>
            <span><strong>{programmes.length}</strong> 当前学校项目</span>
            <span><strong>{courses.length}</strong> 当前学校课程</span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="visual-map">
            <span>EdUHK</span>
            <span>LU</span>
            <span>Life Notes</span>
          </div>
        </div>
      </section>

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
              <strong>{programme.schoolId === 'eduhk' ? `${programme.medium} · ${programme.title}` : programme.title}</strong>
              <span>{programme.schoolId === 'eduhk' ? `${programme.totalCredits} cps` : `${programme.courseCount || 0} 门课程`}</span>
              <small>{programme.faculty}</small>
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
    () => uniqueCompact(programmes.flatMap((programme) => (programme.studyModes.length ? programme.studyModes : ['学习模式待核对']))),
    [programmes]
  );

  const facultyOptions = useMemo(() => uniqueCompact(programmes.map((programme) => programme.faculty)), [programmes]);

  const programmeOptions = useMemo(
    () =>
      programmes.filter((programme) => {
        const matchesLevel =
          levelFilter === 'all' ||
          programme.studyModes.includes(levelFilter) ||
          (!programme.studyModes.length && levelFilter === '学习模式待核对');
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
          <span className="filter-label">学院</span>
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
                <option key={programme.id} value={programme.id}>{programme.title}</option>
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
          <strong>{activeProgramme.title}</strong>
          <p>{activeProgramme.mediumDetail}</p>
          <div className="tag-row">
            <span>{formatFacultyName(activeProgramme.faculty)}</span>
            <span>{activeProgramme.studyModes.join(' / ') || '学习模式待核对'}</span>
            <span>{activeProgramme.totalCredits ? `${activeProgramme.totalCredits} 学分` : `${activeProgramme.courseCount || courses.length} 门课程`}</span>
          </div>
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
                <strong>{course.titleZh}</strong>
                <span>{formatCreditsText(course)}</span>
              </div>
              <small>{course.courseCode}</small>
              <p>{formatFacultyText(course.description)}</p>
              <div className="tag-row">
                <span>{course.type}</span>
                <span>{course.medium}</span>
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
        <h1>{course.titleZh}</h1>
        <p>{course.title}</p>
        <div className="tag-row">
          <span>{formatCreditsText(course)}</span>
          <span>{course.medium}</span>
          <span>{course.required ? '必修' : '可选'}</span>
          <span>{course.courseCode}</span>
        </div>
      </section>

      <section className="detail-body">
        <h2>课程简介</h2>
        <p>{formatFacultyText(course.description)}</p>
        <h2>选课信息</h2>
        <dl className="info-list">
          <div><dt>所属项目</dt><dd>{course.programmeTitle}</dd></div>
          <div><dt>学院</dt><dd>{formatFacultyName(course.faculty)}</dd></div>
          <div><dt>开课学期</dt><dd>{course.semester}</dd></div>
          <div><dt>先修要求</dt><dd>{course.prerequisites}</dd></div>
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
  if (!posts.length) return <div className="empty-state"><strong>暂无内容</strong><span>后续可以继续补充。</span></div>;

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
              <strong>{course.titleZh}</strong>
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
              <strong>{course.titleZh}</strong>
              <span>{course.programmeTitle} · {formatCreditsText(course)}</span>
            </button>
            <button onClick={() => onToggleFavoriteCourse(course.id)}>取消收藏</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminPage({ activeSchool, onChooseSchool }: { activeSchool: School; onChooseSchool: (schoolId: SchoolId) => void }) {
  const [code, setCode] = useState('');
  const [entered, setEntered] = useStoredState('student-life-notes:admin', false);
  const schoolCounts = platformData.schools.map((school) => ({
    school,
    programmes: getProgrammes(school.id).length,
    courses: getCourses(school.id).length
  }));

  return (
    <section className="page-panel">
      <div className="page-title-block centered">
        <span className="eyebrow">管理视角</span>
        <h1>v1 内容工作台</h1>
        <p>网页版先提供数据检查和视角切换；正式 CMS 后续再接入。</p>
      </div>
      <div className="page-toolbar-actions">
        <button className="secondary-action" onClick={() => go('/')}>用户视角</button>
      </div>

      {!entered && (
        <div className="login-panel">
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="输入演示邀请码" />
          <button onClick={() => code.trim() === ADMIN_CODE ? setEntered(true) : alert('邀请码不正确')}>进入管理视角</button>
        </div>
      )}

      {entered && (
        <>
          <div className="stats-grid">
            <div><strong>{platformData.schools.length}</strong><span>学校平台</span></div>
            <div><strong>{platformData.programmes.length}</strong><span>项目</span></div>
            <div><strong>{platformData.courses.length}</strong><span>课程</span></div>
            <div><strong>{platformData.sharedPosts.length}</strong><span>生活内容</span></div>
          </div>
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
        <span className="eyebrow">v1 总结</span>
        <h1>香港生活信息汇总网页版</h1>
        <p>由原微信小程序原型转换为 Vite + React + GitHub Pages 版本。</p>
      </div>
      <div className="about-card">
        <p>{DISCLAIMER}</p>
        <p>v1 支持香港教育大学与岭南大学两个平台。课程库和收藏按学校独立；生活类内容按当前学校过滤显示。</p>
        <p>当前数据：{platformData.schools.length} 个学校、{platformData.programmes.length} 个项目、{platformData.courses.length} 条课程、{platformData.sharedPosts.length} 条生活内容。</p>
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

  const chooseSchool = (schoolId: SchoolId) => {
    setActiveSchoolId(schoolId);
    if (route.name === 'course') go('/courses');
  };

  const toggleFavoriteCourse = (id: string) => {
    const next = favoriteCourseIds.includes(id) ? favoriteCourseIds.filter((item) => item !== id) : favoriteCourseIds.concat(id);
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

  return (
    <div className="app-shell">
      <Header activeSchool={activeSchool} onChooseSchool={chooseSchool} />
      <main>
        {route.name === 'home' && <HomePage activeSchool={activeSchool} />}
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
      </main>
      <footer>
        <span>香港生活信息汇总 v1</span>
        <span>{DISCLAIMER}</span>
      </footer>
    </div>
  );
}
