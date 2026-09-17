import PlayingCard from '../PlayingCard'
import type { Card } from '../../types'
import type { RoundState } from '../../game/round'
import { COMBO_LABEL, countTrailingThrees } from '../../game/combo'
import { SEAT_NAMES } from '../../game/GameContext'

interface RoundEndRevealOverlayProps {
  outcome: Extract<NonNullable<RoundState['outcome']>, { kind: 'normal' }>
  hands: Card[][]
  playLog: Card[][]
  onContinue: () => void
  /** Noms affiches par index de vue (0-3). Defaut = SEAT_NAMES solo. */
  seatNames?: string[]
}

function isVacantSeatName(name: string): boolean {
  return name === '-' || name === '—' || name.trim() === ''
}

export function RoundEndRevealOverlay({
  outcome,
  hands,
  playLog,
  onContinue,
  seatNames = SEAT_NAMES,
}: RoundEndRevealOverlayProps) {
  const winnerIndex = outcome.roundWinnerIndex
  const names = seatNames.length >= 4 ? seatNames : SEAT_NAMES
  const comboLabel = COMBO_LABEL[outcome.combo]
  const payoutLines = [...outcome.payout.winners, ...outcome.payout.losers]
    .sort((a, b) => a.playerIndex - b.playerIndex)
    .filter(p => !isVacantSeatName(names[p.playerIndex] ?? ''))

  const winnerSequence = playLog[winnerIndex] ?? []
  const trailingCount = countTrailingThrees(winnerSequence)

  const winnerCause = outcome.wonByClaim
    ? `Victoire reclamee · ${comboLabel}`
    : `Combo ${comboLabel}`

  function isEmptySeat(i: number): boolean {
    if (i === winnerIndex) return false
    if (outcome.bankedPlayerIndexes.includes(i)) return false
    const played = playLog[i] ?? []
    const remaining = hands[i] ?? []
    if (played.length > 0 || remaining.length > 0) return false
    return isVacantSeatName(names[i] ?? '')
  }

  const amountBySeat = new Map(payoutLines.map(p => [p.playerIndex, p.amount]))

  return (
    <div className="reveal-overlay">
      <div className="reveal-rays reveal-rays--gold" aria-hidden />

      <div className="anim-fade-in reveal-hands reveal-hands--wide reveal-hands--unified">
        <p className="reveal-kicker reveal-kicker--center" style={{ marginBottom: 6 }}>
          FIN DE MANCHE
        </p>
        <p className="text-gold font-display reveal-hands-winner">
          {names[winnerIndex]} — {comboLabel}
          {outcome.wonByClaim ? ' ·' : ''}
        </p>

        <div className="reveal-hands-list">
          {names.map((name, i) => {
            if (isEmptySeat(i)) return null

            const isWinner = i === winnerIndex
            const isBanked = outcome.bankedPlayerIndexes.includes(i)
            const played = playLog[i] ?? []
            const remaining = hands[i] ?? []
            const lineCards: { card: Card; fromHand: boolean; index: number }[] = [
              ...played.map((card, index) => ({ card, fromHand: false, index })),
              ...remaining.map((card, index) => ({ card, fromHand: true, index })),
            ]
            const amount = amountBySeat.get(i)

            const visibleIndex = names.slice(0, i).filter((_, j) => !isEmptySeat(j)).length

            return (
              <div
                key={name + '-' + i}
                className={`anim-fade-in-up reveal-hand-row${isWinner ? ' is-winner-gold' : ''}`}
                style={{ animationDelay: `${visibleIndex * 0.06}s` }}
              >
                <div
                  className="reveal-line-head"
                  style={{ marginBottom: lineCards.length > 0 || isWinner || amount != null ? 8 : 0 }}
                >
                  <span
                    className={`font-display reveal-hand-name${isWinner ? ' is-gold' : ''}`}
                    style={
                      !isWinner
                        ? { color: '#fff', fontWeight: 600, width: 'auto', fontSize: 13 }
                        : undefined
                    }
                  >
                    {name}
                  </span>
                  {isBanked && <span className="reveal-bank-icon">Banque</span>}
                  {isWinner && (
                    <span className={`reveal-cause${outcome.wonByClaim ? ' is-claim' : ''}`}>
                      {winnerCause}
                    </span>
                  )}
                  {amount != null && (
                    <span
                      className={`font-display reveal-row-amt ${amount > 0 ? 'is-gain' : 'is-loss'}`}
                    >
                      {amount > 0 ? '+' : ''}
                      {amount.toLocaleString('fr-FR')}
                    </span>
                  )}
                </div>

                {lineCards.length > 0 ? (
                  <div className="reveal-line-cards">
                    {played.length > 0 && remaining.length > 0 && (
                      <span className="reveal-seg-label">TAPIS</span>
                    )}
                    {played.map((card, ci) => {
                      const isTrailing =
                        isWinner && trailingCount > 0 && ci >= played.length - trailingCount
                      return (
                        <PlayingCard
                          key={`p-${ci}`}
                          suit={card.suit}
                          value={card.value}
                          state={isTrailing ? 'winner' : 'default'}
                          size="sm"
                        />
                      )
                    })}
                    {played.length > 0 && remaining.length > 0 && (
                      <span className="reveal-seg-sep" />
                    )}
                    {remaining.length > 0 && played.length > 0 && (
                      <span className="reveal-seg-label">MAIN</span>
                    )}
                    {remaining.map((card, ci) => (
                      <PlayingCard
                        key={`h-${ci}`}
                        suit={card.suit}
                        value={card.value}
                        state="default"
                        size="sm"
                      />
                    ))}
                  </div>
                ) : (
                  <span className="reveal-empty">Aucune carte</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="reveal-payout reveal-payout--inline">
          <p className="reveal-payout-title text-gold font-display" style={{ fontSize: 14, marginBottom: 8 }}>
            Bilan de la manche
          </p>
          <div className="reveal-payout-list">
            {payoutLines.map((p, i) => (
              <div
                key={p.playerIndex}
                className={`reveal-payout-row${i < payoutLines.length - 1 ? ' has-border' : ''}`}
              >
                <span className="reveal-payout-name">
                  {names[p.playerIndex] ?? `Joueur ${p.playerIndex + 1}`}
                  {outcome.bankedPlayerIndexes.includes(p.playerIndex) ? ' (banque)' : ''}
                </span>
                <span
                  className={`font-display reveal-payout-amt ${p.amount > 0 ? 'is-gain' : 'is-loss'}`}
                >
                  {p.amount > 0 ? '+' : ''}
                  {p.amount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          className="btn-primary glow-gold reveal-cta"
          onClick={onContinue}
          style={{ width: '100%' }}
        >
          CONTINUER
        </button>
      </div>
    </div>
  )
}
