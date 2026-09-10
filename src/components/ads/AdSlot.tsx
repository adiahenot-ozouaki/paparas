import { useEffect, useState } from 'react'
import { AD_PLACEMENTS, type AdPlacementId } from './placements'

interface AdSlotProps {
  placement: AdPlacementId
  className?: string
  hidden?: boolean
}

export default function AdSlot({ placement, className = '', hidden = false }: AdSlotProps) {
  const config = AD_PLACEMENTS[placement]
  const [reducedData, setReducedData] = useState(false)

  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-data: reduce)')
      setReducedData(mq.matches)
      const fn = () => setReducedData(mq.matches)
      mq.addEventListener?.('change', fn)
      return () => mq.removeEventListener?.('change', fn)
    } catch {
      return
    }
  }, [])

  if (hidden || !config) return null
  if (reducedData) return null

  return (
    <aside
      className={`ad-slot ad-slot--${config.size} ${className}`.trim()}
      data-ad-placement={config.id}
      data-ad-size={config.size}
      aria-label="Espace publicitaire"
    >
      <div className="ad-slot-inner">
        <span className="ad-slot-badge">Annonce</span>
        <span className="ad-slot-placeholder">{config.label}</span>
        <span className="ad-slot-hint">Emplacement réservé</span>
      </div>
    </aside>
  )
}
