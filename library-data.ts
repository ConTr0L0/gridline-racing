export const libraryStatsAsOf = '2026-09-13';

export type SeasonStats = {
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
};

export type CareerStats = {
  entered: number;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  titles: number;
};

export type DriverProfile = {
  code: string;
  name: string;
  country: string;
  number: number;
  teamId: string;
  points: number;
  seasonStatus: 'current' | 'substitute';
  season: SeasonStats;
  career: CareerStats;
  source: string;
};

const f1Driver = (slug: string) => `https://www.formula1.com/en/drivers/${slug}`;

// Season figures are the official F1 snapshot through the 2026 Spanish Grand Prix.
export const driverProfiles: DriverProfile[] = [
  { code: 'ANT', name: '安德烈亚·基米·安东内利', country: '意大利', number: 12, teamId: 'mercedes', points: 292, seasonStatus: 'current', season: { races: 14, wins: 8, podiums: 12, poles: 6, fastestLaps: 7 }, career: { entered: 38, points: 442, wins: 8, podiums: 15, poles: 6, titles: 0 }, source: f1Driver('kimi-antonelli') },
  { code: 'RUS', name: '乔治·拉塞尔', country: '英国', number: 63, teamId: 'mercedes', points: 211, seasonStatus: 'current', season: { races: 14, wins: 2, podiums: 7, poles: 4, fastestLaps: 1 }, career: { entered: 166, points: 1244, wins: 7, podiums: 31, poles: 12, titles: 0 }, source: f1Driver('george-russell') },
  { code: 'HAM', name: '刘易斯·汉密尔顿', country: '英国', number: 44, teamId: 'ferrari', points: 191, seasonStatus: 'current', season: { races: 14, wins: 1, podiums: 5, poles: 0, fastestLaps: 1 }, career: { entered: 394, points: 5209.5, wins: 106, podiums: 207, poles: 104, titles: 7 }, source: f1Driver('lewis-hamilton') },
  { code: 'NOR', name: '兰多·诺里斯', country: '英国', number: 1, teamId: 'mclaren', points: 186, seasonStatus: 'current', season: { races: 14, wins: 2, podiums: 5, poles: 3, fastestLaps: 2 }, career: { entered: 165, points: 1616, wins: 13, podiums: 49, poles: 19, titles: 1 }, source: f1Driver('lando-norris') },
  { code: 'LEC', name: '夏尔·勒克莱尔', country: '摩纳哥', number: 16, teamId: 'ferrari', points: 167, seasonStatus: 'current', season: { races: 14, wins: 1, podiums: 4, poles: 0, fastestLaps: 2 }, career: { entered: 185, points: 1839, wins: 9, podiums: 54, poles: 27, titles: 0 }, source: f1Driver('charles-leclerc') },
  { code: 'VER', name: '马克斯·维斯塔潘', country: '荷兰', number: 3, teamId: 'redbull', points: 145, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 6, poles: 0, fastestLaps: 1 }, career: { entered: 247, points: 3589.5, wins: 71, podiums: 133, poles: 48, titles: 4 }, source: f1Driver('max-verstappen') },
  { code: 'PIA', name: '奥斯卡·皮亚斯特里', country: '澳大利亚', number: 81, teamId: 'mclaren', points: 120, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 2, poles: 0, fastestLaps: 0 }, career: { entered: 82, points: 919, wins: 9, podiums: 28, poles: 6, titles: 0 }, source: f1Driver('oscar-piastri') },
  { code: 'HAD', name: '伊萨克·哈贾尔', country: '法国', number: 6, teamId: 'redbull', points: 71, seasonStatus: 'current', season: { races: 11, wins: 0, podiums: 1, poles: 0, fastestLaps: 0 }, career: { entered: 34, points: 122, wins: 2, podiums: 2, poles: 0, titles: 0 }, source: f1Driver('isack-hadjar') },
  { code: 'LAW', name: '利亚姆·劳森', country: '新西兰', number: 30, teamId: 'racing-bulls', points: 59, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 49, points: 103, wins: 2, podiums: 0, poles: 0, titles: 0 }, source: f1Driver('liam-lawson') },
  { code: 'GAS', name: '皮埃尔·加斯利', country: '法国', number: 10, teamId: 'alpine', points: 41, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 0, poles: 1, fastestLaps: 0 }, career: { entered: 191, points: 499, wins: 1, podiums: 5, poles: 1, titles: 0 }, source: f1Driver('pierre-gasly') },
  { code: 'LIN', name: '阿维德·林德布拉德', country: '英国', number: 41, teamId: 'racing-bulls', points: 31, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 13, points: 31, wins: 1, podiums: 0, poles: 0, titles: 0 }, source: f1Driver('arvid-lindblad') },
  { code: 'COL', name: '佛朗哥·科拉平托', country: '阿根廷', number: 43, teamId: 'alpine', points: 27, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 40, points: 32, wins: 1, podiums: 0, poles: 0, titles: 0 }, source: f1Driver('franco-colapinto') },
  { code: 'BEA', name: '奥利弗·比尔曼', country: '英国', number: 87, teamId: 'haas-f1-team', points: 18, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 41, points: 66, wins: 1, podiums: 0, poles: 0, titles: 0 }, source: f1Driver('oliver-bearman') },
  { code: 'BOR', name: '加布里埃尔·博托莱托', country: '巴西', number: 5, teamId: 'audi', points: 10, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 37, points: 29, wins: 1, podiums: 0, poles: 0, titles: 0 }, source: f1Driver('gabriel-bortoleto') },
  { code: 'HUL', name: '尼科·霍肯伯格', country: '德国', number: 27, teamId: 'audi', points: 7, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 263, points: 629, wins: 1, podiums: 1, poles: 1, titles: 0 }, source: f1Driver('nico-hulkenberg') },
  { code: 'SAI', name: '卡洛斯·塞恩斯', country: '西班牙', number: 55, teamId: 'williams', points: 6, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 243, points: 1342.5, wins: 4, podiums: 29, poles: 6, titles: 0 }, source: f1Driver('carlos-sainz') },
  { code: 'ALB', name: '亚历山大·阿尔本', country: '泰国', number: 23, teamId: 'williams', points: 5, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 141, points: 318, wins: 2, podiums: 2, poles: 0, titles: 0 }, source: f1Driver('alexander-albon') },
  { code: 'OCO', name: '埃斯特班·奥康', country: '法国', number: 31, teamId: 'haas-f1-team', points: 3, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 194, points: 486, wins: 1, podiums: 4, poles: 0, titles: 0 }, source: f1Driver('esteban-ocon') },
  { code: 'ALO', name: '费尔南多·阿隆索', country: '西班牙', number: 14, teamId: 'aston', points: 3, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 441, points: 2396, wins: 32, podiums: 106, poles: 22, titles: 2 }, source: f1Driver('fernando-alonso') },
  { code: 'TSU', name: '角田裕毅', country: '日本', number: 22, teamId: 'racing-bulls', points: 1, seasonStatus: 'substitute', season: { races: 3, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 114, points: 125, wins: 0, podiums: 0, poles: 0, titles: 0 }, source: 'https://www.formula1.com/en/results/2026/drivers/YUKTSU01/yuki-tsunoda' },
  { code: 'STR', name: '兰斯·斯托尔', country: '加拿大', number: 18, teamId: 'aston', points: 0, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 203, points: 325, wins: 3, podiums: 3, poles: 1, titles: 0 }, source: f1Driver('lance-stroll') },
  { code: 'BOT', name: '瓦尔特里·博塔斯', country: '芬兰', number: 77, teamId: 'cadillac', points: 0, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 260, points: 1797, wins: 10, podiums: 67, poles: 20, titles: 0 }, source: f1Driver('valtteri-bottas') },
  { code: 'PER', name: '塞尔吉奥·佩雷斯', country: '墨西哥', number: 11, teamId: 'cadillac', points: 0, seasonStatus: 'current', season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 295, points: 1638, wins: 6, podiums: 39, poles: 3, titles: 0 }, source: f1Driver('sergio-perez') },
];

