import { useMemo, useState } from 'react';
import {
  Phone,
  MessageCircle,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  IndianRupee,
  PackageCheck,
} from 'lucide-react';
import { SHOP_CONTACTS } from '../data/seedData';
import type { ActiveTab, ShopState, Transaction } from '../types/shop';
import {
  computeDashboardSummary,
  filterTransactions,
  formatINR,
  formatQuantity,
  sanitizePhoneForLinks,
  type TransactionFeedFilter,
} from '../utils/shopLogic';
import { ShopLogoSlot } from './ShopLogoSlot';

interface HomeViewProps {
  state: ShopState;
  onNavigateTab: (tab: ActiveTab) => void;
  onUploadLogo: (dataUrl: string) => void;
  onResetLogo: () => void;
  onOpenSettleModal: (txn: Transaction) => void;
}

const FILTER_OPTIONS: { id: TransactionFeedFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'stock_in', label: 'Stock In' },
  { id: 'stock_out', label: 'Stock Out' },
  { id: 'pending_dues', label: 'Pending Dues' },
];

function formatFeedTimestamp(isoString: string, dateStr: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return dateStr;
  }
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function HomeView({
  state,
  onNavigateTab,
  onUploadLogo,
  onResetLogo,
  onOpenSettleModal,
}: HomeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [feedFilter, setFeedFilter] = useState<TransactionFeedFilter>('all');

  const summary = useMemo(() => computeDashboardSummary(state), [state]);

  const filteredTransactions = useMemo(
    () => filterTransactions(state.transactions, searchQuery, feedFilter),
    [state.transactions, searchQuery, feedFilter],
  );

  return (
    <div className="space-y-6">
      {/* Showroom Brand Header & Management Contacts Card */}
      <section
        aria-label="HOME DECOR showroom header and contacts"
        className="rounded-2xl bg-[#0B192C] text-white border border-[#C59B27]/40 p-4 sm:p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-4">
            <ShopLogoSlot
              customLogoDataUrl={state.customLogoDataUrl}
              onUploadLogo={onUploadLogo}
              onResetLogo={onResetLogo}
              size="lg"
              editable
            />
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-medium text-[#E5C773] tracking-wide">
                Hardware · Sanitaryware · Tiles &amp; Marbles
              </p>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-wide text-white">
                HOME DECOR
              </h1>
              <p className="mt-1 text-sm text-slate-300 max-w-xl">
                Showroom inventory, retail &amp; contractor billing, supplier bills, and Udhaar ledger.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:min-w-[460px]">
            {SHOP_CONTACTS.map((contact) => {
              const waPhone = sanitizePhoneForLinks(contact.phone);
              return (
                <div
                  key={contact.id}
                  className="rounded-xl bg-[#132642] border border-white/12 p-3.5 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="text-xs text-[#E5C773] font-medium">
                      {contact.label} · {contact.role}
                    </div>
                    <div className="mt-1 font-mono text-base sm:text-lg font-semibold text-white tabular-nums">
                      +91 {contact.phone}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`tel:+91${contact.phone}`}
                      aria-label={`Call ${contact.label} at ${contact.phone}`}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-lg bg-white text-[#0B192C] hover:bg-slate-100 text-xs font-semibold whitespace-nowrap transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                        'Hello HOME DECOR, I have a product inquiry.',
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp ${contact.label} at ${contact.phone}`}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-lg bg-[#C59B27] text-[#0B192C] hover:bg-[#D4AA34] text-xs font-semibold whitespace-nowrap transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4 Live Dashboard Summary Cards */}
      <section aria-label="Live shop summary metrics">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => onNavigateTab('inventory')}
            className="text-left rounded-2xl bg-white border border-slate-200 p-4 hover:border-[#0B192C]/35 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
              <span>Total Stock Value</span>
              <PackageCheck className="w-4 h-4 text-[#0B192C] shrink-0" />
            </div>
            <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-[#0B192C] tabular-nums">
              {formatINR(summary.totalStockValue)}
            </div>
            <div className="mt-1 text-xs text-slate-500 tabular-nums">
              {summary.totalProductCount} items in catalog
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFeedFilter('stock_out');
            }}
            className="text-left rounded-2xl bg-white border border-slate-200 p-4 hover:border-[#15803D]/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
              <span>Today&apos;s Sales (In)</span>
              <ArrowDownLeft className="w-4 h-4 text-[#15803D] shrink-0" />
            </div>
            <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-[#15803D] tabular-nums">
              {formatINR(summary.todaysSalesMoneyIn)}
            </div>
            <div className="mt-1 text-xs text-slate-500 tabular-nums">
              {summary.todaysSalesOrderCount} orders today
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('payments')}
            className="text-left rounded-2xl bg-white border border-slate-200 p-4 hover:border-[#B8860B]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
              <span>Today&apos;s Outflow</span>
              <ArrowUpRight className="w-4 h-4 text-[#B45309] shrink-0" />
            </div>
            <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-[#0B192C] tabular-nums">
              {formatINR(summary.todaysPurchasesMoneyOut)}
            </div>
            <div className="mt-1 text-xs text-slate-500 tabular-nums">
              {summary.todaysOutflowCount} purchases &amp; expenses
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab(summary.lowStockCount > 0 ? 'reminders' : 'payments')}
            className="text-left rounded-2xl bg-white border border-slate-200 p-4 hover:border-[#B91C1C]/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
              <span>Pending Dues / Alerts</span>
              {summary.lowStockCount > 0 ? (
                <AlertTriangle className="w-4 h-4 text-[#B91C1C] shrink-0" />
              ) : (
                <IndianRupee className="w-4 h-4 text-[#B45309] shrink-0" />
              )}
            </div>
            <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-[#B91C1C] tabular-nums">
              {formatINR(summary.pendingDuesAmount)}
            </div>
            <div className="mt-1 text-xs text-slate-600 tabular-nums">
              {summary.pendingDuesCount} dues · {summary.lowStockCount} low stock
            </div>
          </button>
        </div>
      </section>

      {/* Searchable, Filterable Recent Transactions Feed */}
      <section
        aria-label="Recent transactions feed"
        className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0B192C]">
                Recent Transactions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                Showing {filteredTransactions.length} of {state.transactions.length} entries
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <label htmlFor="tx-search" className="sr-only">
                Search recent transactions
              </label>
              <input
                id="tx-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search item, party, phone..."
                className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-slate-200 bg-[#F8F9FB] text-sm text-[#0B192C] placeholder:text-slate-400 focus:outline-none focus:border-[#0B192C] focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {FILTER_OPTIONS.map((opt) => {
              const active = feedFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFeedFilter(opt.id)}
                  className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#0B192C] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              No transactions match your search or filter.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Try clearing your filter or record a new Stock In / Stock Out entry.
            </p>
            {(searchQuery || feedFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFeedFilter('all');
                }}
                className="mt-4 min-h-[44px] px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-[#0B192C]"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredTransactions.map((txn) => {
              const isSale = txn.type === 'stock_out';
              const balance = Math.max(0, txn.totalAmount - txn.paidAmount);
              const statusColor =
                txn.paymentStatus === 'Paid'
                  ? 'text-[#15803D]'
                  : txn.paymentStatus === 'Partial'
                    ? 'text-[#B45309]'
                    : 'text-[#B91C1C]';

              return (
                <li
                  key={txn.id}
                  className="p-4 sm:px-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      aria-hidden="true"
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSale
                          ? 'bg-emerald-50 text-[#15803D]'
                          : 'bg-amber-50 text-[#B45309]'
                      }`}
                    >
                      {isSale ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-semibold text-sm text-[#0B192C] truncate max-w-[280px] sm:max-w-md">
                          {txn.productName}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                          {isSale ? '-' : '+'}
                          {formatQuantity(txn.quantity, txn.unit)}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                          {isSale ? 'Sold to' : 'Bought from'} {txn.partyName}
                        </span>
                        {txn.partyPhone && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{txn.partyPhone}</span>
                          </>
                        )}
                        {txn.customerType && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{txn.customerType}</span>
                          </>
                        )}
                        {txn.paymentMode && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{txn.paymentMode}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {formatFeedTimestamp(txn.createdAt, txn.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pl-12 sm:pl-0 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="font-mono text-sm sm:text-base font-bold text-[#0B192C] tabular-nums">
                        {formatINR(txn.totalAmount)}
                      </div>
                      <div className={`text-xs font-semibold ${statusColor} tabular-nums`}>
                        {txn.paymentStatus}
                        {balance > 0 ? ` · Due ${formatINR(balance)}` : ''}
                      </div>
                    </div>

                    {balance > 0 && (
                      <button
                        type="button"
                        onClick={() => onOpenSettleModal(txn)}
                        className="min-h-[40px] px-3 rounded-lg border border-[#0B192C]/25 bg-white hover:bg-[#0B192C] hover:text-white text-xs font-semibold text-[#0B192C] whitespace-nowrap transition-colors cursor-pointer"
                      >
                        Settle
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
