/**
 * AURELIS PRIVATE WEALTH PLATFORM
 * SMS Gateway Service — sms.net.bd Integration
 *
 * Provides live SMS dispatch, account balance queries, and delivery reporting
 * via the sms.net.bd REST API.
 */

export interface SendSmsOptions {
  to: string | string[];
  msg: string;
  sender_id?: string;
  schedule?: string; // Y-m-d H:i:s (e.g. 2026-09-20 16:38:56)
  content_id?: string;
}

export interface SmsDeliveryResult {
  success: boolean;
  provider: 'sms.net.bd' | 'simulated';
  requestId?: number | string;
  error?: string;
  errorCode?: number;
  recipient?: string;
  raw?: any;
}

export interface SmsBalanceResult {
  success: boolean;
  balance?: string;
  error?: string;
  errorCode?: number;
}

export interface SmsReportRecipient {
  number: string;
  charge: string;
  status: string;
}

export interface SmsReportResult {
  success: boolean;
  requestId?: number | string;
  requestStatus?: string;
  requestCharge?: string;
  recipients?: SmsReportRecipient[];
  error?: string;
  errorCode?: number;
}

/**
 * Standard sms.net.bd error code translations
 */
export const SMS_NET_BD_ERROR_MESSAGES: Record<number, string> = {
  0: 'Success. Everything worked as expected.',
  400: 'The request was rejected due to a missing or invalid parameter.',
  403: "You don't have permissions to perform the request.",
  404: 'The requested resource was not found.',
  405: 'Authorization required. Please verify your API key.',
  409: 'Unknown error occurred on SMS server.',
  410: 'Account expired.',
  411: 'Reseller account expired or suspended.',
  412: 'Invalid schedule date/time format (Expected Y-m-d H:i:s).',
  413: 'Invalid Sender ID.',
  414: 'Message is empty.',
  415: 'Message is too long.',
  416: 'No valid phone number found.',
  417: 'Insufficient balance on sms.net.bd account.',
  420: 'Content blocked.',
  421: 'You can only send SMS to your registered phone number until first balance recharge.',
};

export class SmsService {
  private static readonly API_BASE_URL = 'https://api.sms.net.bd';

  /**
   * Normalize phone number to standard format accepted by sms.net.bd:
   * "The Number must start with country code(880) or Standard 01X."
   */
  public static normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    // Strip whitespace, hyphens, brackets, parentheses
    let cleaned = phone.replace(/[\s\-()]/g, '');

