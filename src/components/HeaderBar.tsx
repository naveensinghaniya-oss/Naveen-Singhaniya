import { Plus } from 'lucide-react';
import type { ActiveTab } from '../types/shop';
import { ShopLogoSlot } from './ShopLogoSlot';

interface HeaderBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onQuickStockAction: () => void;
  customLogoDataUrl: string | null;
  alertCount: number;
}

const NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'stock', label: 'Stock In/Out' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'payments', label: 'Money & Payments' },
  { id: 'reminders', label: 'Reminders' },
];

export function HeaderBar({
  activeTab,
  onSelectTab,
  onQuickStockAction,
  customLogoDataUrl,
  alertCount,
}: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-30 h-[52px] md:h-16 bg-[#0B192C] text-white border-b border-[#C59B27]/35">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4 md:gap-8">
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 text-left shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B27] rounded-lg"
        >
          <ShopLogoSlot customLogoDataUrl={customLogoDataUrl} size="sm" />
          <span className="font-display font-bold tracking-wide text-base sm:text-lg text-white whitespace-nowrap shrink-0">
            HOME DECOR
          </span>
        </button>

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B27] rounded ${
                  isActive ? 'text-[#E8C872]' : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {item.id === 'reminders' && alertCount > 0 && (
                  <span className="ml-1.5 font-mono text-xs text-[#E8C872]">({alertCount})</span>
                )}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-[#C59B27]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onQuickStockAction}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] md:min-h-[40px] rounded-lg bg-[#C59B27] hover:bg-[#D4AA34] active:scale-[0.98] text-[#0B192C] text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Stock Entry</span>
          </button>
        </div>
      </div>
    </header>
  );
}
