/**
 * Phone number validation and normalization using libphonenumber.
 * All phone numbers are normalized to E.164 format on ingress.
 */

import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';
import { config } from '../config';

export interface PhoneValidationResult {
  valid: boolean;
  e164?: string;
  countryCode?: string;
  nationalNumber?: string;
  errorMessage?: string;
}

/**
 * Validate and normalize a phone number to E.164 format.
 * Rejects numbers not in the allowed country list.
 */
export function validatePhone(phone: string, defaultCountry?: string): PhoneValidationResult {
  try {
    if (!phone || phone.trim().length === 0) {
      return { valid: false, errorMessage: 'Phone number is required' };
    }

    const countryHint = (defaultCountry?.toUpperCase() || undefined) as CountryCode | undefined;

    if (!isValidPhoneNumber(phone, countryHint)) {
      return { valid: false, errorMessage: 'Invalid phone number format' };
    }

    const parsed = parsePhoneNumber(phone, countryHint);
    if (!parsed) {
      return { valid: false, errorMessage: 'Unable to parse phone number' };
    }

    const countryCode = parsed.country;
    if (!countryCode) {
      return { valid: false, errorMessage: 'Unable to determine country from phone number' };
    }

    // Enforce country allow-list
    if (!config.security.allowedCountries.includes(countryCode)) {
      return {
        valid: false,
        errorMessage: `SMS to country ${countryCode} is not allowed`,
      };
    }

    return {
      valid: true,
      e164: parsed.format('E.164'),
      countryCode,
      nationalNumber: parsed.nationalNumber,
    };
  } catch {
    return { valid: false, errorMessage: 'Phone number validation failed' };
  }
}

/**
 * Extract the country code from a validated E.164 number.
 */
export function getCountryFromE164(e164: string): string | undefined {
  try {
    const parsed = parsePhoneNumber(e164);
    return parsed?.country;
  } catch {
    return undefined;
  }
}
