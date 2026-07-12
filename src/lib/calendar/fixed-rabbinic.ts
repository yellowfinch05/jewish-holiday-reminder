import {
  flags as hebcalFlags,
  HebrewCalendar,
  Location as HebcalLocation,
  type Event,
} from '@hebcal/core';

import type { AppLocation, Holiday, HolidayCategory, HolidayTimes } from '@/types';

import type { CalendarProvider } from './provider';

/**
 * Maps @hebcal/core event flags to our internal HolidayCategory.
 */
function eventToCategory(ev: Event): HolidayCategory {
  const mask = ev.getFlags();

  if (mask & hebcalFlags.MAJOR_FAST) return 'fast';
  if (mask & hebcalFlags.MINOR_FAST) return 'fast';
  if (mask & hebcalFlags.CHAG) return 'major';
  if (mask & hebcalFlags.MINOR_HOLIDAY) return 'minor';
  if (mask & hebcalFlags.MODERN_HOLIDAY) return 'minor';
  if (mask & hebcalFlags.ROSH_CHODESH) return 'minor';
  if (mask & hebcalFlags.LIGHT_CANDLES) return 'shabbat';

  return 'minor';
}

/**
 * Determines if an event is a "primary" holiday event we want to display.
 * Excludes sub-events like Hebrew dates, Omer counts, sedra readings,
 * and standalone Erev events (which are merged into the main holiday).
 */
function isPrimaryHolidayEvent(ev: Event): boolean {
  const mask = ev.getFlags();

  if (mask & hebcalFlags.PARSHA_HASHAVUA) return false;
  if (mask & hebcalFlags.OMER_COUNT) return false;
  if (mask & hebcalFlags.HEBREW_DATE) return false;
  if (mask & hebcalFlags.DAF_YOMI) return false;
  if (mask & hebcalFlags.MISHNA_YOMI) return false;
  if (mask & hebcalFlags.NACH_YOMI) return false;
  if (mask & hebcalFlags.YERUSHALMI_YOMI) return false;
  if (mask & hebcalFlags.DAILY_LEARNING) return false;
  if (mask & hebcalFlags.MOLAD) return false;
  if (mask & hebcalFlags.SHABBAT_MEVARCHIM) return false;
  if (mask & hebcalFlags.YOM_KIPPUR_KATAN) return false;
  if (mask & hebcalFlags.BEHAB) return false;
  if (mask & hebcalFlags.USER_EVENT) return false;

  // Exclude standalone EREV events — they're merged into the main holiday
  if (
    mask & hebcalFlags.EREV &&
    !(mask & hebcalFlags.MAJOR_FAST) &&
    !(mask & hebcalFlags.MINOR_FAST)
  ) {
    return false;
  }

  const holidayFlags =
    hebcalFlags.CHAG |
    hebcalFlags.MINOR_HOLIDAY |
    hebcalFlags.MAJOR_FAST |
    hebcalFlags.MINOR_FAST |
    hebcalFlags.MODERN_HOLIDAY |
    hebcalFlags.ROSH_CHODESH |
    hebcalFlags.EREV |
    hebcalFlags.CHANUKAH_CANDLES |
    hebcalFlags.CHOL_HAMOED |
    hebcalFlags.YIZKOR |
    hebcalFlags.SPECIAL_SHABBAT;

  return (mask & holidayFlags) !== 0;
}

/**
 * Generates a unique holiday ID by incorporating the Gregorian date.
 * This prevents duplicate key errors when multiple events share the
 * same basename (e.g., "Erev Tisha B'Av" and "Tisha B'Av").
 */
function generateHolidayId(ev: Event): string {
  const base = ev.basename().toLowerCase().replace(/\s+/g, '-');
  const slug = base.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
  const greg = ev.getDate().greg();
  const dateStr = greg.toISOString().slice(0, 10); // YYYY-MM-DD
  return `${slug}_${dateStr}`;
}

/**
 * FixedRabbinicCalendarProvider — MVP calendar implementation.
 *
 * Uses @hebcal/core to compute holidays according to the standard
 * fixed rabbinic Jewish calendar. Erev events are merged into their
 * corresponding holiday so each holiday appears as a single card.
 */
export class FixedRabbinicCalendarProvider implements CalendarProvider {
  getHolidays(year: number): Holiday[] {
    const location = HebcalLocation.lookup('New York');
    if (!location) return [];

    const options = {
      year,
      isHebrewYear: false,
      candlelighting: false,
      location,
      il: false,
      noHolidays: false,
      noMinorFast: false,
      noModern: false,
      noRoshChodesh: false,
      noSpecialShabbat: false,
      sedrot: false,
      omer: false,
    };

    const events = HebrewCalendar.calendar(options);

    // Also get next year to handle holidays near year boundary
    const nextYearOptions = { ...options, year: year + 1 };
    const nextYearEvents = HebrewCalendar.calendar(nextYearOptions);

    return this.buildHolidaysFromEvents([...events, ...nextYearEvents], location);
  }

  getHolidaysInRange(start: Date, end: Date): Holiday[] {
    const location = HebcalLocation.lookup('New York');
    if (!location) return [];

    const options = {
      start,
      end,
      candlelighting: false,
      location,
      il: false,
      noHolidays: false,
      noMinorFast: false,
      noModern: false,
      noRoshChodesh: false,
      noSpecialShabbat: false,
      sedrot: false,
      omer: false,
    };

    const events = HebrewCalendar.calendar(options);
    return this.buildHolidaysFromEvents(events, location);
  }

  getHolidayTimes(holiday: Holiday, _location: AppLocation): HolidayTimes {
    return holiday.times;
  }

  /**
   * Builds Holiday objects from raw @hebcal/core events.
   *
   * Jewish holidays begin at sunset the evening before the main observance day.
   * The `startAt` date is therefore one Gregorian day before `endAt`.
   * (Actual sunset time calculation will be added in a later phase.)
   */
  private buildHolidaysFromEvents(events: Event[], _location: HebcalLocation): Holiday[] {
    const holidayEvents: Event[] = [];

    for (const ev of events) {
      if (isPrimaryHolidayEvent(ev)) {
        holidayEvents.push(ev);
      }
    }

    const holidays: Holiday[] = [];

    for (const ev of holidayEvents) {
      const gregDate = ev.getDate().greg();

      // Jewish holidays begin at sunset the evening before the main day.
      // Subtract one day to get the correct start date.
      const startAt = new Date(gregDate);
      startAt.setDate(startAt.getDate() - 1);

      // End date is the main observance day
      const endAt = gregDate;

      holidays.push({
        id: generateHolidayId(ev),
        name: ev.render('en'),
        category: eventToCategory(ev),
        times: { startAt, endAt },
        flags: ev.getFlags(),
      });
    }

    return holidays;
  }
}
