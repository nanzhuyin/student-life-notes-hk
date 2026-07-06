# 放牛娃的浮生日记

Student Life Notes in Hong Kong

这是一个非官方、个人/学生自发维护的香港学习生活信息静态网站。内容围绕租房、通勤、饮食、出行、生活适应和港漂经验整理，全部以公开生活信息和个人整理为基础。

免责声明：本网站为个人/学生自发整理的信息工具，内容仅供参考，不代表任何学校或机构官方立场。

## 技术栈

- Vite
- React
- TypeScript
- 纯静态 JSON 数据
- GitHub Pages 自动部署

项目不接入登录系统、不使用后端服务或平台专用 API，也不包含任何公开互动发布入口。

## 本地运行

```bash
npm install
npm run dev
```

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
```

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
- `backend`：预留给后端同学，后续如果做 API、CMS 或管理后台，从这里开始。
- 新功能使用独立分支，例如 `feature/search-filter`。
- 所有功能通过 Pull Request 合并到 `main`。
- 合并前至少确认 `npm run build` 通过。

## 当前限制

- 当前是纯静态数据版本，没有后台管理。
- 收藏使用浏览器 `localStorage`，只保存在当前设备。
- 搜索为前端本地搜索，适合 MVP 内容量。
- 复制功能依赖浏览器剪贴板权限，不同浏览器提示可能不同。
