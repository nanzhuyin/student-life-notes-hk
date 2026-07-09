# 前后端交互文档

项目名称：放牛娃的浮生日记  
英文副名：Student Life Notes in Hong Kong

本文定义 REST API 的前后端交互约定。当前前端以 `src/data/platformData.json` 作为主要静态数据源，并通过后端逐步接入登录、投稿、管理和 AI 功能。

免责声明固定文案：

```text
本网站为个人/学生自发整理的信息工具，内容仅供参考，不代表任何学校或机构官方立场。
```

## 1. API 概览

当前前端需要的公开接口：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/posts` | 获取文章列表，支持分类、关键词、标签和分页 |
| `GET` | `/api/posts/:id` | 获取文章详情 |
| `GET` | `/api/categories` | 获取分类列表 |
| `GET` | `/api/tags` | 获取热门标签 |

未来预留管理员接口：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `POST` | `/api/admin/posts` | 管理员创建文章 |
| `PUT` | `/api/admin/posts/:id` | 管理员更新文章 |
| `DELETE` | `/api/admin/posts/:id` | 管理员删除文章 |

约束：

- 普通访问者只能浏览、搜索、收藏或复制信息。
- 不定义普通访问者账号体系、公开留言或公开发布能力。
- 内容只由管理员维护。
- 若未来有管理后台，也只允许管理员发布、修改、归档或删除内容。
- 所有公开列表和详情接口默认只返回 `status = "published"` 的内容。

## 2. 数据模型

### 2.1 Post

```ts
type PostStatus = 'published' | 'draft' | 'archived';

type SourceType = 'public_web' | 'personal_notes' | 'admin_research';

interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string[];
  category: string;
  tags: string[];
  area: string;
  images: string[];
  coverImage: string | null;
  sourceType: SourceType;
  sourceNote: string;
  status: PostStatus;
  updatedAt: string;
  createdAt: string;
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 全局唯一 ID，建议后端生成 |
| `title` | `string` | 标题 |
| `slug` | `string` | 可读 URL 标识，建议英文小写短横线 |
| `summary` | `string` | 摘要，列表页展示 |
| `content` | `string[]` | 正文段落数组，前端逐段渲染 |
| `category` | `string` | 分类 key |
| `tags` | `string[]` | 标签 |
| `area` | `string` | 地区或范围关键词 |
| `images` | `string[]` | 图片 URL 数组 |
| `coverImage` | `string | null` | 列表封面图 |
| `sourceType` | `SourceType` | 信息来源类型 |
| `sourceNote` | `string` | 信息来源说明 |
| `status` | `PostStatus` | 内容状态 |
| `updatedAt` | `string` | ISO 8601 时间，例如 `2026-07-06T08:00:00.000Z` |
| `createdAt` | `string` | ISO 8601 时间 |

状态说明：

| 状态 | 说明 |
| --- | --- |
| `published` | 已发布，公开页面可见 |
| `draft` | 草稿，仅管理员可见 |
| `archived` | 已归档，公开页面不可见 |

来源类型说明：

| 类型 | 说明 |
| --- | --- |
| `public_web` | 公开网页资料整理 |
| `personal_notes` | 个人经验笔记整理 |
| `admin_research` | 管理员自行核对整理 |

### 2.2 Category

```ts
interface Category {
  key: string;
  name: string;
  description: string;
  order: number;
}
```

当前前端分类建议：

| key | name |
| --- | --- |
| `hk_rent` | 香港租房 |
| `sz_commute` | 港深通勤 |
| `hk_life` | 新生入学指导 |
| `nearby_food` | 附近美食 |
| `transport_spots` | 出行与景点 |
| `course_catalog` | 专业课程库 |

### 2.3 Tag

```ts
interface Tag {
  name: string;
  count: number;
}
```

## 3. 通用响应格式

列表接口建议返回：

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

详情接口建议返回：

```json
{
  "data": {}
}
```

