# 静态部署与动态后端接入交接

日期：2026-07-07

## 当前线上状态

- 当前版本：`v1.25`
- 线上地址：https://nanzhuyin.github.io/student-life-notes-hk/#/
- 部署方式：GitHub Pages + GitHub Actions
- 当前模式：内测前端 + 注册和联系作者信箱模式
- 部署分支：`main`

GitHub Pages 页面已明确标注为内测版本。用户可以正常浏览课程库、生活内容、隐私政策、学术诚信说明和收藏；注册、登录入口和联系作者信箱已开放，配置 `VITE_API_BASE_URL` 后会写入后端，未配置时使用本机备用数据。管理员可以在生活板块直接新增和编辑内容，写入后端 `otter_posts`。不开放公开投稿、评论和社区入口，内容仍由管理员整理后发布。

## 已经准备好的动态后端

代码已经包含真实后端能力：

- Node API：`server/index.mjs`
- 存储适配：`server/storage.mjs`
- Supabase 建表 SQL：`supabase/schema.sql`
- Render 部署蓝图：`render.yaml`

后端 API 支持：

- `GET /api/health`
- `POST /api/register`
- `POST /api/login`
- `POST /api/analytics`
- `POST /api/support`
- `GET /api/mailbox`
- `GET /api/posts`
- `POST /api/admin/login`
- `GET /api/admin/dashboard`
- `POST /api/admin/posts`
- `PUT /api/admin/posts/:id`
- `PATCH /api/admin/tickets/:id`

本地回归已经通过：健康检查、邮箱注册、统计写入、投稿建议、管理员登录、工单回复、站内信箱读取、dashboard 读取。

## 预计后端技术路线

明天继续部署时，技术路线保持轻量免费优先：

- 前端：GitHub Pages，继续由 `.github/workflows/deploy.yml` 自动构建。
- 后端：Render Free Web Service，运行 `npm run start:api`，入口是 `server/index.mjs`。
- 数据库：Supabase Free Postgres，表结构来自 `supabase/schema.sql`。
- 前后端连接：GitHub Actions Variables 中配置 `VITE_API_BASE_URL=https://你的-render-服务.onrender.com`。
- 后端密钥：Render 环境变量配置 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`ADMIN_ACCOUNTS_JSON`。
- 安全边界：`SUPABASE_SERVICE_ROLE_KEY` 只放在 Render，不放进 GitHub、不放进前端、不写入聊天记录。

动态功能上线边界：

- 邮箱密码注册和登录已开放；后端检查邮箱格式、可用邮箱域名和用户名唯一性，不要求邮箱二次验证。
- 联系作者信箱已开放；用户可以提交联系作者、内容纠错、资料补充和使用问题，并通过邮箱查看回执。
- 管理员生活内容发布和编辑已开放；内容写入 `otter_posts`，前端会合并静态 JSON 与后端帖子。
- 服务端真实浏览统计。
- 不开放公开投稿、评论和社区入口。
- 管理端工单状态处理仍灰度。
- 信箱回执查看已开放；处理流程仍按管理员后台人工处理。

## 明天继续动态接入的顺序

1. Supabase 项目

项目已创建：

```text
项目名：otter
项目 id：libbtgqufquaopkzrqcl
组织：Chenbo's Org
```

进入 SQL Editor，运行：

```text
supabase/schema.sql
```

v1.25 schema 包含 `otter_posts` 表、`lower(username)` 唯一索引和 `service_role` 表权限。即使之前已经运行过旧版 schema，也需要重新运行当前 `supabase/schema.sql`，否则管理员新增/编辑生活内容会因为表不存在而无法持久化，或注册用户名唯一性无法由数据库兜底。

如果线上 API 返回 `permission denied for table otter_users`、`otter_support_tickets` 等错误，先重新运行当前 `supabase/schema.sql`。如果仍然报错，基本就是 Render 的 `SUPABASE_SERVICE_ROLE_KEY` 填成了 publishable key，需要改成 Supabase 后台的 secret/service_role key。

如果出现 `cannot execute CREATE TABLE in a read-only transaction`，先等项目完全初始化，刷新 SQL Editor，确认 Source 是 `Primary Database`，然后再运行。这个错误通常表示当前连接暂时处于只读状态，不是代码问题。

2. Render 后端服务

在 Render 创建 Blueprint，选择 GitHub 仓库：

```text
nanzhuyin/student-life-notes-hk
```

Render 会读取根目录的：

```text
render.yaml
```

需要填写的环境变量：

```text
SUPABASE_URL=<Supabase Project URL>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role secret>
ALLOWED_ORIGINS=https://nanzhuyin.github.io
ADMIN_ACCOUNTS_JSON=<正式管理员账号 JSON>
```

不要把 `SUPABASE_SERVICE_ROLE_KEY` 写进 GitHub 仓库或聊天记录。

`SUPABASE_URL` 推荐填写 Supabase Project URL。如果误填到 API URL 或带 `/rest/v1` 的地址，v1.23 后端会自动规范化，避免联系作者信箱出现 `Invalid path specified in request URL`。

3. 验证后端

Render 部署完成后，访问：

```text
https://你的-render-服务.onrender.com/api/health
```

预期返回：

```json
{
  "ok": true,
  "name": "Otter API",
  "storage": "supabase"
}
```

如果 `storage` 是 `json`，说明 Render 没有正确配置 Supabase 环境变量。

4. 接入 GitHub Pages 前端

进入 GitHub 仓库：

```text
Settings -> Secrets and variables -> Actions -> Variables
```

新增变量：

```text
VITE_API_BASE_URL=https://你的-render-服务.onrender.com
```

然后进入：

```text
Actions -> Deploy GitHub Pages -> Run workflow
```

重新部署后，前端会在构建时读取 `VITE_API_BASE_URL`。确认 Render + Supabase 均验证通过后，注册、登录和联系作者信箱会写入服务端；公开投稿、评论和社区功能仍不开放。

## 管理端账号

生产部署必须在 Render 配置 `ADMIN_ACCOUNTS_JSON`。后端不内置公开测试管理员账号；未配置该变量时，管理端不能登录。

## 静态模式与动态模式区别

静态模式：

- 免费、已上线、可直接访问
- 当前作为内测浏览版使用
- 注册和联系作者信箱已开放；公开投稿、评论和社区功能不开放
- 反馈通过微信群联系管理人员

动态模式：

- 需要 Render + Supabase
- 注册用户、访问统计、投稿建议、工单状态和站内信箱会写入 Supabase
- 管理端能看到真实服务端数据

## 明天继续时的检查清单

- Supabase SQL 表是否创建成功
- Render `/api/health` 是否返回 `storage: "supabase"`
- GitHub Actions Variables 是否配置 `VITE_API_BASE_URL`
- GitHub Pages 是否重新部署成功
- 前端注册一个测试用户
- 提交一条测试建议
- 管理端处理并回复
- 用户站内信箱能看到回复
