import { useEffect, useMemo, useState } from 'react';
import postsData from './data/posts.json';
import type { CategoryKey, CategoryMeta, NotePost } from './types';

const DISCLAIMER = '本网站为个人/学生自发整理的信息工具，内容仅供参考，不代表任何学校或机构官方立场。';

const categories: CategoryMeta[] = [
  {
    key: 'hk_rent',
    name: '香港租房',
    description: '租房区域、预算和通勤参考',
    accent: 'warm'
  },
  {
    key: 'sz_commute',
    name: '港深通勤',
    description: '深圳居住、口岸和跨境路线',
    accent: 'green'
  },
  {
    key: 'hk_life',
    name: '新生入学指导',
    description: '到港路线、生活办理和开学前后提醒',
    accent: 'orange'
  },
  {
    key: 'nearby_food',
    name: '附近美食',
    description: '日常餐饮、价格和位置参考',
    accent: 'blue'
  },
  {
    key: 'transport_spots',
    name: '出行与景点',
    description: '常用目的地路线和时间参考',
    accent: 'mint'
  },
  {
    key: 'course_catalog',
    name: '专业课程库',
    description: '按学历、方向和项目查看公开课程清单',
    accent: 'peach'
  }
];

const posts = postsData as NotePost[];

type Route =
  | { name: 'home' }
  | { name: 'category'; category: CategoryKey }
  | { name: 'detail'; id: string }
  | { name: 'search'; keyword: string }
  | { name: 'favorites' }
  | { name: 'about' };

function getRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [routePart = '', queryPart = ''] = hash.split('?');
  const [path = '', ...rest] = routePart.split('/');

  if (!path) return { name: 'home' };
  if (path === 'category' && rest[0]) return { name: 'category', category: rest[0] as CategoryKey };
  if (path === 'post' && rest[0]) return { name: 'detail', id: rest[0] };
  if (path === 'search') {
    const params = new URLSearchParams(queryPart);
    return { name: 'search', keyword: params.get('q') || '' };
  }
  if (path === 'favorites') return { name: 'favorites' };
  if (path === 'about') return { name: 'about' };
  return { name: 'home' };
}

function go(path: string) {
  window.location.hash = path;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function postMatches(post: NotePost, keyword: string) {
  const token = normalize(keyword);
  if (!token) return true;
  return [
    post.title,
    post.summary,
    post.region,
    post.categoryName,
    post.source,
    post.tags.join(' '),
    post.content.join(' ')
  ]
    .join(' ')
    .toLowerCase()
    .includes(token);
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

function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('floating-life-favorites') || '[]');
    } catch {
      return [];
    }
  });

  const save = (ids: string[]) => {
    setFavoriteIds(ids);
    localStorage.setItem('floating-life-favorites', JSON.stringify(ids));
  };

  const toggleFavorite = (id: string) => {
    save(favoriteIds.includes(id) ? favoriteIds.filter((item) => item !== id) : favoriteIds.concat(id));
  };

  return {
    favoriteIds,
    toggleFavorite,
    isFavorite: (id: string) => favoriteIds.includes(id)
  };
}

function Header() {
  return (
    <header className="site-header">
      <button className="brand-button" onClick={() => go('/')}>
        <span className="brand-mark">牛</span>
        <span>
          <strong>放牛娃的浮生日记</strong>
          <small>Student Life Notes in Hong Kong</small>
        </span>
      </button>
      <nav className="top-nav">
        <button onClick={() => go('/')}>首页</button>
        <button onClick={() => go('/favorites')}>收藏</button>
        <button onClick={() => go('/about')}>关于</button>
      </nav>
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
        placeholder="搜索租房、通勤、饮食、出行..."
      />
      <button onClick={submit}>搜索</button>
    </div>
  );
}

function DisclaimerCard() {
  return <section className="disclaimer-card">{DISCLAIMER}</section>;
}

