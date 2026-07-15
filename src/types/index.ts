export type HolidayGroupId = 'major' | 'minor';

export interface HolidayTimes {
  /** Gregorian date when the holiday begins (sunset-based in Jewish tradition) */
  startAt: Date;
  /** Gregorian date when the holiday ends */
  endAt: Date;
}

export interface Holiday {
  /** Date-unique identifier for React rendering (e.g. "tisha-bav_2026-07-23") */
  id: string;
  /** Stable canonical slug for preferences (e.g. "tisha-bav"), independent of year */
  canonicalId: string;
  /** Transliterated Hebrew name (e.g. "Yom Kippur") */
  name: string;
  /** Group for filtering */
  groupId: HolidayGroupId;
  /** Holiday start/end times */
  times: HolidayTimes;
  /** The raw @hebcal/core event flags bitmask, for advanced filtering */
  flags?: number;
}

/**
 * A single holiday item as rendered in the settings/onboarding UI,
 * with its enabled state merged from user preferences.
 */
export interface HolidayItem {
  id: string;
  canonicalId: string;
  name: string;
  description?: string;
  enabled: boolean;
  /** 'daily' or 'lump' toggles get special rendering treatment */
  variant?: 'single' | 'daily' | 'lump';
}

/**
 * A group of holidays rendered as a section in the UI.
 */
export interface HolidayGroup {
  groupId: string;
  label: string;
  holidays: HolidayItem[];
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

export type NotificationTiming = '1_week' | '1_day' | '1_hour' | 'at_sunset';

export interface UserProfile {
  id: string;
  location: string;
  timezone: string;
  onboarding_complete: boolean;
  created_at: string;
}

export interface HolidayPreference {
  id: string;
  user_id: string;
  holiday_id: string;
  enabled: boolean;
}

export interface NotificationTimingRecord {
  id: string;
  user_id: string;
  holiday_id: string;
  timing: NotificationTiming;
}
