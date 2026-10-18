const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const modules = new Map(), storage = new Map();
let states = [], cursor = 0, requests = 0, malformed = false, effects = [], requestOverride;
const hooks = { ...React, useState(initial) {
  const index = cursor++;
  if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
  return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
}, useRef(initial) { return hooks.useState(()=>({current:initial}))[0]; }, useEffect(effect) { effects.push(effect); } };
const taro = { getStorageSync: key => storage.get(key), setStorageSync: (key,value) => storage.set(key,value),
  getSystemInfoSync: () => ({ statusBarHeight: 24 }), useDidShow() {}, useDidHide() {}, setClipboardData() {},
  request(options) { if(requestOverride)return requestOverride(options); const {url,success}=options; requests++; queueMicrotask(()=>success({statusCode:200,data:malformed?{}:
    url.endsWith('/laps')?[{driver_number:63,lap_duration:80},{driver_number:12,lap_duration:81}]:
    [{driver_number:63,position:1,points:25},{driver_number:12,position:2,points:18}]})); },
};
const component = tag => ({children,className,style,onClick,src}) => React.createElement(tag,{className,style,onClick,src},children);
const components = {View:component('div'),Text:component('span'),Image:component('img'),ScrollView:component('div')};
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  if (/\.(png|webp|ttf)$/.test(file)) return file;
  const mod = {exports:{}}; modules.set(file,mod);
  const {code} = babel.transformSync(fs.readFileSync(file,'utf8'), {filename:file,babelrc:false,configFile:false,
    presets:[require.resolve('@babel/preset-react')],plugins:[...(file.endsWith('.ts')?[require.resolve('@babel/plugin-transform-typescript')]:[]),require.resolve('@babel/plugin-transform-modules-commonjs')]});
  const req = name => {
    if (name==='react') return hooks;
    if (name==='@tarojs/taro') return taro;
    if (name==='@tarojs/components') return components;
    const base=path.resolve(path.dirname(file),name);
    const target=[base,base+'.js',base+'.jsx',base+'.ts'].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
    assert.ok(target, 'Missing import '+name);
    return load(target);
  };
  new Function('require','module','exports',code)(req,mod,mod.exports);
  return mod.exports;
}
const images=load(path.join(root,'src/services/images.js'));
const season=load(path.join(root,'src/services/season.js'));
const Main=load(path.join(root,'src/components/MainTabAligned.jsx')).default;
const Detail=load(path.join(root,'src/components/ProfileDetail.jsx')).default;
function render(Component,props,reset=true) { if(reset)states=[]; cursor=0; effects=[]; return Component(props); }
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (typeof tree.type==='function') return nodes(tree.type(tree.props));
  return [tree,...nodes(tree.props?.children)];
}
async function check() {
  const ids=season.snapshotRaces.map(images.circuitIdForRace);
  assert.equal(new Set(ids).size,season.snapshotRaces.length,'Each race has its own circuit');
  assert.equal(images.circuitIdForRace({venue:'巴库城市赛道'}),'baku');
  assert.equal(images.circuitIdForRace({venue:'未知赛道',country:'美国'}),undefined);
  const main=()=>render(Main,{section:'library'},false);
  render(Main,{section:'library'});
  let tree=main();
  tree.props.children[0].props.onScroll({detail:{scrollTop:640}});
  const card=nodes(tree).find(n=>n.props.className==='driver-list-card');
  card.props.onClick(); tree=main();
  assert.equal(tree.props.children[0].props.scrollTop,undefined,'Opening detail releases the previous scroll command');
  tree.props.children[0].props.onScroll({detail:{scrollTop:0}});
  let panel=tree.props.children.find(n=>n?.type===Detail);
  assert.equal(panel.props.detail.kind,'driver');
  panel.props.onOpen('team','mercedes'); tree=main();
  panel=tree.props.children.find(n=>n?.type===Detail);
  assert.equal(panel.props.detail.kind,'team'); panel.props.onBack();
  tree=main(); panel=tree.props.children.find(n=>n?.type===Detail);
  assert.equal(panel.props.detail.kind,'driver'); panel.props.onBack();
  tree=main(); assert.ok(!tree.props.children.find(n=>n?.type===Detail));
  assert.equal(tree.props.children[0].props.scrollTop,640,'Nested return restores the original list position and ignores background scrolling');
  let stopped=false;
  nodes(tree).find(n=>n.props.className==='star').props.onClick({stopPropagation(){stopped=true}});
  assert.ok(stopped); assert.equal(states[0].length,0,'Favorite must not open a detail');
  for(const [tab,className,kind] of [['teams','team-card','team'],['tracks','track-row','track']]) {
    nodes(tree).find(n=>n.props.className?.startsWith('segment-button')&&nodes(n).some(child=>child.props?.children===(tab==='teams'?'车队':'赛道'))).props.onClick();
    tree=main();tree.props.children[0].props.onScroll({detail:{scrollTop:960}});nodes(tree).find(n=>n.props.className===className).props.onClick();
    tree=main(); panel=tree.props.children.find(n=>n?.type===Detail);assert.equal(panel.props.detail.kind,kind);panel.props.onBack();tree=main();
    assert.equal(tree.props.children[0].props.scrollTop,960,kind+' return restores list position');
  }
  for(const section of ['standings','favorites']) {
    storage.set('f1-mini-favorites-v1',['driver:ANT','team:mercedes','track:shanghai']);
    tree=render(Main,{section});
    tree.props.children[0].props.onScroll({detail:{scrollTop:480}});
    const row=nodes(tree).find(n=>n.props.className===(section==='standings'?'standing-row':'person-row'));
    row.props.onClick(); tree=render(Main,{section},false);
    assert.equal(tree.props.children.find(n=>n?.type===Detail).props.detail.kind,'driver');
    tree.props.children.find(n=>n?.type===Detail).props.onBack();tree=render(Main,{section},false);
    assert.equal(tree.props.children[0].props.scrollTop,480,section+' return restores list position');
  }
  const data={races:season.snapshotRaces,drivers:season.snapshotDrivers,teams:season.snapshotTeams,source:'snapshot'};
  const now=Date.parse('2030-01-01T00:00:00Z');
  const past={id:'past',name:'过去的比赛',finished:false,sessions:[{name:'正赛',at:'2029-12-30T00:00:00Z',endsAt:'2029-12-30T02:00:00Z'}]};
  const upcoming={id:'next',name:'下一场测试比赛',round:2,sessions:[
    {name:'一练',at:'2030-01-02T01:02:03Z',endsAt:'2030-01-02T02:02:03Z'},
    {name:'正赛',at:'2030-01-03T00:00:00Z',endsAt:'2030-01-03T02:00:00Z'},
  ]};
  let home=season.homeRaceState([upcoming,past],now);
  assert.equal(home.race,upcoming);assert.equal(home.session.name,'一练');assert.equal(home.live,false);
  assert.deepEqual(home.countdown,[1,1,2,3]);
  home=season.homeRaceState([upcoming,past],Date.parse(upcoming.sessions[0].at));
  assert.equal(home.live,true,'Start boundary switches to current session');
  home=season.homeRaceState([upcoming],Date.parse(upcoming.sessions[0].endsAt));
  assert.equal(home.session.name,'正赛','End boundary switches to the next session');
  assert.equal(season.homeRaceState([past],now).race,undefined,'Stale unfinished flag must not revive past races');
  assert.equal(season.homeRaceState([],now).race,undefined);
  assert.equal(season.homeRaceState([{...upcoming,sessions:[{name:'一练',at:'invalid'}]}],now).race,undefined);
  const singapore=season.snapshotRaces.find(r=>r.country==='新加坡');
  const offline={...singapore,sessions:[],raceAt:undefined};
  home=season.homeRaceState([offline],Date.parse('2026-10-09T09:00:00Z'));
  assert.equal(home.session.name,'一练');assert.equal(home.live,true,'Offline/empty cache must recognize FP1');
  home=season.homeRaceState([offline],Date.parse('2026-10-09T09:30:00Z'));
  assert.equal(home.session.name,'冲刺排位赛');assert.equal(home.live,false);assert.deepEqual(home.countdown,[0,3,0,0]);
  for(const [at,name] of [['2026-10-10T08:00:00Z','冲刺赛'],['2026-10-10T10:00:00Z','排位赛'],['2026-10-11T11:00:00Z','正赛']]){
    assert.equal(season.homeRaceState([offline],Date.parse(at)).session.name,name);
  }
  assert.equal(singapore.raceAt,'2026-10-11T12:00:00Z','Race start must not use the old estimated finish time');
  for(const race of season.snapshotRaces.slice(16)){
    assert.equal(race.sessions.length,5,'Remaining weekends have all five published sessions');
    for(const session of race.sessions)assert.ok(Date.parse(session.endsAt)>Date.parse(session.at));
    assert.equal(season.homeRaceState([race],Date.parse(race.sessions[0].at)-1000).session.name,'一练');
  }
  const oldCache={...singapore,sessions:singapore.sessions.map(s=>({...s,id:'api-'+s.id,localSchedule:false,endsAt:undefined,ended:false}))};
  home=season.homeRaceState([oldCache],Date.parse('2026-10-09T09:00:00Z'));
  assert.equal(home.live,true,'Old cache without end times uses matching official windows');
  assert.equal(home.session.id,oldCache.sessions[0].id,'Keep provider result IDs');
  const changedTime={...singapore,sessions:[{id:'delayed',name:'一练',at:'2026-10-09T09:00:00Z',endsAt:'2026-10-09T10:00:00Z'}]};
  assert.equal(season.homeRaceState([changedTime],Date.parse('2026-10-09T09:45:00Z')).live,true,'Provider schedule changes take precedence');
  const unknown={id:'unknown',name:'待定赛事',finished:false,sessions:[]};
  assert.equal(season.homeRaceState([unknown],now).countdown,undefined,'Unknown start must not show a fabricated timer');
  const realNow=Date.now,realSetInterval=global.setInterval,realClearInterval=global.clearInterval;
  let fakeNow=now,tick,cleared=false;
  Date.now=()=>fakeNow;
  global.setInterval=(callback,delay)=>{assert.equal(delay,1000);tick=callback;return 42};
  global.clearInterval=id=>{assert.equal(id,42);cleared=true};
  try{
    render(Main,{section:'home'});states[2]={...data,races:[upcoming,past]};
    let html=renderToStaticMarkup(render(Main,{section:'home'},false));
    assert.ok(html.includes('距离下一场 · 一练'));assert.ok(html.includes('home-countdown-value">03'));
    const cleanupTimer=effects[0]();fakeNow+=1000;tick();
    html=renderToStaticMarkup(render(Main,{section:'home'},false));
    assert.ok(html.includes('home-countdown-value">02'),'Timer updates every second');
    fakeNow=Date.parse(upcoming.sessions[0].at);tick();
    html=renderToStaticMarkup(render(Main,{section:'home'},false));
    assert.ok(html.includes('一练 · 正在进行'));assert.ok(!html.includes('home-countdown-value'));
    cleanupTimer();assert.ok(cleared,'Timer must be cleaned up');
    render(Main,{section:'library'});assert.equal(effects[0](),undefined,'Other tabs must not start a timer');
    render(Main,{section:'home'});states[12]=false;
    render(Main,{section:'home'},false);assert.equal(effects[0](),undefined,'Hidden page must not start a timer');
    render(Main,{section:'home'});states[0]=[{kind:'race',id:upcoming.id}];
    render(Main,{section:'home'},false);assert.equal(effects[0](),undefined,'Detail overlay pauses the timer');
    render(Main,{section:'home'});states[2]={...data,races:[unknown]};
    html=renderToStaticMarkup(render(Main,{section:'home'},false));
    assert.ok(html.includes('开赛时间待同步'));assert.ok(!html.includes('home-countdown-value'));
    fakeNow=Date.parse('2026-10-09T09:00:00Z');
    render(Main,{section:'home'});states[2]={...data,races:[offline],error:'赛事期间暂不可同步，请稍后重试。显示本地数据。'};
    html=renderToStaticMarkup(render(Main,{section:'home'},false));
    assert.ok(html.includes('一练 · 正在进行'));assert.ok(!html.includes('home-countdown-value'),'Actual restricted/offline FP1 scenario must hide countdown');
    assert.ok(html.includes('冲刺排位赛'));assert.ok(html.includes('正赛'),'Show the full weekend, including race');
    fakeNow=Date.parse('2026-10-09T09:30:00Z');states[11]=fakeNow;
    html=renderToStaticMarkup(render(Main,{section:'home'},false));
    assert.ok(html.includes('距离下一场 · 冲刺排位赛'));
  }finally{Date.now=realNow;global.setInterval=realSetInterval;global.clearInterval=realClearInterval}
  for(const section of ['home','schedule','standings','favorites','library','settings']){
    render(Main,{section}); states[2]={...data,error:'同步失败，请稍后重试。显示本地数据。'};
    const html=renderToStaticMarkup(render(Main,{section},false));
    assert.ok(!html.includes('inline-notice'),'Error must stay inside the status pill');
    assert.ok(!html.includes('OpenF1'),'UI must omit provider prompts');
    if(section!=='settings')assert.ok(html.includes('同步暂不可用 · 本地数据'));
  }
  render(Main,{section:'schedule'});
  const notice=nodes(render(Main,{section:'schedule'},false)).find(n=>n.props.className==='demo-notice-button');
  requestOverride=({success})=>queueMicrotask(()=>success({statusCode:401,data:{}}));
  notice.props.onClick();
  assert.ok(renderToStaticMarkup(render(Main,{section:'schedule'},false)).includes('正在同步…'));
  await new Promise(setImmediate);
  assert.ok(renderToStaticMarkup(render(Main,{section:'schedule'},false)).includes('同步暂不可用 · 本地数据'));
  requestOverride=undefined;
  for(const [source,error,label] of [['cache','failed','同步暂不可用 · 已缓存'],['openf1','','已同步'],['cache','','已保存的赛季信息'],['snapshot','','本地资料快照']]){
    render(Main,{section:'schedule'});states[2]={...data,source,error};
    const html=renderToStaticMarkup(render(Main,{section:'schedule'},false));
    assert.ok(html.includes(label));assert.equal(html.includes('demo-dot-live'),source==='openf1'&&!error);
  }
  const props={season:data,favorites:[],onBack(){},onOpen(){},toggleFavorite(){},statusHeight:24,flags:{},
    renderImage:(key,src,className,fallback)=>src?React.createElement('img',{src,className}):fallback};
  for (const [kind,rows] of [['driver',data.drivers],['team',data.teams],['track',data.races],['race',data.races]]) {
    for(const row of rows) assert.ok(renderToStaticMarkup(render(Detail,{...props,detail:{kind,id:row.id}})).includes('detail-header'));
  }
  assert.ok(renderToStaticMarkup(render(Detail,{...props,detail:{kind:'driver',id:'missing'}})).includes('没有这项资料'));
  const liveProps={...props,detail:{kind:'driver',id:'driver:RUS'},season:{...data,source:'openf1',races:[{
    ...data.races[0],finished:true,sessions:[{id:'live-race',name:'正赛',ended:true},{id:'live-qual',name:'排位赛',ended:true}],
  }]}};
  render(Detail,liveProps); const cleanup=effects[0]();
  await new Promise(setImmediate);
  const liveHtml=renderToStaticMarkup(render(Detail,liveProps,false));
  assert.ok(!liveHtml.includes('OpenF1'));assert.ok(!liveHtml.includes('openf1.org'));
  assert.ok(liveHtml.includes('正赛 1/1'),'Loaded results must update synchronization coverage');
  assert.ok(liveHtml.includes('P1')); assert.ok(liveHtml.includes('25 分'));
  cleanup(); requests=0;
  const first=season.loadSessionResults('test-race','正赛'),second=season.loadSessionResults('test-race','正赛');
  assert.equal(first,second,'Concurrent result requests must be deduplicated');
  const result=await first;assert.equal(requests,2);assert.equal(result[0].fastestLap,true);assert.equal(result[1].fastestLap,false);
  await season.loadSessionResults('test-race','正赛'); assert.equal(requests,2,'Results must reuse persisted cache');
  malformed=true; await assert.rejects(season.loadSessionResults('bad-result','排位赛'),/格式错误/);
  requestOverride=({success})=>queueMicrotask(()=>success({statusCode:401,data:{detail:'Live F1 session in progress. Global API access (including past sessions) is restricted to authenticated users until the session ends.'}}));
  const restricted=await season.loadSeason(true);
  assert.equal(restricted.source,'snapshot'); assert.equal(restricted.error,'赛事期间暂不可同步，请稍后重试。显示本地数据。');
  assert.equal(restricted.races,season.snapshotRaces);
  for(const source of ['snapshot','cache']){
    render(Main,{section:'schedule'});states[2]={...restricted,source};
    const html=renderToStaticMarkup(render(Main,{section:'schedule'},false));
    assert.ok(html.includes('赛事进行中 · 暂不可同步'));
    assert.ok(!html.includes('同步暂不可用'));
  }
  const cachedData={...data,updatedAt:123};
  storage.set('f1-mini-season-2026-v1',{savedAt:0,data:cachedData});
  const cached=await season.loadSeason(true);
  assert.equal(cached.source,'cache'); assert.equal(cached.updatedAt,123); assert.equal(cached.races,cachedData.races);
  assert.equal(cached.error,'赛事期间暂不可同步，请稍后重试。显示上次缓存。');
  storage.delete('f1-mini-season-2026-v1');
  for(const [statusCode,message] of [[401,'数据访问受限，请稍后重试'],[403,'数据访问受限，请稍后重试'],[429,'请求频繁，请稍后重试'],[500,'同步失败，请稍后重试']]){
    requestOverride=({success})=>queueMicrotask(()=>success({statusCode,data:{}}));
    assert.equal((await season.loadSeason(true)).error,message+'。显示本地数据。');
  }
  for(const [errMsg,expected] of [['request:fail url not in domain list',/请先配置请求域名/],['request:fail timeout',/连接超时，请重试/]]){
    requestOverride=({fail})=>queueMicrotask(()=>fail({errMsg}));
    assert.match((await season.loadSeason(true)).error,expected);
  }
  requestOverride=({success})=>queueMicrotask(()=>success({statusCode:200,data:{}}));
  assert.equal((await season.loadSeason(true)).error,'同步失败，请稍后重试。显示本地数据。');
  requestOverride=undefined;
  if(process.env.DETAIL_PREVIEW_DIR){
    fs.mkdirSync(process.env.DETAIL_PREVIEW_DIR,{recursive:true});
    const css=fs.readFileSync(path.join(root,'src/signature-font.css'),'utf8')+fs.readFileSync(path.join(root,'src/app-aligned.css'),'utf8').replace(/([\d.]+)rpx/g,(_,n)=>Number(n)/2+'px');
    for(const theme of ['light','dark']){
      storage.set('f1-mini-theme-v1',theme);
      const html=renderToStaticMarkup(render(Main,{section:'home'}));
      fs.writeFileSync(path.join(process.env.DETAIL_PREVIEW_DIR,'home-'+theme+'.html'),`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif}${css}span{box-sizing:border-box}</style>${html}`);
    }
    for(const kind of ['driver','team','track']){
      const id=kind==='driver'?data.drivers[0].id:kind==='team'?data.teams[0].id:data.races[1].id;
      const html=renderToStaticMarkup(render(Detail,{...props,detail:{kind,id}})).replace(/src="([^"]+)"/g,(match,src)=>src.startsWith('http')?match:'src="/assets/'+path.relative(path.join(root,'src/assets'),src).replaceAll('\\','/')+'"');
      fs.writeFileSync(path.join(process.env.DETAIL_PREVIEW_DIR,kind+'.html'),`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif}${css}.detail-scroll{overflow-y:auto}span{box-sizing:border-box}</style>${html}`);
    }
  }
  console.log('PASS: home countdown selection/tick/start/end/offline/unknown/cleanup, 79 detail renders, circuit mapping, entry/back stack, favorite event isolation, result dedup/cache, fastest lap, malformed response, OpenF1 restriction/cache/domain/timeout diagnostics.');
}
check().catch(error=>{console.error(error);process.exitCode=1});
