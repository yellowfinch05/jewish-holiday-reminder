import { Location as HebcalLocation } from '@hebcal/core';

import type { AppLocation } from '@/types';

/**
 * Service for resolving city names to geographic locations.
 * Wraps @hebcal/core's Location.lookup() for the MVP.
 */
export class LocationService {
  /**
   * Resolves a city name to an AppLocation.
   * Uses @hebcal/core's built-in ~60 city database.
   *
   * @param cityName - Case-insensitive city name (e.g. "New York", "Jerusalem")
   * @returns AppLocation or null if the city is not found
   */
  static resolve(cityName: string): AppLocation | null {
    const hebcalLoc = HebcalLocation.lookup(cityName);
    if (!hebcalLoc) {
      return null;
    }

    return {
      name: hebcalLoc.getName() ?? cityName,
      shortName: hebcalLoc.getShortName() ?? cityName,
      timezone: hebcalLoc.getTzid(),
      countryCode: hebcalLoc.getCountryCode() ?? 'US',
    };
  }

  /**
   * Returns the default location (New York) for MVP.
   */
  static defaultLocation(): AppLocation {
    return {
      name: 'New York, New York, USA',
      shortName: 'New York',
      timezone: 'America/New_York',
      countryCode: 'US',
    };
  }
}
