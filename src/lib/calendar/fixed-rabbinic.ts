import {
  flags as hebcalFlags,
  HebrewCalendar,
  Location as HebcalLocation,
  type Event,
} from '@hebcal/core';

import type { AppLocation, Holiday, HolidayGroupId, HolidayTimes } from '@/types';

import { getHomePageDisplayName, getDefinitionByCanonicalId } from './holiday-definitions';
import { getCanonicalIdForEvent, isCuratedEvent } from './holiday-mapper';
import type { CalendarProvider } from './provider';

/**
 * Generates a unique holiday ID by incorporating the Gregorian date.
 */
function generateHolidayId(ev: Event): string {
  const base = (ev.basename() || '').toLowerCase().replace(/\s+/g, '-');
  const slug = base.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
  const greg = ev.getDate().greg();
  const dateStr = greg.toISOString().slice(0, 10);
  return `${slug}_${dateStr}`;
}

/**
 * Returns true if this event is an Erev (eve-of) event that should be
 * suppressed from the holiday list. Erev events are timing markers only;
 * the actual holiday card is generated from the Day I event.
 *
 * We detect Erev events by the EREV flag. However, Chanukah day 1 also
 * carries the EREV flag when it falls on a Friday (eve of Shabbat), so
 * we must not suppress Chanukah candle events.
 */
function isErevEvent(ev: Event): boolean {
  const mask = ev.getFlags();
  // Never suppress Chanukah candle events even if they carry EREV
  if (mask & hebcalFlags.CHANUKAH_CANDLES) return false;
  // EREV flag marks the eve-of event (e.g. "Erev Pesach", "Erev Rosh Hashana")
  if (mask & hebcalFlags.EREV) return true;
  return false;
}

/**
 * Returns true if this event is a candle-lighting or Havdalah timing event
 * that should not generate a holiday card.
 */
function isTimingEvent(ev: Event): boolean {
  const basename = ev.basename() || '';
  return (
    basename === 'Candle lighting' ||
    basename === 'Havdalah' ||
    basename === 'Fast begins' ||
    basename === 'Fast ends' ||
    basename === 'Finish eating chametz' ||
    basename === 'Biur Chametz'
  );
}

/**
 * Returns true if this event is a diaspora duplicate day that should be
 * suppressed — we show only the first day card for these.
 *
 * Suppressed events:
 *  - Rosh Hashana II: duplicate of Day I
 *  - Shavuot II: duplicate of Day I
 *  - Sukkot II: duplicate of Day I (diaspora second day)
 *  - Simchat Torah: diaspora 9th day; Shmini Atzeret (day 8) is the last-day card.
 *  - Pesach VIII: diaspora 8th day; Pesach VII is the canonical last day card.
 *    Suppressing VIII avoids two "Unleavened Bread (Last Day)" cards.
 *
 * NOT suppressed:
 *  - Shmini Atzeret: this is the 8th day of Sukkot and the desired "Last Day" card.
 */
function isDiasporaSecondDay(ev: Event): boolean {
  const rendered = ev.render('en') || '';
  if (rendered === 'Rosh Hashana II') return true;
  if (rendered === 'Shavuot II') return true;
  if (rendered === 'Sukkot II') return true;
  // Suppress Simchat Torah so only Shmini Atzeret shows as the Sukkot last-day card
  if (rendered === 'Simchat Torah') return true;
  // Suppress Pesach VIII (diaspora 8th day) so only Pesach VII shows as the last-day card
  if (rendered === 'Pesach VIII') return true;
  return false;
}

/**
 * Determines if an event represents the last day of a multi-day holiday,
 * based on the rendered event name.
 *
 * Sukkot last day = Shmini Atzeret (8th day). Simchat Torah is suppressed.
 * Pesach last day = Pesach VII (7th day). Pesach VIII is suppressed.
 */
function isLastDayOfMultiDayHoliday(ev: Event): boolean {
  const rendered = ev.render('en') || '';
  const lastDayRenders = new Set([
    'Pesach VII',
    'Shmini Atzeret',
    'Chanukah: 8 Candles',
  ]);
  return lastDayRenders.has(rendered);
}

