import {
  Home,
  ArrowLeftRight,
  Package,
  IndianRupee,
  Bell,
} from 'lucide-react';
import type { ActiveTab } from '../types/shop';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  alertCount: number;
}

export function BottomNav({ activeTab, onSelectTab, alertCount }: BottomNavProps) {
  const tabs: {
    id: ActiveTab;
    shortLabel: string;
    ariaLabel: string;
    icon: typeof Home;
  }[] = [
    { id: 'home', shortLabel: 'Home', ariaLabel: 'Home', icon: Home },
    { id: 'stock', shortLabel: 'Stock In/Out', ariaLabel: 'Stock In/Out', icon: ArrowLeftRight },
    { id: 'inventory', shortLabel: 'Inventory', ariaLabel: 'Inventory', icon: Package },
    { id: 'payments', shortLabel: 'Payments', ariaLabel: 'Money & Payments', icon: IndianRupee },
    { id: 'reminders', shortLabel: 'Reminders', ariaLabel: 'Reminders', icon: Bell },
  ];

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[60px] bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
    >
      <div className="grid grid-cols-5 h-full max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-label={tab.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center min-h-[44px] px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0B192C] ${
                isActive ? 'text-[#0B192C]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 inset-x-3 h-0.5 bg-[#B8860B] rounded-b"
                />
              )}
              <div className="relative h-5 flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-[#0B192C] stroke-[2.25]' : 'text-slate-500 stroke-[1.75]'
                  }`}
                />
                {tab.id === 'reminders' && alertCount > 0 && (
                  <span className="absolute -top-1 -right-3 font-mono text-[10px] leading-none font-bold text-[#B91C1C]">
                    {alertCount}
                  </span>
                )}
              </div>
              <span
                className={`mt-1 text-[10px] leading-none whitespace-nowrap tracking-tight ${
                  isActive ? 'font-bold text-[#0B192C]' : 'font-medium text-slate-600'
                }`}
              >
                {tab.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
