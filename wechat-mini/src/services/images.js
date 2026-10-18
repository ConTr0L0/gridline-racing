export const teamLogos = {
  mercedes: require('../assets/team-logos/f1-2026-color-mercedes.webp'),
  ferrari: require('../assets/team-logos/f1-2026-color-ferrari.webp'),
  mclaren: require('../assets/team-logos/f1-2026-color-mclaren.webp'),
  redbull: require('../assets/team-logos/f1-2026-color-redbull.webp'),
  'racing-bulls': require('../assets/team-logos/f1-2026-color-racing-bulls.webp'),
  alpine: require('../assets/team-logos/f1-2026-color-alpine.webp'),
  'haas-f1-team': require('../assets/team-logos/f1-2026-color-haas.webp'),
  audi: require('../assets/team-logos/f1-2026-color-audi.webp'),
  williams: require('../assets/team-logos/f1-2026-color-williams.webp'),
  aston: require('../assets/team-logos/f1-2026-color-aston.webp'),
  cadillac: require('../assets/team-logos/f1-2026-color-cadillac.webp'),
};

export const teamCars = {
  mercedes: require('../assets/team-cars/2026mercedescarright.png'),
  ferrari: require('../assets/team-cars/2026ferraricarright.png'),
  mclaren: require('../assets/team-cars/2026mclarencarright.png'),
  redbull: require('../assets/team-cars/2026redbullracingcarright.png'),
  'racing-bulls': require('../assets/team-cars/2026racingbullscarright.png'),
  alpine: require('../assets/team-cars/2026alpinecarright.png'),
  'haas-f1-team': require('../assets/team-cars/2026haasf1teamcarright.png'),
  audi: require('../assets/team-cars/2026audicarright.png'),
  williams: require('../assets/team-cars/2026williamscarright.png'),
  aston: require('../assets/team-cars/2026astonmartincarright.png'),
  cadillac: require('../assets/team-cars/2026cadillaccarright.png'),
};

const portraitBase = 'https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001';
const portraitPaths = {
  RUS: '/common/f1/2026/mercedes/georus01/2026mercedesgeorus01right.webp',
  ANT: '/common/f1/2026/mercedes/andant01/2026mercedesandant01right.webp',
  LEC: '/common/f1/2026/ferrari/chalec01/2026ferrarichalec01right.webp',
  HAM: '/common/f1/2026/ferrari/lewham01/2026ferrarilewham01right.webp',
  NOR: '/common/f1/2026/mclaren/lannor01/2026mclarenlannor01right.webp',
  PIA: '/common/f1/2026/mclaren/oscpia01/2026mclarenoscpia01right.webp',
  VER: '/common/f1/2026/redbullracing/maxver01/2026redbullracingmaxver01right.webp',
  HAD: '/common/f1/2026/redbullracing/isahad01/2026redbullracingisahad01right.webp',
  LAW: '/common/f1/2026/racingbulls/lialaw01/2026racingbullslialaw01right.webp',
  LIN: '/common/f1/2026/racingbulls/arvlin01/2026racingbullsarvlin01right.webp',
  GAS: '/common/f1/2026/alpine/piegas01/2026alpinepiegas01right.webp',
  COL: '/common/f1/2026/alpine/fracol01/2026alpinefracol01right.webp',
  OCO: '/common/f1/2026/haasf1team/estoco01/2026haasf1teamestoco01right.webp',
  BEA: '/common/f1/2026/haasf1team/olibea01/2026haasf1teamolibea01right.webp',
  HUL: '/common/f1/2026/audi/nichul01/2026audinichul01right.webp',
  BOR: '/common/f1/2026/audi/gabbor01/2026audigabbor01right.webp',
  SAI: '/common/f1/2026/williams/carsai01/2026williamscarsai01right.webp',
  ALB: '/common/f1/2026/williams/alealb01/2026williamsalealb01right.webp',
  ALO: '/common/f1/2026/astonmartin/feralo01/2026astonmartinferalo01right.webp',
  STR: '/common/f1/2026/astonmartin/lanstr01/2026astonmartinlanstr01right.webp',
  PER: '/common/f1/2026/cadillac/serper01/2026cadillacserper01right.webp',
  BOT: '/common/f1/2026/cadillac/valbot01/2026cadillacvalbot01right.webp',
};

