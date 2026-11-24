import { useMemo, useState, type FormEvent } from 'react';
import { Phone, MessageCircle, Plus, CheckCircle2 } from 'lucide-react';
import type { ExpenseEntry, PaymentMode, ShopState, Transaction } from '../types/shop';
import {
  computeDashboardSummary,
  formatINR,
  formatQuantity,
  getTodayISODate,
  sanitizePhoneForLinks,
} from '../utils/shopLogic';
import { RevenueAnalyticsSection } from './RevenueAnalyticsSection';

interface MoneyPaymentsViewProps {
  state: ShopState;
  onOpenSettleModal: (txn: Transaction) => void;
  onAddExpense: (
    input: Omit<ExpenseEntry, 'id' | 'createdAt'>,
  ) => { ok: true } | { ok: false; error: string };
}

type PaymentTabFilter = 'all_dues' | 'receivables' | 'payables' | 'expenses';

export function MoneyPaymentsView({
  state,
  onOpenSettleModal,
  onAddExpense,
}: MoneyPaymentsViewProps) {
  const [activeFilter, setActiveFilter] = useState<PaymentTabFilter>('all_dues');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState('Labour & Handling');
  const [expAmount, setExpAmount] = useState('');
  const [expMode, setExpMode] = useState<Exclude<PaymentMode, 'Credit/Udhaar'>>('Cash');
  const [expDate, setExpDate] = useState(getTodayISODate());
  const [expError, setExpError] = useState<string | null>(null);

  const summary = useMemo(() => computeDashboardSummary(state), [state]);

  const dueTransactions = useMemo(() => {
    return state.transactions.filter((t) => {
      const balance = Math.max(0, t.totalAmount - t.paidAmount);
      if (balance <= 0 || t.paymentStatus === 'Paid') return false;
      if (activeFilter === 'receivables') return t.type === 'stock_out';
      if (activeFilter === 'payables') return t.type === 'stock_in';
      return true;
    });
  }, [state.transactions, activeFilter]);

  const handleExpenseSubmit = (e: FormEvent) => {
    e.preventDefault();
    setExpError(null);
    const res = onAddExpense({
      title: expTitle,
      category: expCategory,
      amount: Number(expAmount),
      paymentMode: expMode,
      date: expDate,
    });
    if (!res.ok) {
      setExpError(res.error);
      return;
    }
    setExpTitle('');
    setExpAmount('');
    setShowExpenseForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B192C]">
            Money &amp; Payments Ledger
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Track buyer Udhaar receivables, big-seller payables, and daily showroom expenses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowExpenseForm((v) => !v);
            setExpError(null);
          }}
          className="min-h-[44px] px-4 rounded-xl bg-[#0B192C] hover:bg-[#132642] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log Shop Expense</span>
        </button>
      </div>

      {/* 3 Money Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-500">Buyer Receivables (Udhaar)</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#15803D] tabular-nums">
            {formatINR(summary.totalReceivables)}
          </div>
          <div className="mt-1 text-xs text-slate-500">To collect from customers &amp; contractors</div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-500">Supplier Payables</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#B91C1C] tabular-nums">
            {formatINR(summary.totalPayables)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Pending bills to big sellers</div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-500">Today&apos;s Money In vs Out</div>
          <div className="mt-1.5 font-mono text-lg font-bold text-[#0B192C] tabular-nums">
            +{formatINR(summary.todaysSalesMoneyIn)} / -{formatINR(summary.todaysPurchasesMoneyOut)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Includes purchases &amp; showroom expenses</div>
        </div>
      </div>

      <RevenueAnalyticsSection transactions={state.transactions} />

      {showExpenseForm && (
        <form
          onSubmit={handleExpenseSubmit}
          className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-4"
        >
          <h2 className="font-display text-base font-bold text-[#0B192C]">
            Log Showroom Expense
          </h2>
          {expError && (
            <p className="text-xs font-medium text-[#B91C1C]">{expError}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label htmlFor="exp-title" className="block text-xs font-semibold text-slate-700 mb-1">
                Description
              </label>
              <input
                id="exp-title"
                type="text"
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                placeholder="e.g. Auto Rickshaw Freight"
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm text-[#0B192C]"
              />
            </div>
            <div>
              <label htmlFor="exp-cat" className="block text-xs font-semibold text-slate-700 mb-1">
                Expense Type
              </label>
              <select
                id="exp-cat"
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white text-sm text-[#0B192C]"
              >
                <option value="Labour & Handling">Labour &amp; Handling</option>
                <option value="Transport & Freight">Transport &amp; Freight</option>
                <option value="Electricity & Utilities">Electricity &amp; Utilities</option>
                <option value="Showroom Maintenance">Showroom Maintenance</option>
              </select>
            </div>
            <div>
              <label htmlFor="exp-amount" className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (₹)
              </label>
              <input
                id="exp-amount"
                type="number"
                min="1"
                step="any"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="0"
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono text-[#0B192C]"
              />
            </div>
            <div>
              <label htmlFor="exp-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Date &amp; Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="exp-date"
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="min-h-[44px] px-2 rounded-xl border border-slate-300 text-xs text-[#0B192C]"
                />
                <select
                  aria-label="Expense payment mode"
                  value={expMode}
                  onChange={(e) =>
                    setExpMode(e.target.value as Exclude<PaymentMode, 'Credit/Udhaar'>)
                  }
                  className="min-h-[44px] px-2 rounded-xl border border-slate-300 bg-white text-xs text-[#0B192C]"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowExpenseForm(false)}
              className="min-h-[44px] px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-[#C59B27] hover:bg-[#D4AA34] text-[#0B192C] text-xs font-bold cursor-pointer"
            >
              Save Expense
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all_dues', label: 'All Pending Dues' },
              { id: 'receivables', label: 'Buyer Receivables' },
              { id: 'payables', label: 'Supplier Payables' },
              { id: 'expenses', label: 'Showroom Expenses' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-[#0B192C] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeFilter === 'expenses' ? (
          state.expenses.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No showroom expenses logged yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {state.expenses.map((exp) => (
                <li
                  key={exp.id}
                  className="p-4 sm:px-5 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#0B192C]">{exp.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {exp.category} · {exp.paymentMode} · {exp.date}
                    </div>
                  </div>
                  <div className="font-mono text-sm font-bold text-[#0B192C] tabular-nums">
                    {formatINR(exp.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : dueTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-[#15803D] mx-auto" />
            <p className="mt-2 text-sm font-semibold text-[#0B192C]">All settled!</p>
            <p className="text-xs text-slate-500 mt-1">
              No pending receivables or payables in this filter.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {dueTransactions.map((txn) => {
              const balance = Math.max(0, txn.totalAmount - txn.paidAmount);
              const isReceivable = txn.type === 'stock_out';
              const waPhone = txn.partyPhone ? sanitizePhoneForLinks(txn.partyPhone) : '';

              return (
                <li
                  key={txn.id}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span
                        className={`text-xs font-semibold ${
                          isReceivable ? 'text-[#15803D]' : 'text-[#B91C1C]'
                        }`}
                      >
                        {isReceivable ? 'Receivable' : 'Payable'}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="font-semibold text-sm text-[#0B192C]">
                        {txn.partyName}
                      </span>
                      {txn.partyPhone && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="font-mono text-xs text-slate-600 tabular-nums">
                            {txn.partyPhone}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="mt-1 text-xs text-slate-500 tabular-nums">
                      {txn.productName} ({formatQuantity(txn.quantity, txn.unit)}) · Bill{' '}
                      {formatINR(txn.totalAmount)} · Paid {formatINR(txn.paidAmount)} · {txn.date}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 shrink-0">
                    <div className="mr-1">
                      <div className="text-[11px] text-slate-500 sm:text-right">Balance Due</div>
                      <div className="font-mono text-base font-bold text-[#B91C1C] tabular-nums">
                        {formatINR(balance)}
                      </div>
                    </div>

                    {txn.partyPhone && (
                      <>
                        <a
                          href={`tel:+91${txn.partyPhone.replace(/\D/g, '').slice(-10)}`}
                          aria-label={`Call ${txn.partyName}`}
                          className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 inline-flex items-center justify-center"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <a
                          href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                            `Hello ${txn.partyName}, payment update from HOME DECOR: Pending balance for ${txn.productName} is ${formatINR(balance)}. Thank you.`,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Send WhatsApp payment note to ${txn.partyName}`}
                          className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 inline-flex items-center justify-center"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenSettleModal(txn)}
                      className="min-h-[40px] px-3.5 rounded-lg bg-[#0B192C] hover:bg-[#132642] text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      Record Payment
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
