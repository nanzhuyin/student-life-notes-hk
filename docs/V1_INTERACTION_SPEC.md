# v1 交互文档

本文档描述香港选课生活助手 v1 的页面、状态、路由和核心交互，方便前端、数据和后端分工实现。

## 1. 信息架构

产品分为两层：

- 学校层：香港教育大学、岭南大学。
- 内容层：专业课程知识库独立，生活内容共享。

课程相关内容按学校隔离：

- 课程库
- 课程详情
- 收藏课程
- 我的计划
- 毕业要求进度

共享生活内容不按学校隔离：

- 香港租房
- 港深通勤
- 新生入学指导
- 附近美食
- 出行与景点

## 1.1 同事阅读顺序

建议把同事分成四组后，让每组先读对应文档：

| 小组 | 先读 | 再读 | 主要产出 |
| --- | --- | --- | --- |
| 岭南大学组 | `docs/V1_WORKSTREAMS.md` 的“岭南大学板块” | 本文档第 5、6、9 节 | 岭南项目和课程数据 |
| 香港教育大学组 | `docs/V1_WORKSTREAMS.md` 的“香港教育大学板块” | 本文档第 5、6、7、9 节 | EdUHK AIEP 和后续项目数据 |
| 整体 UI 组 | 本文档第 2-10 节 | `docs/V1_WORKSTREAMS.md` 的“整体 UI 板块” | 页面组件、交互、响应式样式 |
| 后端组 | 本文档第 3、11、12 节 | `docs/V1_WORKSTREAMS.md` 的“后端板块” | 数据库、API、鉴权、管理端 |

沟通原则：

- 课程数据组只定义和维护数据，不直接重写 UI。
- UI 组可以调整组件和展示方式，但不要擅自改课程事实数据。
- 后端组定义 API 前，先和两个课程数据组确认字段。
- 所有改动先开独立分支，再向 `v1-web-staging` 提 PR。

## 2. 路由设计

当前使用 hash 路由，适配 GitHub Pages。

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `#/` | 首页 | 学校切换、搜索、功能分类、课程入口 |
| `#/courses` | 课程库 | 当前学校课程库 |
| `#/courses?programme=<id>` | 课程库 | 打开指定项目 |
| `#/course/<id>` | 课程详情 | 查看单门课程 |
| `#/section/<id>` | 生活分区 | 查看共享生活内容 |
| `#/post/<id>` | 生活内容详情 | 查看单篇生活内容 |
| `#/search?q=<keyword>` | 搜索结果 | 搜索当前学校课程 + 共享生活内容 |
| `#/plan` | 我的计划 | 当前学校收藏和计划 |
| `#/admin` | 管理视角 | v1 演示管理入口 |
| `#/about` | 关于 / v1 总结 | 产品说明 |

路由约定：

- 所有页面都使用 hash 路由，不能改成 browser history 路由，否则 GitHub Pages 刷新会 404。
- 课程详情和生活内容详情必须使用稳定 `id`，不要用数组下标。
- UI 组新增页面时，需要先在本文档登记路由。
- 后端接入后，前端路由不变，只替换数据来源。

## 3. 全局状态

### 3.1 当前学校

字段：`activeSchoolId`

取值：

- `eduhk`
- `lingnan`

当前 v1 存储：

- `localStorage["student-life-notes:active-school"]`

交互规则：

- 用户点击顶部学校切换按钮后，立即切换当前学校。
- 首页统计、课程库、我的计划同步切换。
- 生活内容不随学校切换而变化。

### 3.2 收藏课程

当前 v1 存储：

- `student-life-notes:favorite-courses:eduhk`
- `student-life-notes:favorite-courses:lingnan`

交互规则：

- 点击“收藏”后加入当前学校收藏。
- 再次点击“已收藏”后取消收藏。
- 切换学校后，只显示对应学校收藏。

### 3.3 我的计划

当前 v1 存储：

- `student-life-notes:planned-courses:eduhk`
- `student-life-notes:planned-courses:lingnan`

交互规则：

- 点击“加入计划”后加入当前学校计划。
- 再次点击“已加入”后移除计划。
- EdUHK AIEP 显示学分进度。
- Lingnan 当前先显示课程数量，等课程学分核对后再升级为学分进度。

### 3.4 管理视角状态

当前 v1 存储：

- `student-life-notes:admin`

交互规则：

- 输入演示邀请码 `EDU-AIEP-2026` 后进入管理视角。
- 这个状态只用于前端演示，不代表真实权限。
- 后端上线后必须替换成真实登录和角色鉴权。

### 3.5 状态归属

| 状态 | 当前实现 | 未来归属 |
| --- | --- | --- |
| 当前学校 | localStorage | 前端本地即可，登录后可同步到用户偏好 |
| 收藏课程 | localStorage | 后端用户数据 |
| 我的计划 | localStorage | 后端用户数据 |
| 管理员登录 | localStorage 演示 | 后端鉴权 |
| 课程数据 | 静态 JSON | 后端数据库或 CMS |
| 生活内容 | 静态 JSON | 后端数据库或 CMS |

## 4. 首页交互

