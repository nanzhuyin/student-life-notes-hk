import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataPath = path.join(rootDir, 'src/data/platformData.json');

const TODAY = '2026-07-08';
const ROUTE_MARKER = '从岭南大学过去：';

const commonSource = [
  '岭南大学位于屯门富泰，邻近兆康站和轻铁',
  '富泰公共运输交汇处有 K51、K51A、K58 等路线',
  'K51/K51A 连接新墟、屯门市中心、三圣、黄金海岸等方向',
  '轻铁兆康站/凤地站可接驳屯门、蓝地、新墟等站'
].join('；');

const routeGuides = {
  'shared-ac938a9e6a44dfc900c0f0163cd739f1': {
    fromLingnan: '校内步行前往岭南楼二楼',
    transport: '步行',
    time: '约 3-8 分钟，按出发教学楼位置不同会有差异',
    reminder: '适合两节课之间、下雨天或赶小组会；无需出校，按校内指示前往岭南楼。',
    paragraphs: [
      '从岭南大学过去：这是校内路线，直接从教学楼或宿舍步行到岭南楼二楼即可，通常约 3-8 分钟。赶课、下雨、晚上不想出校时最稳，不需要额外交通工具。'
    ]
  },
  'shared-ff712f126a44df04003400a109818f6f': {
    fromLingnan: '从富泰/岭南大学站位搭 K51/K51A 往红桥或新墟方向，下车后步行',
    transport: '港铁巴士 K51/K51A；也可步行到兆康/凤地轻铁后转轻铁到新墟一带',
    time: '约 15-25 分钟，饭点和等车时间会影响较大',
    reminder: '红桥店铺密集但饭点可能排队；如果下一节课很紧，优先校内或富泰。',
    paragraphs: [
      '从岭南大学过去：先步行到富泰公共运输交汇处或青山公路近岭南大学的巴士站，搭 K51/K51A 往新墟、屯门市中心方向，在红桥或新墟附近站位下车后步行。也可以先到凤地/兆康轻铁站，再坐轻铁到新墟一带。全程通常约 15-25 分钟，饭点和等车时间会拉长。',
      '交通提醒：K58 也覆盖部分新墟、市中心方向，但主要是上课日早高峰服务，不建议把它当作日常回程依赖；出发前用 MTR Mobile 或地图查实时班次。'
    ]
  },
  'shared-ff712f126a44e1b9003459c22a320d66': {
    fromLingnan: '步行/巴士到兆康站，屯马线转东涌线，再在欣澳转迪士尼线',
    transport: '港铁屯马线 + 东涌线 + 迪士尼线；假日可查 R33 是否由屯门站开出',
    time: '约 75-100 分钟，视换乘和入园人流而定',
    reminder: '烟花后回程人多，先查尾班车；R33 属指定日子/班次服务，不能默认每天有。',
    paragraphs: [
      '从岭南大学过去：先步行或搭短途巴士到兆康站，坐屯马线出市区方向，到南昌转东涌线，再到欣澳转迪士尼线到迪士尼站。全程通常约 75-100 分钟，换乘顺不顺会差很多。',
      '另一种走法：周末或公众假期可以查 R33 是否由屯门站开往迪士尼，但它不是每天全天服务。看完烟花回程人多，建议提前查尾班车和当天特别交通安排。'
    ]
  },
  'lingnan-food-report-tuen-mun-nearby-001': {
    fromLingnan: '校内步行、富泰/兆康步行或短途车；红桥/新墟/市中心用 K51/K51A 或轻铁',
    transport: '步行、港铁巴士 K51/K51A、轻铁、必要时短途的士',
    time: '校内 3-8 分钟；富泰/兆康 5-15 分钟；红桥/新墟 15-25 分钟；市中心 20-30 分钟',
    reminder: 'K51/K51A 是日常主力；K58 只适合特定上课日早高峰，不适合当晚间回程方案。',
    paragraphs: [
      '从岭南大学过去：校内吃饭直接步行；富泰/兆康圈通常步行 5-15 分钟或搭一小段巴士；红桥/新墟可从富泰或岭南大学附近站位搭 K51/K51A，或到凤地/兆康轻铁站转轻铁；屯门市中心、V city、市广场同样可搭 K51/K51A 或轻铁到屯门/市中心站。',
      '交通工具选择：赶课选校内或富泰；想吃街坊饭坐 K51/K51A 去红桥/新墟；多人聚餐再去市中心。K58 有时会出现在线路建议里，但它主要是上课日早高峰，不建议作为常规饭点路线。'
    ]
  },
  'lingnan-food-hung-kiu-noodles-002': {
    fromLingnan: '从富泰/岭南大学站位搭 K51/K51A 往红桥/新墟方向',
    transport: '港铁巴士 K51/K51A；轻铁到新墟再步行也可以',
    time: '约 15-25 分钟',
    reminder: '红桥饭点排队时，回程要预留等车时间。',
    paragraphs: [
      '从岭南大学过去：步行到富泰公共运输交汇处或青山公路近岭南大学站位，搭 K51/K51A 往新墟、屯门市中心方向，在红桥或新墟一带下车后步行。也可以从凤地/兆康坐轻铁到新墟附近，再步行过去。',
      '交通提醒：如果下午错峰去，巴士和店内排队压力都小一点；正午或晚饭点去，建议预留 20 分钟以上路程和排队缓冲。'
    ]
  },
  'lingnan-food-san-hui-market-003': {
    fromLingnan: 'K51/K51A 到新墟，或轻铁凤地/兆康到新墟站',
    transport: '港铁巴士 K51/K51A；轻铁 614/614P 等经新墟方向路线',
    time: '约 15-25 分钟',
    reminder: '买菜买水果建议避开收档前；第一次去带一点现金更稳。',
    paragraphs: [
      '从岭南大学过去：从富泰或岭南大学附近巴士站搭 K51/K51A 到新墟一带，下车后步行去街市和周边小店。轻铁也可以，从凤地或兆康出发，坐到新墟站附近再步行。',
      '交通提醒：新墟适合不赶课的时候去。买水果、街市和药房可以顺路完成，但街市摊档和小店时间不一定统一，晚上太晚去选择会少。'
    ]
  },
  'lingnan-food-fu-tai-siu-hong-004': {
    fromLingnan: '富泰可步行；兆康可步行或搭 K51/K51A/K58 一小段',
    transport: '步行、港铁巴士、轻铁/屯马线兆康站',
    time: '富泰约 5-10 分钟；兆康约 10-20 分钟',
    reminder: '晚上回校尽量走主路和人多路线；别只按白天体感判断距离。',
    paragraphs: [
      '从岭南大学过去：富泰基本靠步行，通常 5-10 分钟；去兆康苑、兆康站一带可以步行约 10-20 分钟，也可以从富泰或岭南大学附近站位搭 K51/K51A/K58 一小段到兆康附近。',
      '交通提醒：兆康站可接屯马线和轻铁，适合作为去市区或屯门其他地方前后的补给点。晚上回校注意选择主路，不熟路时优先跟地图走。'
    ]
  },
  'lingnan-food-town-centre-vcity-005': {
    fromLingnan: 'K51/K51A 到屯门市中心/屯门站，或轻铁到市中心/屯门站',
    transport: '港铁巴士 K51/K51A；轻铁；屯马线屯门站周边步行',
    time: '约 20-30 分钟',
    reminder: '多人聚餐适合市中心；如果只是一个人快速吃饭，不必专门跑这么远。',
    paragraphs: [
      '从岭南大学过去：从富泰或岭南大学附近站位搭 K51/K51A 到屯门市中心或屯门站，下车后步行到 V city、屯门市广场一带。也可以先到凤地/兆康轻铁站，坐轻铁到市中心或屯门站。',
      '交通提醒：市中心饭点和周末人多，回程同样要看车。小组聚餐建议先约在屯门站或商场门口，别约在“市中心”这种太泛的位置。'
    ]
  },
  'lingnan-food-lam-tei-miu-fat-006': {
    fromLingnan: '从凤地/兆康坐轻铁到蓝地站，再步行；也可短途巴士/的士',
    transport: '轻铁到蓝地站 + 步行；短途巴士或的士',
    time: '约 15-30 分钟',
    reminder: '宗教场所和素食供应时间可能变化，出发前确认开放和供应安排。',
    paragraphs: [
      '从岭南大学过去：先步行到凤地或兆康轻铁站，坐轻铁到蓝地站，再按地图步行前往妙法寺一带。若天气太热或同行人数多，也可以考虑短途的士。',
      '交通提醒：这条路线不适合赶课前临时去。妙法寺开放区域、素食供应和活动安排可能变化，出发前先查当天资讯。'
    ]
  },
  'lingnan-travel-report-tuen-mun-001': {
    fromLingnan: '近处用步行/轻铁/K51；黄金海岸用 K51/K51A；迪士尼用屯马线转东涌线和迪士尼线',
    transport: '步行、轻铁、港铁巴士 K51/K51A、屯马线、东涌线、迪士尼线',
    time: '屯门本地约 15-45 分钟；迪士尼约 75-100 分钟',
    reminder: '本地路线适合临时出门；跨区路线必须查尾班车和特别交通。',
    paragraphs: [
      '从岭南大学过去：屯门本地路线优先用步行、轻铁和 K51/K51A。屯门公园、市中心、河边通常 20-30 分钟内可到；黄金海岸搭 K51/K51A 约 30-45 分钟；蓝地妙法寺可轻铁到蓝地再步行；青山/屯门径要先到合适登山口，建议用地图确认入口。',
      '交通提醒：如果是迪士尼这类跨区景点，路线会变成兆康站屯马线出发，转东涌线到欣澳，再转迪士尼线。跨区出行别只看去程，先查回程和尾班车。'
    ]
  },
  'lingnan-travel-tuen-mun-park-002': {
    fromLingnan: 'K51/K51A 到屯门市中心/屯门站，再步行到屯门公园',
    transport: '港铁巴士 K51/K51A；轻铁到市中心/屯门站',
    time: '约 20-30 分钟',
    reminder: '适合傍晚顺路散步；晚上不要走太偏。',
    paragraphs: [
      '从岭南大学过去：从富泰或岭南大学附近站位搭 K51/K51A 到屯门市中心或屯门站，下车后步行到屯门公园。也可以从凤地/兆康坐轻铁到市中心或屯门站再步行。',
      '交通提醒：屯门公园最适合和市中心吃饭、买东西一起安排。傍晚舒服，晚上独自去就别走太偏的角落。'
    ]
  },
  'lingnan-travel-golden-coast-003': {
    fromLingnan: '从富泰/岭南大学站位搭 K51/K51A 往黄金海岸/三圣方向',
    transport: '港铁巴士 K51/K51A；必要时屯门市中心转车',
    time: '约 30-45 分钟，假日和海边活动日可能更久',
    reminder: '傍晚看海更舒服；回程先查 K51/K51A 和后续接驳。',
    paragraphs: [
      '从岭南大学过去：从富泰公共运输交汇处或岭南大学附近站位搭 K51/K51A，往三圣、黄金海岸方向，在黄金海岸或黄金泳滩附近下车后步行。平日约 30-45 分钟，周末、假期和活动日可能更久。',
      '交通提醒：去海边建议傍晚，不建议正午暴晒。回程先查 K51/K51A 班次，如果太晚或天气差，可以先回屯门市中心再转车。'
    ]
  },
  'lingnan-travel-castle-peak-trail-004': {
    fromLingnan: '先到屯门市中心/新墟/青山寺附近，再按当天选择的登山口步行或短途车',
    transport: 'K51/K51A、轻铁、短途巴士/的士、步行',
    time: '到登山口约 25-45 分钟；行山时间另计',
    reminder: '登山口不止一个，出发前按路线确认入口和回程；不要夜行。',
    paragraphs: [
      '从岭南大学过去：先搭 K51/K51A 或轻铁到屯门市中心、新墟或青山寺附近，再按当天选择的登山口步行或短途车过去。到登山口通常约 25-45 分钟，真正耗体力的是之后的上山路线。',
      '交通提醒：青山/屯门径不是普通散步，入口和出口可能不同。出发前用地图确认登山口、回程车站和天气；第一次去尽量结伴，别晚上去。'
    ]
  },
  'lingnan-travel-miu-fat-lam-tei-005': {
    fromLingnan: '从凤地/兆康坐轻铁到蓝地站，再步行到妙法寺',
    transport: '轻铁到蓝地站 + 步行；短途的士可作备选',
    time: '约 15-30 分钟',
    reminder: '适合半日慢行，不适合赶时间；出发前查开放时间。',
    paragraphs: [
      '从岭南大学过去：步行到凤地或兆康轻铁站，坐轻铁到蓝地站，下车后按地图步行到妙法寺。天气太热、同行人多或不熟路时，可以把短途的士作为备选。',
      '交通提醒：妙法寺更适合半日慢慢走，不适合卡课间去。开放时间、可进入区域和素食供应可能变化，出发前确认。'
    ]
  },
  'lingnan-travel-riverside-town-centre-006': {
    fromLingnan: 'K51/K51A 或轻铁到屯门市中心/屯门站，再步行串屯门河边、商场和公园',
    transport: '港铁巴士 K51/K51A；轻铁；步行',
    time: '约 20-30 分钟到市中心，散步时间另计',
    reminder: '这条路线最适合傍晚；晚上独自走河边要避开偏僻段。',
    paragraphs: [
      '从岭南大学过去：从富泰或岭南大学附近站位搭 K51/K51A 到屯门市中心或屯门站，或者从凤地/兆康坐轻铁到市中心/屯门站。到达后可以步行串起屯门河边、V city、市广场和屯门公园。',
      '交通提醒：这条路线胜在不用规划复杂行程，适合下课后放空。晚上独自走河边时别走太偏，回程先看车。'
    ]
  }
};

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
data.version = 'v1.54';
data.generatedAt = new Date().toISOString();

let updated = 0;

for (const post of data.sharedPosts) {
  const guide = routeGuides[post.id];
  if (!guide) continue;

  const baseContent = String(post.content || '').split(`\n${ROUTE_MARKER}`)[0].trim();
  post.content = `${baseContent}\n${guide.paragraphs.join('\n')}`;
  post.metadata = {
    ...(post.metadata || {}),
    '从岭南出发': guide.fromLingnan,
    '交通工具': guide.transport,
    '预计时间': guide.time,
    '路线提醒': guide.reminder,
    '交通资料来源': commonSource
  };
  post.updatedAt = TODAY;
  updated += 1;
}

fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(`Updated ${updated} Lingnan food/travel route guides.`);
console.log(`platformData version: ${data.version}`);
