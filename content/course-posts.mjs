const COMMON_NOTICE = `\n\n## 使用说明\n本文由 Otter 编辑部根据学校课程资料与公开学生经验交叉整理。学生体验具有个人差异，开课、考核和选课安排以学校当学期公布为准。`;

function makeCoursePost({
  id,
  schoolId,
  programmeId,
  programmeName,
  title,
  summary,
  tags,
  content,
  evidenceCount = 1,
  recommended = false
}) {
  return {
    id,
    sectionId: 'courses',
    title,
    summary,
    content: `${content}${COMMON_NOTICE}`,
    tags: ['硕士课程', '选课参考', ...tags],
    region: schoolId === 'eduhk' ? '大埔 / 将军澳' : '屯门',
    source: '学校课程资料与公开学生经验交叉整理',
    authorRole: 'Otter 课程编辑部',
    createdAt: '2026-07-15',
    updatedAt: '2026-07-15',
    status: 'published',
    shared: false,
    recommended,
    pinned: false,
    schoolId,
    metadata: {
      programmeId,
      programmeName,
      evidenceType: 'official-and-student-experience',
      evidenceCount: String(evidenceCount),
      reviewStatus: 'editor-reviewed',
      publicUse: 'original-synthesis'
    }
  };
}

export const courseResourcePosts = [
  makeCoursePost({
    id: 'course-guide-eduhk-mppm-planning',
    schoolId: 'eduhk',
    programmeId: 'eduhk-master-master-of-public-policy-and-management-mppm-mppm',
    programmeName: '公共政策与管理硕士 [MPPM]',
    title: 'MPPM 选课怎么排：先定方向，再排两学期负担',
    summary: '把方向、课程代码、上课时段和备选课放进同一张选课表，避免只凭课程名临场决定。',
    tags: ['MPPM', '课程规划', '抢课'],
    evidenceCount: 6,
    recommended: true,
    content: `## 先做的不是抢课，而是排课\n\n公开学生经验中反复出现的有效做法，是在开放选课前先确定方向、必修课和可接受的上课时段，再为每门热门选修准备替代项。建议表格至少包含课程代码、课程方向、时段、考核形式和第一备选。\n\n## 两学期怎样分配\n\n对刚转入公共政策领域的同学，第一学期应优先建立政策分析、公共管理和研究方法底座，不宜把阅读量大、写作密集的课程全堆在同一学期。已有全职工作或家庭安排的同学，还要把晚间课和交通时间算进真实负担。\n\n## 适合谁重点看\n\n- 应届生：优先建立政策分析与研究表达能力，并保留能形成作品集的课程。\n- 公共部门或学校管理人员：把组织治理、政策执行和领导力课程放在一起比较。\n- 跨专业学生：先看考核方式和先修知识，不要只看课程标题。`
  }),
  makeCoursePost({
    id: 'course-guide-eduhk-mppm-core',
    schoolId: 'eduhk',
    programmeId: 'eduhk-master-master-of-public-policy-and-management-mppm-mppm',
    programmeName: '公共政策与管理硕士 [MPPM]',
    title: 'MPPM 必修课阅读法：把理论变成政策案例',
    summary: '必修课的价值不只在记概念，而在于能否用理论解释真实公共问题并形成清晰论证。',
    tags: ['MPPM', '必修课', '政策分析'],
    evidenceCount: 4,
    content: `## 学习重点\n\nMPPM 的核心训练通常围绕公共政策、公共管理和研究分析展开。阅读时可以给每个理论配一个香港、内地或国际案例，并用“问题是什么、谁受影响、政策工具是什么、执行难点在哪里”四个问题建立笔记。\n\n## 不同背景的收益\n\n文科生往往较适应阅读与论证，但需要主动补数据理解；商科生可把组织和绩效思维迁移到公共治理；理工科学生则要练习规范性判断和政策写作。\n\n## 与就业怎样连接\n\n课程作业最好沉淀为政策简报、项目评估或利益相关者分析。这些材料比单纯列课程名更能向政府事务、公共机构、教育管理、咨询和社会服务岗位展示能力。`
  }),
  makeCoursePost({
    id: 'course-guide-eduhk-macsle',
    schoolId: 'eduhk',
    programmeId: 'eduhk-master-master-of-arts-in-chinese-studies-language-education-macsle-macsle',
    programmeName: '中文研究（语文教育）文学硕士 [MACSLE]',
    title: 'MACSLE 选课参考：文学、语言与教学法怎样组合',
    summary: '语文教师、中文研究背景和跨专业学生需要的课程组合并不相同。',
    tags: ['MACSLE', '语文教育', '中文研究'],
    evidenceCount: 2,
    content: `## 三种常见学习目标\n\n在职语文教师适合优先选择能直接转化为课堂设计、教材分析和评估工具的课程；中文系背景学生可通过语言教育研究补足教学应用；跨专业学生则应先建立中文研究方法和学术写作基础。\n\n## 选修组合建议\n\n不要把课程全部集中在文学赏析或全部集中在教学技巧。更稳妥的组合是一门内容深化、一门教学应用，再配一门研究方法或专题课程。\n\n## 职业连接\n\n可将课程作业整理为教学单元、文本分析样例或小型行动研究，面向中文教学、课程编辑、文化教育和教育内容岗位。`
  }),
  makeCoursePost({
    id: 'course-guide-eduhk-matcil',
    schoolId: 'eduhk',
    programmeId: 'eduhk-master-master-of-arts-in-teaching-chinese-as-an-international-language-matcil-matcil',
    programmeName: '国际汉语教学文学硕士 [MATCIL]',
    title: 'MATCIL 选课参考：从会说中文到会设计语言课堂',
    summary: '课程选择要同时覆盖语言本体、二语习得、教学设计与跨文化沟通。',
    tags: ['MATCIL', '国际中文教育', '教学设计'],
    evidenceCount: 2,
    content: `## 核心能力不是“母语直觉”\n\n国际中文教学要求把语音、词汇和语法解释成学习者可理解的规则，还要能诊断错误并设计练习。母语者也需要系统补语言分析和二语习得。\n\n## 不同背景怎样选\n\n有教学经验者可深化课程设计、评估与跨文化课堂管理；语言学背景者适合补实践型课程；没有教学经验的应优先选择带微格教学、教案或课堂观察的课程。\n\n## 就业连接\n\n建议留下完整教案、试讲视频、学习者错误分析和课程评估方案，形成国际学校、语言机构、教育出版及线上中文教学可展示的作品。`
  }),
  makeCoursePost({
    id: 'course-guide-eduhk-matesol',
    schoolId: 'eduhk',
    programmeId: 'eduhk-master-master-of-arts-in-teaching-english-to-speakers-of-other-languages-matesol-matesol',
    programmeName: '英语教学文学硕士 [MATESOL]',
    title: 'MATESOL 选课参考：教学经验不同，补课顺序也不同',
    summary: '应届生先补课堂设计和研究基础，在职教师则可把重点放在评估、课程改革与专门用途英语。',
    tags: ['MATESOL', '英语教学', 'TESOL'],
    evidenceCount: 2,
    content: `## 应届生的优先级\n\n先建立二语习得、教学法、课堂观察和语言评估基础，再选择技术、材料设计或专门用途英语等方向课。没有真实课堂经验时，尽量选择能产生教案、试讲和反思记录的课程。\n\n## 在职教师的优先级\n\n已有课堂经验者更适合用课程解决具体问题，例如差异化教学、形成性评价、课程设计或数字工具整合。\n\n## 职业连接\n\n求职材料可由课程作业转化为教学档案：学习目标、活动设计、评估量规、学生样例和改进反思缺一不可。`
  }),
  makeCoursePost({
    id: 'course-guide-eduhk-ai-edtech',
    schoolId: 'eduhk',
    programmeId: 'eduhk-master-master-of-science-in-artificial-intelligence-and-educational-technology-msc-aiandedtec',
    programmeName: '人工智能与教育科技理学硕士 [MSc(AI&EdTech)]',
    title: 'AI 与教育科技怎么选课：技术深度和教育场景要配对',
    summary: '不会编程不等于不能读，但必须区分“理解 AI 应用”和“独立完成技术实现”的目标。',
    tags: ['AI&EdTech', '教育科技', '技术准备'],
    evidenceCount: 2,
    recommended: true,
    content: `## 先判断自己的目标\n\n教育工作者若目标是评估和设计 AI 教学应用，应重点补数据素养、学习设计、伦理和效果评估；想转技术岗位的应更早补 Python、统计、线性代数基础，并选择能完成模型或数据项目的课程。\n\n## 对零基础同学的提醒\n\n只会使用生成式 AI 工具，不等于具备数据分析或模型开发能力。若课程涉及编程、机器学习和统计推断，建议开学前完成基础练习，再根据真实负担选技术课。\n\n## 就业连接\n\n教育产品、学习设计和数字化转型岗位看重场景理解；数据或 AI 工程岗位更看重可运行代码、实验过程和技术作品。选课时要让最终项目与目标岗位对齐。`
  }),
  makeCoursePost({
    id: 'course-guide-eduhk-ppe',
    schoolId: 'eduhk',
    programmeId: 'eduhk-master-master-of-arts-in-positive-psychology-in-education-ma-ppe-ma-ppe',
    programmeName: '教育正向心理学文学硕士 [MA(PPE)]',
    title: 'MA(PPE) 课程参考：不要把正向心理学读成励志课',
    summary: '真正的学习重点是理论证据、干预设计、评估方法与教育场景边界。',
    tags: ['MA(PPE)', '正向心理学', '教育干预'],
    evidenceCount: 2,
    content: `## 课程应形成的能力\n\n学生需要理解幸福感、优势、韧性等概念背后的研究证据，并能设计适合学校或组织的干预，再通过量表、访谈或观察判断效果。\n\n## 适合的人群\n\n教师、辅导人员、人力资源和社会服务从业者可把已有场景带入课程；应届生则要主动补研究方法和真实实践，避免只停留在概念层。\n\n## 职业边界\n\n该方向可连接学生发展、员工福祉、教育项目和社会服务，但不能替代受监管的临床心理或治疗专业资格。`
  }),
  makeCoursePost({
    id: 'course-guide-eduhk-med',
    schoolId: 'eduhk',
    programmeId: 'eduhk-master-master-of-education-med-med',
    programmeName: '教育硕士 [MEd]',
    title: 'MEd 选课参考：用一个真实教育问题串起全年学习',
    summary: '方向多时最容易选散，先确定要解决的教育问题，再组合理论、方法和实践课程。',
    tags: ['MEd', '教育研究', '课程组合'],
    evidenceCount: 2,
    content: `## 先选问题，再选课程\n\n可以从课程改革、学习差异、教师发展、学校领导或教育科技中选择一个真实问题，让不同课程的阅读和作业持续积累，而不是每门课做一套互不相关的材料。\n\n## 不同阶段的重点\n\n应届生需要补教育理论、研究方法和实践证据；在职教师适合把课堂或学校问题转化为行动研究；管理人员则可强化政策、组织和领导力。\n\n## 最终产出\n\n一份结构完整的问题分析、干预方案和评估框架，通常比课程数量更能体现学习价值。`
  }),
  makeCoursePost({
    id: 'course-guide-eduhk-nmsm',
    schoolId: 'eduhk',
    programmeId: 'eduhk-master-master-of-arts-in-new-media-and-social-media-ma-nmsm-ma-nmsm',
    programmeName: '新媒体与社交媒体文学硕士 [MA(NMSM)]',
    title: 'NMSM 选课参考：媒体人和应届生的目标不一样',
    summary: '资深媒体人应拓宽平台治理与受众研究，应届生则要把课程转成可展示的研究和内容项目。',
    tags: ['MA(NMSM)', '新媒体', '平台研究'],
    evidenceCount: 2,
    content: `## 资深媒体人怎样读\n\n重点不是重复学习内容生产，而是借课程重新理解平台权力、算法分发、社群文化、数据伦理和商业模式，把经验提升为可迁移的判断框架。\n\n## 应届生怎样读\n\n应选择能形成受众研究、内容策略、平台分析或数字叙事作品的课程，并补足基础数据分析和研究表达。\n\n## 职业连接\n\n可对应内容策略、品牌传播、社区运营、用户研究、公共传播和平台治理。作品需要说明问题、方法、洞察和决策，不只展示成品。`
  }),
  makeCoursePost({
    id: 'course-guide-eduhk-vaecp',
    schoolId: 'eduhk',
    programmeId: 'eduhk-master-master-of-arts-in-visual-arts-education-and-creative-practice-ma-vaecp-ma-vaecp',
    programmeName: '视觉艺术教育与创意实践文学硕士 [MA(VAECP)]',
    title: 'VAECP 选课参考：创作、策划和教育实践如何平衡',
    summary: '艺术背景与教育背景学生都需要补自己较弱的一端，并把课程成果整理成完整项目叙事。',
    tags: ['MA(VAECP)', '视觉艺术', '创意实践'],
    evidenceCount: 2,
    content: `## 艺术背景学生\n\n可重点补教育理论、观众研究、课程设计和项目评估，让创作能进入学校、社区或公共文化场景。\n\n## 教育背景学生\n\n应增加工作坊、材料实验和视觉研究，避免作品只剩教学说明而缺少创作过程。\n\n## 就业连接\n\n课程成果可整理为展览或教育项目档案，清楚呈现概念、研究、制作、公众参与和复盘，连接艺术教育、公共项目、策展协作与文化机构岗位。`
  }),
  makeCoursePost({
    id: 'course-guide-lu-aiba-foundation',
    schoolId: 'lingnan',
    programmeId: 'lingnan-tpg-school-of-data-science-master-of-science-in-artificial-intelligence-and-business-analytics',
    programmeName: '人工智能与商业分析理学硕士',
    title: 'AIBA 技术课怎么选：先补统计与编程，再谈模型',
    summary: '商业背景可以转入，但要诚实评估 Python、概率统计和线性代数准备度。',
    tags: ['AIBA', '商业分析', '技术准备'],
    evidenceCount: 3,
    recommended: true,
    content: `## 技术课程的真实门槛\n\n机器学习和数据分析不只是调用工具。理解损失函数、模型评价、特征处理和实验结果，需要基本统计、代数和编程能力。数学基础薄弱且工作繁忙的学生，不宜同学期堆叠多门高强度技术课。\n\n## 三类学生的路径\n\n应届理工生可挑战更深的模型与工程项目；商科生先以数据分析和业务问题为主线补技术；资深管理者若目标是决策与转型，可优先选择分析应用、治理和项目管理相关课程。\n\n## 就业连接\n\n求职商业分析岗位应展示从业务问题、数据清理到建议的完整链路；目标算法岗位则需要更扎实的数学、代码和模型实验。`
  }),
  makeCoursePost({
    id: 'course-guide-lu-aiba-selection',
    schoolId: 'lingnan',
    programmeId: 'lingnan-tpg-school-of-data-science-master-of-science-in-artificial-intelligence-and-business-analytics',
    programmeName: '人工智能与商业分析理学硕士',
    title: 'AIBA 选课组合：技术深度、业务场景和成绩压力',
    summary: '一学期同时保留技术课、应用课和可控负担，比追逐所有热门课更可持续。',
    tags: ['AIBA', '选课策略', '课程负担'],
    evidenceCount: 2,
    content: `## 一个可执行的组合\n\n每学期可用一门技术主课、一门业务应用课，再配一门与项目或职业方向相关的课程。这样既能保持技术进步，也有时间完成可展示的项目。\n\n## 选课前核对\n\n重点查看考核比例、个人或小组作业、编程语言、先修知识和截止日期分布。课程名称相似，不代表工作量相同。\n\n## 选择标准\n\n想拿高分不等于只选容易课。更合理的标准是课程能否补关键能力、能否形成作品，以及负担是否与当学期求职安排兼容。`
  }),
  makeCoursePost({
    id: 'course-guide-lu-macmi',
    schoolId: 'lingnan',
    programmeId: 'lingnan-tpg-faculty-of-arts-master-of-arts-in-creative-and-media-industries',
    programmeName: '创意及媒体产业文学硕士',
    title: 'MACMI 第一学期怎么学：把媒体经验升级为产业判断',
    summary: '必修课可帮助学生从内容生产走向产业结构、文化政策和研究分析。',
    tags: ['MACMI', '创意产业', '媒体'],
    evidenceCount: 2,
    recommended: true,
    content: `## 对媒体从业者的价值\n\n已有采编、广告或内容经验的人，可借课程重新理解平台、资本、政策、劳动与受众之间的关系。目标不是重复工作技能，而是建立解释行业变化的框架。\n\n## 对应届生的价值\n\n应届生需要主动补真实行业案例和基础研究方法，把抽象理论落到一个平台、公司、文化产品或政策问题上。\n\n## 课程成果怎么用\n\n将作业整理成行业分析、文化项目评估、受众洞察或内容战略，能够连接媒体研究、文化项目、品牌策略和公共文化岗位。`
  }),
  makeCoursePost({
    id: 'course-guide-lu-mide',
    schoolId: 'lingnan',
    programmeId: 'lingnan-tpg-faculty-of-social-sciences-master-of-science-in-international-and-development-economics',
    programmeName: '国际与发展经济学理学硕士',
    title: 'MIDE 课程准备：经济学直觉之外还要补什么',
    summary: '跨专业学生需要提前补微观、宏观、统计和图表表达，避免只靠背结论。',
    tags: ['MIDE', '发展经济学', '量化基础'],
    evidenceCount: 2,
    content: `## 基础准备\n\n发展经济学会讨论贫困、贸易、制度和政策，但严谨分析仍离不开经济模型与数据证据。跨专业学生应提前复习基础微观、宏观、统计和函数图像。\n\n## 选课方向\n\n目标政策研究者可加强计量、项目评估和公共政策；目标金融或商业岗位者可结合国际经济、数据分析和市场课程。\n\n## 就业连接\n\n课程项目最好展示一个明确问题、数据来源、识别方法、结果限制和政策含义，连接经济研究、咨询、公共机构和发展项目岗位。`
  }),
  makeCoursePost({
    id: 'course-guide-lu-mibf',
    schoolId: 'lingnan',
    programmeId: 'lingnan-tpg-faculty-of-social-sciences-master-of-science-in-international-banking-and-finance',
    programmeName: '国际银行与金融理学硕士',
    title: 'MIBF 第一学期课程参考：金融基础与量化负担',
    summary: '金融转专业学生应同时补会计语言、金融市场和统计工具，不要把计算课全部拖到后面。',
    tags: ['MIBF', '银行金融', '量化准备'],
    evidenceCount: 2,
    content: `## 转专业学生先补什么\n\n建议先熟悉财务报表、货币时间价值、风险收益、回归基础和 Excel 数据处理。这样课堂时间可以用于理解金融逻辑，而不是被符号和术语拖住。\n\n## 有金融背景的学生\n\n可把重点放在国际市场、风险管理、实证分析和监管议题，并通过项目证明自己能处理真实数据。\n\n## 就业连接\n\n银行、风险、研究和企业金融岗位关注的能力不同。选课前先看目标岗位，再决定强化市场理解、财务分析还是量化工具。`
  }),
  makeCoursePost({
    id: 'course-guide-lu-data-science',
    schoolId: 'lingnan',
    programmeId: 'lingnan-tpg-school-of-data-science-master-of-science-in-data-science',
    programmeName: '数据科学理学硕士',
    title: '岭南数据科学选课提醒：它不是零数学的工具课',
    summary: '统计、线性代数和编程基础会直接影响机器学习课程体验，基础薄弱者需先补课。',
    tags: ['Data Science', '统计学', '数学准备'],
    evidenceCount: 2,
    recommended: true,
    content: `## 先做自测\n\n如果对向量矩阵、概率分布、导数、回归和 Python 数据处理都很陌生，直接堆叠机器学习课程会非常吃力。年龄不是限制，是否愿意投入时间补基础才是关键。\n\n## 谁适合挑战技术选修\n\n应届理工科、已有分析经验，或明确希望转向数据岗位并能持续练习的人，更适合选择算法、机器学习和工程项目。\n\n## 谁应选择更稳妥的组合\n\n工作繁忙、数学基础薄弱且目标偏管理的人，可先选数据应用、可视化、业务分析和治理类课程，同时循序补统计。课程选择应服务真实职业目标，不必把所有技术课都修一遍。`
  }),
  makeCoursePost({
    id: 'course-guide-lu-achm',
    schoolId: 'lingnan',
    programmeId: 'lingnan-tpg-school-of-graduate-studies-master-of-arts-in-arts-and-cultural-heritage-management',
    programmeName: '艺术与文化遗产管理文学硕士',
    title: 'ACHM 方向选择：文化遗产、管理与国际路径',
    summary: '选择方向前要比较课程地点、项目实践、成本和目标地区，而不只是项目名称。',
    tags: ['ACHM', '文化遗产', '艺术管理'],
    evidenceCount: 2,
    content: `## 先明确目标场景\n\n希望进入博物馆、公共文化或遗产教育的学生，应加强策展、公众参与、文化政策和项目评估；偏艺术市场或文化企业者则要补预算、传播、合作与项目运营。\n\n## 国际方向的核对清单\n\n若课程包含境外学习或合作路径，应单独核对地点、时间、额外成本、签证、住宿和毕业要求。学生经验可以提示实际感受，但不能代替当届官方安排。\n\n## 就业连接\n\n作品集应展示完整项目过程，包括研究、对象选择、预算、传播、观众体验和复盘。`
  }),
  makeCoursePost({
    id: 'course-guide-lu-atb',
    schoolId: 'lingnan',
    programmeId: 'lingnan-tpg-faculty-of-business-master-of-science-in-arts-technology-and-business',
    programmeName: '艺术科技与商业理学硕士',
    title: '艺术科技与商业怎么选课：别把三个方向学成三张皮',
    summary: '最有效的课程组合，是围绕一个真实文化或创意项目串起技术、商业与用户体验。',
    tags: ['Arts Tech', '创意科技', '商业'],
    evidenceCount: 2,
    content: `## 先选一个主轴\n\n艺术背景学生可把技术当作体验与表达工具，再补商业模型；商科背景学生应增加原型与用户体验；技术背景学生则要理解文化语境、内容和市场。\n\n## 课程项目怎样组合\n\n围绕同一个项目完成用户研究、技术原型、商业模式、传播计划和效果评估，比每门课做一个互不相关的小作业更有价值。\n\n## 就业连接\n\n可连接创意科技产品、文化项目、数字体验、品牌创新和项目管理。作品集应说明你在跨专业团队中的具体贡献。`
  })
];
