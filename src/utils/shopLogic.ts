import type {
  CustomerType,
  ExpenseEntry,
  PaymentMode,
  PaymentStatus,
  Product,
  ProductInput,
  ShopReminder,
  ShopState,
  StockInInput,
  StockOutInput,
  Transaction,
} from '../types/shop';

export function formatINR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const rounded = Math.round(safe * 100) / 100;
  const hasDecimals = Math.abs(rounded % 1) > 0.001;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(rounded);
}

export function getTodayISODate(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatQuantity(qty: number, unit: string): string {
  const clean = Number.isInteger(qty) ? qty.toString() : qty.toFixed(2).replace(/\.?0+$/, '');
  return `${clean} ${unit}`;
}

export function sanitizePhoneForLinks(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export interface DashboardSummary {
  totalStockValue: number;
  totalProductCount: number;
  todaysSalesMoneyIn: number;
  todaysSalesOrderCount: number;
  todaysPurchasesMoneyOut: number;
  todaysOutflowCount: number;
  pendingDuesAmount: number;
  pendingDuesCount: number;
  lowStockProducts: Product[];
  lowStockCount: number;
  totalReceivables: number;
  totalPayables: number;
}

export function computeDashboardSummary(
  state: ShopState,
  todayISO = getTodayISODate(),
): DashboardSummary {
  const totalStockValue = state.products.reduce(
    (sum, item) => sum + Math.max(0, item.stock) * Math.max(0, item.purchaseRate),
    0,
  );

  const todaysSales = state.transactions.filter(
    (t) => t.type === 'stock_out' && t.date === todayISO,
  );
  const todaysSalesMoneyIn = todaysSales.reduce((sum, t) => sum + t.paidAmount, 0);

  const todaysPurchases = state.transactions.filter(
    (t) => t.type === 'stock_in' && t.date === todayISO,
  );
  const todaysExpenses = state.expenses.filter((e) => e.date === todayISO);

  const todaysPurchasesMoneyOut =
    todaysPurchases.reduce((sum, t) => sum + t.paidAmount, 0) +
    todaysExpenses.reduce((sum, e) => sum + e.amount, 0);

  let pendingDuesAmount = 0;
  let pendingDuesCount = 0;
  let totalReceivables = 0;
  let totalPayables = 0;

  for (const txn of state.transactions) {
    const balance = Math.max(0, txn.totalAmount - txn.paidAmount);
    if (balance > 0 && txn.paymentStatus !== 'Paid') {
      pendingDuesAmount += balance;
      pendingDuesCount += 1;
      if (txn.type === 'stock_out') {
        totalReceivables += balance;
      } else {
        totalPayables += balance;
      }
    }
  }

  const lowStockProducts = state.products.filter(
    (p) => p.stock <= p.minStockAlert,
  );

  return {
    totalStockValue,
    totalProductCount: state.products.length,
    todaysSalesMoneyIn,
    todaysSalesOrderCount: todaysSales.length,
    todaysPurchasesMoneyOut,
    todaysOutflowCount: todaysPurchases.length + todaysExpenses.length,
    pendingDuesAmount,
    pendingDuesCount,
    lowStockProducts,
    lowStockCount: lowStockProducts.length,
    totalReceivables,
    totalPayables,
  };
}

export function calculateStockOutTotal(
  product: Pick<Product, 'retailRate' | 'wholesaleRate'>,
  customerType: CustomerType,
  quantity: number,
  discount: number,
): { unitRate: number; grossAmount: number; netAmount: number } {
  const unitRate =
    customerType === 'Small Seller / Contractor'
      ? product.wholesaleRate
      : product.retailRate;
  const safeQty = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
  const grossAmount = Math.round(unitRate * safeQty * 100) / 100;
  const safeDiscount = Math.max(0, Number.isFinite(discount) ? discount : 0);
  const netAmount = Math.max(0, Math.round((grossAmount - safeDiscount) * 100) / 100);
  return { unitRate, grossAmount, netAmount };
}

export function applyStockIn(
  state: ShopState,
  input: StockInInput,
  now = new Date(),
): { ok: true; state: ShopState; transaction: Transaction } | { ok: false; error: string } {
  const product = state.products.find((p) => p.id === input.productId);
  if (!product) {
    return { ok: false, error: 'Please select a valid product.' };
  }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { ok: false, error: 'Purchased quantity must be greater than zero.' };
  }
  const supplierName = input.supplierName.trim();
  if (!supplierName) {
    return { ok: false, error: 'Please enter the supplier or wholesaler name.' };
  }
  if (!Number.isFinite(input.totalBillAmount) || input.totalBillAmount < 0) {
    return { ok: false, error: 'Total bill amount cannot be negative.' };
  }

  let paidAmount = 0;
  if (input.paymentStatus === 'Paid') {
    paidAmount = input.totalBillAmount;
  } else if (input.paymentStatus === 'Pending') {
    paidAmount = 0;
  } else {
    const partial = Number(input.paidAmount ?? 0);
    if (!Number.isFinite(partial) || partial <= 0 || partial >= input.totalBillAmount) {
      return {
        ok: false,
        error: 'For partial payment, paid amount must be greater than ₹0 and less than total bill.',
      };
    }
    paidAmount = Math.round(partial * 100) / 100;
  }

  const timestamp = now.toISOString();
  const unitRate =
    input.quantity > 0
      ? Math.round((input.totalBillAmount / input.quantity) * 100) / 100
      : product.purchaseRate;

  const transaction: Transaction = {
    id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'stock_in',
    productId: product.id,
    productName: product.name,
    category: product.category,
    unit: product.unit,
    quantity: input.quantity,
    unitRate,
    discount: 0,
    totalAmount: Math.round(input.totalBillAmount * 100) / 100,
    paidAmount,
    partyName: supplierName,
    partyPhone: input.supplierPhone.trim(),
    paymentStatus: input.paymentStatus,
    date: input.date || getTodayISODate(now),
    createdAt: timestamp,
    notes: input.notes?.trim() || undefined,
  };

  const nextProducts = state.products.map((p) =>
    p.id === product.id
      ? {
          ...p,
          stock: Math.round((p.stock + input.quantity) * 100) / 100,
          updatedAt: timestamp,
        }
      : p,
  );

  return {
    ok: true,
    transaction,
    state: {
      ...state,
      products: nextProducts,
      transactions: [transaction, ...state.transactions],
    },
  };
}

export function applyStockOut(
  state: ShopState,
  input: StockOutInput,
  now = new Date(),
): { ok: true; state: ShopState; transaction: Transaction } | { ok: false; error: string } {
  const product = state.products.find((p) => p.id === input.productId);
  if (!product) {
    return { ok: false, error: 'Please select a valid product.' };
  }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { ok: false, error: 'Sale quantity must be greater than zero.' };
  }
  if (input.quantity > product.stock) {
    return {
      ok: false,
      error: `Insufficient stock: only ${formatQuantity(product.stock, product.unit)} available.`,
    };
  }
  const buyerName = input.buyerName.trim();
  if (!buyerName) {
    return { ok: false, error: 'Please enter the buyer or contractor name.' };
  }
  if (!Number.isFinite(input.discount) || input.discount < 0) {
    return { ok: false, error: 'Discount cannot be negative.' };
  }

  const { unitRate, grossAmount, netAmount } = calculateStockOutTotal(
    product,
    input.customerType,
    input.quantity,
    input.discount,
  );

  if (input.discount > grossAmount) {
    return {
      ok: false,
      error: `Discount (${formatINR(input.discount)}) cannot exceed subtotal (${formatINR(grossAmount)}).`,
    };
  }

  let paymentStatus: PaymentStatus = 'Paid';
  let paidAmount = netAmount;

  if (input.paymentMode === 'Credit/Udhaar') {
    const partial = Number(input.partialPaidAmount ?? 0);
    if (!Number.isFinite(partial) || partial < 0 || partial >= netAmount) {
      if (partial >= netAmount && netAmount > 0) {
        return {
          ok: false,
          error: 'Advance paid equals total bill. Choose Cash, UPI, or Bank Transfer instead.',
        };
      }
      return { ok: false, error: 'Advance paid amount is invalid.' };
    }
    paidAmount = Math.round(partial * 100) / 100;
    paymentStatus = paidAmount > 0 ? 'Partial' : 'Pending';
  }

  const timestamp = now.toISOString();
  const transaction: Transaction = {
    id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'stock_out',
    productId: product.id,
    productName: product.name,
    category: product.category,
    unit: product.unit,
    quantity: input.quantity,
    unitRate,
    discount: Math.round(input.discount * 100) / 100,
    totalAmount: netAmount,
    paidAmount,
    partyName: buyerName,
    partyPhone: input.buyerPhone.trim(),
    customerType: input.customerType,
    paymentMode: input.paymentMode,
    paymentStatus,
    date: input.date || getTodayISODate(now),
    createdAt: timestamp,
    notes: input.notes?.trim() || undefined,
  };

  const nextProducts = state.products.map((p) =>
    p.id === product.id
      ? {
          ...p,
          stock: Math.round((p.stock - input.quantity) * 100) / 100,
          updatedAt: timestamp,
        }
      : p,
  );

  return {
    ok: true,
    transaction,
    state: {
      ...state,
      products: nextProducts,
      transactions: [transaction, ...state.transactions],
    },
  };
}

