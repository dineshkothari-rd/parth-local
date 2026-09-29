interface StatusBadgeProps {
  type: 'availability' | 'freshness' | 'store-status'
  value: string
  subtext?: string
}

export function StatusBadge({ type, value, subtext }: StatusBadgeProps) {
  if (type === 'availability') {
    switch (value) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/20">
            <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
            In Stock
          </span>
        )
      case 'LOW_STOCK':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-600/20">
            <span className="size-1.5 rounded-full bg-amber-600" aria-hidden="true" />
            Low Stock
          </span>
        )
      case 'OUT_OF_STOCK':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 ring-1 ring-rose-600/20">
            <span className="size-1.5 rounded-full bg-rose-600" aria-hidden="true" />
            Out of Stock
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 ring-1 ring-stone-400/20">
            <span className="size-1.5 rounded-full bg-stone-500" aria-hidden="true" />
            Stock Unknown
          </span>
        )
    }
  }

  if (type === 'freshness') {
    switch (value) {
      case 'FRESH':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/20" title="Stock confirmed in the last few hours">
            ⚡ Verified Today
          </span>
        )
      case 'RECENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-sky-600/20" title="Stock confirmed in the last 24-48 hours">
            ✓ Recently Confirmed
          </span>
        )
      case 'POSSIBLY_STALE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 ring-1 ring-stone-400/20" title="Updated more than 48 hours ago">
            ⏳ Unverified
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500 ring-1 ring-stone-400/20">
            {value.replaceAll('_', ' ')}
          </span>
        )
    }
  }

  if (type === 'store-status') {
    const isClosingSoon = value.toLowerCase().includes('closing soon')
    const isClosed = value.toLowerCase().includes('closed')

    if (isClosed) {
      return (
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-600/20">
            <span className="size-2 rounded-full bg-rose-600" aria-hidden="true" />
            {value}
          </span>
          {subtext && <span className="text-xs text-stone-500">{subtext}</span>}
        </div>
      )
    }

    if (isClosingSoon) {
      return (
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-600/20">
            <span className="size-2 rounded-full bg-amber-600" aria-hidden="true" />
            {value}
          </span>
          {subtext && <span className="text-xs font-medium text-amber-900">{subtext}</span>}
        </div>
      )
    }

    return (
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-600/20">
          <span className="size-2 rounded-full bg-emerald-600" aria-hidden="true" />
          {value}
        </span>
        {subtext && <span className="text-xs text-stone-500">{subtext}</span>}
      </div>
    )
  }

  return null
}