首页目标：让用户先确认学校，再进入课程库或生活分区。

模块：

1. 顶部导航
2. 学校切换
3. 全局搜索
4. 功能分类
5. 当前学校课程入口
6. 共享推荐内容

行为：

- 点击“香港教育大学 / 岭南大学”切换学校。
- 点击“专业课程知识库”进入 `#/courses`。
- 点击生活分类进入对应 `#/section/<id>`。
- 搜索提交后进入 `#/search?q=<keyword>`。

首页验收：

- 用户一眼能看到当前学校。
- 用户能在 1 次点击内进入课程库。
- 专业课程知识库必须排在功能分类第一位。
- 切换学校后，首页课程统计必须同步变化。
- 生活内容入口不因学校切换消失。

## 5. 课程库交互

课程库目标：按当前学校查项目和课程。

控件：

- 关键词搜索
- 项目选择
- 课程类型筛选

筛选顺序：

1. 当前学校
2. 当前项目
3. 课程类型
4. 关键词

课程卡片显示：

- 课程中文名 / 主标题
- 课程代码
- 所属项目
- 课程类型
- 学分
- 授课语言或安排说明
- 收藏按钮
- 加入计划按钮

点击课程卡片主区域进入 `#/course/<id>`。

空状态：

- 当前项目没有课程：显示“该项目暂无课程，等待资料补充”。
- 搜索没有结果：显示“没有找到匹配课程，换个关键词试试”。
- 字段未核对：显示“待官方资料核对”，不能留空或编造。

性能要求：

- 岭南当前有 2572 条课程，课程库不能一次展示全校所有课程。
- 必须先选项目，再展示该项目课程。
- 搜索范围是当前项目下课程，不做全量无限列表。

## 6. 课程详情交互

课程详情目标：让用户判断这门课是否适合收藏或加入计划。

展示字段：

- 学校
- 课程名称
- 课程代码
- 所属项目
- 学院 / 方向
- 课程类型
- 学分
- 开课学期
- 先修要求
- 课程简介
- 来源链接
- 核对日期

操作：

- 收藏课程
- 加入计划
- 返回课程库

字段显示规则：

- `courseCode` 如果未知，显示“待官网 course catalogue 进一步核对”。
- `creditsText` 优先显示文本字段，例如 `3 cps` 或“待官方资料核对”。
- `semester` 未知时显示“待官网 handbook / course catalogue 进一步核对”。
- `prerequisites` 未知时显示“待官网 handbook / course catalogue 进一步核对”。
- `sourceUrl` 不是官网时，需要在备注中说明是学生整理来源，正式使用前需要核对。

数据组注意：

- 同一课程如果中文授课和英文授课不同，应拆成两条课程或两个项目版本。
- 不要用同一个课程 id 表示两个授课语言版本。

## 7. 我的计划交互

页面目标：按当前学校整理学生自己的课程意向。

展示：

- 当前学校
- 计划课程
- 收藏课程
- EdUHK AIEP 学分进度
- Lingnan 课程数量进度

操作：

- 从计划中移除课程
- 取消收藏
- 点击课程进入详情
- 继续选课

毕业进度规则：

- EdUHK AIEP：使用 24 cps 总学分、核心 12 cps、选修 6 cps、项目 6 cps。
- Lingnan：暂时只统计课程数量，等学分字段核对后再做学分进度。

边界情况：

- 课程从数据中删除后，计划页应忽略无法匹配的旧 id。
- 切换学校后，计划页必须读取对应学校的 localStorage key。

## 8. 共享生活内容交互

生活内容目标：两个学校一起使用。

分区：

- `housing`：香港租房
- `commute`：港深通勤
- `new-student`：新生入学指导
- `food`：附近美食
- `travel`：出行与景点

列表卡片展示：

- 标题
- 摘要
- 地区
- 更新时间

共享规则：

- 生活内容不绑定学校。
- 如果某条内容只适合某个学校，应在标题、标签或正文里明确说明。
- 生活内容可以有地区字段，例如“大埔”“屯门”“深圳湾”“西九龙”。

投稿后端上线前：

- v1 不提供真实公开投稿。
- 如果 UI 需要展示投稿入口，必须标注“即将开放”或接入后端审核流程。
- 标签

详情展示：

- 标题
- 正文段落
- 标签
- 来源说明
- 更新时间

## 9. 搜索交互

搜索范围：

- 当前学校课程
- 共享生活内容

搜索字段：

- 课程：标题、代码、项目、类型、标签
- 生活内容：标题、摘要、正文、地区、标签

结果分组：

- 课程结果
- 生活内容结果

搜索验收：

- 搜索“AIEP”能找到 EdUHK 相关课程。
- 搜索“岭南”或岭南课程关键词能找到当前学校下课程。
- 搜索“租房”“通勤”“机场”等能找到共享生活内容。
- 搜索结果必须分组展示，避免课程和生活内容混在一起。

## 10. 管理视角交互

v1 管理视角是演示版。

入口：

- 顶部“管理视角”
- 路由 `#/admin`

邀请码：

- `EDU-AIEP-2026`

展示：

