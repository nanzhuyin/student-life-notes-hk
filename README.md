# Otter v1.18

Student Course & Life Notes in Hong Kong

Otter 是一个非官方、个人/学生自发维护的香港学习生活信息网站。v1.18 是内测静态版本，当前先开放两个学校平台的课程库、收藏和生活内容浏览。

免责声明：本网站为个人/学生自发整理的信息工具，内容仅供参考，不代表任何学校或机构官方立场。

线上地址：

```text
https://nanzhuyin.github.io/student-life-notes-hk/#/
```

## v1.18 功能

- 品牌名：Otter，使用原创 AI 生成水獭头像，不使用学校名称或学校 logo。
- 内测提示：页面顶部和底部支持区明确标注当前为内测版本。
- 动态功能暂停：站内信箱、在线投稿处理、用户注册和服务端统计暂未开放，反馈先通过微信群联系管理人员。
- 学校切换：香港教育大学 EdUHK / 岭南大学 LU。
- 专业课程知识库：按学校、项目、课程类型、关键词筛选。
- 香港教育大学课程库：已恢复 54 个授课型硕士项目，并为 42 个项目整理官网公开课程明细；MSc(AIEP) 中文授课 / 英文授课版本分开，归入应用政策研究与教育未来学院，人工智能与数字能力教育中心作为承办中心展示。
- 岭南大学课程库：按项目方向查看课程资料，并保留英文项目名称与常用英文短名。
- 隐私与学术诚信：入口页和独立页面说明隐私政策、公开资料边界和避免学术不端规则。
- 我的收藏：按学校独立保存课程收藏。
- 生活内容：香港租房、港深通勤、新生入学指导、附近美食、出行与景点，按当前学校过滤显示。
- 管理视角：只有点击管理端并登录后才能查看服务端总浏览量、EDU / LU 浏览量、停留时间、功能打开排行、最近事件和注册用户。
- 投稿建议：当前内测期通过微信群联系管理人员；线上表单和站内信箱待后端部署后再开放。
- 工单处理：后端代码已准备，正式接入 Render + Supabase 后再启用管理端处理流。
- 统计导出：管理端导出能力保留在代码中，正式后端部署后再开放真实服务端数据。
- 部署入口：GitHub Pages 只从 `main` 分支自动部署，避免旧 staging 分支覆盖线上页面。
- 后端持久化：Node API 支持 Supabase 数据库，未配置 Supabase 时自动回退到本地 JSON。
- 云部署：新增 `render.yaml`，可在 Render 上部署免费 Web Service。
- 静态上线：GitHub Pages 当前先以静态模式发布；动态后端接入步骤见 `docs/STATIC_DEPLOYMENT_AND_DYNAMIC_BACKEND_PLAN.md`。
- 注册入口：暂时隐藏注册页顶部账号创建说明和验证码说明文案。
- 登录界面：当前静态发布先隐藏整页注册/登录界面，用户确认协议后直接进入首页。
- 岭南课程下拉：项目选项同时显示中文参考名和英文缩写/短名，例如 `金融学理学硕士 / MSc in Finance`。

当前数据统计：

- 学校平台：2
- 项目：129
- 课程条目：3132
- 生活内容：74

## 技术栈

- Vite
- React
- TypeScript
- 纯静态 JSON 数据
- Node.js 后端 API
- Supabase 数据库
- Render 后端部署
- GitHub Pages 自动部署

前端通过 `VITE_API_BASE_URL` 接入后端 API。当前 GitHub Pages 内测静态版暂不配置后端地址，站内信箱、在线投稿、用户注册和服务端统计先不开放。

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

默认测试管理员账号：

```text
otter-admin / Otter-Admin-2026!a7Q
content-reviewer / Otter-Review-2026!m4K
support-desk / Otter-Support-2026!p9L
```

正式部署建议用环境变量 `ADMIN_ACCOUNTS_JSON` 覆盖默认管理员账号。

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
