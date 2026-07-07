# AI 交互日志与协作规则

本文档给项目成员和各自使用的 AI 助手阅读。目标是让多人同时开发时保持同一套版本号、分支和合版逻辑，避免覆盖别人已经 push 的内容。

## 当前分支

- 当前稳定部署分支：`main`
- 功能开发分支：独立 feature 分支或 `v1-web-staging`
- GitHub Pages 只从 `main` 自动部署，避免旧 staging 分支覆盖线上页面。

## 版本号规则

每一次准备 push，都必须递增一个小版本，并在提交信息和日志中注明。

- 上一次版本：`v1.28`
- 上一次管理端入口显示修复版本：`v1.28`
- 本次管理员登录与用户视角边界修复版本：`v1.29`
- 下一次修改：`v1.30`

每次版本递增时至少同步这些位置：

- `src/App.tsx` 中的 `APP_VERSION`
- `src/data/platformData.json` 中的 `version`
- `package.json` / `package-lock.json` 中的 npm 版本，例如 `v1.03` 对应 `1.0.3`
- 本文件的版本日志

提交信息建议格式：

```bash
git commit -m "v1.05: 扩展教大硕士课程数据库"
```

push 前说明建议格式：

```text
准备 push 到 v1-web-staging，版本 v1.05。
本次改动：合并同事最新分支，恢复 54 个教大硕士项目，新增官网公开课程明细。
已测试：npm run build，本地页面关键路径。
```

### v1.28

日期：2026-07-07

改动范围：

- 顶部导航不再向普通用户公开显示“管理视角”。
- 管理员成功登录后，浏览器保存管理员会话，顶部导航才显示“管理视角”入口。
- 明确普通注册登录和管理员登录是两套入口：普通用户走注册/登录，管理员走 `#/admin` 和 Render `ADMIN_ACCOUNTS_JSON`。

测试：

- `npm run build` 通过。
- `node --check server/index.mjs` 和 `node --check server/storage.mjs` 通过。

### v1.29

日期：2026-07-07

改动范围：

- 管理员账号仍然只走 `#/admin` 管理端登录，不混入普通用户登录表。
- 管理员登录后也视为已通过访问门槛，可以从“用户视角”浏览普通页面。
- 普通登录页增加“管理员账号不能在普通登录页登录”的说明和管理端跳转按钮。
- 顶部导航在管理员状态下增加“退出管理”，用于清除当前浏览器的管理员会话。

测试：

- `npm run build` 通过。
- `node --check server/index.mjs` 和 `node --check server/storage.mjs` 通过。

### v1.26

日期：2026-07-07

改动范围：

- 首页确认隐私与学术诚信说明后，改为先进入注册/登录流程。
- 未登录用户不能直接进入课程库、课程详情、收藏、搜索和生活内容页面；注册或登录成功后再进入主内容。
- 保留管理端、隐私与诚信说明、关于页、注册页和登录页的公开入口。
- 本地备用注册逻辑统一处理邮箱大小写和用户名空格，并继续阻止用户名重复。
- 更新 README 和隐私政策文案，避免出现“无需注册直接进入”的旧说明。

测试：

- `npm run build` 通过。

### v1.27

日期：2026-07-07

改动范围：

- 课程库默认不再自动选择第一个项目，改为先显示“未选择项目”和按学院/单位分组的专业模块。
- EDU / LU 使用同一套课程库交互逻辑；专业卡片和课程卡片显示授课语言标签。
- 首页右侧改为实时访问与互动概览，访问量每 30-60 秒随机递增 1，不设置上限，并显示收到建议、论坛发表和当前内容数量。
- 联系作者信箱优化：邮箱联系方式统一小写保存，用户站内信箱自动刷新，管理端显示待处理/处理中/已处理/已关闭工单统计。
- 新增 `scripts/validate-course-data.mjs` 和 `npm run validate:courses`，生成 `docs/COURSE_DATA_AUDIT.md`，检查 EDU / LU 课程项目映射、授课语言、来源和字段完整性。
- 新增 `docs/SUPABASE_RENDER_DEPLOYMENT_GUIDE.md`，整理 Supabase、Render、GitHub Pages 自动部署和手动配置步骤。
- EDU 硕士项目补齐官网可核验课程：MATESOL、MAICT、MAGHE、MATCIL、MEd、MADHCP、MA(VAECP) 均写入课程清单和来源 URL。
- 发布前清理 `research/` 抓取缓存和本地日志，并将 `research/` 加入忽略规则。

