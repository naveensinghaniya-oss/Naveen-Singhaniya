import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Building2,
} from 'lucide-react';
import type {
  CustomerType,
  PaymentMode,
  PaymentStatus,
  Product,
  ShopState,
  StockInInput,
  StockOutInput,
} from '../types/shop';
import {
  calculateStockOutTotal,
  formatINR,
  formatQuantity,
  getTodayISODate,
} from '../utils/shopLogic';

interface StockInOutViewProps {
  state: ShopState;
  initialMode: 'in' | 'out';
  initialProductId: string | null;
  onSubmitStockIn: (input: StockInInput) => { ok: true } | { ok: false; error: string };
  onSubmitStockOut: (input: StockOutInput) => { ok: true } | { ok: false; error: string };
}

const PAYMENT_STATUSES: PaymentStatus[] = ['Paid', 'Partial', 'Pending'];
const PAYMENT_MODES: PaymentMode[] = ['Cash', 'UPI', 'Bank Transfer', 'Credit/Udhaar'];

export function StockInOutView({
  state,
  initialMode,
  initialProductId,
  onSubmitStockIn,
  onSubmitStockOut,
}: StockInOutViewProps) {
  const [mode, setMode] = useState<'in' | 'out'>(initialMode);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const defaultProductId = initialProductId || state.products[0]?.id || '';

  // Stock In form state
  const [inProductId, setInProductId] = useState<string>(defaultProductId);
  const [inQty, setInQty] = useState<string>('5');
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierPhone, setSupplierPhone] = useState<string>('');
  const [totalBill, setTotalBill] = useState<string>('');
  const [billManuallyEdited, setBillManuallyEdited] = useState<boolean>(false);
  const [inPaymentStatus, setInPaymentStatus] = useState<PaymentStatus>('Paid');
  const [inPartialPaid, setInPartialPaid] = useState<string>('');
  const [inDate, setInDate] = useState<string>(getTodayISODate());

  // Stock Out form state
  const [outProductId, setOutProductId] = useState<string>(defaultProductId);
  const [customerType, setCustomerType] = useState<CustomerType>('Retail Customer');
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [outQty, setOutQty] = useState<string>('1');
  const [discount, setDiscount] = useState<string>('0');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [outAdvancePaid, setOutAdvancePaid] = useState<string>('0');
  const [outDate, setOutDate] = useState<string>(getTodayISODate());

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (initialProductId) {
      setInProductId(initialProductId);
      setOutProductId(initialProductId);
      setBillManuallyEdited(false);
    }
  }, [initialProductId]);

  const activeProduct: Product | undefined = useMemo(() => {
    const id = mode === 'in' ? inProductId : outProductId;
    return state.products.find((p) => p.id === id) ?? state.products[0];
  }, [mode, inProductId, outProductId, state.products]);

  // Auto-fill Stock In suggested bill when product or qty changes unless edited manually
  useEffect(() => {
    if (billManuallyEdited) return;
    const prod = state.products.find((p) => p.id === inProductId);
    const qtyNum = Number(inQty);
    if (prod && Number.isFinite(qtyNum) && qtyNum > 0) {
      setTotalBill(String(Math.round(prod.purchaseRate * qtyNum * 100) / 100));
    } else if (!qtyNum) {
      setTotalBill('');
    }
  }, [inProductId, inQty, billManuallyEdited, state.products]);

  const outProduct = useMemo(
    () => state.products.find((p) => p.id === outProductId),
    [state.products, outProductId],
  );

  const outPricing = useMemo(() => {
    if (!outProduct) {
      return { unitRate: 0, grossAmount: 0, netAmount: 0 };
    }
    return calculateStockOutTotal(
      outProduct,
      customerType,
      Number(outQty) || 0,
      Number(discount) || 0,
    );
  }, [outProduct, customerType, outQty, discount]);

  const outQtyNum = Number(outQty) || 0;
  const exceedsStock = Boolean(outProduct && outQtyNum > outProduct.stock);

  const handleStockInSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = onSubmitStockIn({
      productId: inProductId,
      quantity: Number(inQty),
      supplierName,
      supplierPhone,
      totalBillAmount: Number(totalBill),
      paymentStatus: inPaymentStatus,
      paidAmount: inPaymentStatus === 'Partial' ? Number(inPartialPaid) : undefined,
      date: inDate,
    });
    if (!res.ok) {
      setFeedback({ type: 'error', message: res.error });
      return;
    }
    setFeedback({
      type: 'success',
      message: `Stock In recorded: +${inQty} ${activeProduct?.unit ?? ''} added to ${activeProduct?.name ?? 'product'}.`,
    });
    setSupplierName('');
    setSupplierPhone('');
    setInQty('1');
    setInPartialPaid('');
    setBillManuallyEdited(false);
  };

  const handleStockOutSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const res = onSubmitStockOut({
      productId: outProductId,
      customerType,
      buyerName,
      buyerPhone,
      quantity: Number(outQty),
      discount: Number(discount) || 0,
      paymentMode,
      partialPaidAmount:
        paymentMode === 'Credit/Udhaar' ? Number(outAdvancePaid) || 0 : undefined,
      date: outDate,
    });
    if (!res.ok) {
      setFeedback({ type: 'error', message: res.error });
      return;
    }
    setFeedback({
      type: 'success',
      message: `Sale completed: ${outQty} ${outProduct?.unit ?? ''} sold to ${buyerName.trim()} for ${formatINR(outPricing.netAmount)}.`,
    });
    setBuyerName('');
    setBuyerPhone('');
    setOutQty('1');
    setDiscount('0');
    setOutAdvancePaid('0');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B192C]">
            Stock In &amp; Stock Out
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Record big-seller purchases or retail and contractor sales with instant stock sync.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Stock transaction mode"
          className="grid grid-cols-2 p-1 rounded-xl bg-slate-200/80 w-full sm:w-auto sm:min-w-[340px]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'in'}
            onClick={() => {
              setMode('in');
              setFeedback(null);
            }}
            className={`min-h-[44px] px-4 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              mode === 'in'
                ? 'bg-[#0B192C] text-white shadow-sm'
                : 'text-slate-700 hover:text-[#0B192C]'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Stock In (Buy)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'out'}
            onClick={() => {
              setMode('out');
              setFeedback(null);
            }}
            className={`min-h-[44px] px-4 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              mode === 'out'
                ? 'bg-[#0B192C] text-white shadow-sm'
                : 'text-slate-700 hover:text-[#0B192C]'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Stock Out (Sell)</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-xl border p-4 flex items-start gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-[#15803D]'
              : 'bg-red-50 border-red-200 text-[#B91C1C]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium">{feedback.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 rounded-2xl bg-white border border-slate-200 p-4 sm:p-6">
          {mode === 'in' ? (
            <form onSubmit={handleStockInSubmit} className="space-y-5" noValidate>
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B192C]">
                  Stock In — Buy from Big Seller
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Increases available inventory immediately and logs supplier payment status.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="in-product"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Select Product
                  </label>
                  <select
                    id="in-product"
                    value={inProductId}
                    onChange={(e) => {
                      setInProductId(e.target.value);
                      setBillManuallyEdited(false);
                    }}
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  >
                    {state.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category}) — In stock: {formatQuantity(p.stock, p.unit)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="in-qty"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Quantity Purchased ({activeProduct?.unit ?? 'units'})
                  </label>
                  <input
                    id="in-qty"
                    type="number"
                    min="0.01"
                    step="any"
                    value={inQty}
                    onChange={(e) => setInQty(e.target.value)}
                    required
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="in-date"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Purchase Date
                  </label>
                  <input
                    id="in-date"
                    type="date"
                    value={inDate}
                    onChange={(e) => setInDate(e.target.value)}
                    required
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="in-supplier"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Supplier / Big Seller Name
                  </label>
                  <input
                    id="in-supplier"
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. Shree Ganesh Distributors"
                    required
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm text-[#0B192C] placeholder:text-slate-400 focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="in-phone"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Supplier Phone
                  </label>
                  <input
                    id="in-phone"
                    type="tel"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono text-[#0B192C] placeholder:text-slate-400 focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="in-bill"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Total Bill Amount (₹)
                  </label>
                  <input
                    id="in-bill"
                    type="number"
                    min="0"
                    step="any"
                    value={totalBill}
                    onChange={(e) => {
                      setBillManuallyEdited(true);
                      setTotalBill(e.target.value);
                    }}
                    placeholder="0"
                    required
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Payment Status
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PAYMENT_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setInPaymentStatus(status)}
                        className={`min-h-[46px] px-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                          inPaymentStatus === status
                            ? 'bg-[#0B192C] border-[#0B192C] text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {inPaymentStatus === 'Partial' && (
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="in-partial-paid"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Amount Paid Now (₹)
                    </label>
                    <input
                      id="in-partial-paid"
                      type="number"
                      min="1"
                      step="any"
                      value={inPartialPaid}
                      onChange={(e) => setInPartialPaid(e.target.value)}
                      placeholder="Enter partial amount paid to supplier"
                      className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] px-6 rounded-xl bg-[#0B192C] hover:bg-[#132642] text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                Record Stock In Purchase
              </button>
            </form>
          ) : (
            <form onSubmit={handleStockOutSubmit} className="space-y-5" noValidate>
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B192C]">
                  Stock Out — Sell to Customer or Contractor
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automatically applies Retail or Wholesale rate and guards against overselling.
                </p>
              </div>

              {/* Customer Type Rate Toggle */}
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Customer Type (Pricing Tier)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCustomerType('Retail Customer')}
                    className={`min-h-[54px] px-4 py-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      customerType === 'Retail Customer'
                        ? 'bg-[#0B192C] border-[#0B192C] text-white'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold">
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <span>Retail Customer</span>
                    </span>
                    {outProduct && (
                      <span
                        className={`font-mono text-xs font-semibold tabular-nums ${
                          customerType === 'Retail Customer' ? 'text-[#E5C773]' : 'text-slate-600'
                        }`}
                      >
                        {formatINR(outProduct.retailRate)}/{outProduct.unit}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomerType('Small Seller / Contractor')}
                    className={`min-h-[54px] px-4 py-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      customerType === 'Small Seller / Contractor'
                        ? 'bg-[#0B192C] border-[#0B192C] text-white'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold">
                      <Building2 className="w-4 h-4 shrink-0" />
                      <span>Small Seller / Contractor</span>
                    </span>
                    {outProduct && (
                      <span
                        className={`font-mono text-xs font-semibold tabular-nums ${
                          customerType === 'Small Seller / Contractor'
                            ? 'text-[#E5C773]'
                            : 'text-slate-600'
                        }`}
                      >
                        {formatINR(outProduct.wholesaleRate)}/{outProduct.unit}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="out-product"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Select Product
                  </label>
                  <select
                    id="out-product"
                    value={outProductId}
                    onChange={(e) => setOutProductId(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  >
                    {state.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — Available: {formatQuantity(p.stock, p.unit)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="out-buyer"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Buyer / Contractor Name
                  </label>
                  <input
                    id="out-buyer"
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="e.g. Rajesh Verma"
                    required
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm text-[#0B192C] placeholder:text-slate-400 focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="out-phone"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Buyer Phone
                  </label>
                  <input
                    id="out-phone"
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono text-[#0B192C] placeholder:text-slate-400 focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="out-qty"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Quantity Sold ({outProduct?.unit ?? 'units'})
                  </label>
                  <input
                    id="out-qty"
                    type="number"
                    min="0.01"
                    step="any"
                    value={outQty}
                    onChange={(e) => setOutQty(e.target.value)}
                    required
                    className={`w-full min-h-[46px] px-3.5 rounded-xl border text-sm font-mono text-[#0B192C] focus:outline-none ${
                      exceedsStock
                        ? 'border-[#B91C1C] bg-red-50/50 focus:border-[#B91C1C]'
                        : 'border-slate-300 focus:border-[#0B192C]'
                    }`}
                  />
                  {outProduct && (
                    <p
                      className={`mt-1 text-xs tabular-nums ${
                        exceedsStock ? 'text-[#B91C1C] font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {exceedsStock
                        ? `Exceeds available stock (${formatQuantity(outProduct.stock, outProduct.unit)})`
                        : `Remaining after sale: ${formatQuantity(
                            Math.max(0, outProduct.stock - outQtyNum),
                            outProduct.unit,
                          )}`}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="out-discount"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Discount (₹)
                  </label>
                  <input
                    id="out-discount"
                    type="number"
                    min="0"
                    step="any"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="out-payment-mode"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Payment Mode
                  </label>
                  <select
                    id="out-payment-mode"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  >
                    {PAYMENT_MODES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="out-date"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Sale Date
                  </label>
                  <input
                    id="out-date"
                    type="date"
                    value={outDate}
                    onChange={(e) => setOutDate(e.target.value)}
                    required
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                {paymentMode === 'Credit/Udhaar' && (
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="out-advance"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Advance Paid Now (₹) — Leave 0 for full Udhaar
                    </label>
                    <input
                      id="out-advance"
                      type="number"
                      min="0"
                      step="any"
                      value={outAdvancePaid}
                      onChange={(e) => setOutAdvancePaid(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                    />
                  </div>
                )}
              </div>

              {/* Live Bill Summary */}
              <div className="rounded-xl bg-[#F8F9FB] border border-slate-200 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Rate ({customerType === 'Retail Customer' ? 'Retail' : 'Wholesale'})
                  </span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatINR(outPricing.unitRate)} × {outQtyNum || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Gross Subtotal</span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatINR(outPricing.grossAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Discount</span>
                  <span className="font-mono font-medium tabular-nums">
                    - {formatINR(Number(discount) || 0)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#0B192C]">Net Payable</span>
                  <span className="font-mono text-lg font-bold text-[#0B192C] tabular-nums">
                    {formatINR(outPricing.netAmount)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] px-6 rounded-xl bg-[#C59B27] hover:bg-[#D4AA34] text-[#0B192C] font-bold text-sm transition-colors cursor-pointer"
              >
                Complete Sale (Stock Out)
              </button>
            </form>
          )}
        </div>

        {/* Side Column: Selected Product Reference */}
        <aside className="lg:col-span-4 space-y-4">
          {activeProduct && (
            <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
              <div>
                <div className="text-xs font-medium text-[#B8860B]">
                  {activeProduct.category} · Unit: {activeProduct.unit}
                </div>
                <h3 className="mt-1 font-display text-base font-bold text-[#0B192C]">
                  {activeProduct.name}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <div className="text-xs text-slate-500">Available Stock</div>
                  <div
                    className={`mt-0.5 font-mono text-lg font-bold tabular-nums ${
                      activeProduct.stock <= activeProduct.minStockAlert
                        ? 'text-[#B91C1C]'
                        : 'text-[#15803D]'
                    }`}
                  >
                    {formatQuantity(activeProduct.stock, activeProduct.unit)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Min Alert Level</div>
                  <div className="mt-0.5 font-mono text-lg font-semibold text-slate-700 tabular-nums">
                    {formatQuantity(activeProduct.minStockAlert, activeProduct.unit)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Purchase Rate</span>
                  <span className="font-mono font-semibold text-[#0B192C] tabular-nums">
                    {formatINR(activeProduct.purchaseRate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Retail Rate</span>
                  <span className="font-mono font-semibold text-[#0B192C] tabular-nums">
                    {formatINR(activeProduct.retailRate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Wholesale / Contractor Rate</span>
                  <span className="font-mono font-semibold text-[#0B192C] tabular-nums">
                    {formatINR(activeProduct.wholesaleRate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <h3 className="font-display text-sm font-bold text-[#0B192C]">
              Latest Stock Movements
            </h3>
            <ul className="mt-3 divide-y divide-slate-100">
              {state.transactions.slice(0, 4).map((txn) => (
                <li key={txn.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#0B192C] truncate">{txn.productName}</div>
                    <div className="text-slate-500 truncate">
                      {txn.type === 'stock_in' ? '+' : '-'}
                      {formatQuantity(txn.quantity, txn.unit)} · {txn.partyName}
                    </div>
                  </div>
                  <div className="font-mono font-semibold text-[#0B192C] tabular-nums shrink-0">
                    {formatINR(txn.totalAmount)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