export function recordTransactionSettlement(
  state: ShopState,
  transactionId: string,
  paymentAmount: number,
  paymentMode?: PaymentMode,
): { ok: true; state: ShopState } | { ok: false; error: string } {
  const target = state.transactions.find((t) => t.id === transactionId);
  if (!target) {
    return { ok: false, error: 'Transaction not found.' };
  }
  const remaining = Math.max(0, Math.round((target.totalAmount - target.paidAmount) * 100) / 100);
  if (remaining <= 0) {
    return { ok: false, error: 'This transaction is already fully paid.' };
  }
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return { ok: false, error: 'Settlement amount must be greater than zero.' };
  }
  if (paymentAmount > remaining + 0.01) {
    return {
      ok: false,
      error: `Payment exceeds pending balance (${formatINR(remaining)}).`,
    };
  }

  const nextPaid = Math.min(
    target.totalAmount,
    Math.round((target.paidAmount + paymentAmount) * 100) / 100,
  );
  const nextStatus: PaymentStatus =
    nextPaid >= target.totalAmount - 0.01 ? 'Paid' : 'Partial';

  return {
    ok: true,
    state: {
      ...state,
      transactions: state.transactions.map((t) =>
        t.id === transactionId
          ? {
              ...t,
              paidAmount: nextStatus === 'Paid' ? t.totalAmount : nextPaid,
              paymentStatus: nextStatus,
              paymentMode: paymentMode ?? t.paymentMode,
            }
          : t,
      ),
    },
  };
}

