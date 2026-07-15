'use server';

import { revalidatePath } from 'next/cache';


import { LocationService } from '@/lib/location/service';
import { PreferencesService } from '@/lib/preferences/service';
import { ProfileService } from '@/lib/profile/service';
import type { NotificationTiming } from '@/types';

/**
 * Updates the user's location.
 */
export async function updateLocation(location: string) {
  const resolved = LocationService.resolve(location);
  if (!resolved) {
    return { error: `City "${location}" not found.` };
  }

  await ProfileService.updateProfile({
    location: resolved.name,
    timezone: resolved.timezone,
  });

  revalidatePath('/');
  revalidatePath('/settings');
  return { success: true, location: resolved };
}

/**
 * Toggles a single holiday preference.
 */
export async function toggleHolidayPreference(holidayId: string, enabled: boolean) {
  await PreferencesService.setHolidayPreference(holidayId, enabled);
  revalidatePath('/');
  revalidatePath('/settings');
  return { success: true };
}

/**
 * Toggles a notification timing for a given holiday.
 */
export async function toggleNotificationTiming(
  holidayId: string,
  timing: NotificationTiming,
  enable: boolean,
) {
  if (enable) {
    await PreferencesService.setNotificationTiming(holidayId, timing);
  } else {
    await PreferencesService.removeNotificationTiming(holidayId, timing);
  }
  revalidatePath('/settings');
  return { success: true };
}