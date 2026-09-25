import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Animated,
  Easing,
  Linking,
  Pressable as NativePressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from 'react-native';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { SvgCss } from 'react-native-svg/css';
import { circuitProfiles, driverProfiles, libraryStatsAsOf, teamProfiles, type CircuitProfile, type DriverProfile, type TeamProfile } from './library-data';
import { teamLogoXml } from './team-logos';

const C = {
  red: '#E31C3D',
  ink: '#171A1F',
  muted: '#7D858E',
  line: '#E8EAED',
  canvas: '#F5F6F7',
  teal: '#073F43',
  white: '#FFFFFF',
};

const MotionPreferenceContext = createContext(false);
const useNativeDriver = Platform.OS !== 'web';

type Section = 'schedule' | 'live' | 'favorites' | 'standings' | 'library';
type Detail =
  | { kind: 'race'; id: string }
  | { kind: 'driver'; id: string }
  | { kind: 'team'; id: string }
  | { kind: 'track'; id: string };
type LibraryTab = 'drivers' | 'teams' | 'tracks';
type StandingsTab = 'drivers' | 'teams';
type ScheduleFilter = 'upcoming' | 'finished';

type Team = {
  id: string;
  name: string;
  short: string;
  color: string;
  points: number | null;
  base: string;
};

type Driver = {
  id: string;
  name: string;
  code: string;
  country: string;
  teamId: string;
  number: number;
  points: number | null;
  wins?: number;
  seasonStatus?: 'current' | 'substitute';
};

type Session = { id?: string; name: string; day: string; at: string; offset?: string; ended?: boolean };
type Result = { driverId: string; position: number; gridPosition?: number; gap: string; fastestLap?: boolean; status: 'finished' | 'dnf' | 'dns' | 'dsq'; points: number | null };
type ResultsBySession = Record<string, Result[]>;
type Race = {
  id: string;
  round: number;
  name: string;
  venue: string;
  country: string;
  countryCode: string;
  timeZone: string;
  dates: string;
  finished: boolean;
  sessions: Session[];
  results: Result[];
};

const teams: Team[] = [
  { id: 'mclaren', name: '迈凯伦', short: 'MCL', color: '#FF8000', points: 241, base: '英国 · 沃金' },
  { id: 'ferrari', name: '法拉利', short: 'FER', color: '#E31C3D', points: 218, base: '意大利 · 马拉内罗' },
  { id: 'redbull', name: '红牛', short: 'RBR', color: '#3671C6', points: 196, base: '英国 · 米尔顿凯恩斯' },
  { id: 'mercedes', name: '梅赛德斯', short: 'MER', color: '#26D3C1', points: 181, base: '英国 · 布拉克利' },
  { id: 'aston', name: '阿斯顿·马丁', short: 'AMR', color: '#23856B', points: 92, base: '英国 · 银石' },
  { id: 'williams', name: '威廉姆斯', short: 'WIL', color: '#64C4FF', points: 74, base: '英国 · 格罗夫' },
];

const drivers: Driver[] = [
  { id: 'norris', name: '兰多·诺里斯', code: 'NOR', country: '英国', teamId: 'mclaren', number: 4, points: 176, wins: 4 },
  { id: 'verstappen', name: '马克斯·维斯塔潘', code: 'VER', country: '荷兰', teamId: 'redbull', number: 1, points: 163, wins: 5 },
  { id: 'leclerc', name: '夏尔·勒克莱尔', code: 'LEC', country: '摩纳哥', teamId: 'ferrari', number: 16, points: 151, wins: 2 },
  { id: 'hamilton', name: '刘易斯·汉密尔顿', code: 'HAM', country: '英国', teamId: 'ferrari', number: 44, points: 128, wins: 1 },
  { id: 'russell', name: '乔治·拉塞尔', code: 'RUS', country: '英国', teamId: 'mercedes', number: 63, points: 119, wins: 1 },
  { id: 'piastri', name: '奥斯卡·皮亚斯特里', code: 'PIA', country: '澳大利亚', teamId: 'mclaren', number: 81, points: 110, wins: 2 },
  { id: 'albon', name: '亚历山大·阿尔本', code: 'ALB', country: '泰国', teamId: 'williams', number: 23, points: 83, wins: 0 },
];

const races: Race[] = [
  {
    id: 'round-18', round: 18, name: '日本大奖赛', venue: '铃鹿国际赛道', country: '日本', countryCode: 'JP', timeZone: 'Asia/Tokyo',
    dates: '10.09 — 10.11', finished: false,
    sessions: [
      { name: '一练', day: '周五 10.09', at: '2026-10-09T11:30:00+09:00' },
      { name: '二练', day: '周五 10.09', at: '2026-10-09T15:00:00+09:00' },
      { name: '三练', day: '周六 10.10', at: '2026-10-10T11:30:00+09:00' },
      { name: '排位赛', day: '周六 10.10', at: '2026-10-10T15:00:00+09:00' },
      { name: '正赛', day: '周日 10.11', at: '2026-10-11T14:00:00+09:00' },
    ],
    results: [],
  },
  {
    id: 'round-19', round: 19, name: '新加坡大奖赛', venue: '滨海湾街道赛道', country: '新加坡', countryCode: 'SG', timeZone: 'Asia/Singapore',
    dates: '10.16 — 10.18', finished: false,
    sessions: [
      { name: '一练', day: '周五 10.16', at: '2026-10-16T16:30:00+08:00' },
      { name: '冲刺排位赛', day: '周五 10.16', at: '2026-10-16T20:30:00+08:00' },
      { name: '冲刺赛', day: '周六 10.17', at: '2026-10-17T16:00:00+08:00' },
      { name: '排位赛', day: '周六 10.17', at: '2026-10-17T20:00:00+08:00' },
      { name: '正赛', day: '周日 10.18', at: '2026-10-18T20:00:00+08:00' },
    ],
    results: [],
  },
  {
    id: 'round-17', round: 17, name: '意大利大奖赛', venue: '蒙扎赛道', country: '意大利', countryCode: 'IT', timeZone: 'Europe/Rome',
    dates: '09.04 — 09.06', finished: true,
    sessions: [
      { name: '一练', day: '周五 09.04', at: '2026-09-04T13:30:00+02:00' },
      { name: '二练', day: '周五 09.04', at: '2026-09-04T17:00:00+02:00' },
      { name: '三练', day: '周六 09.05', at: '2026-09-05T12:30:00+02:00' },
      { name: '排位赛', day: '周六 09.05', at: '2026-09-05T16:00:00+02:00' },
      { name: '正赛', day: '周日 09.06', at: '2026-09-06T15:00:00+02:00' },
    ],
    results: [
      { driverId: 'norris', position: 1, gridPosition: 1, gap: '1:18:24.325', fastestLap: true, status: 'finished', points: 25 },
      { driverId: 'leclerc', position: 2, gridPosition: 3, gap: '+4.207s', fastestLap: false, status: 'finished', points: 18 },
      { driverId: 'verstappen', position: 3, gridPosition: 2, gap: '+8.931s', fastestLap: false, status: 'finished', points: 15 },
      { driverId: 'hamilton', position: 4, gridPosition: 5, gap: '+12.418s', fastestLap: false, status: 'finished', points: 12 },
      { driverId: 'piastri', position: 5, gridPosition: 4, gap: '+16.052s', fastestLap: false, status: 'finished', points: 10 },
      { driverId: 'russell', position: 6, gridPosition: 6, gap: '+21.334s', fastestLap: false, status: 'finished', points: 8 },
      { driverId: 'albon', position: 7, gridPosition: 10, gap: '退赛', fastestLap: false, status: 'dnf', points: 0 },
    ],
  },
];

// Offline schedule snapshot from Formula1.com/en/racing/2026; session times and results still require sync.
const offlineCalendarRaces: Race[] = ([
  { id: 'offline-round-1', round: 1, name: '澳大利亚大奖赛', venue: '阿尔伯特公园赛道', country: '澳大利亚', countryCode: 'AUS', timeZone: 'Australia/Melbourne', dates: '03.06 — 03.08', endAt: '2026-03-08T06:00:00Z' },
  { id: 'offline-round-2', round: 2, name: '中国大奖赛', venue: '上海国际赛车场', country: '中国', countryCode: 'CHN', timeZone: 'Asia/Shanghai', dates: '03.13 — 03.15', endAt: '2026-03-15T09:00:00Z' },
  { id: 'offline-round-3', round: 3, name: '日本大奖赛', venue: '铃鹿国际赛道', country: '日本', countryCode: 'JPN', timeZone: 'Asia/Tokyo', dates: '03.27 — 03.29', endAt: '2026-03-29T07:00:00Z' },
  { id: 'offline-round-4', round: 4, name: '迈阿密大奖赛', venue: '迈阿密国际赛车场', country: '美国', countryCode: 'USA', timeZone: 'America/New_York', dates: '05.01 — 05.03', endAt: '2026-05-03T19:00:00Z' },
  { id: 'offline-round-5', round: 5, name: '加拿大大奖赛', venue: '吉尔·维伦纽夫赛道', country: '加拿大', countryCode: 'CAN', timeZone: 'America/Toronto', dates: '05.22 — 05.24', endAt: '2026-05-24T22:00:00Z' },
  { id: 'offline-round-6', round: 6, name: '摩纳哥大奖赛', venue: '摩纳哥赛道', country: '摩纳哥', countryCode: 'MON', timeZone: 'Europe/Monaco', dates: '06.05 — 06.07', endAt: '2026-06-07T15:00:00Z' },
  { id: 'offline-round-7', round: 7, name: '巴塞罗那-加泰罗尼亚大奖赛', venue: '巴塞罗那-加泰罗尼亚赛道', country: '西班牙', countryCode: 'ESP', timeZone: 'Europe/Madrid', dates: '06.12 — 06.14', endAt: '2026-06-14T15:00:00Z' },
  { id: 'offline-round-8', round: 8, name: '奥地利大奖赛', venue: '红牛赛道', country: '奥地利', countryCode: 'AUT', timeZone: 'Europe/Vienna', dates: '06.26 — 06.28', endAt: '2026-06-28T15:00:00Z' },
  { id: 'offline-round-9', round: 9, name: '英国大奖赛', venue: '银石赛道', country: '英国', countryCode: 'GBR', timeZone: 'Europe/London', dates: '07.03 — 07.05', endAt: '2026-07-05T16:00:00Z' },
  { id: 'offline-round-10', round: 10, name: '比利时大奖赛', venue: '斯帕-弗朗科尔尚赛道', country: '比利时', countryCode: 'BEL', timeZone: 'Europe/Brussels', dates: '07.17 — 07.19', endAt: '2026-07-19T15:00:00Z' },
  { id: 'offline-round-11', round: 11, name: '匈牙利大奖赛', venue: '匈牙利赛道', country: '匈牙利', countryCode: 'HUN', timeZone: 'Europe/Budapest', dates: '07.24 — 07.26', endAt: '2026-07-26T15:00:00Z' },
  { id: 'offline-round-12', round: 12, name: '荷兰大奖赛', venue: '赞德沃特赛道', country: '荷兰', countryCode: 'NED', timeZone: 'Europe/Amsterdam', dates: '08.21 — 08.23', endAt: '2026-08-23T15:00:00Z' },
  { id: 'offline-round-13', round: 13, name: '意大利大奖赛', venue: '蒙扎赛道', country: '意大利', countryCode: 'ITA', timeZone: 'Europe/Rome', dates: '09.04 — 09.06', endAt: '2026-09-06T15:00:00Z' },
  { id: 'offline-round-14', round: 14, name: '西班牙大奖赛', venue: '马德里赛道', country: '西班牙', countryCode: 'ESP', timeZone: 'Europe/Madrid', dates: '09.11 — 09.13', endAt: '2026-09-13T15:00:00Z' },
  { id: 'offline-round-15', round: 15, name: '阿塞拜疆大奖赛', venue: '巴库街道赛道', country: '阿塞拜疆', countryCode: 'AZE', timeZone: 'Asia/Baku', dates: '09.24 — 09.26', endAt: '2026-09-26T13:00:00Z' },
  { id: 'offline-round-16', round: 16, name: '巴林大奖赛', venue: '雪邦国际赛道', country: '马来西亚', countryCode: 'MYS', timeZone: 'Asia/Kuala_Lumpur', dates: '10.02 — 10.04', endAt: '2026-10-04T09:00:00Z' },
  { id: 'offline-round-17', round: 17, name: '新加坡大奖赛', venue: '滨海湾街道赛道', country: '新加坡', countryCode: 'SGP', timeZone: 'Asia/Singapore', dates: '10.09 — 10.11', endAt: '2026-10-11T14:00:00Z' },
  { id: 'offline-round-18', round: 18, name: '美国大奖赛', venue: '美洲赛道', country: '美国', countryCode: 'USA', timeZone: 'America/Chicago', dates: '10.23 — 10.25', endAt: '2026-10-25T22:00:00Z' },
  { id: 'offline-round-19', round: 19, name: '墨西哥城大奖赛', venue: '罗德里格斯兄弟赛道', country: '墨西哥', countryCode: 'MEX', timeZone: 'America/Mexico_City', dates: '10.30 — 11.01', endAt: '2026-11-01T22:00:00Z' },
  { id: 'offline-round-20', round: 20, name: '圣保罗大奖赛', venue: '若泽·卡洛斯·帕塞赛道', country: '巴西', countryCode: 'BRA', timeZone: 'America/Sao_Paulo', dates: '11.06 — 11.08', endAt: '2026-11-08T19:00:00Z' },
  { id: 'offline-round-21', round: 21, name: '拉斯维加斯大奖赛', venue: '拉斯维加斯街道赛道', country: '美国', countryCode: 'USA', timeZone: 'America/Los_Angeles', dates: '11.19 — 11.21', endAt: '2026-11-22T06:00:00Z' },
  { id: 'offline-round-22', round: 22, name: '卡塔尔大奖赛', venue: '卢赛尔国际赛道', country: '卡塔尔', countryCode: 'QAT', timeZone: 'Asia/Qatar', dates: '11.27 — 11.29', endAt: '2026-11-29T18:00:00Z' },
  { id: 'offline-round-23', round: 23, name: '阿布扎比大奖赛', venue: '亚斯码头赛道', country: '阿联酋', countryCode: 'UAE', timeZone: 'Asia/Dubai', dates: '12.04 — 12.06', endAt: '2026-12-06T15:00:00Z' },
] satisfies Array<Omit<Race, 'finished' | 'sessions' | 'results'> & { endAt: string }>).map(({ endAt, ...race }) => ({
  ...race,
  finished: Date.parse(endAt) < Date.now(),
  sessions: [],
  results: [],
}));

const raceFavoriteId = (raceId: string) => `race:${raceId}`;

const countryFlags: Record<string, string> = {
  AUS: 'AU', AU: 'AU', CHN: 'CN', CN: 'CN', JPN: 'JP', JP: 'JP',
  USA: 'US', US: 'US', CAN: 'CA', CA: 'CA', MON: 'MC', MCO: 'MC', MC: 'MC',
  ESP: 'ES', ES: 'ES', AUT: 'AT', AT: 'AT', GBR: 'GB', GB: 'GB', BEL: 'BE', BE: 'BE',
  HUN: 'HU', HU: 'HU', NED: 'NL', NL: 'NL', ITA: 'IT', IT: 'IT', AZE: 'AZ', AZ: 'AZ',
  BHR: 'BH', BRN: 'BH', BH: 'BH', SGP: 'SG', SG: 'SG', MYS: 'MY', MY: 'MY',
  MEX: 'MX', MX: 'MX', BRA: 'BR', BR: 'BR', QAT: 'QA', QA: 'QA',
  ARE: 'AE', UAE: 'AE', AE: 'AE', SAU: 'SA', KSA: 'SA', SA: 'SA',
};
const countryFlagsByName: Record<string, string> = {
  澳大利亚: 'AU', 中国: 'CN', 日本: 'JP', 美国: 'US', 加拿大: 'CA', 摩纳哥: 'MC', 西班牙: 'ES',
  奥地利: 'AT', 英国: 'GB', 比利时: 'BE', 匈牙利: 'HU', 荷兰: 'NL', 意大利: 'IT', 阿塞拜疆: 'AZ',
  巴林: 'BH', 新加坡: 'SG', 马来西亚: 'MY', 墨西哥: 'MX', 巴西: 'BR', 卡塔尔: 'QA', 阿联酋: 'AE', 阿布扎比: 'AE', 沙特阿拉伯: 'SA',
};
const countryFlagCode = (race: Race) => countryFlags[race.countryCode.toUpperCase()] ?? countryFlagsByName[race.country] ?? '';

