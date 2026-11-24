import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Phone,
  MessageCircle,
  Plus,
  Trash2,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import type { ShopState, Transaction } from '../types/shop';
import {
  computeDashboardSummary,
  formatINR,
  formatQuantity,
  getTodayISODate,
  sanitizePhoneForLinks,
} from '../utils/shopLogic';

interface RemindersViewProps {
  state: ShopState;
  onRestockProduct: (productId: string) => void;
  onOpenSettleModal: (txn: Transaction) => void;
  onAddReminder: (title: string, dueDate: string, notes?: string) => { ok: true } | { ok: false; error: string };
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

export function RemindersView({
  state,
  onRestockProduct,
  onOpenSettleModal,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
}: RemindersViewProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(getTodayISODate());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => computeDashboardSummary(state), [state]);

  const pendingFollowUps = useMemo(
    () =>
      state.transactions.filter(
        (t) => t.paymentStatus !== 'Paid' && t.totalAmount - t.paidAmount > 0,
      ),
    [state.transactions],
  );

  const handleCreateReminder = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = onAddReminder(title, dueDate, notes);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTitle('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#0B192C]">
          Reminders &amp; Stock Alerts
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Low-stock reorder alerts, Udhaar payment follow-ups, and showroom daily tasks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Low-Stock Alerts */}
        <section
          aria-label="Low-stock reorder alerts"
          className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
        >
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#B45309]" />
              <h2 className="font-display text-base font-bold text-[#0B192C]">
                Low-Stock Reorder Alerts
              </h2>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
              {summary.lowStockCount} items
            </span>
          </div>

          {summary.lowStockProducts.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              All catalog items are above their minimum stock alert levels.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.lowStockProducts.map((item) => (
                <li
                  key={item.id}
                  className="p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#0B192C] truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {item.category} · Available:{' '}
                      <span className="font-semibold text-[#B91C1C]">
                        {formatQuantity(item.stock, item.unit)}
                      </span>{' '}
                      (Min: {item.minStockAlert})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestockProduct(item.id)}
                    className="min-h-[40px] px-3 rounded-lg bg-[#0B192C] hover:bg-[#132642] text-white text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Restock</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Payment Follow-up Reminders */}
        <section
          aria-label="Payment due follow-up alerts"
          className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
        >
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#0B192C]">
              Payment Follow-Ups
            </h2>
            <span className="font-mono text-xs font-semibold text-[#B91C1C] tabular-nums">
              {formatINR(summary.pendingDuesAmount)} due
            </span>
          </div>

          {pendingFollowUps.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No pending payment follow-ups.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendingFollowUps.map((txn) => {
                const due = Math.max(0, txn.totalAmount - txn.paidAmount);
                const waPhone = txn.partyPhone ? sanitizePhoneForLinks(txn.partyPhone) : '';
                return (
                  <li
                    key={txn.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#0B192C]">
                        {txn.partyName}{' '}
                        <span className="font-mono text-xs font-bold text-[#B91C1C] tabular-nums">
                          ({formatINR(due)})
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {txn.type === 'stock_out' ? 'Buyer Udhaar' : 'Supplier Bill'} ·{' '}
                        {txn.productName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {txn.partyPhone && (
                        <>
                          <a
                            href={`tel:+91${txn.partyPhone.replace(/\D/g, '').slice(-10)}`}
                            aria-label={`Call ${txn.partyName}`}
                            className="min-h-[40px] min-w-[40px] rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                              `Hello ${txn.partyName}, gentle reminder from HOME DECOR regarding pending balance of ${formatINR(due)} for ${txn.productName}.`,
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`WhatsApp reminder to ${txn.partyName}`}
                            className="min-h-[40px] min-w-[40px] rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenSettleModal(txn)}
                        className="min-h-[40px] px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0B192C] text-xs font-semibold cursor-pointer"
                      >
                        Settle
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Custom Shop Reminders */}
      <section
        aria-label="Custom shop task reminders"
        className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-4"
      >
        <h2 className="font-display text-base font-bold text-[#0B192C]">
          Showroom Task &amp; Dispatch Reminders
        </h2>

        <form onSubmit={handleCreateReminder} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <label htmlFor="rem-title" className="sr-only">
              Reminder title
            </label>
            <input
              id="rem-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add reminder (e.g. Dispatch 15 boxes tiles to Site B)..."
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm text-[#0B192C]"
            />
          </div>
          <div className="sm:col-span-4">
            <label htmlFor="rem-notes" className="sr-only">
              Notes
            </label>
            <input
              id="rem-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional note / phone"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm text-[#0B192C]"
            />
          </div>
          <div className="sm:col-span-3 flex gap-2">
            <input
              aria-label="Reminder due date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 min-h-[44px] px-2.5 rounded-xl border border-slate-300 text-xs text-[#0B192C]"
            />
            <button
              type="submit"
              aria-label="Add reminder"
              className="min-h-[44px] px-4 rounded-xl bg-[#C59B27] hover:bg-[#D4AA34] text-[#0B192C] text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
        </form>
        {error && <p className="text-xs font-medium text-[#B91C1C]">{error}</p>}

        {state.reminders.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">No custom reminders added yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {state.reminders.map((rem) => (
              <li
                key={rem.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => onToggleReminder(rem.id)}
                  className="flex items-start gap-3 text-left min-w-0 flex-1 cursor-pointer"
                >
                  <span
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      rem.completed
                        ? 'bg-[#15803D] border-[#15803D] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {rem.completed && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-medium ${
                        rem.completed ? 'line-through text-slate-400' : 'text-[#0B192C]'
                      }`}
                    >
                      {rem.title}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      Due {rem.dueDate}
                      {rem.notes ? ` · ${rem.notes}` : ''}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteReminder(rem.id)}
                  aria-label={`Delete reminder '${rem.title}'`}
                  className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-red-50 text-slate-400 hover:text-[#B91C1C] flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
