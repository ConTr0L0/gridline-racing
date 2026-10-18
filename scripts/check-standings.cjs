const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual App functions without loading React Native in Node.
const source = fs.readFileSync(path.join(__dirname, '..', 'App.tsx'), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set(['loadOpenF1Season', 'rankByPoints', 'withKnown2026Drivers']);
const functions = ast.statements.filter((node) => ts.isFunctionDeclaration(node) && names.has(node.name?.text))
  .map((node) => node.getText(ast)).join('\n');
const baseRace = { session_key: 1, meeting_key: 1, session_name: 'Race', date_start: '2020-01-01T10:00:00Z', date_end: '2020-01-01T12:00:00Z' };
const sprint = { ...baseRace, session_key: 2, meeting_key: 2, session_name: 'Sprint', date_start: '2020-02-01T10:00:00Z', date_end: '2020-02-01T11:00:00Z' };
const nextRace = { ...baseRace, session_key: 3, meeting_key: 2, date_start: '2099-02-02T10:00:00Z', date_end: '2099-02-02T12:00:00Z' };
const roster = [12, 63].map((number) => ({ driver_number: number, name_acronym: String(number), full_name: String(number), team_name: 'Mercedes', team_colour: 'fff' }));
const driverRows = [12, 63].map((number, index) => ({ driver_number: number, points_current: 320 - index * 84, points_start: 328 - index * 85, position_current: index + 1, position_start: index + 1 }));
const teamRows = [{ team_name: 'Mercedes', points_current: 556, points_start: 571, position_current: 1, position_start: 1 }];
const sprintDriverRows = driverRows.map((row) => ({ ...row, points_current: row.points_start }));
const sprintTeamRows = teamRows.map((row) => ({ ...row, points_current: row.points_start }));
let sessions, responses, calls;
const context = vm.createContext({
  Date, Intl, URLSearchParams, C: { teal: '#000' },
  raceNames: {}, trackNames: {}, countryNames: {}, teamNames: {}, driverNames: {}, driverCountryNames: {}, knownDriverIds: {},
  sessionLabels: { Race: '正赛', Sprint: '冲刺赛' },
  teamProfiles: [{ id: 'mercedes', points: 999 }],
  activeDriverProfiles: [{ code: '12', number: 12, points: 999, season: { wins: 0 } }], driverProfiles: [{ code: '12' }],
  f1Portrait: () => undefined, teamId: () => 'mercedes', dateRange: () => '', dayLabel: () => '',
  openF1: async (endpoint, params) => {
    calls.push([endpoint, params.session_key]);
    if (endpoint === 'sessions') return sessions;
    if (endpoint === 'meetings') return [1, 2].map((key) => ({ meeting_key: key, meeting_name: `Meeting ${key}` }));
    if (responses[endpoint] instanceof Error) throw responses[endpoint];
    if (params.session_key === '2' && responses[endpoint] === driverRows) return sprintDriverRows;
    if (params.session_key === '2' && responses[endpoint] === teamRows) return sprintTeamRows;
    return responses[endpoint];
  },
});
vm.runInContext(ts.transpile(functions), context);
function reset(eventSessions) {
  sessions = eventSessions;
  calls = [];
  responses = { drivers: roster, championship_drivers: driverRows, championship_teams: teamRows };
}

(async () => {
  reset([baseRace]);
  let data = await context.loadOpenF1Season();
  assert.equal(data.drivers[0].points, 320);
  assert.equal(data.teams[0].points, 556);
  reset([baseRace, sprint, nextRace]);
  data = await context.loadOpenF1Season();
  assert.equal(data.drivers[0].points, 328);
  assert.equal(data.teams[0].points, 571);
  assert.equal(data.standingsThrough, 'Meeting 2 冲刺赛');
  assert(calls.some(([endpoint, key]) => endpoint === 'championship_drivers' && key === '2'));
  assert(calls.some(([endpoint, key]) => endpoint === 'drivers' && key === '2'));
  assert.equal((await context.loadOpenF1Season()).drivers[0].points, 328, 'refresh must not add Sprint points twice');
  reset([baseRace, { ...sprint, is_cancelled: true }, nextRace]);
  assert.equal((await context.loadOpenF1Season()).drivers[0].points, 320);
  reset([baseRace, { ...sprint, date_end: '2099-01-01T11:00:00Z' }, nextRace]);
  assert.equal((await context.loadOpenF1Season()).drivers[0].points, 320, 'unfinished Sprint must not affect standings');
  reset([baseRace, sprint, { ...nextRace, date_start: '2020-02-02T10:00:00Z', date_end: '2020-02-02T12:00:00Z' }]);
  assert.equal((await context.loadOpenF1Season()).drivers[0].points, 320, 'completed Race replaces Sprint snapshot');
  for (const invalid of [[], [driverRows[0]], [{ ...driverRows[0], points_current: null }, driverRows[1]], [{ ...driverRows[0], points_current: NaN }, driverRows[1]]]) {
    reset([baseRace, sprint, nextRace]);
    responses.championship_drivers = invalid;
    await assert.rejects(context.loadOpenF1Season(), /pending/);
  }
  reset([baseRace, sprint, nextRace]);
  responses.championship_teams = [];
  await assert.rejects(context.loadOpenF1Season(), /pending/);
  reset([baseRace]);
  responses.championship_drivers = new Error('HTTP 429');
  await assert.rejects(context.loadOpenF1Season(), /HTTP 429/);
  const missing = context.withKnown2026Drivers({ races: [], drivers: [], teams: [] });
  assert.equal(missing.drivers[0].points, null, 'missing network data must not become static points');
  assert.equal(missing.teams[0].points, null);
  let saveCallback;
  function findSave(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'saveSessionResults') saveCallback = node.initializer.getText(ast);
    ts.forEachChild(node, findSave);
  }
  findSave(ast);
  const writes = [];
  const oldTime = '2020-01-01T12:00:00Z';
  Object.assign(context, {
    useCallback: (callback) => callback,
    resultsBySessionRef: { current: {} }, seasonDataRef: { current: data }, seasonSyncedAtRef: { current: oldTime },
    setResultsBySession: () => {}, setSyncedAt: () => { throw new Error('session result changed standings sync time'); },
    persistSeasonCache: (_data, _results, savedAt) => writes.push(savedAt),
  });
  vm.runInContext(ts.transpile(`const save = ${saveCallback}; save('2', [{ position: 1 }]); save('2', [{ position: 1 }]);`), context);
  assert.deepEqual(writes, [oldTime, oldTime], 'result-cache writes preserve standings timestamp');
  if (process.argv[2]) {
    const snapshotDir = process.argv[2];
    context.openF1 = async (endpoint, params) => {
      if (endpoint !== 'meetings' && endpoint !== 'sessions') assert.equal(params.session_key, '11383');
      return JSON.parse(fs.readFileSync(path.join(snapshotDir, `${endpoint}.json`), 'utf8'));
    };
    const live = await context.loadOpenF1Season();
    assert.equal(live.drivers.find((driver) => driver.number === 12).points, 325);
    assert.equal(live.drivers.find((driver) => driver.number === 44).points, 221);
    assert.equal(live.teams.find((team) => team.name === 'Mercedes').points, 561);
    assert(live.standingsThrough.endsWith('冲刺赛'));
    console.log('Public API snapshot passed: Singapore Sprint, ANT 325, HAM 221, Mercedes 561.');
  }
  console.log('Standings checks passed: Race/Sprint, repeat refresh, incomplete data, failures and static fallback.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