const flagStarPoints = (cx: number, cy: number, radius: number, count = 5, rotation = -Math.PI / 2, innerRadius = radius * 0.42) =>
  Array.from({ length: count * 2 }, (_, index) => {
    const angle = rotation + index * Math.PI / count;
    const length = index % 2 ? innerRadius : radius;
    return `${cx + Math.cos(angle) * length},${cy + Math.sin(angle) * length}`;
  }).join(' ');

function flagArt(code: string): ReactNode {
  switch (code) {
    case 'AU': return <><Rect width="36" height="24" fill="#00008B" /><Rect width="17" height="12" fill="#00008B" /><Path d="M0 0 17 12M17 0 0 12" stroke="#fff" strokeWidth="3.2" /><Path d="M0 0 17 12M17 0 0 12" stroke="#C8102E" strokeWidth="1.3" /><Path d="M8.5 0v12M0 6h17" stroke="#fff" strokeWidth="4" /><Path d="M8.5 0v12M0 6h17" stroke="#C8102E" strokeWidth="2" /><Polygon points={flagStarPoints(11, 18, 2.6, 7)} fill="#fff" /><Polygon points={flagStarPoints(26, 5, 1.5)} fill="#fff" /><Polygon points={flagStarPoints(31, 11, 1.5)} fill="#fff" /><Polygon points={flagStarPoints(28, 18, 1.5)} fill="#fff" /><Polygon points={flagStarPoints(22, 16, 1.35)} fill="#fff" /><Polygon points={flagStarPoints(25, 12, 1)} fill="#fff" /></>;
    case 'CN': return <><Rect width="36" height="24" fill="#DE2910" /><Polygon points={flagStarPoints(7, 6, 3.2)} fill="#FFDE00" /><Polygon points={flagStarPoints(13, 3.4, 1.15, 5, 2.75)} fill="#FFDE00" /><Polygon points={flagStarPoints(15.4, 6.2, 1.15, 5, 3.09)} fill="#FFDE00" /><Polygon points={flagStarPoints(15.2, 9.2, 1.15, 5, -2.76)} fill="#FFDE00" /><Polygon points={flagStarPoints(12.8, 11.8, 1.15, 5, -2.32)} fill="#FFDE00" /></>;
    case 'JP': return <><Rect width="36" height="24" fill="#fff" /><Circle cx="18" cy="12" r="6.5" fill="#BC002D" /></>;
    case 'US': return <><Rect width="36" height="24" fill="#fff" />{Array.from({ length: 13 }, (_, stripe) => <Rect key={stripe} y={stripe * 24 / 13} width="36" height={24 / 13} fill={stripe % 2 ? '#fff' : '#B22234'} />)}<Rect width="17" height="13" fill="#3C3B6E" />{Array.from({ length: 9 }, (_, row) => Array.from({ length: row % 2 ? 5 : 6 }, (_, column) => <Polygon key={`${row}-${column}`} points={flagStarPoints(1.4 + column * 2.75 + (row % 2 ? 1.35 : 0), 0.8 + row * 1.45, 0.53)} fill="#fff" />))}</>;
    case 'CA': return <><Rect width="9" height="24" fill="#D80621" /><Rect x="9" width="18" height="24" fill="#fff" /><Rect x="27" width="9" height="24" fill="#D80621" /><Path d="M18 3.1 20.1 8l3.4-2.1-.8 4.7 4-.1-2.4 3.8 4.1 1.8-5.8 2.1.7 3.1h-6.6l.7-3.1-5.8-2.1 4.1-1.8-2.4-3.8 4 .1-.8-4.7L18 8z" fill="#D80621" /><Path d="M18 18v4" stroke="#D80621" strokeWidth="1.1" /></>;
    case 'MC': return <><Rect width="36" height="12" fill="#CE1126" /><Rect y="12" width="36" height="12" fill="#fff" /></>;
    case 'ES': return <><Rect width="36" height="6" fill="#AA151B" /><Rect y="6" width="36" height="12" fill="#F1BF00" /><Rect y="18" width="36" height="6" fill="#AA151B" /><Path d="M10 8h3.5v6.7L11.8 16 10 14.7z" fill="#AA151B" /><Path d="M10.5 8h2.5M10.5 10h2.5M10.5 12h2.5" stroke="#F1BF00" strokeWidth=".55" /><Path d="M10.2 7.5h3.1l-.6-1.3h-1.9z" fill="#F1BF00" /></>;
    case 'AT': return <><Rect width="36" height="8" fill="#ED2939" /><Rect y="8" width="36" height="8" fill="#fff" /><Rect y="16" width="36" height="8" fill="#ED2939" /></>;
    case 'GB': return <><Rect width="36" height="24" fill="#012169" /><Path d="M0 0 36 24M36 0 0 24" stroke="#fff" strokeWidth="6" /><Path d="M0 0 36 24M36 0 0 24" stroke="#C8102E" strokeWidth="2.4" /><Path d="M18 0v24M0 12h36" stroke="#fff" strokeWidth="8" /><Path d="M18 0v24M0 12h36" stroke="#C8102E" strokeWidth="4.5" /></>;
    case 'BE': return <><Rect width="12" height="24" fill="#111" /><Rect x="12" width="12" height="24" fill="#FAE042" /><Rect x="24" width="12" height="24" fill="#ED2939" /></>;
    case 'HU': return <><Rect width="36" height="8" fill="#CE2939" /><Rect y="8" width="36" height="8" fill="#fff" /><Rect y="16" width="36" height="8" fill="#477050" /></>;
    case 'NL': return <><Rect width="36" height="8" fill="#AE1C28" /><Rect y="8" width="36" height="8" fill="#fff" /><Rect y="16" width="36" height="8" fill="#21468B" /></>;
    case 'IT': return <><Rect width="12" height="24" fill="#009246" /><Rect x="12" width="12" height="24" fill="#fff" /><Rect x="24" width="12" height="24" fill="#CE2B37" /></>;
    case 'AZ': return <><Rect width="36" height="8" fill="#00B5E2" /><Rect y="8" width="36" height="8" fill="#EF3340" /><Rect y="16" width="36" height="8" fill="#509E2F" /><Circle cx="17" cy="12" r="3.1" fill="#fff" /><Circle cx="18.4" cy="11" r="2.7" fill="#EF3340" /><Polygon points={flagStarPoints(23.3, 12, 2.5, 8)} fill="#fff" /></>;
    case 'BH': return <><Rect width="36" height="24" fill="#CE1126" /><Polygon points="0,0 12,0 9.6,2.4 12,4.8 9.6,7.2 12,9.6 9.6,12 12,14.4 9.6,16.8 12,19.2 9.6,21.6 12,24 0,24" fill="#fff" /></>;
    case 'QA': return <><Rect width="36" height="24" fill="#8A1538" /><Polygon points="0,0 14,0 11.7,1.33 14,2.67 11.7,4 14,5.33 11.7,6.67 14,8 11.7,9.33 14,10.67 11.7,12 14,13.33 11.7,14.67 14,16 11.7,17.33 14,18.67 11.7,20 14,21.33 11.7,22.67 14,24 0,24" fill="#fff" /></>;
    case 'SG': return <><Rect width="36" height="12" fill="#EF3340" /><Rect y="12" width="36" height="12" fill="#fff" /><Circle cx="10" cy="6" r="4" fill="#fff" /><Circle cx="11.7" cy="5.1" r="3.45" fill="#EF3340" />{[[18,3.7],[20.2,5.3],[19.4,7.9],[16.6,7.9],[15.8,5.3]].map(([x,y], i) => <Polygon key={i} points={flagStarPoints(x, y, 0.9)} fill="#fff" />)}</>;
    case 'MY': return <>{Array.from({ length: 14 }, (_, stripe) => <Rect key={stripe} y={stripe * 24 / 14} width="36" height={24 / 14} fill={stripe % 2 ? '#fff' : '#CC0001'} />)}<Rect width="17" height="13" fill="#010066" /><Circle cx="7" cy="6.1" r="4.5" fill="#FFCC00" /><Circle cx="8.7" cy="5.3" r="3.7" fill="#010066" /><Polygon points={flagStarPoints(12.4, 6.2, 4, 14, -Math.PI / 2, 3.15)} fill="#FFCC00" /></>;
    case 'MX': return <><Rect width="12" height="24" fill="#006847" /><Rect x="12" width="12" height="24" fill="#fff" /><Rect x="24" width="12" height="24" fill="#CE1126" /><Path d="M17.2 14.8c-.8-2.2.5-4.3 1.6-5.2l1.2 2.1 1.8-.7-.7 2.1 1.5 1.5-2 .3-1.2 2.2-1.7-1.6z" fill="#8A6D3B" /><Path d="M16.2 17h5.9m-4.3 1h3" stroke="#2E7D32" strokeWidth=".7" /><Circle cx="18" cy="14" r="4.2" fill="none" stroke="#8A6D3B" strokeWidth=".4" /></>;
    case 'BR': return <><Rect width="36" height="24" fill="#009739" /><Polygon points="18,2.5 33,12 18,21.5 3,12" fill="#FFDF00" /><Circle cx="18" cy="12" r="6" fill="#002776" /><Path d="M12.2 10.6q5.7-2.1 11.6.3" stroke="#fff" strokeWidth=".7" fill="none" />{[[15,10],[18,8.5],[21,10],[16,13],[20,14],[18,16]].map(([x,y],i)=><Circle key={i} cx={x} cy={y} r=".35" fill="#fff" />)}</>;
    case 'AE': return <><Rect width="10" height="24" fill="#FF0000" /><Rect x="10" width="26" height="8" fill="#00732F" /><Rect x="10" y="8" width="26" height="8" fill="#fff" /><Rect x="10" y="16" width="26" height="8" fill="#000" /></>;
    case 'SA': return <><Rect width="36" height="24" fill="#006C35" /><Path d="M5 10.5c2-1.2 3.3.9 5.1-.2 1.7-1.1 2.4.9 4 .1 1.8-1 2.3.9 4.1 0 1.7-.8 2.3.8 4 .2 1.6-.5 2 .7 4 .4" stroke="#fff" strokeWidth=".7" strokeLinecap="round" fill="none" /><Path d="M7 12c2-1 3.4.8 5-.1s2.6.9 4.2 0 2.4.8 4.1.1 2.8.7 4.3.3" stroke="#fff" strokeWidth=".55" strokeLinecap="round" fill="none" /><Path d="M9 16h19M10 17.2l-1.2.8 1.2.8h18" stroke="#fff" strokeWidth="1" strokeLinecap="round" fill="none" /></>;
    default: return null;
  }
}

function CountryFlag({ race }: { race: Race }) {
  const code = countryFlagCode(race);
  return <View accessibilityLabel={`比赛地：${race.country}`} style={styles.countryMark}>{code ? <Svg width="36" height="24" viewBox="0 0 36 24">{flagArt(code)}<Rect width="36" height="24" fill="none" stroke="#000" strokeOpacity=".08" /></Svg> : null}</View>;
}

const circuitSlugs: Record<string, string> = {
  '阿尔伯特公园赛道': 'melbourne', Melbourne: 'melbourne', 'Albert Park Grand Prix Circuit': 'melbourne',
  '上海国际赛车场': 'shanghai', Shanghai: 'shanghai', 'Shanghai International Circuit': 'shanghai',
  '铃鹿国际赛道': 'suzuka', Suzuka: 'suzuka', 'Suzuka International Racing Course': 'suzuka',
  '迈阿密国际赛车场': 'miami', Miami: 'miami', 'Miami International Autodrome': 'miami',
  '吉尔·维伦纽夫赛道': 'gillesvilleneuve', Montreal: 'gillesvilleneuve', 'Circuit Gilles-Villeneuve': 'gillesvilleneuve',
  '摩纳哥赛道': 'monaco', 'Monte Carlo': 'monaco', 'Circuit de Monaco': 'monaco',
  '巴塞罗那-加泰罗尼亚赛道': 'barcelonacatalunya', Catalunya: 'barcelonacatalunya', 'Circuit de Barcelona-Catalunya': 'barcelonacatalunya',
  '红牛赛道': 'redbullring', Spielberg: 'redbullring', 'Red Bull Ring': 'redbullring',
  '银石赛道': 'silverstone', Silverstone: 'silverstone', 'Silverstone Circuit': 'silverstone',
  '斯帕-弗朗科尔尚赛道': 'spafrancorchamps', 'Spa-Francorchamps': 'spafrancorchamps', 'Circuit de Spa-Francorchamps': 'spafrancorchamps',
  '匈牙利赛道': 'hungaroring', Hungaroring: 'hungaroring',
  '赞德沃特赛道': 'zandvoort', Zandvoort: 'zandvoort', 'Circuit Zandvoort': 'zandvoort',
  '蒙扎国家赛车场': 'monza', '蒙扎赛道': 'monza', Monza: 'monza', 'Autodromo Nazionale Monza': 'monza',
  '马德里赛道': 'madring', Madring: 'madring',
  '巴库街道赛道': 'baku', '巴库城市赛道': 'baku', Baku: 'baku', 'Baku City Circuit': 'baku',
  '吉隆坡赛道': 'kualalumpur', '雪邦国际赛道': 'kualalumpur', 'Kuala Lumpur': 'kualalumpur',
  '滨海湾街道赛道': 'singapore', Singapore: 'singapore', 'Marina Bay Street Circuit': 'singapore',
  '美洲赛道': 'austin', Austin: 'austin', 'Circuit of The Americas': 'austin',
  '罗德里格斯兄弟赛道': 'mexicocity', 'Mexico City': 'mexicocity', 'Autódromo Hermanos Rodríguez': 'mexicocity',
  '若泽·卡洛斯·帕塞赛道': 'interlagos', Interlagos: 'interlagos', 'Autódromo José Carlos Pace': 'interlagos',
  '拉斯维加斯街道赛道': 'lasvegas', 'Las Vegas': 'lasvegas', 'Las Vegas Strip Street Circuit': 'lasvegas',
  '卢赛尔国际赛道': 'lusail', Lusail: 'lusail', 'Lusail International Circuit': 'lusail',
  '亚斯码头赛道': 'yasmarina', 'Yas Marina Circuit': 'yasmarina',
  '巴林国际赛道': 'bahrain', 'Bahrain International Circuit': 'bahrain', '吉达滨海赛道': 'jeddah', 'Jeddah Corniche Circuit': 'jeddah',
};
const circuitFacts: Record<string, CircuitProfile> = Object.fromEntries(circuitProfiles.map((profile) => [profile.id, profile]));
const circuitImageUrl = (race: Race) => {
  const slug = circuitSlugs[race.venue];
  return slug ? `https://media.formula1.com/image/upload/c_fit%2Ch_704/q_auto/v1740000001/common/f1/2026/track/2026track${slug}detailed.webp` : null;
};
const circuitSlug = (race: Race) => circuitSlugs[race.venue];

