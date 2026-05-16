/**
 * Twilio SMS provider implementation.
 * Uses Twilio REST API directly (no SDK dependency) for minimal footprint.
 */

import axios from 'axios';
import { ISmsProvider, ProviderName, ProviderSendResult } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

export class TwilioProvider implements ISmsProvider {
  readonly name = ProviderName.TWILIO;

  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly baseUrl: string;

  constructor() {
    this.accountSid = config.providers.twilio.accountSid;
    this.authToken = config.providers.twilio.authToken;
    this.fromNumber = config.providers.twilio.fromNumber;
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
  }

  async send(to: string, body: string): Promise<ProviderSendResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/Messages.json`,
        new URLSearchParams({
          To: to,
          From: this.fromNumber,
          Body: body,
        }).toString(),
        {
          auth: {
            username: this.accountSid,
            password: this.authToken,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        providerMessageId: response.data.sid,
        costUsd: parseFloat(response.data.price) || 0.0075,
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`Twilio send failed: ${errMsg}`, { to: '[REDACTED]', provider: this.name });

      return {
        success: false,
        errorCode: error.response?.data?.code?.toString(),
        errorMessage: errMsg,
      };
    }
  }

  async getBalance(): Promise<number> {
    try {
      const response = await axios.get(`${this.baseUrl}/Balance.json`, {
        auth: { username: this.accountSid, password: this.authToken },
        timeout: 5000,
      });
      return parseFloat(response.data.balance);
    } catch {
      return -1;
    }
  }
}
