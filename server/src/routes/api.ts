import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { WalletController } from '../controllers/walletController';
import { TransferController } from '../controllers/transferController';
import { FXController } from '../controllers/fxController';
import { RecipientController } from '../controllers/recipientController';
import { CardController } from '../controllers/cardController';
import { InvoiceController } from '../controllers/invoiceController';
import { TransactionController } from '../controllers/transactionController';
import { NotificationController } from '../controllers/notificationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { idempotencyMiddleware } from '../middleware/idempotencyMiddleware';

const router = Router();

// ================= AUTHENTICATION =================
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.post('/auth/logout', AuthController.logout);
router.post('/auth/passkey/verify', AuthController.passkeyVerify);
router.get('/auth/profile', authMiddleware, AuthController.getProfile);
router.post('/auth/pin', authMiddleware, AuthController.updatePin);
router.get('/users/lookup', authMiddleware, AuthController.lookupUser);

// ================= WALLETS & ACCOUNTS =================
router.get('/wallets', authMiddleware, WalletController.getWallets);
router.post('/wallets', authMiddleware, WalletController.createWallet);
router.post('/wallets/deposit', authMiddleware, WalletController.deposit);
router.post('/wallets/withdraw', authMiddleware, WalletController.withdraw);

// ================= TRANSFERS =================
router.post('/transfers/quote', authMiddleware, TransferController.getQuote);
router.post('/transfers/execute', authMiddleware, idempotencyMiddleware, TransferController.executeTransfer);
router.get('/transfers/:id', authMiddleware, TransferController.getTransferById);

// ================= FOREIGN EXCHANGE (FX) =================
router.get('/fx/rates', FXController.getLiveRates);
router.get('/fx/trends', FXController.getRateTrends);
router.post('/fx/quote-lock', authMiddleware, FXController.lockRate);
router.post('/fx/convert', authMiddleware, idempotencyMiddleware, FXController.executeConversion);

// ================= BENEFICIARIES =================
router.get('/recipients', authMiddleware, RecipientController.getRecipients);
router.post('/recipients', authMiddleware, RecipientController.createRecipient);
router.put('/recipients/:id', authMiddleware, RecipientController.updateRecipient);
router.delete('/recipients/:id', authMiddleware, RecipientController.deleteRecipient);
router.patch('/recipients/:id/favorite', authMiddleware, RecipientController.toggleFavorite);

// ================= CARDS =================
router.get('/cards', authMiddleware, CardController.getCards);
router.post('/cards/issue', authMiddleware, CardController.issueCard);
router.patch('/cards/:id/freeze', authMiddleware, CardController.toggleFreeze);
router.patch('/cards/:id/limits', authMiddleware, CardController.updateLimits);
router.post('/cards/:id/reveal', authMiddleware, CardController.revealDetails);

// ================= INVOICES & PAYMENT LINKS =================
router.post('/invoices/request-payment', authMiddleware, InvoiceController.createPaymentRequest);
router.get('/invoices/pay/:slug', InvoiceController.getPaymentRequestBySlug);

// ================= NOTIFICATIONS & ALERTS =================
router.get('/notifications', authMiddleware, NotificationController.getNotifications);
router.patch('/notifications/read-all', authMiddleware, NotificationController.markAllRead);
router.patch('/notifications/:id/read', authMiddleware, NotificationController.markRead);
router.get('/notifications/alerts', authMiddleware, NotificationController.getDispatchedAlerts);
router.get('/notifications/alerts/:id', authMiddleware, NotificationController.getAlertById);
router.get('/notifications/preferences', authMiddleware, NotificationController.getPreferences);
router.patch('/notifications/preferences', authMiddleware, NotificationController.updatePreferences);
router.post('/notifications/test-alert', authMiddleware, NotificationController.triggerTestAlert);
router.post('/notifications/test-email', authMiddleware, NotificationController.sendTestEmail);
router.post('/notifications/test-sms', authMiddleware, NotificationController.sendTestSms);
router.get('/notifications/sms-balance', authMiddleware, NotificationController.getSmsBalance);

// ================= TRANSACTIONS & AUDIT =================
router.get('/transactions', authMiddleware, TransactionController.getTransactions);
router.get('/transactions/:id/receipt', authMiddleware, TransactionController.getTransactionReceipt);

export default router;