错误响应建议返回：

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "资源不存在",
    "requestId": "req_202607060001"
  }
}
```

## 4. 接口定义

### 4.1 获取文章列表

```http
GET /api/posts
```

Query：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `category` | `string` | 否 | 分类 key |
| `keyword` | `string` | 否 | 搜索标题、摘要、正文、标签、地区 |
| `tag` | `string` | 否 | 标签名 |
| `page` | `number` | 否 | 页码，默认 `1` |
| `pageSize` | `number` | 否 | 每页数量，默认 `10`，建议最大 `50` |

Request 示例：

```http
GET /api/posts?category=hk_rent&keyword=%E5%B1%AF%E9%97%A8&page=1&pageSize=10
```

Response 示例：

```json
{
  "data": [
    {
      "id": "rent-tuen-mun-example",
      "title": "屯门租房预算参考",
      "summary": "整理几个常见居住区域的预算、通勤和生活便利度。",
      "category": "hk_rent",
      "tags": ["香港租房", "屯门", "预算"],
      "area": "香港 / 新界 / 屯门",
      "updatedAt": "2026-07-06T08:00:00.000Z",
      "coverImage": null,
      "sourceType": "personal_notes",
      "disclaimer": "本网站为个人/学生自发整理的信息工具，内容仅供参考，不代表任何学校或机构官方立场。"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

排序建议：

1. 若有 `keyword`，优先返回标题和标签命中的内容；
2. 其次按 `updatedAt` 倒序；
3. 同一更新时间下按 `id` 稳定排序。

### 4.2 获取文章详情

```http
GET /api/posts/:id
```

Request 示例：

```http
GET /api/posts/rent-tuen-mun-example
```

Response 示例：

```json
{
  "data": {
    "id": "rent-tuen-mun-example",
    "title": "屯门租房预算参考",
    "content": [
      "这篇内容整理几个常见居住区域的预算、通勤和生活便利度。",
      "价格和体验会随时间变化，实际签约前应再次核对房源、合同和交通安排。"
    ],
    "category": "hk_rent",
    "tags": ["香港租房", "屯门", "预算"],
    "area": "香港 / 新界 / 屯门",
    "updatedAt": "2026-07-06T08:00:00.000Z",
    "images": [],
    "sourceType": "personal_notes",
    "disclaimer": "本网站为个人/学生自发整理的信息工具，内容仅供参考，不代表任何学校或机构官方立场。"
  }
}
```

### 4.3 获取分类列表

```http
GET /api/categories
```

Response 示例：

```json
{
  "data": [
    {
      "key": "hk_rent",
      "name": "香港租房",
      "description": "租房区域、预算和通勤参考",
      "order": 1
    },
    {
      "key": "sz_commute",
      "name": "港深通勤",
      "description": "深圳居住、口岸和跨境路线",
      "order": 2
    },
    {
      "key": "hk_life",
      "name": "新生入学指导",
      "description": "到港路线、生活办理和开学前后提醒",
      "order": 3
    },
    {
      "key": "nearby_food",
      "name": "附近美食",
      "description": "日常餐饮、价格和位置参考",
      "order": 4
    },
    {
      "key": "transport_spots",
      "name": "出行与景点",
      "description": "常用目的地路线和时间参考",
      "order": 5
    },
    {
      "key": "course_catalog",
      "name": "专业课程库",
      "description": "按学历、方向和项目查看公开课程清单",
      "order": 6
    }
  ]
}
```

### 4.4 获取热门标签

```http
GET /api/tags
```

Response 示例：

```json
{
  "data": [
    {
      "name": "香港租房",
      "count": 52
    },
    {
      "name": "港深通勤",
      "count": 6
    },
    {
      "name": "电话卡",
      "count": 1
    }
  ]
}
```

### 4.5 管理员创建文章，未来预留

```http
POST /api/admin/posts
```

说明：

- 仅管理员维护内容时使用。
- 本接口不面向普通访问者。
- 管理员凭证方式由后端实现决定，本文不定义普通用户账号体系。
- 新文章可保存为 `draft` 或 `published`。

Request 示例：

```json
{
  "title": "香港电话卡选择参考",
  "slug": "hk-sim-card-guide",
  "summary": "整理几类常见电话卡选择和使用注意事项。",
  "content": [
    "刚到香港可以先选择短期储值卡，后续再根据使用习惯调整套餐。",
    "购买前应确认是否需要实名登记、是否支持本地号码和短信接收。"
  ],
  "category": "hk_life",
  "tags": ["新生入学指导", "电话卡", "生活适应"],
  "area": "香港",
  "images": [],
  "coverImage": null,
  "sourceType": "admin_research",
  "sourceNote": "管理员根据公开资料整理",
  "status": "draft"
}
```

Response 示例：

```json
{
  "data": {
    "id": "post_202607060001",
    "title": "香港电话卡选择参考",
    "slug": "hk-sim-card-guide",
    "summary": "整理几类常见电话卡选择和使用注意事项。",
    "content": [
      "刚到香港可以先选择短期储值卡，后续再根据使用习惯调整套餐。",
      "购买前应确认是否需要实名登记、是否支持本地号码和短信接收。"
    ],
    "category": "hk_life",
    "tags": ["新生入学指导", "电话卡", "生活适应"],
    "area": "香港",
    "images": [],
    "coverImage": null,
    "sourceType": "admin_research",
    "sourceNote": "管理员根据公开资料整理",
    "status": "draft",
    "updatedAt": "2026-07-06T08:00:00.000Z",
    "createdAt": "2026-07-06T08:00:00.000Z"
  }
}
```

### 4.6 管理员更新文章，未来预留

```http
PUT /api/admin/posts/:id
```

Request 示例：

```http
PUT /api/admin/posts/post_202607060001
```

```json
{
  "summary": "更新电话卡选择、实名登记和使用注意事项。",
  "status": "published",
  "updatedAt": "2026-07-06T09:30:00.000Z"
}
```

Response 示例：

```json
{
  "data": {
    "id": "post_202607060001",
    "title": "香港电话卡选择参考",
    "slug": "hk-sim-card-guide",
    "summary": "更新电话卡选择、实名登记和使用注意事项。",
    "content": [
      "刚到香港可以先选择短期储值卡，后续再根据使用习惯调整套餐。",
      "购买前应确认是否需要实名登记、是否支持本地号码和短信接收。"
    ],
    "category": "hk_life",
    "tags": ["新生入学指导", "电话卡", "生活适应"],
    "area": "香港",
    "images": [],
    "coverImage": null,
    "sourceType": "admin_research",
    "sourceNote": "管理员根据公开资料整理",
    "status": "published",
    "updatedAt": "2026-07-06T09:30:00.000Z",
    "createdAt": "2026-07-06T08:00:00.000Z"
  }
}
```

### 4.7 管理员删除文章，未来预留

```http
DELETE /api/admin/posts/:id
```

建议：

- 优先软删除：将 `status` 改为 `archived`。
- 如必须物理删除，后端应保留操作日志。

Request 示例：

```http
DELETE /api/admin/posts/post_202607060001
```

Response 示例：

```json
{
  "data": {
    "id": "post_202607060001",
    "status": "archived",
    "deleted": true
  }
}
```

## 5. 错误码

| HTTP 状态 | code | 说明 |
| --- | --- | --- |
| `400` | `BAD_REQUEST` | 请求参数格式错误 |
| `400` | `VALIDATION_ERROR` | 字段校验失败 |
| `401` | `ADMIN_AUTH_REQUIRED` | 管理员凭证缺失或无效 |
| `403` | `ADMIN_FORBIDDEN` | 当前凭证无管理员权限 |
| `404` | `NOT_FOUND` | 资源不存在 |
| `409` | `SLUG_CONFLICT` | `slug` 已存在 |
| `422` | `INVALID_STATUS` | 状态值不允许 |
| `500` | `INTERNAL_ERROR` | 服务端内部错误 |

错误示例：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title 不能为空",
    "requestId": "req_202607060002"
  }
}
```

## 6. 当前静态 JSON 如何模拟接口

当前前端主要静态数据源：

```ts
import platformDataJson from './data/platformData.json';
```

当前静态字段和未来 API 字段映射：

| 当前字段 | 未来 API 字段 | 说明 |
| --- | --- | --- |
| `id` | `id` | 保持一致 |
| `title` | `title` | 保持一致 |
| 无 | `slug` | 可由 `id` 临时替代 |
| `summary` | `summary` | 保持一致 |
| `content` | `content` | 保持一致，均为段落数组 |
| `category` | `category` | 保持一致 |
| `tags` | `tags` | 保持一致 |
| `region` | `area` | 前端可临时把 `region` 当作 `area` |
| 无 | `images` | 当前可返回空数组 |
| 无 | `coverImage` | 当前可返回 `null` |
| `source` | `sourceNote` | 当前来源说明 |
| `source` | `sourceType` | 可按来源文本映射为 `public_web`、`personal_notes` 或 `admin_research` |
| 无 | `status` | 当前静态内容默认视为 `published` |
| `updatedAt` | `updatedAt` | 当前是 `YYYY-MM-DD`，后端建议 ISO 8601 |
| 无 | `createdAt` | 当前可临时等于 `updatedAt` |

前端可以先封装一个本地数据服务，例如：

```ts
export async function fetchPosts(query: {
  category?: string;
  keyword?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}) {
  // 当前版本：从 src/data/platformData.json 的 posts 数据过滤和分页
  // 后端接入后：替换为 fetch('/api/posts?...')
}
```

## 7. 后端未来如何替换静态 JSON

建议替换步骤：

1. 前端新增 `src/services/api.ts`，把列表、详情、分类、标签读取都集中到服务层。
2. 当前服务层先读取 `src/data/platformData.json` 并模拟 REST 返回结构。
3. 后端完成 `/api/posts`、`/api/posts/:id`、`/api/categories`、`/api/tags` 后，前端只替换服务层实现。
4. 保持页面组件只依赖统一的 `Post`、`Category`、`Tag` 类型，不直接依赖后端数据库字段。
5. 管理员接口上线前，不在公开页面暴露任何发布入口。
6. 管理员接口上线后，也只进入管理后台，不进入公开访问者页面。

前端环境变量建议：

```text
VITE_API_BASE_URL=https://api.example.com
```

前端调用示例：

```ts
const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
const response = await fetch(`${baseUrl}/api/posts?page=1&pageSize=10`);
```

## 8. 分支协作建议

推荐分支：

- `frontend`：前端页面、样式、静态数据和 API 接入适配。
- `backend`：后端 REST API、数据库、管理员后台能力。
- `main`：稳定部署分支，用于 GitHub Pages 或正式环境部署。

协作流程：

1. 新功能从 `frontend` 或 `backend` 切出独立分支，例如 `feature/api-service-layer`。
2. 前后端通过本文档确认字段和接口，不直接改彼此分支里的实现细节。
3. 后端接口还没完成时，前端继续使用静态 JSON mock。
4. 后端接口完成后，前端只替换服务层，不重写页面。
5. 合并到 `main` 前，至少确认：
   - 前端 `npm run build` 通过；
   - API response 符合本文档；
   - 公开页面没有普通用户发布入口；
   - 公开页面保留免责声明。
