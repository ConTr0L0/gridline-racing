const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'App.tsx'), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const code = ast.statements.filter((node) => ts.isFunctionDeclaration(node)
  && ['getHomeSessions', 'HomePage'].includes(node.name?.text)).map((node) => node.getText(ast)).join('\n');
const start = Date.parse('2026-10-09T08:00:00Z');
const hour = 3600000;
const names = ['练习赛 1', '练习赛 2', '练习赛 3', '冲刺排位赛', '冲刺赛', '排位赛', '正赛'];
const sessions = names.map((name, index) => ({
  id: String(index), name, day: '周五',
  at: new Date(start + index * 2 * hour).toISOString(),
  endsAt: new Date(start + (index * 2 + 1) * hour).toISOString(),
}));
const race = { id: 'round-1', round: 1, name: '测试大奖赛', sessions, finished: false };
let now = start - hour;
let races = [race];
const context = vm.createContext({
  Date: class extends Date { static now() { return now; } },
  React: { createElement: (type, props, ...children) => ({ type, props, children }) },
  Animated: { Value: class {}, View: 'Animated.View' },
  ScrollView: 'ScrollView', View: 'View', Text: 'Text', Pressable: 'Pressable', Image: 'Image', Glyph: 'Glyph', CountryFlag: 'CountryFlag',
  MotionPreferenceContext: {},
  useThemeRevision: () => {}, useEffect: () => {}, useContext: () => false,
  useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}],
  useSeason: () => ({ races, drivers: [], teams: [], resultsBySession: {}, status: 'live' }),
  styles: new Proxy({}, { get: (_target, key) => key }), C: { red: 'red' }, navItems: [{}, { icon: '' }],
  circuitImageUrl: () => undefined, homeEntranceStyle: () => ({}), formatTime: (value) => value,
});
vm.runInContext(ts.transpileModule(code, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } }).outputText, context);
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.children)];
}
function render() {
  return nodes(context.HomePage({ active: true, introComplete: true }));
}
function hasCountdown(tree) { return tree.some((node) => node.props?.style === 'homeCountdown'); }
function hasText(tree, text) { return tree.some((node) => node.type === 'Text' && node.children.includes(text)); }

for (let index = 0; index < sessions.length; index++) {
  now = start + index * 2 * hour;
  assert.equal(context.getHomeSessions(races, now).currentSession.session.name, names[index], 'start boundary is active');
  let tree = render();
  assert(hasText(tree, '正在进行'));
  assert(hasText(tree, names[index]));
  assert(!hasCountdown(tree), `active ${names[index]} must not show countdown`);
  now += hour;
  assert.equal(context.getHomeSessions(races, now).currentSession, undefined, 'end boundary is idle');
  tree = render();
  assert.equal(hasCountdown(tree), index < sessions.length - 1);
  if (index < sessions.length - 1) assert.equal(context.getHomeSessions(races, now).nextSession.session.name, names[index + 1]);
}
now = start - hour;
assert(hasCountdown(render()));
assert.equal(context.getHomeSessions(races, now).nextSession.session.name, names[0]);
races = [{ ...race, sessions: sessions.slice().reverse() }];
assert.equal(context.getHomeSessions(races, now).nextSession.session.name, names[0], 'input order must not affect next session');
races = [{ ...race, id: 'later', sessions: [sessions[2]] }, { ...race, sessions: [sessions[0]] }];
assert.equal(context.getHomeSessions(races, now).nextSession.race.id, race.id, 'choose nearest session across weekends');
races = [{ ...race, sessions: [{ ...sessions[0], at: 'invalid' }] }];
assert.equal(context.getHomeSessions(races, now).nextSession, undefined);
assert(!hasCountdown(render()), 'missing schedule must not show a zero countdown');
races = [{ ...race, sessions: [{ ...sessions[0], endsAt: undefined }] }];
now = start;
assert.equal(context.getHomeSessions(races, now).currentSession, undefined, 'do not invent an end time');
races = [{ ...race, sessions: [{ ...sessions[0], at: '2026-10-09T16:00:00+08:00', endsAt: '2026-10-09T17:00:00+08:00' }] }];
assert.equal(context.getHomeSessions(races, now).currentSession.session.id, '0', 'timestamps respect timezone offsets');
races = [{ ...race, sessions: [], finished: true }];
assert(!hasCountdown(render()));
assert(hasText(render(), '暂无可显示的赛程'));
console.log('Home checks passed: all session types, rendered LIVE/countdown states, boundaries, order, timezones and missing schedules.');