    // Strip leading '+'
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    // If starts with 01 (local Bangladeshi format e.g. 01712345678, 11 digits), prefix with 88
    if (/^01[3-9]\d{8}$/.test(cleaned)) {
      return `88${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Normalizes a single phone or array/comma-separated string of phones
   */
  public static normalizeRecipients(to: string | string[]): string {
    const list = Array.isArray(to)
      ? to
      : to.split(',').map((s) => s.trim()).filter(Boolean);

    return list
      .map((p) => this.normalizePhoneNumber(p))
      .filter(Boolean)
      .join(',');
  }

  /**
   * Check if sms.net.bd API key is present in environment
   */
  public static isConfigured(): boolean {
    const key = process.env.SMS_NET_BD_API_KEY || process.env.SMS_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  /**
   * Send SMS via https://api.sms.net.bd/sendsms
   */
  public static async sendSms(options: SendSmsOptions): Promise<SmsDeliveryResult> {
    const apiKey = (process.env.SMS_NET_BD_API_KEY || process.env.SMS_API_KEY || '').trim();
    const recipientFormatted = this.normalizeRecipients(options.to);
    const senderId =
      options.sender_id ||
      process.env.SMS_NET_BD_SENDER_ID ||
      process.env.SMS_SENDER_ID ||
      '';

    if (!apiKey) {
      console.log(
        `[AURELIS-SMS-SIMULATED] sms.net.bd not configured. Message simulated to ${recipientFormatted || options.to}: "${options.msg.substring(0, 60)}..."`
      );
      return {
        success: true,
        provider: 'simulated',
        recipient: recipientFormatted || String(options.to),
      };
    }

    try {
      const url = `${this.API_BASE_URL}/sendsms`;
      const formData = new URLSearchParams();
      formData.append('api_key', apiKey);
      formData.append('msg', options.msg);
      formData.append('to', recipientFormatted);

      if (senderId) {
        formData.append('sender_id', senderId.trim());
      }
      if (options.schedule) {
        formData.append('schedule', options.schedule.trim());
      }
      if (options.content_id) {
        formData.append('content_id', options.content_id.trim());
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data: any = await res.json().catch(() => ({}));

      // sms.net.bd returns { error: 0, msg: "Request successfully submitted", data: { request_id: ... } } on success
      if (data && data.error === 0) {
        const requestId = data.data?.request_id;
        console.log(
          `[AURELIS-SMS-NET-BD] SMS sent successfully to ${recipientFormatted} [Request ID: ${requestId}]`
        );
        return {
          success: true,
          provider: 'sms.net.bd',
          requestId,
          recipient: recipientFormatted,
          raw: data,
        };
      }

      // If rejected due to unapproved Sender ID, retry once automatically without sender_id
      if (data && data.error === 413 && senderId) {
        console.warn(
          `[AURELIS-SMS-NET-BD] Sender ID "${senderId}" not approved. Retrying with default sender...`
        );
        formData.delete('sender_id');
        const retryRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });
        const retryData: any = await retryRes.json().catch(() => ({}));

        if (retryData && retryData.error === 0) {
          const requestId = retryData.data?.request_id;
          console.log(
            `[AURELIS-SMS-NET-BD] SMS sent successfully via default sender to ${recipientFormatted} [Request ID: ${requestId}]`
          );
          return {
            success: true,
            provider: 'sms.net.bd',
            requestId,
            recipient: recipientFormatted,
            raw: retryData,
          };
        }
      }

      const errorCode = typeof data.error === 'number' ? data.error : res.status;
      const errorDescription =
        SMS_NET_BD_ERROR_MESSAGES[errorCode] ||
        data?.msg ||
        `sms.net.bd error code ${errorCode}`;

      console.warn(
        `[AURELIS-SMS-NET-BD] Dispatch failed for ${recipientFormatted}: [${errorCode}] ${errorDescription}`
      );

      return {
        success: false,
        provider: 'sms.net.bd',
        errorCode,
        error: errorDescription,
        recipient: recipientFormatted,
        raw: data,
      };
    } catch (err: any) {
      console.error('[AURELIS-SMS-NET-BD] Network or runtime error:', err.message);
      return {
        success: false,
        provider: 'sms.net.bd',
        error: err.message,
        recipient: recipientFormatted,
      };
    }
  }

  /**
   * Check SMS balance via https://api.sms.net.bd/user/balance/
   */
  public static async getBalance(): Promise<SmsBalanceResult> {
    const apiKey = (process.env.SMS_NET_BD_API_KEY || process.env.SMS_API_KEY || '').trim();
    if (!apiKey) {
      return {
        success: false,
        error: 'SMS_NET_BD_API_KEY is not configured.',
      };
    }

    try {
      const url = `${this.API_BASE_URL}/user/balance/?api_key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, { method: 'GET' });
      const data: any = await res.json().catch(() => ({}));

      if (data && data.error === 0) {
        return {
          success: true,
          balance: data.data?.balance,
        };
      }

      const errorCode = typeof data.error === 'number' ? data.error : res.status;
      const errorDescription =
        SMS_NET_BD_ERROR_MESSAGES[errorCode] ||
        data?.msg ||
        `Balance check failed with error code ${errorCode}`;

      return {
        success: false,
        errorCode,
        error: errorDescription,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Retrieve delivery report via https://api.sms.net.bd/report/request/{id}/
   */
  public static async getReport(requestId: number | string): Promise<SmsReportResult> {
    const apiKey = (process.env.SMS_NET_BD_API_KEY || process.env.SMS_API_KEY || '').trim();
    if (!apiKey) {
      return {
        success: false,
        error: 'SMS_NET_BD_API_KEY is not configured.',
      };
    }

    try {
      const url = `${this.API_BASE_URL}/report/request/${requestId}/?api_key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, { method: 'GET' });
      const data: any = await res.json().catch(() => ({}));

      if (data && data.error === 0) {
        return {
          success: true,
          requestId: data.data?.request_id,
          requestStatus: data.data?.request_status,
          requestCharge: data.data?.request_charge,
          recipients: data.data?.recipients,
        };
      }

      const errorCode = typeof data.error === 'number' ? data.error : res.status;
      const errorDescription =
        SMS_NET_BD_ERROR_MESSAGES[errorCode] ||
        data?.msg ||
        `Report query failed with error code ${errorCode}`;

      return {
        success: false,
        errorCode,
        error: errorDescription,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
      };
    }
  }
}
