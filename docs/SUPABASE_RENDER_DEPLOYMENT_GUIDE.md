# Supabase + Render 交互部署手册

日期：2026-07-07

这份文档给接手部署的同事使用。目标是：代码推到 `main` 后，GitHub Pages 自动部署前端；Render 开启 Auto-Deploy 后自动部署后端；Supabase 只做数据库和权限配置，不托管前端页面。

## 一、部署关系

```text
GitHub main
  ├─ GitHub Actions -> GitHub Pages 前端
  └─ Render Auto-Deploy -> Node API 后端

Node API 后端 -> Supabase Postgres
前端 -> Render API -> Supabase
```

前端地址：

```text
https://nanzhuyin.github.io/student-life-notes-hk/#/
```

当前后端地址：

```text
https://otter-api-student-life-notes-hk.onrender.com
```

健康检查：

```text
https://otter-api-student-life-notes-hk.onrender.com/api/health
```

返回里如果看到：

```json
{
  "ok": true,
  "storage": "supabase"
}
```

说明 Render 已经连上 Supabase。

## 二、同事拉代码后的本地检查

```bash
git clone https://github.com/nanzhuyin/student-life-notes-hk.git
cd student-life-notes-hk
npm ci
npm run build
npm run validate:courses
```

本地连接线上 Render 后端调试：

```bash
VITE_API_BASE_URL=https://otter-api-student-life-notes-hk.onrender.com npm run dev
```

Windows PowerShell：

```powershell
$env:VITE_API_BASE_URL="https://otter-api-student-life-notes-hk.onrender.com"
npm run dev
```

## 三、Supabase 手动步骤

Supabase 需要手动完成一次建表和授权。

1. 打开 Supabase 项目。
2. 进入 `SQL Editor`。
3. 复制并运行仓库里的：

```text
supabase/schema.sql
```

这个 SQL 会创建或更新：

- `otter_users`
- `otter_analytics_events`
- `otter_support_tickets`
- `otter_posts`
- 用户名大小写不敏感唯一索引
- service_role 表权限

如果遇到 `permission denied for table ...`：

1. 先重新运行 `supabase/schema.sql`。
2. 再检查 Render 的 `SUPABASE_SERVICE_ROLE_KEY` 是否填的是 secret/service_role key，而不是 publishable key。

如果遇到 `cannot execute CREATE TABLE in a read-only transaction`：

1. 等项目初始化完成。
2. 刷新 SQL Editor。
3. 确认连接的是 Primary Database。
4. 再运行一次。

## 四、Render 后端部署

Render 推荐用 Blueprint。

1. Render Dashboard 选择 `New -> Blueprint`。
2. 选择 GitHub 仓库：

```text
nanzhuyin/student-life-notes-hk
```

3. Render 会读取根目录：

```text
render.yaml
```

4. 确认服务：

```text
name: otter-api-student-life-notes-hk
runtime: node
plan: free
branch: main
buildCommand: npm ci
startCommand: npm run start:api
healthCheckPath: /api/health
```

5. 在 Render 的 Environment 里填写：

```text
SUPABASE_URL=<Supabase Project URL>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role secret>
ALLOWED_ORIGINS=https://nanzhuyin.github.io
ADMIN_ACCOUNTS_JSON=<管理员账号 JSON>
```

`ADMIN_ACCOUNTS_JSON` 示例格式：

```json
[{"username":"你的管理员账号","passwordHash":"密码的 sha256","role":"admin"}]
```

生成密码 hash 的 PowerShell 示例：

```powershell
$password = "这里换成强密码"
[System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($password))).Replace("-","").ToLower()
```

保存环境变量后，点击 `Manual Deploy -> Deploy latest commit`。

以后只要 Render 里开启 Auto-Deploy，`main` 分支有新提交，Render 会自动重新部署后端。

## 五、GitHub Pages 前端部署

前端由 `.github/workflows/deploy.yml` 自动部署。

自动触发条件：

```text
push 到 main
```

手动触发：

```text
GitHub -> Actions -> Deploy GitHub Pages -> Run workflow
```

前端接入 Render API 需要配置 GitHub Actions Variable：

```text
Settings -> Secrets and variables -> Actions -> Variables
VITE_API_BASE_URL=https://otter-api-student-life-notes-hk.onrender.com
```

注意：这里是 `Variables`，不是必须放在 `Secrets`。这个地址会进入前端 bundle，属于公开 API 地址。

## 六、上线后验证

按顺序检查：

1. 打开 `/api/health`，确认 `storage` 是 `supabase`。
2. 打开前端页面，确认标题版本号正确。
3. 注册一个测试用户，用户名不能重复。
4. 登录测试用户。
5. 提交一条“内容纠错”。
6. 进入管理端，确认能看到该建议。
7. 管理端回复并改成“已处理”。
8. 回到用户页面，刷新站内信箱，确认能看到回复。
9. 进入管理端导出统计 JSON/CSV。

## 七、常见问题

### 前端注册失败但后端 health 正常

检查 Supabase SQL 是否运行，尤其是 `grant all privileges ... to service_role`。

### 管理端无法登录

检查 Render 是否配置了 `ADMIN_ACCOUNTS_JSON`，并确认 JSON 是数组格式。后端不会内置公开管理员账号。

### GitHub Pages 还是旧版

进入 Actions 查看 `Deploy GitHub Pages` 是否成功。构建日志里应该能看到 `VITE_API_BASE_URL` 被注入；重新 Run workflow 可强制部署。

### Render 部署成功但 storage 是 json

说明 Render 没读到 Supabase 环境变量。检查 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`，保存后重新部署。

### 免费版 Render 首次访问很慢

Render Free 可能休眠，首次访问会冷启动。等几十秒后刷新即可。