type OpenF1Meeting = {
  meeting_key: number;
  meeting_name: string;
  country_name: string;
  country_code: string;
  circuit_short_name: string;
  location: string;
  date_start: string;
  gmt_offset: string;
};
type OpenF1Session = {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  gmt_offset: string;
  is_cancelled: boolean;
};
type OpenF1Driver = {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  country_code: string;
  team_name: string;
  team_colour: string;
};
type OpenF1Standing = { driver_number?: number; team_name?: string; points_current: number; position_current: number };
type OpenF1SessionResult = {
  driver_number: number;
  position: number;
  duration: number | (number | null)[] | null;
  gap_to_leader: number | string | (number | string | null)[] | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
};
type SeasonData = { races: Race[]; drivers: Driver[]; teams: Team[] };
type SeasonCache = { version: 1 | 2; savedAt: string; data: SeasonData; resultsBySession?: ResultsBySession };
type SeasonContextValue = SeasonData & {
  resultsBySession: ResultsBySession;
  status: 'loading' | 'live' | 'offline' | 'restricted';
  dataSource: 'openf1' | 'cache' | 'calendar';
  syncedAt: string | null;
  hasSeasonData: boolean;
  reload: () => void;
  saveSessionResults: (sessionKey: string, rows: Result[]) => void;
  loadSessionResults: (sessionKey: string, sessionName: string, refresh?: boolean) => Promise<Result[]>;
};
const SeasonContext = createContext<SeasonContextValue | null>(null);
const useSeason = () => useContext(SeasonContext)!;
const OPENF1_CACHE_KEY = 'f1-openf1-season-2026-v1';

function isSeasonCache(value: unknown): value is SeasonCache {
  if (!value || typeof value !== 'object') return false;
  const cache = value as Partial<SeasonCache>;
  const results = cache.resultsBySession;
  const validResults = results === undefined || Boolean(results && typeof results === 'object' && !Array.isArray(results)
    && Object.values(results).every((rows) => Array.isArray(rows) && rows.every((row) => row && typeof row === 'object'
      && typeof row.driverId === 'string' && typeof row.position === 'number' && typeof row.gap === 'string')));
  return (cache.version === 1 || cache.version === 2)
    && typeof cache.savedAt === 'string'
    && Boolean(cache.data)
    && Array.isArray(cache.data?.races)
    && Array.isArray(cache.data?.drivers)
    && Array.isArray(cache.data?.teams)
    && validResults;
}

function formatSyncTime(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
}

const sessionLabels: Record<string, string> = {
  'Practice 1': '一练', 'Practice 2': '二练', 'Practice 3': '三练',
  'Qualifying': '排位赛', 'Sprint Qualifying': '冲刺排位', 'Sprint Shootout': '冲刺排位',
  'Sprint': '冲刺赛', 'Race': '正赛',
};
const raceNames: Record<string, string> = {
  'Australian Grand Prix': '澳大利亚大奖赛', 'Chinese Grand Prix': '中国大奖赛', 'Japanese Grand Prix': '日本大奖赛',
  'Bahrain Grand Prix': '巴林大奖赛', 'Saudi Arabian Grand Prix': '沙特阿拉伯大奖赛', 'Miami Grand Prix': '迈阿密大奖赛',
  'Canadian Grand Prix': '加拿大大奖赛', 'Monaco Grand Prix': '摩纳哥大奖赛', 'Spanish Grand Prix': '西班牙大奖赛',
  'Barcelona Grand Prix': '巴塞罗那大奖赛',
  'Austrian Grand Prix': '奥地利大奖赛', 'British Grand Prix': '英国大奖赛', 'Belgian Grand Prix': '比利时大奖赛',
  'Hungarian Grand Prix': '匈牙利大奖赛', 'Dutch Grand Prix': '荷兰大奖赛', 'Italian Grand Prix': '意大利大奖赛',
  'Azerbaijan Grand Prix': '阿塞拜疆大奖赛', 'Singapore Grand Prix': '新加坡大奖赛', 'United States Grand Prix': '美国大奖赛',
  'Mexico City Grand Prix': '墨西哥城大奖赛', 'São Paulo Grand Prix': '圣保罗大奖赛', 'Las Vegas Grand Prix': '拉斯维加斯大奖赛',
  'Qatar Grand Prix': '卡塔尔大奖赛', 'Abu Dhabi Grand Prix': '阿布扎比大奖赛',
};
const trackNames: Record<string, string> = {
  Melbourne: '阿尔伯特公园赛道', Shanghai: '上海国际赛车场', Suzuka: '铃鹿国际赛道', Miami: '迈阿密国际赛车场',
  Montreal: '吉尔·维伦纽夫赛道', 'Monte Carlo': '摩纳哥赛道', Catalunya: '巴塞罗那-加泰罗尼亚赛道',
  Spielberg: '红牛赛道', Silverstone: '银石赛道', 'Spa-Francorchamps': '斯帕-弗朗科尔尚赛道',
  Zandvoort: '赞德沃特赛道', Monza: '蒙扎国家赛车场', Madring: '马德里赛道', Baku: '巴库街道赛道',
  'Kuala Lumpur': '雪邦国际赛道', Singapore: '滨海湾街道赛道', Austin: '美洲赛道', 'Mexico City': '罗德里格斯兄弟赛道',
  Interlagos: '若泽·卡洛斯·帕塞赛道', 'Las Vegas': '拉斯维加斯街道赛道', Lusail: '卢赛尔国际赛道',
  'Albert Park Grand Prix Circuit': '阿尔伯特公园赛道', 'Shanghai International Circuit': '上海国际赛车场',
  'Suzuka International Racing Course': '铃鹿国际赛道', 'Bahrain International Circuit': '巴林国际赛道',
  'Jeddah Corniche Circuit': '吉达滨海赛道', 'Miami International Autodrome': '迈阿密国际赛车场',
  'Circuit Gilles-Villeneuve': '吉尔·维伦纽夫赛道', 'Circuit de Monaco': '摩纳哥赛道',
  'Circuit de Barcelona-Catalunya': '巴塞罗那-加泰罗尼亚赛道', 'Red Bull Ring': '红牛赛道',
  'Silverstone Circuit': '银石赛道', 'Circuit de Spa-Francorchamps': '斯帕-弗朗科尔尚赛道',
  'Hungaroring': '匈牙利赛道', 'Circuit Zandvoort': '赞德沃特赛道', 'Autodromo Nazionale Monza': '蒙扎国家赛车场',
  'Baku City Circuit': '巴库城市赛道', 'Marina Bay Street Circuit': '滨海湾街道赛道',
  'Circuit of The Americas': '美洲赛道', 'Autódromo Hermanos Rodríguez': '罗德里格斯兄弟赛道',
  'Autódromo José Carlos Pace': '若泽·卡洛斯·帕塞赛道', 'Las Vegas Strip Street Circuit': '拉斯维加斯街道赛道',
  'Lusail International Circuit': '卢赛尔国际赛道', 'Yas Marina Circuit': '亚斯码头赛道',
};
const driverNames: Record<string, string> = {
  NOR: '兰多·诺里斯', VER: '马克斯·维斯塔潘', LEC: '夏尔·勒克莱尔', HAM: '刘易斯·汉密尔顿',
  RUS: '乔治·拉塞尔', PIA: '奥斯卡·皮亚斯特里', ALB: '亚历山大·阿尔本', SAI: '卡洛斯·塞恩斯',
  ALO: '费尔南多·阿隆索', STR: '兰斯·斯托尔', GAS: '皮埃尔·加斯利', OCO: '埃斯特班·奥康',
  TSU: '角田裕毅', LAW: '利亚姆·劳森', ANT: '安德烈亚·基米·安东内利', BEA: '奥利弗·比尔曼',
  HAD: '伊萨克·哈贾尔', BOR: '加布里埃尔·博托莱托', HUL: '尼科·霍肯伯格', LIN: '阿维德·林德布拉德',
  COL: '佛朗哥·科拉平托', PER: '塞尔吉奥·佩雷斯', BOT: '瓦尔特里·博塔斯',
};
const knownDriverIds: Record<string, string> = { NOR: 'norris', VER: 'verstappen', LEC: 'leclerc', HAM: 'hamilton', RUS: 'russell', PIA: 'piastri', ALB: 'albon', HAD: 'driver-6' };
const offlineLibraryDrivers: Driver[] = driverProfiles.map((profile) => ({
  id: knownDriverIds[profile.code] ?? `driver-${profile.number}`,
  name: profile.name,
  code: profile.code,
  country: profile.country,
  teamId: profile.teamId,
  number: profile.number,
  points: profile.points,
  wins: profile.season.wins,
  seasonStatus: profile.seasonStatus,
}));
const offlineLibraryTeams: Team[] = teamProfiles.map(({ id, name, short, color, points, base }) => ({ id, name, short, color, points, base }));

function withKnown2026Drivers(data: SeasonData): SeasonData {
  const drivers: Driver[] = driverProfiles.map((profile) => {
    const current = data.drivers.find((driver) => driver.code === profile.code || Number(driver.number) === profile.number);
    return {
      ...current,
      id: current?.id ?? knownDriverIds[profile.code] ?? `driver-${profile.number}`,
      name: profile.name,
      code: profile.code,
      country: profile.country,
      teamId: profile.teamId,
      number: profile.number,
      points: current?.points ?? profile.points,
      wins: profile.season.wins,
      seasonStatus: profile.seasonStatus,
    } satisfies Driver;
  });
  const knownCodes = new Set(driverProfiles.map((profile) => profile.code));
  drivers.push(...data.drivers.filter((driver) => !knownCodes.has(driver.code)));
  const teams: Team[] = teamProfiles.map((profile) => {
    const current = data.teams.find((team) => team.id === profile.id);
    return {
      id: profile.id,
      name: current?.name ?? profile.name,
      short: profile.short,
      color: current?.color ?? profile.color,
      points: current?.points ?? profile.points,
      base: profile.base,
    } satisfies Team;
  });
  const knownTeamIds = new Set(teamProfiles.map((profile) => profile.id));
  teams.push(...data.teams.filter((team) => !knownTeamIds.has(team.id)));
  return { ...data, drivers, teams };
}
const teamNames: Record<string, string> = {
  McLaren: '迈凯伦', Ferrari: '法拉利', 'Red Bull Racing': '红牛', Mercedes: '梅赛德斯',
  'Aston Martin': '阿斯顿·马丁', Williams: '威廉姆斯', Alpine: '阿尔派', Haas: '哈斯',
  'RB': 'RB', 'Racing Bulls': 'RB车队', 'Haas F1 Team': '哈斯', 'Kick Sauber': '索伯', Audi: '奥迪', Cadillac: '凯迪拉克',
};
const countryNames: Record<string, string> = {
  Australia: '澳大利亚', China: '中国', Japan: '日本', Bahrain: '巴林', 'Saudi Arabia': '沙特阿拉伯',
  'United States': '美国', Canada: '加拿大', Monaco: '摩纳哥', Spain: '西班牙', Austria: '奥地利',
  'United Kingdom': '英国', Belgium: '比利时', Hungary: '匈牙利', Netherlands: '荷兰', Italy: '意大利',
  Azerbaijan: '阿塞拜疆', Singapore: '新加坡', Mexico: '墨西哥', Brazil: '巴西', Qatar: '卡塔尔',
  'United Arab Emirates': '阿联酋', 'São Paulo': '圣保罗', 'Abu Dhabi': '阿布扎比',
};
const driverCountryNames: Record<string, string> = {
  GBR: '英国', NED: '荷兰', MON: '摩纳哥', AUS: '澳大利亚', THA: '泰国', ESP: '西班牙',
  FRA: '法国', JPN: '日本', CAN: '加拿大', ITA: '意大利', GER: '德国', FIN: '芬兰',
  MEX: '墨西哥', ARG: '阿根廷', BRA: '巴西', USA: '美国', CHN: '中国', NZL: '新西兰',
};

const OPENF1_TIMEOUT_MS = 10_000;

const openF1 = async <T,>(endpoint: string, params: Record<string, string>) => {
  const query = new URLSearchParams(params).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENF1_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.openf1.org/v1/${endpoint}?${query}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`OpenF1 ${endpoint}: ${response.status} ${await response.text()}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
};

const offsetMinutes = (offset = '+00:00') => {
  const match = /^([+-])(\d{2}):(\d{2})/.exec(offset);
  if (!match) return 0;
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
};
const localDate = (value: string, offset: string) => new Date(new Date(value).getTime() + offsetMinutes(offset) * 60000);
const dayLabel = (value: string, offset: string) => {
  const date = localDate(value, offset);
  return `${new Intl.DateTimeFormat('zh-CN', { weekday: 'short', timeZone: 'UTC' }).format(date)} ${String(date.getUTCMonth() + 1).padStart(2, '0')}.${String(date.getUTCDate()).padStart(2, '0')}`;
};
const dateRange = (sessions: OpenF1Session[], offset: string) => {
  if (!sessions.length) return '';
  const first = localDate(sessions[0].date_start, offset);
  const last = localDate(sessions[sessions.length - 1].date_start, offset);
  const format = (date: Date) => `${String(date.getUTCMonth() + 1).padStart(2, '0')}.${String(date.getUTCDate()).padStart(2, '0')}`;
  return `${format(first)} — ${format(last)}`;
};

const teamId = (name: string) => ({ 'Red Bull Racing': 'redbull', 'Aston Martin': 'aston', 'Kick Sauber': 'sauber' } as Record<string, string>)[name] ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function loadOpenF1Season(): Promise<SeasonData> {
  const [meetings, sessions] = await Promise.all([
    openF1<OpenF1Meeting[]>('meetings', { year: '2026' }),
    openF1<OpenF1Session[]>('sessions', { year: '2026' }),
  ]);
  const races: Race[] = meetings
    .map((meeting): Race | null => {
      const eventSessions = sessions.filter((session) => session.meeting_key === meeting.meeting_key && !session.is_cancelled).sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));
      if (!eventSessions.some((session) => session.session_name === 'Race')) return null;
      const offset = eventSessions.find((session) => session.gmt_offset)?.gmt_offset ?? '+00:00';
      const raceSession = eventSessions.find((session) => session.session_name === 'Race');
      const finished = Boolean(raceSession && Date.parse(raceSession.date_end) < Date.now());
      const inMalaysia = meeting.meeting_name === 'Bahrain Grand Prix' && meeting.location === 'Kuala Lumpur';
      return {
        id: `meeting-${meeting.meeting_key}`,
        round: 0,
        name: raceNames[meeting.meeting_name] ?? meeting.meeting_name,
        venue: trackNames[meeting.circuit_short_name] ?? meeting.circuit_short_name,
        country: inMalaysia ? '马来西亚' : countryNames[meeting.country_name] ?? meeting.country_name,
        countryCode: inMalaysia ? 'MYS' : meeting.country_code,
        timeZone: 'UTC',
        dates: dateRange(eventSessions, offset),
        finished,
        sessions: eventSessions.map((session) => ({ id: String(session.session_key), name: sessionLabels[session.session_name] ?? session.session_name, day: dayLabel(session.date_start, offset), at: session.date_start, offset: session.gmt_offset || offset, ended: Date.parse(session.date_end) < Date.now() })),
        results: [],
      };
    })
    .filter((race): race is Race => race !== null)
    .sort((a, b) => Date.parse(a.sessions[0]?.at ?? '') - Date.parse(b.sessions[0]?.at ?? ''))
    .map((race, index) => ({ ...race, id: `round-${index + 1}`, round: index + 1 }));
  if (races.length === 0) throw new Error('OpenF1 returned no 2026 race sessions');

  const latestRaceSession = races.flatMap((race) => race.sessions).filter((session) => session.name === '正赛' && Date.parse(session.at) < Date.now()).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  if (!latestRaceSession) return { races, drivers: [], teams: [] };

  const [roster, driverRows, teamRows] = await Promise.all([
    openF1<OpenF1Driver[]>('drivers', { session_key: latestRaceSession.id! }).catch(() => []),
    openF1<OpenF1Standing[]>('championship_drivers', { session_key: latestRaceSession.id! }).catch(() => []),
    openF1<OpenF1Standing[]>('championship_teams', { session_key: latestRaceSession.id! }).catch(() => []),
  ]);
  const driverPoints = new Map(driverRows.map((row) => [row.driver_number, row.points_current]));
  const teamPoints = new Map(teamRows.map((row) => [row.team_name ?? '', row.points_current]));
  const colorByTeam = new Map(roster.map((driver) => [driver.team_name, `#${driver.team_colour.replace(/^#/, '')}`]));
  const teamList: Team[] = [...new Set(roster.map((driver) => driver.team_name))].map((name) => {
    const profile = teamProfiles.find((item) => item.id === teamId(name));
    return {
      id: teamId(name), name: teamNames[name] ?? profile?.name ?? name, short: profile?.short ?? name.slice(0, 3).toUpperCase(),
      color: colorByTeam.get(name) ?? profile?.color ?? C.teal, points: teamPoints.get(name) ?? null, base: profile?.base ?? '资料待核实',
    };
  }).sort((a, b) => (b.points ?? -1) - (a.points ?? -1));
  const driverList: Driver[] = roster.map((driver) => ({
    id: knownDriverIds[driver.name_acronym] ?? `driver-${driver.driver_number}`,
    name: driverNames[driver.name_acronym] ?? driver.full_name, code: driver.name_acronym,
    country: driverCountryNames[driver.country_code] ?? driver.country_code, teamId: teamId(driver.team_name), number: driver.driver_number,
    points: driverPoints.get(driver.driver_number) ?? null,
  })).sort((a, b) => (b.points ?? -1) - (a.points ?? -1));
  return { races, drivers: driverList, teams: teamList };
}

