# Otter 课程顾问知识库流程

## 目标

课程顾问不能只做普通聊天机器人。核心资产应该是“专业 + 课程 + 人群适配 + 就业连接”的结构化知识库。AI 负责检索、组合和表达，但不能凭空编课程内容、就业承诺或学校政策。

当前第一版已经生成：

- 2 所学校
- 129 个专业
- 3258 门课程
- AIEP 20 条课程记录已做人工规则覆盖
- 其余课程由官网来源、课程标题、描述、标签、学院单位和现有课程资料自动分析

主文件：

- `src/data/advisorKnowledge.json`
- `scripts/build-advisor-knowledge.mjs`
- `scripts/import-advisor-knowledge-to-supabase.mjs`
- `docs/advisor-knowledge-review.md`

## 数据结构

`advisorKnowledge.json` 分三层：

1. `meta`
   - 版本号
   - 生成时间
   - 来源数据版本
   - 专业/课程数量
   - 免责声明

2. `retrievalRules`
   - 必修课规则
   - Data Science 数学门槛规则
   - 资深文科/媒体背景规则
   - 应届生就业作品集规则
   - AI grounding 规则

3. `programmeKnowledge`
   - 每个专业一条
   - 学校、学院、单位、授课语言、课程数量、官网来源
   - 技术/数学/编程/阅读/实践强度
   - 适合人群
   - 不适合人群
   - 职业方向
   - 学习重点
   - 检索关键词

4. `courseKnowledge`
   - 每门课一条
   - 课程中英文名、课程类型、是否必修、学分、授课语言、来源链接
   - 技术强度、数学强度、编程强度、阅读强度、实践强度
   - 适合人群
   - 不适合人群
   - 职业方向
   - 学习重点
   - 风险提醒
   - 推荐摘要
   - 证据摘要
   - 置信状态

## Supabase 推荐表结构

第一阶段可以直接把 JSON 导入 Supabase，后续拆表：

### advisor_programmes

- `id`
- `school_id`
- `title`
- `title_en`
- `faculty`
- `unit_name`
- `medium`
- `course_count`
- `source_url`
- `checked_at`
- `domains jsonb`
- `intensity jsonb`
- `suitable_for jsonb`
- `less_suitable_for jsonb`
- `career_directions jsonb`
- `study_focus jsonb`
- `advisor_summary`
- `retrieval_keywords jsonb`
- `confidence`
- `review_status`

### advisor_courses

- `id`
- `base_id`
- `programme_id`
- `school_id`
- `title`
- `title_zh`
- `type_key`
- `required`
- `credits`
- `medium`
- `source_url`
- `checked_at`
- `domains jsonb`
- `intensity jsonb`
- `suitable_for jsonb`
- `less_suitable_for jsonb`
- `career_directions jsonb`
- `study_focus jsonb`
- `learning_gains jsonb`
- `risk_warnings jsonb`
- `advisor_summary`
- `retrieval_keywords jsonb`
- `evidence_summary`
- `confidence`
- `review_status`

### advisor_rules

- `id`
- `priority`
- `rule`
- `enabled`

### advisor_reviews

- `id`
- `target_type`
- `target_id`
- `reviewer`
- `status`
- `notes`
- `updated_at`

## AI 检索流程

用户输入：

- 年龄
- 是否应届生
- 学校
- 专业
- 课程
- 本科/工作背景
- 工作经验
- 数学、统计、编程基础
- 目标：就业、转型、开阔视野、读博、管理升级等
- 想问的问题

后端流程：

1. 解析用户画像
2. 按学校、专业、课程筛选知识库
3. 读取 `retrievalRules`
4. 对课程打分：
   - 必修课：固定为必须学，只分析学习重点
   - 选修课：按技术/数学/编程门槛和用户背景判断
   - 项目课：按作品集、就业、原型输出判断
5. 检索同专业可搭配课程
6. 把候选课程、规则和用户画像发送给 DeepSeek
7. DeepSeek 只负责组织语言：
   - 说明适合/不适合
   - 给出原因
   - 连接就业或职业升级
   - 推荐学习重点
   - 提醒风险
8. 保存推荐记录和用户反馈

## 为什么不直接让 AI 判断

不能让 AI 看到“Data Science”就自动说适合所有人。平台需要先有自己的判断：

- Data Science 偏统计学、算法和编程
- 适合想走数据、统计、产品分析或技术路线的人
- 不适合没有量化基础、只想拓宽视野的资深文科/媒体从业者作为首选

所以最稳的架构是：

```text
结构化知识库 -> 固定规则 -> 检索候选课程 -> DeepSeek 生成表达 -> 用户反馈 -> 管理端复审
```

AI 是表达层，不是事实源。

## 当前置信状态

- `curated-aiep-rule`
  - AIEP 已人工覆盖，尤其是 Data Science、Privacy、Trends、人文与 AI、项目课。

- `curated-first-pass`
  - 原课程数据中已经有较完整的 selectionAdvice / perspectiveSummary。

- `auto-from-official-description`
  - 根据官网课程描述自动分析，后续需要分批人工审核。

- `auto-from-title-only`
  - 只有标题或信息较少的课程，必须优先复核。

## 后续迭代

1. 把 `advisorKnowledge.json` 导入 Supabase
2. `/api/course-advisor` 改为读取 `advisor_courses`
3. 管理端增加课程知识卡审核入口
4. 支持用户反馈“推荐是否准确”
5. 对高访问专业优先人工精修
6. 第二阶段再加 pgvector 向量检索
7. DeepSeek 接入后只使用检索到的课程卡生成回答

## 常用命令

重新生成知识库：

```bash
npm run build:advisor-knowledge
```

导入 Supabase：

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
npm run import:advisor-knowledge
```

Windows PowerShell：

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
npm run import:advisor-knowledge
```
