const UPDATED_AT = '2026-07-21T12:00:00+08:00';

const OFFICIAL = {
  calendar: 'https://m.ln.edu.hk/guest/calendar/index?feed=lu_academic_calendar',
  university: 'https://www.ln.edu.hk/',
  osa: 'https://osa.ln.edu.hk/',
  educationVerification: 'https://uniapp.ln.edu.hk/oev/oev/api/manual/',
  libraryOrientation: 'https://library.ln.edu.hk/en/learn/orientations',
  libraryHours: 'https://www.library.ln.edu.hk/en/use/hours/open',
  libraryRooms: 'https://library.ln.edu.hk/en/space/place/rooms',
  libraryBooking: 'https://www.library.ln.edu.hk/en/space/place/booking',
  libraryOvernight: 'https://library.ln.edu.hk/en/space/place/overnightstudyarea',
  libraryPrint: 'https://www.library.ln.edu.hk/index.php/en/space/facilities/printcopyscan',
  libraryOffCampus: 'https://library.ln.edu.hk/en/collection/eresources/offcampus',
  libraryReserves: 'https://library.ln.edu.hk/en/use/reserves',
  libraryRenew: 'https://library.ln.edu.hk/en/use/checkout/renew',
  libraryFines: 'https://www.library.ln.edu.hk/en/use/checkin/fines',
  libraryConsultation: 'https://library.ln.edu.hk/en/research/plan/consultation',
  libraryCitation: 'https://www.library.ln.edu.hk/en/research/publish/tool',
  libraryOther: 'https://www.library.ln.edu.hk/index.php/en/space/facilities/other',
  careerTraining: 'https://osa.ln.edu.hk/files/PTP_info_20260401.pdf',
  careerExpo: 'https://osa.ln.edu.hk/career-expo-showcase-2',
  immigrationExtension: 'https://www.immd.gov.hk/eng/services/visas/extension_of_stay.html',
  renting: 'https://www.gov.hk/en/residents/housing/private/buying/rentingDomesticProperty.htm',
  stampDuty: 'https://www.ird.gov.hk/eng/faq/sta.htm',
  mtr: 'https://www.mtr.com.hk/en/customer/main/index.html',
  kmb: 'https://www.kmb.hk/',
  transport: 'https://www.hkemobility.gov.hk/en/route-search/pt',
  mplus: 'https://www.mplus.org.hk/en/visit/getting-here/',
  simRegistration: 'https://www.ofca.gov.hk/en/consumer_focus/guide/hot_topics/sim_registration/index.html',
  bankAccount: 'https://www.hkma.gov.hk/eng/smart-consumers/account-opening/information-required/'
};

const communityUrl = (postId) => `https://www.xiaohongshu.com/explore/${postId}`;

function buildContent(guide) {
  const officialLinks = guide.official.map((url) => `- ${url}`).join('\n');
  return `
## 这篇解决什么

${guide.intro}

## 实际怎么做

${guide.actions.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## 容易踩坑

${guide.cautions.map((item) => `- ${item}`).join('\n')}

## 信息核验

社区经验原帖：${communityUrl(guide.communityId)}

官方核验入口：
${officialLinks}

> 社区帖子只用于整理学生常见问题和实际使用感受，不作为学校规则、价格、时刻表或资格条件的唯一依据。本文核验日期为 2026-07-21；涉及日期、费用、路线、系统菜单和申请资格时，请在操作当天重新查看官网或校内系统。
  `.trim();
}

