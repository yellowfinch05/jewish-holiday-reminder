import { createClient } from '@/lib/supabase/server';
import type { NotificationTiming } from '@/types';


/**
 * PreferencesService — reads and writes holiday preferences and notification timings.
 */
export class PreferencesService {
  // ============================================================
  // Holiday Preferences
  // ============================================================

  /**
   * Returns all holiday preferences for the current user.
   * Returns an empty object if the user is not authenticated.
   */
  static async getHolidayPreferences(): Promise<Record<string, boolean>> {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return {};

    const { data } = await supabase
      .from('holiday_preferences')
      .select('holiday_id, enabled')
      .eq('user_id', user.id);

    if (!data) return {};

    const prefs: Record<string, boolean> = {};
    for (const row of data) {
      prefs[row.holiday_id] = row.enabled;
    }
    return prefs;
  }

  /**
   * Sets a single holiday preference (enabled/disabled) for the current user.
   */
  static async setHolidayPreference(holidayId: string, enabled: boolean): Promise<void> {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('holiday_preferences').upsert(
      {
        user_id: user.id,
        holiday_id: holidayId,
        enabled,
      },
      { onConflict: 'user_id, holiday_id' },
    );

    if (error) throw new Error(error.message);
  }

  /**
   * Bulk-sets holiday preferences for a list of holiday IDs.
   * Used during onboarding to pre-fill all holidays of a given type.
   */
  static async setBulkHolidayPreferences(
    holidayIds: string[],
    enabled: boolean,
  ): Promise<void> {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const rows = holidayIds.map((holidayId) => ({
      user_id: user.id,
      holiday_id: holidayId,
      enabled,
    }));

    const { error } = await supabase.from('holiday_preferences').upsert(rows, {
      onConflict: 'user_id, holiday_id',
    });

    if (error) throw new Error(error.message);
  }

  // ============================================================
  // Notification Timings
  // ============================================================

  /**
   * Returns notification timings for the current user.
   * Returns an empty array if the user is not authenticated.
   */
  static async getNotificationTimings(): Promise<{ holiday_id: string; timing: NotificationTiming }[]> {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data } = await supabase
      .from('notification_timings')
      .select('holiday_id, timing')
      .eq('user_id', user.id);

    return (data ?? []) as { holiday_id: string; timing: NotificationTiming }[];
  }

  /**
   * Sets a notification timing for a given holiday.
   */
  static async setNotificationTiming(
    holidayId: string,
    timing: NotificationTiming,
  ): Promise<void> {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('notification_timings').upsert(
      {
        user_id: user.id,
        holiday_id: holidayId,
        timing,
      },
      { onConflict: 'user_id, holiday_id, timing' },
    );

    if (error) throw new Error(error.message);
  }

  /**
   * Removes a notification timing for a given holiday.
   */
  static async removeNotificationTiming(
    holidayId: string,
    timing: NotificationTiming,
  ): Promise<void> {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('notification_timings')
      .delete()
      .eq('user_id', user.id)
      .eq('holiday_id', holidayId)
      .eq('timing', timing);

    if (error) throw new Error(error.message);
  }
}