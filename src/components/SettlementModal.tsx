import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { PaymentMode, Transaction } from '../types/shop';
import { formatINR } from '../utils/shopLogic';

interface SettlementModalProps {
  transaction: Transaction;
  onClose: () => void;
  onConfirm: (
    transactionId: string,
    amount: number,
    paymentMode: PaymentMode,
  ) => { ok: true } | { ok: false; error: string };
}

export function SettlementModal({
  transaction,
  onClose,
  onConfirm,
}: SettlementModalProps) {
  const remaining = Math.max(
    0,
    Math.round((transaction.totalAmount - transaction.paidAmount) * 100) / 100,
  );
  const [amount, setAmount] = useState<string>(String(remaining));
  const [mode, setMode] = useState<PaymentMode>('UPI');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = onConfirm(transaction.id, Number(amount), mode);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settle-modal-title"
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 p-5 sm:p-6"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 id="settle-modal-title" className="font-display text-lg font-bold text-[#0B192C]">
            Record Payment
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment settlement dialog"
            className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-xl bg-[#F8F9FB] border border-slate-200 p-3.5 text-xs space-y-1">
            <div className="font-semibold text-sm text-[#0B192C]">
              {transaction.partyName}
            </div>
            <div className="text-slate-600">{transaction.productName}</div>
            <div className="flex justify-between pt-1 text-slate-600 tabular-nums">
              <span>Pending Balance</span>
              <span className="font-mono font-bold text-[#B91C1C]">
                {formatINR(remaining)}
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-[#B91C1C]">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="settle-amount"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Amount Received / Paid (₹)
            </label>
            <input
              id="settle-amount"
              type="number"
              min="1"
              max={remaining}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
            />
          </div>

          <div>
            <label
              htmlFor="settle-mode"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Payment Mode
            </label>
            <select
              id="settle-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as PaymentMode)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-[#0B192C]"
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-[#0B192C] hover:bg-[#132642] text-white text-sm font-semibold cursor-pointer"
            >
              Confirm Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
