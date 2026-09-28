import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Linking,
  Appearance,
  Pressable as NativePressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  useColorScheme,
  type ImageSourcePropType,
  type PressableProps,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Pattern, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
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

type Section = 'home' | 'schedule' | 'live' | 'favorites' | 'standings' | 'library' | 'settings';
type ThemeMode = 'system' | 'light' | 'dark';
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
  headshotUrl?: string;
  wins?: number;
  seasonStatus?: 'current' | 'substitute';
};

type Session = { id?: string; name: string; day: string; at: string; endsAt?: string; offset?: string; ended?: boolean };
type Result = { driverId: string; driverCode?: string; driverName?: string; teamId?: string; position: number; gridPosition?: number; gap: string; fastestLap?: boolean; status: 'finished' | 'dnf' | 'dns' | 'dsq'; points: number | null };
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
    case 'FR': return <><Rect width="12" height="24" fill="#0055A4" /><Rect x="12" width="12" height="24" fill="#fff" /><Rect x="24" width="12" height="24" fill="#EF4135" /></>;
    case 'DE': return <><Rect width="36" height="8" fill="#111" /><Rect y="8" width="36" height="8" fill="#D00" /><Rect y="16" width="36" height="8" fill="#FFCE00" /></>;
    case 'TH': return <><Rect width="36" height="4" fill="#A51931" /><Rect y="4" width="36" height="4" fill="#F4F5F8" /><Rect y="8" width="36" height="8" fill="#2D2A4A" /><Rect y="16" width="36" height="4" fill="#F4F5F8" /><Rect y="20" width="36" height="4" fill="#A51931" /></>;
    case 'FI': return <><Rect width="36" height="24" fill="#fff" /><Rect x="10" width="5" height="24" fill="#003580" /><Rect y="9.5" width="36" height="5" fill="#003580" /></>;
    case 'AR': return <><Rect width="36" height="8" fill="#74ACDF" /><Rect y="8" width="36" height="8" fill="#fff" /><Rect y="16" width="36" height="8" fill="#74ACDF" /><Circle cx="18" cy="12" r="3" fill="#F6B40E" /></>;
    case 'NZ': return <><Rect width="36" height="24" fill="#00247D" /><Path d="M0 0 14 10M14 0 0 10" stroke="#fff" strokeWidth="2.8" /><Path d="M0 0 14 10M14 0 0 10" stroke="#C8102E" strokeWidth="1.2" /><Path d="M7 0v10M0 5h14" stroke="#fff" strokeWidth="3.5" /><Path d="M7 0v10M0 5h14" stroke="#C8102E" strokeWidth="1.7" />{[[22,5],[29,9],[23,16],[32,18]].map(([x,y],i)=><Polygon key={i} points={flagStarPoints(x,y,2.1)} fill="#CC142B" stroke="#fff" strokeWidth=".7" />)}</>;
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
const circuitImageSlugs: Record<string, string> = {
  gillesvilleneuve: 'montreal', monaco: 'montecarlo', barcelonacatalunya: 'catalunya', redbullring: 'spielberg',
};
const circuitImageUrl = (race: Race, detailed = true) => {
  const slug = circuitSlugs[race.venue];
  const imageSlug = slug ? circuitImageSlugs[slug] ?? slug : null;
  return imageSlug ? `https://media.formula1.com/image/upload/c_fit%2Ch_704/q_auto/v1740000001/common/f1/2026/track/2026track${imageSlug}${detailed ? 'detailed' : ''}.webp` : null;
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
  headshot_url?: string | null;
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
  errorHint: string | null;
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
const f1PortraitBase = 'https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001';
const f1PortraitPaths: Record<string, string> = {
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
const f1Portrait = (code: string) => {
  const path = f1PortraitPaths[code];
  return path?.startsWith('https://') ? path : path ? `${f1PortraitBase}${path}` : undefined;
};
const activeDriverProfiles = driverProfiles.filter((profile) => profile.code !== 'TSU');
const offlineLibraryDrivers: Driver[] = activeDriverProfiles.map((profile) => ({
  id: knownDriverIds[profile.code] ?? `driver-${profile.number}`,
  name: profile.name,
  code: profile.code,
  country: profile.country,
  teamId: profile.teamId,
  number: profile.number,
  points: profile.points,
  headshotUrl: f1Portrait(profile.code),
  wins: profile.season.wins,
  seasonStatus: profile.seasonStatus,
}));
const offlineLibraryTeams: Team[] = teamProfiles.map(({ id, name, short, color, points, base }) => ({ id, name, short, color, points, base }));

function withKnown2026Drivers(data: SeasonData): SeasonData {
  const drivers: Driver[] = activeDriverProfiles.map((profile) => {
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
      headshotUrl: f1Portrait(profile.code) ?? current?.headshotUrl,
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
  'RB': 'RB车队', 'Racing Bulls': 'RB车队', 'Haas F1 Team': '哈斯', 'Kick Sauber': '索伯', Audi: '奥迪', Cadillac: '凯迪拉克',
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
const driverCountryFlags: Record<string, string> = {
  英国: 'GB', 荷兰: 'NL', 摩纳哥: 'MC', 澳大利亚: 'AU', 泰国: 'TH', 西班牙: 'ES',
  法国: 'FR', 日本: 'JP', 加拿大: 'CA', 意大利: 'IT', 德国: 'DE', 芬兰: 'FI',
  墨西哥: 'MX', 阿根廷: 'AR', 巴西: 'BR', 美国: 'US', 中国: 'CN', 新西兰: 'NZ',
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
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error(`OpenF1 ${endpoint}: timeout`);
    if (error instanceof Error && /Network request failed|Failed to fetch|fetch failed/i.test(error.message)) throw new Error(`OpenF1 ${endpoint}: network`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

function describeOpenF1Error(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const endpoint = message.match(/^OpenF1 ([^:]+):/)?.[1];
  const statusCode = message.match(/:\s*(\d{3})\b/)?.[1];
  const reason = /timeout/i.test(message) ? '请求超时'
    : /network/i.test(message) ? '网络请求失败'
      : statusCode ? `接口返回 HTTP ${statusCode}`
        : '接口响应异常';
  return `${endpoint ? `${endpoint} · ` : ''}${reason}`;
}

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

const teamId = (name: string) => ({
  'Oracle Red Bull Racing': 'redbull', 'Red Bull Racing': 'redbull',
  'Aston Martin': 'aston', 'Kick Sauber': 'sauber',
  RB: 'racing-bulls', 'Racing Bulls': 'racing-bulls',
  'Visa Cash App RB': 'racing-bulls', AlphaTauri: 'racing-bulls', 'Scuderia AlphaTauri': 'racing-bulls',
  'Visa Cash App Racing Bulls Formula One Team': 'racing-bulls',
} as Record<string, string>)[name] ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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
        sessions: eventSessions.map((session) => ({ id: String(session.session_key), name: sessionLabels[session.session_name] ?? session.session_name, day: dayLabel(session.date_start, offset), at: session.date_start, endsAt: session.date_end, offset: session.gmt_offset || offset, ended: Date.parse(session.date_end) < Date.now() })),
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
    points: driverPoints.get(driver.driver_number) ?? null, headshotUrl: driver.headshot_url ?? undefined,
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
  const eventDrivers = rows.some((row) => row.driver_number === 22 || row.driver_number === 30)
    ? await openF1<OpenF1Driver[]>('drivers', { session_key: sessionKey }).catch(() => [])
    : [];
  const isQualifying = sessionName.includes('排位');
  const poleRow = rows.find((row) => Number(row.position) === 1);
  const poleTime = isQualifying ? lastFiniteNumber(poleRow?.duration) : null;
  return rows.map((row): Result => {
    const driver = driverList.find((item) => Number(item.number) === Number(row.driver_number));
    const eventDriver = eventDrivers.find((item) => Number(item.driver_number) === Number(row.driver_number));
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
      driverCode: eventDriver?.name_acronym ?? driver?.code,
      driverName: driverNames[eventDriver?.name_acronym ?? ''] ?? eventDriver?.full_name ?? driver?.name,
      teamId: eventDriver ? teamId(eventDriver.team_name) : undefined,
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

const needsEventTeamRefresh = (rows?: Result[]) => Boolean(rows?.some((result) =>
  (result.driverId === 'driver-30' || result.driverId === 'driver-22' || result.driverCode === 'LAW' || result.driverCode === 'TSU') && !result.teamId));

const navItems: { id: Section; label: string; icon: string }[] = [
  { id: 'home', label: '首页', icon: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6' },
  { id: 'schedule', label: '赛程', icon: 'M4 6h16M7 3v6m10-6v6M4 10h16v10H4z' },
  { id: 'live', label: '实时', icon: 'M3 12h4l2.2-6 4.2 12 2.2-6H21' },
  { id: 'favorites', label: '收藏', icon: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z' },
  { id: 'standings', label: '排行榜', icon: 'M5 6h14M5 12h14M5 18h14M2.5 6h.1M2.5 12h.1M2.5 18h.1' },
  { id: 'library', label: '资料库', icon: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5' },
  { id: 'settings', label: '设置', icon: 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.4-6.4-1.4 1.4M7 17l-1.4 1.4m12.8 0L17 17M7 7 5.6 5.6M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z' },
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
    Animated.spring(scale, { toValue, damping: 22, stiffness: 420, mass: 0.7, useNativeDriver }).start();
  };
  const base = typeof style === 'function' ? style({ pressed }) : style;
  const flattened = StyleSheet.flatten(base);
  const transform = flattened?.transform;
  const pressOffset = scale.interpolate({ inputRange: [0.98, 1], outputRange: [1, 0], extrapolate: 'clamp' });
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => { setPressed(true); animateScale(0.98); onPressIn?.(event); }}
      onPressOut={(event) => { setPressed(false); animateScale(1); onPressOut?.(event); }}
      style={{ ...flattened, transform: [...(Array.isArray(transform) ? transform : []), { translateY: pressOffset }, { scale }] }}
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
    const animation = Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 140 : 220, easing: Easing.out(Easing.cubic), useNativeDriver });
    animation.start();
    return () => animation.stop();
  }, [motionKey, progress, reduceMotion]);
  const panelOffset = progress.interpolate({ inputRange: [0.45, 1], outputRange: [6, 0], extrapolate: 'clamp' });
  return <Animated.View style={{ opacity: progress, transform: reduceMotion ? [] : [{ translateY: panelOffset }] }}>{children}</Animated.View>;
}

const F1_LIVE_TIMING_URL = 'https://www.formula1.com/en/timing/f1-live-lite?os=http';

function LiveTimingPage() {
  const openOfficialPage = () => {
    void Linking.openURL(F1_LIVE_TIMING_URL).catch((error) => console.warn('F1 official page could not be opened:', error));
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
  const { status, reload, syncedAt, hasSeasonData, dataSource, errorHint } = useSeason();
  const synced = formatSyncTime(syncedAt);
  const lastDataLabel = hasSeasonData
    ? `显示${dataSource === 'cache' ? '缓存' : '上次同步'}${synced ? `于 ${synced}` : ''}的数据`
    : `显示本地赛历与积分快照（积分截至 ${libraryStatsAsOf}；分场时间需联网）`;
  const label = status === 'live'
    ? `OpenF1 · 已同步${synced ? ` ${synced}` : ''} · CC BY-NC-SA 4.0 · 非官方 · 点此刷新`
    : status === 'loading'
      ? `正在连接 OpenF1 · ${lastDataLabel}`
      : status === 'restricted'
        ? `OpenF1 当前限制数据访问 · ${errorHint ?? '请检查账号权限'} · ${lastDataLabel} · 点此重试`
        : `OpenF1 暂不可用 · ${errorHint ?? '连接失败'} · ${lastDataLabel} · 点此重试`;
  const shortLabel = status === 'live'
    ? `已同步${synced ? ` ${synced.slice(-5)}` : ''}`
    : status === 'loading' ? '同步中…' : status === 'restricted' ? '访问受限' : '暂不可用';
  return <MotionPanel motionKey={status}><View style={styles.demoNotice}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={status === 'loading' ? undefined : status === 'live' ? '点按刷新数据' : '点按重试连接'} disabled={status === 'loading'} onPress={reload} style={styles.demoNoticeButton}>
      <View style={[styles.demoDot, status === 'live' ? styles.liveDot : (status === 'offline' || status === 'restricted') && styles.errorDot]} />
      <Text numberOfLines={1} style={styles.demoNoticeText}>{shortLabel}</Text>
    </Pressable>
    <Text numberOfLines={1} style={styles.demoNoticeCredit}>OpenF1 · CC BY-NC-SA 4.0</Text>
  </View></MotionPanel>;
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

function FavoriteButton({ active, onPress, color }: { active: boolean; onPress: () => void; color?: string }) {
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
    const animation = Animated.spring(starScale, { toValue: 1, damping: 15, stiffness: 360, mass: 0.55, useNativeDriver });
    animation.start();
    return () => animation.stop();
  }, [active, reduceMotion, starScale]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={active ? '取消收藏' : '收藏'} onPress={onPress} hitSlop={8} style={styles.favoriteButton}>
      <Animated.Text style={[styles.favoriteGlyph, color && { color }, active && styles.favoriteGlyphActive, { transform: [{ scale: starScale }] }]}>{active ? '★' : '☆'}</Animated.Text>
    </Pressable>
  );
}

const teamLogoAliases: Record<string, string> = {
  'aston-martin': 'aston',
  'aston-martin-aramco-formula-one-team': 'aston',
  'audi-revolut-f1-team': 'audi',
  'atlassian-williams-f1-team': 'williams',
  'bwt-alpine-formula-one-team': 'alpine',
  'cadillac-formula-1-team': 'cadillac',
  'haas': 'haas',
  'haas-f1-team': 'haas',
  'mclaren-mastercard-f1-team': 'mclaren',
  'mercedes-amg-petronas-formula-one-team': 'mercedes',
  'oracle-red-bull-racing': 'redbull',
  'red-bull-racing': 'redbull',
  'rb': 'racing-bulls',
  'visa-cash-app-rb': 'racing-bulls',
  'visa-cash-app-racing-bulls-formula-one-team': 'racing-bulls',
  'scuderia-ferrari-hp': 'ferrari',
  'tgr-haas-f1-team': 'haas',
};
const teamLogoTiles: Record<string, string> = {
  mercedes: C.white,
  ferrari: '#E8002D',
  mclaren: C.white,
  redbull: '#3671C6',
  'racing-bulls': C.white,
  alpine: C.white,
  haas: C.white,
  audi: C.white,
  williams: C.white,
  aston: '#229971',
  cadillac: C.white,
};
const teamLogoImages: Record<string, ImageSourcePropType> = {
  mercedes: require('./assets/team-logos/f1-2026-color-mercedes.webp'),
  ferrari: require('./assets/team-logos/f1-2026-color-ferrari.webp'),
  mclaren: require('./assets/team-logos/f1-2026-color-mclaren.webp'),
  redbull: require('./assets/team-logos/f1-2026-color-redbull.webp'),
  'racing-bulls': require('./assets/team-logos/f1-2026-color-racing-bulls.webp'),
  alpine: require('./assets/team-logos/f1-2026-color-alpine.webp'),
  haas: require('./assets/team-logos/f1-2026-color-haas.webp'),
  audi: require('./assets/team-logos/f1-2026-color-audi.webp'),
  williams: require('./assets/team-logos/f1-2026-color-williams.webp'),
  aston: require('./assets/team-logos/f1-2026-color-aston.webp'),
  cadillac: require('./assets/team-logos/f1-2026-color-cadillac.webp'),
};
const teamCarImages: Record<string, ImageSourcePropType> = {
  mercedes: require('./assets/team-cars/2026mercedescarright.webp'),
  ferrari: require('./assets/team-cars/2026ferraricarright.webp'),
  mclaren: require('./assets/team-cars/2026mclarencarright.webp'),
  redbull: require('./assets/team-cars/2026redbullracingcarright.webp'),
  'racing-bulls': require('./assets/team-cars/2026racingbullscarright.webp'),
  alpine: require('./assets/team-cars/2026alpinecarright.webp'),
  'haas-f1-team': require('./assets/team-cars/2026haasf1teamcarright.webp'),
  audi: require('./assets/team-cars/2026audicarright.webp'),
  williams: require('./assets/team-cars/2026williamscarright.webp'),
  aston: require('./assets/team-cars/2026astonmartincarright.webp'),
  cadillac: require('./assets/team-cars/2026cadillaccarright.webp'),
};
const teamLogoWhiteImages: Record<string, ImageSourcePropType> = {
  mercedes: require('./assets/team-logos/f1-2026-mercedes.webp'),
  ferrari: require('./assets/team-logos/f1-2026-ferrari.webp'),
  mclaren: require('./assets/team-logos/f1-2026-mclaren.webp'),
  redbull: require('./assets/team-logos/f1-2026-redbull.webp'),
  'racing-bulls': require('./assets/team-logos/f1-2026-racing-bulls.webp'),
  alpine: require('./assets/team-logos/f1-2026-alpine.webp'),
  haas: require('./assets/team-logos/f1-2026-haas.webp'),
  audi: require('./assets/team-logos/f1-2026-audi.webp'),
  williams: require('./assets/team-logos/f1-2026-williams.webp'),
  aston: require('./assets/team-logos/f1-2026-aston.webp'),
  cadillac: require('./assets/team-logos/f1-2026-cadillac.webp'),
};
const teamLogoSizes = {
  row: { width: 40, height: 40, borderRadius: 20 },
  standing: { width: 36, height: 36, borderRadius: 18 },
  timing: { width: 26, height: 26, padding: 0, borderWidth: 0, borderRadius: 13 },
  result: { width: 26, height: 26, padding: 1, borderWidth: 0, borderRadius: 13 },
  podium: { width: 28, height: 28, padding: 0, borderWidth: 0, borderRadius: 14 },
  profile: { width: 56, height: 56, borderRadius: 28 },
  card: { width: 48, height: 48, borderRadius: 24, padding: 8, borderWidth: 0 },
};
type TeamLogoSize = keyof typeof teamLogoSizes;

function TeamLogo({ teamId, size = 'row', inverse = false, plain = false }: { teamId: string; size?: TeamLogoSize; inverse?: boolean; plain?: boolean }) {
  const logoId = teamLogoAliases[teamId] ?? teamId;
  const xml = teamLogoXml[logoId];
  const image = inverse ? teamLogoWhiteImages[logoId] ?? teamLogoImages[logoId] : teamLogoImages[logoId];
  const tile = teamLogoTiles[logoId] ?? C.white;
  if (!image && !xml) return null;
  return (
    <View style={[styles.teamLogoBadge, teamLogoSizes[size], plain ? styles.teamLogoPlain : { backgroundColor: inverse ? 'rgba(0,0,0,0.24)' : tile, borderColor: inverse ? 'transparent' : tile === C.white ? C.line : tile }]}>
      {image ? <Image source={image} style={styles.teamLogoImage} resizeMode="contain" /> : xml ? <SvgCss xml={xml} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" /> : null}
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

function DriverCountryFlag({ country }: { country: string }) {
  const code = driverCountryFlags[country];
  return code ? <View accessibilityLabel={`${country}国旗`} style={styles.driverCountryFlag}><Svg width="24" height="16" viewBox="0 0 36 24">{flagArt(code)}<Rect width="36" height="24" fill="none" stroke="#000" strokeOpacity=".08" /></Svg></View> : null;
}

function DriverListCard({ driver, onPress, column = false }: { driver: Driver; onPress: () => void; column?: boolean }) {
  const { teams } = useSeason();
  const compact = useWindowDimensions().width < 600;
  const team = TeamFor(driver.teamId, teams);
  const textColor = isLightTeamColor(team.color) ? C.ink : C.white;
  return (
    <View style={[styles.driverListItem, compact && styles.driverListItemCompact, { width: column ? '48%' : '100%' }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${driver.name}车手详情`} onPress={onPress} style={[styles.driverListCard, { backgroundColor: team.color }]}>
        <View pointerEvents="none" style={[styles.driverListNumberBack, compact && styles.driverListNumberBackCompact]}>
          {String(driver.number).split('').map((digit, index) => <Text key={index} style={[styles.driverListNumberBackText, compact && styles.driverListNumberBackTextCompact, { color: textColor }]}>{digit}</Text>)}
        </View>
        <DriverPortrait driver={driver} variant="list" />
        <View style={[styles.driverListCopy, compact && styles.driverListCopyCompact]}>
          <Text style={[styles.driverListName, compact && styles.driverListNameCompact, { color: textColor }]} numberOfLines={2}>{driver.name}</Text>
          <Text style={[styles.driverListTeam, { color: textColor }]} numberOfLines={1}>{team.name}{driver.seasonStatus === 'substitute' ? ' · 本季代班' : ''}</Text>
          <Text style={[styles.driverListNumber, compact && styles.driverListNumberCompact, { color: textColor }]}>{driver.number}</Text>
          <View style={styles.driverListFlag}><DriverCountryFlag country={driver.country} /></View>
        </View>
      </Pressable>
    </View>
  );
}

function TeamRow({ team, onPress, favorite, onFavorite }: { team: Team; onPress: () => void; favorite?: boolean; onFavorite?: () => void }) {
  return (
    <View style={styles.personRow}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.rowMain}>
        <TeamLogo teamId={team.id} size="row" />
        <View style={styles.rowCopy}><Text style={styles.rowTitle}>{team.name}</Text><Text style={styles.rowSub}>{team.short} · {team.base}</Text></View>
        <Text style={styles.teamPoints}>{team.points ?? '—'}{team.points !== null ? <Text style={styles.pointsUnit}> 分</Text> : null}</Text>
      </Pressable>
      {onFavorite ? <FavoriteButton active={Boolean(favorite)} onPress={onFavorite} /> : null}
    </View>
  );
}

function TeamCard({ team, drivers, compact, favorite, onFavorite, onPress }: { team: Team; drivers: Driver[]; compact: boolean; favorite: boolean; onFavorite: () => void; onPress: () => void }) {
  const teamDrivers = drivers.filter((driver) => driver.teamId === team.id && driver.seasonStatus !== 'substitute').slice(0, 2);
  const carImage = teamCarImages[team.id];
  const textColor = isLightTeamColor(team.color) ? C.ink : C.white;
  return (
    <View style={[styles.teamCard, { width: compact ? '100%' : '48%', aspectRatio: compact ? 1.6 : 2.5, backgroundColor: team.color }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${team.name}车队，${teamDrivers.map((driver) => driver.name).join('、')}，查看车队资料`} onPress={onPress} style={styles.teamCardMain}>
        {carImage ? <Image accessibilityLabel={`${team.name} 2026赛车`} source={carImage} resizeMode="contain" style={styles.teamCardCar} /> : teamDrivers.map((driver, index) => <DriverPortrait key={driver.id} driver={driver} variant="team" index={index} />)}
        <View style={styles.teamCardHeader}>
          <View style={styles.teamCardTitleBlock}>
            <Text style={[styles.teamCardName, { color: textColor }]} numberOfLines={1}>{team.name}</Text>
            <Text style={[styles.teamCardCode, { color: textColor }]} numberOfLines={1}>{team.short}</Text>
          </View>
          <TeamLogo teamId={team.id} size="card" />
        </View>
        <View style={styles.teamCardDrivers}>
          {teamDrivers.map((driver) => <Text key={driver.id} style={[styles.teamCardDriver, { color: textColor }]} numberOfLines={1}>{driver.name} <Text style={styles.teamCardDriverCode}>{driver.code}</Text></Text>)}
        </View>
      </Pressable>
      <View style={styles.teamCardFooter}>
        <Text style={[styles.teamCardBase, { color: textColor }]} numberOfLines={1}>{team.base}</Text>
        <Text style={[styles.teamCardPoints, { color: textColor }]}>{team.points ?? '—'}<Text style={styles.teamCardPointsLabel}> PTS</Text></Text>
        <FavoriteButton active={favorite} onPress={onFavorite} color={textColor} />
      </View>
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

function SettingsPage({ themeMode, onThemeModeChange }: { themeMode: ThemeMode; onThemeModeChange: (mode: ThemeMode) => void }) {
  const themeDescription = themeMode === 'system'
    ? '跟随设备外观，并在系统主题变化时自动切换。'
    : themeMode === 'light' ? '日间模式已启用。' : '夜间模式已启用。';
  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="F1 · 偏好设置" title="设置" />
      <View style={styles.settingsCard}>
        <View style={styles.settingsHeader}>
          <View style={styles.settingsIcon}><Glyph path="M12 3v2m0 14v2m9-9h-2M5 12H3m15.4-6.4-1.4 1.4M7 17l-1.4 1.4m12.8 0L17 17M7 7 5.6 5.6M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" color={C.red} size={20} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingsTitle}>外观模式</Text>
            <Text style={styles.settingsDescription}>选择应用的显示主题</Text>
          </View>
        </View>
        <Segment items={[{ id: 'system', label: '跟随系统' }, { id: 'light', label: '日间模式' }, { id: 'dark', label: '夜间模式' }]} selected={themeMode} onSelect={onThemeModeChange} />
        <Text style={styles.settingsHint}>{themeDescription}</Text>
      </View>
    </ScrollView>
  );
}

function HomePage({ onOpenRace, onGoSchedule, active }: { onOpenRace: (race: Race) => void; onGoSchedule: () => void; active: boolean }) {
  const { races, drivers, teams, resultsBySession, status, loadSessionResults, reload } = useSeason();
  const [now, setNow] = useState(Date.now());
  const [refreshingResults, setRefreshingResults] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  const timedSessions = races.flatMap((race) => race.sessions.map((session) => ({
    race,
    session,
    start: Date.parse(session.at),
    end: Date.parse(session.endsAt ?? ''),
  })));
  const currentSession = timedSessions.find(({ start, end }) => start <= now && now < end);
  const currentRace = currentSession?.race ?? races.find((race) => {
    const firstStart = Date.parse(race.sessions[0]?.at ?? '');
    const raceEnd = Date.parse(race.sessions.find((session) => session.name === '正赛')?.endsAt ?? '');
    return firstStart <= now && now < raceEnd;
  });
  const currentWeekendNextSession = currentRace?.sessions.find((session) => Date.parse(session.at) > now);
  const latestFinishedRace = races.flatMap((race) => {
    const session = race.sessions.find((item) => item.name === '正赛');
    const end = Date.parse(session?.endsAt ?? '');
    return session && end <= now && now - end < 24 * 60 * 60 * 1000 ? [{ race, session, end }] : [];
  }).sort((a, b) => b.end - a.end)[0];
  const nextRace = races.find((race) => race.id !== currentRace?.id && (
    race.sessions.some((session) => Date.parse(session.at) > now) || (!race.sessions.length && !race.finished)
  ));
  const nextRaceSession = nextRace?.sessions.find((session) => Date.parse(session.at) > now) ?? nextRace?.sessions[0];
  const featuredRace = currentRace ?? latestFinishedRace?.race ?? nextRace;
  const featuredSession = currentRace ? currentSession?.session ?? currentWeekendNextSession : latestFinishedRace?.session ?? nextRaceSession;
  const recentResultKey = latestFinishedRace?.session.id;
  const recentResults = recentResultKey ? resultsBySession[recentResultKey] ?? [] : [];
  const podiumResults = [2, 1, 3].map((position) => recentResults.find((result) => result.position === position));
  const hasPodium = podiumResults.every((result) => result && drivers.some((driver) => driver.id === result.driverId && (driver.headshotUrl || f1Portrait(driver.code))));

  useEffect(() => {
    if (!active || !latestFinishedRace?.session.id || resultsBySession[latestFinishedRace.session.id]) return;
    void loadSessionResults(latestFinishedRace.session.id, latestFinishedRace.session.name).catch(() => undefined);
  }, [active, latestFinishedRace?.session.id, latestFinishedRace?.session.name, loadSessionResults, resultsBySession]);

  const refreshRecentResults = async () => {
    if (!recentResultKey || !latestFinishedRace) return;
    setRefreshingResults(true);
    try {
      await loadSessionResults(recentResultKey, latestFinishedRace.session.name, true);
    } catch {
      // Keep the last known result state visible when refresh fails.
    } finally {
      setRefreshingResults(false);
    }
  };

  const countdownStart = Date.parse((currentRace ? currentWeekendNextSession : nextRaceSession)?.at ?? '');
  const countdownSeconds = Number.isFinite(countdownStart) ? Math.max(0, Math.floor((countdownStart - now) / 1000)) : 0;
  const countdown = [Math.floor(countdownSeconds / 86400), Math.floor(countdownSeconds / 3600) % 24, Math.floor(countdownSeconds / 60) % 60, countdownSeconds % 60];
  const heroImage = featuredRace ? circuitImageUrl(featuredRace) : undefined;
  const showsPreviousResult = !currentRace && Boolean(latestFinishedRace && featuredRace?.id === latestFinishedRace.race.id);
  const showsNextPreview = Boolean(nextRace && nextRace.id !== featuredRace?.id);

  return (
    <ScrollView style={styles.homePage} contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
      <View style={styles.homeHeader}>
        <View><Text style={styles.homeEyebrow}>F1 · 2026 SEASON</Text><Text style={styles.homeTitle}>首页</Text></View>
        <Pressable accessibilityRole="button" onPress={onGoSchedule} style={styles.homeScheduleLink}><Glyph path={navItems[1].icon} color={C.red} size={16} /><Text style={styles.homeScheduleLinkText}>赛事列表 ›</Text></Pressable>
      </View>

      {featuredRace ? <>
        <View style={styles.homeHero}>
          <View style={styles.homeHeroTop}>
            <Text style={styles.homeHeroKicker}>第 {String(featuredRace.round).padStart(2, '0')} 站 · {currentRace ? currentSession ? '正在进行' : '赛事周末' : showsPreviousResult ? '上一站赛果' : '下一站'}</Text>
            {currentRace ? <View style={styles.homeLiveBadge}><View style={styles.homeLiveDot} /><Text style={styles.homeLiveBadgeText}>{currentSession ? 'LIVE' : 'RACE WEEKEND'}</Text></View> : null}
          </View>
          <View style={styles.homeHeroBody}>
            <View style={styles.homeHeroCopy}>
              <Text style={styles.homeHeroTitle}>{featuredRace.name}</Text>
              <View style={styles.homeHeroVenue}><CountryFlag race={featuredRace} /><View style={styles.homeHeroVenueCopy}><Text style={styles.homeHeroVenueName}>{featuredRace.venue}</Text><Text style={styles.homeHeroCountry}>{featuredRace.country}</Text></View></View>
              <Text style={styles.homeHeroDate}>{featuredRace.dates || '赛程日期待同步'}</Text>
            </View>
            {heroImage ? <Image accessibilityLabel={`${featuredRace.venue}赛道轮廓`} source={{ uri: heroImage }} resizeMode="contain" style={styles.homeCircuitImage} /> : null}
          </View>
          <Pressable accessibilityRole="button" onPress={() => onOpenRace(featuredRace)} style={styles.homePrimaryButton}><Text style={styles.homePrimaryButtonText}>{showsPreviousResult ? '查看完整赛果' : '查看赛事详情'}</Text><Text style={styles.homePrimaryButtonArrow}>›</Text></Pressable>

          {currentRace ? <View style={styles.homeCurrentSession}>
            <Text style={styles.homeCurrentLabel}>{currentSession ? '当前场次' : '周末下一场'}</Text>
            <Text style={styles.homeCurrentName}>{currentSession?.session.name ?? currentWeekendNextSession?.name ?? '赛程安排'}</Text>
            {featuredSession ? <Text style={styles.homeCurrentTime}>{formatTime(featuredSession.at)}{featuredSession.endsAt ? ` — ${formatTime(featuredSession.endsAt)}` : ''} · 本地时间</Text> : null}
            {currentSession ? <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(F1_LIVE_TIMING_URL).catch(() => undefined); }} style={styles.homeOfficialLink}><Text style={styles.homeOfficialLinkText}>打开 F1 官方实时计时 ↗</Text></Pressable> : null}
          </View> : showsPreviousResult ? <View style={styles.homeResults}>
            {hasPodium ? <View style={styles.homePodium}>{podiumResults.map((result) => {
              if (!result) return null;
              const driver = drivers.find((item) => item.id === result.driverId);
              if (!driver) return null;
              const team = result.teamId ? teams.find((item) => item.id === result.teamId)
                : driver.code === 'LAW' || driver.code === 'TSU' ? undefined : TeamFor(driver.teamId, teams);
              const portraitDriver = driver.headshotUrl ? driver : { ...driver, headshotUrl: f1Portrait(driver.code) };
              const winner = result.position === 1;
              return <View key={result.driverId} style={[styles.homePodiumCard, winner && styles.homePodiumCardWinner]}>
                <Text style={[styles.homePodiumRank, winner && styles.homePodiumRankWinner]}>{String(result.position).padStart(2, '0')}</Text>
                <View style={[styles.homePodiumPhoto, winner && styles.homePodiumPhotoWinner, { backgroundColor: team?.color ?? '#E7E7E7' }]}><DriverPortrait driver={portraitDriver} variant="podium" /></View>
                <Text numberOfLines={1} style={styles.homePodiumName}>{driver.name}</Text>
                {team ? <TeamLogo teamId={team.id} size="podium" plain /> : null}
                <Text style={[styles.homePodiumPoints, winner && styles.homePodiumPointsWinner]}>{result.points != null ? `${result.points}分` : result.gap}</Text>
              </View>;
            })}</View> : <View style={styles.homeResultEmpty}><Text style={styles.homeResultEmptyText}>{status === 'loading' ? '正在同步前三名与车手照片…' : '前三名赛果或车手照片暂未同步'}</Text>{status !== 'loading' ? <Pressable accessibilityRole="button" disabled={refreshingResults} onPress={() => void refreshRecentResults()}><Text style={styles.homeRetryText}>{refreshingResults ? '正在刷新…' : '重新获取赛果 ↻'}</Text></Pressable> : null}</View>}
          </View> : featuredSession ? <View style={styles.homeCountdown}>
            <Text style={styles.homeCurrentLabel}>{currentRace ? '距离下一场' : '距离首场练习'}</Text>
            {countdown.map((value, index) => <View key={index} style={styles.homeCountdownCell}><Text style={styles.homeCountdownValue}>{String(value).padStart(2, '0')}</Text><Text style={styles.homeCountdownUnit}>{['天', '时', '分', '秒'][index]}</Text></View>)}
          </View> : <Text style={styles.homeSchedulePending}>详细场次时间联网同步后显示</Text>}
        </View>

        <View style={styles.homeSectionHeading}><View><Text style={styles.homeSectionTitle}>赛事时间安排</Text><Text style={styles.homeSectionSubtitle}>{featuredRace.dates || '日期待同步'} · 手机本地时间</Text></View><Text style={styles.homeSectionMark}>◷</Text></View>
        {featuredRace.sessions.length ? Array.from(new Set(featuredRace.sessions.map((session) => session.day))).map((day) => (
          <View key={day} style={styles.homeDayGroup}>
            <Text style={styles.homeDayTitle}>{day}</Text>
            {featuredRace.sessions.filter((session) => session.day === day).map((session) => {
              const isActive = currentSession?.session === session;
              const isEnded = session.endsAt ? Date.parse(session.endsAt) <= now : Boolean(session.ended);
              const dotColor = session.name.includes('冲刺') ? '#C34BF2' : session.name.includes('练') ? '#F0CB35' : '#24C77B';
              return <View key={session.id ?? `${session.name}-${session.at}`} style={[styles.homeSessionRow, isActive && styles.homeSessionRowActive]}>
                <View style={[styles.homeSessionDot, { backgroundColor: dotColor }]} />
                <View style={styles.homeSessionCopy}><Text style={styles.homeSessionName}>{session.name}</Text>{isActive ? <Text style={styles.homeSessionStatus}>正在进行</Text> : isEnded ? <Text style={styles.homeSessionStatus}>已结束</Text> : null}</View>
                <Text style={[styles.homeSessionTime, { color: dotColor }]}>{formatTime(session.at)}{session.endsAt ? ` — ${formatTime(session.endsAt)}` : ''}</Text>
              </View>;
            })}
          </View>
        )) : <View style={styles.homeSchedulePendingCard}><Text style={styles.homeSchedulePending}>赛历快照暂不包含分场时间</Text><Pressable accessibilityRole="button" onPress={reload}><Text style={styles.homeRetryText}>重新同步赛程 ↻</Text></Pressable></View>}

        {showsNextPreview && nextRace ? <View style={styles.homeNextSection}>
          <View style={styles.homeSectionHeading}><View><Text style={styles.homeSectionTitle}>下一站预告</Text><Text style={styles.homeSectionSubtitle}>NEXT GRAND PRIX</Text></View><Text style={styles.homeSectionMark}>↗</Text></View>
          <Pressable accessibilityRole="button" onPress={() => onOpenRace(nextRace)} style={styles.homeNextCard}>
            <CountryFlag race={nextRace} />
            <View style={styles.homeNextCopy}><Text style={styles.homeNextTitle}>{nextRace.name}</Text><Text style={styles.homeNextVenue}>{nextRace.venue} · {nextRace.country}</Text><Text style={styles.homeNextDate}>{nextRace.dates}{nextRaceSession ? ` · ${formatTime(nextRaceSession.at)}` : ''}</Text></View>
            <Text style={styles.homeNextArrow}>›</Text>
          </Pressable>
        </View> : null}
      </> : <View style={styles.homeEmpty}><Text style={styles.homeSectionTitle}>暂无可显示的赛程</Text><Text style={styles.homeSectionSubtitle}>连接赛季数据后，这里会显示正在进行的赛事、赛果和下一站预告。</Text><Pressable accessibilityRole="button" onPress={reload} style={styles.homePrimaryButton}><Text style={styles.homePrimaryButtonText}>重新同步赛程</Text></Pressable></View>}
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
          const teamColorText = tab === 'teams' && !isLightTeamColor(team.color) ? C.white : C.ink;
          return (
            <Pressable key={id} accessibilityRole="button" onPress={() => driver ? onOpenDriver(driver.id) : onOpenTeam(id)} style={[styles.standingRow, tab === 'teams' && { backgroundColor: team.color }]}>
              <Text style={[styles.rankNumber, index < 3 && styles.rankNumberTop, tab === 'teams' && { color: teamColorText }]}>{String(index + 1).padStart(2, '0')}</Text>
              <TeamLogo teamId={team.id} size="standing" />
              <View style={styles.standingCopy}>
                <Text style={[styles.standingName, tab === 'teams' && { color: teamColorText }]}>{driver ? driver.name : (row as Team).name}</Text>
                <Text style={[styles.standingSub, tab === 'teams' && { color: teamColorText, opacity: 0.78 }]}>{driver ? team.name + ' · ' + driver.code : team.short}</Text>
              </View>
              <Text style={[styles.standingPoints, tab === 'teams' && { color: teamColorText }]}>{row.points ?? '—'}</Text>
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
  const { width: viewportWidth } = useWindowDimensions();
  const driverListWidth = Math.max(0, Math.min(viewportWidth - (viewportWidth >= 620 ? 70 : 0), 680) - 32);
  const compactLayout = viewportWidth < 600;
  return (
    <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="PADDOCK DIRECTORY" title="资料库" />
      <DemoNotice />
      <Text style={styles.libraryIntro}>按车手、车队或赛道浏览本赛季资料。</Text>
      <Segment items={[{ id: 'drivers', label: '车手' }, { id: 'teams', label: '车队' }, { id: 'tracks', label: '赛道' }]} selected={tab} onSelect={onTabChange} />
      <MotionPanel motionKey={tab}>
        {tab === 'drivers' ? drivers.length ? <View style={[styles.driverListContainer, { width: driverListWidth }]}>{drivers.map((driver) => <DriverListCard key={driver.id} driver={driver} onPress={() => onOpenDriver(driver.id)} />)}</View> : <Text style={styles.disclaimer}>本赛季车手名单暂不可用。</Text> : null}
        {tab === 'teams' ? teams.length ? <>
          <View style={styles.teamListHeading}><Text style={styles.teamListTitle}>F1 2026 · 车队</Text><Text style={styles.teamListCount}>{teams.length} TEAMS</Text></View>
          <View style={styles.teamGrid}>
            {teams.map((team) => <TeamCard key={team.id} team={team} drivers={drivers} compact={compactLayout} onPress={() => onOpenTeam(team.id)} favorite={favorites.includes(team.id)} onFavorite={() => onToggle(team.id)} />)}
          </View>
        </> : <Text style={styles.disclaimer}>本赛季车队名单暂不可用。</Text> : null}
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
            const isSubstitute = result.driverId === 'driver-22' || driver?.code === 'LAW' || driver?.code === 'TSU';
            const resultTeamId = result.teamId ?? (isSubstitute ? undefined : driver?.teamId);
            const team = resultTeamId ? teams.find((item) => item.id === resultTeamId) : undefined;
            const statusLabel = result.status === 'dnf' ? ' · 退赛' : result.status === 'dns' ? ' · 未发车' : result.status === 'dsq' ? ' · 取消资格' : '';
            const positionLabel = result.position < 99 ? String(result.position).padStart(2, '0') : result.status.toUpperCase();
            const driverName = result.driverName ?? driver?.name ?? (result.driverId === 'driver-22' ? driverNames.TSU : `车手 #${result.driverId.replace('driver-', '')}`);
            const driverMeta = `${driverName}${result.fastestLap ? ' · 最快圈' : ''}${statusLabel}`;
            return <Pressable key={`${result.driverId}-${result.position}`} disabled={!driver} accessibilityRole="button" accessibilityLabel={`${positionLabel} ${driverName} ${team?.name ?? ''}${statusLabel} ${result.gap}`} onPress={() => driver && onOpenDriver(driver.id)} style={styles.resultRow}><Text style={styles.resultPosition}>{positionLabel}</Text>{team ? <TeamLogo teamId={team.id} size="result" /> : null}<View style={styles.resultDriverCopy}><Text style={styles.resultDriverCode}>{result.driverCode ?? driver?.code ?? (result.driverId === 'driver-22' ? 'TSU' : '—')}</Text><Text style={styles.resultTeamName} numberOfLines={1}>{driverMeta}</Text></View><Text style={[styles.resultGapValue, (result.status === 'dnf' || result.status === 'dns' || result.status === 'dsq') && styles.retiredText]}>{result.gap}</Text><Text style={styles.resultPointValue}>{result.points ?? '—'}</Text></Pressable>;
          })}
          {dataSource !== 'calendar' && (resultState !== 'ready' || results.length === 0) ? <View style={styles.upcomingNote}><Text style={styles.upcomingNoteTitle}>{resultState === 'loading' ? '正在载入场次成绩' : resultState === 'error' ? '暂无已缓存的本场成绩' : '暂无已公布成绩'}</Text><Text style={styles.upcomingNoteCopy}>{resultState === 'error' ? 'OpenF1 当前不可用，连接恢复后点上方状态重试。' : '成绩会在官方发布后由 OpenF1 更新。'}</Text></View> : null}
        </MotionPanel> : <View style={styles.upcomingNote}><Text style={styles.upcomingNoteTitle}>本场尚未结束</Text><Text style={styles.upcomingNoteCopy}>场次成绩会在活动结束并公布后显示。</Text></View>}
      </>}
    </ScrollView>
  );
}

function DetailHeader({ title, subtitle, onBack, favorite, onToggleFavorite, dark = false }: { title: string; subtitle: string; onBack: () => void; favorite?: boolean; onToggleFavorite?: () => void; dark?: boolean }) {
  return (
    <View style={[styles.detailHeader, dark && styles.detailHeaderDark]}>
      <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={onBack} style={[styles.backButton, dark && styles.backButtonDark]}><Text style={[styles.backArrow, dark && styles.backArrowDark]}>‹</Text></Pressable>
      <View style={styles.detailHeaderCopy}><Text style={[styles.detailHeaderTitle, dark && styles.detailHeaderTitleDark]}>{title}</Text><Text style={[styles.detailHeaderSubtitle, dark && styles.detailHeaderSubtitleDark]}>{subtitle}</Text></View>
      {typeof favorite === 'boolean' && onToggleFavorite ? <FavoriteButton active={favorite} onPress={onToggleFavorite} /> : null}
    </View>
  );
}

function DriverPortrait({ driver, variant = 'detail', index = 0 }: { driver: Driver; variant?: 'list' | 'detail' | 'team' | 'podium'; index?: number }) {
  const [attempt, setAttempt] = useState(0);
  const compact = useWindowDimensions().width < 600;
  const sourceUrl = driver.headshotUrl;
  const hasFallback = variant === 'podium' || (sourceUrl?.endsWith('.transform/1col/image.png') ?? false);
  if (!sourceUrl || attempt > (hasFallback ? 1 : 0)) return null;
  const imageUrl = variant === 'podium'
    ? attempt === 0
      ? sourceUrl.replace('/image/upload/c_lfill,w_440/q_auto/', '/image/upload/c_fill,w_440,h_320,g_north/q_auto/')
      : sourceUrl
    : attempt === 0
      ? sourceUrl.replace(/\.transform\/1col\/image\.png$/, '')
      : sourceUrl.replace(/\.transform\/1col\/image\.png$/, '.transform/4col/image.png');
  const image = <Animated.Image accessibilityLabel={`${driver.name}车手照片`} source={{ uri: imageUrl }} resizeMode={variant === 'team' ? 'contain' : 'cover'} style={[styles.driverPortrait, variant === 'podium' ? styles.homePodiumPortrait : variant === 'team' ? styles.teamCardPortrait : variant === 'list' ? compact ? styles.driverListPortraitCompact : styles.driverListPortrait : compact ? styles.driverPortraitStandardCompact : styles.driverPortraitStandard, variant === 'team' && index === 1 && styles.teamCardPortraitSecond]} onError={() => setAttempt((current) => current + 1)} />;
  return variant === 'detail' ? <View pointerEvents="none" style={styles.driverPortraitStage}>{image}</View> : image;
}

function isLightTeamColor(color: string) {
  const hex = color.replace('#', '');
  const [red, green, blue] = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  return (red * 299 + green * 587 + blue * 114) / 1000 >= 155;
}

function ProfileDetail({ detail, onBack, favorite, onToggle, onOpenDriver, onOpenTeam }: { detail: Detail; onBack: () => void; favorite: boolean; onToggle: (id: string) => void; onOpenDriver: (id: string) => void; onOpenTeam: (id: string) => void }) {
  const { races, drivers, teams } = useSeason();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const compact = screenWidth < 600 || screenHeight < 600;
  const posterHeight = compact ? Math.min(620, Math.max(380, Math.round(screenHeight * 0.58))) : 620;
  const driverScrollRef = useRef<ScrollView>(null);
  const [driverStatsOffset, setDriverStatsOffset] = useState(0);
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
  const driverNumberColor = C.ink;
  const driverProfile: DriverProfile | undefined = driver ? driverProfiles.find((item) => item.code === driver.code) : undefined;
  const driverSignature = driverProfile?.source.split('/').pop()?.split('-')[0];
  const teamProfile: TeamProfile | undefined = teamProfiles.find((item) => item.id === team.id);
  const teamDrivers = drivers.filter((item) => item.teamId === team.id && item.seasonStatus !== 'substitute');
  const teamHeroTextColor = isLightTeamColor(team.color) ? C.ink : C.white;
  const statValues = (stats: DriverProfile['season'] | TeamProfile['season']) => [
    { label: '大奖赛场次', value: stats.races }, { label: '分站胜利', value: stats.wins },
    { label: '领奖台', value: stats.podiums }, { label: '杆位', value: stats.poles },
    { label: '最快圈', value: stats.fastestLaps },
  ];
  return (
    <View style={[styles.profileScreen, detail.kind === 'team' && styles.teamProfileScreen]}>
      {driver ? <View style={[styles.driverDetailTopBar, compact && styles.driverDetailTopBarCompact]}>
        <Pressable accessibilityRole="button" accessibilityLabel="返回车手列表" onPress={onBack} style={styles.driverDetailBack}><Text style={styles.driverDetailTopText}>‹ 车手列表</Text></Pressable>
        <View style={styles.driverDetailActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="查看统计" onPress={() => driverScrollRef.current?.scrollTo({ y: driverStatsOffset, animated: true })} style={styles.driverDetailStats}><Text style={styles.driverDetailTopText}>统计⌄</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="关闭车手详情" onPress={onBack} hitSlop={10} style={styles.driverDetailClose}><Text style={styles.driverDetailCloseText}>×</Text></Pressable>
        </View>
      </View> : null}
      <ScrollView ref={driver ? driverScrollRef : undefined} style={styles.profileScroll} contentContainerStyle={driver ? styles.driverPageContent : styles.pageContent} showsVerticalScrollIndicator={false}>
      {driver ? null : <DetailHeader title="全部车队" subtitle={`${team.name} · 2026 TEAM PROFILE`} onBack={onBack} dark />}
      {driver ? <>
        <View style={[styles.driverPoster, compact && styles.driverPosterCompact, { height: posterHeight, backgroundColor: team.color }]}>
          <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={styles.driverPosterGradient}>
            <Defs>
              <LinearGradient id="driver-poster-gradient" x1="0" y1="0" x2="1" y2="0"><Stop offset="0%" stopColor={C.ink} stopOpacity="0.42" /><Stop offset="48%" stopColor={C.ink} stopOpacity="0.12" /><Stop offset="100%" stopColor={C.white} stopOpacity="0.03" /></LinearGradient>
              <Pattern id="driver-poster-dots" width="3" height="3" patternUnits="userSpaceOnUse"><Circle cx="1.5" cy="1.5" r="0.3" fill={C.ink} opacity="0.24" /></Pattern>
            </Defs>
            <Rect width="100" height="100" fill={team.color} />
            <Rect width="100" height="100" fill="url(#driver-poster-gradient)" />
            <Rect width="100" height="24" fill="url(#driver-poster-dots)" opacity="0.48" />
            <Rect y="24" width="11" height="58" fill="url(#driver-poster-dots)" opacity="0.38" />
            <Rect x="89" y="24" width="11" height="58" fill="url(#driver-poster-dots)" opacity="0.38" />
            <SvgText x="50" y="72" textAnchor="middle" fontSize={driver.number < 10 ? 112 : 82} fontWeight="900" fontStyle="italic" fill={driverNumberColor} fillOpacity="0.16">{driver.number}</SvgText>
          </Svg>
          <DriverPortrait key={driver.id} driver={driver} variant="detail" />
          <Svg pointerEvents="none" width="100%" height="45%" viewBox="0 0 100 100" preserveAspectRatio="none" style={styles.driverPosterFade}>
            <Defs><LinearGradient id="driver-portrait-fade" x1="0" y1="0" x2="0" y2="1"><Stop offset="0%" stopColor={C.ink} stopOpacity="0" /><Stop offset="100%" stopColor={C.ink} stopOpacity="0.78" /></LinearGradient></Defs>
            <Rect width="100" height="100" fill="url(#driver-portrait-fade)" />
          </Svg>
          <View style={[styles.driverPosterInfo, compact && styles.driverPosterInfoCompact]}>
            {driverSignature ? <Text accessibilityLabel={`${driver.name}的手写风格英文名`} style={[styles.driverPosterSignature, compact && styles.driverPosterSignatureCompact]}>{driverSignature[0].toUpperCase() + driverSignature.slice(1)}</Text> : null}
            <Text style={[styles.driverPosterName, compact && styles.driverPosterNameCompact]} numberOfLines={2}>{driver.name}</Text>
            <View style={[styles.driverPosterMeta, compact && styles.driverPosterMetaCompact]}>
              <View style={styles.driverPosterCountry}><DriverCountryFlag country={driver.country} /><Text style={[styles.driverPosterMetaText, compact && styles.driverPosterMetaTextCompact]}>{driver.country}</Text></View>
              <View style={styles.driverPosterDivider} />
              <Pressable accessibilityRole="button" accessibilityLabel={`查看${team.name}车队资料`} onPress={() => onOpenTeam(team.id)}><Text style={[styles.driverPosterMetaText, compact && styles.driverPosterMetaTextCompact]}>{team.name}</Text></Pressable>
              <View style={styles.driverPosterDivider} />
              <Text style={[styles.driverPosterMetaText, compact && styles.driverPosterMetaTextCompact]}>{driver.number}</Text>
            </View>
          </View>
        </View>
        <View style={styles.driverNoticeWrap}><DemoNotice /></View>
      </> : <>
        <View style={styles.teamHero}>
          <View style={[styles.teamHeroStage, { height: compact ? 220 : Math.min(430, Math.max(290, Math.round(screenWidth * 0.28))), backgroundColor: team.color }]}>
            <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={styles.teamHeroArtwork}>
              <Defs>
                <LinearGradient id={`team-detail-gradient-${team.id}`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor={team.color} stopOpacity="0.12" /><Stop offset="100%" stopColor="#000000" stopOpacity="0.42" /></LinearGradient>
                <Pattern id={`team-detail-dots-${team.id}`} width="2.5" height="2.5" patternUnits="userSpaceOnUse"><Circle cx="1.25" cy="1.25" r="0.32" fill={C.white} opacity="0.5" /></Pattern>
              </Defs>
              <Rect width="100" height="100" fill={`url(#team-detail-gradient-${team.id})`} />
              <Rect width="100" height="100" fill={`url(#team-detail-dots-${team.id})`} opacity="0.38" />
              <SvgText x="50" y="61" textAnchor="middle" fontSize="35" fontWeight="900" fontStyle="italic" fill={C.white} fillOpacity="0.12">{team.short}</SvgText>
            </Svg>
            <View style={styles.teamHeroTop}>
              <View style={styles.teamHeroCopy}>
                <Text style={[styles.teamHeroEyebrow, { color: teamHeroTextColor }]}>{team.short} · 2026</Text>
                <Text numberOfLines={1} style={[styles.teamHeroFullName, { color: teamHeroTextColor }]}>{teamProfile?.fullName ?? team.name}</Text>
              </View>
              <FavoriteButton active={favorite} onPress={() => onToggle(team.id)} color={teamHeroTextColor} />
            </View>
            {teamCarImages[team.id] ? <Image accessibilityLabel={`${team.name} 2026赛车`} source={teamCarImages[team.id]} resizeMode="contain" style={styles.teamHeroCar} /> : null}
          </View>
          <View style={[styles.teamHeroTitleBand, { borderColor: team.color }]}>
            <View style={[styles.teamHeroSlash, { backgroundColor: team.color }]} />
            <Text numberOfLines={1} style={styles.teamHeroTitle}>{team.name}</Text>
            <View style={[styles.teamHeroSlash, { backgroundColor: team.color }]} />
          </View>
          <View style={[styles.teamHeroBrand, { backgroundColor: team.color }]}>
            <View pointerEvents="none" style={styles.teamHeroBrandShade} />
            <Text style={styles.teamHeroDriversLabel}>DRIVERS</Text>
            <View style={styles.teamHeroDriverNames}>
              {teamDrivers.length ? teamDrivers.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`查看${item.name}车手资料`} onPress={() => onOpenDriver(item.id)} style={styles.teamHeroDriverButton}><Text style={styles.teamHeroDriverName}>{item.name}</Text><Text style={styles.teamHeroDriverCode}>{item.code}</Text></Pressable>) : <Text style={styles.teamHeroDriverName}>暂无车手资料</Text>}
            </View>
            <TeamLogo teamId={team.id} size="result" inverse />
          </View>
        </View>
      </>}
      {driver ? <View style={styles.driverStatsSection} onLayout={({ nativeEvent }) => setDriverStatsOffset(nativeEvent.layout.y)}>
        {driverProfile ? <View style={styles.profileDataCard}>
          <Text style={styles.profileDataTitle}>2026 赛季统计</Text>
          <View style={styles.driverSeasonLeads}>
            <View style={styles.driverSeasonLead}><Text style={styles.driverSeasonLeadValue}>{driverProfile.points}</Text><Text style={styles.profileMetricLabel}>积分</Text></View>
            <View style={styles.driverSeasonLead}><Text style={styles.driverSeasonLeadValue}>{driverProfile.season.wins}</Text><Text style={styles.profileMetricLabel}>分站胜利</Text></View>
          </View>
          <View style={styles.driverSeasonGrid}>{[
            { label: '大奖赛场次', value: driverProfile.season.races }, { label: '领奖台', value: driverProfile.season.podiums },
            { label: '杆位', value: driverProfile.season.poles }, { label: '最快圈', value: driverProfile.season.fastestLaps },
          ].map((item) => <View key={item.label} style={styles.driverSeasonMetric}><Text style={styles.driverSeasonMetricValue}>{item.value}</Text><Text style={styles.profileMetricLabel}>{item.label}</Text></View>)}</View>
        </View> : null}
        {driverProfile ? <ProfileMetricCard title="F1 生涯累计" values={[
          { label: '大奖赛参赛', value: driverProfile.career.entered }, { label: '生涯积分', value: driverProfile.career.points },
          { label: '分站胜利', value: driverProfile.career.wins }, { label: '领奖台', value: driverProfile.career.podiums },
          { label: '杆位', value: driverProfile.career.poles }, { label: '世界冠军', value: driverProfile.career.titles },
        ]} /> : null}
        {driverProfile ? <SourceNote source={driverProfile.source} asOf={libraryStatsAsOf} /> : null}
      </View> : <>
        <View style={[styles.sectionHeading, styles.teamSectionHeading]}><Text style={[styles.sectionTitle, styles.teamSectionTitle]}>车手阵容</Text><Text style={styles.sectionMeta}>{teamDrivers.length} DRIVERS</Text></View>
        <View style={styles.teamDriversGrid}>{teamDrivers.map((item) => <DriverListCard key={item.id} driver={item} column={!compact} onPress={() => onOpenDriver(item.id)} />)}</View>
        <View style={styles.teamDetailNotice}><DemoNotice /></View>
        {teamProfile ? <>
          <ProfileMetricCard title="2026 赛季统计" values={[{ label: '车队积分', value: team.points ?? '—' }, ...statValues(teamProfile.season)]} />
          <ProfileMetricCard title="车队 F1 生涯累计" values={[
            { label: '大奖赛参赛', value: teamProfile.career.entered }, { label: '车队积分', value: teamProfile.career.points },
            { label: '分站胜利', value: teamProfile.career.wins }, { label: '领奖台', value: teamProfile.career.podiums },
            { label: '杆位', value: teamProfile.career.poles }, { label: '车队冠军', value: teamProfile.career.titles },
          ]} />
          <ProfileInfoCard title="车队资料" rows={[
            { label: '官方全名', value: teamProfile.fullName }, { label: '基地', value: teamProfile.base },
            { label: '车队负责人', value: teamProfile.principal }, { label: '技术负责人', value: teamProfile.technicalChief },
            { label: '底盘', value: teamProfile.chassis }, { label: '动力单元', value: teamProfile.powerUnit },
            { label: '首次参赛', value: teamProfile.firstEntry },
          ]} />
        </> : <ProfileInfoCard title="车队资料" rows={[{ label: '基地', value: team.base }]} />}
        {teamProfile ? <SourceNote source={teamProfile.source} asOf={libraryStatsAsOf} /> : null}
      </>}
      </ScrollView>
    </View>
  );
}

function App() {
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [resultsBySession, setResultsBySession] = useState<ResultsBySession>({});
  const [status, setStatus] = useState<SeasonContextValue['status']>('loading');
  const [errorHint, setErrorHint] = useState<string | null>(null);
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
    if (!refresh && cached && !needsEventTeamRefresh(cached)) return Promise.resolve(cached);
    const existingRequest = sessionRequestsRef.current.get(sessionKey);
    if (existingRequest) return existingRequest;
    const request = (async () => {
      if (!refresh) {
        const legacyCache = await readOpenF1ResultsCache(sessionKey);
        if (legacyCache && !needsEventTeamRefresh(legacyCache)) {
          saveSessionResults(sessionKey, legacyCache);
          return legacyCache;
        }
        const newlyCached = resultsBySessionRef.current[sessionKey];
        if (newlyCached && !needsEventTeamRefresh(newlyCached)) return newlyCached;
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
        setErrorHint(null);
        setStatus('live');
        persistSeasonCache(data, resultsBySessionRef.current, savedAt);
        const completedSessions = data.races.flatMap((race) => race.sessions
          .filter((session) => Boolean(session.id) && (session.ended ?? race.finished))
          .map((session) => ({ id: session.id!, name: session.name })));
        void (async () => {
          let lastRequestAt = 0;
          for (const session of completedSessions) {
            if (!active) return;
            if (resultsBySessionRef.current[session.id] && !needsEventTeamRefresh(resultsBySessionRef.current[session.id])) continue;
            const legacyCache = await readOpenF1ResultsCache(session.id);
            if (legacyCache && !needsEventTeamRefresh(legacyCache)) {
              saveSessionResults(session.id, legacyCache);
              continue;
            }
            if (!active || (resultsBySessionRef.current[session.id] && !needsEventTeamRefresh(resultsBySessionRef.current[session.id]))) continue;
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
          setErrorHint(describeOpenF1Error(error));
          setStatus(/Live F1 session in progress/i.test(message) || /OpenF1 .*: 40[13]\b/i.test(message) ? 'restricted' : 'offline');
        }
      });
    return () => { active = false; };
  }, [reloadKey, loadSessionResults, persistSeasonCache, saveSessionResults]);
  const value: SeasonContextValue = {
    ...(season ?? { races: offlineCalendarRaces, drivers: offlineLibraryDrivers, teams: offlineLibraryTeams }),
    resultsBySession,
    status,
    errorHint,
    dataSource,
    syncedAt,
    hasSeasonData: season !== null,
    reload: () => { setErrorHint(null); setStatus('loading'); setReloadKey((key) => key + 1); },
    saveSessionResults,
    loadSessionResults,
  };
  return <SafeAreaProvider><SeasonContext.Provider value={value}><AppContent /></SeasonContext.Provider></SafeAreaProvider>;
}

function AppContent() {
  const { races } = useSeason();
  const { width: viewportWidth } = useWindowDimensions();
  const systemColorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({ F1Signature: require('./assets/fonts/Caveat[wght].ttf') });
  const [section, setSection] = useState<Section>('home');
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('upcoming');
  const [standingsTab, setStandingsTab] = useState<StandingsTab>('drivers');
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('drivers');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailHistory, setDetailHistory] = useState<Detail[]>([]);
  const driverDetailOpen = detail?.kind === 'driver';
  const [favorites, setFavorites] = useState<string[]>([]);
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [storageReady, setStorageReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const isDarkTheme = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  // ponytail: this app has one theme root; use context-bound styles if it grows to multiple roots.
  styles = isDarkTheme ? darkStyles : lightStyles;
  C.canvas = isDarkTheme ? '#141619' : '#F5F6F7';
  C.muted = isDarkTheme ? '#AEB4BC' : '#7D858E';
  C.line = isDarkTheme ? '#383C42' : '#E8EAED';
  useEffect(() => {
    let active = true;
    const updateReduceMotion = (enabled: boolean) => {
      if (!active) return;
      setReduceMotion(enabled);
    };
    AccessibilityInfo.isReduceMotionEnabled().then(updateReduceMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', updateReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem('f1-demo-favorites-v1'), AsyncStorage.getItem('f1-theme-mode-v1')])
      .then(([favoritesValue, savedThemeMode]) => {
        if (favoritesValue) {
          try { setFavorites(JSON.parse(favoritesValue) as string[]); } catch { setFavorites([]); }
        }
        if (savedThemeMode === 'system' || savedThemeMode === 'light' || savedThemeMode === 'dark') setThemeMode(savedThemeMode);
      })
      .catch(() => setFavorites([]))
      .finally(() => setStorageReady(true));
  }, []);

  useEffect(() => {
    if (storageReady) AsyncStorage.setItem('f1-demo-favorites-v1', JSON.stringify(favorites)).catch(() => undefined);
  }, [favorites, storageReady]);

  useEffect(() => {
    if (storageReady) AsyncStorage.setItem('f1-theme-mode-v1', themeMode).catch(() => undefined);
  }, [themeMode, storageReady]);

  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme(themeMode === 'system' ? 'unspecified' : themeMode);
  }, [themeMode]);

  const toggleFavorite = (id: string) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const open = (next: Detail) => {
    if (detail) setDetailHistory((history) => [...history, detail]);
    setDetail(next);
  };
  const openDriver = (id: string) => open({ kind: 'driver', id });
  const openTeam = (id: string) => open({ kind: 'team', id });
  const goBack = () => {
    if (detailHistory.length > 0) {
      setDetail(detailHistory[detailHistory.length - 1]);
      setDetailHistory((history) => history.slice(0, -1));
    } else setDetail(null);
  };
  const goTo = (next: Section) => {
    setSection(next);
    setDetail(null);
    setDetailHistory([]);
  };

  if (!storageReady || !fontsLoaded) return <SafeAreaView style={styles.loading}><ActivityIndicator color={C.red} /><Text style={styles.loadingText}>正在载入赛季数据…</Text></SafeAreaView>;

  return (
    <MotionPreferenceContext.Provider value={reduceMotion}>
    <SafeAreaView style={[styles.safeArea, viewportWidth < 620 && styles.safeAreaMobile]}>
      <StatusBar style={isDarkTheme ? 'light' : 'dark'} />
      <View style={[styles.appRoot, viewportWidth < 620 && styles.appRootMobile]}>
        {!driverDetailOpen ? <View style={[styles.rail, viewportWidth < 620 && styles.bottomNav]}>
          {viewportWidth >= 620 ? <View style={styles.brandMark}><Text style={styles.brandF}>F</Text><View style={styles.brandSlash} /></View> : null}
          <View style={[styles.railNav, viewportWidth < 620 && styles.bottomNavItems]}>{navItems.map((item) => {
            const active = !detail && section === item.id;
            return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: active }} onPress={() => goTo(item.id)} style={[styles.railItem, viewportWidth < 620 && styles.bottomNavItem, active && styles.railItemActive]}><Glyph path={item.icon} color={active ? C.red : '#747D86'} size={19} /><Text style={[styles.railLabel, viewportWidth < 620 && styles.bottomNavLabel, active && styles.railLabelActive]}>{item.label}</Text></Pressable>;
          })}</View>
          {viewportWidth >= 620 ? <View style={styles.railFooter}><View style={styles.railFooterLine} /><Text style={styles.railFooterText}>26</Text></View> : null}
        </View> : null}
        <View style={[styles.mainPane, !detail && section === 'library' && libraryTab === 'teams' && viewportWidth >= 900 && { maxWidth: 1800 }, detail?.kind === 'team' && viewportWidth >= 900 && styles.teamDetailWidePane, driverDetailOpen && styles.driverFullScreenPane]}>
          <View style={styles.routeStack}>
            {(['home', 'schedule', 'live', 'favorites', 'standings', 'library', 'settings'] as Section[]).map((page) => {
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
                  {page === 'home' ? <HomePage active={active} onOpenRace={(race) => open({ kind: 'race', id: race.id })} onGoSchedule={() => goTo('schedule')} /> : null}
                  {page === 'schedule' ? <SchedulePage filter={scheduleFilter} onFilterChange={setScheduleFilter} onOpenRace={(race) => open({ kind: 'race', id: race.id })} /> : null}
                  {page === 'live' ? <LiveTimingPage /> : null}
                  {page === 'favorites' ? <FavoritesPage favorites={favorites} onToggle={toggleFavorite} onOpenRace={(id) => open({ kind: 'race', id })} onOpenDriver={openDriver} onOpenTeam={openTeam} onGoLibrary={() => goTo('library')} /> : null}
                  {page === 'standings' ? <StandingsPage tab={standingsTab} onTabChange={setStandingsTab} onOpenDriver={openDriver} onOpenTeam={openTeam} /> : null}
                  {page === 'library' ? <LibraryPage favorites={favorites} onToggle={toggleFavorite} tab={libraryTab} onTabChange={setLibraryTab} onOpenDriver={openDriver} onOpenTeam={openTeam} onOpenTrack={(id) => open({ kind: 'track', id })} /> : null}
                  {page === 'settings' ? <SettingsPage themeMode={themeMode} onThemeModeChange={setThemeMode} /> : null}
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
        </View>
      </View>
    </SafeAreaView>
    </MotionPreferenceContext.Provider>
  );
}

export default App;

// ponytail: preserve brand colors and map current neutral styles; use semantic tokens if custom neutrals become ambiguous.
function darkThemeColor(value: string, styleName: string, property: string) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (!match) return value;
  const hex = match[1]!.length === 3 ? [...match[1]!].map((digit) => digit + digit).join('') : match[1]!;
  const [red, green, blue] = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  const highest = Math.max(red!, green!, blue!);
  const lowest = Math.min(red!, green!, blue!);
  if (highest - lowest > 24) return value;
  const lightness = (highest + lowest) / 510;
  if (property === 'color') return lightness < 0.18 ? '#F1F3F5' : lightness < 0.68 ? '#B2B8C0' : value;
  if (property.toLowerCase().includes('border')) return lightness > 0.55 ? '#3A3E44' : lightness < 0.18 ? '#464A50' : value;
  if (property !== 'backgroundColor') return value;
  if (['safeArea', 'safeAreaMobile', 'loading', 'appRoot', 'appRootMobile', 'routeLayer', 'mainPane', 'profileScreen', 'livePage', 'homeSafeArea', 'homePage'].includes(styleName)) return '#141619';
  if (styleName === 'segment') return '#2A2D32';
  if (styleName === 'segmentIndicator') return '#3B3F45';
  return lightness >= 0.92 ? '#22252A' : lightness >= 0.72 ? '#2C3036' : lightness >= 0.5 ? '#353A41' : lightness < 0.18 ? '#101216' : value;
}

const lightStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.canvas },
  safeAreaMobile: { backgroundColor: C.white },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, gap: 12 },
  loadingText: { color: C.muted, fontSize: 13 },
  appRoot: { flex: 1, flexDirection: 'row', backgroundColor: C.canvas },
  appRootMobile: { flexDirection: 'column-reverse' },
  routeStack: { flex: 1 },
  routeLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: C.canvas },
  routeLayerActive: { opacity: 1 },
  routeLayerHidden: { opacity: 0 },
  rail: { width: 70, backgroundColor: C.white, borderRightWidth: 1, borderRightColor: C.line, alignItems: 'center', paddingTop: 15, paddingBottom: 14 },
  bottomNav: { width: '100%', height: 64, flexDirection: 'row', borderRightWidth: 0, borderTopWidth: 1, borderTopColor: C.line, alignItems: 'center', paddingHorizontal: 3, paddingTop: 3, paddingBottom: 3 },
  brandMark: { width: 37, height: 37, backgroundColor: C.red, borderRadius: 11, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  brandF: { color: C.white, fontSize: 20, fontWeight: '900', fontStyle: 'italic', marginLeft: -3 },
  brandSlash: { position: 'absolute', height: 3, width: 20, backgroundColor: C.white, bottom: 10, right: 3, transform: [{ skewX: '-28deg' }] },
  railNav: { width: '100%', gap: 7, marginTop: 32 },
  bottomNavItems: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 0, marginTop: 0 },
  railItem: { width: 56, height: 58, borderRadius: 13, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', gap: 4 },
  bottomNavItem: { flex: 1, width: 'auto', height: 56, alignSelf: 'auto', gap: 2 },
  railItemActive: { backgroundColor: '#FFF0F2' },
  railLabel: { fontSize: 10, lineHeight: 14, color: '#7F8790', fontWeight: '500' },
  bottomNavLabel: { fontSize: 9, lineHeight: 12 },
  railLabelActive: { color: C.red, fontWeight: '700' },
  railFooter: { marginTop: 'auto', alignItems: 'center', gap: 7 },
  railFooterLine: { width: 24, height: 1, backgroundColor: C.line },
  railFooterText: { fontSize: 10, color: '#9BA2A9', fontWeight: '700', letterSpacing: 1 },
  mainPane: { flex: 1, maxWidth: 680, alignSelf: 'stretch', backgroundColor: C.canvas },
  teamDetailWidePane: { maxWidth: 1800 },
  driverFullScreenPane: { maxWidth: '100%' },
  profileScreen: { flex: 1, minHeight: 0, backgroundColor: C.canvas },
  teamProfileScreen: { backgroundColor: C.ink },
  profileScroll: { flex: 1, minHeight: 0 },
  driverDetailTopBar: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.ink, paddingHorizontal: 17 },
  driverDetailTopBarCompact: { height: 52, paddingHorizontal: 12 },
  driverDetailBack: { minHeight: 44, justifyContent: 'center' },
  driverDetailActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  driverDetailStats: { minHeight: 44, justifyContent: 'center' },
  driverDetailTopText: { color: C.white, fontSize: 14, fontWeight: '800' },
  driverDetailClose: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  driverDetailCloseText: { color: C.white, fontSize: 29, lineHeight: 34, fontWeight: '400' },
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
  homeSafeArea: { backgroundColor: C.canvas },
  homePage: { flex: 1, backgroundColor: C.canvas },
  homeContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 34 },
  homeHeader: { minHeight: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  homeEyebrow: { color: C.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1.3, marginBottom: 3 },
  homeTitle: { color: C.ink, fontSize: 25, lineHeight: 30, fontWeight: '900', letterSpacing: -0.5 },
  homeScheduleLink: { minHeight: 37, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: C.line, borderRadius: 10, backgroundColor: C.white },
  homeScheduleLinkText: { color: C.ink, fontSize: 10, fontWeight: '700' },
  homeHero: { backgroundColor: C.white, borderRadius: 17, padding: 14, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.line, borderTopWidth: 3, borderTopColor: C.red },
  homeHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeHeroKicker: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.6, flexShrink: 1 },
  homeLiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF0F2', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20 },
  homeLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.red },
  homeLiveBadgeText: { color: C.red, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  homeHeroBody: { flexDirection: 'row', alignItems: 'center', marginTop: 13, marginBottom: 13 },
  homeHeroCopy: { flex: 1, minWidth: 0 },
  homeHeroTitle: { color: C.ink, fontSize: 21, lineHeight: 27, fontWeight: '900', letterSpacing: -0.5 },
  homeHeroVenue: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  homeHeroVenueCopy: { flex: 1 },
  homeHeroVenueName: { color: C.ink, fontSize: 10, fontWeight: '700' },
  homeHeroCountry: { color: C.muted, fontSize: 9, marginTop: 2 },
  homeHeroDate: { color: C.muted, fontSize: 10, marginTop: 8, fontWeight: '600' },
  homeCircuitImage: { width: 140, height: 88, marginLeft: 8, opacity: 0.82 },
  homePrimaryButton: { minHeight: 41, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, backgroundColor: C.red, paddingHorizontal: 12, marginTop: 3 },
  homePrimaryButtonText: { color: C.white, fontSize: 11, fontWeight: '800' },
  homePrimaryButtonArrow: { color: C.white, fontSize: 19, lineHeight: 22, fontWeight: '700' },
  homeCurrentSession: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 13, paddingTop: 12 },
  homeCurrentLabel: { color: C.muted, fontSize: 9, fontWeight: '700' },
  homeCurrentName: { color: C.ink, fontSize: 15, fontWeight: '900', marginTop: 4 },
  homeCurrentTime: { color: C.muted, fontSize: 9, marginTop: 4 },
  homeOfficialLink: { alignSelf: 'flex-start', paddingVertical: 8 },
  homeOfficialLinkText: { color: '#FF7185', fontSize: 9, fontWeight: '800' },
  homeCountdown: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, borderTopWidth: 1, borderTopColor: C.line, marginTop: 13, paddingTop: 12 },
  homeCountdownCell: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  homeCountdownValue: { color: C.red, fontSize: 21, lineHeight: 26, fontWeight: '900', fontVariant: ['tabular-nums'] },
  homeCountdownUnit: { color: C.muted, fontSize: 8 },
  homeResults: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 13, paddingTop: 10 },
  homePodium: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  homePodiumCard: { flex: 1, minWidth: 0, alignItems: 'center', backgroundColor: '#F5F6F7', borderRadius: 11, paddingHorizontal: 5, paddingTop: 6, paddingBottom: 7, overflow: 'hidden' },
  homePodiumCardWinner: { backgroundColor: '#F0F8F6', borderWidth: 1, borderColor: '#C8E7DF', paddingBottom: 8 },
  homePodiumRank: { alignSelf: 'flex-start', color: C.muted, fontSize: 16, lineHeight: 19, fontWeight: '900', marginBottom: 4 },
  homePodiumRankWinner: { color: '#A77A19', fontSize: 18, lineHeight: 21 },
  homePodiumPhoto: { width: '100%', height: 126, backgroundColor: '#E7E7E7', borderRadius: 8, position: 'relative', overflow: 'hidden' },
  homePodiumPhotoWinner: { height: 150 },
  homePodiumName: { alignSelf: 'stretch', color: C.ink, fontSize: 9, fontWeight: '800', textAlign: 'center', marginTop: 6 },
  homePodiumPoints: { color: C.red, fontSize: 8, fontWeight: '800', marginTop: 4 },
  homePodiumPointsWinner: { color: '#A77A19', fontSize: 9 },
  homeResultEmpty: { paddingVertical: 12, gap: 5 },
  homeResultEmptyText: { color: C.muted, fontSize: 9 },
  homeRetryText: { color: '#FF7185', fontSize: 9, fontWeight: '800' },
  homeSchedulePending: { color: C.muted, fontSize: 9, lineHeight: 15 },
  homeSectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  homeSectionTitle: { color: C.ink, fontSize: 14, fontWeight: '900' },
  homeSectionSubtitle: { color: C.muted, fontSize: 8, marginTop: 3 },
  homeSectionMark: { color: C.red, fontSize: 21, fontWeight: '700' },
  homeDayGroup: { marginBottom: 9 },
  homeDayTitle: { color: C.ink, fontSize: 10, fontWeight: '800', marginBottom: 6, marginLeft: 2 },
  homeSessionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 11, paddingHorizontal: 11, marginBottom: 6 },
  homeSessionRowActive: { borderWidth: 1, borderColor: C.red },
  homeSessionDot: { width: 8, height: 8, borderRadius: 4 },
  homeSessionCopy: { flex: 1 },
  homeSessionName: { color: C.ink, fontSize: 10, fontWeight: '700' },
  homeSessionStatus: { color: C.red, fontSize: 7, fontWeight: '800', marginTop: 2 },
  homeSessionTime: { fontSize: 9, fontWeight: '700', fontVariant: ['tabular-nums'] },
  homeSchedulePendingCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 12, gap: 7, marginBottom: 11 },
  homeNextSection: { marginTop: 9 },
  homeNextCard: { minHeight: 75, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 11 },
  homeNextCopy: { flex: 1 },
  homeNextTitle: { color: C.ink, fontSize: 11, fontWeight: '900' },
  homeNextVenue: { color: C.muted, fontSize: 8, marginTop: 3 },
  homeNextDate: { color: C.red, fontSize: 8, fontWeight: '700', marginTop: 5 },
  homeNextArrow: { color: C.red, fontSize: 23, fontWeight: '700' },
  homeEmpty: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 16, gap: 9 },
  pageContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 30 },
  driverPageContent: { width: '100%', paddingBottom: 30 },
  driverListContainer: { alignSelf: 'flex-start' },
  screenHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  eyebrow: { color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  screenTitle: { color: C.ink, fontSize: 27, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8 },
  settingsCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 15, padding: 15, marginTop: 5 },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 15 },
  settingsIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#FFF0F2', alignItems: 'center', justifyContent: 'center' },
  settingsTitle: { color: C.ink, fontSize: 13, fontWeight: '800' },
  settingsDescription: { color: C.muted, fontSize: 10, marginTop: 3 },
  settingsHint: { color: C.muted, fontSize: 10, lineHeight: 15, marginTop: -9 },
  seasonBadge: { minWidth: 49, height: 31, borderRadius: 9, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  seasonBadgeText: { color: C.ink, fontSize: 12, fontWeight: '800' },
  demoNotice: { minHeight: 29, flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 },
  demoNoticeButton: { minHeight: 28, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, borderRadius: 16, backgroundColor: '#E9ECEF', gap: 6 },
  demoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.muted },
  liveDot: { backgroundColor: C.teal },
  errorDot: { backgroundColor: C.red },
  demoNoticeText: { color: C.ink, fontSize: 10, fontWeight: '600' },
  demoNoticeCredit: { flexShrink: 1, color: C.muted, fontSize: 9, lineHeight: 12 },
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
  teamLogoPlain: { backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0, padding: 0 },
  teamLogoImage: { width: '100%', height: '100%' },
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
  teamListHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, marginBottom: 10 },
  teamListTitle: { color: C.ink, fontSize: 14, fontWeight: '900' },
  teamListCount: { color: C.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  teamCard: { minHeight: 200, borderRadius: 13, overflow: 'hidden', marginBottom: 2 },
  teamCardMain: { position: 'relative', flex: 1, padding: 13, overflow: 'hidden' },
  teamCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', zIndex: 1 },
  teamCardTitleBlock: { flex: 1, maxWidth: '74%', paddingTop: 2 },
  teamCardName: { fontSize: 18, lineHeight: 22, fontWeight: '900', letterSpacing: -0.35 },
  teamCardCode: { fontSize: 8, lineHeight: 11, fontWeight: '900', letterSpacing: 1.1, opacity: 0.76, marginTop: 3 },
  teamCardDrivers: { flexDirection: 'row', gap: 10, maxWidth: '73%', marginTop: 7, zIndex: 1 },
  teamCardDriver: { flexShrink: 1, fontSize: 9, lineHeight: 13, fontWeight: '700' },
  teamCardDriverCode: { fontSize: 7, fontWeight: '900', opacity: 0.78 },
  teamCardCar: { position: 'absolute', left: '1%', bottom: '-4%', width: '98%', height: '62%', zIndex: 0 },
  teamCardPortrait: { position: 'absolute', right: '3%', bottom: '-45%', width: '58%', height: '145%', zIndex: 0 },
  teamCardPortraitSecond: { right: '25%', bottom: '-32%', width: '54%', height: '132%', opacity: 0.94 },
  teamCardFooter: { height: 36, flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 5, backgroundColor: 'rgba(0,0,0,0.16)' },
  teamCardBase: { flex: 1, color: 'rgba(255,255,255,0.84)', fontSize: 8, fontWeight: '600', paddingRight: 4 },
  teamCardPoints: { color: C.white, fontSize: 11, fontWeight: '900' },
  teamCardPointsLabel: { fontSize: 7, fontWeight: '800' },
  trackRow: { minHeight: 74, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 11 },
  trackThumbnail: { width: 40, height: 40, borderRadius: 11, backgroundColor: '#E8F1F0', alignItems: 'center', justifyContent: 'center' },
  rowChevron: { color: '#9BA2A9', fontSize: 25, paddingHorizontal: 5 },
  detailHeader: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 8 },
  detailHeaderDark: { marginBottom: 8 },
  backButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  backButtonDark: { backgroundColor: '#272A31', borderColor: '#41454D' },
  backArrow: { color: C.ink, fontSize: 28, lineHeight: 30, marginTop: -3 },
  backArrowDark: { color: C.white },
  detailHeaderCopy: { flex: 1 },
  detailHeaderTitle: { color: C.ink, fontSize: 15, fontWeight: '800' },
  detailHeaderTitleDark: { color: C.white },
  detailHeaderSubtitle: { color: C.muted, fontSize: 9, marginTop: 2 },
  detailHeaderSubtitleDark: { color: '#A9AEB7' },
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
  teamHero: { marginHorizontal: -16, marginTop: -1 },
  teamHeroStage: { position: 'relative', justifyContent: 'space-between', overflow: 'hidden' },
  teamHeroArtwork: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  teamHeroTop: { zIndex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12 },
  teamHeroCopy: { flex: 1, paddingRight: 14 },
  teamHeroEyebrow: { color: C.white, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  teamHeroFullName: { color: C.white, fontSize: 10, fontWeight: '700', marginTop: 3, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  teamHeroCar: { position: 'absolute', left: '3%', bottom: 10, width: '94%', height: '67%' },
  teamHeroTitleBand: { height: 66, backgroundColor: C.white, borderTopWidth: 2, borderBottomWidth: 2, borderColor: C.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  teamHeroSlash: { width: 17, height: 48, backgroundColor: C.teal, transform: [{ skewX: '-28deg' }], marginHorizontal: 17 },
  teamHeroTitle: { maxWidth: '62%', color: C.ink, fontSize: 27, lineHeight: 34, fontWeight: '900', letterSpacing: -0.7, textAlign: 'center' },
  teamHeroBrand: { minHeight: 112, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14, overflow: 'hidden' },
  teamHeroBrandShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  teamHeroDriversLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5, opacity: 0.82 },
  teamHeroDriverNames: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 14, marginTop: 5, marginBottom: 6 },
  teamHeroDriverButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  teamHeroDriverName: { color: C.white, fontSize: 12, fontWeight: '800' },
  teamHeroDriverCode: { color: C.white, fontSize: 8, fontWeight: '900', opacity: 0.72 },
  teamDetailNotice: { paddingTop: 13 },
  teamSectionHeading: { marginTop: 4 },
  teamSectionTitle: { color: C.white, fontSize: 21, letterSpacing: -0.5 },
  teamDriversGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
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
  driverListItem: { position: 'relative', width: '100%', aspectRatio: 2.35, minHeight: 155, marginBottom: 14 },
  driverListItemCompact: { minHeight: 132 },
  driverListCard: { flex: 1, position: 'relative', borderRadius: 12, overflow: 'hidden' },
  driverListNumberBack: { position: 'absolute', zIndex: 0, right: '12%', bottom: 0, flexDirection: 'row', alignItems: 'flex-end', opacity: 0.24 },
  driverListNumberBackCompact: { bottom: 8 },
  driverListNumberBackText: { fontSize: 154, lineHeight: 165, fontWeight: '900', fontStyle: 'italic' },
  driverListNumberBackTextCompact: { fontSize: 98, lineHeight: 108 },
  driverListCopy: { position: 'absolute', top: 16, bottom: 12, left: 17, width: '52%', zIndex: 2 },
  driverListCopyCompact: { top: 13, left: 14, bottom: 11, width: '60%', zIndex: 2 },
  driverListName: { fontSize: 18, lineHeight: 22, fontWeight: '900', maxWidth: '94%' },
  driverListNameCompact: { fontSize: 15, lineHeight: 19 },
  driverListTeam: { fontSize: 11, fontWeight: '800', opacity: 0.82, marginTop: 5 },
  driverListNumber: { fontSize: 32, lineHeight: 36, fontWeight: '900', marginTop: 5 },
  driverListNumberCompact: { fontSize: 27, lineHeight: 31, marginTop: 4 },
  driverListFlag: { position: 'absolute', left: 0, bottom: 0 },
  driverCountryFlag: { width: 24, height: 16 },
  driverPoster: { position: 'relative', height: 620, overflow: 'hidden', alignItems: 'center' },
  driverPosterCompact: { minHeight: 0 },
  driverPosterGradient: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  driverPosterFade: { position: 'absolute', right: 0, bottom: 0, left: 0 },
  driverPortraitStage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center' },
  driverPortrait: { position: 'absolute' },
  homePodiumPortrait: { top: '5%', left: '6%', width: '88%', height: '90%', borderRadius: 5 },
  driverListPortrait: { top: 0, right: 0, width: '39%', maxWidth: 430, aspectRatio: 440 / 1265, zIndex: 1 },
  driverListPortraitCompact: { top: 0, right: '7%', width: '39%', maxWidth: 430, aspectRatio: 440 / 1265, zIndex: 1 },
  driverPortraitStandard: { top: -56, width: '76%', maxWidth: 450, aspectRatio: 440 / 1265, alignSelf: 'center' },
  driverPortraitStandardCompact: { top: '16%', width: '70%', maxWidth: 340, aspectRatio: 440 / 1265, alignSelf: 'center' },
  driverPosterInfo: { position: 'absolute', left: 12, right: 12, bottom: 25, alignItems: 'center', zIndex: 1 },
  driverPosterInfoCompact: { bottom: 24 },
  driverPosterSignature: { color: C.white, fontFamily: 'F1Signature', fontSize: 62, lineHeight: 70, transform: [{ rotate: '-7deg' }], textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  driverPosterSignatureCompact: { fontSize: 44, lineHeight: 54 },
  driverPosterName: { maxWidth: '94%', color: C.white, fontSize: 37, lineHeight: 46, fontWeight: '900', textAlign: 'center', marginTop: -3, textShadowColor: 'rgba(0,0,0,0.36)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  driverPosterNameCompact: { fontSize: 26, lineHeight: 34 },
  driverPosterMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 12 },
  driverPosterMetaCompact: { gap: 6, marginTop: 8 },
  driverPosterCountry: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  driverPosterMetaText: { color: C.white, fontSize: 14, fontWeight: '800' },
  driverPosterMetaTextCompact: { fontSize: 12 },
  driverPosterDivider: { width: 1, height: 14, backgroundColor: C.white, opacity: 0.55 },
  driverNoticeWrap: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12 },
  driverStatsSection: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 3 },
  driverSeasonLeads: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F2F3', paddingBottom: 11, marginBottom: 12 },
  driverSeasonLead: { flex: 1 },
  driverSeasonLeadValue: { color: C.ink, fontSize: 26, fontWeight: '900' },
  driverSeasonGrid: { flexDirection: 'row' },
  driverSeasonMetric: { width: '25%' },
  driverSeasonMetricValue: { color: C.ink, fontSize: 15, fontWeight: '900' },
});

const darkStyleDefinitions = Object.fromEntries(Object.entries(lightStyles).map(([styleName, style]) => [
  styleName,
  Object.fromEntries(Object.entries(style).map(([property, value]) => [property, typeof value === 'string' ? darkThemeColor(value, styleName, property) : value])),
])) as typeof lightStyles;
const darkStyles = StyleSheet.create(darkStyleDefinitions);
let styles = lightStyles;
