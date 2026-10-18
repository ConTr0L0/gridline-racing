import Taro from '@tarojs/taro';
import { withWeekendSchedule } from './weekendSchedule';
import { driverProfiles, teamProfiles, circuitProfiles, libraryStatsAsOf } from '../../../library-data';

const SEASON = 2026;
const CACHE_KEY = 'f1-mini-season-2026-v1';
const CACHE_MAX_AGE = 5 * 60 * 1000;
const FALLBACK_RACES = [
  ['澳大利亚大奖赛', '阿尔伯特公园赛道', '澳大利亚', '03.06 — 03.08', '2026-03-08T06:00:00Z'],
  ['中国大奖赛', '上海国际赛车场', '中国', '03.13 — 03.15', '2026-03-15T09:00:00Z'],
  ['日本大奖赛', '铃鹿国际赛道', '日本', '03.27 — 03.29', '2026-03-29T07:00:00Z'],
  ['迈阿密大奖赛', '迈阿密国际赛车场', '美国', '05.01 — 05.03', '2026-05-03T19:00:00Z'],
  ['加拿大大奖赛', '吉尔·维伦纽夫赛道', '加拿大', '05.22 — 05.24', '2026-05-24T22:00:00Z'],
  ['摩纳哥大奖赛', '摩纳哥赛道', '摩纳哥', '06.05 — 06.07', '2026-06-07T15:00:00Z'],
  ['巴塞罗那-加泰罗尼亚大奖赛', '巴塞罗那-加泰罗尼亚赛道', '西班牙', '06.12 — 06.14', '2026-06-14T15:00:00Z'],
  ['奥地利大奖赛', '红牛赛道', '奥地利', '06.26 — 06.28', '2026-06-28T15:00:00Z'],
  ['英国大奖赛', '银石赛道', '英国', '07.03 — 07.05', '2026-07-05T16:00:00Z'],
  ['比利时大奖赛', '斯帕-弗朗科尔尚赛道', '比利时', '07.17 — 07.19', '2026-07-19T15:00:00Z'],
  ['匈牙利大奖赛', '匈牙利赛道', '匈牙利', '07.24 — 07.26', '2026-07-26T15:00:00Z'],
  ['荷兰大奖赛', '赞德沃特赛道', '荷兰', '08.21 — 08.23', '2026-08-23T15:00:00Z'],
  ['意大利大奖赛', '蒙扎赛道', '意大利', '09.04 — 09.06', '2026-09-06T15:00:00Z'],
  ['西班牙大奖赛', '马德里赛道', '西班牙', '09.11 — 09.13', '2026-09-13T15:00:00Z'],
  ['阿塞拜疆大奖赛', '巴库街道赛道', '阿塞拜疆', '09.24 — 09.26', '2026-09-26T13:00:00Z'],
  ['巴林大奖赛', '雪邦国际赛道', '马来西亚', '10.02 — 10.04', '2026-10-04T09:00:00Z'],
  ['新加坡大奖赛', '滨海湾街道赛道', '新加坡', '10.09 — 10.11', '2026-10-11T14:00:00Z'],
  ['美国大奖赛', '美洲赛道', '美国', '10.23 — 10.25', '2026-10-25T22:00:00Z'],
  ['墨西哥城大奖赛', '罗德里格斯兄弟赛道', '墨西哥', '10.30 — 11.01', '2026-11-01T22:00:00Z'],
  ['圣保罗大奖赛', '若泽·卡洛斯·帕塞赛道', '巴西', '11.06 — 11.08', '2026-11-08T19:00:00Z'],
  ['拉斯维加斯大奖赛', '拉斯维加斯街道赛道', '美国', '11.19 — 11.21', '2026-11-22T06:00:00Z'],
  ['卡塔尔大奖赛', '卢赛尔国际赛道', '卡塔尔', '11.27 — 11.29', '2026-11-29T18:00:00Z'],
  ['阿布扎比大奖赛', '亚斯码头赛道', '阿联酋', '12.04 — 12.06', '2026-12-06T15:00:00Z'],
];

