import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { circuitIdForRace, circuitImageForRace, circuitImageForTrack, driverPortrait, teamCars, teamLogos } from '../services/images';
import { circuitProfiles, driverProfiles, teamProfiles, libraryStatsAsOf, loadSessionResults } from '../services/season';

function Metrics({ title, values, leads = false }) {
  return <View className="profile-data-card"><Text className="profile-data-title">{title}</Text><View className={'profile-metrics'+(leads?' profile-metrics-leads':'')}>{values.map(([label,value])=><View className="profile-metric" key={label}><Text className="profile-metric-value">{value ?? '—'}</Text><Text className="profile-metric-label">{label}</Text></View>)}</View></View>;
}
function Info({title,rows}) {
  return <View className="profile-data-card"><Text className="profile-data-title">{title}</Text>{rows.map(([label,value])=><View className="profile-info-row" key={label}><Text className="profile-info-label">{label}</Text><Text className="profile-info-value">{value ?? '资料待核实'}</Text></View>)}</View>;
}
function Source({url,asOf}) {
  return <View className="profile-source" onClick={()=>Taro.setClipboardData({data:url})}><Text>资料来源：Formula 1{asOf?' · '+asOf:''} · 点击复制链接</Text></View>;
}
const seasonValues = stats => [['大奖赛场次',stats.races],['分站胜利',stats.wins],['领奖台',stats.podiums],['杆位',stats.poles],['最快圈',stats.fastestLaps]];
const positionLabel = row => !row ? '—' : row.dsq ? 'DSQ' : row.dns ? 'DNS' : row.position ? 'P'+row.position : row.dnf ? 'DNF' : '—';

