import { createSeedState } from '../data/seedData';
import type { ShopState } from '../types/shop';

const STORAGE_KEY = 'home_decor_shop_state_v1';

export function loadShopState(): ShopState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedState();
      saveShopState(seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as Partial<ShopState>;
    if (
      !parsed ||
      !Array.isArray(parsed.products) ||
      !Array.isArray(parsed.categories) ||
      !Array.isArray(parsed.transactions)
    ) {
      const seed = createSeedState();
      saveShopState(seed);
      return seed;
    }
    return {
      products: parsed.products,
      categories: parsed.categories,
      transactions: parsed.transactions,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
      customLogoDataUrl:
        typeof parsed.customLogoDataUrl === 'string' ? parsed.customLogoDataUrl : null,
    };
  } catch {
    return createSeedState();
  }
}

export function saveShopState(state: ShopState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage quota or restricted browser context
  }
}

export function resetShopStateToSeed(): ShopState {
  const seed = createSeedState();
  saveShopState(seed);
  return seed;
}
