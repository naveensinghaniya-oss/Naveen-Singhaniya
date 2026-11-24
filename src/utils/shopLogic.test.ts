import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedState } from '../data/seedData';
import {
  addCustomCategory,
  applyStockIn,
  applyStockOut,
  calculateStockOutTotal,
  computeCategorySalesLast30Days,
  computeDailyRevenueLast30Days,
  computeDashboardSummary,
  filterTransactions,
  formatINR,
  getTodayISODate,
  recordTransactionSettlement,
  upsertProduct,
} from './shopLogic';

test('formatINR formats Indian rupee currency accurately', () => {
  assert.equal(formatINR(124500), '₹1,24,500');
  assert.equal(formatINR(0), '₹0');
});

test('applyStockIn increases available stock and records Paid/Partial/Pending purchase', () => {
  const now = new Date('2026-11-24T12:00:00');
  const seed = createSeedState(now);
  const initialBasins = seed.products.find((p) => p.id === 'prod-2')!.stock;

  const result = applyStockIn(
    seed,
    {
      productId: 'prod-2',
      quantity: 10,
      supplierName: 'Kajaria & Cera Depot',
      supplierPhone: '9876543210',
      totalBillAmount: 24500,
      paymentStatus: 'Partial',
      paidAmount: 10000,
      date: getTodayISODate(now),
    },
    now,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    const updatedBasins = result.state.products.find((p) => p.id === 'prod-2')!.stock;
    assert.equal(updatedBasins, initialBasins + 10);
    assert.equal(result.transaction.paidAmount, 10000);
    assert.equal(result.transaction.paymentStatus, 'Partial');
    assert.equal(result.state.transactions[0].id, result.transaction.id);
  }
});

test('calculateStockOutTotal switches cleanly between Retail and Wholesale rates', () => {
  const product = { retailRate: 1450, wholesaleRate: 1260 };

  const retail = calculateStockOutTotal(product, 'Retail Customer', 10, 500);
  assert.equal(retail.unitRate, 1450);
  assert.equal(retail.grossAmount, 14500);
  assert.equal(retail.netAmount, 14000);

  const wholesale = calculateStockOutTotal(product, 'Small Seller / Contractor', 10, 500);
  assert.equal(wholesale.unitRate, 1260);
  assert.equal(wholesale.grossAmount, 12600);
  assert.equal(wholesale.netAmount, 12100);
});

test('applyStockOut deducts stock, prevents overselling, and handles Credit/Udhaar', () => {
  const now = new Date('2026-11-24T12:00:00');
  const seed = createSeedState(now);
  const basin = seed.products.find((p) => p.id === 'prod-2')!; // stock is 4

  // Block overselling
  const oversell = applyStockOut(
    seed,
    {
      productId: 'prod-2',
      customerType: 'Retail Customer',
      buyerName: 'Rohan Sharma',
      buyerPhone: '9988776655',
      quantity: 5,
      discount: 0,
      paymentMode: 'Cash',
      date: getTodayISODate(now),
    },
    now,
  );
  assert.equal(oversell.ok, false);

  // Valid sale on Credit/Udhaar
  const validSale = applyStockOut(
    seed,
    {
      productId: 'prod-2',
      customerType: 'Small Seller / Contractor',
      buyerName: 'Rohan Contractor',
      buyerPhone: '9988776655',
      quantity: 2,
      discount: 100,
      paymentMode: 'Credit/Udhaar',
      date: getTodayISODate(now),
    },
    now,
  );
  assert.equal(validSale.ok, true);
  if (validSale.ok) {
    const updatedStock = validSale.state.products.find((p) => p.id === 'prod-2')!.stock;
    assert.equal(updatedStock, basin.stock - 2);
    assert.equal(validSale.transaction.unitRate, basin.wholesaleRate);
    assert.equal(validSale.transaction.totalAmount, basin.wholesaleRate * 2 - 100);
    assert.equal(validSale.transaction.paymentStatus, 'Pending');
    assert.equal(validSale.transaction.paidAmount, 0);
  }
});

test('recordTransactionSettlement settles Pending -> Partial -> Paid', () => {
  const now = new Date('2026-11-24T12:00:00');
  const seed = createSeedState(now);

  // txn-104 is Pending for 31000
  const step1 = recordTransactionSettlement(seed, 'txn-104', 15000, 'UPI');
  assert.equal(step1.ok, true);
  if (step1.ok) {
    const txn = step1.state.transactions.find((t) => t.id === 'txn-104')!;
    assert.equal(txn.paymentStatus, 'Partial');
    assert.equal(txn.paidAmount, 15000);

    const step2 = recordTransactionSettlement(step1.state, 'txn-104', 16000, 'Bank Transfer');
    assert.equal(step2.ok, true);
    if (step2.ok) {
      const paidTxn = step2.state.transactions.find((t) => t.id === 'txn-104')!;
      assert.equal(paidTxn.paymentStatus, 'Paid');
      assert.equal(paidTxn.paidAmount, 31000);
    }
  }
});