export type TeamProfile = {
  id: string;
  name: string;
  short: string;
  color: string;
  points: number;
  base: string;
  fullName: string;
  principal: string;
  technicalChief: string;
  chassis: string;
  powerUnit: string;
  firstEntry: number;
  season: SeasonStats;
  career: CareerStats;
  source: string;
};

const f1Team = (slug: string) => `https://www.formula1.com/en/teams/${slug}`;

export const teamProfiles: TeamProfile[] = [
  { id: 'mercedes', name: '梅赛德斯', short: 'MER', color: '#26D3C1', points: 503, base: '英国 · 布拉克利', fullName: 'Mercedes-AMG PETRONAS Formula One Team', principal: 'Toto Wolff', technicalChief: 'James Allison', chassis: 'W17', powerUnit: 'Mercedes', firstEntry: 1970, season: { races: 14, wins: 10, podiums: 19, poles: 10, fastestLaps: 8 }, career: { entered: 343, points: 8662.5, wins: 132, podiums: 215, poles: 146, titles: 8 }, source: f1Team('mercedes') },
  { id: 'ferrari', name: '法拉利', short: 'FER', color: '#E31C3D', points: 358, base: '意大利 · 马拉内罗', fullName: 'Scuderia Ferrari HP', principal: 'Frédéric Vasseur', technicalChief: 'Loïc Serra / Enrico Gualtieri', chassis: 'SF-26', powerUnit: 'Ferrari', firstEntry: 1950, season: { races: 14, wins: 2, podiums: 9, poles: 0, fastestLaps: 3 }, career: { entered: 1137, points: 11033, wins: 251, podiums: 647, poles: 254, titles: 16 }, source: f1Team('ferrari') },
  { id: 'mclaren', name: '迈凯伦', short: 'MCL', color: '#FF8000', points: 306, base: '英国 · 沃金', fullName: 'McLaren Mastercard F1 Team', principal: 'Andrea Stella', technicalChief: 'Peter Prodromou / Neil Houldey', chassis: 'MCL40', powerUnit: 'Mercedes', firstEntry: 1966, season: { races: 14, wins: 2, podiums: 7, poles: 3, fastestLaps: 2 }, career: { entered: 1008, points: 8089.5, wins: 205, podiums: 451, poles: 180, titles: 10 }, source: f1Team('mclaren') },
  { id: 'redbull', name: '红牛', short: 'RBR', color: '#3671C6', points: 230, base: '英国 · 米尔顿凯恩斯', fullName: 'Oracle Red Bull Racing', principal: 'Laurent Mekies', technicalChief: 'Pierre Waché', chassis: 'RB22', powerUnit: 'Red Bull Ford', firstEntry: 1997, season: { races: 14, wins: 0, podiums: 7, poles: 0, fastestLaps: 1 }, career: { entered: 432, points: 8518, wins: 130, podiums: 240, poles: 111, titles: 6 }, source: f1Team('red-bull-racing') },
  { id: 'racing-bulls', name: 'RB车队', short: 'VCARB', color: '#6692FF', points: 77, base: '意大利 · 法恩扎', fullName: 'Visa Cash App Racing Bulls Formula One Team', principal: 'Alan Permane', technicalChief: 'Tim Goss', chassis: 'VCARB 03', powerUnit: 'Red Bull Ford', firstEntry: 1985, season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 413, points: 1024, wins: 2, podiums: 6, poles: 1, titles: 0 }, source: f1Team('racing-bulls') },
  { id: 'alpine', name: '阿尔派', short: 'ALP', color: '#FF87BC', points: 68, base: '英国 · 恩斯通', fullName: 'BWT Alpine Formula One Team', principal: 'Flavio Briatore（执行顾问）；Steve Nielsen（常务董事）', technicalChief: 'David Sanchez', chassis: 'A526', powerUnit: 'Mercedes', firstEntry: 1986, season: { races: 14, wins: 0, podiums: 0, poles: 1, fastestLaps: 0 }, career: { entered: 406, points: 2068, wins: 21, podiums: 60, poles: 21, titles: 2 }, source: f1Team('alpine') },
  { id: 'haas-f1-team', name: '哈斯', short: 'HAA', color: '#E6002D', points: 21, base: '美国 · 坎纳波利斯', fullName: 'TGR Haas F1 Team', principal: 'Ayao Komatsu', technicalChief: 'Andrea De Zordo', chassis: 'VF-26', powerUnit: 'Ferrari', firstEntry: 2016, season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 228, points: 407, wins: 2, podiums: 0, poles: 0, titles: 0 }, source: f1Team('haas') },
  { id: 'audi', name: '奥迪', short: 'AUD', color: '#A7A9AC', points: 17, base: '瑞士 · 欣维尔', fullName: 'Audi Revolut F1 Team', principal: 'Mattia Binotto', technicalChief: 'James Key', chassis: 'R26', powerUnit: 'Audi', firstEntry: 2026, season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 14, points: 17, wins: 0, podiums: 0, poles: 0, titles: 0 }, source: f1Team('audi') },
  { id: 'williams', name: '威廉姆斯', short: 'WIL', color: '#64C4FF', points: 11, base: '英国 · 格罗夫', fullName: 'Atlassian Williams F1 Team', principal: 'James Vowles', technicalChief: 'Pat Fry', chassis: 'FW48', powerUnit: 'Mercedes', firstEntry: 1978, season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 865, points: 3779, wins: 114, podiums: 245, poles: 128, titles: 8 }, source: f1Team('williams') },
  { id: 'aston', name: '阿斯顿·马丁', short: 'AMR', color: '#23856B', points: 3, base: '英国 · 银石', fullName: 'Aston Martin Aramco Formula One Team', principal: 'Adrian Newey', technicalChief: 'Enrico Cardile', chassis: 'AMR26', powerUnit: 'Honda', firstEntry: 2018, season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 166, points: 866, wins: 1, podiums: 12, poles: 1, titles: 0 }, source: f1Team('aston-martin') },
  { id: 'cadillac', name: '凯迪拉克', short: 'CAD', color: '#B8A26A', points: 0, base: '英国 · 银石', fullName: 'Cadillac Formula 1 Team', principal: 'Marcin Budkowski', technicalChief: 'Nick Chester', chassis: 'MAC-26', powerUnit: 'Ferrari', firstEntry: 2026, season: { races: 14, wins: 0, podiums: 0, poles: 0, fastestLaps: 0 }, career: { entered: 14, points: 0, wins: 0, podiums: 0, poles: 0, titles: 0 }, source: f1Team('cadillac') },
];

