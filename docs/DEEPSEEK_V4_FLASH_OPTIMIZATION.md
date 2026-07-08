# DeepSeek v4 Flash AI 优化方案

## 结论

Otter 只接入 `deepseek-v4-flash`。不做多模型切换，不让前端选择模型。

原因：

- 响应速度更适合学生端交互。
- 成本和排错更可控。
- 推荐质量主要来自我们的课程/专业知识库，不应该依赖模型自由发挥。
- 后端可以统一使用 JSON Output，方便校验和落库。

## 角色分工

```text
advisorKnowledge / Supabase = 事实和判断来源
本地规则 = 边界和打分
DeepSeek v4 flash = 中文表达、个性化解释、追问建议
```

AI 不负责决定事实。AI 不能编课程、不能编就业、不能编学校政策。

## 当前接入点

### 专业推荐

接口：

```http
POST /api/recommend-programmes
```

用途：

- 用户还没确定专业时，推荐 3 个左右候选专业。
- 用户已选专业时，先判断这个专业适不适合，再给替代方案。

输入：

- 学校
- 是否已有目标专业
- 本科/硕士背景
- 课程基础
- 技能
- 兴趣
- 职业目标
- 工作经验
- 顾虑

输出：

- 推荐专业
- 推荐原因
- 匹配点
- 关键课程
- 准备建议
- 潜在短板
- 职业连接

### 课程顾问

接口：

```http
POST /api/course-advisor
```

用途：

- 用户点进某一门课后，判断这门课怎么学、适不适合、怎么衔接就业。

输入：

- 课程 ID
- 年龄
- 是否应届生
- 工作经验
- 背景
- 目标
- 用户问题

输出：

- 适配度
- 推荐/不推荐原因
- 学习重点
- 职业连接
- 课程搭配
- 可继续追问的问题

## 关键优化

### 1. 单模型锁定

后端固定：

```js
const DEEPSEEK_V4_FLASH_MODEL = 'deepseek-v4-flash';
```

部署只需要：

```bash
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

不要再配置：

```bash
DEEPSEEK_MODEL
DEEPSEEK_COURSE_MODEL
```

### 2. 关闭 thinking

两个接口都使用：

```json
{
  "thinking": { "type": "disabled" }
}
```

原因：

- 课程推荐不需要长推理链。
- 我们已有结构化知识库和规则。
- 关闭 thinking 更快、更稳、更省。

### 3. 强制 JSON Output

两个接口都使用：

```json
{
  "response_format": { "type": "json_object" }
}
```

后端会继续校验：

- 推荐专业必须来自候选集
- 课程名必须来自知识库
- 输出字段必须完整
- 不得改官方英文名
- 不得编造就业数据

### 4. 知识库 grounding

课程顾问已接入：

- 当前课程知识卡
- 同专业课程知识卡
- retrievalRules
- 本地规则草稿

后续专业推荐也应逐步改成直接读取：

- `advisor_programmes`
- `advisor_courses`
- `advisor_rules`

而不是只读旧的 `programmes` 表。

### 5. 前端提示

用户端应该明确显示：

- 当前为 AI 辅助建议
- 基于 Otter 已整理课程库
- 不是学校官方意见
- 如果内容不足，会提示信息不足

不要让用户以为 AI 是官方招生顾问。

## 推荐流程

```text
用户画像
  ↓
后端校验登录状态
  ↓
读取 Supabase / 本地 advisorKnowledge
  ↓
规则引擎先打底
  ↓
只取相关专业/课程候选
  ↓
DeepSeek v4 flash 生成结构化中文解释
  ↓
后端 JSON 校验
  ↓
保存推荐日志
  ↓
前端展示
```

## 下一步

1. 把 `advisorKnowledge.json` 导入 Supabase。
2. 专业推荐接口改为优先读取 `advisor_programmes` 和 `advisor_courses`。
3. 管理端增加知识卡审核状态。
4. 用户反馈“有用/不准”，管理端可回看并修正规则。
5. 对 AIEP、Data Science、AI Future、Smart City 等高频专业人工精修。
