import { CurrencyCode, Recipient, Transaction, UserProfile, Wallet, CardItem, NotificationItem, DispatchedAlert } from '../types';

const getApiBase = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    // In browser, relative /v1 works seamlessly through Vite proxy
    // Prevents Mixed Content on HTTPS/tunnels, avoids 302 redirects, and eliminates CORS issues
    return '/v1';
  }
  return 'http://localhost:4000/v1';
};

const API_BASE = getApiBase();

export class AurelisApiClient {
  private static token: string | null = null;

  public static setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('aurelis_jwt_token', token);
      localStorage.removeItem('aurelis_jwt_token');
    }
  }

  public static getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = sessionStorage.getItem('aurelis_jwt_token');
    }
    return this.token;
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    const targetUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    let response: Response;
    try {
      response = await fetch(targetUrl, {
        credentials: 'include',
        ...options,
        headers,
      });
    } catch (netErr) {
      // Fallback to direct backend if proxy is not configured
      if (API_BASE === '/v1' && typeof window !== 'undefined') {
        response = await fetch(`http://localhost:4000/v1${endpoint}`, {
          credentials: 'include',
          ...options,
          headers,
        });
      } else {
        throw netErr;
      }
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // AUTH
  public static async login(email: string, password?: string) {
    const res = await this.request<{ user: UserProfile; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      this.setToken(res.token);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('aurelis_is_authenticated', 'true');
        localStorage.removeItem('aurelis_is_authenticated');
      }
    }
    return res;
  }

  public static async register(data: {
    email: string;
    fullName: string;
    phone?: string;
    country?: string;
    baseCurrency?: string;
    password?: string;
  }) {
    const res = await this.request<{ user: UserProfile; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      this.setToken(res.token);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('aurelis_is_authenticated', 'true');
        localStorage.removeItem('aurelis_is_authenticated');
      }
    }
    return res;
  }

  public static async passkeyVerify() {
    const res = await this.request<{ user: UserProfile; token: string }>('/auth/passkey/verify', {
      method: 'POST',
    });
    if (res.token) {
      this.setToken(res.token);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('aurelis_is_authenticated', 'true');
        localStorage.removeItem('aurelis_is_authenticated');
      }
    }
    return res;
  }

  public static async logout() {
    this.token = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('aurelis_jwt_token');
      sessionStorage.removeItem('aurelis_is_authenticated');
      localStorage.removeItem('aurelis_jwt_token');
      localStorage.removeItem('aurelis_is_authenticated');
    }
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore if network or server error during logout
    }
  }

  public static async getProfile() {
    return this.request<{ user: UserProfile }>('/auth/profile');
  }

  public static async lookupUser(query: string) {
    return this.request<{
      found: boolean;
      isSelf?: boolean;
      user?: {
        id: string;
        fullName: string;
        email: string;
        aurelisTag: string;
        avatar: string;
        tier: string;
        baseCurrency?: CurrencyCode;
      };
      matches?: Array<{
        id: string;
        fullName: string;
        email: string;
        aurelisTag: string;
        avatar: string;
        tier: string;
        baseCurrency?: CurrencyCode;
      }>;
    }>(`/users/lookup?q=${encodeURIComponent(query)}`);
  }

  // WALLETS
  public static async getWallets() {
    return this.request<{ totalValuationUSD: number; wallets: Wallet[] }>('/wallets');
  }

  public static async createWallet(currency: CurrencyCode) {
    return this.request<{ wallet: Wallet }>('/wallets', {
      method: 'POST',
      body: JSON.stringify({ currency }),
    });
  }

  public static async deposit(currency: CurrencyCode, amount: number, fundingSource: string) {
    return this.request<{ transaction: Transaction; wallet: Wallet }>('/wallets/deposit', {
      method: 'POST',
      body: JSON.stringify({ currency, amount, fundingSource }),
    });
  }

  public static async withdraw(currency: CurrencyCode, amount: number, targetAccount: string) {
    return this.request<{ transaction: Transaction; wallet: Wallet }>('/wallets/withdraw', {
      method: 'POST',
      body: JSON.stringify({ currency, amount, targetAccount }),
    });
  }

  // TRANSFERS
  public static async getTransferQuote(amount: number, sourceCurrency: CurrencyCode, destinationCurrency: CurrencyCode) {
    return this.request<{
      sourceCurrency: CurrencyCode;
      destinationCurrency: CurrencyCode;
      amount: number;
      convertedAmount: number;
      exchangeRate: number;
      fee: number;
      totalCharged: number;
      estimatedArrival: string;
    }>('/transfers/quote', {
      method: 'POST',
      body: JSON.stringify({ amount, sourceCurrency, destinationCurrency }),
    });
  }

  public static async updateTransactionPin(newPin: string, currentPin?: string) {
    return this.request<{ message: string; transactionPin: string }>('/auth/pin', {
      method: 'POST',
      body: JSON.stringify({ newPin, currentPin }),
    });
  }

  public static async executeTransfer(payload: {
    recipientId?: string;
    recipientName?: string;
    recipientEmail?: string;
    sourceCurrency: CurrencyCode;
    destinationCurrency?: CurrencyCode;
    amount: number;
    reference?: string;
    pin?: string;
  }) {
    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return this.request<{ transaction: Transaction }>('/transfers/execute', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    });
  }

  // FX
  public static async getLiveRates() {
    return this.request<{ rates: Record<string, number> }>('/fx/rates');
  }

  public static async lockRate(fromCurrency: CurrencyCode, toCurrency: CurrencyCode, fromAmount: number) {
    return this.request<{ lock: any }>('/fx/quote-lock', {
      method: 'POST',
      body: JSON.stringify({ fromCurrency, toCurrency, fromAmount }),
    });
  }

  public static async convertCurrency(fromCurrency: CurrencyCode, toCurrency: CurrencyCode, fromAmount: number, quoteId?: string) {
    return this.request<{ transaction: Transaction; fromWallet: Wallet; toWallet: Wallet }>('/fx/convert', {
      method: 'POST',
      body: JSON.stringify({ fromCurrency, toCurrency, fromAmount, quoteId }),
    });
  }

  // RECIPIENTS
  public static async getRecipients() {
    return this.request<{ recipients: Recipient[] }>('/recipients');
  }

  public static async createRecipient(data: Partial<Recipient>) {
    return this.request<{ recipient: Recipient; message: string }>('/recipients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static async updateRecipient(id: string, data: Partial<Recipient>) {
    return this.request<{ recipient: Recipient; message: string }>(`/recipients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public static async deleteRecipient(id: string) {
    return this.request<{ message: string }>(`/recipients/${id}`, {
      method: 'DELETE',
    });
  }

  public static async toggleFavoriteRecipient(id: string) {
    return this.request<{ recipient: Recipient }>(`/recipients/${id}/favorite`, {
      method: 'PATCH',
    });
  }

  // CARDS
  public static async getCards() {
    return this.request<{ cards: CardItem[] }>('/cards');
  }

  public static async issueCard(tier: string, type: string) {
    return this.request<{ card: CardItem; message: string }>('/cards/issue', {
      method: 'POST',
      body: JSON.stringify({ tier, type }),
    });
  }

  public static async toggleCardFreeze(id: string) {
    return this.request<{ card: CardItem; message: string }>(`/cards/${id}/freeze`, {
      method: 'PATCH',
    });
  }

  public static async updateCardLimits(id: string, monthlyLimit: number) {
    return this.request<{ card: CardItem; message: string }>(`/cards/${id}/limits`, {
      method: 'PATCH',
      body: JSON.stringify({ monthlyLimit }),
    });
  }

  public static async revealCardDetails(id: string) {
    return this.request<{ cardNumber: string; cvv: string; expiry: string; pin: string }>(`/cards/${id}/reveal`, {
      method: 'POST',
    });
  }

  // INVOICES & PAYMENT LINKS
  public static async createPaymentRequest(data: {
    amount: number;
    currency: CurrencyCode;
    recipientEmail?: string;
    message?: string;
  }) {
    return this.request<{
      message: string;
      paymentRequest: any;
      paymentUrl: string;
    }>('/invoices/request-payment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static async getPaymentRequestBySlug(slug: string) {
    return this.request<{
      paymentRequest: any;
      beneficiary: { name: string; aurelisTag?: string; avatar?: string };
    }>(`/invoices/pay/${slug}`);
  }

  // FX TRENDS
  public static async getRateTrends() {
    return this.request<{ trends: any }>('/fx/trends');
  }

  // NOTIFICATIONS
  public static async getNotifications() {
    return this.request<{ notifications: NotificationItem[] }>('/notifications');
  }

  public static async markNotificationRead(id: string) {
    return this.request<{ notification: NotificationItem }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  public static async markAllNotificationsRead() {
    return this.request<{ message: string }>('/notifications/read-all', {
      method: 'PATCH',
    });
  }

  // DISPATCHED ALERTS (EMAIL & MOBILE SMS)
  public static async getDispatchedAlerts(channel?: 'all' | 'email' | 'sms', limit = 50) {
    const q = new URLSearchParams();
    if (channel && channel !== 'all') q.set('channel', channel);
    if (limit) q.set('limit', String(limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<{ alerts: DispatchedAlert[] }>(`/notifications/alerts${qs}`);
  }

  public static async getDispatchedAlertById(id: string) {
    return this.request<{ alert: DispatchedAlert }>(`/notifications/alerts/${id}`);
  }

  public static async getAlertPreferences() {
    return this.request<{
      emailAlertsEnabled: boolean;
      smsAlertsEnabled: boolean;
      email: string;
      phone: string;
    }>('/notifications/preferences');
  }

  public static async updateAlertPreferences(prefs: { emailAlertsEnabled?: boolean; smsAlertsEnabled?: boolean; phone?: string }) {
    return this.request<{
      message: string;
      preferences: { emailAlertsEnabled: boolean; smsAlertsEnabled: boolean; phone?: string };
    }>('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
  }

  public static async triggerTestAlert(payload?: { type?: string; amount?: number; currency?: CurrencyCode }) {
    return this.request<{
      message: string;
      transaction: any;
      alerts: { emailAlert?: DispatchedAlert; smsAlert?: DispatchedAlert };
    }>('/notifications/test-alert', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  }

  public static async sendTestEmail(to?: string) {
    return this.request<{
      message: string;
      success: boolean;
      provider: string;
      id?: string;
      error?: string;
      recipient: string;
    }>('/notifications/test-email', {
      method: 'POST',
      body: JSON.stringify(to ? { to } : {}),
    });
  }

  public static async sendTestSms(to?: string, msg?: string) {
    return this.request<{
      message: string;
      success: boolean;
      provider: string;
      requestId?: number | string;
      error?: string;
      errorCode?: number;
      recipient: string;
      raw?: any;
    }>('/notifications/test-sms', {
      method: 'POST',
      body: JSON.stringify({ to, msg }),
    });
  }

  public static async getSmsBalance() {
    return this.request<{
      success: boolean;
      balance?: string;
      error?: string;
      errorCode?: number;
    }>('/notifications/sms-balance');
  }

  // TRANSACTIONS
  public static async getTransactions(query?: { type?: string; currency?: string; search?: string }) {
    const params = new URLSearchParams((query as Record<string, string>) || {}).toString();
    return this.request<{ total: number; transactions: Transaction[] }>(`/transactions?${params}`);
  }

  public static async getTransactionReceipt(id: string) {
    return this.request<{ receipt: any }>(`/transactions/${id}/receipt`);
  }
}

export const DbsApiClient = AurelisApiClient;

