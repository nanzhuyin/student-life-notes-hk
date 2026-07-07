# Otter v1.39

Student Course & Life Notes in Hong Kong

Otter 是一个非官方、个人/学生自发维护的香港学习生活信息网站。v1.39 是内测版本，当前开放两个学校平台的课程库、收藏、生活内容、邮箱注册登录和联系作者信箱；游客可以浏览课程和生活内容，注册用户才可以发送建议或联系作者。

免责声明：本网站为个人/学生自发整理的信息工具，内容仅供参考，不代表任何学校或机构官方立场。

线上地址：

```text
https://nanzhuyin.github.io/student-life-notes-hk/#/
```

## v1.39 功能

- 品牌名：Otter，使用原创 AI 生成水獭头像，不使用学校名称或学校 logo。
- 内测提示：页面顶部和底部支持区明确标注当前为内测版本。
- 用户注册：开放邮箱、用户名和密码注册；后端检查邮箱格式、可用邮箱域名和用户名唯一性，不要求邮箱二次验证。
- 用户登录：顶部导航未登录时只显示“登录”，注册入口保留在登录页和入口确认页；可用邮箱或用户名登录。
- 访问门槛：首页确认隐私与学术诚信说明后可游客浏览；注册或登录后才可以发送联系作者、内容纠错和补充资料。
- 联系作者信箱：右侧悬浮球开放提交入口，可提交建议、投稿、内容纠错、资料补充和使用问题。
- 图片投稿：注册用户可以直接选择本地图片，前端压缩后随工单提交，管理员在管理端可直接查看图片。
- 回执查询：填写邮箱提交后，可以在悬浮弹窗里的“我的回执”查看管理员处理状态和回复。
- 动态功能边界：不开放公开投稿、评论和社区入口，内容仍由管理员整理后发布。
- 管理员发布：管理员登录后可在各生活板块直接新增内容，并按板块选择对应标签和补充字段。
- 管理员编辑：管理员可在板块列表或详情页直接编辑已有内容；编辑静态内容时以后端覆盖层保存。
- 管理端入口：顶部导航不会向普通用户公开显示“管理视角”；管理员登录后才显示管理入口，并可用统一“退出”回到游客状态。
- 登录边界：普通注册账号走普通登录页；管理员账号走 `#/admin` 管理端登录。管理员登录后也可浏览用户视角内容。
- 游客访问：游客可浏览课程库和生活内容；联系作者、内容纠错和补充资料必须注册登录后才可发送。
- 管理员工单：注册用户发送的联系作者/纠错信息会进入后端工单，管理员可在管理视角查看和处理。
- 共享范围：管理员发布时可选择当前学校、两校共享、仅教育大学或仅岭南大学。
- 图片策略：管理员可填写图片 URL；香港租房和港深通勤卡片优先使用前端本地图片资源，无法确认图源时使用本地生成的对应小区插画兜底。数据库只保存管理员填写的 URL，不保存图片二进制。
- 学校切换：香港教育大学 EdUHK / 岭南大学 LU。
- 专业课程知识库：按学校、项目、课程类型、关键词筛选。
- 香港教育大学课程库：已恢复 54 个授课型硕士项目，并为 42 个项目整理官网公开课程明细；MSc(AIEP) 中文授课 / 英文授课版本分开，归入应用政策研究与教育未来学院，人工智能与数字能力教育中心作为承办中心展示。
- 岭南大学课程库：按项目方向查看课程资料，并保留英文项目名称与常用英文短名。
- 隐私与学术诚信：入口页和独立页面说明隐私政策、公开资料边界和避免学术不端规则。
- 我的收藏：按学校独立保存课程收藏。
- 生活内容：香港租房、港深通勤、新生入学指导、附近美食、出行与景点，按当前学校过滤显示。
- 教育大学新生入学指导：新增银行卡、电话卡、学生八达通、学生签证和水电煤 5 篇教大专用版本；岭南原文和岭南到校路线保持不变。
- 管理视角：只有点击管理端并登录后才能查看服务端总浏览量、EDU / LU 浏览量、停留时间、功能打开排行、最近事件、访问身份统计和注册用户。
- 联系作者：当前内测期可通过右侧悬浮球提交纠错、补充资料、投稿和使用问题；内容不会直接公开。
- 工单处理：管理端支持按待处理、处理中、已处理、已关闭筛选工单，点击工单可放大查看完整内容和图片。
- 统计导出：管理端导出能力保留在代码中，正式后端部署后再开放真实服务端数据。
- 部署入口：GitHub Pages 只从 `main` 分支自动部署，避免旧 staging 分支覆盖线上页面。
- 后端持久化：Node API 支持 Supabase 数据库，未配置 Supabase 时自动回退到本地 JSON。
- 云部署：新增 `render.yaml`，可在 Render 上部署免费 Web Service。
- 静态上线：GitHub Pages 当前先以静态模式发布；动态后端接入步骤见 `docs/STATIC_DEPLOYMENT_AND_DYNAMIC_BACKEND_PLAN.md`。
- 部署交互手册：Supabase + Render + GitHub Pages 的自动/手动部署流程见 `docs/SUPABASE_RENDER_DEPLOYMENT_GUIDE.md`。
- 课程数据检测：运行 `npm run validate:courses` 可生成 `docs/COURSE_DATA_AUDIT.md`，检查 EDU / LU 课程结构、来源、授课语言和项目映射。
- 注册入口：顶部导航不单独显示“注册”，但登录页保留“没有账号，去注册”，注册成功后保存当前浏览器用户身份。
- 登录入口：顶部导航未登录时只显示“登录”；普通用户或管理员登录后顶部只显示统一“退出”入口。
- 岭南课程下拉：项目选项同时显示中文参考名和英文缩写/短名，例如 `金融学理学硕士 / MSc in Finance`。

