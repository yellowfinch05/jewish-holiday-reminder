import { HolidayService } from '@/lib/calendar/service';
import { LocationService } from '@/lib/location/service';

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

export default async function HomePage() {
  const location = LocationService.defaultLocation();
  const holidayService = new HolidayService();
  const upcomingHolidays = holidayService.getUpcomingHolidays(10);

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="px-6 py-8 border-b border-slate-700">
        <h1 className="text-2xl font-semibold tracking-tight text-amber-400">Z&apos;manim</h1>
        <p className="text-sm text-slate-400 mt-1">
          Jewish Holiday Reminders &middot; {location.shortName}
        </p>
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
