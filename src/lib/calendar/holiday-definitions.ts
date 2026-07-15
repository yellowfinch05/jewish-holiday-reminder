/**
 * holiday-definitions.ts
 *
 * Contains the curated, opinionated list of holidays grouped into
 * Major Holidays and Minor Holidays. This is the single source of truth
 * for which holidays appear in the settings and onboarding UI.
 *
 * Each holiday definition declares:
 *  - canonicalId: stable key used for user preferences across years
 *  - name: display name shown in toggle UI
 *  - description: optional tooltip / sub-label
 *  - matches: hebcal event basename(s) to match — NO overlaps between definitions
 *  - variant: controls toggle rendering:
 *      'single' (default): a regular holiday toggle
 *      'daily': a sub-group toggle for "every day" of a festival
 *      'lump': a single toggle that controls many events
 *  - homePage: controls home page card visibility:
 *      'show' (default): this holiday appears as a card on the home page
 *      'hide': this holiday is notifications-only, no home page card
 */

export interface HolidayDefinition {
  canonicalId: string;
  name: string;
  description?: string;
  /** Hebcal event basename(s) to match — NO overlaps between definitions */
  matches: string[];
  /**
   * Variant affects how the toggle is rendered:
   *  - 'single' (default): a regular holiday toggle
   *  - 'daily': a sub-group toggle for "every day" of a festival
   *  - 'lump': a single toggle that controls many events (Shabbat, Rosh Chodesh)
   */
  variant?: 'single' | 'daily' | 'lump';
  /**
   * Controls home page card visibility:
   *  - 'show' (default): this holiday appears as a card on the home page
   *  - 'hide': this holiday is notifications-only, no home page card
   *
   * By default, 'daily' variants are always hidden from the home page.
   * 'lump' variants are shown by default (e.g., Rosh Chodesh) but can
   * be explicitly hidden (e.g., Shabbat, which is too frequent).
   */
  homePage?: 'show' | 'hide';
}

export interface HolidayGroup {
  groupId: string;
  label: string;
  holidays: HolidayDefinition[];
}

/**
 * The curated holiday groups, in display order.
 *
 * IMPORTANT: No two definitions may share the same hebcal basename in their
 * `matches` arrays. Each hebcal event must resolve to exactly ONE canonicalId.
 * Overlapping matches (e.g., both 'pesach' and 'chag-hamatzot' matching
 * 'Pesach I') are NOT allowed.
 */
export const HOLIDAY_GROUPS: HolidayGroup[] = [
  {
    groupId: 'major',
    label: 'Major Holidays',
    holidays: [
      {
        canonicalId: 'pesach',
        name: 'Passover (1st Day)',
        description: 'Pesach — the Passover sacrifice and feast',
        // @hebcal/core: all Pesach days share basename "Pesach"; day is in render().
        // Detection is render-based in holiday-mapper.ts — matches array is informational only.
        matches: ['Pesach'],
      },
      {
        canonicalId: 'chag-hamatzot',
        name: 'Unleavened Bread (Last Day)',
        description: 'High holy day observances of the Festival of Unleavened Bread',
        // Pesach VII and VIII (diaspora) are detected via render() in holiday-mapper.ts.
        matches: ['Pesach'],
      },
      {
        canonicalId: 'chag-hamatzot-daily',
        name: 'Unleavened Bread — Every Day',
        description: 'All 7 days of the Festival of Unleavened Bread including Chol Hamoed',
        // Chol Hamoed days detected via CHOL_HAMOED flag; Pesach II–VI via render().
        matches: ['Pesach'],
        variant: 'daily',
      },
      {
        canonicalId: 'first-fruits',
        name: 'First Fruits (Yom HaBikkurim)',
        description: 'The beginning of the barley harvest and the start of the Omer count (16 Nisan)',
        // NOTE: @hebcal/core does not emit a dedicated First Fruits event.
        // This canonicalId is reserved for future use or custom events.
        // It intentionally has no matches so it never conflicts with chag-hamatzot-daily.
        matches: [],
      },
      {
        canonicalId: 'omer-daily',
        name: 'Counting the Omer — Daily',
        description: 'Daily reminder for each of the 49 days of the Omer',
        // Detected via OMER_COUNT flag in holiday-mapper.ts; basename is "Omer N".
        matches: [],
        variant: 'daily',
      },
      {
        canonicalId: 'shavuot',
        name: 'Shavuot',
        description: 'Festival of Weeks — the giving of the Torah at Sinai',
        // @hebcal/core basename: "Shavuot" (only Day I is shown; Erev and Day II are filtered).
        matches: ['Shavuot'],
      },
      {
        canonicalId: 'rosh-hashanah',
        name: 'Rosh Hashanah / Yom Teruah',
        description: 'The Feast of Trumpets — the Jewish New Year',
        // @hebcal/core basename: "Rosh Hashana" (Erev and Day II are filtered).
        matches: ['Rosh Hashana'],
      },
      {
        canonicalId: 'yom-kippur',
        name: 'Yom Kippur',
        description: 'The Day of Atonement',
        // @hebcal/core basename: "Yom Kippur" (Erev is filtered).
        matches: ['Yom Kippur'],
      },
      {
        canonicalId: 'sukkot',
        name: 'Sukkot (1st & 8th Day)',
        description: 'The Festival of Tabernacles — first day and Shmini Atzeret (8th day)',
        // @hebcal/core: Sukkot I has basename "Sukkot"; Shmini Atzeret spelled without 'e'.
        // Simchat Torah (9th day in diaspora) is suppressed in fixed-rabbinic.ts.
        matches: ['Sukkot', 'Shmini Atzeret'],
      },
      {
        canonicalId: 'sukkot-daily',
        name: 'Sukkot — Every Day',
        description: 'All days of Sukkot including Chol Hamoed and Shemini Atzeret',
        // Chol Hamoed Sukkot detected via CHOL_HAMOED flag in holiday-mapper.ts.
        matches: [],
        variant: 'daily',
      },
    ],
  },
  {
    groupId: 'minor',
    label: 'Minor Holidays',
    holidays: [
      {
        canonicalId: 'purim',
        name: 'Purim',
        description: 'The Festival of Lots',
        matches: ['Purim'],
      },
      {
        canonicalId: 'chanukah',
        name: 'Chanukah (1st & 8th Day)',
        description: 'The Festival of Lights — first and eighth day candle lighting',
        // Detection is render-based in holiday-mapper.ts (day 1 = "Chanukah: 1 Candle",
        // day 8 = "Chanukah: 8 Candles"). matches array is informational only.
        matches: ['Chanukah'],
      },
      {
        canonicalId: 'chanukah-daily',
        name: 'Chanukah — Every Day',
        description: 'All 8 days of Chanukah',
        // Days 2–7 detected via CHANUKAH_CANDLES flag in holiday-mapper.ts.
        matches: ['Chanukah'],
        variant: 'daily',
      },
      {
        canonicalId: 'tisha-bav',
        name: "Tisha B'Av",
        description: 'The Ninth of Av — mourning the destruction of the Temples',
        // @hebcal/core basename: "Tish'a B'Av" (straight apostrophe, different spelling).
        matches: ["Tish'a B'Av"],
      },
      {
        canonicalId: 'shabbat-all',
        name: 'All Shabbats',
        description: 'Master toggle for all weekly Sabbath observances',
        matches: ['Shabbat'],
        variant: 'lump',
        homePage: 'hide',
      },
      {
        canonicalId: 'rosh-chodesh-all',
        name: 'All New Moons (Rosh Chodesh)',
        description: 'Master toggle for all monthly Rosh Chodesh observances',
        matches: ['Rosh Chodesh'],
        variant: 'lump',
      },
      {
        canonicalId: 'tu-bishvat',
        name: 'Tu BiShvat',
        description: 'New Year for Trees — the birthday of all trees',
        matches: ['Tu BiShvat'],
      },
      {
        canonicalId: 'lag-baomer',
        name: 'Lag BaOmer',
        description: 'The 33rd day of the Omer — a break in semi-mourning',
        matches: ['Lag BaOmer'],
      },
      {
        canonicalId: 'yom-hashoah',
        name: 'Yom HaShoah',
        description: 'Holocaust Remembrance Day',
        matches: ['Yom HaShoah'],
      },
    ],
  },
];

