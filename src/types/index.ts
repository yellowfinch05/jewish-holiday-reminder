export type HolidayCategory = 'major' | 'minor' | 'fast' | 'shabbat';

export interface HolidayTimes {
  /** Gregorian date when the holiday begins (sunset-based in Jewish tradition) */
  startAt: Date;
  /** Gregorian date when the holiday ends */
  endAt: Date;
}

export interface Holiday {
  /** Stable unique identifier incorporating date (e.g. "tisha-bav_2026-07-23") */
  id: string;
  /** Transliterated Hebrew name (e.g. "Yom Kippur") */
  name: string;
  /** Category for filtering */
  category: HolidayCategory;
  /** Holiday start/end times */
  times: HolidayTimes;
  /** The raw @hebcal/core event flags bitmask, for advanced filtering */
  flags?: number;
}

export interface AppLocation {
  /** City display name (e.g. "New York, New York, USA") */
  name: string;
  /** Short city name (e.g. "New York") */
  shortName: string;
  /** IANA timezone ID (e.g. "America/New_York") */
  timezone: string;
  /** ISO country code */
  countryCode: string;
}
