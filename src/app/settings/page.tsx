'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { getSupportedCities } from '@/lib/calendar/actions';
import {
  toggleHolidayPreference,
  toggleNotificationTiming,
  updateLocation,
} from '@/lib/settings/actions';
import { getSettingsData, type SettingsData } from '@/lib/settings/data';
import { signOut } from '@/lib/supabase/actions';
import type { NotificationTiming } from '@/types';


export default function SettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<SettingsData | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [settings, cityList] = await Promise.all([
        getSettingsData(),
        getSupportedCities(),
      ]);
      setData(settings);
      setCities(cityList);
      setLoading(false);
    }
    load();
  }, []);

  const handleLocationChange = useCallback(
    async (city: string) => {
      if (!city || city === data?.location) return;
      setSaving('location');
      setError(null);

      const result = await updateLocation(city);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setData((prev) =>
          prev
            ? { ...prev, location: result.location!.name, timezone: result.location!.timezone }
            : prev,
        );
      }
      setSaving(null);
    },
    [data?.location],
  );

  const handleToggleHoliday = useCallback(
    async (canonicalId: string, enabled: boolean) => {
      setSaving(`holiday-${canonicalId}`);
      await toggleHolidayPreference(canonicalId, enabled);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          holidayGroups: prev.holidayGroups.map((group) => ({
            ...group,
            holidays: group.holidays.map((h) =>
              h.canonicalId === canonicalId ? { ...h, enabled } : h,
            ),
          })),
        };
      });
      setSaving(null);
    },
    [],
  );

  const handleToggleTiming = useCallback(
    async (timing: NotificationTiming, enable: boolean) => {
      setSaving(`timing-${timing}`);
      // Apply timing to all enabled holidays
      const allEnabledHolidayIds: string[] = [];
      for (const group of data?.holidayGroups ?? []) {
        for (const h of group.holidays) {
          if (h.enabled) allEnabledHolidayIds.push(h.canonicalId);
        }
      }
      for (const holidayId of allEnabledHolidayIds) {
        await toggleNotificationTiming(holidayId, timing, enable);
      }
      setData((prev) => {
        if (!prev) return prev;
        const timings = new Set(prev.timings);
        if (enable) {
          timings.add(timing);
        } else {
          timings.delete(timing);
        }
        return { ...prev, timings: Array.from(timings) };
      });
      setSaving(null);
    },
    [data],
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6">
        <div className="text-slate-400 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6">
        <p className="text-slate-400 text-sm">Please sign in to access settings.</p>
      </div>
    );
  }

  const timingLabels: Record<string, string> = {
    '1_week': '1 week before',
    '1_day': '1 day before',
    '1_hour': '1 hour before',
    at_sunset: 'At sunset (when the holiday begins)',
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="px-6 py-8 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-amber-400">Settings</h1>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            Back
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-6 max-w-lg mx-auto w-full space-y-8">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Location */}
        <section>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Location
          </h2>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <select
              value={data.location}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-sm"
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2">{data.timezone}</p>
          </div>
        </section>

        {/* Holiday Preferences */}
        <section>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Holidays
          </h2>
          <div className="space-y-3">
            {data.holidayGroups.map((group) => {
              if (group.holidays.length === 0) return null;

              return (
                <div
                  key={group.groupId}
                  className="bg-slate-800 rounded-lg border border-slate-700 p-4"
                >
                  <h3 className="text-sm font-medium text-slate-300 mb-3">
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.holidays.map((h) => (
                      <label
                        key={h.canonicalId}
                        className="flex items-center justify-between py-2 px-2 rounded hover:bg-slate-700/50 cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-300">{h.name}</span>
                          {h.description && (
                            <span className="text-xs text-slate-500 mt-0.5">{h.description}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {saving === `holiday-${h.canonicalId}` && (
                            <span className="text-xs text-slate-500">...</span>
                          )}
                          <ToggleSwitch
                            checked={h.enabled}
                            onChange={(checked) => handleToggleHoliday(h.canonicalId, checked)}
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Notification Timings */}
        <section>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Reminder Timing
          </h2>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-xs text-slate-500 mb-3">
              These timings will be applied to all enabled holidays. Individual timing
              customization per holiday is coming soon.
            </p>
            <div className="space-y-1">
              {Object.entries(timingLabels).map(([value, label]) => {
                const timing = value as NotificationTiming;
                const isChecked = data.timings.includes(timing);
                return (
                  <label
                    key={value}
                    className="flex items-center justify-between py-2 px-2 rounded hover:bg-slate-700/50 cursor-pointer text-sm"
                  >
                    <span className="text-slate-300">{label}</span>
                    <div className="flex items-center gap-2 ml-4">
                      {saving === `timing-${value}` && (
                        <span className="text-xs text-slate-500">...</span>
                      )}
                      <ToggleSwitch
                        checked={isChecked}
                        onChange={(checked) => handleToggleTiming(timing, checked)}
                      />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </section>

        {/* Account */}
        <section>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Account
          </h2>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-lg transition-colors text-sm"
            >
              Sign Out
            </button>
          </div>
        </section>
      </main>

      <footer className="px-6 py-4 border-t border-slate-700 text-center text-xs text-slate-500">
        Z&apos;manim &middot; Jewish Holiday Reminders
      </footer>
    </div>
  );
}