测试：

- `npm run validate:courses` 通过，课程数据结构硬错误 0。
- `npm run build` 通过。未在发布前执行全量联网来源检查；课程补充项已按官网页面逐项核对来源 URL。

## 每次开工前必须执行

每个成员或 AI 开始修改前，先检查别人有没有 push 新版本。

```bash
git checkout v1-web-staging
git fetch origin v1-web-staging
git status --short
git log --oneline --decorate --left-right --graph HEAD...origin/v1-web-staging
```

判断规则：

- 如果没有输出远端领先记录，可以继续开发。
- 如果看到 `>` 开头的提交，说明远端有别人新 push 的版本。
- 如果本地没有未提交改动，执行：

```bash
git pull --ff-only origin v1-web-staging
```

- 如果本地已有未提交改动，不要直接 pull。先让 AI 或开发者说明当前改动，再选择：
  - 先提交本地改动，再合并远端；
  - 或临时 stash，再 pull，再恢复 stash；
  - 或新建功能分支保存当前工作。

禁止做这些事，除非负责人明确要求：

- `git reset --hard`
- `git checkout -- <file>`
- 直接覆盖别人刚 push 的文件
- 直接推送到 `main`

## 合版流程

如果发现远端有新版本：

1. 先读远端提交说明，确认对方改了哪个模块。
2. 拉取远端最新代码。
3. 再检查自己的修改是否和对方冲突。
4. 冲突时优先保留双方逻辑，不能确定就写明冲突点并询问负责人。
5. 合版后必须重新跑：

```bash
npm run build
```

如果改动涉及页面交互，还要本地打开测试：

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

本地地址：

```text
http://127.0.0.1:5173/student-life-notes-hk/#/
```

## AI 使用交接提示词

给同事的 AI 可以直接复制下面这段：

```text
你正在开发香港选课生活助手网页版。当前主要分支是 v1-web-staging，不要直接推 main。
开始工作前必须先执行 git fetch origin v1-web-staging，并检查 HEAD...origin/v1-web-staging。
如果远端有新提交，先拉下来并合版，再继续开发。
每次准备 push 必须递增版本号，例如 v1.10 后下一次是 v1.11。
版本号需要同步到 src/App.tsx 的 APP_VERSION、src/data/platformData.json 的 version、package.json、package-lock.json，并更新 docs/AI_INTERACTION_LOG.md。
提交信息必须以版本号开头，例如：v1.11: 修复岭南课程筛选。
```

## 版本日志

### v1.25

日期：2026-07-07

改动范围：

- 香港租房和港深通勤卡片不再引用外部图片 URL，改为优先读取前端 `public/images/properties/` 下的本地图片。
- 已下载并纳入前端资源：港湾豪庭、叠茵庭、大兴花园、聚康山庄、傲云峰、绿怡居、豫丰花园等公开参考图。
- 深圳通勤公寓和未确认图源的小区使用前端本地生成的对应小区名插画兜底，不请求外部图片。
- 生产后端不再内置公开默认管理员账号；必须通过 `ADMIN_ACCOUNTS_JSON` 配置正式管理员。
- 文档移除公开默认管理员账号说明。

测试：

- `npm run build` 通过。
- `node --check server/index.mjs` 和 `node --check server/storage.mjs` 通过。

### v1.24

日期：2026-07-07

改动范围：

- 线上检查发现 Render 后端已部署到 v1.23，但 Supabase 返回 `permission denied for table otter_users`。
- `supabase/schema.sql` 增加 `service_role` 对 `otter_users`、`otter_analytics_events`、`otter_support_tickets`、`otter_posts` 的表权限授权。
- README 和部署交接文档补充说明：如果重跑 schema 后仍报权限错误，检查 Render 的 `SUPABASE_SERVICE_ROLE_KEY` 是否误填成 publishable key。

测试：

- GitHub Pages v1.23 线上检查通过，页面返回 `Otter v1.23`。
- Render `/api/login` 已存在，但在重跑 Supabase schema 或修正 service role key 前会继续返回数据库权限错误。

### v1.23

日期：2026-07-07

改动范围：

