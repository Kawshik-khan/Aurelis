import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { useTheme } from './context/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NotificationToastContainer } from './components/common/NotificationToastContainer';
import { MessagePreviewModal } from './components/notifications/MessagePreviewModal';

// Screens
import { DashboardView } from './components/dashboard/DashboardView';
import { SendMoneyView } from './components/send/SendMoneyView';
import { ReceiveView } from './components/receive/ReceiveView';
import { ExchangeView } from './components/exchange/ExchangeView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { RecipientsView } from './components/recipients/RecipientsView';
import { WalletsView } from './components/wallets/WalletsView';
import { CardsView } from './components/cards/CardsView';
import { ProfileView } from './components/profile/ProfileView';

// Global Modals
import { SendMoneyModal } from './components/send/SendMoneyModal';
import { RequestMoneyModal } from './components/receive/RequestMoneyModal';
import { AddFundsModal } from './components/wallets/AddFundsModal';
import { WithdrawModal } from './components/wallets/WithdrawModal';
import { AddRecipientModal } from './components/recipients/AddRecipientModal';
import { CreateWalletModal } from './components/wallets/CreateWalletModal';
import { TransactionDetailModal } from './components/transactions/TransactionDetailModal';
import { AuthModal } from './components/auth/AuthModal';
import { AuthPage } from './components/auth/AuthPage';

export const AppContent: React.FC = () => {
  const {
    isAuthenticated,
    currentTab,
    setCurrentTab,
    activeModal,
    modalPayload,
    closeModal,
    selectedTxn,
    selectedAlert,
    closeAlertPreview,
  } = useApp();

  const { isDark } = useTheme();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcut for Cmd+K Search and Cmd+S Send
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // If user is not authenticated on startup, show the dedicated Auth Page
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const renderCurrentTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'send':
        return <SendMoneyView />;
      case 'receive':
        return <ReceiveView />;
      case 'exchange':
        return <ExchangeView />;
      case 'transactions':
        return <TransactionsView />;
      case 'recipients':
        return <RecipientsView />;
      case 'wallets':
        return <WalletsView />;
      case 'cards':
        return <CardsView />;
      case 'profile':
      case 'settings':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div
      className={`min-h-screen flex relative overflow-x-hidden selection:bg-blue-600 selection:text-white theme-transition ${
        isDark
          ? 'bg-[#09090F] text-white'
          : 'bg-[#F4F5F9] text-gray-900'
      }`}
    >
      {/* Very subtle ambient depth — dark mode only */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Top-center — very faint blue hint */}
          <div className="absolute -top-32 left-1/3 w-[800px] h-[500px] bg-blue-600/[0.07] rounded-full blur-[140px]" />
          {/* Right-mid — barely visible accent */}
          <div className="absolute top-1/3 -right-24 w-[500px] h-[400px] bg-indigo-500/[0.05] rounded-full blur-[120px]" />
          {/* Bottom-left — subtle warmth */}
          <div className="absolute bottom-0 -left-16 w-[500px] h-[400px] bg-blue-700/[0.05] rounded-full blur-[130px]" />
        </div>
      )}

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <Header
          onOpenNotifications={() => setNotificationsOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />

        {/* Dynamic Page Container */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary
            onReset={() => setCurrentTab('dashboard')}
            fallbackTitle="View Rendering Interrupted"
            fallbackSubtitle="A temporary error occurred while rendering this page. You can return to the Overview dashboard or try again."
          >
            {renderCurrentTab()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Drawers & Overlays */}
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* Global Modals triggered from AppContext */}
      {activeModal === 'send' && (
        <SendMoneyModal
          isOpen={true}
          onClose={closeModal}
          initialRecipient={modalPayload?.recipient}
          initialAmount={modalPayload?.amount}
          initialCurrency={modalPayload?.currency}
        />
      )}

      {activeModal === 'request-money' && (
        <RequestMoneyModal
          isOpen={true}
          onClose={closeModal}
        />
      )}

      {activeModal === 'add-funds' && (
        <AddFundsModal
          isOpen={true}
          onClose={closeModal}
          defaultCurrency={modalPayload?.currency || 'USD'}
        />
      )}

      {activeModal === 'withdraw' && (
        <WithdrawModal
          isOpen={true}
          onClose={closeModal}
          defaultCurrency={modalPayload?.currency || 'USD'}
        />
      )}

      {activeModal === 'add-recipient' && (
        <AddRecipientModal
          isOpen={true}
          onClose={closeModal}
        />
      )}

      {activeModal === 'create-wallet' && (
        <CreateWalletModal
          isOpen={true}
          onClose={closeModal}
        />
      )}

      {activeModal === 'transaction-detail' && (
        <TransactionDetailModal
          isOpen={true}
          onClose={closeModal}
          txn={selectedTxn || modalPayload}
        />
      )}

      {activeModal === 'quick-auth' && (
        <AuthModal
          isOpen={true}
          onClose={closeModal}
        />
      )}

      {/* Real-time Multi-Channel Notification Toasts */}
      <NotificationToastContainer />

      {/* Dispatched Alert (SMS / Email) Interactive Previewer */}
      <MessagePreviewModal
        alert={selectedAlert}
        onClose={closeAlertPreview}
      />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
