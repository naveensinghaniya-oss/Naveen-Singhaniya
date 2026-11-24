export type UnitType = 'pcs' | 'sets' | 'boxes' | 'sq. ft.';

export type PaymentStatus = 'Paid' | 'Partial' | 'Pending';

export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Credit/Udhaar';

export type CustomerType = 'Retail Customer' | 'Small Seller / Contractor';

export type TransactionType = 'stock_in' | 'stock_out';

export type ActiveTab = 'home' | 'stock' | 'inventory' | 'payments' | 'reminders';

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: UnitType;
  purchaseRate: number;
  retailRate: number;
  wholesaleRate: number;
  stock: number;
  minStockAlert: number;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  productId: string;
  productName: string;
  category: string;
  unit: UnitType;
  quantity: number;
  unitRate: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  partyName: string;
  partyPhone: string;
  customerType?: CustomerType;
  paymentMode?: PaymentMode;
  paymentStatus: PaymentStatus;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO timestamp
  notes?: string;
}

export interface ExpenseEntry {
  id: string;
  title: string;
  category: string;
  amount: number;
  paymentMode: Exclude<PaymentMode, 'Credit/Udhaar'>;
  date: string; // YYYY-MM-DD
  createdAt: string;
  notes?: string;
}

export interface ShopReminder {
  id: string;
  title: string;
  notes?: string;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  createdAt: string;
}

export interface ShopState {
  products: Product[];
  categories: string[];
  transactions: Transaction[];
  expenses: ExpenseEntry[];
  reminders: ShopReminder[];
  customLogoDataUrl: string | null;
}

export interface StockInInput {
  productId: string;
  quantity: number;
  supplierName: string;
  supplierPhone: string;
  totalBillAmount: number;
  paymentStatus: PaymentStatus;
  paidAmount?: number;
  date: string;
  notes?: string;
}

export interface StockOutInput {
  productId: string;
  customerType: CustomerType;
  buyerName: string;
  buyerPhone: string;
  quantity: number;
  discount: number;
  paymentMode: PaymentMode;
  partialPaidAmount?: number;
  date: string;
  notes?: string;
}

export interface ProductInput {
  id?: string;
  name: string;
  category: string;
  unit: UnitType;
  purchaseRate: number;
  retailRate: number;
  wholesaleRate: number;
  stock: number;
  minStockAlert: number;
}