- 新增独立登录页 `/login`，顶部导航增加“登录”，注册页增加“已有账号，直接登录”入口。
- 后端新增 `POST /api/login`，支持邮箱或用户名 + 密码登录。
- 注册时检查用户名唯一性；Supabase schema 新增 `lower(username)` 唯一索引。
- 本机备用注册数据也保存密码 hash，用于无后端时的登录验证。
- 修复 Render `SUPABASE_URL` 如果误填 Supabase API URL 或 `/rest/v1` 时导致的 `Invalid path specified in request URL`。
- 管理端统计增加游客浏览、注册用户浏览、管理员浏览，并在最近事件和 CSV 导出中包含身份字段。
- 租房卡片和详情页增加房源封面：管理员手动图片优先；已确认图源的小区使用公开参考图；未确认图源的小区使用带小区名的本地生成插画兜底。
- 更新 README、入口 HTML 和后端接入文档。

测试：

- `npm run build` 通过。
- 本次 schema 变更后，Supabase SQL Editor 需要重新运行 `supabase/schema.sql`。

### v1.22

日期：2026-07-07

改动范围：

- 管理员可以在生活内容各板块直接新增内容。
- 管理员可以在板块列表或详情页直接编辑已有内容；编辑静态内容时以后端同 ID 覆盖层保存，不破坏原始 JSON。
- 新增 `otter_posts` 后端数据表、公开 `GET /api/posts`、管理员 `POST /api/admin/posts` 和 `PUT /api/admin/posts/:id`。
- 前端合并静态 JSON 和后端帖子，后端内容优先；`deleted` / `archived` 状态会隐藏内容。
- 每个板块有独立标签和补充字段：租房、通勤、新生入学指导、美食、出行与景点分别显示对应筛选项。
- 管理员发布时可以选择当前学校、两校共享、仅教育大学、仅岭南大学。
- 图片先采用 URL 输入，一行一个；数据库只保存图片 URL，不保存图片二进制。
- Supabase schema 新增 `otter_posts`，部署后需要在 SQL Editor 重新运行 `supabase/schema.sql`。

测试：

- `npm run build` 通过。
- `node --check server/index.mjs` 和 `node --check server/storage.mjs` 通过。
- 本地 Node API 回归通过：`GET /api/posts`、管理员登录、`POST /api/admin/posts` 创建内容、`PUT /api/admin/posts/:id` 编辑内容。
- 版本检查通过：`package.json` 为 `1.0.22`，`platformData.version` 为 `v1.22`。

### v1.21

日期：2026-07-07

改动范围：

- 页面底部开放“联系作者信箱”。
- 用户可提交联系作者、内容纠错、资料补充和使用问题，提交到现有 `POST /api/support`。
- 注册用户自动使用注册邮箱查看回执；未注册用户可填写邮箱后刷新“我的回执”，读取 `GET /api/mailbox`。
- 管理端仍使用现有工单处理逻辑，管理员回复后用户可在底部回执区查看。
- 明确边界：这不是公开投稿、评论或社区功能，内容不会直接公开，仍由管理员确认后整理发布。
- 同步 README、静态部署与动态后端交接文档、入口 HTML 和版本号。

测试：

- `npm run build` 通过。
- 版本检查通过：`package.json` 为 `1.0.21`，`platformData.version` 为 `v1.21`。
- 线上 support 接口无写入测试通过：短内容请求返回 `400` 和错误提示，CORS 允许 `https://nanzhuyin.github.io`。

### v1.20

日期：2026-07-07

改动范围：

- 开放前端 `/register` 注册页路由，并在顶部导航增加“注册”入口。
- 注册表单接入现有 `POST /api/register` 后端逻辑；邮箱只做格式和可用域名检查，不做邮箱二次验证码。
- 注册成功后保存当前浏览器用户身份，并按注册时选择的学校切换平台。
- 更新内测提示：注册已开放；站内信箱和在线投稿处理仍在灰度测试。
- 同步 README、静态部署与动态后端交接文档、入口 HTML 和版本号。

测试：

- `npm run build` 通过。
- `gh variable list` 确认 GitHub Actions 已配置 `VITE_API_BASE_URL=https://otter-api-student-life-notes-hk.onrender.com`。
- Render 健康检查通过：`GET /api/health` 返回 `ok: true`，存储为 `supabase`。
- 线上注册接口无写入测试通过：无效邮箱请求返回 `400` 和 `请填写有效邮箱`，CORS 允许 `https://nanzhuyin.github.io`。

### v1.19

日期：2026-07-07

改动范围：

