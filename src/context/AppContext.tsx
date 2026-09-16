import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  CardItem,
  CurrencyCode,
  NavigationTab,
  NotificationItem,
  Recipient,
  Transaction,
  UserProfile,
  Wallet,
} from '../types';
import {
  INITIAL_CARDS,
  INITIAL_NOTIFICATIONS,
  INITIAL_RECIPIENTS,
  INITIAL_TRANSACTIONS,
  INITIAL_USER,
  INITIAL_WALLETS,
  VICTORIA_USER,
  VICTORIA_WALLETS,
} from '../utils/mockData';
import { CURRENCIES, generateTxnId } from '../utils/currency';
import { AurelisApiClient } from '../services/api';
import { AurelisSocketClient } from '../services/websocket';
import confetti from 'canvas-confetti';

interface AppContextType {
  // Authentication
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPasskey: () => Promise<{ success: boolean; error?: string }>;
  registerUser: (data: {
    name: string;
    email: string;
    country?: string;
    currency?: CurrencyCode;
    tier?: 'Private Wealth Sovereign' | 'Private Client' | 'Signature Elite';
    password?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  user: UserProfile;
  wallets: Wallet[];
  totalBalanceUSD: number;
  transactions: Transaction[];
  recipients: Recipient[];
  cards: CardItem[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  currentTab: NavigationTab;
  activeModal: string | null;
  modalPayload: any;
  selectedTxn: Transaction | null;

  // Actions
  setCurrentTab: (tab: NavigationTab) => void;
  openModal: (modal: string, payload?: any) => void;
  closeModal: () => void;
  openTxnDetail: (txn: Transaction) => void;
  prefillSendModal: (recipient?: Recipient, amount?: number, currency?: CurrencyCode) => void;
  sendMoney: (data: {
    recipient: Recipient;
    amount: number;
    currency: CurrencyCode;
    fee: number;
    reference?: string;
    fromWalletCurrency?: CurrencyCode;
    exchangeRate?: number;
    destinationAmount?: number;
    pin?: string;
  }) => Promise<Transaction>;
  updateTransactionPin: (newPin: string, currentPin?: string) => Promise<{ success: boolean; error?: string }>;
  exchangeCurrency: (
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    fromAmount: number,
    toAmount: number,
    rate: number
  ) => Promise<Transaction>;
  addFunds: (currency: CurrencyCode, amount: number, source: string) => Promise<Transaction>;
  withdrawFunds: (currency: CurrencyCode, amount: number, destination: string) => Promise<Transaction>;
  addRecipient: (recipient: Omit<Recipient, 'id'>) => Promise<Recipient> | Recipient;
  updateRecipient: (id: string, updates: Partial<Recipient>) => Promise<void> | void;
  removeRecipient: (id: string) => Promise<void> | void;
  toggleFavoriteRecipient: (id: string) => Promise<void> | void;
  toggleCardFreeze: (cardId: string) => Promise<void> | void;
  updateCardLimits: (cardId: string, limit: number) => Promise<void> | void;
  issueNewCard: (data: { tier: CardItem['tier']; type: 'physical' | 'virtual' }) => Promise<CardItem> | CardItem;
  createWallet: (currency: CurrencyCode) => Promise<Wallet> | Wallet;
  setDefaultWallet: (currency: CurrencyCode) => void;
  markNotificationRead: (id: string) => Promise<void> | void;
  markAllNotificationsRead: () => Promise<void> | void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  resetDemoData: () => void;
}


const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_PREFIX = 'aurelis_vault_';

const VALID_TABS: Record<string, NavigationTab> = {
  '': 'dashboard',
  'dashboard': 'dashboard',
  'send': 'send',
  'receive': 'receive',
  'exchange': 'exchange',
  'transactions': 'transactions',
  'recipients': 'recipients',
  'wallets': 'wallets',
  'cards': 'cards',
  'profile': 'profile',
  'settings': 'settings',
};

export function getTabFromLocation(): NavigationTab {
  if (typeof window === 'undefined') return 'dashboard';
  const path = window.location.pathname.replace(/^\/+/, '').split('/')[0].toLowerCase();
  if (path && VALID_TABS[path]) {
    return VALID_TABS[path];
  }
  const hash = window.location.hash.replace(/^#\/?/, '').split('/')[0].toLowerCase();
  if (hash && VALID_TABS[hash]) {
    return VALID_TABS[hash];
  }
  const searchParams = new URLSearchParams(window.location.search);
  const tabParam = searchParams.get('tab')?.toLowerCase();
  if (tabParam && VALID_TABS[tabParam]) {
    return VALID_TABS[tabParam];
  }
  return 'dashboard';
}

const getInitialWalletsForUser = (u: UserProfile): Wallet[] => {
  if (!u || !u.id) return [];
  const saved = localStorage.getItem(`${STORAGE_PREFIX}${u.id}_wallets`);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
  }
  return [];
};

const getInitialTransactionsForUser = (u: UserProfile): Transaction[] => {
  if (!u || !u.id) return [];
  const saved = localStorage.getItem(`${STORAGE_PREFIX}${u.id}_transactions`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return [];
};

const getInitialCardsForUser = (u: UserProfile): CardItem[] => {
  if (!u || !u.id) return [];
  const saved = localStorage.getItem(`${STORAGE_PREFIX}${u.id}_cards`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return [];
};

const getInitialNotificationsForUser = (u: UserProfile): NotificationItem[] => {
  if (!u || !u.id) return [];
  const saved = localStorage.getItem(`${STORAGE_PREFIX}${u.id}_notifications`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return [];
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication state (session-scoped: starts unauthenticated unless signed in in this browser session)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // Wipe any legacy persistent auth keys from localStorage
    localStorage.removeItem('aurelis_is_authenticated');
    localStorage.removeItem('aurelis_jwt_token');

    const savedAuth = sessionStorage.getItem('aurelis_is_authenticated');
    const token = sessionStorage.getItem('aurelis_jwt_token');
    return savedAuth === 'true' && Boolean(token);
  });

  // Load from localStorage or fallback
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'active_user');
    return saved ? JSON.parse(saved) : INITIAL_USER;
  });

  const [wallets, setWallets] = useState<Wallet[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'active_user');
    const u = saved ? JSON.parse(saved) : INITIAL_USER;
    return getInitialWalletsForUser(u);
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'active_user');
    const u = saved ? JSON.parse(saved) : INITIAL_USER;
    return getInitialTransactionsForUser(u);
  });

  const [recipients, setRecipients] = useState<Recipient[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'active_user');
    const u = saved ? JSON.parse(saved) : INITIAL_USER;
    if (!u.id) return [];
    const userRecs = localStorage.getItem(`${STORAGE_PREFIX}${u.id}_recipients`);
    return userRecs ? JSON.parse(userRecs) : [];
  });

  const [cards, setCards] = useState<CardItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'active_user');
    const u = saved ? JSON.parse(saved) : INITIAL_USER;
    return getInitialCardsForUser(u);
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'active_user');
    const u = saved ? JSON.parse(saved) : INITIAL_USER;
    return getInitialNotificationsForUser(u);
  });

  const [currentTab, setCurrentTabState] = useState<NavigationTab>(() => getTabFromLocation());

  const setCurrentTab = useCallback((tab: NavigationTab) => {
    setCurrentTabState(tab);
    if (typeof window !== 'undefined') {
      const targetPath = tab === 'dashboard' ? '/' : `/${tab}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
  }, []);

  // Synchronize route state when browser Back / Forward buttons are used
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromLocation();
      setCurrentTabState(tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalPayload, setModalPayload] = useState<any>(null);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  // Validate token on startup and refresh user profile, wallets, transactions, and recipients from backend only if an active session exists
  useEffect(() => {
    const token = AurelisApiClient.getToken();
    const isAuth = typeof window !== 'undefined' && sessionStorage.getItem('aurelis_is_authenticated') === 'true';

    // If unauthenticated or no session token, do NOT make any API calls to private endpoints
    if (!token || !isAuth) {
      setIsAuthenticated(false);
      return;
    }

    // First, verify the session token with the backend profile endpoint
    AurelisApiClient.getProfile()
      .then(async (profileRes) => {
        if (profileRes?.user) {
          const freshUser: UserProfile = {
            ...INITIAL_USER,
            id: profileRes.user.id,
            email: profileRes.user.email,
            name: profileRes.user.name || (profileRes.user as any).fullName || user.name,
            aurelisTag: profileRes.user.aurelisTag || user.aurelisTag,
            tier: profileRes.user.tier || user.tier,
            avatar: profileRes.user.avatar || user.avatar,
            primaryCurrency: (profileRes.user as any).baseCurrency || 'USD',
            transactionPin: profileRes.user.transactionPin || (profileRes.user as any).pin || user.transactionPin || '1234',
          };
          setUser(freshUser);
          localStorage.setItem(STORAGE_PREFIX + 'active_user', JSON.stringify(freshUser));
          setIsAuthenticated(true);

          // Only after token validity is confirmed by backend, load private assets
          try {
            const [walletsRes, txnsRes, recsRes, cardsRes, notifsRes] = await Promise.all([
              AurelisApiClient.getWallets().catch(() => null),
              AurelisApiClient.getTransactions().catch(() => null),
              AurelisApiClient.getRecipients().catch(() => null),
              AurelisApiClient.getCards().catch(() => null),
              AurelisApiClient.getNotifications().catch(() => null),
            ]);

            if (walletsRes?.wallets && walletsRes.wallets.length > 0) {
              setWallets(walletsRes.wallets);
            }
            if (txnsRes?.transactions) {
              setTransactions(txnsRes.transactions);
            }
            if (recsRes?.recipients) {
              setRecipients(recsRes.recipients);
            }
            if (cardsRes?.cards) {
              setCards(cardsRes.cards);
            }
            if (notifsRes?.notifications) {
              setNotifications(notifsRes.notifications);
            }
          } catch (err) {
            console.warn('Could not refresh asset data on session resume:', err);
          }
        } else {
          logout();
        }
      })
      .catch((err: any) => {
        console.warn('Session expired or unauthorized on startup:', err);
        logout();
      });
  }, []);

  // Real-Time WebSocket Synchronization
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const socket = AurelisSocketClient.getInstance();
    socket.connect(user.id);

    const unsubWallet = socket.on('WALLET_UPDATED', (payload: any) => {
      if (!payload?.id) return;
      setWallets((prev) => {
        const idx = prev.findIndex((w) => w.id === payload.id || w.currency === payload.currency);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...payload };
          return next;
        }
        return [...prev, payload];
      });
    });

    const unsubTxn = socket.on('TRANSACTION_CREATED', (payload: any) => {
      if (!payload?.id) return;
      setTransactions((prev) => {
        if (prev.some((t) => t.id === payload.id)) return prev;
        return [payload, ...prev];
      });
    });

    const unsubNotif = socket.on('NOTIFICATION_CREATED', (payload: any) => {
      if (!payload?.id) return;
      setNotifications((prev) => {
        if (prev.some((n) => n.id === payload.id)) return prev;
        return [payload, ...prev];
      });
    });

    const unsubRecs = socket.on('RECIPIENTS_UPDATED', () => {
      AurelisApiClient.getRecipients()
        .then((res) => {
          if (res?.recipients) setRecipients(res.recipients);
        })
        .catch(() => {});
    });

    return () => {
      unsubWallet();
      unsubTxn();
      unsubNotif();
      unsubRecs();
    };
  }, [isAuthenticated, user?.id]);


  // Sync to user-scoped localStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(STORAGE_PREFIX + 'active_user', JSON.stringify(user));
      localStorage.setItem(`${STORAGE_PREFIX}${user.id}_wallets`, JSON.stringify(wallets));
    }
  }, [wallets, user]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`${STORAGE_PREFIX}${user.id}_transactions`, JSON.stringify(transactions));
    }
  }, [transactions, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`${STORAGE_PREFIX}${user.id}_recipients`, JSON.stringify(recipients));
    }
  }, [recipients, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`${STORAGE_PREFIX}${user.id}_cards`, JSON.stringify(cards));
    }
  }, [cards, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`${STORAGE_PREFIX}${user.id}_notifications`, JSON.stringify(notifications));
    }
  }, [notifications, user?.id]);

  // Compute Total Consolidated Balance in USD
  const totalBalanceUSD = useMemo(() => {
    return wallets.reduce((sum, w) => {
      const meta = CURRENCIES[w.currency];
      const usdValue = w.balance * meta.rateToUSD;
      return sum + usdValue;
    }, 0);
  }, [wallets]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const openModal = (modal: string, payload?: any) => {
    setActiveModal(modal);
    setModalPayload(payload || null);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalPayload(null);
  };

  const openTxnDetail = (txn: Transaction) => {
    setSelectedTxn(txn);
    openModal('transaction-detail', txn);
  };

  const prefillSendModal = (recipient?: Recipient, amount?: number, currency?: CurrencyCode) => {
    openModal('send', { recipient, amount, currency });
  };

  // SEND MONEY ACTION
  const sendMoney = async (data: {
    recipient: Recipient;
    amount: number;
    currency: CurrencyCode;
    fee: number;
    reference?: string;
    fromWalletCurrency?: CurrencyCode;
    exchangeRate?: number;
    destinationAmount?: number;
    pin?: string;
  }): Promise<Transaction> => {
    const fromCurr = data.fromWalletCurrency || data.currency;
    const totalCharged = data.amount + data.fee;

    // Validate transaction PIN locally as well
    const expectedPin = user?.transactionPin || '1234';
    if (!data.pin) {
      throw new Error('Security PIN is required to authorize this transfer.');
    }
    if (data.pin.trim() !== expectedPin.trim()) {
      throw new Error('Incorrect Security PIN. Authorization rejected.');
    }

    // Guard against self-transfers
    if (
      (data.recipient.id && user?.id && data.recipient.id === user.id) ||
      (data.recipient.email && user?.email && data.recipient.email.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
      (data.recipient.aurelisTag && user?.aurelisTag && data.recipient.aurelisTag.toLowerCase().trim() === user.aurelisTag.toLowerCase().trim())
    ) {
      throw new Error('Self-transfer is not permitted. Use Currency Exchange to move funds between your own multi-currency wallets.');
    }

    // Call Backend API first to validate recipient and execute atomic ledger settlement
    let serverTxn: any = null;
    try {
      const transferRes = await AurelisApiClient.executeTransfer({
        recipientId: data.recipient.id,
        recipientName: data.recipient.name,
        recipientEmail: data.recipient.email,
        sourceCurrency: fromCurr,
        destinationCurrency: data.currency,
        amount: data.amount,
        reference: data.reference,
        pin: data.pin,
      });
      serverTxn = transferRes.transaction;

      // Synchronize latest server balances, transactions, and recipients from backend
      const [refreshedWallets, refreshedTxns, refreshedRecs] = await Promise.all([
        AurelisApiClient.getWallets().catch(() => null),
        AurelisApiClient.getTransactions().catch(() => null),
        AurelisApiClient.getRecipients().catch(() => null),
      ]);

      if (refreshedWallets?.wallets && refreshedWallets.wallets.length > 0) {
        setWallets(refreshedWallets.wallets);
      } else {
        setWallets((prev) =>
          prev.map((w) => (w.currency === fromCurr ? { ...w, balance: Math.max(0, w.balance - totalCharged) } : w))
        );
      }

      if (refreshedTxns?.transactions) {
        setTransactions(refreshedTxns.transactions);
      }

      if (refreshedRecs?.recipients) {
        setRecipients(refreshedRecs.recipients);
      }
    } catch (apiErr: any) {
      console.warn('API transfer error:', apiErr);
      // Transfer was rejected before debiting funds; preserve local wallet balances so state does not reset
      throw apiErr;
    }

    // Create transaction record
    const newTxn: Transaction = {
      id: generateTxnId(),
      type: 'send',
      amount: data.amount,
      currency: fromCurr,
      destinationCurrency: data.currency,
      destinationAmount: data.destinationAmount || data.amount,
      exchangeRate: data.exchangeRate,
      fee: data.fee,
      totalCharged,
      recipientName: data.recipient.name,
      recipientEmail: data.recipient.email,
      recipientAvatar: data.recipient.avatar,
      recipientAurelisTag: data.recipient.aurelisTag,
      paymentMethod: `AURELIS ${fromCurr} Wallet`,
      status: 'Completed',
      date: new Date().toISOString(),
      reference: data.reference || 'Global Transfer',
      category: 'Transfer',
      estimatedArrival: 'Today, instant delivery',
    };

    setTransactions((prev) => [newTxn, ...prev]);

    // Update recipient last transfer date
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id === data.recipient.id) {
          return {
            ...r,
            lastTransferDate: 'Just now',
          };
        }
        return r;
      })
    );

    // Create notification
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      title: 'Transfer dispatched',
      description: `Your transfer of ${CURRENCIES[fromCurr].symbol}${data.amount.toLocaleString()} to ${data.recipient.name} was successfully settled.`,
      type: 'transfer',
      timestamp: 'Just now',
      isRead: false,
      linkedTxnId: newTxn.id,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Micro celebratory burst
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#123C32', '#B69A62', '#245B43', '#FFFFFF'],
      });
    } catch {
      // ignore
    }

    return newTxn;
  };

  // EXCHANGE CURRENCY ACTION
  const exchangeCurrency = async (
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    fromAmount: number,
    toAmount: number,
    rate: number
  ): Promise<Transaction> => {
    try {
      const res = await AurelisApiClient.convertCurrency(fromCurrency, toCurrency, fromAmount);
      if (res?.transaction) {
        if (res.fromWallet && res.toWallet) {
          setWallets((prev) => {
            const next = prev.map((w) => {
              if (w.currency === fromCurrency) return { ...w, ...res.fromWallet };
              if (w.currency === toCurrency) return { ...w, ...res.toWallet };
              return w;
            });
            if (!next.some((w) => w.currency === toCurrency)) {
              next.push(res.toWallet);
            }
            return next;
          });
        }
        setTransactions((prev) => [res.transaction, ...prev]);

        const newNotif: NotificationItem = {
          id: `notif_${Date.now()}`,
          title: 'Currency conversion settled',
          description: `Converted ${CURRENCIES[fromCurrency].symbol}${fromAmount.toLocaleString()} to ${CURRENCIES[toCurrency].symbol}${toAmount.toLocaleString()} at rate ${rate.toFixed(4)}.`,
          type: 'rate',
          timestamp: 'Just now',
          isRead: false,
          linkedTxnId: res.transaction.id,
        };
        setNotifications((prev) => [newNotif, ...prev]);

        try {
          confetti({
            particleCount: 30,
            spread: 50,
            origin: { y: 0.7 },
            colors: ['#B69A62', '#123C32', '#FAF9F5'],
          });
        } catch {
          // ignore
        }

        return res.transaction;
      }
    } catch (err: any) {
      console.error('API currency conversion failed:', err);
      throw err;
    }

    throw new Error('Currency conversion failed to process.');
  };


  // ADD FUNDS ACTION
  const addFunds = async (currency: CurrencyCode, amount: number, source: string): Promise<Transaction> => {
    // 1. Credit wallet on the server ledger
    try {
      await AurelisApiClient.deposit(currency, amount, source);
      const refreshed = await AurelisApiClient.getWallets().catch(() => null);
      if (refreshed?.wallets && refreshed.wallets.length > 0) {
        setWallets(refreshed.wallets);
        if (user?.id) {
          localStorage.setItem(`${STORAGE_PREFIX}${user.id}_wallets`, JSON.stringify(refreshed.wallets));
        }
      }
    } catch (err) {
      console.warn('API deposit sync note:', err);
      // Fallback: local optimistic update
      setWallets((prev) => {
        const next = prev.map((w) => {
          if (w.currency === currency) {
            return { ...w, balance: Number((w.balance + amount).toFixed(4)) };
          }
          return w;
        });
        if (user?.id) {
          localStorage.setItem(`${STORAGE_PREFIX}${user.id}_wallets`, JSON.stringify(next));
        }
        return next;
      });
    }

    const newTxn: Transaction = {
      id: generateTxnId(),
      type: 'deposit',
      amount,
      currency,
      senderName: source,
      recipientName: `AURELIS ${currency} Wallet`,
      paymentMethod: source,
      fee: 0.00,
      totalCharged: amount,
      status: 'Completed',
      date: new Date().toISOString(),
      reference: 'Client Capital Deposit',
      category: 'Deposit',
    };

    setTransactions((prev) => [newTxn, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        title: 'Capital deposit credited',
        description: `Your ${currency} wallet was credited with ${CURRENCIES[currency].symbol}${amount.toLocaleString()} from ${source}.`,
        type: 'transfer',
        timestamp: 'Just now',
        isRead: false,
        linkedTxnId: newTxn.id,
      },
      ...prev,
    ]);

    return newTxn;
  };

  // WITHDRAW FUNDS ACTION
  const withdrawFunds = async (currency: CurrencyCode, amount: number, target: string): Promise<Transaction> => {
    try {
      await AurelisApiClient.withdraw(currency, amount, target);
      const refreshed = await AurelisApiClient.getWallets().catch(() => null);
      if (refreshed?.wallets && refreshed.wallets.length > 0) {
        setWallets(refreshed.wallets);
        if (user?.id) {
          localStorage.setItem(`${STORAGE_PREFIX}${user.id}_wallets`, JSON.stringify(refreshed.wallets));
        }
      }
    } catch (err) {
      console.warn('API withdraw sync note:', err);
      setWallets((prev) => {
        const next = prev.map((w) => {
          if (w.currency === currency) {
            return { ...w, balance: Math.max(0, Number((w.balance - amount).toFixed(4))) };
          }
          return w;
        });
        if (user?.id) {
          localStorage.setItem(`${STORAGE_PREFIX}${user.id}_wallets`, JSON.stringify(next));
        }
        return next;
      });
    }

    const newTxn: Transaction = {
      id: generateTxnId(),
      type: 'withdrawal',
      amount,
      currency,
      recipientName: target,
      paymentMethod: `AURELIS ${currency} Wallet`,
      fee: 0.00,
      totalCharged: amount,
      status: 'Completed',
      date: new Date().toISOString(),
      reference: `External Wire to ${target}`,
      category: 'Transfer',
    };

    setTransactions((prev) => [newTxn, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        title: 'Withdrawal initiated',
        description: `Dispatched ${CURRENCIES[currency].symbol}${amount.toLocaleString()} to ${target}.`,
        type: 'transfer',
        timestamp: 'Just now',
        isRead: false,
        linkedTxnId: newTxn.id,
      },
      ...prev,
    ]);

    return newTxn;
  };

  // RECIPIENT MANAGEMENT
  const addRecipient = async (data: Omit<Recipient, 'id'>): Promise<Recipient> => {
    try {
      const res = await AurelisApiClient.createRecipient(data);
      if (res?.recipient) {
        setRecipients((prev) => [res.recipient, ...prev.filter((r) => r.id !== res.recipient.id)]);
        return res.recipient;
      }
    } catch (err) {
      console.warn('Backend addRecipient error, persisting locally as fallback:', err);
    }

    const fallbackRec: Recipient = {
      ...data,
      id: `rec_${Date.now()}`,
    };
    setRecipients((prev) => [fallbackRec, ...prev]);
    return fallbackRec;
  };

  const updateRecipient = async (id: string, updates: Partial<Recipient>) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    try {
      await AurelisApiClient.updateRecipient(id, updates);
    } catch (err) {
      console.warn('Backend updateRecipient error:', err);
    }
  };

  const removeRecipient = async (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
    try {
      await AurelisApiClient.deleteRecipient(id);
    } catch (err) {
      console.warn('Backend deleteRecipient error:', err);
    }
  };

  const toggleFavoriteRecipient = async (id: string) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    );
    try {
      await AurelisApiClient.toggleFavoriteRecipient(id);
    } catch (err) {
      console.warn('Backend toggleFavoriteRecipient error:', err);
    }
  };

  // CARD MANAGEMENT
  const toggleCardFreeze = async (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFrozen: !c.isFrozen } : c))
    );
    try {
      await AurelisApiClient.toggleCardFreeze(cardId);
    } catch (err) {
      console.warn('Backend toggleCardFreeze error:', err);
    }
  };

  const updateCardLimits = async (cardId: string, limit: number) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, monthlyLimit: limit } : c))
    );
    try {
      await AurelisApiClient.updateCardLimits(cardId, limit);
    } catch (err) {
      console.warn('Backend updateCardLimits error:', err);
    }
  };

  const issueNewCard = async (data: { tier: CardItem['tier']; type: 'physical' | 'virtual' }): Promise<CardItem> => {
    try {
      const res = await AurelisApiClient.issueCard(data.tier, data.type);
      if (res?.card) {
        setCards((prev) => [res.card, ...prev]);
        setNotifications((prev) => [
          {
            id: `notif_${Date.now()}`,
            title: 'New card activated',
            description: `Your ${data.tier} ${data.type} card (${res.card.maskedNumber}) is now active and ready for global spend.`,
            type: 'security',
            timestamp: 'Just now',
            isRead: false,
          },
          ...prev,
        ]);
        return res.card;
      }
    } catch (err) {
      console.warn('Backend issueCard error, generating locally as fallback:', err);
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const newCard: CardItem = {
      id: `card_${Date.now()}`,
      type: data.type,
      tier: data.tier,
      cardNumber: `4821 9084 3192 ${randomSuffix}`,
      maskedNumber: `•••• ${randomSuffix}`,
      holderName: user.name.toUpperCase(),
      expiry: '08/31',
      cvv: Math.floor(100 + Math.random() * 900).toString(),
      isFrozen: false,
      isPrimary: cards.length === 0,
      monthlyLimit: data.tier === 'Black Titanium' ? 50000 : 25000,
      currentSpent: 0,
      contactlessEnabled: true,
      onlinePurchasesEnabled: true,
      atmWithdrawalsEnabled: data.type === 'physical',
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
    };

    setCards((prev) => [newCard, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}`,
        title: 'New card activated',
        description: `Your ${data.tier} ${data.type} card (${newCard.maskedNumber}) is now active and ready for global spend.`,
        type: 'security',
        timestamp: 'Just now',
        isRead: false,
      },
      ...prev,
    ]);

    return newCard;
  };

  // WALLETS
  const createWallet = async (currency: CurrencyCode): Promise<Wallet> => {
    const existing = wallets.find((w) => w.currency === currency);
    if (existing) return existing;

    try {
      const res = await AurelisApiClient.createWallet(currency);
      if (res?.wallet) {
        setWallets((prev) => [...prev.filter((w) => w.id !== res.wallet.id), res.wallet]);
        return res.wallet;
      }
    } catch (err) {
      console.warn('Backend createWallet error, falling back locally:', err);
    }

    const newWallet: Wallet = {
      id: `w_${currency.toLowerCase()}_${Date.now()}`,
      currency,
      balance: 0,
      pendingBalance: 0,
      accountNumber: `AURL ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
      iban: `${currency}29 AURL ${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      bic: `AURL${currency}XX`,
      isPrimary: false,
    };

    setWallets((prev) => [...prev, newWallet]);
    return newWallet;
  };

  const setDefaultWallet = (currency: CurrencyCode) => {
    setWallets((prev) =>
      prev.map((w) => ({
        ...w,
        isPrimary: w.currency === currency,
      }))
    );
  };

  // NOTIFICATIONS
  const markNotificationRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await AurelisApiClient.markNotificationRead(id);
    } catch (err) {
      console.warn('Backend markNotificationRead error:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await AurelisApiClient.markAllNotificationsRead();
    } catch (err) {
      console.warn('Backend markAllNotificationsRead error:', err);
    }
  };

  // AUTHENTICATION ACTIONS
  const loadUserScopedData = async (targetUser: UserProfile) => {
    try {
      const [walletsRes, txnsRes, cardsRes, notifsRes, recsRes] = await Promise.all([
        AurelisApiClient.getWallets().catch(() => null),
        AurelisApiClient.getTransactions().catch(() => null),
        AurelisApiClient.getCards().catch(() => null),
        AurelisApiClient.getNotifications().catch(() => null),
        AurelisApiClient.getRecipients().catch(() => null),
      ]);

      if (walletsRes?.wallets && walletsRes.wallets.length > 0) {
        setWallets(walletsRes.wallets);
        localStorage.setItem(`${STORAGE_PREFIX}${targetUser.id}_wallets`, JSON.stringify(walletsRes.wallets));
      } else {
        const savedWallets = localStorage.getItem(`${STORAGE_PREFIX}${targetUser.id}_wallets`);
        setWallets(savedWallets ? JSON.parse(savedWallets) : []);
      }

      if (txnsRes?.transactions) {
        setTransactions(txnsRes.transactions);
        localStorage.setItem(`${STORAGE_PREFIX}${targetUser.id}_transactions`, JSON.stringify(txnsRes.transactions));
      } else {
        const savedTxns = localStorage.getItem(`${STORAGE_PREFIX}${targetUser.id}_transactions`);
        setTransactions(savedTxns ? JSON.parse(savedTxns) : []);
      }

      if (cardsRes?.cards) {
        setCards(cardsRes.cards);
        localStorage.setItem(`${STORAGE_PREFIX}${targetUser.id}_cards`, JSON.stringify(cardsRes.cards));
      } else {
        const savedCards = localStorage.getItem(`${STORAGE_PREFIX}${targetUser.id}_cards`);
        setCards(savedCards ? JSON.parse(savedCards) : []);
      }

      if (notifsRes?.notifications) {
        setNotifications(notifsRes.notifications);
        localStorage.setItem(`${STORAGE_PREFIX}${targetUser.id}_notifications`, JSON.stringify(notifsRes.notifications));
      } else {
        const savedNotifs = localStorage.getItem(`${STORAGE_PREFIX}${targetUser.id}_notifications`);
        setNotifications(savedNotifs ? JSON.parse(savedNotifs) : []);
      }

      if (recsRes?.recipients) {
        setRecipients(recsRes.recipients);
        localStorage.setItem(`${STORAGE_PREFIX}${targetUser.id}_recipients`, JSON.stringify(recsRes.recipients));
      } else {
        const savedRecs = localStorage.getItem(`${STORAGE_PREFIX}${targetUser.id}_recipients`);
        setRecipients(savedRecs ? JSON.parse(savedRecs) : []);
      }
    } catch (err) {
      console.warn('Error loading user-scoped data:', err);
    }
  };


  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await AurelisApiClient.login(email, password);
      if (!res.user) {
        return { success: false, error: 'User profile not found.' };
      }

      const targetUser: UserProfile = {
        ...INITIAL_USER,
        id: res.user.id,
        email: res.user.email,
        name: res.user.name || (res.user as any).fullName || email.split('@')[0],
        aurelisTag: res.user.aurelisTag || `@${email.split('@')[0]}`,
        tier: res.user.tier || 'Private Client',
        avatar: res.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        primaryCurrency: (res.user as any).baseCurrency || 'USD',
      };

      setUser(targetUser);
      localStorage.setItem(STORAGE_PREFIX + 'active_user', JSON.stringify(targetUser));
      await loadUserScopedData(targetUser);

      setIsAuthenticated(true);
      sessionStorage.setItem('aurelis_is_authenticated', 'true');
      localStorage.removeItem('aurelis_is_authenticated');

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#B69A62', '#123C32', '#D4C097'],
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication failed' };
    }
  };

  const loginWithPasskey = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await AurelisApiClient.passkeyVerify().catch(() => null);
      if (res?.user) {
        const targetUser: UserProfile = {
          ...INITIAL_USER,
          id: res.user.id,
          email: res.user.email,
          name: res.user.name || (res.user as any).fullName || 'Alex Morgan',
          aurelisTag: res.user.aurelisTag || '@alex.morgan',
          tier: res.user.tier || 'Private Wealth Sovereign',
          avatar: res.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          primaryCurrency: (res.user as any).baseCurrency || 'USD',
        };
        setUser(targetUser);
        localStorage.setItem(STORAGE_PREFIX + 'active_user', JSON.stringify(targetUser));
        await loadUserScopedData(targetUser);
      }
      setIsAuthenticated(true);
      sessionStorage.setItem('aurelis_is_authenticated', 'true');
      localStorage.removeItem('aurelis_is_authenticated');

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#B69A62', '#123C32', '#FFFFFF'],
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Passkey verification failed' };
    }
  };

  const registerUser = async (data: {
    name: string;
    email: string;
    country?: string;
    currency?: CurrencyCode;
    tier?: 'Private Wealth Sovereign' | 'Private Client' | 'Signature Elite';
    password?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const apiRes = await AurelisApiClient.register({
        email: data.email,
        fullName: data.name,
        country: data.country || 'Switzerland',
        baseCurrency: data.currency || 'USD',
        password: data.password,
      });

      if (!apiRes.user) {
        return { success: false, error: 'Registration failed to return user profile.' };
      }

      const newUser: UserProfile = {
        ...INITIAL_USER,
        id: apiRes.user.id,
        name: apiRes.user.name || (apiRes.user as any).fullName || data.name,
        email: apiRes.user.email || data.email,
        aurelisTag: apiRes.user.aurelisTag || `@${data.name.toLowerCase().replace(/\s+/g, '.')}`,
        tier: apiRes.user.tier || data.tier || 'Private Client',
        primaryCurrency: (apiRes.user as any).baseCurrency || data.currency || 'USD',
        address: {
          ...INITIAL_USER.address,
          country: data.country || 'Switzerland',
        },
      };

      setUser(newUser);
      localStorage.setItem(STORAGE_PREFIX + 'active_user', JSON.stringify(newUser));

      // Fetch the isolated wallet created for this user by the backend
      try {
        const apiWallets = await AurelisApiClient.getWallets();
        if (apiWallets?.wallets && apiWallets.wallets.length > 0) {
          setWallets(apiWallets.wallets);
          localStorage.setItem(`${STORAGE_PREFIX}${newUser.id}_wallets`, JSON.stringify(apiWallets.wallets));
        }
      } catch (wErr) {
        console.warn('Failed to fetch new user wallets:', wErr);
      }

      setTransactions([]);
      localStorage.setItem(`${STORAGE_PREFIX}${newUser.id}_transactions`, JSON.stringify([]));

      setRecipients([]);
      localStorage.setItem(`${STORAGE_PREFIX}${newUser.id}_recipients`, JSON.stringify([]));

      setNotifications([
        {
          id: `notif_${Date.now()}`,
          title: 'Sovereign Account Provisioned',
          description: `Welcome to AURELIS. Your base ${data.currency || 'USD'} vault has been provisioned.`,
          type: 'security',
          timestamp: 'Just now',
          isRead: false,
        },
      ]);

      setIsAuthenticated(true);
      sessionStorage.setItem('aurelis_is_authenticated', 'true');
      localStorage.removeItem('aurelis_is_authenticated');

      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#B69A62', '#123C32', '#D4C097', '#E5E2D9'],
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  const updateTransactionPin = async (newPin: string, currentPin?: string) => {
    try {
      await AurelisApiClient.updateTransactionPin(newPin, currentPin).catch(() => null);
      setUser((prev) => ({ ...prev, transactionPin: newPin }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update PIN' };
    }
  };

  const resetDemoData = () => {
    sessionStorage.clear();
    localStorage.clear();
    setUser(INITIAL_USER);
    setWallets([]);
    setTransactions([]);
    setRecipients([]);
    setCards([]);
    setNotifications([]);
    setIsAuthenticated(false);
  };

  const logout = () => {
    AurelisSocketClient.getInstance().disconnect();
    AurelisApiClient.logout();
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.clear();
    }
    setUser(INITIAL_USER);
    setWallets([]);
    setTransactions([]);
    setRecipients([]);
    setCards([]);
    setNotifications([]);
    setIsAuthenticated(false);
    setActiveModal(null);
    setCurrentTab('dashboard');
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        login,
        loginWithPasskey,
        registerUser,
        logout,
        user,
        wallets,
        transactions,
        recipients,
        cards,
        notifications,
        currentTab,
        setCurrentTab,
        activeModal,
        modalPayload,
        openModal,
        closeModal,
        selectedTxn,
        openTxnDetail,
        totalBalanceUSD,
        unreadNotificationsCount,
        sendMoney,
        exchangeCurrency,
        addFunds,
        withdrawFunds,
        addRecipient,
        updateRecipient,
        removeRecipient,
        toggleFavoriteRecipient,
        toggleCardFreeze,
        updateCardLimits,
        issueNewCard,
        createWallet,
        setDefaultWallet,
        markNotificationRead,
        markAllNotificationsRead,
        updateUserProfile,
        updateTransactionPin,
        resetDemoData,
        prefillSendModal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
