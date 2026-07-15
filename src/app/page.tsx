import {
  HOME_PAGE_DAILY_DEPENDENCIES,
  isHomePageHidden,
} from '@/lib/calendar/holiday-definitions';
import { HolidayService } from '@/lib/calendar/service';
import { LocationService } from '@/lib/location/service';
import { PreferencesService } from '@/lib/preferences/service';
import { ProfileService } from '@/lib/profile/service';

function formatDate(date: Date, timezone: string): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  });
}

function daysAway(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Today';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `${diffDays} days away`;
  const weeks = Math.floor(diffDays / 7);
  const remainingDays = diffDays % 7;
  if (remainingDays === 0) return `${weeks} week${weeks > 1 ? 's' : ''} away`;
  return `${weeks} week${weeks > 1 ? 's' : ''} ${remainingDays} day${remainingDays > 1 ? 's' : ''} away`;
}

/**
 * Check if a holiday should appear on the home page based on user preferences.
 *
 * A holiday is shown if:
 *   1. Its own canonicalId is enabled in preferences, OR
 *   2. A related "daily" variant toggle is enabled (for first/last day display)
 *      e.g., if "Unleavened Bread — Every Day" is enabled, show "Passover (1st Day)"
 *            and "Unleavened Bread (Last Day)" cards
 *
 * The default (preferences not set) is to show all holidays.
 */
function isHolidayEnabledForHomePage(
  canonicalId: string,
  preferences: Record<string, boolean>,
): boolean {
  // Check the event's own canonicalId
  if (preferences[canonicalId] !== false) return true;

  // Check dependencies (daily toggles that enable first/last day display)
  const deps = HOME_PAGE_DAILY_DEPENDENCIES[canonicalId];
  if (deps) {
    for (const dep of deps) {
      if (preferences[dep] !== false) return true;
    }
  }

  return false;
}

export default async function HomePage() {
  // Try to load the user's profile location; fall back to default
  const profile = await ProfileService.getCurrentProfile();
  const location = profile
    ? (LocationService.resolve(profile.location) ?? LocationService.defaultLocation())
    : LocationService.defaultLocation();

  // Load user's holiday preferences; if not authenticated, show all holidays
  const preferences = profile ? await PreferencesService.getHolidayPreferences() : {};

  const holidayService = new HolidayService();

  // Fetch a generous buffer (400) so we can filter out daily variants and
  // still have enough home-page-visible holidays to fill the display limit.
  // At the worst case (end of year), ~286 raw holidays yield ~54 visible.
  const rawHolidays = holidayService.getUpcomingHolidays(400);

  // Filter for home page display:
  // 1. Remove events that are notifications-only (daily variants, hidden lump)
  // 2. Remove events disabled by user preferences (with dependency checks)
  const upcomingHolidays = rawHolidays
    .filter((h) => !isHomePageHidden(h.canonicalId))
    .filter((h) => isHolidayEnabledForHomePage(h.canonicalId, preferences))
    .slice(0, 50);

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="px-6 py-8 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-amber-400">Z&apos;manim</h1>
            <p className="text-sm text-slate-400 mt-1">
              Jewish Holiday Reminders &middot; {location.shortName}
            </p>
          </div>
          <a
            href="/settings"
            className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            Settings
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-6">
        {upcomingHolidays.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg">No upcoming holidays found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Upcoming Holidays
            </h2>

            <div className="space-y-3">
              {upcomingHolidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="bg-slate-800 rounded-lg p-5 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-slate-50">{holiday.name}</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {formatDate(holiday.times.endAt, location.timezone)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-amber-400 whitespace-nowrap ml-4">
                      {daysAway(holiday.times.startAt)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div>
                      <span className="text-slate-500">Begins: </span>
                      <span className="text-slate-300">
                        {formatDate(holiday.times.startAt, location.timezone)} at Sunset
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Ends: </span>
                      <span className="text-slate-300">
                        {formatDate(holiday.times.endAt, location.timezone)} at Nightfall
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-700 text-center text-xs text-slate-500">
        Times for {location.name} &middot; Powered by hebcal
      </footer>
    </div>
  );
}