- 保留岭南原有新生指导和到校路线内容，不改成通用版。
- 复制出 5 篇教育大学专用新生指导内容：银行卡、电话卡、学生八达通、学生签证、水电煤。
- 新增 `schoolId: "eduhk"` 标记，让教育大学视图只显示教大版新生指导。
- 共享生活内容过滤逻辑改为优先读取 `schoolId`，无 `schoolId` 的旧内容继续沿用原有文字识别规则。

测试：

- 数据检查：教育大学新生入学指导 5 条；岭南新生入学指导 11 条，原有 6 条到校路线未复制到教育大学。

### v1.18

日期：2026-07-07

改动范围：

- 将首页学校介绍改为用户向正常文案。
- 岭南标题从“岭南课程加入中文参考名”改为“岭南大学课程与生活指南”。
- 去掉首页说明中的“整理入库”“中文参考译名”“减少误看别校信息”等开发说明式表达。
- README 中岭南课程库说明改为正常介绍。

测试：

- `npm run build` 通过。
- 全局检查用户可见文件，已无“岭南课程加入中文参考名”“LU 项目课程清单已整理入库”“减少误看别校信息”“中文参考译名”等旧文案。

### v1.17

日期：2026-07-07

改动范围：

- 页面顶部新增“内测版本”提示。
- 入口协议说明更新为静态内测边界：站内信箱、在线投稿处理、用户注册和服务端统计暂未开放。
- 底部支持区改为静态内测说明，提示通过微信群联系管理人员，不再展示投稿表单和站内信箱列表。
- `docs/STATIC_DEPLOYMENT_AND_DYNAMIC_BACKEND_PLAN.md` 更新当前版本、内测状态和明天后端技术路线。
- README 更新为 v1.17，说明当前静态发布与动态功能暂停边界。

测试：

- `npm run build` 通过。

### v1.16

日期：2026-07-07

改动范围：

- 修复岭南大学课程库“项目”下拉只显示中文参考名的问题。
- 新增英文短名生成逻辑，将 `Master of Science in Finance` 显示为 `MSc in Finance`、`Bachelor of Arts (Honours)` 显示为 `BA (Hons)` 等。
- 岭南项目下拉选项改为“中文参考名 / 英文短名”，方便快速识别项目简称。

测试：

- `npm run build` 通过。
- 抽样检查岭南项目下拉 label：中文文学硕士 / MA in Chinese、会计学硕士 / MAcc、艺术科技与商业理学硕士 / MSc in Arts Technology and Business。

### v1.15

日期：2026-07-07

改动范围：

- 静态发布阶段隐藏整页注册/登录界面。
- 用户确认隐私与学术诚信协议后直接进入首页。
- 未登录时使用本机访客身份支撑浏览统计、学校切换和投稿建议。
- 保留注册组件和后端注册能力，方便后续动态后端接入时恢复。

测试：

- `npm run build` 通过。

### v1.14

日期：2026-07-07

改动范围：

- 隐藏注册页顶部“创建你的 Otter 账号”标题。
- 隐藏注册页顶部“使用真实邮箱、用户名和自设密码登录；不发送验证码。”说明。
- 隐藏注册表单底部“不发送验证码”提示。

测试：

- `npm run build` 通过。

### v1.13

日期：2026-07-07

改动范围：

- 明确当前 GitHub Pages 先以静态模式上线，未配置 `VITE_API_BASE_URL` 时使用本机备用数据。
- 新增 `docs/STATIC_DEPLOYMENT_AND_DYNAMIC_BACKEND_PLAN.md`，记录 Supabase、Render、GitHub Pages 动态接入步骤。
- GitHub Actions 预留 `VITE_API_BASE_URL` 仓库变量，后续填入 Render 后端地址后可重新部署接入真实后端。
- README 更新为 v1.13，并补充静态/动态部署边界。

测试：

- `npm run build` 通过。

### v1.12

日期：2026-07-07

改动范围：

- 后端新增 Supabase 存储适配；配置 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 后，注册用户、浏览统计、投稿建议和站内信箱都会写入 Supabase。
- 保留本地 JSON 存储作为开发兜底，未配置 Supabase 时仍可本地测试。
- 新增 `supabase/schema.sql`，包含用户、统计事件和工单表结构。
- 新增 `render.yaml`，用于 Render 免费 Web Service 部署 Node API。
- README 更新为 v1.12，补充 Supabase / Render 部署环境变量。

测试：

- `npm run build` 通过。
- 本地 API 回归验证通过：健康检查、邮箱注册、统计写入、投稿建议、管理员登录、工单回复、站内信箱读取、dashboard 读取。