const teamIds = {
  'Red Bull Racing': 'redbull', 'Oracle Red Bull Racing': 'redbull',
  'Racing Bulls': 'racing-bulls', 'Visa Cash App Racing Bulls Formula One Team': 'racing-bulls',
  'Mercedes': 'mercedes', 'Mercedes-AMG PETRONAS F1 Team': 'mercedes',
  'McLaren': 'mclaren', 'McLaren Mastercard F1 Team': 'mclaren',
  'Ferrari': 'ferrari', 'Scuderia Ferrari HP': 'ferrari',
  'Aston Martin': 'aston', 'Aston Martin Aramco Formula One Team': 'aston',
  'Williams': 'williams', 'Atlassian Williams F1 Team': 'williams',
  'Alpine': 'alpine', 'BWT Alpine F1 Team': 'alpine',
  'Haas': 'haas-f1-team', 'Haas F1 Team': 'haas-f1-team', 'TGR Haas F1 Team': 'haas-f1-team',
  'Audi': 'audi', 'Audi Revolut F1 Team': 'audi',
  'Cadillac': 'cadillac', 'Cadillac Formula 1 Team': 'cadillac',
};
const countryNames = {
  Australia: '澳大利亚', China: '中国', Japan: '日本', Bahrain: '巴林',
  'Saudi Arabia': '沙特阿拉伯', 'United States': '美国', Canada: '加拿大',
  Monaco: '摩纳哥', Spain: '西班牙', Austria: '奥地利', 'United Kingdom': '英国',
  Belgium: '比利时', Hungary: '匈牙利', Netherlands: '荷兰', Italy: '意大利',
  Azerbaijan: '阿塞拜疆', Singapore: '新加坡', Mexico: '墨西哥', Brazil: '巴西',
  Qatar: '卡塔尔', 'United Arab Emirates': '阿联酋',
};
const raceNames = {
  'Australian Grand Prix': '澳大利亚大奖赛', 'Chinese Grand Prix': '中国大奖赛',
  'Japanese Grand Prix': '日本大奖赛', 'Bahrain Grand Prix': '巴林大奖赛',
  'Saudi Arabian Grand Prix': '沙特阿拉伯大奖赛', 'Miami Grand Prix': '迈阿密大奖赛',
  'Canadian Grand Prix': '加拿大大奖赛', 'Monaco Grand Prix': '摩纳哥大奖赛',
  'Spanish Grand Prix': '西班牙大奖赛', 'Austrian Grand Prix': '奥地利大奖赛',
  'British Grand Prix': '英国大奖赛', 'Belgian Grand Prix': '比利时大奖赛',
  'Hungarian Grand Prix': '匈牙利大奖赛', 'Dutch Grand Prix': '荷兰大奖赛',
  'Italian Grand Prix': '意大利大奖赛', 'Azerbaijan Grand Prix': '阿塞拜疆大奖赛',
  'Singapore Grand Prix': '新加坡大奖赛', 'United States Grand Prix': '美国大奖赛',
  'Mexico City Grand Prix': '墨西哥城大奖赛', 'São Paulo Grand Prix': '圣保罗大奖赛',
  'Las Vegas Grand Prix': '拉斯维加斯大奖赛', 'Qatar Grand Prix': '卡塔尔大奖赛',
  'Abu Dhabi Grand Prix': '阿布扎比大奖赛',
};
const trackNames = {
  Melbourne: '阿尔伯特公园赛道', Shanghai: '上海国际赛车场', Suzuka: '铃鹿国际赛道',
  Miami: '迈阿密国际赛车场', Montreal: '吉尔·维伦纽夫赛道', 'Monte Carlo': '摩纳哥赛道',
  Catalunya: '巴塞罗那-加泰罗尼亚赛道', Spielberg: '红牛赛道', Silverstone: '银石赛道',
  'Spa-Francorchamps': '斯帕-弗朗科尔尚赛道', Zandvoort: '赞德沃特赛道', Monza: '蒙扎国家赛车场',
  Madring: '马德里赛道', Baku: '巴库街道赛道', 'Kuala Lumpur': '雪邦国际赛道',
  Singapore: '滨海湾街道赛道', Austin: '美洲赛道', 'Mexico City': '罗德里格斯兄弟赛道',
  Interlagos: '若泽·卡洛斯·帕塞赛道', 'Las Vegas': '拉斯维加斯街道赛道',
  Lusail: '卢赛尔国际赛道', 'Albert Park Grand Prix Circuit': '阿尔伯特公园赛道',
  'Shanghai International Circuit': '上海国际赛车场', 'Suzuka International Racing Course': '铃鹿国际赛道',
  'Bahrain International Circuit': '巴林国际赛道', 'Jeddah Corniche Circuit': '吉达滨海赛道',
  'Miami International Autodrome': '迈阿密国际赛车场', 'Circuit Gilles-Villeneuve': '吉尔·维伦纽夫赛道',
  'Circuit de Monaco': '摩纳哥赛道', 'Circuit de Barcelona-Catalunya': '巴塞罗那-加泰罗尼亚赛道',
  'Red Bull Ring': '红牛赛道', 'Silverstone Circuit': '银石赛道',
  'Circuit de Spa-Francorchamps': '斯帕-弗朗科尔尚赛道', Hungaroring: '匈牙利赛道',
  'Circuit Zandvoort': '赞德沃特赛道', 'Autodromo Nazionale Monza': '蒙扎国家赛车场',
  'Baku City Circuit': '巴库城市赛道', 'Marina Bay Street Circuit': '滨海湾街道赛道',
  'Circuit of The Americas': '美洲赛道', 'Autódromo Hermanos Rodríguez': '罗德里格斯兄弟赛道',
  'Autódromo José Carlos Pace': '若泽·卡洛斯·帕塞赛道',
  'Las Vegas Strip Street Circuit': '拉斯维加斯街道赛道',
  'Lusail International Circuit': '卢赛尔国际赛道', 'Yas Marina Circuit': '亚斯码头赛道',
};
const sessionNames = {
  'Practice 1': '一练', 'Practice 2': '二练', 'Practice 3': '三练', Qualifying: '排位赛',
  'Sprint Qualifying': '冲刺排位赛', 'Sprint Shootout': '冲刺排位赛', Sprint: '冲刺赛', Race: '正赛',
};

