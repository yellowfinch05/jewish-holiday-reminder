'use server';


import { HOLIDAY_GROUPS } from '@/lib/calendar/holiday-definitions';
import { PreferencesService } from '@/lib/preferences/service';
import { ProfileService } from '@/lib/profile/service';
import type { HolidayGroup, HolidayItem, NotificationTiming } from '@/types';

export interface SettingsData {
  location: string;
  timezone: string;
  holidayGroups: HolidayGroup[];
  timings: NotificationTiming[];
}

/**
 * Returns the full settings state for the current user.
 * Holiday groups are defined statically in holiday-definitions.ts
 * and merged with the user's preferences.
 */
export async function getSettingsData(): Promise<SettingsData | null> {
  const profile = await ProfileService.getCurrentProfile();
  if (!profile) return null;

  const preferences = await PreferencesService.getHolidayPreferences();
  const timings = await PreferencesService.getNotificationTimings();

  // Build holiday groups from static definitions merged with user preferences
  const holidayGroups: HolidayGroup[] = HOLIDAY_GROUPS.map((group) => ({
    groupId: group.groupId,
    label: group.label,
    holidays: group.holidays.map((def): HolidayItem => ({
      id: def.canonicalId,
      canonicalId: def.canonicalId,
      name: def.name,
      description: def.description,
      enabled: preferences[def.canonicalId] ?? true, // default to enabled
      variant: def.variant ?? 'single',
    })),
  }));

  const uniqueTimings = new Set(timings.map((t) => t.timing));

  return {
    location: profile.location,
    timezone: profile.timezone,
    holidayGroups,
    timings: Array.from(uniqueTimings),
  };
}