export const driverPortrait = (driver) => portraitPaths[driver?.code]
  ? `${portraitBase}${portraitPaths[driver.code]}`
  : driver?.headshotUrl;

const trackSlugs = {
  melbourne: 'melbourne', shanghai: 'shanghai', suzuka: 'suzuka', miami: 'miami',
  gillesvilleneuve: 'montreal', monaco: 'montecarlo', barcelonacatalunya: 'catalunya',
  redbullring: 'spielberg', silverstone: 'silverstone', spafrancorchamps: 'spafrancorchamps',
  hungaroring: 'hungaroring', zandvoort: 'zandvoort', monza: 'monza', madring: 'madring',
  baku: 'baku', singapore: 'singapore', austin: 'austin', mexicocity: 'mexicocity',
  interlagos: 'interlagos', lasvegas: 'lasvegas', lusail: 'lusail', yasmarina: 'yasmarina',
};

const venueSlugs = {
  '阿尔伯特公园赛道': 'melbourne', '上海国际赛车场': 'shanghai', '铃鹿国际赛道': 'suzuka',
  '迈阿密国际赛车场': 'miami', '吉尔·维伦纽夫赛道': 'montreal', '巴塞罗那-加泰罗尼亚赛道': 'catalunya',
  '摩纳哥赛道': 'montecarlo', '红牛赛道': 'spielberg', '银石赛道': 'silverstone',
  '斯帕-弗朗科尔尚赛道': 'spafrancorchamps', '匈牙利赛道': 'hungaroring',
  '赞德沃特赛道': 'zandvoort', '蒙扎国家赛车场': 'monza', '马德里赛道': 'madring',
  '蒙扎赛道': 'monza',
  '巴库街道赛道': 'baku', '巴库城市赛道': 'baku', '滨海湾街道赛道': 'singapore',
  '美洲赛道': 'austin', '罗德里格斯兄弟赛道': 'mexicocity', '若泽·卡洛斯·帕塞赛道': 'interlagos',
  '拉斯维加斯街道赛道': 'lasvegas', '卢赛尔国际赛道': 'lusail', '亚斯码头赛道': 'yasmarina',
  '巴林国际赛道': 'bahrain', '吉达滨海赛道': 'jeddah',
  'Albert Park Grand Prix Circuit': 'melbourne', 'Shanghai International Circuit': 'shanghai',
  'Suzuka International Racing Course': 'suzuka', 'Miami International Autodrome': 'miami',
  'Circuit Gilles-Villeneuve': 'montreal', 'Circuit de Monaco': 'montecarlo',
  'Circuit de Barcelona-Catalunya': 'catalunya', 'Red Bull Ring': 'spielberg',
  'Silverstone Circuit': 'silverstone', 'Circuit de Spa-Francorchamps': 'spafrancorchamps',
  Hungaroring: 'hungaroring', 'Circuit Zandvoort': 'zandvoort', 'Autodromo Nazionale Monza': 'monza',
  Madring: 'madring', Baku: 'baku', 'Baku City Circuit': 'baku',
  'Marina Bay Street Circuit': 'singapore', 'Circuit of The Americas': 'austin',
  'Autódromo Hermanos Rodríguez': 'mexicocity', 'Autódromo José Carlos Pace': 'interlagos',
  'Las Vegas Strip Street Circuit': 'lasvegas', Lusail: 'lusail', 'Yas Marina Circuit': 'yasmarina',
  'Bahrain International Circuit': 'bahrain', 'Jeddah Corniche Circuit': 'jeddah',
};

const circuitUrl = (slug) => slug
  ? `https://media.formula1.com/image/upload/c_fit%2Ch_704/q_auto/v1740000001/common/f1/2026/track/2026track${slug}detailed.webp`
  : undefined;

export const circuitImageForRace = (race) => circuitUrl(venueSlugs[race?.venue]);
export const circuitImageForTrack = (track) => circuitUrl(trackSlugs[track?.id]);

// Match the circuit, not the country: the US and Spain host multiple races.
export const circuitIdForRace = (race) => {
  if (race?.venue === '雪邦国际赛道') return 'kualalumpur';
  if (race?.venue === '蒙扎赛道') return 'monza';
  const slug = venueSlugs[race?.venue];
  return Object.keys(trackSlugs).find(id => trackSlugs[id] === slug);
};