const guideSeeds = [
  {
    slug: 'online-registration-precheck', sectionId: 'new-student', title: '岭南新生线上注册：提交前先做一遍材料预检',
    summary: '把注册通知、个人资料、证件文件和缴费状态分开核对，避免卡在最后一步才发现缺件。',
    region: '岭南大学 / 新生注册', communityId: '6a5e3457000000000f017e5d',
    intro: '线上注册最容易出问题的不是“不会点”，而是姓名、证件、课程身份和文件版本前后不一致。先按通知列清单，再进入系统，会比边填边找材料稳定。',
    actions: ['以录取或注册通知列出的入口和截止日期为准，先确认自己是本科、授课型研究生还是研究型学生。', '统一核对中英文姓名、证件号码、学生编号和长期使用邮箱；上传文件前检查方向、边缘和清晰度。', '完成后保存确认页或确认邮件，并另记下仍待处理的缴费、选课、学生证或签证事项。'],
    cautions: ['不要根据网友旧截图猜测当前按钮位置。', '不要把账号密码、验证码或完整证件图发送给所谓代办。'], official: [OFFICIAL.calendar, OFFICIAL.university]
  },
  {
    slug: 'arrival-week-checklist', sectionId: 'new-student', title: '岭南新生抵港首周：只按依赖关系安排事情',
    summary: '先解决入境记录、通信和校园账号，再处理开户、选课和生活采购。',
    region: '香港 / 岭南大学', communityId: '6a4cc1d3000000000e038400',
    intro: '抵港后事项很多，但不是每件事都要第一天完成。优先处理会影响后续登录、收验证码和进入校园系统的事项，其余按截止日期排序。',
    actions: ['保存入境记录、电子签证和学校录取/注册文件的离线副本。', '准备本人实名的香港号码和可长期登录的邮箱，再检查学校账号、双重验证与通知渠道。', '把注册、选课、迎新、缴费和证件办理日期写进同一个日历，并为每项设置提前提醒。'],
    cautions: ['不要同时预约多个无法按时到场的银行或办事时段。', '社群里的“统一截止日”可能不适用于你的课程或身份。'], official: [OFFICIAL.calendar, OFFICIAL.simRegistration, OFFICIAL.bankAccount]
  },
  {
    slug: 'freshman-avoid-pitfalls', sectionId: 'new-student', title: '岭南新生避坑：把“别人都这样”改成可核对的问题',
    summary: '面对群聊、社交平台和代办建议，先确认适用对象、学年、校区和官方依据。',
    region: '岭南大学 / 新生阶段', communityId: '6a45ad9c000000000f02a173',
    intro: '真正有效的避坑不是记一堆结论，而是学会判断一条经验是否适用于自己。最少要问清楚发布年份、学生层级、校区和信息来源。',
    actions: ['看到选课、宿舍、签证或缴费建议时，先找出它对应的学年与学生类型。', '把需要决定的事项改写成具体问题，例如“我的项目是否需要在这个日期前完成注册”。', '用官网、学校邮件或负责部门回复核对关键结论，社区经验只保留为操作提醒。'],
    cautions: ['不采用没有日期、对象和来源的绝对化说法。', '不支付以“内部名额”“保证选课”或“保证宿位”为卖点的费用。'], official: [OFFICIAL.university, OFFICIAL.osa, OFFICIAL.calendar]
  },
  {
    slug: 'campus-first-walk', sectionId: 'new-student', title: '岭南开学前校园踩点：按一天真实动线走一遍',
    summary: '从到校、上课、自习、吃饭到返程完整测试，而不是只拍一圈校园。',
    region: '岭南大学屯门校园', communityId: '6a5b3bc20000000008009c00',
    intro: '第一次到校最有价值的不是记住所有楼名，而是验证一条真实上课日动线：从交通站点到教室，再到图书馆、餐饮和晚间返程。',
    actions: ['按课表或项目通知找出最可能使用的教学楼，并记录入口、升降机和跨楼步行时间。', '确认图书馆、打印、餐饮、饮水和洗手间的位置，顺手测试校园网络与学生证。', '在预计下课时间走一次返程路线，确认晚间候车点和替代交通。'],
    cautions: ['不要只按地图直线距离估算转场时间。', '活动期间或新学期初，部分出入口与服务时间可能临时调整。'], official: [OFFICIAL.university, OFFICIAL.libraryOrientation, OFFICIAL.transport]
  },
  {
    slug: 'assignment-week-plan', sectionId: 'new-student', title: '岭南开学作业管理：第一周就建立提交台账',
    summary: '把平台、截止时间、格式、引用和小组分工放在一张表里。',
    region: '岭南大学 / 学术适应', communityId: '6a530d20000000001101332a',
    intro: '港硕课程常见的问题不是完全不会做，而是多个课程的提交平台、格式和小组安排同时出现。用统一台账管理，比反复翻聊天记录可靠。',
    actions: ['每门课记录课程代码、提交入口、截止时间、文件格式、字数和是否需要查重。', '小组作业写清负责人、交付物、内部截止时间和最终上传人。', '提交前核对文件名、版本、引用格式和成功回执，并保留最终文件。'],
    cautions: ['不要把同学转发的截止时间当作课程正式通知。', '不要在不理解内容的情况下直接提交生成式 AI 输出。'], official: [OFFICIAL.calendar, OFFICIAL.libraryCitation, OFFICIAL.university]
  },
  {
    slug: 'new-student-document-folder', sectionId: 'new-student', title: '岭南新生文件夹：把最难补办的材料放在最前面',
    summary: '建立证件、学校、住宿、财务和出行五类文件夹，并保留离线副本。',
    region: '香港 / 新生准备', communityId: '69e1e0d6000000001d018e3f',
    intro: '到港后临时找文件很耗时。把高频材料按用途整理，并区分“可展示副本”和“含敏感信息原件”，能减少误传与遗失风险。',
    actions: ['分成身份与签证、学校注册、住宿合约、银行通信、交通与保险五个文件夹。', '为常用材料准备清晰 PDF，同时保留原始文件，不反复压缩覆盖。', '在本机与个人加密云端各保存一份，外出只携带当前事项需要的副本。'],
    cautions: ['不要把完整证件和住址资料上传到公开网盘。', '不要在群聊里发送包含二维码、条码或学生编号的完整页面。'], official: [OFFICIAL.university, OFFICIAL.immigrationExtension]
  },
  {
    slug: 'programme-registration-plan', sectionId: 'new-student', title: '项目注册不等于选课：岭南新生要分开追踪的四件事',
    summary: '学校注册、项目确认、课程登记和缴费是不同状态，不能只看一个“成功”。',
    region: '岭南大学 / 项目注册', communityId: '697dba7c000000002103d39d',
    intro: '学生常把“已经注册”理解成所有流程都完成，但项目注册、课程登记、学费状态和学生身份激活往往由不同页面或部门处理。',
    actions: ['列出学校层面的注册状态、项目办公室要求、已选课程和缴费状态。', '逐项保存成功回执，并记录负责部门与查询入口。', '如果状态冲突，用学生编号和截图向对应部门描述问题，不把不同系统混在一封邮件里。'],
    cautions: ['不要仅凭课程出现在课表里就判断注册和缴费已完成。', '不同项目的流程可能不同，必须以项目办公室通知为准。'], official: [OFFICIAL.calendar, OFFICIAL.university]
  },
  {
    slug: 'campus-services-map', sectionId: 'new-student', title: '岭南校内服务怎么找：先按需求，不按楼名背地图',
    summary: '把常用服务分成学术、学习、生活、职业和紧急支持五类。',
    region: '岭南大学校园', communityId: '6a50aa6f000000000e031400',
    intro: '新生不需要一次记住所有单位。更实用的做法是按问题找负责方：课程与记录、图书馆、学生事务、职业发展和紧急支援。',
    actions: ['把每类需求对应的官网入口、邮箱或校内系统页面保存到浏览器书签。', '第一次到校时确认图书馆服务台、学生事务相关地点和校园保安联络方式。', '遇到问题先写清学生身份、项目、发生时间和已尝试步骤，再联系负责部门。'],
    cautions: ['不要向不明群管理员提交学生证或系统截图。', '校内服务地点和开放安排可能变化，出发前重新核对。'], official: [OFFICIAL.university, OFFICIAL.osa, OFFICIAL.libraryOrientation]
  },
  {
    slug: 'first-week-priority', sectionId: 'new-student', title: '开学第一周不焦虑：岭南新生事项按风险排序',
    summary: '先处理有截止日和不可逆后果的事项，再安排社交与采购。',
    region: '岭南大学 / 开学周', communityId: '6a3cbe16000000000f014374',
    intro: '开学周消息密度很高。优先级应由截止日期、错过后果和是否依赖其他事项决定，而不是由群聊里谁催得最急决定。',
    actions: ['先标记注册、缴费、选课、签证和课程首次提交等硬截止事项。', '第二层处理账号、学生证、图书馆和交通等会影响日常使用的事项。', '社团、聚会和非必要采购放在剩余时间，并给休息和通勤留出缓冲。'],
    cautions: ['不要把所有迎新活动都当作强制要求。', '身体不适或情绪压力明显时，优先联系正式支援渠道。'], official: [OFFICIAL.calendar, OFFICIAL.osa]
  },
  {
    slug: 'system-registration-troubleshooting', sectionId: 'new-student', title: '岭南系统注册报错：先保留证据，再判断是哪一层失败',
    summary: '区分登录、资料校验、文件上传、付款和提交确认，不要反复无目的刷新。',
    region: '岭南大学 / 网上系统', communityId: '6a3257d6000000000d00bc00',
    intro: '同样显示“错误”，原因可能完全不同。先记录发生时间、页面、浏览器和错误文字，才能让学校技术或行政人员快速定位。',
    actions: ['截图保留错误文字但遮住密码、证件号码和个人二维码。', '依次排查账号能否登录、必填字段、文件大小格式、付款状态和最终提交回执。', '更换受支持浏览器或网络后仍失败，再携带学生编号和错误时间联系通知中指定部门。'],
    cautions: ['不要连续多次付款或重复提交。', '不要把完整账号交给网友远程操作。'], official: [OFFICIAL.university, OFFICIAL.calendar]
  },
  {
    slug: 'student-card-photo', sectionId: 'new-student', title: '学生证照片上传：先满足识别要求，再谈好不好看',
    summary: '用近期正面照片，检查比例、背景、清晰度和文件规格。',
    region: '岭南大学 / 学生身份', communityId: '6a5440b6000000001700ad4b',
    intro: '学生证照片最重要的是符合系统和身份识别要求。社交平台模板只能提供构图参考，最终尺寸和文件要求必须看学校当前通知。',
    actions: ['阅读上传页面的尺寸、格式、背景和近期照片要求。', '裁切后检查面部完整、曝光自然、没有滤镜遮挡或文字水印。', '上传后确认预览方向正常，并保存系统接受或待审核状态。'],
    cautions: ['不要用美颜过度、多人合照或截图中的二次压缩图片。', '不要把学生证预览页公开分享。'], official: [OFFICIAL.university]
  },
  {
    slug: 'visa-extension-planning', sectionId: 'new-student', title: '岭南非本地生续签：先看逗留期限，不看学生证日期',
    summary: '把学校文件、旅行证件和入境处申请拆成时间线，预留补件时间。',
    region: '香港 / 学生签证', communityId: '6a053d0a0000000035022192',
    intro: '学生身份文件和获准逗留期限不是同一概念。续签安排应围绕入境记录或电子签证显示的期限，并以入境处与学校最新指引为准。',
    actions: ['检查当前 limit of stay，并在可申请窗口内准备旅行证件、在读或学业相关文件。', '按入境处要求提交申请，保存申请编号并持续检查补件通知。', '获批和缴费后下载新电子签证，核对姓名、证件和有效期。'],
    cautions: ['不要等到计划离港前才开始处理。', '课程延期、休学或身份变化时，应先向学校和入境处确认影响。'], official: [OFFICIAL.immigrationExtension, OFFICIAL.university]
  },
  {
    slug: 'education-verification', sectionId: 'new-student', title: '岭南学历在线验证：先确认自己属于哪一种毕业生状态',
    summary: '在校生、刚毕业但系统身份未转换和校友的入口可能不同。',
    region: '岭南大学 / 毕业文件', communityId: '6a0c3bbe0000000035032667',
    intro: '申请学历在线验证前，先确认自己是否仍可通过 myLingnan Portal 登录，以及系统是否已经把身份转换为校友。',
    actions: ['阅读官方用户手册，按当前身份选择入口。', '核对系统中只读的姓名和学生编号，并选择需要包含的项目。', '填写接收方资料前再次核对邮箱用途，完成后保存申请记录。'],
    cautions: ['不要把 Academic Report 当成所有场景都接受的正式成绩单。', '接收方要求不同，提交前先问清需要验证、成绩单还是学位证明。'], official: [OFFICIAL.educationVerification, OFFICIAL.university]
  },
  {
    slug: 'graduation-documents', sectionId: 'new-student', title: '毕业证、成绩单和验证邮件：用途不同，不要重复申请',
    summary: '先问接收方要什么，再选择正式成绩单、学历验证或其他学校文件。',
    region: '岭南大学 / 毕业办理', communityId: '6a0402c0000000003503263f',
    intro: '求职、升学、签证和资格认证对文件形式的要求不同。最省时间的方式不是全都申请，而是先确认接收方接受的文件类型和发送方式。',
    actions: ['向接收方确认是否需要正式成绩单、学位证明、在线验证或密封/直送文件。', '按照学校当前入口申请，并核对收件人、地址或邮箱。', '记录申请日期、付款状态和追踪信息，收到后检查姓名、项目和授予日期。'],
    cautions: ['不要把非正式页面截图当作正式文件提交。', '电子文件不要擅自编辑、合并或移除验证信息。'], official: [OFFICIAL.educationVerification, OFFICIAL.university]
  },
  {
    slug: 'course-registration-timeline', sectionId: 'new-student', title: '岭南选课时间线：开放前、开放中和结束后分别做什么',
    summary: '提前完成计划，开放时只执行；结束后再核对课表与项目要求。',
    region: '岭南大学 / 选课', communityId: '6a5dcd8c0000000022018964',
    intro: '选课当天才研究课程会把时间浪费在比较上。更稳妥的方式是提前准备主方案、替代方案和冲突处理顺序。',
    actions: ['开放前核对项目结构、课程代码、先修要求、时间冲突和个人目标。', '开放时按优先级执行，并记录满额、候补、报错或需要审批的课程。', '结束后对照项目要求核对总学分、课程类型和课表，再处理加退选或审批。'],
    cautions: ['不要把网友推荐教师或“水课”评价当作唯一标准。', '课程供应和时间每学期可能变化。'], official: [OFFICIAL.calendar, OFFICIAL.university]
  },
  {
    slug: 'course-selection-decision', sectionId: 'new-student', title: '岭南选课不是抢名字：用四个问题判断是否适合自己',
    summary: '看项目要求、能力缺口、评核方式和时间成本，而不是只看课程标题。',
    region: '岭南大学 / 课程规划', communityId: '69ec6a220000000010001c00',
    intro: '同一门课对不同背景的人价值不同。选择前至少判断它是否满足项目要求、能补什么能力、评核方式是否适合，以及是否挤压求职或论文时间。',
    actions: ['先确认课程在项目中属于核心、选修还是额外学习。', '阅读官方课程说明，标出前置知识、主要评核和预期学习成果。', '把课程与自己的作品集、研究、求职或转型目标连接，写出一项可交付成果。'],
    cautions: ['课程标题相似不代表内容和难度相同。', '不根据单个学期的个人体验推断长期教学质量。'], official: [OFFICIAL.university, OFFICIAL.libraryReserves]
  },
  {
    slug: 'course-plan-a-b', sectionId: 'new-student', title: '选课前做 Plan A / B：避免一门课满额就全盘重来',
    summary: '为每个目标准备替代课程，并提前检查冲突和审批条件。',
    region: '岭南大学 / 选课准备', communityId: '6a5cc7c1000000000c033c00',
    intro: '替代方案不是随便再选一门，而是要满足同一项目要求或能力目标。提前做 Plan B，才能在满额或时间冲突时快速替换。',
    actions: ['按核心要求、职业目标和个人兴趣给候选课程分层。', '为高优先级课程各准备一门作用相近的替代课程。', '预先检查替代后是否造成学分、上课时间或毕业要求缺口。'],
    cautions: ['不要为了凑满课表忽略先修和项目限制。', '需要审批的课程要预留联系项目办公室的时间。'], official: [OFFICIAL.calendar, OFFICIAL.university]
  },
  {
    slug: 'add-drop-checklist', sectionId: 'new-student', title: '加退选期间怎么试课：每次改动都要留下理由',
    summary: '用课程目标和评核负担做决策，避免频繁跟风改课。',
    region: '岭南大学 / 加退选', communityId: '6a423dab000000000f0172ee',
    intro: '试听后的直觉很重要，但还需要和项目结构、整体工作量及个人目标一起判断。每次改动写下原因，可以避免被群聊情绪带着走。',
    actions: ['试听时记录教学目标、评核方式、阅读量、技术要求和小组作业比例。', '估算所有课程同一周的截止任务，避免单门课看起来轻松但整体撞期。', '提交改动后重新检查系统课表、课程平台和项目学分。'],
    cautions: ['不要只因为第一节课“听不懂”就立即退课。', '超过官方期限后的改动可能涉及额外程序。'], official: [OFFICIAL.calendar, OFFICIAL.university]
  },
  {
    slug: 'academic-rules-reading', sectionId: 'new-student', title: '读学术规则时先找这六项：比从第一页看到最后更快',
    summary: '毕业学分、核心课、评核、出勤、学术诚信和延期是最先要确认的内容。',
    region: '岭南大学 / 学术规则', communityId: '6a44babf000000000e038401',
    intro: '学术文件信息很多。先定位会直接影响选课和毕业的条款，再回看细节，比只收藏文件却不建立行动清单有效。',
    actions: ['标出毕业总要求、核心/选修结构和可能的先修或审批条件。', '记录评核、出勤、缺交、延期和重修相关规则的正式出处。', '把学术诚信与引用要求放进每门课的作业模板。'],
    cautions: ['不要用其他项目或往届文件替代当前项目规则。', '有冲突时以学校和项目办公室书面回复为准。'], official: [OFFICIAL.university, OFFICIAL.libraryCitation]
  },
  {
    slug: 'aiba-course-evidence', sectionId: 'new-student', title: '看 AIBA 课程分享时，怎样区分官方内容和个人体验',
    summary: '课程名称与结构看官网，难度、节奏和背景感受看学生经验。',
    region: '岭南大学 / AIBA', communityId: '69eb17220000000012012805',
    intro: '课程分享可以帮助理解学习节奏，但不能替代官网课程结构。最安全的读法是把“课程存在与内容”与“个人体验和建议”分开记录。',
    actions: ['用官网核对课程名称、类型和描述，不从分享帖补写不存在的课程。', '把学生提到的难点标记为背景相关感受，例如编程、数学或小组协作。', '根据自己的基础列准备清单，并在选课前确认当期是否开设。'],
    cautions: ['个人成绩和求职结果不能代表课程必然效果。', '教师、评核和课表可能随学期变化。'], official: [OFFICIAL.university, OFFICIAL.libraryReserves]
  },
  {
    slug: 'library-orientation', sectionId: 'new-student', title: '岭南图书馆第一次怎么用：先完成服务导览再找座位',
    summary: '认识检索、借阅、空间、打印和求助入口，之后每次使用都会更快。',
    region: '岭南大学图书馆', communityId: '66a644aa0000000009017b8c',
    intro: '图书馆不只是自习室。新生先了解主要服务与设施，能避免到了期末才发现预约、数据库和研究支持入口。',
    actions: ['查看新生导览材料，确认服务台、主要学习区域和开放时间查询入口。', '测试用学校账号登录检索与个人账户，查看借阅和预约记录。', '保存房间预约、打印扫描、馆外访问和咨询服务页面。'],
    cautions: ['开放时间会随学期、考试和假期调整。', '需要预约的空间与开放座位规则不同。'], official: [OFFICIAL.libraryOrientation, OFFICIAL.libraryHours]
  },
  {
    slug: 'library-room-booking', sectionId: 'new-student', title: '岭南图书馆讨论室：预约前先确认人数和使用目的',
    summary: '选择空间时看人数、设备、时段和规则，避免预约后不能使用。',
    region: '岭南大学图书馆', communityId: '69ec36fd0000000023014f3c',
    intro: '小组讨论、演示练习和个人安静学习需要的空间不同。先看官方房间说明和预约条件，再约最合适的房型。',
    actions: ['在房间页面确认容量、设备、地点和适用活动。', '按预约系统要求选择时段，并让组员提前确认能到场。', '使用后按规定恢复空间，带走个人物品并结束设备连接。'],
    cautions: ['不要用物品长期占用开放座位。', '迟到、人数不足或违规使用可能影响预约。'], official: [OFFICIAL.libraryRooms, OFFICIAL.libraryBooking]
  },
  {
    slug: 'overnight-study-area', sectionId: 'new-student', title: '通宵赶 due 前先看：岭南夜间学习区怎么安排',
    summary: '确认开放范围、清洁时段、安静规则和返程安全，不把通宵当默认计划。',
    region: '岭南大学图书馆夜间学习区', communityId: '692af890000000001e02b91e',
    intro: '官方夜间学习区为当前师生提供闭馆后的学习空间，但开放范围与日间图书馆不同。使用前要确认当天安排和个人安全。',
    actions: ['出发前查看官方页面与当日开放提示，携带可验证的学生身份。', '选择适合安静个人学习的区域，提前准备文件、电源和饮用水。', '安排短休息和安全返程，不在无人看管时留下电脑和证件。'],
    cautions: ['开放安排可能临时变化。', '夜间区域仍需遵守安静、饮食和个人物品规则。'], official: [OFFICIAL.libraryOvernight, OFFICIAL.libraryHours]
  },
  {
    slug: 'account-before-graduation', sectionId: 'new-student', title: '毕业前账号整理：别等校内权限变化才搬资料',
    summary: '提前备份个人文件、确认校友入口，并把学校邮箱从外部账户中解绑。',
    region: '岭南大学 / 毕业准备', communityId: '6a51a84a000000000f028bbe',
    intro: '毕业后不同系统的访问权限可能调整。最稳妥的做法是提前梳理个人资料、验证记录和外部服务绑定，而不是猜测具体停用日期。',
    actions: ['备份本人有权保存的作业、简历、证书和行政文件，不下载受版权或保密限制的资料。', '把求职网站、银行和云服务改绑到长期个人邮箱。', '查看学校关于毕业生、校友和学历验证的官方说明。'],
    cautions: ['不要批量复制课程平台中不属于自己的资料。', '具体账号期限以学校通知为准。'], official: [OFFICIAL.educationVerification, OFFICIAL.university]
  },
  {
    slug: 'library-print-scan', sectionId: 'new-student', title: '打印、复印、扫描：截止前十分钟才去最容易出事',
    summary: '提前测试文件、余额、纸张和颜色需求，并准备电子提交备份。',
    region: '岭南大学图书馆', communityId: '68b684cc000000001c009880',
    intro: '打印问题往往集中在截止前。第一次使用时就完成一次小文件测试，能提前发现账号、格式或设备选择问题。',
    actions: ['查看官方打印、复印和扫描说明，确认支持的文件与操作方式。', '先打印一页检查尺寸、单双面、颜色和页序，再处理整份文件。', '保留原始 PDF 和电子提交方案，重要文件不要只存在公共电脑。'],
    cautions: ['打印后退出个人账户并取走文件。', '涉及个人资料的文件不要遗留在设备或回收纸盘。'], official: [OFFICIAL.libraryPrint, OFFICIAL.libraryOther]
  },
  {
    slug: 'off-campus-library-access', sectionId: 'new-student', title: '校外访问数据库失败：先判断是权限、登录还是浏览器问题',
    summary: '从图书馆入口进入，记录错误信息，不用来历不明的论文下载站。',
    region: '岭南大学图书馆 / 校外', communityId: '66ddb31e000000002603f1e5',
    intro: '校外数据库访问依赖学校订阅与身份验证。直接从搜索引擎进入出版商页面，常会看起来像学校没有权限。',
    actions: ['从图书馆电子资源或 1-Search 入口进入目标数据库。', '用当前有效的学校账号验证，并检查浏览器是否阻止跳转或 cookie。', '仍失败时记录数据库名、文章链接、时间和错误页面，联系图书馆。'],
    cautions: ['不要安装不明来源的“免费论文”插件。', '账号权限和数据库许可不可转借他人。'], official: [OFFICIAL.libraryOffCampus, OFFICIAL.libraryOrientation]
  },
  {
    slug: 'library-loans-renewals', sectionId: 'new-student', title: '借书、续借和罚款：把归还日当成会变化的状态',
    summary: '定期检查个人账户、召回通知和借阅规则，不只记第一次看到的日期。',
    region: '岭南大学图书馆', communityId: '68ad9837000000001d037444',
    intro: '借阅期限可能受资料类型、预约或召回影响。最安全的是用个人账户追踪，而不是把到期日只写在一次性备忘录里。',
    actions: ['借出后在个人账户核对资料与到期日。', '需要延长时按官方续借说明操作，并确认系统真正更新。', '收到召回或逾期通知时立即查看新期限和处理方式。'],
    cautions: ['课程指定资料可能有较短借期。', '不要假设自动续借一定成功。'], official: [OFFICIAL.libraryRenew, OFFICIAL.libraryFines, OFFICIAL.libraryReserves]
  },
  {
    slug: 'research-consultation', sectionId: 'new-student', title: '论文卡住时别只换关键词：预约一次研究咨询',
    summary: '带着研究问题、已用数据库和失败记录去咨询，效率远高于空泛求助。',
    region: '岭南大学图书馆 / 研究支持', communityId: '6906d75100000000050392d3',
    intro: '研究咨询不能替你写论文，但可以帮助梳理检索策略、资料类型和数据库选择。准备越具体，咨询越有效。',
    actions: ['整理研究题目、关键概念、时间范围和需要的资料类型。', '列出已经尝试的关键词、数据库和遇到的问题。', '预约后把建议转成新的检索式，并记录哪些结果真正相关。'],
    cautions: ['不要要求工作人员代写或代做系统综述。', '引用与最终论证责任仍由学生承担。'], official: [OFFICIAL.libraryConsultation, OFFICIAL.libraryCitation]
  },
  {
    slug: 'hostel-move-in-checklist', sectionId: 'housing', title: '岭南宿舍入住：第一天先检查功能，不急着布置',
    summary: '记录现有损耗，测试门锁、水电、网络和基本设施，再购买用品。',
    region: '岭南大学学生宿舍', communityId: '6a5c92de0000000001033105',
    intro: '入住当天最重要的是确认房间状态和报修渠道。先完成检查再布置，可以避免把原有问题误算到自己头上。',
    actions: ['按学校入住安排完成身份和钥匙/门卡手续。', '拍摄仅用于自留的房间状态记录，测试门锁、照明、插座、网络和水务。', '确认公共空间、洗衣、垃圾、安静时间和紧急疏散要求。'],
    cautions: ['不要在未确认规定前安装大功率电器。', '不要公开含房号、门卡或室友个人信息的照片。'], official: [OFFICIAL.osa, OFFICIAL.university]
  },
  {
    slug: 'hostel-or-rent-by-campus', sectionId: 'housing', title: '屯门校园还是 M+ 附近：先按实际上课地点选住处',
    summary: '同一个岭南项目可能使用不同地点，租房前先核对课表与项目通知。',
    region: '屯门 / 西九龙', communityId: '6a392262000000001101b205',
    intro: '住哪里不能只看学校名称。先确认主要上课地点、每周到校次数和晚课安排，再比较通勤、预算与生活便利。',
    actions: ['向项目办公室或当前课表确认主要教学地点，不根据往届截图推断。', '分别计算到屯门校园和 M+ 周边的门到门时间与最晚返程。', '把租金、交通、转乘、晚课打车风险和搬家成本放在同一张表比较。'],
    cautions: ['“离地铁近”不等于到教学地点转乘少。', '上课地点可能随课程或学期变化。'], official: [OFFICIAL.university, OFFICIAL.mplus, OFFICIAL.transport]
  },
  {
    slug: 'tuen-mun-rental-areas', sectionId: 'housing', title: '岭南屯门租房：用最后一段路筛区域',
    summary: '比较小区时重点看从车站或巴士站到住处的步行、夜路和雨天体验。',
    region: '屯门 / 小榄 / 兆康一带', communityId: '6a4e585d000000000f01cdca',
    intro: '区域推荐没有统一答案。对学生更有用的是把每天最后一段路走一遍，尤其是晚课、暴雨和携带电脑时的体验。',
    actions: ['从校园出发按预计下课时间实测公共交通和步行路线。', '记录转乘次数、候车环境、照明、坡道、便利店与日常采购。', '把通勤成本与月租、管理费、水电网络和家具一起算全年成本。'],
    cautions: ['不要只根据中介视频或地图截图签约。', '线路和班次应在营运商页面重新核对。'], official: [OFFICIAL.renting, OFFICIAL.transport, OFFICIAL.kmb]
  },
  {
    slug: 'rental-viewing-contract', sectionId: 'housing', title: '岭南校外租房：两次看房分别看什么',
    summary: '第一次筛硬伤，第二次核对合约、业主与入住成本。',
    region: '屯门及邻近区域', communityId: '6a58a570000000001101f2b3',
    intro: '一次看房很容易被装修和时间压力带走。把检查分成“房屋是否可住”和“交易是否安全”两轮，会更清楚。',
    actions: ['第一次测试水压、热水、冷气、窗户、漏水、噪音、网络和消防通道。', '第二次核对业主/代理身份、单位资料、租期、押金、维修、转租和退租条款。', '付款前确认收款人与合约主体一致，并留存签署和付款记录。'],
    cautions: ['不向身份不明的人支付留房费。', '租金异常低或拒绝现场核验时立即暂停。'], official: [OFFICIAL.renting, OFFICIAL.stampDuty]
  },
  {
    slug: 'roommate-agreement', sectionId: 'housing', title: '合租前先谈清楚：比“人很好”更重要的十分钟',
    summary: '作息、访客、清洁、费用和退租必须在签约前形成文字。',
    region: '香港 / 合租', communityId: '6a4b287c000000002201becf',
    intro: '合租矛盾通常不是大事，而是长期没有统一预期。第一次深入沟通应围绕生活规则和责任，而不是只聊学校和性格。',
    actions: ['确认作息、线上会议、做饭、空调、访客、吸烟宠物和公共空间使用。', '写清租金、水电网络、清洁用品和维修费用如何分担。', '约定提前退租、找替补、押金处理和共同物品归属。'],
    cautions: ['不要替陌生室友承担整套房的全部押金。', '口头承诺应写进合约或双方确认记录。'], official: [OFFICIAL.renting, OFFICIAL.stampDuty]
  },
  {
    slug: 'shenzhen-rental-crossborder', sectionId: 'housing', title: '住深圳读岭南：先做七天通勤模拟，再决定租房',
    summary: '跨境居住的关键是口岸、课程时间和不确定性，不只是租金差。',
    region: '深圳 / 岭南大学', communityId: '6a5ec6a3000000000f01cf54',
    intro: '深圳租金可能有吸引力，但日常成本包括地铁、口岸排队、香港段交通、早晚课和恶劣天气。签约前应模拟真实课表。',
    actions: ['按一周课表分别模拟早课、普通课和晚课的门到门时间。', '比较深圳湾、福田/落马洲或其他可用口岸的开放安排与香港段接驳。', '把交通费、时间、偶发打车、住宿和错过课堂风险一起量化。'],
    cautions: ['不要把一次顺畅通关当作长期平均时间。', '签证、口岸和交通安排以官方实时信息为准。'], official: [OFFICIAL.transport, OFFICIAL.mtr, OFFICIAL.kmb]
  },
  {
    slug: 'housing-total-cost', sectionId: 'housing', title: '租房预算不要只写月租：岭南学生全年成本表',
    summary: '押金、佣金、印花、水电网络、家具和通勤都应计入。',
    region: '香港 / 深圳', communityId: '6a4a96af000000001003e4d3',
    intro: '月租低不一定总成本低。远距离通勤、短租溢价、家具采购和提前退租，都可能改变最终结果。',
    actions: ['列出签约时一次性支付的押金、首月租金、佣金、印花和按金。', '估算每月水电、网络、管理费、交通和必要家居用品。', '按实际租期计算总成本，并单列最坏情况下提前退租的损失。'],
    cautions: ['不要用来源不明的旧报价当作当前市场价。', '比较时保持房型、人数和租期一致。'], official: [OFFICIAL.renting, OFFICIAL.stampDuty, OFFICIAL.transport]
  },
  {
    slug: 'shenzhen-bay-commute', sectionId: 'commute', title: '深圳湾口岸到岭南：路线设计要有迟到备用方案',
    summary: '把深圳段、过关、香港段和校园步行分开计时。',
    region: '深圳湾口岸 → 岭南大学', communityId: '6a2b8c07000000003503197e',
    intro: '跨境通勤不能只看导航给出的总时间。四段中任何一段波动，都会影响到课时间，因此至少准备一条替代香港段路线。',
    actions: ['分别记录到口岸、通关、香港巴士/转乘和到教学楼的时间。', '在实际上课日和时段试走，不用周末空闲时段代替。', '保存香港公共交通路线搜索，并设定最迟必须出门的时间。'],
    cautions: ['班次、口岸安排和道路状况会变化。', '考试和演示日应额外预留缓冲。'], official: [OFFICIAL.transport, OFFICIAL.kmb]
  },
  {
    slug: 'futian-lok-ma-chau-commute', sectionId: 'commute', title: '福田 / 落马洲方向去岭南：铁路稳定但转乘要算全',
    summary: '比较铁路与巴士组合时，重点看转乘步行和候车。',
    region: '福田口岸 / 落马洲 → 屯门', communityId: '6a203277000000002202a97d',
    intro: '铁路段时间相对容易估算，但到屯门校园通常还涉及转乘。选路线时应比较门到门而不是只比较车程。',
    actions: ['用官方路线搜索生成当天方案，确认口岸和铁路服务状态。', '记录每次转乘的步行、候车和高峰拥挤时间。', '准备一条发生延误时可改乘的巴士或铁路组合。'],
    cautions: ['不要长期依赖刚好衔接的一班车。', '尾班车和口岸开放信息必须当天核对。'], official: [OFFICIAL.mtr, OFFICIAL.transport]
  },
  {
    slug: 'late-class-return', sectionId: 'commute', title: '岭南晚课返程：课前就决定最晚离校方案',
    summary: '先核对末班与替代交通，再决定是否跨境或远距离通勤。',
    region: '岭南大学 → 屯门 / 深圳', communityId: '6a5729cd00000000060352e8',
    intro: '晚课结束后再查路线风险最高。开课前就应知道主路线、错过关键班次后的替代方案，以及是否需要临时留港。',
    actions: ['根据实际下课地点和时间查询末班及口岸安排。', '设置一条较早离校的保守方案和一条延误后的替代方案。', '携带足够电量和支付方式，并把行程告知可信联系人。'],
    cautions: ['不要把网约车或顺风车当作唯一固定方案。', '极端天气和大型活动期间优先遵从官方交通提示。'], official: [OFFICIAL.transport, OFFICIAL.mtr, OFFICIAL.kmb]
  },
  {
    slug: 'mplus-campus-commute', sectionId: 'commute', title: '去 M+ 附近上课：先确认入口，再算西九龙最后一公里',
    summary: '教学地点与博物馆访客路线未必相同，按项目通知找入口。',
    region: '屯门 / 西九龙文化区', communityId: '6a56fc79000000001702dbbc',
    intro: '西九龙范围大，抵达港铁站不等于抵达教室。第一次上课前应按项目通知确认具体建筑、楼层和进入方式。',
    actions: ['以课程或项目通知确认教学地点，不仅搜索“M+”。', '从常用港铁或巴士下车点实测步行、室内连接和天气影响。', '晚课后核对返屯门或跨境路线，并准备移动电源。'],
    cautions: ['不要跟随博物馆活动入口推断教学入口。', '活动日人流可能明显增加。'], official: [OFFICIAL.mplus, OFFICIAL.transport]
  },
  {
    slug: 'airport-to-lingnan', sectionId: 'commute', title: '带行李从香港机场到岭南：少一次换乘往往更重要',
    summary: '按行李数量选择路线，并把最后一段到宿舍或住处算进去。',
    region: '香港机场 → 屯门', communityId: '6a4e575c000000001700be6c',
    intro: '新生抵港时携带行李，最短时间路线未必最省力。优先比较升降机、换乘次数和下车后的步行。',
    actions: ['出发前用官方路线搜索比较巴士与铁路组合。', '确认目的地是校园、宿舍还是校外住处，并查看最后一段是否有台阶或长步行。', '把证件、手机、充电和少量必需品放在随身包，不塞进行李箱底。'],
    cautions: ['不要接受陌生人的代运或代保管要求。', '深夜抵港时先确认公共交通是否仍在服务。'], official: [OFFICIAL.transport, OFFICIAL.mtr]
  },
  {
    slug: 'campus-canteen-first-week', sectionId: 'food', title: '岭南食堂第一周：先建立自己的窗口清单',
    summary: '记录位置、出餐速度、份量和个人口味，不照搬“红黑榜”。',
    region: '岭南大学校内餐饮', communityId: '6a50adb0000000001702929c',
    intro: '食堂体验高度主观，且窗口和供应可能变化。第一周用小份量、不同时间测试，比一次性相信排名更可靠。',
    actions: ['分早餐、午间高峰和晚间各试一次，记录排队与出餐时间。', '按主食、蛋白质、蔬菜和价格建立自己的常用组合。', '遇到过敏、宗教或饮食限制时，直接向餐饮点确认配料和制作方式。'],
    cautions: ['不要把单次体验写成长期卫生或质量结论。', '价格与菜单以现场最新信息为准。'], official: [OFFICIAL.university]
  },
  {
    slug: 'budget-campus-meals', sectionId: 'food', title: '岭大日常吃饭预算：按一周组合，不按一顿最低价',
    summary: '把食堂、便利店、自煮和外食组合起来，预算才接近真实。',
    region: '岭南大学 / 屯门', communityId: '68b1c090000000001d026e21',
    intro: '一顿饭的最低价格不能代表每月餐饮成本。更实际的是按照课表，估算在校日、晚课日和周末的不同组合。',
    actions: ['记录一周实际购买，不凭印象估算。', '把饮料、零食、外卖费和跨境/通勤日餐食单独列出。', '用食堂与简单自煮搭配，优先保证营养和可持续。'],
    cautions: ['不采用过期菜单照片中的固定价格。', '极端压缩饮食预算会影响学习和健康。'], official: [OFFICIAL.university]
  },
  {
    slug: 'lingnan-house-meal', sectionId: 'food', title: '岭南楼学生餐怎么判断值不值：看场景，不只看价格',
    summary: '比较份量、等待时间、地点和当天课表，选最适合的用餐场景。',
    region: '岭南楼及校园周边', communityId: '68ce79af000000001301e492',
    intro: '学生餐是否适合取决于你当日的上课地点、时间和饮食需求。把它作为可选方案，而不是固定结论。',
    actions: ['第一次去先确认当天供应、购买资格和支付方式。', '比较从教室过去的时间、排队、份量和饭后返程。', '保留两个附近替代方案，避免供应结束或排队过长。'],
    cautions: ['社区帖子中的菜单与价格可能已变化。', '特殊饮食需求应现场确认。'], official: [OFFICIAL.university]
  },
  {
    slug: 'canteen-ordering', sectionId: 'food', title: '岭南食堂点单不慌：先看套餐结构和取餐方式',
    summary: '高峰期提前决定主食、配菜和支付方式，减少排队压力。',
    region: '岭南大学食堂', communityId: '67c277fc00000000290272f7',
    intro: '第一次点单容易被窗口名称和粤语表达影响。先观察套餐组成和取餐流程，必要时指向菜单确认。',
    actions: ['排队前看清套餐包含内容、加配规则和当日售罄提示。', '准备常用粤语或英语食物词，也可以直接指菜单确认。', '付款后留意叫号、票据或指定取餐位置。'],
    cautions: ['不要占着队伍临时讨论很久。', '对过敏原不确定时必须主动询问。'], official: [OFFICIAL.university]
  },
  {
    slug: 'canteen-or-cooking', sectionId: 'food', title: '食堂还是自煮：用时间成本判断，不只算食材价',
    summary: '采购、储存、烹饪和清洁都要计入，尤其适合跨境和合租学生。',
    region: '岭南大学 / 屯门居住', communityId: '671eecb70000000026037f70',
    intro: '自煮看起来便宜，但需要合适厨房、储存空间和稳定时间。用一周实际节奏判断比理论单价更准确。',
    actions: ['列出采购往返、准备、烹饪、清洁和食材损耗的时间。', '先从两三种可重复的简单餐开始，不一次购买大量调味料。', '与室友明确冰箱、厨具、垃圾和公共费用规则。'],
    cautions: ['宿舍或租约可能限制某些烹饪设备。', '注意食材保存和厨房消防安全。'], official: [OFFICIAL.renting, OFFICIAL.university]
  },
  {
    slug: 'tuen-mun-food-route', sectionId: 'food', title: '从岭南出发找饭：按“30 分钟内回到学习状态”规划',
    summary: '把交通、排队和返校一起算，建立日常、聚餐和深夜三类清单。',
    region: '屯门 / 岭南大学周边', communityId: '69663844000000001a034a85',
    intro: '附近美食不等于日常可用。平日更需要稳定、快和容易返校的选项，周末再安排目的地型餐厅。',
    actions: ['从校园出发实测步行或一段公共交通可达的日常餐饮。', '分别建立快速吃饭、多人聚餐和晚间可用的备选。', '保存回校路线和营业时间查询入口，出发前再确认。'],
    cautions: ['营业时间、休息日和排队情况会变化。', '不根据单次网红推荐判断长期品质。'], official: [OFFICIAL.transport, OFFICIAL.university]
  },
  {
    slug: 'food-safety-allergy', sectionId: 'food', title: '在校外食有过敏或忌口：把需求说具体',
    summary: '用明确食材和交叉接触问题沟通，不只说“我不能吃这个”。',
    region: '岭南大学及屯门餐饮', communityId: '68fc0f170000000007033b32',
    intro: '菜单名称未必能显示全部配料。对严重过敏、宗教饮食或医疗饮食要求，应主动说明具体食材与交叉接触风险。',
    actions: ['准备中英或粤语关键词，清楚说明不能接触的食材。', '询问酱汁、汤底、炸油和厨具是否可能交叉接触。', '无法确认时选择更简单、可看清配料的餐食。'],
    cautions: ['社区评论不能替代店员当日确认。', '严重过敏者应按医疗建议携带必要用品。'], official: [OFFICIAL.university]
  },
  {
    slug: 'campus-sports-facilities', sectionId: 'travel', title: '岭南校园运动设施：先看开放与预约，不直接去碰运气',
    summary: '把身份资格、开放时间、装备和预约规则一次确认。',
    region: '岭南大学校园', communityId: '69848bb5000000000e00fce8',
    intro: '运动设施可能按教学、校队、活动和一般使用分配时段。使用前查看学校最新安排，比社交平台打卡信息更可靠。',
    actions: ['从学校或学生事务入口查看当前开放与预约说明。', '确认学生身份、服装、器材和同行人数要求。', '第一次提前到场，了解储物、淋浴和安全规则。'],
    cautions: ['大型活动期间时段可能调整。', '不要在未获许可的区域拍摄他人。'], official: [OFFICIAL.osa, OFFICIAL.university]
  },
  {
    slug: 'campus-pool-use', sectionId: 'travel', title: '岭南泳池使用前：别只看“隐世打卡”，先看安全规则',
    summary: '确认开放、资格、救生安排和个人健康状况。',
    region: '岭南大学校园', communityId: '6a54fc6b000000000c003001',
    intro: '校园泳池首先是运动设施，不是拍照景点。开放时段、使用资格和现场安排应以学校通知为准。',
    actions: ['出发前查看当前开放与预约信息。', '准备合规泳装、个人用品和学生身份证明。', '遵从现场救生员和分道规则，身体不适时停止使用。'],
    cautions: ['不把旧帖子中的开放时段当作当前信息。', '避免拍到其他使用者或更衣区域。'], official: [OFFICIAL.osa, OFFICIAL.university]
  },
  {
    slug: 'campus-nature-walk', sectionId: 'travel', title: '岭南校园散步：把它做成课间恢复路线',
    summary: '选一条短、可回到教室、雨天也有替代的路线。',
    region: '岭南大学校园', communityId: '6a3fc7e5000000000d00bc00',
    intro: '校园环境适合短时恢复，但不是每次都要走完整圈。按照课间长度设置 10 分钟、20 分钟两种路线更实用。',
    actions: ['从常用教学楼出发，选择照明和人流较稳定的路径。', '记录可短暂停留、饮水和返回室内的位置。', '雨天改走有遮蔽的连接路线，并注意湿滑。'],
    cautions: ['不要进入施工、维护或未开放区域。', '夜间独自行走优先选择明亮主路。'], official: [OFFICIAL.university]
  },
  {
    slug: 'programme-experience-reading', sectionId: 'new-student', title: '读“就读体验”时怎么避免被一个人的感受带偏',
    summary: '拆分课程事实、个人背景、当期安排和主观评价。',
    region: '岭南大学 / 项目体验', communityId: '69bc3373000000001d01d28e',
    intro: '就读体验最有价值的是具体场景，而不是“好”或“不好”的总评。读完后应能说出哪些信息可核对，哪些只适用于作者背景。',
    actions: ['把课程名称、评核和时间安排交回官网或项目资料核对。', '记录作者专业背景、工作经验和目标，判断与自己是否相似。', '把主观评价改写成要向项目办公室或在读生追问的具体问题。'],
    cautions: ['不把单个就业结果归因于整个项目。', '不传播涉及教师或同学的未经核实指控。'], official: [OFFICIAL.university]
  },
  {
    slug: 'career-preinternship-training', sectionId: 'new-student', title: '想找实习先做什么：岭南 PTP 不是简历模板下载',
    summary: '先完成求职安全与职业操守基础，再补简历、面试和商业沟通。',
    region: '岭南大学 / 职业发展', communityId: '69fdfa04000000002202bd50',
    intro: '岭南学生事务处的实习前培训把求职安全、职业操守和求职准备分开。学生应按当期要求完成，而不是只追求一张证书。',
    actions: ['查看当期 PTP 结构、报名和完成要求。', '优先完成与就业陷阱和工作操守相关的基础模块。', '再把简历、LinkedIn、面试和商业邮件训练应用到真实岗位。'],
    cautions: ['活动日期和 ILP 安排会更新。', '任何要求先购买产品、交押金或借贷的“实习”都应提高警惕。'], official: [OFFICIAL.careerTraining, OFFICIAL.osa]
  },
  {
    slug: 'job-search-seven-months', sectionId: 'new-student', title: '港硕求职周期很长时：用漏斗找问题，不用情绪判断',
    summary: '分开看岗位数量、回复率、面试率和 offer 转化，逐层改进。',
    region: '香港 / 岭南学生求职', communityId: '6a55a6b000000000070135f6',
    intro: '“投了很久没结果”需要拆成数据。不同阶段的问题可能是方向太宽、简历不匹配、面试准备不足或工作许可条件不合适。',
    actions: ['每周记录岗位来源、要求、投递版本和结果。', '分别计算回复、笔试、面试和最终结果，找出损失最大的阶段。', '带着具体岗位和材料预约职业咨询，做针对性修改。'],
    cautions: ['不要为追求投递数量忽略岗位真实性。', '个别网友的求职时长不能代表你的结果。'], official: [OFFICIAL.careerExpo, OFFICIAL.careerTraining]
  },
  {
    slug: 'internship-scam-check', sectionId: 'new-student', title: '香港实习避坑：先验证雇主，再提交个人资料',
    summary: '遇到收费、贷款、代购或过度索取资料时立即暂停。',
    region: '香港 / 实习求职', communityId: '6a550094000000000802520f',
    intro: '真实岗位也需要核验。特别是要求购买服务、缴押金、借贷、代收款或过早提供敏感信息的职位，应先向学校职业服务和官方渠道求证。',
    actions: ['核对公司名称、正式网站、办公地址和招聘联系人域名。', '查看职位工作内容、薪酬、工时、保险与签证要求是否写清。', '提交身份证明或银行资料前确认用途、保存方式和必要性。'],
    cautions: ['不替公司或客户转账、收款或开设账户。', '不因“名额马上结束”跳过书面合约。'], official: [OFFICIAL.careerTraining, OFFICIAL.careerExpo]
  },
  {
    slug: 'career-expo-prep', sectionId: 'new-student', title: '参加岭南 Career Expo：提前选公司，比现场发一圈简历有效',
    summary: '按行业、岗位和问题清单准备，活动后 24 小时内整理跟进。',
    region: '岭南大学 / Career Expo', communityId: '6a0dec64000000000702ef8f',
    intro: '职业展的价值不只是收职位表。先选目标公司并准备针对性问题，能更快判断岗位是否适合自己。',
    actions: ['从官方名单筛出优先、探索和备选三组公司。', '为优先公司准备一段自我介绍、两项相关经历和三个具体问题。', '活动后整理联系人、岗位、下一步和申请截止日期。'],
    cautions: ['不要在公共场合展示含身份证号或住址的完整简历。', '展会名单和安排以当期官方页面为准。'], official: [OFFICIAL.careerExpo, OFFICIAL.osa]
  },
  {
    slug: 'library-power-and-lockers', sectionId: 'new-student', title: '图书馆临时需求：充电、取件和饮水先查设施页',
    summary: '小事提前知道入口，期末就不会在楼里来回找。',
    region: '岭南大学图书馆', communityId: '6a5deb07000000000f03fc94',
    intro: '图书馆设施不仅有座位和书。官方设施页会列出自助取件、移动电源、饮水等服务；可用性和收费需以现场为准。',
    actions: ['在设施页确认服务地点和使用条件。', '第一次使用时先看现场说明，不把账号或付款信息交给陌生人操作。', '离开前归还借用设备并确认个人物品齐全。'],
    cautions: ['设施可能维护或临时停用。', '公共充电时不要让设备长时间无人看管。'], official: [OFFICIAL.libraryOther, OFFICIAL.libraryHours]
  },
  {
    slug: 'rainy-day-campus', sectionId: 'travel', title: '岭南雨天上课：把湿滑、设备和迟到风险一起处理',
    summary: '提前走有遮蔽路线，电脑双层防水，并给转场留缓冲。',
    region: '岭南大学校园', communityId: '6a12852e0000000036003d4d',
    intro: '暴雨天最容易低估的是短距离步行和楼宇入口拥堵。提前准备路线和设备保护，比到校后临时处理更可靠。',
    actions: ['查看天气和交通提示，提早出门并选择照明、遮蔽较好的主路。', '电脑和证件使用独立防水袋，不只依赖背包外层。', '到教室后先擦干设备和充电接口，再开机使用。'],
    cautions: ['极端天气期间遵从学校和政府安排。', '不要穿越积水、封闭或施工区域抄近路。'], official: [OFFICIAL.university, OFFICIAL.transport]
  }
];

export const lingnanPracticalGuidePosts = guideSeeds.map((guide, index) => ({
  id: `lingnan_practical_${guide.slug}_2026`,
  sectionId: guide.sectionId,
  title: guide.title,
  summary: guide.summary,
  content: buildContent(guide),
  tags: ['岭南大学', '学生实用攻略', guide.sectionId === 'new-student' ? '新生与在读' : guide.region, guide.title.split('：')[0]],
  region: guide.region,
  source: `社区经验线索：${communityUrl(guide.communityId)}；官网核验：${guide.official.join('；')}`,
  authorRole: 'Otter 学生资料编辑部',
  createdAt: UPDATED_AT,
  updatedAt: UPDATED_AT,
  status: 'published',
  shared: false,
  recommended: index < 12,
  pinned: false,
  schoolId: 'lingnan',
  imageUrls: [`/images/guides/lingnan-practical/${guide.slug}.webp`],
  metadata: {
    主题类型: '岭南大学实用攻略',
    信息性质: '社区经验整理，关键事实以官网为准',
    核验日期: '2026-07-21',
    社区来源: communityUrl(guide.communityId)
  }
}));

export const lingnanPracticalGuideCount = lingnanPracticalGuidePosts.length;
