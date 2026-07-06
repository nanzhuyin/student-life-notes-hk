# v1 分工板块

本文档用于把香港选课生活助手 v1 拆成四个可并行推进的板块：岭南大学、香港教育大学、整体 UI、后端。

开发约定：所有新工作先进入功能分支，不直接推 `main`。当前网页版 v1 基线分支为 `v1-web-staging`。

## 1. 岭南大学板块

负责人目标：把岭南大学课程库从“可浏览清单”推进到“可用于选课规划”的资料库。

主要范围：

- 维护岭南大学学校信息、学院、项目、课程。
- 核对 `course_catalog` 中导入的项目课程清单。
- 补齐课程字段：course code、课程英文名、课程中文名、学分、开课学期、先修要求、所属类别。
- 区分本科、授课型研究生、博士项目。
- 对课程来源进行标注：官网链接、PDF、handbook、核对日期。
- 输出适合前端筛选的项目分类：学历、学院、方向、关键词。

当前数据位置：

- `src/data/platformData.json`

建议后续拆分为：

- `src/data/lingnan/programmes.json`
- `src/data/lingnan/courses.json`
- `src/data/lingnan/sources.json`

验收标准：

- 岭南课程库可以按项目搜索和筛选。
- 每条课程至少有课程名、所属项目、课程类型、来源说明。
- 不确定字段不能编造，统一写“待官方资料核对”。

## 2. 香港教育大学板块

负责人目标：先把 EdUHK MSc(AIEP) 做成高质量样板，再扩展其他项目。

主要范围：

- 维护香港教育大学学校信息、AIEP 项目、课程和毕业要求。
- 确认中文授课和英文授课版本分开展示。
- 补齐 AIEP 的 course code、开课学期、先修要求、课程学分、课程类别。
- 建立研究生项目数据模板，后续扩展到其他 EdUHK programme。
- 整理毕业要求进度规则：核心课、选修课、项目课、总学分。

当前数据来源：

- EdUHK AAPSEF MSc(AIEP) 页面
- EdUHK AIDCEC MSc(AIEP) 页面
- 当前导入数据在 `src/data/platformData.json`

建议后续拆分为：

- `src/data/eduhk/programmes.json`
- `src/data/eduhk/courses.json`
- `src/data/eduhk/requirements.json`

验收标准：

- AIEP 中文授课 / 英文授课是两个可独立选择的项目版本。
- 毕业要求进度能正确计算 24 cps。
- 课程详情展示来源和核对日期。

## 3. 整体 UI 板块

负责人目标：把 v1 做成稳定、清晰、适合学生反复使用的网页产品。

主要范围：

- 首页信息架构。
- 学校切换体验。
- 课程库筛选和搜索体验。
- 课程详情页阅读体验。
- 我的计划和收藏体验。
- 共享生活内容的分区列表和详情页。
- 移动端适配。
- 空状态、加载状态、错误状态。

当前主要文件：

- `src/App.tsx`
- `src/styles.css`

建议后续拆分组件：

- `src/components/Header.tsx`
- `src/components/SearchBox.tsx`
- `src/components/SchoolSwitcher.tsx`
- `src/features/courses/*`
- `src/features/life/*`
- `src/features/plan/*`

UI 原则：

- 专业课程知识库必须是第一重点入口。
- 页面信息密度要适合查课，不做纯营销式首页。
- 不使用学校官方 logo，避免造成官方授权暗示。
- 颜色可参考学校气质，但要保持中性和非官方。
- 移动端优先保证搜索、筛选、课程详情可读。

验收标准：

- 桌面和手机都能完成：切学校、查课程、看详情、收藏、加入计划。
- 课程列表长数据下不卡顿到不可用。
- 搜索框、筛选器、按钮不互相遮挡。

## 4. 后端板块

负责人目标：把当前静态 JSON 版本升级为可维护、可审核、可协作的数据系统。

v1 当前状态：

- 纯前端静态数据。
- 收藏和计划保存在浏览器 `localStorage`。
- 管理视角只是演示，不会修改线上数据。

后端优先级：

1. 数据模型设计。
2. 管理员登录和权限。
3. 课程、项目、生活内容的 CRUD。
4. 内容审核流程。
5. 前端 API 接入。

建议数据表：

- `schools`
- `programmes`
- `courses`
- `requirements`
- `life_posts`
- `users`
- `course_favorites`
- `course_plans`
- `admin_users`
- `admin_invites`
- `audit_logs`

角色建议：

- 超级管理员：管理学校、管理员、全部数据。
- 学校内容管理员：维护对应学校课程数据。
- 生活内容管理员：维护共享生活内容。
- 审核员：审核投稿和修改记录。

验收标准：

- 前端可从 API 获取学校、项目、课程、生活内容。
- 管理端可编辑内容并保留来源、核对日期和修改记录。
- 用户收藏和计划可跨设备保存。