function PostCard({
  post,
  favorite,
  onToggleFavorite
}: {
  post: NotePost;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <article className="post-card">
      <button className="post-main" onClick={() => go(`/post/${post.id}`)}>
        <span className="pill">{post.categoryName}</span>
        <h3>{post.title}</h3>
        <p>{post.summary}</p>
        <div className="post-meta">
          <span>{post.region}</span>
          <span>{post.updatedAt}</span>
        </div>
        <div className="tag-row">
          {post.tags.slice(0, 4).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </button>
      <button className={`favorite ${favorite ? 'active' : ''}`} onClick={() => onToggleFavorite(post.id)}>
        {favorite ? '已收藏' : '收藏'}
      </button>
    </article>
  );
}

function PostList({
  items,
  emptyText,
  favoriteIds,
  onToggleFavorite
}: {
  items: NotePost[];
  emptyText: string;
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <div className="empty-state">
        <strong>暂时没有内容</strong>
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <div className="post-grid">
      {items.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          favorite={favoriteIds.includes(post.id)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

function HomePage({
  favoriteIds,
  onToggleFavorite
}: {
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
}) {
  const latest = posts.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const recommended = posts.filter((post) => post.recommended).slice(0, 4);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">个人整理 / 非官方 / 生活记录</span>
          <h1>放牛娃的浮生日记</h1>
          <p>Student Life Notes in Hong Kong</p>
          <SearchBox />
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="sun"></div>
          <div className="notebook">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="map-pin"></div>
        </div>
      </section>

      <DisclaimerCard />

      <section className="section">
        <div className="section-head">
          <h2>分类入口</h2>
          <p>从生活问题开始找，不需要知道复杂目录。</p>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <button key={category.key} className={`category-card ${category.accent}`} onClick={() => go(`/category/${category.key}`)}>
              <span>{category.name}</span>
              <small>{category.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>推荐内容</h2>
          <p>适合刚来香港时先看的几篇。</p>
        </div>
        <PostList
          items={recommended}
          emptyText="之后可以在数据文件里继续补充。"
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
        />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>最新内容</h2>
          <p>按更新时间排序。</p>
        </div>
        <PostList
          items={latest}
          emptyText="暂无最新内容。"
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
        />
      </section>
    </>
  );
}

function CategoryPage({
  categoryKey,
  favoriteIds,
  onToggleFavorite
}: {
  categoryKey: CategoryKey;
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
}) {
  const category = categories.find((item) => item.key === categoryKey);
  const items = posts.filter((post) => post.category === categoryKey);

  return (
    <section className="page-panel">
      <button className="back-button" onClick={() => go('/')}>返回首页</button>
      <div className="page-title-block">
        <span className="eyebrow">分类</span>
        <h1>{category?.name || '分类'}</h1>
        <p>{category?.description || '生活信息整理。'}</p>
      </div>
      <PostList
        items={items}
        emptyText="这个分类还没有内容。"
        favoriteIds={favoriteIds}
        onToggleFavorite={onToggleFavorite}
      />
    </section>
  );
}

function DetailPage({
  id,
  favorite,
  onToggleFavorite
}: {
  id: string;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const post = posts.find((item) => item.id === id);
  const [copied, setCopied] = useState(false);

  if (!post) {
    return (
      <section className="page-panel">
        <button className="back-button" onClick={() => go('/')}>返回首页</button>
        <div className="empty-state">
          <strong>没有找到这篇内容</strong>
          <span>可能是链接已变更。</span>
        </div>
      </section>
    );
  }

  const copyText = async () => {
    const text = `${post.title}\n\n${post.content.join('\n\n')}\n\n来源：${post.source}\n${DISCLAIMER}`;
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <article className="detail-page">
      <button className="back-button" onClick={() => go(`/category/${post.category}`)}>返回分类</button>
      <section className="detail-head">
        <span className="pill">{post.categoryName}</span>
        <h1>{post.title}</h1>
        <p>{post.summary}</p>
        <div className="post-meta">
          <span>更新时间：{post.updatedAt}</span>
          <span>地区：{post.region}</span>
        </div>
        <div className="tag-row">
          {post.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </section>

      <DisclaimerCard />

      <section className="detail-body">
        {post.content.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>

      <section className="source-card">
        <strong>信息来源说明</strong>
        <span>{post.source}</span>
      </section>

      <div className="detail-actions">
        <button className={`primary-action ${favorite ? 'saved' : ''}`} onClick={() => onToggleFavorite(post.id)}>
          {favorite ? '已收藏' : '收藏这篇'}
        </button>
        <button className="secondary-action" onClick={copyText}>
          {copied ? '已复制' : '复制信息'}
        </button>
      </div>
    </article>
  );
}

function SearchPage({
  keyword,
  favoriteIds,
  onToggleFavorite
}: {
  keyword: string;
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
}) {
  const results = useMemo(() => posts.filter((post) => postMatches(post, keyword)), [keyword]);

  return (
    <section className="page-panel">
      <button className="back-button" onClick={() => go('/')}>返回首页</button>
      <div className="page-title-block">
        <span className="eyebrow">搜索</span>
        <h1>{keyword ? `“${keyword}” 的结果` : '搜索内容'}</h1>
      </div>
      <SearchBox initialValue={keyword} />
      <PostList
        items={results}
        emptyText="换个关键词试试，例如租房、口岸、电话卡、机场。"
        favoriteIds={favoriteIds}
        onToggleFavorite={onToggleFavorite}
      />
    </section>
  );
}

function FavoritesPage({
  favoriteIds,
  onToggleFavorite
}: {
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
}) {
  const items = posts.filter((post) => favoriteIds.includes(post.id));

  return (
    <section className="page-panel">
      <button className="back-button" onClick={() => go('/')}>返回首页</button>
      <div className="page-title-block">
        <span className="eyebrow">本机收藏</span>
        <h1>我的收藏</h1>
        <p>收藏只保存在当前浏览器，不需要登录。</p>
      </div>
      <PostList
        items={items}
        emptyText="你还没有收藏内容。"
        favoriteIds={favoriteIds}
        onToggleFavorite={onToggleFavorite}
      />
    </section>
  );
}

function AboutPage() {
  return (
    <section className="about-page">
      <button className="back-button" onClick={() => go('/')}>返回首页</button>
      <div className="page-title-block">
        <span className="eyebrow">关于</span>
        <h1>放牛娃的浮生日记</h1>
        <p>Student Life Notes in Hong Kong</p>
      </div>
      <div className="about-card">
        <p>{DISCLAIMER}</p>
        <p>这个网站的目标是把来港学习生活中常见、琐碎但有用的信息整理在一起，方便自己和朋友快速查找。</p>
        <p>内容来自公开生活信息和个人整理，不提供官方承诺，也不替代任何机构、服务商或政府部门的最新说明。</p>
        <p>联系邮箱占位：hello@example.com</p>
        <p>微信占位：your-wechat-id</p>
      </div>
    </section>
  );
}

export default function App() {
  const route = useRoute();
  const favorites = useFavorites();

  return (
    <div className="app-shell">
      <Header />
      <main>
        {route.name === 'home' && (
          <HomePage favoriteIds={favorites.favoriteIds} onToggleFavorite={favorites.toggleFavorite} />
        )}
        {route.name === 'category' && (
          <CategoryPage
            categoryKey={route.category}
            favoriteIds={favorites.favoriteIds}
            onToggleFavorite={favorites.toggleFavorite}
          />
        )}
        {route.name === 'detail' && (
          <DetailPage
            id={route.id}
            favorite={favorites.isFavorite(route.id)}
            onToggleFavorite={favorites.toggleFavorite}
          />
        )}
        {route.name === 'search' && (
          <SearchPage
            keyword={route.keyword}
            favoriteIds={favorites.favoriteIds}
            onToggleFavorite={favorites.toggleFavorite}
          />
        )}
        {route.name === 'favorites' && (
          <FavoritesPage favoriteIds={favorites.favoriteIds} onToggleFavorite={favorites.toggleFavorite} />
        )}
        {route.name === 'about' && <AboutPage />}
      </main>
      <footer>
        <span>放牛娃的浮生日记</span>
        <span>{DISCLAIMER}</span>
      </footer>
    </div>
  );
}