export default function ProfileDetail({detail,season,favorites,onBack,onOpen,toggleFavorite,renderImage,statusHeight,flags}) {
  const {races,drivers,teams}=season;
  const driver=detail.kind==='driver'?drivers.find(d=>d.id===detail.id):null;
  const team=teams.find(t=>t.id===(driver?driver.teamId:detail.id));
  const driverProfile=driverProfiles.find(d=>d.code===driver?.code);
  const teamProfile=teamProfiles.find(t=>t.id===team?.id);
  const profile=driver?driverProfile:teamProfile;
  const race=['track','race'].includes(detail.kind)?races.find(r=>r.id===detail.id):null;
  const track=detail.kind==='track'?circuitProfiles.find(t=>t.id===(race?circuitIdForRace(race):detail.id)):null;
  const [results,setResults]=useState({}),[loading,setLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const [selectedSession,setSelectedSession]=useState(()=>race?.sessions?.find(s=>!s.ended)?.id||race?.sessions?.find(s=>s.name==='正赛')?.id);
  useEffect(()=>{
    let active=true;
    const sessions=detail.kind==='race'?(race?.sessions||[]).filter(s=>!s.localSchedule&&s.id===selectedSession&&s.ended)
      : ['driver','team'].includes(detail.kind)?races.flatMap(r=>r.sessions||[]).filter(s=>!s.localSchedule&&s.ended&&['正赛','排位赛'].includes(s.name)):[];
    if(!sessions.length)return()=>{active=false};
    setLoading(true);setError('');
    // Two workers keep a full-season profile from flooding the mini-program request queue.
    let index=0;
    const worker=async()=>{while(active&&index<sessions.length){const session=sessions[index++];try{const rows=await loadSessionResults(session.id,session.name);if(active)setResults(old=>({...old,[session.id]:rows}))}catch(_){if(active)setError('部分场次尚未同步，点击重试；未确认的数据显示为 —。')}}};
    Promise.all([worker(),worker()]).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[detail.kind,races,selectedSession,retry]);
  const favoriteId=driver?.id||(team?'team:'+team.id:track?'track:'+track.id:race?'race:'+race.round:null);
  const title=detail.kind==='driver'?'车手资料':detail.kind==='team'?'车队资料':detail.kind==='race'?'赛事详情':'赛道资料';
  const completed=races.filter(r=>r.finished).sort((a,b)=>b.round-a.round);
  const rowFor=(r,name,d)=>results[(r.sessions||[]).find(s=>s.name===name)?.id]?.find(row=>Number(row.driver_number)===Number(d.number));
  const members=drivers.filter(d=>d.teamId===team?.id&&d.seasonStatus!=='substitute');
  const synced=name=>races.filter(r=>{const s=(r.sessions||[]).find(x=>x.name===name);return s?.ended&&results[s.id]?.length});
  const raceRows=synced('正赛').flatMap(r=>results[(r.sessions||[]).find(s=>s.name==='正赛').id]).filter(row=>members.some(d=>Number(d.number)===Number(row.driver_number)));
  const qualRows=synced('排位赛').flatMap(r=>results[(r.sessions||[]).find(s=>s.name==='排位赛').id]).filter(row=>members.some(d=>Number(d.number)===Number(row.driver_number)));
  const finished=row=>!row.dnf&&!row.dns&&!row.dsq;
  const driverRows=driver?completed.map(r=>rowFor(r,'正赛',driver)).filter(Boolean):[];
  const driverQual=driver?races.map(r=>rowFor(r,'排位赛',driver)).filter(Boolean):[];
  const color=team?.color||'#073F43';
  const light=/^#[0-9a-f]{6}$/i.test(color)&&[1,3,5].reduce((n,i,j)=>n+parseInt(color.slice(i,i+2),16)*[.299,.587,.114][j],0)>155;
  const fastestKnown=synced('正赛').length>0&&synced('正赛').every(r=>results[(r.sessions||[]).find(s=>s.name==='正赛').id].every(row=>row.fastestLapChecked));
  const historyTitle=`2026 赛季统计 · 正赛 ${synced('正赛').length}/${completed.length} · 排位 ${synced('排位赛').length} 站`;
  return <View className={'detail-panel detail-'+detail.kind} style={{paddingTop:statusHeight+'px'}}>
    <View className="detail-header"><View className="detail-back" role="button" aria-label="返回" onClick={onBack}><Text>‹</Text></View><View className="detail-header-copy"><Text className="detail-header-title">{title}</Text><Text className="detail-header-subtitle">{race?race.country+' · ROUND '+race.round:'2026 · '+(driver?.code||team?.short||track?.country||'CURRENT SEASON')}</Text></View>{favoriteId?<View className="detail-favorite" role="button" aria-label="收藏" onClick={()=>toggleFavorite(favoriteId)}><Text>{favorites.includes(favoriteId)?'★':'☆'}</Text></View>:null}</View>
    <ScrollView className="detail-scroll" scrollY enhanced showScrollbar={false}><View className="detail-content">
      {driver?<>
        <View className="driver-poster" style={{backgroundColor:color}}><Text className="driver-poster-number">{driver.number}</Text>{renderImage('detail-driver-'+driver.code,driverPortrait(driver),'driver-poster-photo',null,'widthFix')}<View className="driver-poster-fade"/><View className="driver-poster-info">{driverProfile?<Text className="driver-poster-signature">{driverProfile.source.split('/').pop().split('-')[0]}</Text>:null}<Text className="driver-poster-name">{driver.name}</Text><View className="driver-poster-meta"><Text>{flags[driver.country]||'🏁'} {driver.country}</Text><Text>│</Text><View onClick={()=>team&&onOpen('team',team.id)}><Text>{team?.name||'车队资料待更新'} ›</Text></View><Text>│ {driver.number}</Text></View></View></View>
        <View className="profile-notice"><Text>{loading?'正在同步历站成绩…':historyTitle}</Text></View>
        <Metrics title={historyTitle} leads values={[
          ['积分',driver.points],['分站胜利',driverRows.length?driverRows.filter(row=>finished(row)&&row.position===1).length:null],
          ['大奖赛场次',completed.length],['领奖台',driverRows.length?driverRows.filter(row=>finished(row)&&row.position<=3).length:null],
          ['杆位',driverQual.length?driverQual.filter(row=>finished(row)&&row.position===1).length:null],['最快圈',fastestKnown?driverRows.filter(row=>row.fastestLap).length:null],
        ]}/>
        <View className="profile-data-card"><Text className="profile-data-title">本赛季历站成绩 · {completed.length} STOPS</Text>{completed.length?completed.map(r=>{const row=rowFor(r,'正赛',driver);return <View className="profile-history-row" key={r.id} onClick={()=>onOpen('race',r.id)}><Text className="profile-history-round">R{String(r.round).padStart(2,'0')}</Text><View className="row-copy"><Text className="row-title">{r.name}</Text><Text className="row-sub">{r.country}</Text></View><View><Text className="profile-history-position">{positionLabel(row)}</Text><Text className="row-sub">{!row?'待同步':row.dsq?'取消资格':row.dns?'未发车':row.dnf?'退赛':row.points==null?'完赛':row.points+' 分'}</Text></View></View>}):<Text className="row-sub">本赛季尚无已完成分站。</Text>}</View>
      </>:null}
      {detail.kind==='team'&&team?<>
        <View className="team-detail-hero"><View className="team-detail-stage" style={{backgroundColor:color,color:light?'#171A1F':'#FFFFFF'}}><Text className="team-detail-eyebrow">{team.short} · 2026</Text><Text className="team-detail-fullname">{teamProfile?.fullName||team.name}</Text><Text className="team-detail-watermark">{team.short}</Text>{renderImage('detail-car-'+team.id,teamCars[team.id],'team-detail-car')}</View><View className="team-detail-title-band" style={{borderColor:color}}><View className="team-detail-slash" style={{backgroundColor:color}}/><Text>{team.name}</Text><View className="team-detail-slash" style={{backgroundColor:color}}/></View><View className="team-detail-brand" style={{backgroundColor:color}}><View className="team-detail-shade"/><Text className="team-detail-drivers-label">DRIVERS</Text><View className="team-detail-driver-names">{members.map(d=><View key={d.id} onClick={()=>onOpen('driver',d.id)}><Text>{d.name} · {d.code} ›</Text></View>)}</View>{renderImage('detail-logo-'+team.id,teamLogos[team.id],'team-detail-logo')}</View></View>
        <Text className="team-detail-roster-title">车手阵容</Text><View className="team-detail-roster">{members.map(d=><View className="team-detail-driver" key={d.id} style={{backgroundColor:color}} onClick={()=>onOpen('driver',d.id)}>{renderImage('roster-'+d.code,driverPortrait(d),'team-detail-driver-photo',null,'widthFix')}<View className="team-detail-driver-copy"><Text>{d.name}</Text><Text>#{d.number} · {d.code}</Text></View></View>)}</View>
        <View className="profile-notice"><Text>{loading?'正在同步车队成绩…':historyTitle}</Text></View>
        <Metrics title={season.source==='snapshot'?'2026 赛季统计 · 本地快照 '+libraryStatsAsOf:historyTitle} values={[
          ['车队积分',team.points],...(season.source==='snapshot'&&teamProfile?seasonValues(teamProfile.season):[
            ['大奖赛场次',synced('正赛').length? synced('正赛').filter(r=>members.some(d=>rowFor(r,'正赛',d))).length:null],
            ['分站胜利',raceRows.length?raceRows.filter(row=>finished(row)&&row.position===1).length:null],['领奖台',raceRows.length?raceRows.filter(row=>finished(row)&&row.position<=3).length:null],['杆位',qualRows.length?qualRows.filter(row=>finished(row)&&row.position===1).length:null],['最快圈',fastestKnown?raceRows.filter(row=>row.fastestLap).length:null],
          ]),
        ]}/>
      </>:null}
      {['driver','team'].includes(detail.kind)?<>
        {error?<View className="inline-notice" onClick={()=>setRetry(n=>n+1)}><Text>{error}</Text></View>:null}
        {profile?<Metrics title={driver?'F1 生涯累计':'车队 F1 生涯累计'} values={(()=>{const s=profile.career;return [['大奖赛参赛',s.entered],[driver?'生涯积分':'车队积分',s.points],['分站胜利',s.wins],['领奖台',s.podiums],['杆位',s.poles],[driver?'世界冠军':'车队冠军',s.titles]]})()}/>:null}
        {detail.kind==='team'&&teamProfile?<Info title="车队资料" rows={[
          ['官方全名',teamProfile.fullName],['基地',teamProfile.base],['车队负责人',teamProfile.principal],['技术负责人',teamProfile.technicalChief],['底盘',teamProfile.chassis],['动力单元',teamProfile.powerUnit],['首次参赛',teamProfile.firstEntry],
        ]}/>:null}
        {profile?<Source url={profile.source} asOf={libraryStatsAsOf}/>:null}
        {!driver&&!team?<Text className="row-sub">当前赛季没有这项资料。</Text>:null}
      </>:null}
      {detail.kind==='track'?<>
        <Text className="detail-race-name">{race?.venue||track?.city||'赛道资料待同步'}</Text><Text className="detail-race-venue">{track?.city||race?.country} · {track?.country||race?.country}</Text>
        <View className="profile-data-card">{renderImage('detail-track-'+detail.id,race?circuitImageForRace(race):circuitImageForTrack(track),'detail-track-map',<View className="track-map-pending"><Text>赛道图暂不可用</Text></View>)}{track?<><Metrics title="赛道参数" values={[[ '单圈长度',track.lengthKm.toFixed(3)+' km'],...(track.turns?[['弯道数',track.turns]]:[]),['正赛圈数',track.laps]]}/><Info title="赛道资料" rows={[
          ['举办城市',track.city],['首办大奖赛',track.firstGrandPrix],['赛道纪录',track.lapRecord?`${track.lapRecord} · ${track.lapRecordHolder}（${track.lapRecordYear}）`:'官方资料暂未列出'],
        ]}/><Source url={track.source}/></>:<Text className="row-sub">赛道参数待核实。</Text>}</View>
        {race?<Info title="本季分站" rows={[[ '大奖赛名称',race.name],['实际举办地',(track?.city||race.country)+' · '+race.country],['赛季轮次','第 '+race.round+' 站']]}/>:null}
      </>:null}
      {detail.kind==='race'&&race?<>
        <Text className="detail-race-name">{race.name}</Text><Text className="detail-race-venue">{race.venue} · {race.country} · {race.dates}</Text><View className="profile-data-card" onClick={()=>onOpen('track',race.id)}>{renderImage('race-map-'+race.id,circuitImageForRace(race),'detail-track-map')}<Text className="profile-history-position">查看赛道资料 ›</Text></View>
        <Text className="profile-data-title">比赛周末安排 · 本地时间</Text>{(race.sessions||[]).map(s=><View className={'home-session-card'+(s.id===selectedSession?' detail-session-selected':'')} key={s.id} onClick={()=>setSelectedSession(s.id)}><Text className="home-session-name">{s.name}</Text><Text className="home-session-time">{new Date(s.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})}</Text></View>)}
        <View className="profile-data-card"><Text className="profile-data-title">场次成绩</Text>{loading?<Text className="row-sub">正在载入场次成绩…</Text>:null}{error?<View onClick={()=>setRetry(n=>n+1)}><Text className="row-sub">{error}</Text></View>:null}{results[selectedSession]?.length?results[selectedSession].map(row=>{const d=drivers.find(x=>Number(x.number)===Number(row.driver_number));return <View className="profile-history-row" key={row.driver_number} onClick={()=>d&&onOpen('driver',d.id)}><Text className="profile-history-position">{positionLabel(row)}</Text><View className="row-copy"><Text className="row-title">{d?.name||'车手 #'+row.driver_number}</Text><Text className="row-sub">{teams.find(t=>t.id===d?.teamId)?.name}</Text></View><Text className="row-sub">{row.points??'—'} 分</Text></View>}):!loading?<Text className="row-sub">{race.sessions?.find(s=>s.id===selectedSession)?.ended?'暂无已公布或已缓存成绩。':'本场尚未结束，成绩公布后显示。'}</Text>:null}</View>
      </>:null}
    </View></ScrollView>
  </View>;
}