当前数据统计：

- 学校平台：2
- 项目：129
- 课程条目：3132
- 生活内容：79

## 技术栈

- Vite
- React
- TypeScript
- 纯静态 JSON 数据
- Node.js 后端 API
- Supabase 数据库
- Render 后端部署
- GitHub Pages 自动部署

前端通过 `VITE_API_BASE_URL` 接入后端 API。配置后端地址后，注册、登录和联系作者信箱会写入服务端；未配置时使用本机备用数据。不开放公开投稿、评论和社区入口。

管理员新增和编辑生活内容会写入后端 `otter_posts`。部署 v1.39 后需要在 Supabase SQL Editor 重新运行 `supabase/schema.sql`，创建 `otter_posts` 表、用户名唯一索引、`service_role` 表权限和其他索引。

当前后端实现位于 `server/index.mjs`。如果配置 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`，数据会写入 Supabase；否则默认使用 `server/data/app-data.json` 做本地持久化。这个文件夹已加入 `.gitignore`，不会把真实用户数据提交到仓库。

费用边界：本地运行免费；GitHub Pages 只能托管前端，不能运行这个 Node 后端。明天继续动态部署时，预计用 Render 免费 Web Service 跑 `server/index.mjs`，用 Supabase 免费数据库保存注册、统计、投稿和站内信箱数据。免费平台可能有休眠、额度或暂停限制。

## 本地运行

```bash
npm install
npm run dev
```

启动后端 API：

```bash
npm run dev:api
```

本地接入后端时，新建 `.env.local`：

```text
VITE_API_BASE_URL=http://127.0.0.1:8787
```

生产部署必须用环境变量 `ADMIN_ACCOUNTS_JSON` 配置正式管理员账号。后端不内置公开测试管理员账号；未配置该变量时，管理端不能登录。

Supabase 建表 SQL：

```text
supabase/schema.sql
```

Render 需要配置这些环境变量：

```text
SUPABASE_URL=<Supabase Project URL>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role secret>
ALLOWED_ORIGINS=https://nanzhuyin.github.io
ADMIN_ACCOUNTS_JSON=<正式管理员账号 JSON>
```

GitHub Pages 接入线上后端时，在 GitHub 仓库 `Settings -> Secrets and variables -> Actions -> Variables` 新增：

```text
VITE_API_BASE_URL=https://你的-render-服务.onrender.com
```

然后重新运行 `Deploy GitHub Pages`，前端就会从静态备用数据切换到真实后端。

注意：`VITE_API_BASE_URL` 必须填写 Render 后端地址，例如 `https://otter-api-student-life-notes-hk.onrender.com`，不要填写 Supabase 的 `API URL` 或 `.../rest/v1`。Render 的 `SUPABASE_URL` 可以填写 Supabase Project URL 或 API URL，后端会自动规范化。