test('computeDashboardSummary and filterTransactions return accurate metrics', () => {
  const now = new Date('2026-11-24T12:00:00');
  const today = getTodayISODate(now);
  const seed = createSeedState(now);
  const summary = computeDashboardSummary(seed, today);

  // Today's sales: txn-101 (22000) + txn-103 (13500) = 35500
  assert.equal(summary.todaysSalesMoneyIn, 35500);
  // Today's money out: txn-102 paid (20000) + exp-1 (1200) = 21200
  assert.equal(summary.todaysPurchasesMoneyOut, 21200);
  // Pending dues: txn-102 (17200) + txn-104 (31000) = 48200
  assert.equal(summary.pendingDuesAmount, 48200);
  assert.equal(summary.pendingDuesCount, 2);
  // Low stock: prod-2 (4 <= 6) and prod-5 (180 <= 200)
  assert.equal(summary.lowStockCount, 2);

  const pendingOnly = filterTransactions(seed.transactions, '', 'pending_dues');
  assert.equal(pendingOnly.length, 2);
  const searchTile = filterTransactions(seed.transactions, 'Kajaria', 'all');
  assert.equal(searchTile.length, 1);
  assert.equal(searchTile[0].id, 'txn-101');
});

test('addCustomCategory and upsertProduct manage catalog cleanly', () => {
  const now = new Date('2026-11-24T12:00:00');
  const seed = createSeedState(now);
  const catRes = addCustomCategory(seed, 'Adhesives & Grout');
  assert.equal(catRes.ok, true);
  if (catRes.ok) {
    assert.ok(catRes.state.categories.includes('Adhesives & Grout'));
    const prodRes = upsertProduct(catRes.state, {
      name: 'Roff Tile Adhesive 20kg',
      category: 'Adhesives & Grout',
      unit: 'boxes',
      purchaseRate: 380,
      retailRate: 520,
      wholesaleRate: 450,
      stock: 25,
      minStockAlert: 10,
    });
    assert.equal(prodRes.ok, true);
    if (prodRes.ok) {
      assert.equal(prodRes.state.products[0].name, 'Roff Tile Adhesive 20kg');
    }
  }
});

test('computeDailyRevenueLast30Days returns 30 ordered days and excludes >30d or stock_in entries', () => {
  const now = new Date('2026-11-24T12:00:00');
  const seed = createSeedState(now);
  const olderTxn = {
    ...seed.transactions[0],
    id: 'txn-old',
    date: '2026-10-01',
    totalAmount: 99999,
  };
  const series = computeDailyRevenueLast30Days([...seed.transactions, olderTxn], now);

  assert.equal(series.length, 30);
  assert.equal(series[29].date, '2026-11-24');
  // Today's billed stock_out: 22000 + 13500 = 35500 (stock_in excluded)
  assert.equal(series[29].revenue, 35500);
  assert.equal(series[29].orders, 2);
  // Yesterday's billed stock_out: 31000
  assert.equal(series[28].revenue, 31000);
  // Sum across 30 days should exclude olderTxn (99999)
  const total30d = series.reduce((sum, p) => sum + p.revenue, 0);
  assert.equal(total30d, 35500 + 31000 + 24800 + 15000 + 12000 + 7000);
});

test('computeCategorySalesLast30Days ranks top-selling categories with accurate shares', () => {
  const now = new Date('2026-11-24T12:00:00');
  const seed = createSeedState(now);
  const categories = computeCategorySalesLast30Days(seed.transactions, now);

  assert.equal(categories.length, 6);
  // Top category: Marbles (31000), Bathroom Fittings (13500 + 12000 = 25500), Sanitary Items (24800), Tiles (22000)
  assert.equal(categories[0].category, 'Marbles');
  assert.equal(categories[0].revenue, 31000);
  assert.equal(categories[1].category, 'Bathroom Fittings');
  assert.equal(categories[1].revenue, 25500);
  const totalShare = categories.reduce((s, c) => s + c.sharePercent, 0);
  assert.ok(totalShare >= 99.5 && totalShare <= 100.5);
});