export type CircuitProfile = {
  id: string;
  city: string;
  country: string;
  lengthKm: number;
  turns?: number;
  laps: number;
  firstGrandPrix: number;
  lapRecord: string | null;
  lapRecordHolder?: string;
  lapRecordYear?: number;
  source: string;
};

const f1Circuit = (slug: string) => `https://www.formula1.com/en/racing/2026/${slug}`;

// Official circuit figures; turns are included only where the current official source confirms them.
export const circuitProfiles: CircuitProfile[] = [
  { id: 'melbourne', city: '墨尔本', country: '澳大利亚', lengthKm: 5.278, laps: 58, firstGrandPrix: 1996, lapRecord: '1:19.813', lapRecordHolder: '夏尔·勒克莱尔', lapRecordYear: 2024, source: f1Circuit('australia') },
  { id: 'shanghai', city: '上海', country: '中国', lengthKm: 5.451, laps: 56, firstGrandPrix: 2004, lapRecord: '1:32.238', lapRecordHolder: '迈克尔·舒马赫', lapRecordYear: 2004, source: f1Circuit('china') },
  { id: 'suzuka', city: '铃鹿', country: '日本', lengthKm: 5.807, laps: 53, firstGrandPrix: 1987, lapRecord: '1:30.965', lapRecordHolder: '安德烈亚·基米·安东内利', lapRecordYear: 2025, source: f1Circuit('japan') },
  { id: 'miami', city: '迈阿密花园', country: '美国', lengthKm: 5.412, turns: 19, laps: 57, firstGrandPrix: 2022, lapRecord: '1:29.708', lapRecordHolder: '马克斯·维斯塔潘', lapRecordYear: 2023, source: f1Circuit('miami') },
  { id: 'gillesvilleneuve', city: '蒙特利尔', country: '加拿大', lengthKm: 4.361, laps: 70, firstGrandPrix: 1978, lapRecord: '1:13.078', lapRecordHolder: '瓦尔特里·博塔斯', lapRecordYear: 2019, source: f1Circuit('canada') },
  { id: 'monaco', city: '蒙特卡洛', country: '摩纳哥', lengthKm: 3.337, laps: 78, firstGrandPrix: 1950, lapRecord: '1:12.909', lapRecordHolder: '刘易斯·汉密尔顿', lapRecordYear: 2021, source: f1Circuit('monaco') },
  { id: 'barcelonacatalunya', city: '蒙特梅洛', country: '西班牙', lengthKm: 4.657, laps: 66, firstGrandPrix: 1991, lapRecord: '1:15.743', lapRecordHolder: '奥斯卡·皮亚斯特里', lapRecordYear: 2025, source: f1Circuit('barcelona-catalunya') },
  { id: 'redbullring', city: '施皮尔贝格', country: '奥地利', lengthKm: 4.326, laps: 71, firstGrandPrix: 1970, lapRecord: '1:07.924', lapRecordHolder: '奥斯卡·皮亚斯特里', lapRecordYear: 2025, source: f1Circuit('austria') },
  { id: 'silverstone', city: '银石', country: '英国', lengthKm: 5.891, laps: 52, firstGrandPrix: 1950, lapRecord: '1:27.097', lapRecordHolder: '马克斯·维斯塔潘', lapRecordYear: 2020, source: f1Circuit('great-britain') },
  { id: 'spafrancorchamps', city: '斯塔沃洛', country: '比利时', lengthKm: 7.004, laps: 44, firstGrandPrix: 1950, lapRecord: '1:44.701', lapRecordHolder: '塞尔吉奥·佩雷斯', lapRecordYear: 2024, source: f1Circuit('belgium') },
  { id: 'hungaroring', city: '莫焦罗德', country: '匈牙利', lengthKm: 4.381, laps: 70, firstGrandPrix: 1986, lapRecord: '1:16.627', lapRecordHolder: '刘易斯·汉密尔顿', lapRecordYear: 2020, source: f1Circuit('hungary') },
  { id: 'zandvoort', city: '赞德沃特', country: '荷兰', lengthKm: 4.259, laps: 72, firstGrandPrix: 1952, lapRecord: '1:11.097', lapRecordHolder: '刘易斯·汉密尔顿', lapRecordYear: 2021, source: f1Circuit('netherlands') },
  { id: 'monza', city: '蒙扎', country: '意大利', lengthKm: 5.793, laps: 53, firstGrandPrix: 1950, lapRecord: '1:20.901', lapRecordHolder: '兰多·诺里斯', lapRecordYear: 2025, source: f1Circuit('italy') },
  { id: 'madring', city: '马德里', country: '西班牙', lengthKm: 5.414, turns: 22, laps: 57, firstGrandPrix: 2026, lapRecord: '1:35.587', lapRecordHolder: '乔治·拉塞尔', lapRecordYear: 2026, source: f1Circuit('spain') },
  { id: 'baku', city: '巴库', country: '阿塞拜疆', lengthKm: 6.003, laps: 51, firstGrandPrix: 2016, lapRecord: '1:43.009', lapRecordHolder: '夏尔·勒克莱尔', lapRecordYear: 2019, source: f1Circuit('azerbaijan') },
  { id: 'kualalumpur', city: '雪邦（吉隆坡近郊）', country: '马来西亚', lengthKm: 5.543, laps: 56, firstGrandPrix: 1999, lapRecord: '1:34.080', lapRecordHolder: '塞巴斯蒂安·维特尔', lapRecordYear: 2017, source: f1Circuit('bahrain') },
  { id: 'singapore', city: '新加坡', country: '新加坡', lengthKm: 4.927, turns: 19, laps: 62, firstGrandPrix: 2008, lapRecord: '1:33.808', lapRecordHolder: '刘易斯·汉密尔顿', lapRecordYear: 2025, source: f1Circuit('singapore') },
  { id: 'austin', city: '奥斯汀', country: '美国', lengthKm: 5.513, laps: 56, firstGrandPrix: 2012, lapRecord: '1:36.169', lapRecordHolder: '夏尔·勒克莱尔', lapRecordYear: 2019, source: f1Circuit('united-states') },
  { id: 'mexicocity', city: '墨西哥城', country: '墨西哥', lengthKm: 4.304, laps: 71, firstGrandPrix: 1963, lapRecord: '1:17.774', lapRecordHolder: '瓦尔特里·博塔斯', lapRecordYear: 2021, source: f1Circuit('mexico') },
  { id: 'interlagos', city: '圣保罗', country: '巴西', lengthKm: 4.309, laps: 71, firstGrandPrix: 1973, lapRecord: '1:10.540', lapRecordHolder: '瓦尔特里·博塔斯', lapRecordYear: 2018, source: f1Circuit('brazil') },
  { id: 'lasvegas', city: '拉斯维加斯', country: '美国', lengthKm: 6.201, turns: 17, laps: 50, firstGrandPrix: 2023, lapRecord: '1:33.365', lapRecordHolder: '马克斯·维斯塔潘', lapRecordYear: 2025, source: f1Circuit('las-vegas') },
  { id: 'lusail', city: '卢赛尔', country: '卡塔尔', lengthKm: 5.419, laps: 57, firstGrandPrix: 2021, lapRecord: '1:22.384', lapRecordHolder: '兰多·诺里斯', lapRecordYear: 2024, source: f1Circuit('qatar') },
  { id: 'yasmarina', city: '亚斯岛（阿布扎比）', country: '阿联酋', lengthKm: 5.281, laps: 58, firstGrandPrix: 2009, lapRecord: null, source: f1Circuit('united-arab-emirates') },
];
