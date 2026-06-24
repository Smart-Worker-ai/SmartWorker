/**
 * Plivo SMS provider implementation.
 * Tier-2 cloud provider — cost-effective for production workloads.
 */

import axios from 'axios';
import { ISmsProvider, ProviderName, ProviderSendResult } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

export class PlivoProvider implements ISmsProvider {
  readonly name = ProviderName.PLIVO;

  private readonly authId: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly baseUrl: string;

  constructor() {
    this.authId = config.providers.plivo.authId;
    this.authToken = config.providers.plivo.authToken;
    this.fromNumber = config.providers.plivo.fromNumber;
    this.baseUrl = `https://api.plivo.com/v1/Account/${this.authId}`;
  }

  async send(to: string, body: string): Promise<ProviderSendResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/Message/`,
        {
          src: this.fromNumber,
          dst: to.replace('+', ''),
          text: body,
        },
        {
          auth: {
            username: this.authId,
            password: this.authToken,
          },
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      const messageUuid = response.data.message_uuid?.[0] || response.data.message_uuid;

      return {
        success: true,
        providerMessageId: messageUuid,
        costUsd: 0.005,
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.message;
      logger.error(`Plivo send failed: ${errMsg}`, { provider: this.name });

      return {
        success: false,
        errorCode: error.response?.status?.toString(),
        errorMessage: errMsg,
      };
    }
  }
}
