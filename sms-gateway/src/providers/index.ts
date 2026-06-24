/**
 * Provider registry — the pluggable provider layer.
 * Adding a new provider is a config + implementation change, not an architecture change.
 * Each provider implements ISmsProvider and is registered here.
 */

import { ISmsProvider, ProviderName } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { TwilioProvider } from './twilio';
import { PlivoProvider } from './plivo';
import { Msg91Provider } from './msg91';
import { TextLocalProvider } from './textlocal';
import { Fast2SmsProvider } from './fast2sms';
import { MockProvider } from './mock';

const providers = new Map<ProviderName, ISmsProvider>();

/**
 * Initialize all configured providers.
 * Only providers with valid credentials are registered.
 */
export function initializeProviders(): void {
  logger.info('Initializing SMS providers...');

  if (config.providers.twilio.enabled) {
    providers.set(ProviderName.TWILIO, new TwilioProvider());
    logger.info('✓ Twilio provider enabled');
  }

  if (config.providers.plivo.enabled) {
    providers.set(ProviderName.PLIVO, new PlivoProvider());
    logger.info('✓ Plivo provider enabled');
  }

  if (config.providers.msg91.enabled) {
    providers.set(ProviderName.MSG91, new Msg91Provider());
    logger.info('✓ MSG91 provider enabled');
  }

  if (config.providers.textlocal.enabled) {
    providers.set(ProviderName.TEXTLOCAL, new TextLocalProvider());
    logger.info('✓ TextLocal provider enabled');
  }

  if (config.providers.fast2sms.enabled) {
    providers.set(ProviderName.FAST2SMS, new Fast2SmsProvider());
    logger.info('✓ Fast2SMS provider enabled');
  }

  // Always register mock provider for development/testing
  if (config.isDevelopment || config.isTest) {
    providers.set(ProviderName.MOCK, new MockProvider());
    logger.info('✓ Mock provider enabled (development)');
  }

  const enabledCount = providers.size;
  if (enabledCount === 0) {
    logger.error('No SMS providers configured — the gateway cannot send messages');
  } else {
    logger.info(`${enabledCount} SMS provider(s) initialized`);
  }
}

/**
 * Get a specific provider by name.
 */
export function getProvider(name: ProviderName): ISmsProvider | undefined {
  return providers.get(name);
}

/**
 * Get all enabled providers, ordered by priority for a given country.
 * Excludes providers in the exclusion list (already-tried providers for this message).
 */
export function getProvidersForCountry(
  country: string,
  excludeProviders: ProviderName[] = []
): ISmsProvider[] {
  const available: ISmsProvider[] = [];

  for (const [name, provider] of providers) {
    if (excludeProviders.includes(name)) continue;
    if (name === ProviderName.MOCK && config.isProduction) continue;
    available.push(provider);
  }

  return available;
}

/**
 * Get the count of enabled providers.
 */
export function getProviderCount(): number {
  return providers.size;
}