/**
 * Determines which HolidayGroupId a canonicalId belongs to.
 * Major holidays are specifically defined; everything else is minor.
 */
function canonicalIdToGroup(canonicalId: string): HolidayGroupId {
  const majorIds = new Set([
    'pesach',
    'chag-hamatzot',
    'chag-hamatzot-daily',
    'first-fruits',
    'omer-daily',
    'shavuot',
    'rosh-hashanah',
    'yom-kippur',
    'sukkot',
    'sukkot-daily',
  ]);
  return majorIds.has(canonicalId) ? 'major' : 'minor';
}

/**
 * Returns the display name for a holiday event.
 *
 * For 'lump' variant holidays (Rosh Chodesh, Shabbat), the specific
 * instance name from ev.render('en') is used (e.g. "Rosh Chodesh Sh'vat")
 * rather than the generic definition label ("All New Moons (Rosh Chodesh)").
 *
 * For all other holidays, getHomePageDisplayName() is used.
 */
function getDisplayName(ev: Event, canonicalId: string, isLast: boolean): string {
  const def = getDefinitionByCanonicalId(canonicalId);

  // Lump-variant holidays: use the specific rendered name from hebcal
  // (e.g. "Rosh Chodesh Sh'vat" instead of "All New Moons (Rosh Chodesh)")
  if (def?.variant === 'lump') {
    const rendered = ev.render('en') || '';
    // Strip timing suffix if present (e.g. "Candle lighting: 4:22pm")
    // Rosh Chodesh renders as just the name, so this is safe
    return rendered || def.name;
  }

  return getHomePageDisplayName(canonicalId, isLast);
}

/**
 * FixedRabbinicCalendarProvider — MVP calendar implementation.
 *
 * Uses @hebcal/core to compute holidays according to the standard
 * fixed rabbinic Jewish calendar. Erev events are filtered out so
 * each holiday appears as a single card on its actual day.
 *
 * Uses the curated holiday definitions from holiday-definitions.ts
 * to map events to canonical IDs, and includes Omer counts, Chol Hamoed,
 * and other daily events that match the curated list.
 */
export class FixedRabbinicCalendarProvider implements CalendarProvider {
  getHolidays(year: number): Holiday[] {
    const location = HebcalLocation.lookup('New York');
    if (!location) return [];

    const options = {
      year,
      isHebrewYear: false,
      candlelighting: true,
      location,
      il: false,
      noHolidays: false,
      noMinorFast: false,
      noModern: false,
      noRoshChodesh: false,
      noSpecialShabbat: false,
      sedrot: false,
      omer: true,
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
      candlelighting: true,
      location,
      il: false,
      noHolidays: false,
      noMinorFast: false,
      noModern: false,
      noRoshChodesh: false,
      noSpecialShabbat: false,
      sedrot: false,
      omer: true,
    };

    const events = HebrewCalendar.calendar(options);
    return this.buildHolidaysFromEvents(events, location);
  }

  getHolidayTimes(holiday: Holiday, _location: AppLocation): HolidayTimes {
    return holiday.times;
  }

