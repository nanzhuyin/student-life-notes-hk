# DeepSeek 课程 AI 顾问接入说明

本版本已在课程详情页加入“AI 课程顾问”。用户可以填写年龄、工作经验、是否应届生、专业背景、目标和具体问题，系统会结合当前课程库给出课程学习重点、就业衔接和课程搭配建议。

## 当前状态

- 前端入口：每门课程详情页的“背景视角与就业衔接”下方。
- 后端接口：`POST /api/course-advisor`。
- 本地调试：未配置 DeepSeek 时自动使用本地规则库，页面可直接测试。
- DeepSeek 接入：配置环境变量后自动优先调用 DeepSeek，失败时回退本地规则库。

## DeepSeek 环境变量

Render 后端服务添加：

```bash
DEEPSEEK_API_KEY=你的 DeepSeek Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

本项目只接入 `deepseek-v4-flash`。模型名已在后端固定，不需要配置 `DEEPSEEK_MODEL` 或 `DEEPSEEK_COURSE_MODEL`。

## 技术路线

1. 前端把用户画像和当前课程 ID 发到 `/api/course-advisor`。
2. 后端读取 `src/data/platformData.json` 中的课程知识库。
3. 后端先生成一份本地规则库结果，保证无 Key 时也能回答。
4. 如果存在 `DEEPSEEK_API_KEY`，后端把当前课程、同项目课程、课程顾问知识卡、检索规则、用户画像和本地草稿一起发给 DeepSeek v4 flash。
5. DeepSeek 必须返回 JSON；后端会规范字段并返回给前端。

## 输出结构

```json
{
  "summary": "一句总结",
  "fitLevel": "required | high | medium | low",
  "fitScore": 0,
  "keyReasons": ["为什么这样判断"],
  "mustLearnNote": "必修课提示",
  "recommendedFocus": ["建议深化"],
  "careerConnection": ["就业或职业连接"],
  "suggestedCourseCombination": ["课程搭配建议"],
  "nextQuestionPrompts": ["可继续追问的问题"],
  "source": "deepseek | local-rules",
  "disclaimer": "参考说明"
}
```

## 必修课规则

如果课程是必修课，顾问不会把它当作“要不要选”的问题，而会明确提示：

> 这是必修课，不能作为“是否选择”的问题处理；更重要的是根据你的背景决定学习重点和项目表达方式。

选修课和项目课才会进行适配度判断。

## 本地测试

前端：

```bash
npm run dev
```

后端：

```bash
npm run dev:api
```

如果只启动前端，页面会显示“本地规则库预览”。如果同时配置 `VITE_API_BASE_URL` 指向后端，并配置 DeepSeek Key，则会显示“DeepSeek 已接入”。
