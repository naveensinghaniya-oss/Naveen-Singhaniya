import { useMemo, useState, type FormEvent } from 'react';
import {
  Plus,
  Search,
  Pencil,
  ArrowUpRight,
  ArrowDownLeft,
  FolderPlus,
  X,
} from 'lucide-react';
import { UNIT_TYPES } from '../data/seedData';
import type { Product, ProductInput, ShopState, UnitType } from '../types/shop';
import { formatINR, formatQuantity } from '../utils/shopLogic';

interface InventoryViewProps {
  state: ShopState;
  onUpsertProduct: (input: ProductInput) => { ok: true } | { ok: false; error: string };
  onAddCategory: (name: string) => { ok: true; category: string } | { ok: false; error: string };
  onQuickStockIn: (productId: string) => void;
  onQuickStockOut: (productId: string) => void;
}

const EMPTY_FORM: ProductInput = {
  name: '',
  category: 'Sanitary Items',
  unit: 'pcs',
  purchaseRate: 0,
  retailRate: 0,
  wholesaleRate: 0,
  stock: 0,
  minStockAlert: 5,
};

export function InventoryView({
  state,
  onUpsertProduct,
  onAddCategory,
  onQuickStockIn,
  onQuickStockOut,
}: InventoryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCategoryForm, setShowCategoryForm] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<ProductInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.products.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q)
      );
    });
  }, [state.products, selectedCategory, searchQuery]);

  const openAddProduct = () => {
    setFormState({
      ...EMPTY_FORM,
      category:
        selectedCategory !== 'All' ? selectedCategory : state.categories[0] || 'Sanitary Items',
    });
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setFormState({
      id: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      purchaseRate: product.purchaseRate,
      retailRate: product.retailRate,
      wholesaleRate: product.wholesaleRate,
      stock: product.stock,
      minStockAlert: product.minStockAlert,
    });
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleCategorySubmit = (e: FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    const res = onAddCategory(newCategoryName);
    if (!res.ok) {
      setCategoryError(res.error);
      return;
    }
    setSelectedCategory(res.category);
    setNewCategoryName('');
    setShowCategoryForm(false);
  };

  const handleProductSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const res = onUpsertProduct(formState);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setIsProductModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B192C]">
            Product Catalog &amp; Inventory
          </h1>
          <p className="text-sm text-slate-600 mt-0.5 tabular-nums">
            {state.products.length} products across {state.categories.length} categories
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowCategoryForm((prev) => !prev);
              setCategoryError(null);
            }}
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-[#0B192C] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Add Category</span>
          </button>

          <button
            type="button"
            onClick={openAddProduct}
            className="min-h-[44px] px-4 rounded-xl bg-[#0B192C] hover:bg-[#132642] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {showCategoryForm && (
        <form
          onSubmit={handleCategorySubmit}
          className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
        >
          <div className="flex-1">
            <label
              htmlFor="new-category-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              New Custom Category Name
            </label>
            <input
              id="new-category-input"
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Adhesives & Grout, Mirrors, PVC Pipes"
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
            />
            {categoryError && (
              <p className="mt-1 text-xs font-medium text-[#B91C1C]">{categoryError}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-xl bg-[#C59B27] hover:bg-[#D4AA34] text-[#0B192C] text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              Save Category
            </button>
            <button
              type="button"
              onClick={() => setShowCategoryForm(false)}
              className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search & Category Filter */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="inventory-search" className="sr-only">
            Search products
          </label>
          <input
            id="inventory-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name, category, or unit (pcs, boxes, sq. ft.)..."
            className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-slate-200 bg-[#F8F9FB] text-sm text-[#0B192C] placeholder:text-slate-400 focus:outline-none focus:border-[#0B192C] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {['All', ...state.categories].map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0B192C] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <p className="text-sm font-medium text-slate-700">No products found in this view.</p>
          <button
            type="button"
            onClick={openAddProduct}
            className="mt-4 min-h-[44px] px-4 rounded-xl bg-[#0B192C] text-white text-xs font-semibold cursor-pointer"
          >
            Add New Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const isOut = product.stock <= 0;
            const isLow = !isOut && product.stock <= product.minStockAlert;
            const stockStatusLabel = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';
            const stockStatusClass = isOut
              ? 'text-[#B91C1C]'
              : isLow
                ? 'text-[#B45309]'
                : 'text-[#15803D]';

            return (
              <article
                key={product.id}
                className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-slate-500">
                      <span>{product.category}</span>
                      <span aria-hidden="true"> · </span>
                      <span>Unit: {product.unit}</span>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${stockStatusClass}`}>
                      {stockStatusLabel}
                    </span>
                  </div>

                  <h2 className="mt-1.5 font-display text-base font-bold text-[#0B192C] leading-snug">
                    {product.name}
                  </h2>

                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-slate-500">Purchase</div>
                      <div className="mt-0.5 font-mono font-semibold text-slate-800 tabular-nums">
                        {formatINR(product.purchaseRate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Retail</div>
                      <div className="mt-0.5 font-mono font-semibold text-[#0B192C] tabular-nums">
                        {formatINR(product.retailRate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Wholesale</div>
                      <div className="mt-0.5 font-mono font-semibold text-[#B8860B] tabular-nums">
                        {formatINR(product.wholesaleRate)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] text-slate-500">Available / Min Alert</div>
                    <div className="font-mono text-sm font-bold text-[#0B192C] tabular-nums">
                      {formatQuantity(product.stock, product.unit)}{' '}
                      <span className="font-normal text-slate-500 text-xs">
                        / {product.minStockAlert}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditProduct(product)}
                      aria-label={`Edit ${product.name}`}
                      className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg border border-slate-200 hover:border-slate-400 text-slate-700 inline-flex items-center justify-center cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickStockIn(product.id)}
                      aria-label={`Stock in ${product.name}`}
                      className="min-h-[40px] px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0B192C] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>In</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickStockOut(product.id)}
                      aria-label={`Sell ${product.name}`}
                      className="min-h-[40px] px-2.5 rounded-lg bg-[#0B192C] hover:bg-[#132642] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>Sell</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 max-h-[90vh] overflow-y-auto p-5 sm:p-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 id="product-modal-title" className="font-display text-lg font-bold text-[#0B192C]">
                {formState.id ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                aria-label="Close product form"
                className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-[#B91C1C]">
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="prod-name"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Product Name
                </label>
                <input
                  id="prod-name"
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. Somany Matte Floor Tile 2x2 ft"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="prod-category"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Category
                  </label>
                  <select
                    id="prod-category"
                    value={formState.category}
                    onChange={(e) => setFormState((s) => ({ ...s, category: e.target.value }))}
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  >
                    {state.categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="prod-unit"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Unit Type
                  </label>
                  <select
                    id="prod-unit"
                    value={formState.unit}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, unit: e.target.value as UnitType }))
                    }
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  >
                    {UNIT_TYPES.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="prod-purchase-rate"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Purchase Rate (₹)
                  </label>
                  <input
                    id="prod-purchase-rate"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formState.purchaseRate}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, purchaseRate: Number(e.target.value) }))
                    }
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prod-retail-rate"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Retail Selling Rate (₹)
                  </label>
                  <input
                    id="prod-retail-rate"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formState.retailRate}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, retailRate: Number(e.target.value) }))
                    }
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prod-wholesale-rate"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Wholesale / Small-Seller Rate (₹)
                  </label>
                  <input
                    id="prod-wholesale-rate"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formState.wholesaleRate}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, wholesaleRate: Number(e.target.value) }))
                    }
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prod-stock"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    {formState.id ? 'Current Stock' : 'Opening Stock'} ({formState.unit})
                  </label>
                  <input
                    id="prod-stock"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formState.stock}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, stock: Number(e.target.value) }))
                    }
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="prod-min-alert"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Minimum Stock Alert Level ({formState.unit})
                  </label>
                  <input
                    id="prod-min-alert"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formState.minStockAlert}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, minStockAlert: Number(e.target.value) }))
                    }
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 rounded-xl bg-[#0B192C] hover:bg-[#132642] text-white text-sm font-semibold cursor-pointer"
                >
                  {formState.id ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