function lastFiniteNumber(value: unknown): number | null {
  const values = Array.isArray(value) ? value : [value];
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const candidate = values[index];
    const number = typeof candidate === 'number' ? candidate : typeof candidate === 'string' && candidate.trim() ? Number(candidate) : NaN;
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function formatOpenF1Gap(value: OpenF1SessionResult['gap_to_leader'], leaderLabel: string): string {
  const gap = lastFiniteNumber(value);
  if (gap !== null) return gap === 0 ? leaderLabel || '+0.000s' : `${gap < 0 ? '−' : '+'}${Math.abs(gap).toFixed(3)}s`;
  if (typeof value === 'string') return value;
  return '—';
}

async function loadOpenF1Results(sessionKey: string, driverList: Driver[], sessionName: string): Promise<Result[]> {
  const rows = await openF1<OpenF1SessionResult[]>('session_result', { session_key: sessionKey });
  const isQualifying = sessionName.includes('排位');
  const poleRow = rows.find((row) => Number(row.position) === 1);
  const poleTime = isQualifying ? lastFiniteNumber(poleRow?.duration) : null;
  return rows.map((row): Result => {
    const driver = driverList.find((item) => Number(item.number) === Number(row.driver_number));
    const status: Result['status'] = row.dsq ? 'dsq' : row.dns ? 'dns' : row.dnf ? 'dnf' : 'finished';
    const position = Number(row.position);
    const lapTime = isQualifying ? lastFiniteNumber(row.duration) : null;
    const gap = isQualifying
      ? position === 1 ? '杆位'
        : lapTime !== null && poleTime !== null ? formatOpenF1Gap(lapTime - poleTime, '')
          : formatOpenF1Gap(row.gap_to_leader, '')
      : formatOpenF1Gap(row.gap_to_leader, sessionName === '正赛' ? '冠军' : '最快');
    return {
      driverId: driver?.id ?? `driver-${row.driver_number}`, position: Number.isFinite(position) && position > 0 ? position : 99,
      gap, status, points: null,
    };
  }).sort((a, b) => a.position - b.position);
}

async function readOpenF1ResultsCache(sessionKey: string): Promise<Result[] | null> {
  try {
    const value = await AsyncStorage.getItem(`f1-openf1-results-${sessionKey}-v1`);
    if (!value) return null;
    const cached: unknown = JSON.parse(value);
    if (!Array.isArray(cached) || !cached.every((row) => row && typeof row === 'object' && typeof row.driverId === 'string' && typeof row.position === 'number' && typeof row.gap === 'string')) return null;
    return cached as Result[];
  } catch {
    return null;
  }
}

const navItems: { id: Section; label: string; icon: string }[] = [
  { id: 'schedule', label: '赛程', icon: 'M4 6h16M7 3v6m10-6v6M4 10h16v10H4z' },
  { id: 'live', label: '实时', icon: 'M3 12h4l2.2-6 4.2 12 2.2-6H21' },
  { id: 'favorites', label: '收藏', icon: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z' },
  { id: 'standings', label: '排行榜', icon: 'M5 6h14M5 12h14M5 18h14M2.5 6h.1M2.5 12h.1M2.5 18h.1' },
  { id: 'library', label: '资料库', icon: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5' },
];

function TeamFor(id: string, teamList: Team[]) {
  return teamList.find((team) => team.id === id) ?? teamList[0]!;
}

function formatTime(value: string, timeZone?: string) {
  try {
    return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', ...(timeZone ? { timeZone } : {}) }).format(new Date(value));
  } catch {
    return value.slice(11, 16);
  }
}

function formatOffsetTime(value: string, offset?: string) {
  return new Date(new Date(value).getTime() + offsetMinutes(offset) * 60000).toISOString().slice(11, 16);
}

function Glyph({ path, color = C.ink, size = 20 }: { path: string; color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={path} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(NativePressable);

function Pressable({ style, onPressIn, onPressOut, disabled, ...props }: PressableProps) {
  const reduceMotion = useContext(MotionPreferenceContext);
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const animateScale = (toValue: number) => {
    scale.stopAnimation();
    if (reduceMotion || disabled) {
      scale.setValue(1);
      return;
    }
    Animated.timing(scale, { toValue, duration: toValue < 1 ? 90 : 120, easing: Easing.out(Easing.cubic), useNativeDriver }).start();
  };
  const base = typeof style === 'function' ? style({ pressed }) : style;
  const flattened = StyleSheet.flatten(base);
  const transform = flattened?.transform;
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => { setPressed(true); animateScale(0.98); onPressIn?.(event); }}
      onPressOut={(event) => { setPressed(false); animateScale(1); onPressOut?.(event); }}
      style={{ ...flattened, transform: [...(Array.isArray(transform) ? transform : []), { scale }] }}
    />
  );
}

function MotionPanel({ motionKey, children }: { motionKey: string; children: ReactNode }) {
  const reduceMotion = useContext(MotionPreferenceContext);
  const progress = useRef(new Animated.Value(1)).current;
  const previousKey = useRef(motionKey);
  useLayoutEffect(() => {
    if (previousKey.current === motionKey) return;
    previousKey.current = motionKey;
    progress.stopAnimation();
    progress.setValue(reduceMotion ? 0.62 : 0.45);
    const animation = Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 180 : 230, easing: Easing.out(Easing.cubic), useNativeDriver });
    animation.start();
    return () => animation.stop();
  }, [motionKey, progress, reduceMotion]);
  return <Animated.View style={{ opacity: progress }}>{children}</Animated.View>;
}

const F1_LIVE_TIMING_URL = 'https://www.formula1.com/en/timing/f1-live-lite?os=http';

function LiveTimingPage() {
  const openOfficialPage = () => {
    const openPage = Platform.OS === 'web'
      ? Linking.openURL(F1_LIVE_TIMING_URL)
      : WebBrowser.openBrowserAsync(F1_LIVE_TIMING_URL);
    void openPage.catch((error) => console.warn('F1 official page could not be opened:', error));
  };

  return (
    <ScrollView style={styles.livePage} contentContainerStyle={styles.liveContent} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="FORMULA 1 · LIVE TIMING" title="官方实时" right="2026" />
      <View style={styles.liveHero}>
        <View style={styles.liveHeroTop}>
          <Text style={styles.liveHeroKicker}>F1.COM / LIVE</Text>
          <View style={styles.liveOfficialTag}><View style={styles.liveOfficialDot} /><Text style={styles.liveOfficialTagText}>官方计时</Text></View>
        </View>
        <Text style={styles.liveHeroTitle}>赛道上的每一秒</Text>
        <Text style={styles.liveHeroCopy}>前往 F1 官方实时计时，查看比赛期间发布的现场数据。</Text>
        <Pressable accessibilityRole="button" onPress={openOfficialPage} style={styles.liveOpenButton}>
          <Text style={styles.liveOpenButtonText}>打开官方实时计时</Text>
          <Text style={styles.liveOpenArrow}>↗</Text>
        </Pressable>
        <Text style={styles.liveHeroFootnote}>官网将在浏览器中打开，登录状态由官网管理</Text>
      </View>

      <View style={styles.liveSectionHeading}>
        <View><Text style={styles.liveSectionTitle}>实时计时中心</Text><Text style={styles.liveSectionSubtitle}>FORMULA 1 · TIMING</Text></View>
        <Glyph path="M4 16.5 8.5 12l3 3L20 6.5M14.5 6.5H20v5.5" color={C.red} size={20} />
      </View>
      <View style={styles.liveFeatureCard}>
        <Pressable accessibilityRole="button" accessibilityLabel="实时车手排序" accessibilityHint="打开 F1 官方实时计时查看数据" onPress={openOfficialPage} style={({ pressed }) => [styles.liveFeatureRow, pressed && styles.liveFeatureRowPressed]}>
          <View style={styles.liveFeatureIcon}><Glyph path="M4 18V6m0 12h16M8 15v-4m4 4V7m4 8v-6m4 6V4" color={C.red} size={18} /></View>
          <View style={styles.liveFeatureCopy}><Text style={styles.liveFeatureTitle}>实时车手排序</Text><Text style={styles.liveFeatureDetail}>跟随比赛进程查看名次变化</Text></View>
          <Text style={styles.liveFeatureAction}>↗</Text>
        </Pressable>
        <View style={styles.liveFeatureDivider} />
        <Pressable accessibilityRole="button" accessibilityLabel="圈速与分段" accessibilityHint="打开 F1 官方实时计时查看数据" onPress={openOfficialPage} style={({ pressed }) => [styles.liveFeatureRow, pressed && styles.liveFeatureRowPressed]}>
          <View style={styles.liveFeatureIcon}><Glyph path="M4 7h16M4 12h10M4 17h7M18 10l2 2-2 2" color={C.teal} size={18} /></View>
          <View style={styles.liveFeatureCopy}><Text style={styles.liveFeatureTitle}>圈速与分段</Text><Text style={styles.liveFeatureDetail}>查看圈速、分段成绩与赛道进度</Text></View>
          <Text style={styles.liveFeatureAction}>↗</Text>
        </Pressable>
        <View style={styles.liveFeatureDivider} />
        <Pressable accessibilityRole="button" accessibilityLabel="现场信息" accessibilityHint="打开 F1 官方实时计时查看数据" onPress={openOfficialPage} style={({ pressed }) => [styles.liveFeatureRow, pressed && styles.liveFeatureRowPressed]}>
          <View style={styles.liveFeatureIcon}><Glyph path="M4 7h16v10H4zM8 11h.01M11 11h.01M14 11h.01M8 14h.01M11 14h.01" color="#4D6477" size={18} /></View>
          <View style={styles.liveFeatureCopy}><Text style={styles.liveFeatureTitle}>现场信息</Text><Text style={styles.liveFeatureDetail}>以 F1 官网当前提供的内容为准</Text></View>
          <Text style={styles.liveFeatureAction}>↗</Text>
        </Pressable>
      </View>
      <View style={styles.liveNotice}>
        <View style={styles.liveNoticeMark}><Text style={styles.liveNoticeMarkText}>i</Text></View>
        <Text style={styles.liveNoticeText}>实时内容由 F1 官网提供；赛事开放时间、网络连接及账号要求以官网显示为准。</Text>
      </View>
    </ScrollView>
  );
}

function TrackMap({ race, compact = false }: { race: Race; compact?: boolean }) {
  const imageUrl = circuitImageUrl(race);
  const reduceMotion = useContext(MotionPreferenceContext);
  const [imageState, setImageState] = useState<'loading' | 'ready' | 'error'>('loading');
  const imageOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setImageState('loading');
    imageOpacity.setValue(0);
  }, [imageOpacity, imageUrl]);
  const showImage = () => {
    setImageState('ready');
    imageOpacity.stopAnimation();
    Animated.timing(imageOpacity, { toValue: 1, duration: reduceMotion ? 140 : 200, easing: Easing.out(Easing.cubic), useNativeDriver }).start();
  };
  return (
    <View style={[styles.trackMap, compact && styles.trackMapCompact]}>
      <View style={styles.trackMapLabel}><Text style={styles.trackMapKicker}>F1 2026 · OFFICIAL</Text><Text style={styles.trackMapTitle} numberOfLines={1}>{race.venue}</Text></View>
      <View style={[styles.trackMapImageFrame, compact && styles.trackMapImageFrameCompact]}>
        {imageUrl ? <>
          <Animated.Image accessibilityLabel={race.venue + ' 官方赛道图'} source={{ uri: imageUrl }} resizeMode="contain" style={[styles.trackMapImage, { opacity: imageOpacity }]} onLoad={showImage} onError={() => setImageState('error')} />
          {imageState !== 'ready' ? <Text style={styles.trackMapFallback}>{imageState === 'loading' ? '正在载入官方赛道图…' : '官方赛道图暂时无法载入'}</Text> : null}
        </> : <Text style={styles.trackMapFallback}>此分站暂无赛道图</Text>}
      </View>
    </View>
  );
}

function CircuitFacts({ race }: { race: Race }) {
  const facts = circuitFacts[circuitSlug(race) ?? ''];
  if (!facts) return null;
  return (
    <View>
      <View style={styles.trackStats}>
        <View><Text style={styles.statValue}>{facts.lengthKm.toFixed(3)} <Text style={styles.statUnit}>km</Text></Text><Text style={styles.statLabel}>单圈长度</Text></View>
        {facts.turns ? <View><Text style={styles.statValue}>{facts.turns}</Text><Text style={styles.statLabel}>弯道数</Text></View> : null}
        <View><Text style={styles.statValue}>{facts.laps}</Text><Text style={styles.statLabel}>正赛圈数</Text></View>
      </View>
      <View style={styles.circuitFactsList}>
        <ProfileInfoRow label="举办城市" value={facts.city} />
        <ProfileInfoRow label="首办大奖赛" value={String(facts.firstGrandPrix)} />
        <ProfileInfoRow label="赛道纪录" value={facts.lapRecord ? `${facts.lapRecord} · ${facts.lapRecordHolder}（${facts.lapRecordYear}）` : '官方资料暂未列出'} />
      </View>
      <SourceNote source={facts.source} />
    </View>
  );
}

function ProfileMetricCard({ title, values }: { title: string; values: Array<{ label: string; value: string | number }> }) {
  return (
    <View style={styles.profileDataCard}>
      <Text style={styles.profileDataTitle}>{title}</Text>
      <View style={styles.profileMetricGrid}>
        {values.map((item) => <View key={item.label} style={styles.profileMetric}>
          <Text style={styles.profileMetricValue}>{item.value}</Text>
          <Text style={styles.profileMetricLabel}>{item.label}</Text>
        </View>)}
      </View>
    </View>
  );
}

function ProfileInfoCard({ title, rows }: { title: string; rows: Array<{ label: string; value: string | number }> }) {
  return (
    <View style={styles.profileDataCard}>
      <Text style={styles.profileDataTitle}>{title}</Text>
      {rows.map((item) => <ProfileInfoRow key={item.label} label={item.label} value={String(item.value)} />)}
    </View>
  );
}

function ProfileInfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.profileInfoRow}><Text style={styles.profileInfoLabel}>{label}</Text><Text style={styles.profileInfoValue}>{value}</Text></View>;
}

function SourceNote({ source, asOf }: { source: string; asOf?: string }) {
  return <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(source); }} style={styles.profileSource}><Text style={styles.profileSourceText}>资料来源：Formula1.com{asOf ? ` · 统计截至 ${asOf}` : ''} ↗</Text></Pressable>;
}

function ScreenHeader({ eyebrow, title, right }: { eyebrow: string; title: string; right?: string }) {
  return (
    <View style={styles.screenHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.screenTitle}>{title}</Text>
      </View>
      {right ? <View style={styles.seasonBadge}><Text style={styles.seasonBadgeText}>{right}</Text></View> : null}
    </View>
  );
}

