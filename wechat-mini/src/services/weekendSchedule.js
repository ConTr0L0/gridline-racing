// F1 official schedules checked 2026-10-09. All times below are UTC.
// Source: https://www.formula1.com/en/racing/2026/<slug>
// Singapore sprint/end windows: https://www.formula1.com/en/latest/article/formula-1-singapore-airlines-singapore-grand-prix-2026.1OXwlTH5jrpTiZX2Dvg7qE
// Other race ends use the existing local two-hour estimates; practice/qualifying ends are published times.
const schedules = {
  singapore: [
    ['一练', '10-09T08:30', '10-09T09:30'],
    ['冲刺排位赛', '10-09T12:30', '10-09T13:14'],
    ['冲刺赛', '10-10T09:00', '10-10T09:30'],
    ['排位赛', '10-10T13:00', '10-10T14:00'],
    ['正赛', '10-11T12:00', '10-11T14:00'],
  ],
  'united-states': [
    ['一练', '10-23T17:30', '10-23T18:30'],
    ['二练', '10-23T21:00', '10-23T22:00'],
    ['三练', '10-24T17:30', '10-24T18:30'],
    ['排位赛', '10-24T21:00', '10-24T22:00'],
    ['正赛', '10-25T20:00', '10-25T22:00'],
  ],
  mexico: [
    ['一练', '10-30T18:30', '10-30T19:30'],
    ['二练', '10-30T22:00', '10-30T23:00'],
    ['三练', '10-31T17:30', '10-31T18:30'],
    ['排位赛', '10-31T21:00', '10-31T22:00'],
    ['正赛', '11-01T20:00', '11-01T22:00'],
  ],
  brazil: [
    ['一练', '11-06T15:30', '11-06T16:30'],
    ['二练', '11-06T19:00', '11-06T20:00'],
    ['三练', '11-07T14:30', '11-07T15:30'],
    ['排位赛', '11-07T18:00', '11-07T19:00'],
    ['正赛', '11-08T17:00', '11-08T19:00'],
  ],
  'las-vegas': [
    ['一练', '11-20T00:30', '11-20T01:30'],
    ['二练', '11-20T04:00', '11-20T05:00'],
    ['三练', '11-21T00:30', '11-21T01:30'],
    ['排位赛', '11-21T04:00', '11-21T05:00'],
    ['正赛', '11-22T04:00', '11-22T06:00'],
  ],
  qatar: [
    ['一练', '11-27T13:30', '11-27T14:30'],
    ['二练', '11-27T17:00', '11-27T18:00'],
    ['三练', '11-28T14:30', '11-28T15:30'],
    ['排位赛', '11-28T18:00', '11-28T19:00'],
    ['正赛', '11-29T16:00', '11-29T18:00'],
  ],
  'united-arab-emirates': [
    ['一练', '12-04T09:30', '12-04T10:30'],
    ['二练', '12-04T13:00', '12-04T14:00'],
    ['三练', '12-05T10:30', '12-05T11:30'],
    ['排位赛', '12-05T14:00', '12-05T15:00'],
    ['正赛', '12-06T13:00', '12-06T15:00'],
  ],
};
const venues = {
  滨海湾街道赛道: 'singapore', 美洲赛道: 'united-states', 罗德里格斯兄弟赛道: 'mexico',
  '若泽·卡洛斯·帕塞赛道': 'brazil', 拉斯维加斯街道赛道: 'las-vegas', 卢赛尔国际赛道: 'qatar', 亚斯码头赛道: 'united-arab-emirates',
};

export function withWeekendSchedule(race) {
  const slug = venues[race.venue], rows = schedules[slug];
  if (!rows) return race;
  const local = rows.map(([name, at, endsAt], index) => ({
    id: `schedule-${slug}-${index}`, name, at: `2026-${at}:00Z`, endsAt: `2026-${endsAt}:00Z`,
    localSchedule: true,
  }));
  // shortcut: published windows cannot track red flags/delays; use authenticated live status when available.
  const sessions = race.sessions?.length ? race.sessions.map((session) => {
    const planned = local.find((item) => item.name === session.name && Date.parse(item.at) === Date.parse(session.at));
    return !session.endsAt && planned ? { ...session, endsAt: planned.endsAt } : session;
  }) : local;
  return { ...race, sessions, raceAt: sessions.find((session) => session.name === '正赛')?.at || race.raceAt };
}
