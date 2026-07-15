'use server';

import { HOLIDAY_GROUPS } from './holiday-definitions';

export type HolidayCategoryOutput = {
  groupId: string;
  label: string;
  holidays: {
    canonicalId: string;
    name: string;
    description?: string;
    variant?: string;
  }[];
};

/**
 * Returns the curated holiday groups with their definitions.
 * Used by the onboarding wizard to populate holiday preference toggles.
 *
 * This is now a static data return — no hebcal query needed.
 * The holiday list is defined in holiday-definitions.ts.
 */
export async function getHolidayCategories(): Promise<HolidayCategoryOutput[]> {
  return HOLIDAY_GROUPS.map((group) => ({
    groupId: group.groupId,
    label: group.label,
    holidays: group.holidays.map((h) => ({
      canonicalId: h.canonicalId,
      name: h.name,
      description: h.description,
      variant: h.variant,
    })),
  }));
}

/**
 * Returns a list of supported city names for the location dropdown.
 */
export async function getSupportedCities(): Promise<string[]> {
  // Return only cities verified to exist in @hebcal/core's database.
  // A future iteration will add geocoding (Option B) to support any city.
  return [
    'New York',
    'Los Angeles',
    'Chicago',
    'Miami',
    'Boston',
    'Philadelphia',
    'Baltimore',
    'Washington DC',
    'Atlanta',
    'Detroit',
    'Cleveland',
    'Denver',
    'Phoenix',
    'Seattle',
    'San Francisco',
    'Portland',
    'Houston',
    'Dallas',
    'Las Vegas',
    'Minneapolis',
    'Saint Louis',
    'Pittsburgh',
    'Cincinnati',
    'Buffalo',
    'San Diego',
    'Austin',
    'Providence',
    'Jerusalem',
    'Tel Aviv',
    'Haifa',
    'London',
    'Paris',
    'Berlin',
    'Sydney',
    'Melbourne',
    'Johannesburg',
    'Buenos Aires',
    'Sao Paulo',
    'Mexico City',
    'Toronto',
    'Montreal',
    'Vancouver',
  ];
}