export const snapshotDrivers = driverProfiles.filter((driver) => driver.code !== 'TSU').map((driver, index) => ({
  id: `driver:${driver.code}`, code: driver.code, name: driver.name, country: driver.country,
  number: driver.number, teamId: driver.teamId, points: driver.points, wins: driver.season.wins,
  position: index + 1,
}));
export const snapshotTeams = teamProfiles.map((team, index) => ({
  id: team.id, name: team.name, short: team.short, color: team.color, points: team.points,
  position: index + 1, base: team.base,
})).sort((a, b) => b.points - a.points).map((team, index) => ({ ...team, position: index + 1 }));
export const snapshotRaces = FALLBACK_RACES.map(([name, venue, country, dates, endAt], index) => withWeekendSchedule({
  id: `round-${index + 1}`, round: index + 1, name, venue, country, dates, raceAt: endAt, sessions: [],
  finished: Date.parse(endAt) < Date.now(),
}));

export function homeRaceState(races, now) {
  const scheduledRaces = races.map(withWeekendSchedule);
  const entries = scheduledRaces.flatMap((race) => {
    const sessions = (race.sessions || []).filter((session) => Number.isFinite(Date.parse(session.at)));
    return sessions
      .filter((session) => !session.ended && (Date.parse(session.at) > now || Date.parse(session.endsAt) > now))
      .map((session) => ({ race, session }));
  }).sort((a, b) => Date.parse(a.session.at) - Date.parse(b.session.at));
  const next = entries[0];
  if (!next) return { race: scheduledRaces.find((race) => !race.finished && !race.sessions?.length) };
  const live = Date.parse(next.session.at) <= now;
  const seconds = Math.max(0, Math.ceil((Date.parse(next.session.at) - now) / 1000));
  return { ...next, live, countdown: [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60] };
}

export function readSeasonCache() {
  try {
    const cached = Taro.getStorageSync(CACHE_KEY);
    if (!cached?.data) return null;
    // Repair the old unmapped Haas cache without replacing its standings or timestamps.
    if (cached.data.teams?.some((team) => team.id === 'Haas F1 Team')) {
      const profile = teamProfiles.find((team) => team.id === 'haas-f1-team');
      return { ...cached, data: { ...cached.data,
        teams: cached.data.teams.map((team) => team.id === 'Haas F1 Team'
          ? { ...team, id: profile.id, name: profile.name, short: profile.short, color: profile.color, base: profile.base }
          : team),
        drivers: cached.data.drivers?.map((driver) => driver.teamId === 'unknown'
          && driverProfiles.some((item) => item.code === driver.code && item.teamId === profile.id)
          ? { ...driver, teamId: profile.id } : driver),
      } };
    }
    return cached;
  } catch (_) {
    return null;
  }
}