export function upsertProduct(
  state: ShopState,
  input: ProductInput,
  now = new Date(),
): { ok: true; state: ShopState; product: Product } | { ok: false; error: string } {
  const name = input.name.trim();
  const category = input.category.trim();
  if (!name) {
    return { ok: false, error: 'Product name is required.' };
  }
  if (!category) {
    return { ok: false, error: 'Category is required.' };
  }
  if (
    input.purchaseRate < 0 ||
    input.retailRate < 0 ||
    input.wholesaleRate < 0 ||
    input.stock < 0 ||
    input.minStockAlert < 0
  ) {
    return { ok: false, error: 'Rates and stock values cannot be negative.' };
  }

  const timestamp = now.toISOString();
  const existing = input.id ? state.products.find((p) => p.id === input.id) : undefined;

  const product: Product = {
    id: existing?.id ?? `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    category,
    unit: input.unit,
    purchaseRate: Math.round(input.purchaseRate * 100) / 100,
    retailRate: Math.round(input.retailRate * 100) / 100,
    wholesaleRate: Math.round(input.wholesaleRate * 100) / 100,
    stock: Math.round(input.stock * 100) / 100,
    minStockAlert: Math.round(input.minStockAlert * 100) / 100,
    updatedAt: timestamp,
  };

  const categories = state.categories.some(
    (c) => c.toLowerCase() === category.toLowerCase(),
  )
    ? state.categories
    : [...state.categories, category];

  const products = existing
    ? state.products.map((p) => (p.id === existing.id ? product : p))
    : [product, ...state.products];

  return {
    ok: true,
    product,
    state: {
      ...state,
      categories,
      products,
    },
  };
}

export function addCustomCategory(
  state: ShopState,
  categoryName: string,
): { ok: true; state: ShopState; category: string } | { ok: false; error: string } {
  const clean = categoryName.trim();
  if (!clean) {
    return { ok: false, error: 'Category name cannot be empty.' };
  }
  if (state.categories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
    return { ok: false, error: `"${clean}" category already exists.` };
  }
  return {
    ok: true,
    category: clean,
    state: {
      ...state,
      categories: [...state.categories, clean],
    },
  };
}

export function addExpenseEntry(
  state: ShopState,
  input: Omit<ExpenseEntry, 'id' | 'createdAt'>,
  now = new Date(),
): { ok: true; state: ShopState; expense: ExpenseEntry } | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) {
    return { ok: false, error: 'Expense description is required.' };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: 'Expense amount must be greater than zero.' };
  }
  const expense: ExpenseEntry = {
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    category: input.category.trim() || 'Showroom Expense',
    amount: Math.round(input.amount * 100) / 100,
    paymentMode: input.paymentMode,
    date: input.date || getTodayISODate(now),
    createdAt: now.toISOString(),
    notes: input.notes?.trim() || undefined,
  };
  return {
    ok: true,
    expense,
    state: {
      ...state,
      expenses: [expense, ...state.expenses],
    },
  };
}

export function addShopReminder(
  state: ShopState,
  title: string,
  dueDate: string,
  notes?: string,
  now = new Date(),
): { ok: true; state: ShopState } | { ok: false; error: string } {
  const clean = title.trim();
  if (!clean) {
    return { ok: false, error: 'Reminder title is required.' };
  }
  const reminder: ShopReminder = {
    id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: clean,
    notes: notes?.trim() || undefined,
    dueDate: dueDate || getTodayISODate(now),
    completed: false,
    createdAt: now.toISOString(),
  };
  return {
    ok: true,
    state: {
      ...state,
      reminders: [reminder, ...state.reminders],
    },
  };
}

export type TransactionFeedFilter = 'all' | 'stock_in' | 'stock_out' | 'pending_dues';

export function filterTransactions(
  transactions: Transaction[],
  query: string,
  filter: TransactionFeedFilter,
): Transaction[] {
  const q = query.trim().toLowerCase();
  return transactions.filter((txn) => {
    if (filter === 'stock_in' && txn.type !== 'stock_in') return false;
    if (filter === 'stock_out' && txn.type !== 'stock_out') return false;
    if (
      filter === 'pending_dues' &&
      (txn.paymentStatus === 'Paid' || txn.totalAmount - txn.paidAmount <= 0)
    ) {
      return false;
    }

    if (!q) return true;
    return (
      txn.productName.toLowerCase().includes(q) ||
      txn.partyName.toLowerCase().includes(q) ||
      txn.category.toLowerCase().includes(q) ||
      txn.partyPhone.toLowerCase().includes(q) ||
      txn.paymentStatus.toLowerCase().includes(q)
    );
  });
}

export interface DailyRevenuePoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "24 Nov"
  revenue: number;
  orders: number;
}

export interface CategorySalesPoint {
  category: string;
  revenue: number;
  orders: number;
  sharePercent: number;
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatShortDayLabel(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const mon = MONTH_SHORT[date.getMonth()] ?? '';
  return `${day} ${mon}`;
}

export function computeDailyRevenueLast30Days(
  transactions: Transaction[],
  referenceDate = new Date(),
): DailyRevenuePoint[] {
  const end = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const buckets = new Map<string, DailyRevenuePoint>();
  const orderedDates: string[] = [];

  for (let offset = 29; offset >= 0; offset -= 1) {
    const d = new Date(end);
    d.setDate(end.getDate() - offset);
    const iso = getTodayISODate(d);
    orderedDates.push(iso);
    buckets.set(iso, {
      date: iso,
      label: formatShortDayLabel(d),
      revenue: 0,
      orders: 0,
    });
  }

  for (const txn of transactions) {
    if (txn.type !== 'stock_out') continue;
    const bucket = buckets.get(txn.date);
    if (!bucket) continue;
    bucket.revenue = Math.round((bucket.revenue + txn.totalAmount) * 100) / 100;
    bucket.orders += 1;
  }

  return orderedDates.map((iso) => buckets.get(iso)!);
}

export function computeCategorySalesLast30Days(
  transactions: Transaction[],
  referenceDate = new Date(),
): CategorySalesPoint[] {
  const end = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const start = new Date(end);
  start.setDate(end.getDate() - 29);
  const startISO = getTodayISODate(start);
  const endISO = getTodayISODate(end);

  const totals = new Map<string, { revenue: number; orders: number }>();
  let grandTotal = 0;

  for (const txn of transactions) {
    if (txn.type !== 'stock_out') continue;
    if (txn.date < startISO || txn.date > endISO) continue;
    const current = totals.get(txn.category) ?? { revenue: 0, orders: 0 };
    current.revenue = Math.round((current.revenue + txn.totalAmount) * 100) / 100;
    current.orders += 1;
    totals.set(txn.category, current);
    grandTotal += txn.totalAmount;
  }

  return Array.from(totals.entries())
    .map(([category, info]) => ({
      category,
      revenue: info.revenue,
      orders: info.orders,
      sharePercent:
        grandTotal > 0 ? Math.round((info.revenue / grandTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