  /**
   * Builds Holiday objects from raw @hebcal/core events.
   * Filters events through the curated holiday mapper so only
   * events matching our defined holidays are included.
   *
   * Erev events, timing events (candle lighting, Havdalah), and
   * diaspora second-day duplicates are suppressed.
   */
  private buildHolidaysFromEvents(events: Event[], _location: HebcalLocation): Holiday[] {
    const holidays: Holiday[] = [];

    for (const ev of events) {
      // Skip timing-only events (candle lighting, Havdalah, fast times)
      if (isTimingEvent(ev)) continue;

      // Skip Erev (eve-of) events — the actual holiday card comes from Day I
      if (isErevEvent(ev)) continue;

      // Skip diaspora second-day duplicates (Rosh Hashana II, Shavuot II, Sukkot II)
      if (isDiasporaSecondDay(ev)) continue;

      if (!isCuratedEvent(ev)) continue;

      const gregDate = ev.getDate().greg();
      const canonicalId = getCanonicalIdForEvent(ev);

      // Skip events that don't match any curated holiday
      if (!canonicalId) continue;

      // Use curated display name instead of raw hebcal name
      const isLast = isLastDayOfMultiDayHoliday(ev);
      const displayName = getDisplayName(ev, canonicalId, isLast);

      // Jewish holidays begin at sunset the evening before the main day.
      const startAt = new Date(gregDate);
      startAt.setDate(startAt.getDate() - 1);

      const endAt = gregDate;

      holidays.push({
        id: generateHolidayId(ev),
        canonicalId,
        name: displayName,
        groupId: canonicalIdToGroup(canonicalId),
        times: { startAt, endAt },
        flags: ev.getFlags(),
      });
    }

    // Inject synthetic First Fruits (Yom HaBikkurim) — @hebcal/core has no dedicated event.
    // First Fruits occurs on 16 Nisan, the day after Pesach I.
    // In diaspora, 16 Nisan is also Pesach II (chag-hamatzot-daily), which is correct.
    this.injectFirstFruits(holidays);

    // Deduplicate by (canonicalId + date) so each day shows once
    return this.deduplicateHolidays(holidays);
  }

  /**
   * Injects synthetic First Fruits (Yom HaBikkurim) holidays.
   *
   * First Fruits = 16 Nisan = the day after Pesach I (15 Nisan).
   * Since @hebcal/core has no dedicated event, we compute it synthetically
   * by finding each Pesach I holiday and adding a holiday for the next day.
   */
  private injectFirstFruits(holidays: Holiday[]): void {
    // Find all Pesach I holidays in the list
    const pesachIHolidays = holidays.filter((h) => h.canonicalId === 'pesach');
    for (const pesachI of pesachIHolidays) {
      // First Fruits begins at sunset of 15 Nisan = sunset the day after Pesach I starts
      const startAt = new Date(pesachI.times.endAt);
      // First Fruits ends at nightfall of 16 Nisan
      const endAt = new Date(pesachI.times.endAt);
      endAt.setDate(endAt.getDate() + 1);

      const isoDate = endAt.toISOString().slice(0, 10);
      holidays.push({
        id: `first-fruits_${isoDate}`,
        canonicalId: 'first-fruits',
        name: 'First Fruits (Yom HaBikkurim)',
        groupId: 'major',
        times: { startAt, endAt },
      });
    }
  }

  /**
   * Deduplicates holiday entries by (canonicalId, date).
   *
   * For Rosh Chodesh events, uses a different strategy:
   * Two-day Rosh Chodesh months (Adar, Iyyar, Tamuz, Cheshvan, Kislev, Tevet, Elul)
   * emit events on the 30th of the previous month AND the 1st of the new month.
   * We keep only the LAST occurrence (1st of the new month), which is the
   * canonical date for the new moon observance.
   *
   * For all other events, if two events share the same canonicalId and startAt date,
   * keep only the first one.
   */
  private deduplicateHolidays(holidays: Holiday[]): Holiday[] {
    // Rosh Chodesh: group by (rendered name + year), keep only the LAST occurrence.
    // Two-day Rosh Chodesh months emit events on the 30th of the previous month
    // AND the 1st of the new month. We keep the latter (1st of the new month).
    // The key includes the year so events from different years are kept separately.
    const rcByYear = new Map<string, Holiday>();
    for (const h of holidays) {
      if (h.canonicalId === 'rosh-chodesh-all') {
        const year = h.times.startAt.getFullYear();
        const key = `${h.name}_${year}`;
        const existing = rcByYear.get(key);
        if (!existing || h.times.startAt > existing.times.startAt) {
          rcByYear.set(key, h);
        }
      }
    }

    // All other events: deduplicate by (canonicalId, date), keep first occurrence
    const seen = new Set<string>();
    const result: Holiday[] = [];
    for (const h of holidays) {
      if (h.canonicalId === 'rosh-chodesh-all') continue;
      const key = `${h.canonicalId}_${h.times.startAt.toISOString().slice(0, 10)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(h);
    }

    // Merge deduplicated Rosh Chodesh events with the rest
    result.push(...Array.from(rcByYear.values()));
    return result;
  }
}