const request = (endpoint, params = {}) => new Promise((resolve, reject) => {
  Taro.request({
    url: `https://api.openf1.org/v1/${endpoint}`,
    data: params,
    timeout: 10000,
    success(response) {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        const detail = typeof response.data?.detail === 'string' ? response.data.detail : '';
        const reason = /Live F1 session in progress/i.test(detail)
          ? '当前 F1 场次进行中，OpenF1 暂时限制所有未认证请求（包括历史数据），请在场次结束后点按同步重试'
          : response.statusCode === 401 || response.statusCode === 403
            ? 'OpenF1 访问受限或需要认证'
            : response.statusCode === 429 ? '请求过于频繁，请稍后重试' : '接口请求失败';
        reject(new Error(`${endpoint} HTTP ${response.statusCode}：${reason}`));
      } else if (!Array.isArray(response.data)) {
        reject(new Error(`${endpoint} 返回数据格式错误`));
      } else resolve(response.data);
    },
    fail(error) {
      const message = error.errMsg || '请求失败';
      const reason = /url not in domain list|不在.*合法域名/i.test(message)
        ? '请在微信小程序后台将 https://api.openf1.org 配置为 request 合法域名'
        : /timeout|超时/i.test(message) ? '请求超时，请检查网络后重试' : '网络请求失败';
      reject(new Error(`${endpoint}：${reason}（${message}）`));
    },
  });
});

const sortByPoints = (rows) => [...rows].sort((a, b) => (b.points ?? -1) - (a.points ?? -1))
  .map((row, index) => ({ ...row, position: index + 1 }));
const trackLocalDate = (value, offset) => {
  const match = /^([+-]?)(\d{2}):(\d{2})/.exec(offset || '+00:00');
  const minutes = match ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
  return new Date(Date.parse(value) + minutes * 60000);
};

async function fetchSeason() {
  const [meetings, sessions] = await Promise.all([
    request('meetings', { year: SEASON }), request('sessions', { year: SEASON }),
  ]);
  const races = meetings.map((meeting) => {
    const eventSessions = sessions.filter((session) => session.meeting_key === meeting.meeting_key && !session.is_cancelled)
      .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
    if (!eventSessions.some((session) => session.session_name === 'Race')) return null;
    const raceSession = eventSessions.find((session) => session.session_name === 'Race');
    const start = eventSessions[0].date_start;
    const end = raceSession.date_end;
    const offset = eventSessions.find((session) => session.gmt_offset)?.gmt_offset || '+00:00';
    const firstDate = trackLocalDate(start, offset);
    const lastDate = trackLocalDate(eventSessions[eventSessions.length - 1].date_start, offset);
    const malaysia = meeting.meeting_name === 'Bahrain Grand Prix' && meeting.location === 'Kuala Lumpur';
    const pad = (number) => String(number).padStart(2, '0');
    return {
      id: `meeting-${meeting.meeting_key}`, name: raceNames[meeting.meeting_name] || meeting.meeting_name,
      venue: malaysia ? '雪邦国际赛道' : trackNames[meeting.circuit_short_name] || meeting.circuit_short_name,
      country: malaysia ? '马来西亚' : countryNames[meeting.country_name] || meeting.country_name,
      dates: `${pad(firstDate.getUTCMonth() + 1)}.${pad(firstDate.getUTCDate())} — ${pad(lastDate.getUTCMonth() + 1)}.${pad(lastDate.getUTCDate())}`,
      finished: Date.parse(end) < Date.now(),
      sessions: eventSessions.map((session) => ({
        id: String(session.session_key), name: sessionNames[session.session_name] || session.session_name,
        at: session.date_start, endsAt: session.date_end, ended: Date.parse(session.date_end) < Date.now(),
      })),
      meetingKey: meeting.meeting_key,
    };
  }).filter(Boolean).sort((a, b) => Date.parse(a.sessions[0].at) - Date.parse(b.sessions[0].at))
    .map((race, index) => ({ ...race, round: index + 1 }));
  if (!races.length) throw new Error('OpenF1 未返回 2026 正赛赛历');

  const latestRace = races.flatMap((race) => race.sessions)
    .filter((session) => session.name === '正赛' && Date.parse(session.at) < Date.now())
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  let drivers = snapshotDrivers;
  let teams = snapshotTeams;
  if (latestRace) {
    const [roster, driverRows, teamRows] = await Promise.all([
      request('drivers', { session_key: latestRace.id }).catch(() => []),
      request('championship_drivers', { session_key: latestRace.id }).catch(() => []),
      request('championship_teams', { session_key: latestRace.id }).catch(() => []),
    ]);
    if (roster.length && driverRows.length) {
      const points = new Map(driverRows.map((row) => [Number(row.driver_number), row.points_current]));
      const positions = new Map(driverRows.map((row) => [Number(row.driver_number), row.position_current]));
      drivers = sortByPoints(roster.map((driver) => {
        const profile = driverProfiles.find((item) => item.code === driver.name_acronym);
        return {
          id: `driver:${driver.name_acronym || driver.driver_number}`, code: driver.name_acronym,
          name: profile?.name || driver.full_name, country: profile?.country || driver.country_code,
          number: Number(driver.driver_number), teamId: teamIds[driver.team_name] || 'unknown',
          headshotUrl: driver.headshot_url || undefined,
          points: points.get(Number(driver.driver_number)) ?? profile?.points ?? 0,
          position: positions.get(Number(driver.driver_number)) || 99,
        };
      }));
    }
    if (teamRows.length) {
      teams = sortByPoints(teamRows.map((row) => {
        const profile = teamProfiles.find((item) => item.id === teamIds[row.team_name]);
        return {
          id: profile?.id || teamIds[row.team_name] || row.team_name,
          name: profile?.name || row.team_name, short: profile?.short || row.team_name.slice(0, 3).toUpperCase(),
          color: profile?.color || '#777d83', points: row.points_current,
          position: row.position_current, base: profile?.base || '资料待核实',
        };
      }));
    }
  }
  return { races, drivers, teams, source: 'openf1', updatedAt: Date.now(), error: '' };
}

