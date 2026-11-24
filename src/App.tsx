import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { HeaderBar } from './components/HeaderBar';
import { HomeView } from './components/HomeView';
import { InventoryView } from './components/InventoryView';
import { MoneyPaymentsView } from './components/MoneyPaymentsView';
import { RemindersView } from './components/RemindersView';
import { SettlementModal } from './components/SettlementModal';
import { StockInOutView } from './components/StockInOutView';
import type {
  ActiveTab,
  ExpenseEntry,
  PaymentMode,
  ProductInput,
  ShopState,
  StockInInput,
  StockOutInput,
  Transaction,
} from './types/shop';
import {
  addCustomCategory,
  addExpenseEntry,
  addShopReminder,
  applyStockIn,
  applyStockOut,
  computeDashboardSummary,
  recordTransactionSettlement,
  upsertProduct,
} from './utils/shopLogic';
import { loadShopState, saveShopState } from './utils/storage';

export default function App() {
  const [state, setState] = useState<ShopState>(() => loadShopState());
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [stockFormContext, setStockFormContext] = useState<{
    mode: 'in' | 'out';
    productId: string | null;
  }>({ mode: 'out', productId: null });
  const [settlingTxn, setSettlingTxn] = useState<Transaction | null>(null);

  useEffect(() => {
    saveShopState(state);
  }, [state]);

  const summary = useMemo(() => computeDashboardSummary(state), [state]);
  const alertCount = summary.lowStockCount + summary.pendingDuesCount;

  const handleStockIn = (input: StockInInput) => {
    const res = applyStockIn(state, input);
    if (res.ok) {
      setState(res.state);
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  };

  const handleStockOut = (input: StockOutInput) => {
    const res = applyStockOut(state, input);
    if (res.ok) {
      setState(res.state);
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  };

  const handleUpsertProduct = (input: ProductInput) => {
    const res = upsertProduct(state, input);
    if (res.ok) {
      setState(res.state);
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  };

  const handleAddCategory = (name: string) => {
    const res = addCustomCategory(state, name);
    if (res.ok) {
      setState(res.state);
      return { ok: true as const, category: res.category };
    }
    return { ok: false as const, error: res.error };
  };

  const handleSettlementConfirm = (
    transactionId: string,
    amount: number,
    paymentMode: PaymentMode,
  ) => {
    const res = recordTransactionSettlement(state, transactionId, amount, paymentMode);
    if (res.ok) {
      setState(res.state);
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  };

  const handleAddExpense = (input: Omit<ExpenseEntry, 'id' | 'createdAt'>) => {
    const res = addExpenseEntry(state, input);
    if (res.ok) {
      setState(res.state);
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  };

  const handleAddReminder = (title: string, dueDate: string, notes?: string) => {
    const res = addShopReminder(state, title, dueDate, notes);
    if (res.ok) {
      setState(res.state);
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  };

  const handleToggleReminder = (id: string) => {
    setState((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) =>
        r.id === id ? { ...r, completed: !r.completed } : r,
      ),
    }));
  };

  const handleDeleteReminder = (id: string) => {
    setState((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== id),
    }));
  };

  const handleUploadLogo = (dataUrl: string) => {
    setState((prev) => ({ ...prev, customLogoDataUrl: dataUrl }));
  };

  const handleResetLogo = () => {
    setState((prev) => ({ ...prev, customLogoDataUrl: null }));
  };

  const openStockFlow = (mode: 'in' | 'out', productId: string | null = null) => {
    setStockFormContext({ mode, productId });
    setActiveTab('stock');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-[#0B192C]">
      <HeaderBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onQuickStockAction={() => openStockFlow('out', null)}
        customLogoDataUrl={state.customLogoDataUrl}
        alertCount={alertCount}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-24 md:pb-12">
        {activeTab === 'home' && (
          <HomeView
            state={state}
            onNavigateTab={setActiveTab}
            onUploadLogo={handleUploadLogo}
            onResetLogo={handleResetLogo}
            onOpenSettleModal={setSettlingTxn}
          />
        )}

        {activeTab === 'stock' && (
          <StockInOutView
            state={state}
            initialMode={stockFormContext.mode}
            initialProductId={stockFormContext.productId}
            onSubmitStockIn={handleStockIn}
            onSubmitStockOut={handleStockOut}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            state={state}
            onUpsertProduct={handleUpsertProduct}
            onAddCategory={handleAddCategory}
            onQuickStockIn={(id) => openStockFlow('in', id)}
            onQuickStockOut={(id) => openStockFlow('out', id)}
          />
        )}

        {activeTab === 'payments' && (
          <MoneyPaymentsView
            state={state}
            onOpenSettleModal={setSettlingTxn}
            onAddExpense={handleAddExpense}
          />
        )}

        {activeTab === 'reminders' && (
          <RemindersView
            state={state}
            onRestockProduct={(id) => openStockFlow('in', id)}
            onOpenSettleModal={setSettlingTxn}
            onAddReminder={handleAddReminder}
            onToggleReminder={handleToggleReminder}
            onDeleteReminder={handleDeleteReminder}
          />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        alertCount={alertCount}
      />

      {settlingTxn && (
        <SettlementModal
          transaction={settlingTxn}
          onClose={() => setSettlingTxn(null)}
          onConfirm={handleSettlementConfirm}
        />
      )}
    </div>
  );
}
