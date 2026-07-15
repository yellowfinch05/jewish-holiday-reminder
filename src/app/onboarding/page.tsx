'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { getHolidayCategories, getSupportedCities } from '@/lib/calendar/actions';
import type { HolidayCategoryOutput } from '@/lib/calendar/actions';
import { saveOnboarding } from '@/lib/onboarding/actions';


type Step = 'location' | 'holidays' | 'timings' | 'complete';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('location');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [cities, setCities] = useState<string[]>([]);
  const [holidayGroups, setHolidayGroups] = useState<HolidayCategoryOutput[]>([]);

  // Selections — uses canonicalId for stable preference keys across years
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedHolidayIds, setSelectedHolidayIds] = useState<Set<string>>(new Set());
  const [selectedTimings, setSelectedTimings] = useState<Set<string>>(new Set());

  // Step labels
  const stepLabels = ['Location', 'Holidays', 'Reminders', 'Done'];
  const stepIndex = ['location', 'holidays', 'timings', 'complete'].indexOf(step);

  // Load data on mount
  useEffect(() => {
    async function load() {
      try {
        const [cityList, groups] = await Promise.all([
          getSupportedCities(),
          getHolidayCategories(),
        ]);
        setCities(cityList);
        setHolidayGroups(groups);

        // Pre-select all holidays using canonicalId
        const allIds = new Set<string>();
        for (const group of groups) {
          for (const h of group.holidays) {
            allIds.add(h.canonicalId);
          }
        }
        setSelectedHolidayIds(allIds);
      } catch {
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Toggle a single holiday (by canonicalId)
  const toggleHoliday = useCallback((id: string) => {
    setSelectedHolidayIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Toggle a group of holidays (e.g., all major) — by canonicalId
  const toggleGroup = useCallback((ids: string[], currentState: boolean) => {
    setSelectedHolidayIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (currentState) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  }, []);

  // Toggle a timing
  const toggleTiming = useCallback((timing: string) => {
    setSelectedTimings((prev) => {
      const next = new Set(prev);
      if (next.has(timing)) {
        next.delete(timing);
      } else {
        next.add(timing);
      }
      return next;
    });
  }, []);

  // Handle final save — uses canonicalId for stable preference keys
  async function handleComplete() {
    if (!selectedCity) {
      setError('Please select a city.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await saveOnboarding({
        location: selectedCity,
        holidayIds: Array.from(selectedHolidayIds),
        timings: Array.from(selectedTimings) as import('@/types').NotificationTiming[],
      });

      if (result?.error) {
        setError(result.error);
        setSaving(false);
        return;
      }

      setStep('complete');
      setSaving(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6">
        <div className="text-slate-400 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 px-6 py-8 max-w-lg mx-auto w-full">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                i <= stepIndex ? 'bg-amber-400' : 'bg-slate-600'
              }`}
            />
            <span
              className={`text-xs ${
                i === stepIndex ? 'text-amber-400' : 'text-slate-500'
              }`}
            >
              {label}
            </span>
            {i < stepLabels.length - 1 && <span className="text-slate-600 text-xs">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Location */}
      {step === 'location' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium text-slate-50">Where do you live?</h2>
            <p className="text-sm text-slate-400 mt-1">
              Holiday times are calculated based on your city.
            </p>
          </div>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-sm"
          >
            <option value="">Select a city...</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="button"
            onClick={() => {
              if (!selectedCity) {
                setError('Please select a city.');
                return;
              }
              setError(null);
              setStep('holidays');
            }}
            className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium rounded-lg transition-colors text-sm"
          >
            Next
          </button>
        </div>
      )}

      {/* Step 2: Holidays */}
      {step === 'holidays' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium text-slate-50">Which holidays matter to you?</h2>
            <p className="text-sm text-slate-400 mt-1">
              You can change these later in Settings.
            </p>
          </div>

          <div className="space-y-4">
            {holidayGroups.map((group) => {
              if (group.holidays.length === 0) return null;
              const groupIds = group.holidays.map((h) => h.canonicalId);
              const allEnabled = groupIds.every((id) => selectedHolidayIds.has(id));
              const someEnabled = groupIds.some((id) => selectedHolidayIds.has(id));

              return (
                <div key={group.groupId} className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                  {/* Category toggle */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupIds, allEnabled)}
                    className="flex items-center justify-between w-full mb-3"
                  >
                    <span className="text-sm font-medium text-slate-300">
                      {group.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {allEnabled ? 'All on' : someEnabled ? 'Some on' : 'All off'}
                    </span>
                  </button>

                  {/* Individual holidays */}
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
                        <ToggleSwitch
                          checked={selectedHolidayIds.has(h.canonicalId)}
                          onChange={() => toggleHoliday(h.canonicalId)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setStep('timings')}
            className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium rounded-lg transition-colors text-sm"
          >
            Next
          </button>
        </div>
      )}

      {/* Step 3: Timings */}
      {step === 'timings' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium text-slate-50">When should we remind you?</h2>
            <p className="text-sm text-slate-400 mt-1">
              Choose when you&apos;d like to receive notifications before each holiday.
            </p>
          </div>

          <div className="space-y-3 bg-slate-800 rounded-lg border border-slate-700 p-4">
            {[
              { value: '1_week', label: '1 week before' },
              { value: '1_day', label: '1 day before' },
              { value: '1_hour', label: '1 hour before' },
              { value: 'at_sunset', label: 'At sunset (when the holiday begins)' },
            ].map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center justify-between py-2 px-2 rounded hover:bg-slate-700/50 cursor-pointer"
              >
                <span className="text-sm text-slate-300">{label}</span>
                <ToggleSwitch
                  checked={selectedTimings.has(value)}
                  onChange={() => toggleTiming(value)}
                />
              </label>
            ))}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="button"
            onClick={handleComplete}
            disabled={saving}
            className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-slate-900 font-medium rounded-lg transition-colors text-sm"
          >
            {saving ? 'Saving...' : 'Get Started'}
          </button>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && (
        <div className="space-y-6 text-center py-12">
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-xl font-medium text-slate-50">You&apos;re all set!</h2>
          <p className="text-sm text-slate-400">
            We&apos;ll remind you about upcoming holidays based on your preferences.
          </p>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium rounded-lg transition-colors text-sm"
          >
            Go to Home
          </button>
        </div>
      )}
    </div>
  );
}