export async function loadSeason(force = false) {
  const cached = readSeasonCache();
  if (!force && cached && Date.now() - cached.savedAt < CACHE_MAX_AGE) {
    return { ...cached.data, source: 'cache', error: '' };
  }
  try {
    const data = await fetchSeason();
    try { Taro.setStorageSync(CACHE_KEY, { savedAt: Date.now(), data }); } catch (_) { /* cache is optional */ }
    return data;
  } catch (error) {
    const detail = error instanceof Error ? error.message : '请求失败，原因未知';
    console.warn('[OpenF1 同步失败]', detail);
    const reason = detail.includes('当前 F1 场次进行中') ? '赛事期间暂不可同步，请稍后重试'
      : /HTTP (401|403)/.test(detail) ? '数据访问受限，请稍后重试'
      : detail.includes('request 合法域名') ? '请先配置请求域名'
      : detail.includes('请求超时') ? '连接超时，请重试'
      : /HTTP 429/.test(detail) ? '请求频繁，请稍后重试' : '同步失败，请稍后重试';
    if (cached) return { ...cached.data, source: 'cache', error: `${reason}。显示上次缓存。` };
    return {
      races: snapshotRaces, drivers: snapshotDrivers, teams: snapshotTeams,
      source: 'snapshot', updatedAt: libraryStatsAsOf,
      error: `${reason}。显示本地数据。`,
    };
  }
}

const resultRequests = new Map();
export function loadSessionResults(sessionId, sessionName) {
  if (resultRequests.has(sessionId)) return resultRequests.get(sessionId);
  const key = `f1-mini-results-${sessionId}`;
  const pending = (async () => {
    let cached;
    try {
      cached = Taro.getStorageSync(key);
      if (Array.isArray(cached) && cached.length && (sessionName !== '正赛' || cached.every(row => row.fastestLapChecked))) return cached;
    } catch (_) { /* Results remain usable without storage. */ }
    const rows = await request('session_result', { session_key: sessionId }).catch(error => {
      if (Array.isArray(cached) && cached.length) return cached;
      throw error;
    });
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' || !Number.isFinite(Number(row.driver_number)))) throw new Error('场次成绩格式错误');
    if (sessionName === '正赛' && rows.length) {
      const laps = await request('laps', { session_key: sessionId }).catch(() => null);
      const fastest = Array.isArray(laps) ? laps.reduce((best, lap) => {
        const duration = lap.lap_duration;
        return lap.is_pit_out_lap || typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0 || (best && duration >= best.lap_duration) ? best : lap;
      }, null) : null;
      rows.forEach(row => {
        row.fastestLapChecked = Boolean(fastest);
        row.fastestLap = fastest ? Number(row.driver_number) === Number(fastest.driver_number) : null;
      });
    }
    if (rows.length) {
      try { Taro.setStorageSync(key, rows); } catch (_) { /* Storage is optional. */ }
    }
    return rows;
  })().finally(() => resultRequests.delete(sessionId));
  resultRequests.set(sessionId, pending);
  return pending;
}

export { driverProfiles, teamProfiles, circuitProfiles, libraryStatsAsOf };
export { withWeekendSchedule };