### v1.11

日期：2026-07-07

改动范围：

- GitHub Pages workflow 移除 `v1-web-staging` push 触发，只保留 `main` 和手动 `workflow_dispatch`。
- README 更新为 v1.11，并说明 GitHub Pages 只托管前端、真实后端需单独部署。
- 前端展示版本、平台数据版本、npm 版本同步到 v1.11 / 1.0.11。

测试：

- `npm run build` 通过。

### v1.10

日期：2026-07-07

改动范围：

- 品牌名改为 Otter，并新增原创 AI 生成水獭头像 logo。
- 注册改为真实邮箱 + 自设密码 + 用户名 + 学校选择；后端检查邮箱域名 MX 记录，不发送验证码。
- 后端支持通过 `ADMIN_ACCOUNTS_JSON` 配置多个管理员账号。
- 投稿建议工单状态改为待处理、处理中、已处理、已关闭。
- 管理端可写入站内回复，用户可在底部站内信箱查看处理状态和回复内容。
- 管理端登录后定时刷新服务端数据，状态更新后即时反映到界面。
- README 补充后端接入位置、费用边界和管理端账号配置方式。

测试：

- `npm run build` 通过。
- 后端 API 验证通过：坏邮箱域名拒绝、真实邮箱域名注册、管理员账号登录、工单回复、站内信箱读取、dashboard 读取。

### v1.09

日期：2026-07-07

改动范围：

- 产品名改为临时非学校名称，避免使用学校名称作为品牌。
- 新增 Node.js 后端 API：注册、访问统计、支持投稿、管理员登录、工单处理。
- 前端新增邮箱注册流程：邮箱、用户名、学校选择，不发送验证码。
- 访问统计优先上报服务端，管理端可查看服务端真实浏览量、停留时间、功能打开和注册用户。
- 底部新增“投稿和建议”支持窗口，用户需填写联系方式，推荐邮箱。
- 管理端新增投稿建议列表，可标记处理中、已处理或关闭。
- README 增加 `VITE_API_BASE_URL` 和 `npm run dev:api` 后端启动说明。

测试：

- `npm run build` 通过。
- 本地后端 API 验证通过：健康检查、邮箱注册、统计上报、投稿建议、管理员登录、dashboard 读取、工单状态更新。

### v1.08

日期：2026-07-07

改动范围：

- 清理前台发布文案中的“逐步补课程”“后续补齐”“待官网确认”“需人工复核”等未完成表述。
- 移除 2 条没有真实课程名称的岭南占位课程，发布数据保留 3132 条课程。
- EdUHK 和 LU 当前学校标题、顶部品牌区与首页 hero 统一展示正式简称。
- 岭南大学页面显示 LU 简称，与教大 EdUHK 的展示方式保持一致。
- README 发布说明同步改为 v1.08，并收紧发布措辞。

测试：

- `npm run build` 通过。
- 全局检索前台数据和发布说明，确认目标模糊文案已移除。

### v1.07

日期：2026-07-06

改动范围：

- 管理端由旧邀请码改为管理员账号 + 强密码校验，降低被随手猜到的风险。
- 新增本机浏览统计：页面浏览、页面离开停留时间、EDU / LU 学校切换、收藏操作和统计导出事件。
- 管理端新增总浏览量、总停留时间、平均停留、学校分布、功能打开排行和最近事件表。
- 支持导出统计数据为 JSON / CSV，便于后续整理报表。
- 优化管理端统计 UI，在桌面和手机端保持信息清晰。

测试：

- `npm run build` 通过。
- 本地浏览器检查：管理端登录、浏览统计展示、JSON / CSV 导出、EDU / LU 访问记录。

### v1.06

日期：2026-07-06

改动范围：

- AIEP 归入应用政策研究与教育未来学院展示，人工智能与数字能力教育中心改为承办中心字段，不再作为学系或学院筛选项。
- “跨院 / 独立项目”统一归入“其他”，便于课程库筛选。
- 岭南大学 75 个项目补充中文参考译名，英文正式名保留为副标题。
- 入口页重做隐私政策与学术诚信确认区，放大勾选区域并优化桌面 / 手机布局。
- 新增独立“隐私与诚信”页面，说明隐私政策、公开资料边界、避免学术不端和非官方关系。
- EDU / LU 首页 hero 和学校切换卡优化，减少标题拥挤和信息错位。

