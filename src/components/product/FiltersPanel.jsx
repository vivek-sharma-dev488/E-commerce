import { FILTER_OPTIONS, SORT_OPTIONS } from '../../lib/constants'
import { Card } from '../common/Card'

export function FiltersPanel({
  filters,
  brands,
  onSetFilter,
  onToggleArrayFilter,
  onReset,
}) {
  return (
    <Card className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Filters</h3>
        <button
          className="text-xs font-semibold uppercase tracking-wider text-brand-600"
          onClick={onReset}
          type="button"
        >
          Reset
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Sort by
        </label>
        <select
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          onChange={(event) => onSetFilter('sortBy', event.target.value)}
          value={filters.sortBy}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Price Range
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            min={0}
            onChange={(event) =>
              onSetFilter('priceRange', [Number(event.target.value || 0), filters.priceRange[1]])
            }
            type="number"
            value={filters.priceRange[0]}
          />
          <input
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            min={0}
            onChange={(event) =>
              onSetFilter('priceRange', [filters.priceRange[0], Number(event.target.value || 0)])
            }
            type="number"
            value={filters.priceRange[1]}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Brand</p>
        <div className="space-y-2">
          {brands.map((brand) => (
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300" key={brand}>
              <input
                checked={filters.brand.includes(brand)}
                onChange={() => onToggleArrayFilter('brand', brand)}
                type="checkbox"
              />
              {brand}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Size</p>
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.sizes.map((size) => (
            <button
              className={`rounded-lg border px-2.5 py-1 text-xs ${
                filters.size.includes(size)
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
              }`}
              key={size}
              onClick={() => onToggleArrayFilter('size', size)}
              type="button"
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Color</p>
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.colors.map((color) => (
            <button
              className={`rounded-full border px-3 py-1 text-xs ${
                filters.color.includes(color)
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
              }`}
              key={color}
              onClick={() => onToggleArrayFilter('color', color)}
              type="button"
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Availability
        </p>
        <select
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          onChange={(event) => onSetFilter('availability', event.target.value)}
          value={filters.availability}
        >
          <option value="">All</option>
          <option value="in_stock">In stock</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Rating</p>
        <select
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          onChange={(event) => onSetFilter('minRating', Number(event.target.value))}
          value={filters.minRating}
        >
          <option value={0}>All ratings</option>
          {FILTER_OPTIONS.ratings.map((rating) => (
            <option key={rating} value={rating}>
              {rating} stars & above
            </option>
          ))}
        </select>
      </div>
    </Card>
  )
}
