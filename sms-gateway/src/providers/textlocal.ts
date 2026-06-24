/**
 * TextLocal SMS provider implementation.
 * Regional SMS provider with strong India support.
 */

import axios from 'axios';
import { ISmsProvider, ProviderName, ProviderSendResult } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

export class TextLocalProvider implements ISmsProvider {
  readonly name = ProviderName.TEXTLOCAL;

  private readonly apiKey: string;
  private readonly sender: string;

  constructor() {
    this.apiKey = config.providers.textlocal.apiKey;
    this.sender = config.providers.textlocal.sender;
  }

  async send(to: string, body: string): Promise<ProviderSendResult> {
    try {
      const phone = to.replace('+', '');

      const response = await axios.post(
        'https://api.textlocal.in/send/',
        new URLSearchParams({
          apikey: this.apiKey,
          numbers: phone,
          message: body,
          sender: this.sender,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000,
        }
      );

      if (response.data.status === 'failure') {
        return {
          success: false,
          errorCode: response.data.errors?.[0]?.code?.toString(),
          errorMessage: response.data.errors?.[0]?.message,
        };
      }

      return {
        success: true,
        providerMessageId: response.data.messages?.[0]?.id,
        costUsd: 0.003,
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`TextLocal send failed: ${errMsg}`, { provider: this.name });

      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: errMsg,
      };
    }
  }
}