如果线上登录或联系作者显示 `permission denied for table ...`，先在 Supabase SQL Editor 重新运行当前 `supabase/schema.sql`。如果仍然报权限错误，检查 Render 的 `SUPABASE_SERVICE_ROLE_KEY` 是否填成了 Supabase 的 secret/service_role key，而不是 publishable key。

构建和本地预览：

```bash
npm run build
npm run preview
```

## 项目结构

```text
.
├── .github/workflows/deploy.yml
├── index.html
├── package.json
├── render.yaml
├── supabase/schema.sql
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   ├── types.ts
│   └── data/posts.json
└── README.md
```

当前目录里可能仍有旧版文件夹。它们已经写入 `.gitignore`，新建 Git 仓库时不会被提交，也不会参与 GitHub Pages 部署。

## 如何添加内容

内容数据在：

```text
src/data/posts.json
src/data/platformData.json
```

`posts.json` 保留原站生活笔记内容；`platformData.json` 是 v1 平台数据，包含学校、项目、课程和生活内容。

新增一条内容时，复制一个对象并修改以下字段：

- `id`：唯一英文短横线 ID
- `title`：标题
- `category`：分类 key
- `categoryName`：展示分类名
- `summary`：摘要
- `content`：正文段落数组
- `tags`：标签数组
- `region`：地区关键词
- `source`：信息来源说明
- `updatedAt`：更新时间，格式 `YYYY-MM-DD`
- `recommended`：是否首页推荐

允许的分类：

- `housing`：租房
- `commute`：通勤
- `food`：饮食
- `travel`：出行
- `adaptation`：生活适应
- `hk-life`：港漂经验

不要添加学校官方名称、校徽、官方建筑图像、内部事务、授权暗示或任何公开互动发布入口。

## GitHub 初始化和 Push

```bash
git init
git checkout -b main
git add .
git commit -m "init static student life notes site"
git remote add origin https://github.com/<your-name>/<repo-name>.git
git push -u origin main
```

创建前端开发分支：

```bash
git checkout -b frontend
git push -u origin frontend
```

预留后端分支：

```bash
git checkout main
git checkout -b backend
git push -u origin backend
```

## GitHub Pages 部署

本项目已经包含：

```text
.github/workflows/deploy.yml
```

部署流程：

1. 推送到 `main` 分支。
2. 进入 GitHub 仓库 `Settings`。
3. 打开 `Pages`。
4. `Source` 选择 `GitHub Actions`。
5. 等待 `Deploy GitHub Pages` workflow 完成。

`vite.config.ts` 会读取 `VITE_BASE_PATH`。GitHub Actions 中默认设置为 `/<repo-name>/`，适合普通 GitHub Pages 项目仓库。如果你的仓库是 `<username>.github.io`，把 workflow 里的 `VITE_BASE_PATH` 改成 `/`。

## 分支协作规则

- `main`：稳定部署分支，只合并已经验收的功能。
- `frontend`：前端开发分支，页面、样式、静态数据先在这里改。
- `backend`：预留给后端同学，若要做 API、CMS 或管理后台，从这里开始。
- 新功能使用独立分支，例如 `feature/search-filter`。
- 所有功能通过 Pull Request 合并到 `main`。
- 合并前至少确认 `npm run build` 通过。

## 当前限制

- GitHub Pages 只托管前端；真实注册、统计、投稿和站内信箱需要另行部署 `server/index.mjs`。
- 收藏使用浏览器 `localStorage`，只保存在当前设备。
- 搜索为前端本地搜索，适合 MVP 内容量。
- 复制功能依赖浏览器剪贴板权限，不同浏览器提示可能不同。
