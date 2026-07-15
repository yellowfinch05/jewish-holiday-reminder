'use server';

import { revalidatePath } from 'next/cache';


import { LocationService } from '@/lib/location/service';
import { PreferencesService } from '@/lib/preferences/service';
import { ProfileService } from '@/lib/profile/service';
import type { NotificationTiming } from '@/types';

interface OnboardingData {
  location: string;
  holidayIds: string[];
  timings: NotificationTiming[];
}

/**
 * Saves the complete onboarding payload for a new user.
 * Handles location, holiday preferences, notification timings, and
 * marks onboarding as complete — all in one action.
 *
 * Errors are caught and returned as { error: string } so the UI
 * never gets permanently stuck in a loading state.
 */
export async function saveOnboarding(data: OnboardingData) {
  const { location, holidayIds, timings } = data;

  try {
    // 1. Resolve location to get timezone
    const resolved = LocationService.resolve(location);
    if (!resolved) {
      return { error: `City "${location}" not found. Please select from the list.` };
    }

    // 2. Update profile with location, timezone, and mark onboarding complete
    await ProfileService.updateProfile({
      location: resolved.name,
      timezone: resolved.timezone,
      onboarding_complete: true,
    });

    // 3. Set holiday preferences (all enabled by default on onboarding)
    if (holidayIds.length > 0) {
      await PreferencesService.setBulkHolidayPreferences(holidayIds, true);
    }

    // 4. Set notification timings
    if (timings.length > 0) {
      for (const holidayId of holidayIds) {
        for (const timing of timings) {
          await PreferencesService.setNotificationTiming(holidayId, timing);
        }
      }
    }

    revalidatePath('/');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
    return { error: message };
  }
}
