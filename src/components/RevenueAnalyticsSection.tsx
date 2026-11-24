import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import type { Transaction } from '../types/shop';
import {
  computeCategorySalesLast30Days,
  computeDailyRevenueLast30Days,
  formatINR,
} from '../utils/shopLogic';

interface RevenueAnalyticsSectionProps {
  transactions: Transaction[];
}

const CATEGORY_COLORS = [
  '#0B192C', // Deep Navy
  '#C59B27', // Warm Gold
  '#1D4E89', // Architectural Steel Blue
  '#15803D', // Emerald
  '#9A6B16', // Burnished Bronze
  '#64748B', // Cool Slate
];

function formatCompactINR(value: number): string {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  }
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(0)}k`;
  }
  return `₹${value}`;
}

export function RevenueAnalyticsSection({ transactions }: RevenueAnalyticsSectionProps) {
  const dailyRevenue = useMemo(
    () => computeDailyRevenueLast30Days(transactions),
    [transactions],
  );
  const categorySales = useMemo(
    () => computeCategorySalesLast30Days(transactions),
    [transactions],
  );

  const total30DayRevenue = useMemo(
    () => dailyRevenue.reduce((sum, d) => sum + d.revenue, 0),
    [dailyRevenue],
  );
  const activeSalesDays = useMemo(
    () => dailyRevenue.filter((d) => d.revenue > 0).length,
    [dailyRevenue],
  );

  return (
    <section
      aria-label="30-day revenue and category analytics"
      className="space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0B192C]">
            Sales Analytics (Last 30 Days)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            Total billed sales: <span className="font-mono font-semibold text-[#0B192C]">{formatINR(total30DayRevenue)}</span> · {activeSalesDays} active selling days · {categorySales.length} categories
          </p>
        </div>
      </div>

      {total30DayRevenue <= 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <p className="text-sm font-semibold text-[#0B192C]">No sales recorded in the last 30 days</p>
          <p className="text-xs text-slate-500 mt-1">
            Record a Stock Out sale to visualize daily revenue and top-selling categories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Bar Chart: Daily Revenue (Last 30 Days) */}
          <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 flex flex-col">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#0B192C]" />
                <h3 className="font-display text-sm font-bold text-[#0B192C]">
                  Daily Revenue (Last 30 Days)
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                Billed INR (₹)
              </span>
            </div>

            <div className="mt-4 h-[250px] w-full min-w-0" data-testid="daily-revenue-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dailyRevenue}
                  margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={4}
                  />
                  <YAxis
                    tickFormatter={formatCompactINR}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                  />
                  <Tooltip
                    cursor={{ fill: '#F1F5F9' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as {
                        label: string;
                        revenue: number;
                        orders: number;
                      };
                      return (
                        <div className="rounded-xl bg-[#0B192C] text-white px-3 py-2 text-xs shadow-lg border border-[#C59B27]/40">
                          <div className="font-semibold text-[#E5C773]">{item.label}</div>
                          <div className="mt-0.5 font-mono font-bold tabular-nums">
                            {formatINR(item.revenue)}
                          </div>
                          <div className="text-[11px] text-slate-300 tabular-nums">
                            {item.orders} {item.orders === 1 ? 'order' : 'orders'}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Daily Revenue"
                    fill="#0B192C"
                    activeBar={{ fill: '#C59B27' }}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Top-Selling Categories (Last 30 Days) */}
          <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-[#B8860B]" />
                <h3 className="font-display text-sm font-bold text-[#0B192C]">
                  Top-Selling Categories (30d)
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                By Revenue
              </span>
            </div>

            <div className="mt-2 h-[200px] w-full min-w-0" data-testid="category-sales-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySales}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {categorySales.map((entry, idx) => (
                      <Cell
                        key={entry.category}
                        fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as {
                        category: string;
                        revenue: number;
                        sharePercent: number;
                      };
                      return (
                        <div className="rounded-xl bg-[#0B192C] text-white px-3 py-2 text-xs shadow-lg border border-[#C59B27]/40">
                          <div className="font-semibold text-[#E5C773]">{item.category}</div>
                          <div className="mt-0.5 font-mono font-bold tabular-nums">
                            {formatINR(item.revenue)} ({item.sharePercent}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="mt-2 pt-3 border-t border-slate-100 space-y-2">
              {categorySales.map((cat, idx) => (
                <li
                  key={cat.category}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      aria-hidden="true"
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{
                        backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                      }}
                    />
                    <span className="font-medium text-[#0B192C] truncate">
                      {cat.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 font-mono tabular-nums shrink-0">
                    <span className="text-slate-500">{cat.sharePercent}%</span>
                    <span className="font-semibold text-[#0B192C]">
                      {formatINR(cat.revenue)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
