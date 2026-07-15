import type { Holiday } from '@/types';

import { FixedRabbinicCalendarProvider } from './fixed-rabbinic';

/**
 * HolidayService — retrieves and prepares holiday data for display.
 *
 * Acts as the bridge between the CalendarProvider and the UI layer.
 * For the MVP, uses a hardcoded New York location.
 */
export class HolidayService {
  private provider: FixedRabbinicCalendarProvider;

  constructor() {
    this.provider = new FixedRabbinicCalendarProvider();
  }

  /**
   * Returns upcoming holidays from today forward, sorted by date.
   * Fetches a broad range to cover holidays near year boundaries.
   *
   * @param limit - Maximum number of holidays to return (default 10)
   */
  getUpcomingHolidays(limit: number = 10): Holiday[] {
    const now = new Date();
    const startOfRange = new Date(now.getFullYear() - 1, 0, 1);
    const endOfRange = new Date(now.getFullYear() + 2, 11, 31);

    const allHolidays = this.provider.getHolidaysInRange(startOfRange, endOfRange);

    // Filter to upcoming holidays only
    const upcoming = allHolidays
      .filter((h) => h.times.startAt >= now)
      .sort((a, b) => a.times.startAt.getTime() - b.times.startAt.getTime());

    return upcoming.slice(0, limit);
  }

  /**
   * Returns all holidays within a date range, regardless of whether they're past or future.
   */
  getHolidaysInRange(start: Date, end: Date): Holiday[] {
    return this.provider.getHolidaysInRange(start, end);
  }

  /**
   * Returns the next holiday (closest upcoming).
   */
  getNextHoliday(): Holiday | null {
    const upcoming = this.getUpcomingHolidays(1);
    return upcoming.length > 0 ? upcoming[0] : null;
  }
}