测试：

- `npm run build` 通过。
- 浏览器检查：入口页、EDU 首页、LU 首页、课程库、AIEP 单位显示、岭南中文参考名、隐私与诚信页面。

### v1.05

日期：2026-07-06

改动范围：

- 先拉取并合并同事最新 `v1-web-staging`，保留首页、返回按钮、滚动位置和学校内容过滤等最新改动。
- 从本地数据库恢复 54 个香港教育大学授课型硕士项目，合并到同事最新版岭南与共享生活数据上。
- 新增 `scripts/extract-eduhk-courses.mjs`，按 EdUHK 官方项目页面抽取课程表、课程结构和课程组件。
- 新增 `scripts/apply-eduhk-courses.mjs`，将抽取结果写入 `src/data/platformData.json`。
- 为 EdUHK 42 个硕士项目整理课程明细，新增/更新 548 条 EdUHK 课程记录。
- 清理误抓的标题行、联系方式、奖学金说明等非课程条目。
- 仍未从公开页解析到课程清单的项目已保留官网入口，后续需人工复核或查 handbook。

测试：

- `npm run build` 通过。
- 数据检查：EdUHK 54 个硕士项目，42 个已有课程明细，EdUHK 课程 548 条；全站课程 3134 条。

### v1.04

日期：2026-07-06

改动范围：

- 开工前先检查并合并远端 `v1-web-staging` 新提交，保留同事的最新页面调整。
- AIEP 英文授课卡片去掉额外的“AIEP”状态标签，只保留授课语言。
- AIEP 中文授课卡片保留独立的“2026 年新开”开设时间标记。
- 调整专业卡片标签样式：授课语言与开设时间同高对齐，开设时间标签改为高对比绿色白字。
- EdUHK 硕士项目列表补充中文项目名，保留英文名作为第二行显示。
- EdUHK 学院/部门名称和 AIEP 课程归属补充中文展示。

测试：

- `npm run build` 通过。
- 本地页面测试：EdUHK 专业课程知识库、AIEP 英文/中文授课卡片、开设时间标签颜色与对齐、项目中文名显示。

### v1.03

日期：2026-07-06

改动范围：

- 合并远端 `v1-web-staging` 新提交后继续开发，避免覆盖同事改动。
- 去掉中文授课重复标识：授课语言已经显示为“中文授课”时，不再重复显示同名状态标签。
- 课程名称在列表、详情、搜索和计划里补充中英文展示。
- 专业课程知识库二级页新增学历筛选：全部 / 本科 / 硕士；当前数据默认筛选硕士。
- 专业筛选条件保存到 localStorage，用户进入详情再返回时保留上次筛选结果。
- 页面返回按钮统一改为默认返回上一页；直接打开页面时使用 fallback 路由。

测试：

- `npm run build` 通过。
- 本地页面测试：EdUHK 课程库、AIEP 中文班、课程详情返回、筛选保存、中文授课标签去重。

### v1.02

日期：2026-07-06

改动范围：

- EdUHK 页面主色改为绿色，符合教大视觉方向。
- 首页和 EdUHK 课程库加入本地化校园滚动图片。
- 新增右上角“用户视角 / 管理视角”切换。
- 用户端可以发布帖子、编辑自己的帖子；不能编辑别人帖子。
- 管理视角可以添加、编辑、删除所有帖子。
- 专业课程知识库改为二级/三级结构：
  - `#/courses` 展示专业列表。
  - `#/programme/:id` 展示专业详情和课程。
- EdUHK 导入 54 个官方授课型硕士项目入口。
- AIEP 英文班和中文班分开；中文班显示“2026 新开专业”，课程结构暂按 AIEP 英文班官方资料展示并注明待官网确认。

测试：

- `npm run build` 通过。
- 本地资源检查通过：3 张 EdUHK 校园图均返回 200。
- 浏览器测试通过：入口协议页、EdUHK 二级课程库、AIEP 中文班三级页、非 AIEP 待补课程提示、用户发帖权限、管理视角帖子权限。

### v1.01

日期：2026-07-06

改动范围：

- 小程序方向转为网页版方向。
- 基于原岭南 GitHub Pages 项目转换为 Vite + React 网页。
- 建立双学校入口：香港教育大学 / 岭南大学。
- 课程数据按学校独立，生活内容共享。
- 建立隐私与学术诚信协议入口页。
- 建立初版分工文档和交互文档。