/**
 * Mapping from event canonicalId to the "daily" variant canonicalIds that
 * should also enable this event's home page card.
 *
 * For example, if the user enables "Unleavened Bread — Every Day"
 * (chag-hamatzot-daily), the home page should still show the first and last
 * day cards for Passover (pesach) and Unleavened Bread (chag-hamatzot).
 */
export const HOME_PAGE_DAILY_DEPENDENCIES: Record<string, string[]> = {
  pesach: ['chag-hamatzot-daily'],
  'chag-hamatzot': ['chag-hamatzot-daily'],
  sukkot: ['sukkot-daily'],
  chanukah: ['chanukah-daily'],
};

/**
 * Returns a home page display name for a holiday event, using first/last day
 * naming for multi-day holidays.
 *
 * @param canonicalId - The event's canonical ID
 * @param isLastDay - Whether this event represents the last day of a multi-day festival
 */
export function getHomePageDisplayName(canonicalId: string, isLastDay: boolean): string {
  const def = getDefinitionByCanonicalId(canonicalId);
  if (!def) return '';

  // Multi-day holidays with distinct first/last day naming
  if (canonicalId === 'sukkot') {
    return isLastDay ? 'Sukkot (Last Day)' : 'Sukkot (1st Day)';
  }
  if (canonicalId === 'chanukah') {
    return isLastDay ? 'Chanukah (Last Day)' : 'Chanukah (1st Day)';
  }
  if (canonicalId === 'chag-hamatzot') {
    return isLastDay ? 'Unleavened Bread (Last Day)' : 'Unleavened Bread (1st Day)';
  }

  // Single-day holidays use the definition name as-is
  return def.name;
}

/**
 * Determines whether a holiday event should be hidden from the home page
 * based on its definition's homePage field and variant.
 */
export function isHomePageHidden(canonicalId: string): boolean {
  const def = getDefinitionByCanonicalId(canonicalId);
  if (!def) return true; // Unknown holidays are hidden

  // Daily variants are always notifications-only
  if (def.variant === 'daily') return true;

  // Check explicit homePage setting
  if (def.homePage === 'hide') return true;

  return false;
}

/**
 * Look up a definition by canonicalId.
 */
export function getDefinitionByCanonicalId(canonicalId: string): HolidayDefinition | undefined {
  return getAllHolidayDefinitions().find((def) => def.canonicalId === canonicalId);
}

/**
 * Flatten all holiday definitions across all groups into a single array.
 */
export function getAllHolidayDefinitions(): HolidayDefinition[] {
  return HOLIDAY_GROUPS.flatMap((group) => group.holidays);
}

/**
 * Build a lookup map from hebcal event basename → canonicalId.
 *
 * WARNING: If two definitions share the same basename, the LAST one wins.
 * This is by design — the definitions are ordered so that broader matches
 * (e.g., 'daily' variants) are defined after more specific ones, so the
 * specific ones take precedence in the map.
 */
export function buildBasenameToCanonicalMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const def of getAllHolidayDefinitions()) {
    for (const match of def.matches) {
      map.set(match, def.canonicalId);
    }
  }
  return map;
}