function DemoNotice() {
  const { status, reload, syncedAt, hasSeasonData, dataSource } = useSeason();
  const synced = formatSyncTime(syncedAt);
  const lastDataLabel = hasSeasonData
    ? `显示${dataSource === 'cache' ? '缓存' : '上次同步'}${synced ? `于 ${synced}` : ''}的数据`
    : '显示本地官方赛历快照（分场时间、积分需联网）';
  const label = status === 'live'
    ? `OpenF1 · 已同步${synced ? ` ${synced}` : ''} · CC BY-NC-SA 4.0 · 非官方 · 点此刷新`
    : status === 'loading'
      ? `正在连接 OpenF1 · ${lastDataLabel}`
      : status === 'restricted'
        ? `OpenF1 当前限制数据访问 · ${lastDataLabel} · 点此重试`
        : `OpenF1 暂不可用 · ${lastDataLabel} · 点此重试`;
  return <MotionPanel motionKey={status}><Pressable accessibilityRole="button" disabled={status === 'loading'} onPress={reload} style={styles.demoNotice}><View style={[styles.demoDot, status === 'live' && styles.liveDot]} /><Text style={styles.demoNoticeText}>{label}</Text></Pressable></MotionPanel>;
}

function Segment<T extends string>({
  items,
  selected,
  onSelect,
}: {
  items: { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
}) {
  const reduceMotion = useContext(MotionPreferenceContext);
  const [segmentWidth, setSegmentWidth] = useState(0);
  const selectedIndex = Math.max(items.findIndex((item) => item.id === selected), 0);
  const segmentPosition = useRef(new Animated.Value(selectedIndex)).current;
  const buttonWidth = Math.max(0, (segmentWidth - 6) / items.length);
  const indicatorOffset = segmentPosition.interpolate({
    inputRange: items.map((_, index) => index),
    outputRange: items.map((_, index) => index * buttonWidth),
  });
  useEffect(() => {
    segmentPosition.stopAnimation();
    if (reduceMotion) {
      segmentPosition.setValue(selectedIndex);
      return;
    }
    const animation = Animated.timing(segmentPosition, { toValue: selectedIndex, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver });
    animation.start();
    return () => animation.stop();
  }, [items.length, reduceMotion, segmentPosition, selectedIndex]);
  return (
    <View style={styles.segment} onLayout={(event) => setSegmentWidth(event.nativeEvent.layout.width)}>
      <Animated.View pointerEvents="none" style={[styles.segmentIndicator, { width: buttonWidth, transform: [{ translateX: indicatorOffset }] }]} />
      {items.map((item) => (
        <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: selected === item.id }} onPress={() => onSelect(item.id)} style={[styles.segmentButton, selected === item.id && styles.segmentButtonActive]}>
          <Text style={[styles.segmentText, selected === item.id && styles.segmentTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function FavoriteButton({ active, onPress }: { active: boolean; onPress: () => void }) {
  const reduceMotion = useContext(MotionPreferenceContext);
  const starScale = useRef(new Animated.Value(1)).current;
  const previousActive = useRef(active);
  useEffect(() => {
    if (previousActive.current === active) return;
    previousActive.current = active;
    starScale.stopAnimation();
    if (reduceMotion) {
      starScale.setValue(1);
      return;
    }
    starScale.setValue(0.72);
    const animation = Animated.timing(starScale, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver });
    animation.start();
    return () => animation.stop();
  }, [active, reduceMotion, starScale]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={active ? '取消收藏' : '收藏'} onPress={onPress} hitSlop={8} style={styles.favoriteButton}>
      <Animated.Text style={[styles.favoriteGlyph, active && styles.favoriteGlyphActive, { transform: [{ scale: starScale }] }]}>{active ? '★' : '☆'}</Animated.Text>
    </Pressable>
  );
}

const teamLogoAliases: Record<string, string> = {
  'aston-martin': 'aston',
  'audi-revolut-f1-team': 'audi',
  'haas': 'haas',
  'haas-f1-team': 'haas',
  'red-bull-racing': 'redbull',
  'rb': 'racing-bulls',
  'visa-cash-app-rb': 'racing-bulls',
  'tgr-haas-f1-team': 'haas',
};
const teamLogoTiles: Record<string, string> = {
  mercedes: '#171A1F',
  alpine: '#142B55',
  aston: '#00594F',
};
const teamLogoSizes = {
  row: { width: 48, height: 36 },
  standing: { width: 42, height: 31 },
  timing: { width: 18, height: 18, padding: 0, borderWidth: 0, borderRadius: 0 },
  result: { width: 18, height: 18, padding: 1, borderWidth: 0, borderRadius: 2 },
  profile: { width: 104, height: 54 },
};
type TeamLogoSize = keyof typeof teamLogoSizes;

function TeamLogo({ teamId, size = 'row' }: { teamId: string; size?: TeamLogoSize }) {
  const logoId = teamLogoAliases[teamId] ?? teamId;
  const xml = teamLogoXml[logoId];
  const compact = size === 'timing';
  if (!xml) return null;
  return (
    <View style={[styles.teamLogoBadge, teamLogoSizes[size], { backgroundColor: teamLogoTiles[logoId] ?? (compact ? 'transparent' : C.white), borderColor: compact ? 'transparent' : teamLogoTiles[logoId] ?? C.line }]}>
      <SvgCss xml={xml} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
    </View>
  );
}

function PersonRow({ driver, onPress, favorite, onFavorite }: { driver: Driver; onPress: () => void; favorite?: boolean; onFavorite?: () => void }) {
  const { teams } = useSeason();
  const team = TeamFor(driver.teamId, teams);
  return (
    <View style={styles.personRow}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.rowMain}>
        <View style={[styles.driverCode, { backgroundColor: team.color }]}><Text style={styles.driverCodeText}>{driver.code.slice(0, 1)}</Text></View>
        <View style={styles.rowCopy}><Text style={styles.rowTitle} numberOfLines={1}>{driver.name}</Text><Text style={styles.rowSub}>{team.name} · {driver.country}{driver.seasonStatus === 'substitute' ? ' · 本季代班' : ''}</Text></View>
        <Text style={styles.rowNumber}>#{driver.number}</Text>
      </Pressable>
      {onFavorite ? <FavoriteButton active={Boolean(favorite)} onPress={onFavorite} /> : null}
    </View>
  );
}

function TeamRow({ team, onPress, favorite, onFavorite }: { team: Team; onPress: () => void; favorite?: boolean; onFavorite?: () => void }) {
  return (
    <View style={styles.personRow}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.rowMain}>
        <TeamLogo teamId={team.id} size="timing" />
        <View style={styles.rowCopy}><Text style={styles.rowTitle}>{team.name}</Text><Text style={styles.rowSub}>{team.short} · {team.base}</Text></View>
        <Text style={styles.teamPoints}>{team.points ?? '—'}{team.points !== null ? <Text style={styles.pointsUnit}> 分</Text> : null}</Text>
      </Pressable>
      {onFavorite ? <FavoriteButton active={Boolean(favorite)} onPress={onFavorite} /> : null}
    </View>
  );
}

function SchedulePage({ filter, onFilterChange, onOpenRace }: { filter: ScheduleFilter; onFilterChange: (filter: ScheduleFilter) => void; onOpenRace: (race: Race) => void }) {
  const { races, status, reload } = useSeason();
  const visibleRaces = races.filter((race) => race.finished === (filter === 'finished'));
  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="F1 · 赛季信息" title="赛程" right="2026" />
      <DemoNotice />
      <View style={styles.scheduleIntro}>
        <Text style={styles.introLabel}>RACE WEEKEND</Text>
        <Text style={styles.introTitle}>每一站，都有迹可循。</Text>
        <Text style={styles.introCopy}>赛程、周末场次与赛道资料，集中查看。</Text>
      </View>
      <Segment items={[{ id: 'upcoming', label: '即将到来' }, { id: 'finished', label: '近期完赛' }]} selected={filter} onSelect={onFilterChange} />
      <MotionPanel motionKey={filter}>
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{filter === 'upcoming' ? '后续赛程' : '已结束赛事'}</Text><Text style={styles.sectionMeta}>{visibleRaces.length} STATIONS</Text></View>
        {visibleRaces.length === 0 ? (
          <View style={styles.noSeasonState}>
            <View style={styles.noSeasonIcon}><Glyph path="M4 6h16M7 3v6m10-6v6M4 10h16v10H4z" color={C.red} size={22} /></View>
            <Text style={styles.noSeasonTitle}>{status === 'loading' ? '正在同步赛季信息' : '暂无可核验的赛程'}</Text>
            <Text style={styles.noSeasonCopy}>{status === 'loading' ? '首次同步完成后，赛程会保存在本机供离线查看。' : '当前没有已缓存的 OpenF1 赛程。连接恢复后可点上方状态重试。'}</Text>
            {status !== 'loading' ? <Pressable accessibilityRole="button" onPress={reload} style={styles.noSeasonButton}><Text style={styles.noSeasonButtonText}>重新连接 OpenF1</Text></Pressable> : null}
          </View>
        ) : visibleRaces.map((race) => {
          const raceSession = race.sessions.find((session) => session.name === '正赛');
          return <Pressable key={race.id} accessibilityRole="button" onPress={() => onOpenRace(race)} style={styles.raceCard}>
            <View style={styles.raceCardTop}>
              <View style={styles.roundTag}><Text style={styles.roundTagText}>第 {String(race.round).padStart(2, '0')} 站</Text></View>
              <Text style={styles.raceDate}>{race.dates}</Text>
            </View>
            <View style={styles.raceCardBody}>
              <CountryFlag race={race} />
              <View style={styles.raceCopy}><Text style={styles.raceName}>{race.name}</Text><Text style={styles.raceVenue}>{race.venue} · {race.country}</Text></View>
              <View style={styles.raceTime}><Text style={styles.raceTimeLabel}>{raceSession ? '本地开赛' : '场次时间'}</Text><Text style={styles.raceTimeValue}>{raceSession ? formatTime(raceSession.at) : '待联网'}</Text></View>
            </View>
            <View style={styles.raceCardBottom}><Text style={styles.raceBottomText}>{race.finished ? '查看分站成绩' : '查看比赛周末安排'}</Text><Text style={styles.raceArrow}>↗</Text></View>
          </Pressable>;
        })}
        {visibleRaces.length > 0 ? <View style={styles.trackTeaser}><TrackMap key={visibleRaces[0]!.id} race={visibleRaces[0]!} compact /><Text style={styles.trackTeaserNote}>赛道图与分站同步</Text></View> : null}
      </MotionPanel>
    </ScrollView>
  );
}

function FavoritesPage({ favorites, onToggle, onOpenRace, onOpenDriver, onOpenTeam, onGoLibrary }: {
  favorites: string[];
  onToggle: (id: string) => void;
  onOpenRace: (id: string) => void;
  onOpenDriver: (id: string) => void;
  onOpenTeam: (id: string) => void;
  onGoLibrary: () => void;
}) {
  const { races, drivers, teams } = useSeason();
  const favoriteRaces = races.filter((race) => favorites.includes(raceFavoriteId(race.id)));
  const favoriteDrivers = drivers.filter((driver) => favorites.includes(driver.id));
  const favoriteTeams = teams.filter((team) => favorites.includes(team.id));
  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="YOUR GRID" title="收藏" />
      <DemoNotice />
      {favoriteRaces.length === 0 && favoriteDrivers.length === 0 && favoriteTeams.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}><Glyph path={navItems[1].icon} color={C.red} size={24} /></View>
          <Text style={styles.emptyTitle}>这里还没有收藏</Text>
          <Text style={styles.emptyCopy}>收藏赛事、车手或车队，之后可以从这里快速查看。</Text>
          <Pressable accessibilityRole="button" onPress={onGoLibrary} style={styles.primaryButton}><Text style={styles.primaryButtonText}>浏览资料库</Text><Text style={styles.primaryButtonArrow}>→</Text></Pressable>
        </View>
      ) : (
        <>
          {favoriteRaces.length > 0 ? <MotionPanel motionKey={favoriteRaces.map((race) => race.id).join('|')}><><View style={styles.sectionHeading}><Text style={styles.sectionTitle}>赛事</Text><Text style={styles.sectionMeta}>{favoriteRaces.length} SAVED</Text></View>{favoriteRaces.map((race) => <View key={race.id} style={styles.personRow}><Pressable accessibilityRole="button" onPress={() => onOpenRace(race.id)} style={styles.rowMain}><CountryFlag race={race} /><View style={styles.rowCopy}><Text style={styles.rowTitle}>{race.name}</Text><Text style={styles.rowSub}>{race.venue} · {race.dates}</Text></View></Pressable><FavoriteButton active onPress={() => onToggle(raceFavoriteId(race.id))} /></View>)}</></MotionPanel> : null}
          {favoriteDrivers.length > 0 ? <MotionPanel motionKey={favoriteDrivers.map((driver) => driver.id).join('|')}><><View style={styles.sectionHeading}><Text style={styles.sectionTitle}>车手</Text><Text style={styles.sectionMeta}>{favoriteDrivers.length} SAVED</Text></View>{favoriteDrivers.map((driver) => <PersonRow key={driver.id} driver={driver} onPress={() => onOpenDriver(driver.id)} favorite onFavorite={() => onToggle(driver.id)} />)}</></MotionPanel> : null}
          {favoriteTeams.length > 0 ? <MotionPanel motionKey={favoriteTeams.map((team) => team.id).join('|')}><><View style={[styles.sectionHeading, { marginTop: 20 }]}><Text style={styles.sectionTitle}>车队</Text><Text style={styles.sectionMeta}>{favoriteTeams.length} SAVED</Text></View>{favoriteTeams.map((team) => <TeamRow key={team.id} team={team} onPress={() => onOpenTeam(team.id)} favorite onFavorite={() => onToggle(team.id)} />)}</></MotionPanel> : null}
        </>
      )}
    </ScrollView>
  );
}

function StandingsPage({ tab, onTabChange, onOpenDriver, onOpenTeam }: { tab: StandingsTab; onTabChange: (tab: StandingsTab) => void; onOpenDriver: (id: string) => void; onOpenTeam: (id: string) => void }) {
  const { drivers, teams } = useSeason();
  const rows = tab === 'drivers' ? drivers : teams;
  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="SEASON SCOREBOARD" title="排行榜" right="2026" />
      <DemoNotice />
      <View style={styles.standingsHero}>
        <View><Text style={styles.standingsEyebrow}>POINTS TABLE</Text><Text style={styles.standingsTitle}>积分榜</Text></View>
        <View style={styles.pointsMark}><Text style={styles.pointsMarkText}>PTS</Text></View>
        <Text style={styles.standingsDescription}>按积分排序 · 点击条目查看资料</Text>
      </View>
      <Segment items={[{ id: 'drivers', label: '车手积分' }, { id: 'teams', label: '车队积分' }]} selected={tab} onSelect={onTabChange} />
      <MotionPanel motionKey={tab}>
        <View style={styles.tableHeader}><Text style={styles.tableHeadRank}>POS</Text><Text style={styles.tableHeadName}>{tab === 'drivers' ? '车手 / 车队' : '车队'}</Text><Text style={styles.tableHeadPts}>PTS</Text></View>
        {rows.length === 0 ? <Text style={styles.disclaimer}>当前赛季榜单暂不可用。</Text> : rows.map((row, index) => {
          const id = row.id;
          const driver = tab === 'drivers' ? row as Driver : null;
          const team = tab === 'teams' ? row as Team : driver ? TeamFor(driver.teamId, teams) : teams[0];
          return (
            <Pressable key={id} accessibilityRole="button" onPress={() => driver ? onOpenDriver(driver.id) : onOpenTeam(id)} style={styles.standingRow}>
              <Text style={[styles.rankNumber, index < 3 && styles.rankNumberTop]}>{String(index + 1).padStart(2, '0')}</Text>
              <TeamLogo teamId={team.id} size="standing" />
              <View style={styles.standingCopy}>
                <Text style={styles.standingName}>{driver ? driver.name : (row as Team).name}</Text>
                <Text style={styles.standingSub}>{driver ? team.name + ' · ' + driver.code : team.short}</Text>
              </View>
              <Text style={styles.standingPoints}>{row.points ?? '—'}</Text>
            </Pressable>
          );
        })}
        <Text style={styles.disclaimer}>数据来自 OpenF1，赛季榜单随已发布的官方结果更新。此应用为非官方个人项目。</Text>
      </MotionPanel>
    </ScrollView>
  );
}

