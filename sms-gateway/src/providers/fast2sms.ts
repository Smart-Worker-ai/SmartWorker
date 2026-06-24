/**
 * Fast2SMS provider implementation.
 * Budget-friendly India SMS provider for transactional messages.
 */

import axios from 'axios';
import { ISmsProvider, ProviderName, ProviderSendResult } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

export class Fast2SmsProvider implements ISmsProvider {
  readonly name = ProviderName.FAST2SMS;

  private readonly apiKey: string;
  private readonly senderId: string;

  constructor() {
    this.apiKey = config.providers.fast2sms.apiKey;
    this.senderId = config.providers.fast2sms.senderId;
  }

  async send(to: string, body: string): Promise<ProviderSendResult> {
    try {
      // Fast2SMS expects 10-digit Indian numbers without country code
      let phone = to.replace('+91', '').replace('+', '');
      if (phone.startsWith('91') && phone.length === 12) {
        phone = phone.substring(2);
      }

      const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          route: 'dlt',
          sender_id: this.senderId,
          message: body,
          language: 'english',
          flash: 0,
          numbers: phone,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            authorization: this.apiKey,
          },
          timeout: 10000,
        }
      );

      return {
        success: response.data.return === true,
        providerMessageId: response.data.request_id,
        costUsd: 0.0015,
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`Fast2SMS send failed: ${errMsg}`, { provider: this.name });

      return {
        success: false,
        errorCode: error.response?.data?.status_code?.toString(),
        errorMessage: errMsg,
      };
    }
  }
}
