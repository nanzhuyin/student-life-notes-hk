import { useEffect, useMemo, useState } from 'react';
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
const EDUHK_CAMPUS_IMAGE = 'https://commons.wikimedia.org/wiki/Special:FilePath/EdUHK%20Campus%20View.jpg';
const LINGNAN_CAMPUS_IMAGE = 'https://commons.wikimedia.org/wiki/Special:FilePath/Lingnan%20University%20Campus%20Overview%20201410.jpg';
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

type Route =
  | { name: 'home' }
  | { name: 'courses' }
  | { name: 'course'; id: string }
  | { name: 'section'; id: string }
  | { name: 'post'; id: string }
  | { name: 'search'; keyword: string }
  | { name: 'plan' }
  | { name: 'admin' }
  | { name: 'about' };

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
  if (path === 'plan' || path === 'favorites') return { name: 'plan' };
  if (path === 'admin') return { name: 'admin' };
  if (path === 'about') return { name: 'about' };
  return { name: 'home' };
}

function go(path: string) {
  window.location.hash = path;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function useRoute() {
  const [route, setRoute] = useState<Route>(() => getRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
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
          <strong>香港选课生活助手</strong>
          <small>{activeSchool.name} · Student Life Notes</small>
        </span>
      </button>
      <nav className="top-nav">
        <button onClick={() => go('/')}>首页</button>
        <button onClick={() => go('/courses')}>课程库</button>
        <button onClick={() => go('/plan')}>我的计划</button>
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
  return (
    <main className="landing-shell">
      <section className="landing-slide eduhk-bg">
        <div className="landing-overlay">
          <span className="landing-kicker">香港选课生活助手 v1</span>
          <h1>把选课资料和香港生活经验放到同一个入口</h1>
          <p>
            当前支持香港教育大学和岭南大学。课程库、收藏和选课计划按学校独立保存；
            香港租房、港深通勤、新生入学指导、附近美食、出行与景点作为共享内容。
          </p>
          <div className="landing-feature-grid">
            <span>专业课程知识库</span>
            <span>课程收藏与计划</span>
            <span>共享生活指南</span>
            <span>学校平台切换</span>
          </div>
          <div className="scroll-hint">向下滚动查看岭南大学背景和使用协议</div>
        </div>
      </section>

      <section className="landing-slide lingnan-bg">
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
              <p>v1 不要求注册账号。课程收藏、选课计划、是否确认协议等信息只保存在你当前浏览器的 localStorage 中。</p>
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

          <button className="enter-app-button" disabled={!accepted} onClick={onEnter}>
            确认并进入查看
          </button>

          <div className="photo-credit">
            背景图来源：
            <a href="https://commons.wikimedia.org/wiki/File:EdUHK_Campus_View.jpg" target="_blank" rel="noreferrer">EdUHK Campus View</a>
            <span> / </span>
            <a href="https://commons.wikimedia.org/wiki/File:Lingnan_University_Campus_Overview_201410.jpg" target="_blank" rel="noreferrer">Lingnan University Campus Overview</a>
          </div>
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

function HomePage({
  activeSchool,
  onChooseSchool
}: {
  activeSchool: School;
  onChooseSchool: (schoolId: SchoolId) => void;
}) {
  const programmes = getProgrammes(activeSchool.id);
  const courses = getCourses(activeSchool.id);
  const recommended = platformData.sharedPosts.filter((post) => post.recommended).slice(0, 4);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">v1 · 双学校平台 / 网页版</span>
          <h1>选课和香港生活信息，放到同一个入口</h1>
          <p>先选学校，课程库、收藏和计划独立保存；租房、通勤、美食、出行等生活内容共享给两个学校一起用。</p>
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
            <span>Lingnan</span>
            <span>Shared Life Notes</span>
          </div>
        </div>
      </section>

      <SchoolPanel activeSchool={activeSchool} onChooseSchool={onChooseSchool} />

      <section className="section">
        <div className="section-head">
          <h2>功能分类</h2>
          <p>专业课程知识库按学校独立，其他生活分区共享。</p>
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
          <h2>共享推荐</h2>
          <p>来自原 GitHub Pages 内容库。</p>
        </div>
        <PostGrid posts={recommended} />
      </section>
    </>
  );
}

function CoursesPage({
  activeSchool,
  favoriteCourseIds,
  plannedCourseIds,
  onToggleFavoriteCourse,
  onTogglePlannedCourse
}: {
  activeSchool: School;
  favoriteCourseIds: string[];
  plannedCourseIds: string[];
  onToggleFavoriteCourse: (id: string) => void;
  onTogglePlannedCourse: (id: string) => void;
}) {
  const routeProgramme = new URLSearchParams(window.location.hash.split('?')[1] || '').get('programme') || '';
  const programmes = useMemo(() => getProgrammes(activeSchool.id), [activeSchool.id]);
  const [programmeId, setProgrammeId] = useState(routeProgramme || programmes[0]?.id || '');
  const [typeKey, setTypeKey] = useState<CourseTypeKey | 'all'>('all');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    setProgrammeId(routeProgramme || programmes[0]?.id || '');
    setTypeKey('all');
  }, [activeSchool.id, programmes, routeProgramme]);

  const activeProgramme = getProgramme(programmeId) || programmes[0];
  const courses = useMemo(() => {
    if (!activeProgramme) return [];
    return getCourses(activeSchool.id)
      .filter((course) => course.programmeId === activeProgramme.id)
      .filter((course) => typeKey === 'all' || course.typeKey === typeKey)
      .filter((course) => courseMatches(course, keyword));
  }, [activeSchool.id, activeProgramme, keyword, typeKey]);

  return (
    <section className="page-panel">
      <div className="page-title-block split">
        <div>
          <span className="eyebrow">专业课程知识库</span>
          <h1>{activeSchool.name}</h1>
          <p>{activeSchool.description}</p>
        </div>
        <button className="secondary-action" onClick={() => go('/')}>返回首页</button>
      </div>

      <div className="toolbar">
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索课程名、代码、标签" />
        <select value={programmeId} onChange={(event) => setProgrammeId(event.target.value)}>
          {programmes.map((programme) => (
            <option key={programme.id} value={programme.id}>{programme.title}</option>
          ))}
        </select>
        <select value={typeKey} onChange={(event) => setTypeKey(event.target.value as CourseTypeKey | 'all')}>
          <option value="all">全部类型</option>
          <option value="core">核心课</option>
          <option value="elective">选修课</option>
          <option value="project">项目 / 研究</option>
          <option value="general">普通课程</option>
        </select>
      </div>

      {activeProgramme && (
        <section className="programme-summary">
          <strong>{activeProgramme.title}</strong>
          <p>{activeProgramme.mediumDetail}</p>
          <div className="tag-row">
            <span>{activeProgramme.faculty}</span>
            <span>{activeProgramme.studyModes.join(' / ') || '学习模式待核对'}</span>
            <span>{activeProgramme.totalCredits ? `${activeProgramme.totalCredits} cps` : `${activeProgramme.courseCount || courses.length} 门课程`}</span>
          </div>
          <small>{activeProgramme.requirements.note}</small>
        </section>
      )}

      <div className="course-list">
        {courses.map((course) => (
          <article key={course.id} className="course-card">
            <button className="course-main" onClick={() => go(`/course/${encodeURIComponent(course.id)}`)}>
              <div className="course-head">
                <strong>{course.titleZh}</strong>
                <span>{course.creditsText}</span>
              </div>
              <small>{course.courseCode}</small>
              <p>{course.description}</p>
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
              <button className={plannedCourseIds.includes(course.id) ? 'active' : ''} onClick={() => onTogglePlannedCourse(course.id)}>
                {plannedCourseIds.includes(course.id) ? '已加入' : '加入计划'}
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
  plannedCourseIds,
  onToggleFavoriteCourse,
  onTogglePlannedCourse
}: {
  id: string;
  favoriteCourseIds: string[];
  plannedCourseIds: string[];
  onToggleFavoriteCourse: (id: string) => void;
  onTogglePlannedCourse: (id: string) => void;
}) {
  const course = getCourse(id);

  if (!course) return <EmptyPage title="没有找到这门课程" />;

  return (
    <article className="detail-page">
      <button className="back-button" onClick={() => go('/courses')}>返回课程库</button>
      <section className="detail-head course-detail-head">
        <span className="pill">{course.school} · {course.type}</span>
        <h1>{course.titleZh}</h1>
        <p>{course.title}</p>
        <div className="tag-row">
          <span>{course.creditsText}</span>
          <span>{course.medium}</span>
          <span>{course.required ? '必修' : '可选'}</span>
          <span>{course.courseCode}</span>
        </div>
      </section>

      <section className="detail-body">
        <h2>课程简介</h2>
        <p>{course.description}</p>
        <h2>选课信息</h2>
        <dl className="info-list">
          <div><dt>所属项目</dt><dd>{course.programmeTitle}</dd></div>
          <div><dt>学院 / 方向</dt><dd>{course.faculty || '待核对'}</dd></div>
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
        <button className={`secondary-action ${plannedCourseIds.includes(course.id) ? 'saved' : ''}`} onClick={() => onTogglePlannedCourse(course.id)}>
          {plannedCourseIds.includes(course.id) ? '已加入计划' : '加入计划'}
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

function SectionPage({ sectionId }: { sectionId: string }) {
  const category = categoryBySectionId[sectionId];
  const meta = sectionCategories.find((item) => item.key === category);
  const posts = platformData.sharedPosts.filter((post) => post.sectionId === sectionId && post.status === 'published');

  return (
    <section className="page-panel">
      <button className="back-button" onClick={() => go('/')}>返回首页</button>
      <div className="page-title-block">
        <span className="eyebrow">共享生活内容</span>
        <h1>{meta?.name || '生活分区'}</h1>
        <p>{meta?.description || '两个学校共享使用的生活信息。'}</p>
      </div>
      <PostGrid posts={posts} />
    </section>
  );
}

function PostDetailPage({ id }: { id: string }) {
  const post = platformData.sharedPosts.find((item) => item.id === id);
  if (!post) return <EmptyPage title="没有找到这篇内容" />;
  const paragraphs = post.content.split('\n').filter(Boolean);

  return (
    <article className="detail-page">
      <button className="back-button" onClick={() => go(`/section/${post.sectionId}`)}>返回分区</button>
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
  const posts = platformData.sharedPosts.filter((post) => postMatches(post, keyword)).slice(0, 30);
  const legacyMatches = legacyPosts.filter((post) => {
    const token = normalize(keyword);
    return token && [post.title, post.summary, post.content.join(' ')].join(' ').toLowerCase().includes(token);
  }).length;

  return (
    <section className="page-panel">
      <button className="back-button" onClick={() => go('/')}>返回首页</button>
      <div className="page-title-block">
        <span className="eyebrow">搜索</span>
        <h1>{keyword ? `“${keyword}” 的结果` : '搜索内容'}</h1>
        <p>当前课程平台：{activeSchool.name}；生活内容两个学校共享。原仓库匹配记录：{legacyMatches} 条。</p>
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

function PlanPage({
  activeSchool,
  favoriteCourseIds,
  plannedCourseIds,
  onToggleFavoriteCourse,
  onTogglePlannedCourse
}: {
  activeSchool: School;
  favoriteCourseIds: string[];
  plannedCourseIds: string[];
  onToggleFavoriteCourse: (id: string) => void;
  onTogglePlannedCourse: (id: string) => void;
}) {
  const schoolCourses = getCourses(activeSchool.id);
  const favoriteCourses = schoolCourses.filter((course) => favoriteCourseIds.includes(course.id));
  const plannedCourses = schoolCourses.filter((course) => plannedCourseIds.includes(course.id));
  const plannedCredits = plannedCourses.reduce((sum, course) => sum + (course.credits || 0), 0);

  return (
    <section className="page-panel">
      <div className="page-title-block split">
        <div>
          <span className="eyebrow">本机保存</span>
          <h1>{activeSchool.shortName}我的计划</h1>
          <p>{activeSchool.id === 'eduhk' ? `AIEP 当前计划 ${plannedCredits} / 24 cps。` : `岭南当前计划 ${plannedCourses.length} 门课程。`}</p>
        </div>
        <button className="secondary-action" onClick={() => go('/courses')}>继续选课</button>
      </div>

      <section className="section">
        <div className="section-head"><h2>已加入计划</h2><p>按当前学校独立保存。</p></div>
        <CourseMiniList courses={plannedCourses} actionText="移除" onAction={onTogglePlannedCourse} />
      </section>

      <section className="section">
        <div className="section-head"><h2>收藏课程</h2><p>收藏也按学校独立保存。</p></div>
        <CourseMiniList courses={favoriteCourses} actionText="取消收藏" onAction={onToggleFavoriteCourse} />
      </section>
    </section>
  );
}

function CourseMiniList({ courses, actionText, onAction }: { courses: Course[]; actionText: string; onAction: (id: string) => void }) {
  if (!courses.length) return <div className="empty-state"><strong>暂无课程</strong><span>去课程库添加几门。</span></div>;
  return (
    <div className="course-list compact">
      {courses.map((course) => (
        <article key={course.id} className="course-result with-action">
          <button onClick={() => go(`/course/${encodeURIComponent(course.id)}`)}>
            <strong>{course.titleZh}</strong>
            <span>{course.programmeTitle} · {course.creditsText}</span>
          </button>
          <button onClick={() => onAction(course.id)}>{actionText}</button>
        </article>
      ))}
    </div>
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
      <div className="page-title-block split">
        <div>
          <span className="eyebrow">管理视角</span>
          <h1>v1 内容工作台</h1>
          <p>网页版先提供数据检查和视角切换；正式 CMS 后续再接入。</p>
        </div>
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
            <div><strong>{platformData.sharedPosts.length}</strong><span>共享生活内容</span></div>
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
      <button className="back-button" onClick={() => go('/')}>返回首页</button>
      <div className="page-title-block">
        <span className="eyebrow">v1 总结</span>
        <h1>香港选课生活助手网页版</h1>
        <p>由原微信小程序原型转换为 Vite + React + GitHub Pages 版本。</p>
      </div>
      <div className="about-card">
        <p>{DISCLAIMER}</p>
        <p>v1 支持香港教育大学与岭南大学两个平台。课程库、收藏和计划按学校独立；生活类内容共享。</p>
        <p>当前数据：{platformData.schools.length} 个学校、{platformData.programmes.length} 个项目、{platformData.courses.length} 条课程、{platformData.sharedPosts.length} 条共享生活内容。</p>
      </div>
    </section>
  );
}

function EmptyPage({ title }: { title: string }) {
  return (
    <section className="page-panel">
      <button className="back-button" onClick={() => go('/')}>返回首页</button>
      <div className="empty-state"><strong>{title}</strong><span>可能是链接已经变化。</span></div>
    </section>
  );
}

export default function App() {
  const route = useRoute();
  const [hasAcceptedAgreement, setHasAcceptedAgreement] = useStoredState('student-life-notes:accepted-agreement', false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [activeSchoolId, setActiveSchoolId] = useStoredState<SchoolId>('student-life-notes:active-school', 'eduhk');
  const activeSchool = getSchool(activeSchoolId);
  const [favoriteCourseIds, setFavoriteCourseIds] = useStoredState<string[]>(getStorageKey('favorite-courses', activeSchoolId), []);
  const [plannedCourseIds, setPlannedCourseIds] = useStoredState<string[]>(getStorageKey('planned-courses', activeSchoolId), []);

  useEffect(() => {
    try {
      setFavoriteCourseIds(JSON.parse(localStorage.getItem(getStorageKey('favorite-courses', activeSchoolId)) || '[]'));
      setPlannedCourseIds(JSON.parse(localStorage.getItem(getStorageKey('planned-courses', activeSchoolId)) || '[]'));
    } catch {
      setFavoriteCourseIds([]);
      setPlannedCourseIds([]);
    }
  }, [activeSchoolId]);

  const chooseSchool = (schoolId: SchoolId) => {
    setActiveSchoolId(schoolId);
  };

  const toggleFavoriteCourse = (id: string) => {
    const next = favoriteCourseIds.includes(id) ? favoriteCourseIds.filter((item) => item !== id) : favoriteCourseIds.concat(id);
    setFavoriteCourseIds(next);
    localStorage.setItem(getStorageKey('favorite-courses', activeSchoolId), JSON.stringify(next));
  };

  const togglePlannedCourse = (id: string) => {
    const next = plannedCourseIds.includes(id) ? plannedCourseIds.filter((item) => item !== id) : plannedCourseIds.concat(id);
    setPlannedCourseIds(next);
    localStorage.setItem(getStorageKey('planned-courses', activeSchoolId), JSON.stringify(next));
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
        {route.name === 'home' && <HomePage activeSchool={activeSchool} onChooseSchool={chooseSchool} />}
        {route.name === 'courses' && (
          <CoursesPage
            activeSchool={activeSchool}
            favoriteCourseIds={favoriteCourseIds}
            plannedCourseIds={plannedCourseIds}
            onToggleFavoriteCourse={toggleFavoriteCourse}
            onTogglePlannedCourse={togglePlannedCourse}
          />
        )}
        {route.name === 'course' && (
          <CourseDetailPage
            id={route.id}
            favoriteCourseIds={favoriteCourseIds}
            plannedCourseIds={plannedCourseIds}
            onToggleFavoriteCourse={toggleFavoriteCourse}
            onTogglePlannedCourse={togglePlannedCourse}
          />
        )}
        {route.name === 'section' && <SectionPage sectionId={route.id} />}
        {route.name === 'post' && <PostDetailPage id={route.id} />}
        {route.name === 'search' && <SearchPage keyword={route.keyword} activeSchool={activeSchool} />}
        {route.name === 'plan' && (
          <PlanPage
            activeSchool={activeSchool}
            favoriteCourseIds={favoriteCourseIds}
            plannedCourseIds={plannedCourseIds}
            onToggleFavoriteCourse={toggleFavoriteCourse}
            onTogglePlannedCourse={togglePlannedCourse}
          />
        )}
        {route.name === 'admin' && <AdminPage activeSchool={activeSchool} onChooseSchool={chooseSchool} />}
        {route.name === 'about' && <AboutPage />}
      </main>
      <footer>
        <span>香港选课生活助手 v1</span>
        <span>{DISCLAIMER}</span>
      </footer>
    </div>
  );
}