function LibraryPage({ favorites, onToggle, tab, onTabChange, onOpenDriver, onOpenTeam, onOpenTrack }: {
  favorites: string[];
  onToggle: (id: string) => void;
  tab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
  onOpenDriver: (id: string) => void;
  onOpenTeam: (id: string) => void;
  onOpenTrack: (id: string) => void;
}) {
  const { races, drivers, teams } = useSeason();
  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="PADDOCK DIRECTORY" title="资料库" />
      <DemoNotice />
      <Text style={styles.libraryIntro}>按车手、车队或赛道浏览本赛季资料。</Text>
      <Segment items={[{ id: 'drivers', label: '车手' }, { id: 'teams', label: '车队' }, { id: 'tracks', label: '赛道' }]} selected={tab} onSelect={onTabChange} />
      <MotionPanel motionKey={tab}>
        {tab === 'drivers' ? drivers.length ? drivers.map((driver) => <PersonRow key={driver.id} driver={driver} onPress={() => onOpenDriver(driver.id)} favorite={favorites.includes(driver.id)} onFavorite={() => onToggle(driver.id)} />) : <Text style={styles.disclaimer}>本赛季车手名单暂不可用。</Text> : null}
        {tab === 'teams' ? teams.length ? teams.map((team) => <TeamRow key={team.id} team={team} onPress={() => onOpenTeam(team.id)} favorite={favorites.includes(team.id)} onFavorite={() => onToggle(team.id)} />) : <Text style={styles.disclaimer}>本赛季车队名单暂不可用。</Text> : null}
        {tab === 'tracks' ? races.map((race) => (
          <Pressable key={race.id} accessibilityRole="button" onPress={() => onOpenTrack(race.id)} style={styles.trackRow}>
            <View style={styles.trackThumbnail}><Glyph path="M4 16 7 8l5 2 3-6 4 4-3 5 4 4-7 1-4-3-5 1z" color={C.teal} size={22} /></View>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>{race.venue}</Text><Text style={styles.rowSub}>{race.name} · {race.country}</Text></View>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
        )) : null}
      </MotionPanel>
    </ScrollView>
  );
}

function RaceDetail({ race, onBack, onOpenDriver, favorite, onToggleFavorite }: { race: Race; onBack: () => void; onOpenDriver: (id: string) => void; favorite: boolean; onToggleFavorite: () => void }) {
  const { drivers, teams, status, dataSource, resultsBySession, saveSessionResults, loadSessionResults } = useSeason();
  const defaultSession = () => race.finished ? '正赛' : [...race.sessions].reverse().find((item) => item.ended)?.name ?? race.sessions[0]?.name ?? '';
  const [selectedSession, setSelectedSession] = useState(defaultSession);
  const [liveResults, setLiveResults] = useState<Result[]>([]);
  const [resultState, setResultState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const resultsBySessionRef = useRef(resultsBySession);
  resultsBySessionRef.current = resultsBySession;
  useEffect(() => setSelectedSession(defaultSession()), [race.id]);
  const selectedIndex = race.sessions.findIndex((session) => session.name === selectedSession);
  const session = race.sessions[selectedIndex];
  const sessionFinished = Boolean(session?.ended || race.finished);
  const cachedSessionResults = session?.id ? resultsBySession[session.id] : undefined;
  useEffect(() => {
    if (cachedSessionResults?.length) setLiveResults(cachedSessionResults);
  }, [cachedSessionResults]);
  useEffect(() => {
    if (!session?.id || !sessionFinished) {
      setLiveResults([]);
      setResultState('idle');
      return;
    }
    let current = true;
    setResultState('loading');
    setLiveResults([]);
    const loadResults = async () => {
      const globalCache = resultsBySessionRef.current[session.id!];
      const cached = globalCache ?? await readOpenF1ResultsCache(session.id!);
      if (current && cached && !globalCache) {
        setLiveResults(cached);
        saveSessionResults(session.id!, cached);
      } else if (current && cached) {
        setLiveResults(cached);
      }
      if (status !== 'live') {
        if (current) setResultState(cached ? 'ready' : 'error');
        return;
      }
      try {
        const rows = await loadSessionResults(session.id!, selectedSession, true);
        if (current) {
          setLiveResults(rows);
          setResultState('ready');
        }
      } catch {
        if (current) setResultState(cached ? 'ready' : 'error');
      }
    };
    void loadResults();
    return () => { current = false; };
  }, [session?.id, status, sessionFinished, selectedSession, loadSessionResults, saveSessionResults]);
  const sampleResults = status !== 'live' && race.finished
    ? race.results
      .map((result, index) => selectedSession === '正赛'
        ? result
        : { ...result, position: (index + Math.max(selectedIndex, 0)) % race.results.length + 1, fastestLap: false, status: 'finished' as const, points: 0 })
      .sort((left, right) => left.position - right.position)
      .map((result, index) => selectedSession === '正赛' ? result : { ...result, gap: index === 0 ? '1:20.308' : '+' + (0.047 * index).toFixed(3) + 's' })
    : [];
  const results = dataSource === 'calendar' ? sampleResults : liveResults;
  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <DetailHeader title="赛事详情" subtitle={'第 ' + race.round + ' 站 · ' + race.country} onBack={onBack} favorite={favorite} onToggleFavorite={onToggleFavorite} />
      <DemoNotice />
      <View style={styles.detailTitleBlock}><Text style={styles.detailRaceName}>{race.name}</Text><Text style={styles.detailRaceVenue}>{race.venue} · {race.dates}</Text></View>
      <View style={styles.timeCard}>
        <Text style={styles.cardOverline}>RACE WEEKEND · {dataSource === 'openf1' ? 'OPENF1' : dataSource === 'cache' ? '本机缓存' : '官方赛历快照'}</Text>
        {race.sessions.length > 0 ? <>
          <View style={styles.timeHeader}><Text style={styles.timeHeaderLabel}>场次</Text><Text style={styles.timeHeaderLabel}>赛道当地</Text><Text style={styles.timeHeaderLabel}>手机本地</Text></View>
          {race.sessions.map((item) => <View key={item.id ?? item.name} style={styles.timeRow}><View style={styles.timeSession}><Text style={styles.timeSessionName}>{item.name}</Text><Text style={styles.timeDay}>{item.day}</Text></View><Text style={styles.timeValue}>{item.offset ? formatOffsetTime(item.at, item.offset) : formatTime(item.at, race.timeZone)}</Text><Text style={styles.timeValue}>{formatTime(item.at)}</Text></View>)}
        </> : <Text style={styles.upcomingNoteCopy}>当前离线赛历仅包含赛事日期；分场时间和成绩会在联网同步后显示。</Text>}
      </View>
      <View style={styles.mapCard}><TrackMap key={race.id} race={race} /><CircuitFacts race={race} /></View>
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{sessionFinished ? selectedSession + '成绩' : '比赛结果'}</Text><Text style={styles.sectionMeta}>{race.sessions.length === 0 ? 'CALENDAR ONLY' : sessionFinished ? status === 'live' ? 'OPENF1 RESULT' : 'SAVED RESULT' : 'UPCOMING'}</Text></View>
      {race.finished && race.sessions.length === 0 ? <View style={styles.upcomingNote}><Text style={styles.upcomingNoteTitle}>离线赛历不含分站成绩</Text><Text style={styles.upcomingNoteCopy}>连接 OpenF1 并同步后，可查看已发布的赛果。</Text></View> : <>
        {race.sessions.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionScroller}><View style={styles.sessionChips}>{race.sessions.map((item) => <Pressable key={item.id ?? item.name} onPress={() => setSelectedSession(item.name)} style={[styles.sessionChip, selectedSession === item.name && styles.sessionChipActive]}><Text style={[styles.sessionChipText, selectedSession === item.name && styles.sessionChipTextActive]}>{item.name}</Text></Pressable>)}</View></ScrollView> : null}
        {sessionFinished ? <MotionPanel motionKey={`${selectedSession}:${resultState}:${results.length}`}>
          <View style={styles.resultHeader}><Text style={styles.resultPos}>POS</Text><Text style={styles.resultDriver}>车手 / 车队</Text><Text style={styles.resultGap}>差距</Text><Text style={styles.resultPts}>PTS</Text></View>
          {results.map((result) => {
            const driver = drivers.find((item) => item.id === result.driverId);
            const team = driver ? TeamFor(driver.teamId, teams) : teams[0];
            const statusLabel = result.status === 'dnf' ? ' · 退赛' : result.status === 'dns' ? ' · 未发车' : result.status === 'dsq' ? ' · 取消资格' : '';
            const positionLabel = result.position < 99 ? String(result.position).padStart(2, '0') : result.status.toUpperCase();
            const driverName = driver?.name ?? `车手 #${result.driverId.replace('driver-', '')}`;
            const driverMeta = `${driverName}${result.fastestLap ? ' · 最快圈' : ''}${statusLabel}`;
            return <Pressable key={`${result.driverId}-${result.position}`} disabled={!driver} accessibilityRole="button" accessibilityLabel={`${positionLabel} ${driverName} ${team?.name ?? ''}${statusLabel} ${result.gap}`} onPress={() => driver && onOpenDriver(driver.id)} style={styles.resultRow}><Text style={styles.resultPosition}>{positionLabel}</Text>{team ? <TeamLogo teamId={team.id} size="result" /> : null}<View style={styles.resultDriverCopy}><Text style={styles.resultDriverCode}>{driver?.code ?? '—'}</Text><Text style={styles.resultTeamName} numberOfLines={1}>{driverMeta}</Text></View><Text style={[styles.resultGapValue, (result.status === 'dnf' || result.status === 'dns' || result.status === 'dsq') && styles.retiredText]}>{result.gap}</Text><Text style={styles.resultPointValue}>{result.points ?? '—'}</Text></Pressable>;
          })}
          {dataSource !== 'calendar' && (resultState !== 'ready' || results.length === 0) ? <View style={styles.upcomingNote}><Text style={styles.upcomingNoteTitle}>{resultState === 'loading' ? '正在载入场次成绩' : resultState === 'error' ? '暂无已缓存的本场成绩' : '暂无已公布成绩'}</Text><Text style={styles.upcomingNoteCopy}>{resultState === 'error' ? 'OpenF1 当前不可用，连接恢复后点上方状态重试。' : '成绩会在官方发布后由 OpenF1 更新。'}</Text></View> : null}
        </MotionPanel> : <View style={styles.upcomingNote}><Text style={styles.upcomingNoteTitle}>本场尚未结束</Text><Text style={styles.upcomingNoteCopy}>场次成绩会在活动结束并公布后显示。</Text></View>}
      </>}
    </ScrollView>
  );
}

function DetailHeader({ title, subtitle, onBack, favorite, onToggleFavorite }: { title: string; subtitle: string; onBack: () => void; favorite?: boolean; onToggleFavorite?: () => void }) {
  return (
    <View style={styles.detailHeader}>
      <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={onBack} style={styles.backButton}><Text style={styles.backArrow}>‹</Text></Pressable>
      <View style={styles.detailHeaderCopy}><Text style={styles.detailHeaderTitle}>{title}</Text><Text style={styles.detailHeaderSubtitle}>{subtitle}</Text></View>
      {typeof favorite === 'boolean' && onToggleFavorite ? <FavoriteButton active={favorite} onPress={onToggleFavorite} /> : null}
    </View>
  );
}

function ProfileDetail({ detail, onBack, favorite, onToggle, onOpenDriver, onOpenTeam }: { detail: Detail; onBack: () => void; favorite: boolean; onToggle: (id: string) => void; onOpenDriver: (id: string) => void; onOpenTeam: (id: string) => void }) {
  const { races, drivers, teams } = useSeason();
  if (detail.kind === 'track') {
    const race = races.find((item) => item.id === detail.id) ?? races[0];
    const facts = circuitFacts[circuitSlug(race) ?? ''];
    return (
      <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
        <DetailHeader title="赛道资料" subtitle={`${race.country} · ROUND ${race.round}`} onBack={onBack} />
        <DemoNotice />
        <Text style={styles.detailRaceName}>{race.venue}</Text>
        <Text style={styles.detailRaceVenue}>{facts?.city ?? race.country} · {race.country}</Text>
        <View style={styles.mapCard}><TrackMap key={race.id} race={race} /><CircuitFacts race={race} /></View>
        <ProfileInfoCard title="本季分站" rows={[
          { label: '大奖赛名称', value: race.name },
          { label: '实际举办地', value: `${facts?.city ?? race.country} · ${race.country}` },
          { label: '赛季轮次', value: `第 ${race.round} 站` },
        ]} />
      </ScrollView>
    );
  }
  const driver = detail.kind === 'driver' ? drivers.find((item) => item.id === detail.id) : undefined;
  if (detail.kind === 'driver' && !driver) return <ScrollView contentContainerStyle={styles.pageContent}><DetailHeader title="车手资料" subtitle="CURRENT SEASON" onBack={onBack} /><DemoNotice /><Text style={styles.emptyCopy}>当前数据中没有这位车手。</Text></ScrollView>;
  if (detail.kind === 'team' && !teams.some((item) => item.id === detail.id)) return <ScrollView contentContainerStyle={styles.pageContent}><DetailHeader title="车队资料" subtitle="CURRENT SEASON" onBack={onBack} /><DemoNotice /><Text style={styles.emptyCopy}>当前数据中没有这支车队。</Text></ScrollView>;
  const team = detail.kind === 'team' ? teams.find((item) => item.id === detail.id) ?? teams[0]! : driver ? TeamFor(driver.teamId, teams) : teams[0]!;
  const driverProfile: DriverProfile | undefined = driver ? driverProfiles.find((item) => item.code === driver.code) : undefined;
  const teamProfile: TeamProfile | undefined = teamProfiles.find((item) => item.id === team.id);
  const statValues = (stats: DriverProfile['season'] | TeamProfile['season']) => [
    { label: '大奖赛场次', value: stats.races }, { label: '分站胜利', value: stats.wins },
    { label: '领奖台', value: stats.podiums }, { label: '杆位', value: stats.poles },
    { label: '最快圈', value: stats.fastestLaps },
  ];
  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <DetailHeader title={driver ? '车手资料' : '车队资料'} subtitle={driver ? '2026 DRIVER PROFILE' : '2026 TEAM PROFILE'} onBack={onBack} />
      <DemoNotice />
      <View style={[styles.profileHero, { borderTopColor: team.color }]}>
        <View style={styles.profileHeroTop}>{driver ? <View style={[styles.profileMonogram, { backgroundColor: team.color }]}><Text style={styles.profileMonogramText}>{driver.code.slice(0, 1)}</Text></View> : <TeamLogo teamId={team.id} size="profile" />}<FavoriteButton active={favorite} onPress={() => onToggle(driver?.id ?? team.id)} /></View>
        <Text style={styles.profileName}>{driver ? driver.name : team.name}</Text>
        <Text style={styles.profileMeta}>{driver ? `${team.name} · ${driver.country} · #${driver.number}${driver.seasonStatus === 'substitute' ? ' · 本季代班参赛' : ''}` : `${team.short} · ${team.base}`}</Text>
        <View style={styles.profileStats}>
          <View><Text style={styles.profileStatValue}>{(driver ? driver.points : team.points) ?? '—'}</Text><Text style={styles.profileStatLabel}>2026 积分</Text></View>
          <View><Text style={styles.profileStatValue}>{driverProfile?.season.wins ?? teamProfile?.season.wins ?? '—'}</Text><Text style={styles.profileStatLabel}>大奖赛胜利</Text></View>
        </View>
      </View>
      {driver ? <>
        <ProfileMetricCard title="2026 赛季统计" values={driverProfile ? statValues(driverProfile.season) : []} />
        {driverProfile ? <ProfileMetricCard title="F1 生涯累计" values={[
          { label: '大奖赛参赛', value: driverProfile.career.entered }, { label: '生涯积分', value: driverProfile.career.points },
          { label: '分站胜利', value: driverProfile.career.wins }, { label: '领奖台', value: driverProfile.career.podiums },
          { label: '杆位', value: driverProfile.career.poles }, { label: '世界冠军', value: driverProfile.career.titles },
        ]} /> : null}
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>所属车队</Text></View>
        <TeamRow team={team} onPress={() => onOpenTeam(team.id)} />
        {driverProfile ? <SourceNote source={driverProfile.source} asOf={libraryStatsAsOf} /> : null}
      </> : <>
        <ProfileInfoCard title="车队资料" rows={teamProfile ? [
          { label: '官方全名', value: teamProfile.fullName }, { label: '基地', value: teamProfile.base },
          { label: '车队负责人', value: teamProfile.principal }, { label: '技术负责人', value: teamProfile.technicalChief },
          { label: '底盘', value: teamProfile.chassis }, { label: '动力单元', value: teamProfile.powerUnit },
          { label: '首次参赛', value: teamProfile.firstEntry },
        ] : [{ label: '基地', value: team.base }]} />
        {teamProfile ? <>
          <ProfileMetricCard title="2026 赛季统计" values={statValues(teamProfile.season)} />
          <ProfileMetricCard title="车队 F1 生涯累计" values={[
            { label: '大奖赛参赛', value: teamProfile.career.entered }, { label: '车队积分', value: teamProfile.career.points },
            { label: '分站胜利', value: teamProfile.career.wins }, { label: '领奖台', value: teamProfile.career.podiums },
            { label: '杆位', value: teamProfile.career.poles }, { label: '车队冠军', value: teamProfile.career.titles },
          ]} />
        </> : null}
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>本季现役车手</Text></View>
        {drivers.filter((item) => item.teamId === team.id && item.seasonStatus !== 'substitute').map((item) => <PersonRow key={item.id} driver={item} onPress={() => onOpenDriver(item.id)} />)}
        {teamProfile ? <SourceNote source={teamProfile.source} asOf={libraryStatsAsOf} /> : null}
      </>}
    </ScrollView>
  );
}

