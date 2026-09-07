import type { ReactNode } from 'react'

export type SegmentedOption<T extends string = string> = {
  id: T
  label: ReactNode
  disabled?: boolean
}

type SegmentedProps<T extends string = string> = {
  options: readonly SegmentedOption<T>[] | SegmentedOption<T>[]
  value: T
  onChange: (id: T) => void
  /** Accessible name for the group */
  'aria-label'?: string
  className?: string
  /** Full-width equal segments (default true) */
  equal?: boolean
}

/**
 * Unified tab / scope control — same chrome as `.segmented` / `.segmented-btn`.
 * Use for Stats scope, Stats sections, Leaderboard Local|Online, etc.
 */
export default function Segmented<T extends string = string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  className = '',
  equal = true,
}: SegmentedProps<T>) {
  return (
    <div
      className={`segmented${equal ? '' : ' segmented--auto'} ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map(opt => {
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={opt.disabled}
            className={`segmented-btn${active ? ' is-active' : ''}`}
            onClick={() => {
              if (!opt.disabled && opt.id !== value) onChange(opt.id)
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
