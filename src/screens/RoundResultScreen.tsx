import PlayingCard from '../components/PlayingCard'
import type { Screen } from '../types'
import { useGame, SEAT_NAMES, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { COMBO_LABEL, countTrailingThrees } from '../game/combo'
import { UiButton } from '../components/ui'

export default function RoundResultScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { players, roundState, roundNumber, startNextRound, checkGameOverNow, recordGameResult } = useGame()
  const outcome = roundState.outcome

  function handleContinue() {
    const result = checkGameOverNow()
    if (result.isOver && result.winnerIndex !== undefined) {
      recordGameResult(result.winnerIndex === HUMAN_INDEX)
      onNavigate(result.winnerIndex === HUMAN_INDEX ? 'victory' : 'defeat')
      return
    }
    startNextRound()
    onNavigate('gameTable')
  }

  if (!outcome) {
    return (
      <div className="end-screen end-screen--empty">
        <UiButton onClick={() => onNavigate('gameTable')}>Retour à la table</UiButton>
      </div>
    )
  }

  const winnerIndexes = outcome.kind === 'normal' ? [outcome.roundWinnerIndex] : outcome.winners.map(w => w.playerIndex)
  const multiplier = outcome.multiplier
  const comboLabel = outcome.kind === 'normal' ? COMBO_LABEL[outcome.combo] : 'RÈGLE SPÉCIALE'
  const wonByClaim = outcome.kind === 'normal' && outcome.wonByClaim
  const bankedPlayerIndexes = outcome.kind === 'normal' ? outcome.bankedPlayerIndexes : []

  const payoutLines = [...outcome.payout.winners, ...outcome.payout.losers].sort((a, b) => a.playerIndex - b.playerIndex)
  const humanLine = payoutLines.find(p => p.playerIndex === HUMAN_INDEX)
  const humanDelta = humanLine?.amount ?? 0
  const previousCapital = players[HUMAN_INDEX].capital - humanDelta

  const heroAmount = winnerIndexes.includes(HUMAN_INDEX)
    ? (outcome.payout.winners.find(w => w.playerIndex === HUMAN_INDEX)?.amount ?? 0)
    : (outcome.payout.winners[0]?.amount ?? 0)

  const winnerSequence = outcome.kind === 'normal' ? roundState.playLog[outcome.roundWinnerIndex] : []
  const trailingCount = outcome.kind === 'normal' ? countTrailingThrees(winnerSequence) : 0
  const trailingCards = trailingCount > 0 ? winnerSequence.slice(winnerSequence.length - trailingCount) : []

  return (
    <div className="end-screen end-screen--round">
      <div className="pattern-african end-screen-pattern" aria-hidden />

      <div className="anim-fade-in-down end-round-pill">
        <span>ROUND {roundNumber} TERMINÉ</span>
      </div>

      <div className="anim-scale-bounce end-round-hero">
        <div className="end-round-rays" aria-hidden />
        <div className="end-round-avatar">{SEAT_AVATARS[winnerIndexes[0]]}</div>
        <h1 className="font-display end-round-title">
          {winnerIndexes.map(i => SEAT_NAMES[i]).join(' & ')} gagne{winnerIndexes.length > 1 ? 'nt' : ''} !
        </h1>
        {wonByClaim && <p className="end-round-claim">👑 VICTOIRE RÉCLAMÉE</p>}
        <div className="text-gold font-display end-round-amount">
          {heroAmount > 0 ? '+' : ''}
          {heroAmount.toLocaleString('fr-FR')} FCFA
        </div>
        <div className="end-round-combo">
          <span className="end-round-combo-label">{comboLabel}</span>
          <span className="end-round-combo-x">×</span>
          <span className="end-round-combo-mult">{multiplier}</span>
        </div>
      </div>

      {trailingCards.length > 0 && (
        <div className="anim-fade-in-up end-trailing" style={{ animationDelay: '0.2s' }}>
          {trailingCards.map((c, i) => (
            <PlayingCard key={i} suit={c.suit} value={c.value} state="winner" size="md" />
          ))}
        </div>
      )}

      <div className="anim-fade-in-up end-stat-list" style={{ animationDelay: '0.3s' }}>
        <div className="end-list-head">
          <span className="end-list-head-label">RÉSULTAT DU ROUND</span>
        </div>
        {payoutLines.map((p, i) => {
          const isBanked = bankedPlayerIndexes.includes(p.playerIndex)
          return (
            <div
              key={p.playerIndex}
              className={`end-payout-row${i < payoutLines.length - 1 ? ' has-border' : ''}${p.playerIndex === HUMAN_INDEX ? ' is-you' : ''}`}
            >
              <span className="end-payout-avatar">{SEAT_AVATARS[p.playerIndex]}</span>
              <span className="font-display end-payout-name">
                {SEAT_NAMES[p.playerIndex]}
                {isBanked && <span className="end-payout-bank">🏦 banque</span>}
              </span>
              <span className={`font-display end-payout-amt${p.amount > 0 ? ' is-gain' : ' is-loss'}`}>
                {p.amount > 0 ? '+' : ''}
                {p.amount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          )
        })}
      </div>

      <div className="anim-fade-in-up end-capital-card" style={{ animationDelay: '0.4s' }}>
        <span className="end-muted">Votre capital</span>
        <div className="end-capital-right">
          <span className="font-display end-capital-val">
            {players[HUMAN_INDEX].capital.toLocaleString('fr-FR')}
          </span>
          <span className={humanDelta >= 0 ? 'end-payout-amt is-gain' : 'end-payout-amt is-loss'}>
            {humanDelta >= 0 ? '+' : ''}
            {humanDelta.toLocaleString('fr-FR')}
          </span>
          <span className="end-muted"> FCFA</span>
        </div>
      </div>
      <p className="end-prev-note">(précédemment {previousCapital.toLocaleString('fr-FR')} FCFA)</p>

      <div className="end-actions">
        <UiButton fullWidth onClick={handleContinue} className="anim-fade-in-up end-cta-primary" style={{ animationDelay: '0.5s' }}>
          CONTINUER →
        </UiButton>
        <UiButton
          variant="secondary"
          fullWidth
          onClick={() => onNavigate('home')}
          className="anim-fade-in-up end-cta-secondary"
          style={{ animationDelay: '0.6s' }}
        >
          Quitter la partie
        </UiButton>
      </div>
    </div>
  )
}