function App() {
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [resultsBySession, setResultsBySession] = useState<ResultsBySession>({});
  const [status, setStatus] = useState<SeasonContextValue['status']>('loading');
  const [dataSource, setDataSource] = useState<SeasonContextValue['dataSource']>('calendar');
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const seasonDataRef = useRef<SeasonData | null>(null);
  const driversRef = useRef<Driver[]>([]);
  const resultsBySessionRef = useRef<ResultsBySession>({});
  const sessionRequestsRef = useRef(new Map<string, Promise<Result[]>>());
  const cacheWriteRef = useRef<Promise<void>>(Promise.resolve());
  const persistSeasonCache = useCallback((data: SeasonData, cachedResults: ResultsBySession, savedAt: string) => {
    const snapshot = JSON.stringify({ version: 2, savedAt, data, resultsBySession: cachedResults } satisfies SeasonCache);
    cacheWriteRef.current = cacheWriteRef.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(OPENF1_CACHE_KEY, snapshot))
      .catch(() => undefined);
  }, []);
  const saveSessionResults = useCallback((sessionKey: string, rows: Result[]) => {
    const previous = resultsBySessionRef.current[sessionKey];
    if (previous && JSON.stringify(previous) === JSON.stringify(rows)) {
      const savedAt = new Date().toISOString();
      setSyncedAt(savedAt);
      const data = seasonDataRef.current;
      if (data) persistSeasonCache(data, resultsBySessionRef.current, savedAt);
      return;
    }
    const next = { ...resultsBySessionRef.current, [sessionKey]: rows };
    const savedAt = new Date().toISOString();
    resultsBySessionRef.current = next;
    setResultsBySession(next);
    setSyncedAt(savedAt);
    const data = seasonDataRef.current;
    if (data) persistSeasonCache(data, next, savedAt);
  }, [persistSeasonCache]);
  const loadSessionResults = useCallback((sessionKey: string, sessionName: string, refresh = false): Promise<Result[]> => {
    const cached = resultsBySessionRef.current[sessionKey];
    if (!refresh && cached) return Promise.resolve(cached);
    const existingRequest = sessionRequestsRef.current.get(sessionKey);
    if (existingRequest) return existingRequest;
    const request = (async () => {
      if (!refresh) {
        const legacyCache = await readOpenF1ResultsCache(sessionKey);
        if (legacyCache) {
          saveSessionResults(sessionKey, legacyCache);
          return legacyCache;
        }
        const newlyCached = resultsBySessionRef.current[sessionKey];
        if (newlyCached) return newlyCached;
      }
      const rows = await loadOpenF1Results(sessionKey, driversRef.current, sessionName);
      saveSessionResults(sessionKey, rows);
      return rows;
    })().finally(() => sessionRequestsRef.current.delete(sessionKey));
    sessionRequestsRef.current.set(sessionKey, request);
    return request;
  }, [saveSessionResults]);
  useEffect(() => {
    let active = true;
    let freshDataLoaded = false;
    AsyncStorage.getItem(OPENF1_CACHE_KEY)
      .then((value) => {
        if (!active || freshDataLoaded || !value) return;
        try {
          const cache: unknown = JSON.parse(value);
          if (isSeasonCache(cache)) {
            const data = withKnown2026Drivers(cache.data);
            seasonDataRef.current = data;
            driversRef.current = data.drivers;
            resultsBySessionRef.current = cache.resultsBySession ?? {};
            setSeason(data);
            setResultsBySession(resultsBySessionRef.current);
            setDataSource('cache');
            setSyncedAt(cache.savedAt);
          }
        } catch {
          // Ignore an unreadable cache and keep the empty state truthful.
        }
      })
      .catch(() => undefined);
    loadOpenF1Season()
      .then((loadedData) => {
        if (!active) return;
        freshDataLoaded = true;
        const data = withKnown2026Drivers(loadedData);
        seasonDataRef.current = data;
        driversRef.current = data.drivers;
        const savedAt = new Date().toISOString();
        setSeason(data);
        setDataSource('openf1');
        setSyncedAt(savedAt);
        setStatus('live');
        persistSeasonCache(data, resultsBySessionRef.current, savedAt);
        const completedSessions = data.races.flatMap((race) => race.sessions
          .filter((session) => Boolean(session.id) && (session.ended ?? race.finished))
          .map((session) => ({ id: session.id!, name: session.name })));
        void (async () => {
          let lastRequestAt = 0;
          for (const session of completedSessions) {
            if (!active) return;
            if (resultsBySessionRef.current[session.id]) continue;
            const legacyCache = await readOpenF1ResultsCache(session.id);
            if (legacyCache) {
              saveSessionResults(session.id, legacyCache);
              continue;
            }
            if (!active || resultsBySessionRef.current[session.id]) continue;
            const wait = Math.max(0, 2000 - (Date.now() - lastRequestAt));
            if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
            if (!active) return;
            lastRequestAt = Date.now();
            try {
              await loadSessionResults(session.id, session.name);
            } catch {
              // Retry failed session results the next time OpenF1 season data loads.
            }
          }
        })();
      })
      .catch((error) => {
        if (active) {
          const message = error instanceof Error ? error.message : String(error);
          setStatus(/Live F1 session in progress/i.test(message) || /OpenF1 .*: 40[13]\b/i.test(message) ? 'restricted' : 'offline');
        }
      });
    return () => { active = false; };
  }, [reloadKey, loadSessionResults, persistSeasonCache, saveSessionResults]);
  const value: SeasonContextValue = {
    ...(season ?? { races: offlineCalendarRaces, drivers: offlineLibraryDrivers, teams: offlineLibraryTeams }),
    resultsBySession,
    status,
    dataSource,
    syncedAt,
    hasSeasonData: season !== null,
    reload: () => { setStatus('loading'); setReloadKey((key) => key + 1); },
    saveSessionResults,
    loadSessionResults,
  };
  return <SafeAreaProvider><SeasonContext.Provider value={value}><AppContent /></SeasonContext.Provider></SafeAreaProvider>;
}

