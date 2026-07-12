import type { AppLocation, Holiday, HolidayTimes } from '@/types';

/**
 * Interface for pluggable calendar providers.
 *
 * The architecture supports future implementations such as:
 * - AstronomicalConjunctionProvider
 * - SightedMoonProvider
 *
 * The MVP only implements FixedRabbinicCalendarProvider.
 */
export interface CalendarProvider {
  /**
   * Returns all holidays for a given Gregorian year.
   * The year range should span enough to cover upcoming holidays
   * (e.g., current year + next year for holidays near year boundaries).
   */
  getHolidays(year: number): Holiday[];

  /**
   * Returns the start and end times for a specific holiday at a given location.
   */
  getHolidayTimes(holiday: Holiday, location: AppLocation): HolidayTimes;
}
