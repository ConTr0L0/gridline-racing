import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type WidgetRow = { position: number; name: string; points: number | null };
type WidgetTarget = WidgetRow & { label: string; headshotUrl?: string; logoKey?: string };

export type GridlineWidgetData = {
  updatedAt: number;
  races: { id: string; name: string; location: string; weekendStart: number; startAt: number; endAt: number }[];
  driverTarget: WidgetTarget | null;
  teamTarget: WidgetTarget | null;
  drivers: WidgetRow[];
  teams: WidgetRow[];
};

type GridlineWidgetNativeModule = { setWidgetData: (json: string) => void };
const nativeModule = Platform.OS === 'android'
  ? requireOptionalNativeModule<GridlineWidgetNativeModule>('GridlineWidget')
  : null;

export function updateGridlineWidgetData(data: GridlineWidgetData | null) {
  try {
    nativeModule?.setWidgetData(data ? JSON.stringify(data) : '');
  } catch {
    // The home-screen widget must not block the app when native data cannot be written.
  }
}
