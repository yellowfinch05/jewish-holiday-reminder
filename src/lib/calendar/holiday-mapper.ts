/**
 * holiday-mapper.ts
 *
 * Maps @hebcal/core Event instances to our curated canonicalId values.
 * Also determines whether an event should be included in the calendar
 * based on our curated holiday definitions.
 *
 * KEY FACT about @hebcal/core basename() values:
 *   - Multi-day festivals (Pesach, Shavuot, Sukkot, Rosh Hashana) all share
 *     a single basename() for the entire festival family (e.g. "Pesach").
 *     Individual days are only distinguishable via render('en') or getFlags().
 *   - Chanukah candle events all have basename() = "Chanukah" with CHANUKAH_CANDLES flag.
 *   - Rosh Chodesh events have basename() = "Rosh Chodesh <MonthName>" (never bare "Rosh Chodesh").
 *   - Omer events have basename() = "Omer N" (never bare "Omer").
 *   - Shmini Atzeret is spelled "Shmini Atzeret" (not "Shemini Atzeret").
 *   - Tisha B'Av is spelled "Tish'a B'Av" with a straight apostrophe.
 */
import {
  flags as hebcalFlags,
  type Event,
} from '@hebcal/core';

import { buildBasenameToCanonicalMap, getAllHolidayDefinitions } from './holiday-definitions';

// Build the basename → canonicalId lookup once
let basenameMap: Map<string, string> | null = null;

function getBasenameMap(): Map<string, string> {
  if (!basenameMap) {
    basenameMap = buildBasenameToCanonicalMap();
  }
  return basenameMap;
}

/**
 * Returns the canonicalId for a given event by matching its basename
 * against our curated holiday definitions.
 *
 * Detection order (most-specific first):
 *  1. Omer count events → 'omer-daily'
 *  2. Rosh Chodesh (flag-based) → 'rosh-chodesh-all'
 *  3. Chol Hamoed (flag-based) → 'chag-hamatzot-daily' or 'sukkot-daily'
 *  4. Pesach days (render-based, since all share basename "Pesach"):
 *       Pesach I  → 'pesach'
 *       Pesach VII → 'chag-hamatzot'
 *       Pesach VIII → 'chag-hamatzot'  (diaspora 8th day, same card as 7th)
 *       Pesach II–VI → 'chag-hamatzot-daily'
 *  5. Chanukah candles (flag-based, render-based for day 1 and day 8):
 *       Day 1 → 'chanukah'
 *       Day 8 → 'chanukah'
 *       Days 2–7 → 'chanukah-daily'
 *  6. Shabbat (basename-based) → 'shabbat-all'
 *  7. Basename map lookup (covers Shavuot, Rosh Hashana, Yom Kippur, Sukkot,
 *       Shmini Atzeret, Simchat Torah, Tish'a B'Av, Purim, Tu BiShvat,
 *       Lag BaOmer, Yom HaShoah)
 *
 * Returns undefined if no curated definition matches.
 */
export function getCanonicalIdForEvent(ev: Event): string | undefined {
  const mask = ev.getFlags();
  const basename = ev.basename() || '';

  // 1. Omer (daily counting) — check before anything else
  if (mask & hebcalFlags.OMER_COUNT) {
    return 'omer-daily';
  }

  // 2. Rosh Chodesh (flag-based — basename includes month name, never bare)
  if (mask & hebcalFlags.ROSH_CHODESH) {
    return 'rosh-chodesh-all';
  }

  // 3. Chol Hamoed (intermediate festival days)
  if (mask & hebcalFlags.CHOL_HAMOED) {
    if (basename === 'Pesach') {
      return 'chag-hamatzot-daily';
    }
    if (basename === 'Sukkot') {
      return 'sukkot-daily';
    }
  }

  // 4. Pesach days — all share basename "Pesach"; distinguish via render()
  if (basename === 'Pesach') {
    const rendered = ev.render('en') || '';
    if (rendered === 'Pesach I') return 'pesach';
    if (rendered === 'Pesach VII') return 'chag-hamatzot';
    if (rendered === 'Pesach VIII') return 'chag-hamatzot'; // diaspora 8th day
    if (
      rendered === 'Pesach II' ||
      rendered === 'Pesach III (CH\'\'M)' ||
      rendered === 'Pesach IV (CH\'\'M)' ||
      rendered === 'Pesach V (CH\'\'M)' ||
      rendered === 'Pesach VI (CH\'\'M)'
    ) {
      return 'chag-hamatzot-daily';
    }
    // Erev Pesach — skip (handled by Erev filter in fixed-rabbinic.ts)
    return undefined;
  }

  // 5. Chanukah candles — all share basename "Chanukah" with CHANUKAH_CANDLES flag
  //    Distinguish day 1 and day 8 (the "bookend" days) from days 2–7.
  if (mask & hebcalFlags.CHANUKAH_CANDLES) {
    const rendered = ev.render('en') || '';
    if (rendered === 'Chanukah: 1 Candle') return 'chanukah'; // 1st day
    if (rendered === 'Chanukah: 8 Candles') return 'chanukah'; // 8th day
    return 'chanukah-daily'; // days 2–7
  }

  // 6. Shabbat (Special Shabbatot have names like "Shabbat Zachor" — basename starts with "Shabbat")
  if (basename === 'Shabbat' || basename.startsWith('Shabbat ')) {
    return 'shabbat-all';
  }

  // 7. Basename map lookup (covers remaining holidays with stable basenames)
  if (basename) {
    const map = getBasenameMap();
    if (map.has(basename)) {
      return map.get(basename);
    }
  }

  return undefined;
}

/**
 * Determines if an event should be included as a calendar display event
 * based on our curated holiday definitions.
 *
 * This replaces the generic isPrimaryHolidayEvent() check by also
 * including Omer counts, Chol Hamoed, and other events that match
 * our curated list.
 */
export function isCuratedEvent(ev: Event): boolean {
  const mask = ev.getFlags();

  // Exclude non-holiday events
  if (mask & hebcalFlags.PARSHA_HASHAVUA) return false;
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
  if (mask & hebcalFlags.HEBREW_DATE) return false;

  // Always include events that match our curated definitions
  const canonicalId = getCanonicalIdForEvent(ev);
  if (canonicalId) {
    return true;
  }

  // Still include standard primary events that aren't in our curated list
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
 * Returns all curated canonicalIds. Used for building the UI toggle list.
 */
export function getAllCuratedCanonicalIds(): string[] {
  return getAllHolidayDefinitions().map((def) => def.canonicalId);
}