function AppContent() {
  const { races } = useSeason();
  const [section, setSection] = useState<Section>('schedule');
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('upcoming');
  const [standingsTab, setStandingsTab] = useState<StandingsTab>('drivers');
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('drivers');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailHistory, setDetailHistory] = useState<Detail[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const sectionProgress = useRef(new Animated.Value(1)).current;
  const transitionAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let active = true;
    const updateReduceMotion = (enabled: boolean) => {
      if (!active) return;
      setReduceMotion(enabled);
      if (enabled) {
        transitionAnimation.current?.stop();
        sectionProgress.setValue(1);
      }
    };
    AccessibilityInfo.isReduceMotionEnabled().then(updateReduceMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', updateReduceMotion);
    return () => {
      active = false;
      subscription.remove();
      transitionAnimation.current?.stop();
    };
  }, [sectionProgress]);

  useEffect(() => {
    AsyncStorage.getItem('f1-demo-favorites-v1')
      .then((value) => { if (value) setFavorites(JSON.parse(value) as string[]); })
      .catch(() => setFavorites([]))
      .finally(() => setStorageReady(true));
  }, []);

  useEffect(() => {
    if (storageReady) AsyncStorage.setItem('f1-demo-favorites-v1', JSON.stringify(favorites)).catch(() => undefined);
  }, [favorites, storageReady]);

  const playScreenTransition = () => {
    transitionAnimation.current?.stop();
    sectionProgress.setValue(reduceMotion ? 0.4 : 0);
    const animation = Animated.timing(sectionProgress, { toValue: 1, duration: reduceMotion ? 180 : 230, easing: Easing.out(Easing.cubic), useNativeDriver });
    transitionAnimation.current = animation;
    animation.start(({ finished }) => {
      if (finished && transitionAnimation.current === animation) transitionAnimation.current = null;
    });
  };
  const toggleFavorite = (id: string) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const open = (next: Detail) => {
    playScreenTransition();
    if (detail) setDetailHistory((history) => [...history, detail]);
    setDetail(next);
  };
  const openDriver = (id: string) => open({ kind: 'driver', id });
  const openTeam = (id: string) => open({ kind: 'team', id });
  const goBack = () => {
    playScreenTransition();
    if (detailHistory.length > 0) {
      setDetail(detailHistory[detailHistory.length - 1]);
      setDetailHistory((history) => history.slice(0, -1));
    } else setDetail(null);
  };
  const goTo = (next: Section) => {
    if (next !== section || detail) playScreenTransition();
    setSection(next);
    setDetail(null);
    setDetailHistory([]);
  };

  if (!storageReady) return <SafeAreaView style={styles.loading}><ActivityIndicator color={C.red} /><Text style={styles.loadingText}>正在载入赛季数据…</Text></SafeAreaView>;

  return (
    <MotionPreferenceContext.Provider value={reduceMotion}>
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appRoot}>
        <View style={styles.rail}>
          <View style={styles.brandMark}><Text style={styles.brandF}>F</Text><View style={styles.brandSlash} /></View>
          <View style={styles.railNav}>{navItems.map((item) => {
            const active = !detail && section === item.id;
            return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: active }} onPress={() => goTo(item.id)} style={[styles.railItem, active && styles.railItemActive]}><Glyph path={item.icon} color={active ? C.red : '#747D86'} size={19} /><Text style={[styles.railLabel, active && styles.railLabelActive]}>{item.label}</Text></Pressable>;
          })}</View>
          <View style={styles.railFooter}><View style={styles.railFooterLine} /><Text style={styles.railFooterText}>26</Text></View>
        </View>
        <Animated.View style={[styles.mainPane, { transform: [{ translateY: sectionProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
          <View style={styles.routeStack}>
            {(['schedule', 'live', 'favorites', 'standings', 'library'] as Section[]).map((page) => {
              const active = !detail && section === page;
              const layerProps = {
                style: [styles.routeLayer, active ? styles.routeLayerActive : styles.routeLayerHidden],
                pointerEvents: active ? 'auto' as const : 'none' as const,
                'aria-hidden': !active,
                accessibilityElementsHidden: !active,
                importantForAccessibility: active ? 'auto' as const : 'no-hide-descendants' as const,
              };
              return (
                <View key={page} {...layerProps}>
                  {page === 'schedule' ? <SchedulePage filter={scheduleFilter} onFilterChange={setScheduleFilter} onOpenRace={(race) => open({ kind: 'race', id: race.id })} /> : null}
                  {page === 'live' ? <LiveTimingPage /> : null}
                  {page === 'favorites' ? <FavoritesPage favorites={favorites} onToggle={toggleFavorite} onOpenRace={(id) => open({ kind: 'race', id })} onOpenDriver={openDriver} onOpenTeam={openTeam} onGoLibrary={() => goTo('library')} /> : null}
                  {page === 'standings' ? <StandingsPage tab={standingsTab} onTabChange={setStandingsTab} onOpenDriver={openDriver} onOpenTeam={openTeam} /> : null}
                  {page === 'library' ? <LibraryPage favorites={favorites} onToggle={toggleFavorite} tab={libraryTab} onTabChange={setLibraryTab} onOpenDriver={openDriver} onOpenTeam={openTeam} onOpenTrack={(id) => open({ kind: 'track', id })} /> : null}
                </View>
              );
            })}
            {detail ? [...detailHistory, detail].map((screen, index, stack) => {
              const active = index === stack.length - 1;
              return (
                <View key={`${screen.kind}:${screen.id}:${index}`} style={[styles.routeLayer, active ? styles.routeLayerActive : styles.routeLayerHidden]} pointerEvents={active ? 'auto' : 'none'} aria-hidden={!active} accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}>
                  {screen.kind === 'race' ? <RaceDetail race={races.find((race) => race.id === screen.id) ?? races[0]} onBack={goBack} onOpenDriver={openDriver} favorite={favorites.includes(raceFavoriteId(screen.id))} onToggleFavorite={() => toggleFavorite(raceFavoriteId(screen.id))} /> : <ProfileDetail detail={screen} onBack={goBack} favorite={favorites.includes(screen.id)} onToggle={toggleFavorite} onOpenDriver={openDriver} onOpenTeam={openTeam} />}
                </View>
              );
            }) : null}
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
    </MotionPreferenceContext.Provider>
  );
}

export default App;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.canvas },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, gap: 12 },
  loadingText: { color: C.muted, fontSize: 13 },
  appRoot: { flex: 1, flexDirection: 'row', backgroundColor: C.canvas },
  routeStack: { flex: 1 },
  routeLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: C.canvas },
  routeLayerActive: { opacity: 1 },
  routeLayerHidden: { opacity: 0 },
  rail: { width: 70, backgroundColor: C.white, borderRightWidth: 1, borderRightColor: C.line, alignItems: 'center', paddingTop: 15, paddingBottom: 14 },
  brandMark: { width: 37, height: 37, backgroundColor: C.red, borderRadius: 11, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  brandF: { color: C.white, fontSize: 20, fontWeight: '900', fontStyle: 'italic', marginLeft: -3 },
  brandSlash: { position: 'absolute', height: 3, width: 20, backgroundColor: C.white, bottom: 10, right: 3, transform: [{ skewX: '-28deg' }] },
  railNav: { width: '100%', gap: 7, marginTop: 32 },
  railItem: { width: 56, height: 58, borderRadius: 13, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', gap: 4 },
  railItemActive: { backgroundColor: '#FFF0F2' },
  railLabel: { fontSize: 10, lineHeight: 14, color: '#7F8790', fontWeight: '500' },
  railLabelActive: { color: C.red, fontWeight: '700' },
  railFooter: { marginTop: 'auto', alignItems: 'center', gap: 7 },
  railFooterLine: { width: 24, height: 1, backgroundColor: C.line },
  railFooterText: { fontSize: 10, color: '#9BA2A9', fontWeight: '700', letterSpacing: 1 },
  mainPane: { flex: 1, maxWidth: 680, alignSelf: 'stretch', backgroundColor: C.canvas },
  livePage: { flex: 1, backgroundColor: C.canvas },
  liveContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 30 },
  liveHero: { backgroundColor: C.ink, borderRadius: 17, padding: 17, marginBottom: 22, overflow: 'hidden', borderTopWidth: 3, borderTopColor: C.red },
  liveHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveHeroKicker: { color: '#A9B0B7', fontSize: 8, fontWeight: '800', letterSpacing: 1.3 },
  liveOfficialTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, backgroundColor: '#30343A' },
  liveOfficialDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.red },
  liveOfficialTagText: { color: C.white, fontSize: 8, fontWeight: '700' },
  liveHeroTitle: { color: C.white, fontSize: 23, lineHeight: 29, fontWeight: '900', letterSpacing: -0.6, marginTop: 20 },
  liveHeroCopy: { color: '#C3C8CE', fontSize: 11, lineHeight: 17, marginTop: 6 },
  liveOpenButton: { minHeight: 42, paddingHorizontal: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row', backgroundColor: C.white, marginTop: 16 },
  liveOpenButtonText: { color: C.ink, fontSize: 11, fontWeight: '800' },
  liveOpenArrow: { color: C.red, fontSize: 17, fontWeight: '800' },
  liveHeroFootnote: { color: '#929AA3', fontSize: 8, marginTop: 9 },
  liveSectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  liveSectionTitle: { color: C.ink, fontSize: 15, fontWeight: '800' },
  liveSectionSubtitle: { color: '#9AA2AA', fontSize: 7, fontWeight: '800', letterSpacing: 1.1, marginTop: 3 },
  liveFeatureCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, marginBottom: 12 },
  liveFeatureRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveFeatureRowPressed: { opacity: 0.65 },
  liveFeatureIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F3F5F6', alignItems: 'center', justifyContent: 'center' },
  liveFeatureCopy: { flex: 1 },
  liveFeatureTitle: { color: C.ink, fontSize: 11, fontWeight: '800' },
  liveFeatureDetail: { color: C.muted, fontSize: 9, marginTop: 4 },
  liveFeatureAction: { color: C.red, fontSize: 17, fontWeight: '700', paddingHorizontal: 3 },
  liveFeatureDivider: { height: 1, backgroundColor: '#F0F1F2', marginLeft: 44 },
  liveNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11, borderRadius: 10, backgroundColor: '#FFF3F4' },
  liveNoticeMark: { width: 15, height: 15, borderRadius: 8, backgroundColor: '#F7DADD', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  liveNoticeMarkText: { color: C.red, fontSize: 9, lineHeight: 12, fontWeight: '800' },
  liveNoticeText: { flex: 1, color: '#8B535B', fontSize: 9, lineHeight: 14 },
  pageContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 30 },
  screenHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  eyebrow: { color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  screenTitle: { color: C.ink, fontSize: 27, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8 },
  seasonBadge: { minWidth: 49, height: 31, borderRadius: 9, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  seasonBadgeText: { color: C.ink, fontSize: 12, fontWeight: '800' },
  demoNotice: { minHeight: 29, borderRadius: 8, backgroundColor: '#FFF3F4', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: 15, gap: 7 },
  demoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.red },
  liveDot: { backgroundColor: C.teal },
  demoNoticeText: { color: '#9A4855', fontSize: 10, fontWeight: '600' },
  noSeasonState: { alignItems: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 15, paddingHorizontal: 18, paddingVertical: 24, marginTop: 4, marginBottom: 12 },
  noSeasonIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFF0F2', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  noSeasonTitle: { color: C.ink, fontSize: 14, fontWeight: '800' },
  noSeasonCopy: { color: C.muted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 6, maxWidth: 280 },
  noSeasonButton: { minHeight: 37, backgroundColor: C.red, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, marginTop: 13 },
  noSeasonButtonText: { color: C.white, fontSize: 10, fontWeight: '800' },
  scheduleIntro: { paddingTop: 6, paddingBottom: 18 },
  introLabel: { color: C.red, fontSize: 9, fontWeight: '800', letterSpacing: 1.6, marginBottom: 7 },
  introTitle: { color: C.ink, fontSize: 21, lineHeight: 28, fontWeight: '800', letterSpacing: -0.7 },
  introCopy: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  segment: { position: 'relative', flexDirection: 'row', padding: 3, borderRadius: 11, backgroundColor: '#EAEDF0', marginBottom: 17, minHeight: 39 },
  segmentIndicator: { position: 'absolute', left: 3, top: 3, bottom: 3, borderRadius: 9, backgroundColor: C.white },
  segmentButton: { zIndex: 1, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  segmentButtonActive: { backgroundColor: 'transparent' },
  segmentText: { color: '#6F7780', fontSize: 11, fontWeight: '600' },
  segmentTextActive: { color: C.ink, fontWeight: '800' },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2, marginBottom: 10 },
  sectionTitle: { color: C.ink, fontSize: 15, fontWeight: '800' },
  sectionMeta: { color: '#9AA2AA', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  raceCard: { backgroundColor: C.white, borderRadius: 15, borderWidth: 1, borderColor: C.line, padding: 13, marginBottom: 10 },
  raceCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  roundTag: { backgroundColor: '#F1F3F4', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  roundTagText: { color: '#616A73', fontSize: 9, fontWeight: '700' },
  raceDate: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  raceCardBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countryMark: { width: 38, height: 30, borderRadius: 6, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  raceCopy: { flex: 1 },
  raceName: { color: C.ink, fontSize: 14, fontWeight: '800' },
  raceVenue: { color: C.muted, fontSize: 10, marginTop: 3 },
  raceTime: { minWidth: 60, borderLeftWidth: 1, borderLeftColor: C.line, paddingLeft: 10 },
  raceTimeLabel: { color: C.muted, fontSize: 9 },
  raceTimeValue: { color: C.ink, fontSize: 13, fontWeight: '800', marginTop: 3 },
  raceCardBottom: { borderTopWidth: 1, borderTopColor: '#F0F1F2', marginTop: 12, paddingTop: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  raceBottomText: { color: '#6F7780', fontSize: 10, fontWeight: '600' },
  raceArrow: { color: C.red, fontSize: 15, fontWeight: '700' },
  trackTeaser: { marginTop: 6, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 15, overflow: 'hidden', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10 },
  trackMap: { height: 176, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F8F9FA', paddingHorizontal: 8, paddingTop: 10 },
  trackMapCompact: { height: 119, backgroundColor: C.white, paddingTop: 8 },
  trackMapLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  trackMapKicker: { color: '#9AA2AA', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  trackMapTitle: { color: '#757E87', fontSize: 9, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  trackMapImageFrame: { height: 132, alignItems: 'center', justifyContent: 'center' },
  trackMapImageFrameCompact: { height: 90 },
  trackMapImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
  trackMapFallback: { color: C.muted, fontSize: 10, textAlign: 'center' },
  trackTeaserNote: { color: C.muted, fontSize: 9, marginTop: 2, paddingHorizontal: 3 },
  emptyState: { marginTop: 45, paddingHorizontal: 18, alignItems: 'center' },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F2', marginBottom: 16 },
  emptyTitle: { color: C.ink, fontSize: 17, fontWeight: '800' },
  emptyCopy: { color: C.muted, fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 8, maxWidth: 240 },
  primaryButton: { height: 43, borderRadius: 11, backgroundColor: C.red, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginTop: 20 },
  primaryButtonText: { color: C.white, fontSize: 12, fontWeight: '800' },
  primaryButtonArrow: { color: C.white, fontSize: 16, fontWeight: '700' },
  personRow: { minHeight: 68, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center' },
  rowMain: { flex: 1, minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverCode: { width: 37, height: 37, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  driverCodeText: { color: C.white, fontSize: 14, fontWeight: '900', fontStyle: 'italic' },
  rowCopy: { flex: 1 },
  rowTitle: { color: C.ink, fontSize: 12, fontWeight: '800' },
  rowSub: { color: C.muted, fontSize: 9, marginTop: 4 },
  rowNumber: { color: '#9BA2A9', fontSize: 12, fontWeight: '700' },
  teamLogoBadge: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 7, padding: 4, overflow: 'hidden' },
  teamPoints: { color: C.ink, fontSize: 15, fontWeight: '800' },
  pointsUnit: { color: C.muted, fontSize: 9, fontWeight: '500' },
  favoriteButton: { minWidth: 35, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  favoriteGlyph: { color: '#AAB0B6', fontSize: 19 },
  favoriteGlyphActive: { color: '#E6A800' },
  standingsHero: { minHeight: 123, backgroundColor: C.teal, borderRadius: 16, padding: 17, marginBottom: 15, justifyContent: 'space-between', flexDirection: 'row', flexWrap: 'wrap' },
  standingsEyebrow: { color: '#87D7CA', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  standingsTitle: { color: C.white, fontSize: 23, fontWeight: '800', marginTop: 5 },
  pointsMark: { width: 40, height: 28, backgroundColor: '#0F5456', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  pointsMarkText: { color: '#80DCCD', fontSize: 9, fontWeight: '900' },
  standingsDescription: { width: '100%', color: '#C6DEDB', fontSize: 10, marginTop: 2 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, height: 28, borderBottomWidth: 1, borderBottomColor: C.line },
  tableHeadRank: { width: 36, color: '#9AA2AA', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  tableHeadName: { flex: 1, color: '#9AA2AA', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  tableHeadPts: { width: 42, textAlign: 'right', color: '#9AA2AA', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  standingRow: { minHeight: 64, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7 },
  rankNumber: { width: 36, color: '#9BA2A9', fontSize: 12, fontWeight: '800' },
  rankNumberTop: { color: C.red },
  standingCopy: { flex: 1 },
  standingName: { color: C.ink, fontSize: 11, fontWeight: '800' },
  standingSub: { color: C.muted, fontSize: 9, marginTop: 4 },
  standingPoints: { width: 42, textAlign: 'right', color: C.ink, fontSize: 14, fontWeight: '800' },
  disclaimer: { color: '#9AA2AA', fontSize: 9, lineHeight: 15, marginTop: 16, marginBottom: 5 },
  libraryIntro: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 1, marginBottom: 15 },
  trackRow: { minHeight: 74, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 11 },
  trackThumbnail: { width: 40, height: 40, borderRadius: 11, backgroundColor: '#E8F1F0', alignItems: 'center', justifyContent: 'center' },
  rowChevron: { color: '#9BA2A9', fontSize: 25, paddingHorizontal: 5 },
  detailHeader: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 8 },
  backButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: C.ink, fontSize: 28, lineHeight: 30, marginTop: -3 },
  detailHeaderCopy: { flex: 1 },
  detailHeaderTitle: { color: C.ink, fontSize: 15, fontWeight: '800' },
  detailHeaderSubtitle: { color: C.muted, fontSize: 9, marginTop: 2 },
  detailTitleBlock: { marginTop: 3, marginBottom: 14 },
  detailRaceName: { color: C.ink, fontSize: 21, lineHeight: 27, fontWeight: '800', letterSpacing: -0.5 },
  detailRaceVenue: { color: C.muted, fontSize: 11, marginTop: 4 },
  timeCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginBottom: 11 },
  cardOverline: { color: C.red, fontSize: 8, fontWeight: '800', letterSpacing: 1.1, marginBottom: 10 },
  timeHeader: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line },
  timeHeaderLabel: { color: '#9299A0', fontSize: 9, flex: 1, textAlign: 'center', fontWeight: '700' },
  timeRow: { flexDirection: 'row', minHeight: 43, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F2F3' },
  timeSession: { flex: 1.2 },
  timeSessionName: { color: C.ink, fontSize: 10, fontWeight: '700' },
  timeDay: { color: C.muted, fontSize: 8, marginTop: 3 },
  timeValue: { flex: 1, color: C.ink, fontSize: 10, textAlign: 'center', fontWeight: '600' },
  mapCard: { padding: 10, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 14, marginBottom: 15 },
  trackStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12, marginTop: 5, justifyContent: 'space-between' },
  circuitFactsList: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 13, paddingTop: 4 },
  statValue: { color: C.ink, fontSize: 15, fontWeight: '800' },
  statUnit: { fontSize: 9, color: C.muted, fontWeight: '600' },
  statLabel: { color: C.muted, fontSize: 8, marginTop: 4 },
  sessionScroller: { marginBottom: 9, flexGrow: 0 },
  sessionChips: { flexDirection: 'row', gap: 6, paddingBottom: 1 },
  sessionChip: { paddingHorizontal: 12, height: 30, borderRadius: 8, backgroundColor: '#E9ECEF', alignItems: 'center', justifyContent: 'center' },
  sessionChipActive: { backgroundColor: C.ink },
  sessionChipText: { color: '#69727B', fontSize: 9, fontWeight: '700' },
  sessionChipTextActive: { color: C.white },
  resultHeader: { flexDirection: 'row', alignItems: 'center', minHeight: 27, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: C.line },
  resultPos: { width: 30, color: '#9299A0', fontSize: 8, fontWeight: '800' },
  resultDriver: { flex: 1, color: '#9299A0', fontSize: 8, fontWeight: '800' },
  resultGap: { width: 54, textAlign: 'right', color: '#9299A0', fontSize: 8, fontWeight: '800' },
  resultPts: { width: 32, textAlign: 'right', color: '#9299A0', fontSize: 8, fontWeight: '800' },
  resultRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.line, paddingHorizontal: 5, gap: 6 },
  resultPosition: { width: 24, color: C.red, fontSize: 11, fontWeight: '900' },
  resultDriverCopy: { flex: 1 },
  resultDriverCode: { color: C.ink, fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
  resultTeamName: { color: C.muted, fontSize: 8, marginTop: 2 },
  resultGapValue: { width: 54, textAlign: 'right', color: '#68717A', fontSize: 8 },
  retiredText: { color: C.red, fontWeight: '800' },
  resultPointValue: { width: 26, textAlign: 'right', color: C.ink, fontSize: 10, fontWeight: '800' },
  upcomingNote: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 13, padding: 14 },
  upcomingNoteTitle: { color: C.ink, fontSize: 12, fontWeight: '800' },
  upcomingNoteCopy: { color: C.muted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  profileHero: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderTopWidth: 3, borderRadius: 15, padding: 15, marginTop: 2, marginBottom: 18 },
  profileHeroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileMonogram: { width: 54, height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  profileMonogramText: { color: C.white, fontSize: 22, fontWeight: '900', fontStyle: 'italic' },
  profileName: { color: C.ink, fontSize: 20, fontWeight: '800', marginTop: 14 },
  profileMeta: { color: C.muted, fontSize: 10, marginTop: 4 },
  profileStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, marginTop: 15, paddingTop: 13, gap: 36 },
  profileStatValue: { color: C.ink, fontSize: 17, fontWeight: '900' },
  profileStatLabel: { color: C.muted, fontSize: 8, marginTop: 3 },
  profileDataCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12, marginBottom: 12 },
  profileDataTitle: { color: C.ink, fontSize: 11, fontWeight: '800', marginBottom: 12 },
  profileMetricGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  profileMetric: { width: '33.333%', paddingRight: 5 },
  profileMetricValue: { color: C.ink, fontSize: 14, fontWeight: '900' },
  profileMetricLabel: { color: C.muted, fontSize: 8, marginTop: 3 },
  profileInfoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#F1F2F3', gap: 10 },
  profileInfoLabel: { width: 72, flexShrink: 0, color: C.muted, fontSize: 9 },
  profileInfoValue: { flex: 1, color: C.ink, fontSize: 9, lineHeight: 14, fontWeight: '600' },
  profileSource: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8 },
  profileSourceText: { color: C.muted, fontSize: 8, textDecorationLine: 'underline' },
});
