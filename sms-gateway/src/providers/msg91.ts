/**
 * MSG91 SMS provider implementation.
 * India-focused provider with DLT compliance support.
 * Requires DLT-registered sender ID and template ID for Indian numbers.
 */

import axios from 'axios';
import { ISmsProvider, ProviderName, ProviderSendResult } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

export class Msg91Provider implements ISmsProvider {
  readonly name = ProviderName.MSG91;

  private readonly authKey: string;
  private readonly senderId: string;
  private readonly dltTemplateId: string;

  constructor() {
    this.authKey = config.providers.msg91.authKey;
    this.senderId = config.providers.msg91.senderId;
    this.dltTemplateId = config.providers.msg91.dltTemplateId;
  }

  async send(to: string, body: string): Promise<ProviderSendResult> {
    try {
      const phone = to.replace('+', '');

      const response = await axios.post(
        'https://control.msg91.com/api/v5/flow/',
        {
          template_id: this.dltTemplateId,
          sender: this.senderId,
          short_url: '0',
          mobiles: phone,
          // MSG91 uses flow/template variables
          VAR1: body,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            authkey: this.authKey,
          },
          timeout: 10000,
        }
      );

      return {
        success: response.data.type === 'success',
        providerMessageId: response.data.request_id,
        costUsd: 0.002,
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`MSG91 send failed: ${errMsg}`, { provider: this.name });

      return {
        success: false,
        errorCode: error.response?.data?.code,
        errorMessage: errMsg,
      };
    }
  }
}