- 学校数量
- 项目数量
- 课程数量
- 共享生活内容数量
- 当前学校切换

后端上线后，管理视角应改为真实登录和权限控制。

管理视角 v1 不做：

- 不做真实数据写入。
- 不做公开注册。
- 不做真实管理员邀请。
- 不做删除线上内容。

后端上线后才做：

- 登录
- 角色权限
- 数据编辑
- 审核流
- 操作日志

## 11. 后端 API 草案

建议接口：

```text
GET /api/schools
GET /api/schools/:schoolId/programmes
GET /api/programmes/:programmeId/courses
GET /api/courses/:courseId
GET /api/life-posts?sectionId=
GET /api/life-posts/:postId
POST /api/favorites/courses
DELETE /api/favorites/courses/:courseId
POST /api/plans/courses
DELETE /api/plans/courses/:courseId
POST /api/admin/invites
```

所有课程和生活内容修改应记录：

- 修改人
- 修改时间
- 修改字段
- 来源链接
- 核对日期
- 审核状态

## 12. 数据字段契约

### 12.1 School

```ts
type School = {
  id: 'eduhk' | 'lingnan';
  shortName: string;
  name: string;
  nameEn: string;
  accent: string;
  description: string;
}
```

### 12.2 Programme

```ts
type Programme = {
  id: string;
  schoolId: 'eduhk' | 'lingnan';
  school: string;
  faculty: string;
  title: string;
  medium: string;
  mediumDetail: string;
  programmeCodes: string[];
  studyModes: string[];
  totalCredits: number | null;
  courseCount?: number;
  sourceUrl?: string;
  checkedAt?: string;
  requirements: {
    core: number | null;
    elective: number | null;
    project: number | null;
    note: string;
  };
}
```

### 12.3 Course

```ts
type Course = {
  id: string;
  programmeId: string;
  programmeTitle: string;
  schoolId: 'eduhk' | 'lingnan';
  school: string;
  faculty?: string;
  title: string;
  titleZh: string;
  type: string;
  typeKey: 'core' | 'elective' | 'project' | 'general';
  credits: number | null;
  creditsText: string;
  required: boolean;
  description: string;
  medium: string;
  mediumDetail: string;
  programmeCodes: string[];
  sourceUrl: string;
  checkedAt: string;
  semester: string;
  prerequisites: string;
  courseCode: string;
  tags: string[];
  notes?: string;
}
```

### 12.4 SharedPost

```ts
type SharedPost = {
  id: string;
  sectionId: 'housing' | 'commute' | 'new-student' | 'food' | 'travel';
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  region?: string;
  source?: string;
  authorRole: string;
  createdAt: string;
  status: 'published' | string;
  shared?: boolean;
  recommended?: boolean;
}
```

## 13. 分支和 PR 规则

基线分支：

- `v1-web-staging`

所有人从 `v1-web-staging` 拉自己的功能分支。

建议分支命名：

- `feature/lingnan-course-data`
- `feature/eduhk-aiep-data`
- `feature/ui-course-library`
- `feature/backend-schema`
- `fix/search-empty-state`

PR 合并方向：

```text
feature/* -> v1-web-staging -> main
```

禁止：

- 直接 push 到 `main`。
- 未经确认把 staging 合并到 `main`。
- 在数据 PR 里大改 UI。
- 在 UI PR 里重写课程事实数据。

每个 PR 必须写：

- 改了什么。
- 影响哪个板块。
- 如何测试。
- 是否新增或修改数据字段。
- 是否需要后端配合。

## 14. 给同事的分工话术

可以直接把下面这段发给团队：

```text
我们现在做的是香港选课生活助手网页版 v1，代码基线在 v1-web-staging 分支，不要直接推 main。

项目分四组：

1. 岭南大学组：负责岭南项目和课程数据，重点核对 programme、course code、学分、开课学期、先修要求和来源。先看 docs/V1_WORKSTREAMS.md 的岭南板块，再看 docs/V1_INTERACTION_SPEC.md 第 5、6、9、12 节。

2. 香港教育大学组：负责 EdUHK，先把 MSc(AIEP) 做成样板，中文授课和英文授课分开维护。先看 docs/V1_WORKSTREAMS.md 的教大板块，再看 docs/V1_INTERACTION_SPEC.md 第 5、6、7、12 节。

3. 整体 UI 组：负责首页、学校切换、课程库、课程详情、计划页、生活内容页和移动端体验。不要改课程事实数据。先看 docs/V1_INTERACTION_SPEC.md 全文，重点第 2-10 节。

4. 后端组：负责数据库、API、管理员、用户收藏和选课计划同步。先看 docs/V1_INTERACTION_SPEC.md 第 3、11、12、13 节，再看 docs/V1_WORKSTREAMS.md 的后端板块。

所有人从 v1-web-staging 新建 feature 分支，完成后提 PR 回 v1-web-staging。PR 里写清楚改动、测试方式、影响范围。确认后再讨论是否合并 main。
```

## 15. 当前 branch 说明

当前网页版 v1 推送在：

```text
origin/v1-web-staging
```

当前 `main` 已恢复为原项目版本。v1 内容不要直接推 `main`。
