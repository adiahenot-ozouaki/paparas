import PlayingCard from '../components/PlayingCard'
import type { Screen } from '../types'
import { useGame, SEAT_NAMES, SEAT_AVATARS, HUMAN_INDEX } from '../game/GameContext'
import { COMBO_LABEL, countTrailingThrees } from '../game/combo'

// ==========================================================================
// RoundResultScreen — branché sur le vrai contexte de jeu (game/GameContext).
//
// N'est atteint que pour un round "normal" (issu d'un vrai enchaînement de
// plis) : GameTableScreen redirige ici dès que roundState.phase passe à
// 'roundEnd'. Le cas "victoire immédiate" (règle spéciale) garde sa propre
// mise en scène dédiée dans GameTableScreen (SpecialWinOverlay, étape 9)
// plutôt que de transiter par cet écran — ce composant reste néanmoins
// capable d'afficher ce cas si jamais le flux de navigation change.
// ==========================================================================

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
    // Filet de sécurité : cet écran ne devrait être atteint qu'avec un
    // outcome déjà calculé. S'il manque (navigation directe, F5, etc.),
    // on ramène vers la table plutôt que d'afficher un écran vide.
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#0B0D10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button className="btn-primary glow-gold" onClick={() => onNavigate('gameTable')} style={{ padding: '14px 28px', borderRadius: 14 }}>
          Retour à la table
        </button>
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

  // Montant mis en avant dans le bandeau principal : le gain RÉEL du
  // joueur humain s'il fait partie des gagnants, sinon celui du premier
  // gagnant. Avant, ce chiffre était une MOYENNE arrondie entre gagnants
  // (winners.reduce(...) / winnerIndexes.length) — trompeur maintenant
  // que computeRoundPayout répartit le pot en FCFA entiers avec un
  // reliquat qui peut différer de 1 FCFA d'un gagnant à l'autre (voir
  // game/payout.ts). Le détail par joueur reste de toute façon visible
  // plus bas dans payoutLines — ce chiffre-ci est juste le plus pertinent
  // à afficher en grand.
  const heroAmount = winnerIndexes.includes(HUMAN_INDEX)
    ? (outcome.payout.winners.find(w => w.playerIndex === HUMAN_INDEX)?.amount ?? 0)
    : (outcome.payout.winners[0]?.amount ?? 0)

  // Cartes à mettre en avant : les 3 consécutifs de fin de manche du
  // gagnant, s'il y en a (rien à montrer pour un combo Simple).
  const winnerSequence = outcome.kind === 'normal' ? roundState.playLog[outcome.roundWinnerIndex] : []
  const trailingCount = outcome.kind === 'normal' ? countTrailingThrees(winnerSequence) : 0
  const trailingCards = trailingCount > 0 ? winnerSequence.slice(winnerSequence.length - trailingCount) : []

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(ellipse at 50% 0%, rgba(18,60,50,0.5) 0%, #0B0D10 60%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '32px 24px',
      overflowY: 'auto',
    }}>
      <div className="pattern-african" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />

      <div className="anim-fade-in-down" style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 99,
        padding: '6px 20px',
        marginBottom: 24,
      }}>
        <span style={{ color: '#A9B0B7', fontSize: 12, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.12em' }}>
          ROUND {roundNumber} TERMINÉ
        </span>
      </div>

      <div className="anim-scale-bounce" style={{ textAlign: 'center', marginBottom: 32, position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 160,
          height: 160,
          transform: 'translate(-50%, -50%)',
          backgroundImage: 'conic-gradient(from 0deg, transparent, rgba(214,168,79,0.08) 20deg, transparent 40deg)',
          animation: 'victoryRays 8s linear infinite',
          borderRadius: '50%',
        }} />

        <div style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: 'linear-gradient(135deg, #123C32, #0d2a1f)',
          border: '2.5px solid #D6A84F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 40,
          margin: '0 auto 16px',
          boxShadow: '0 0 32px rgba(214,168,79,0.3)',
          position: 'relative',
        }}>
          {SEAT_AVATARS[winnerIndexes[0]]}
        </div>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px', letterSpacing: '0.04em' }}>
          {winnerIndexes.map(i => SEAT_NAMES[i]).join(' & ')} gagne{winnerIndexes.length > 1 ? 'nt' : ''} !
        </h1>
        {wonByClaim && (
          <p style={{ color: '#9B59B6', fontSize: 12, fontFamily: 'Plus Jakarta Sans', fontWeight: 700, letterSpacing: '0.06em', margin: '0 0 6px' }}>
            👑 VICTOIRE RÉCLAMÉE
          </p>
        )}
        <div className="text-gold font-display" style={{ fontSize: 38, fontWeight: 800, margin: '0 0 8px' }}>
          {heroAmount > 0 ? '+' : ''}
          {heroAmount.toLocaleString('fr-FR')} FCFA
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(214,168,79,0.15)',
          border: '1px solid rgba(214,168,79,0.35)',
          borderRadius: 12,
          padding: '6px 16px',
        }}>
          <span style={{ color: '#D6A84F', fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 14 }}>{comboLabel}</span>
          <span style={{ color: '#A9B0B7', fontSize: 14 }}>×</span>
          <span style={{ color: '#F0D58A', fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 14 }}>{multiplier}</span>
        </div>
      </div>

      {trailingCards.length > 0 && (
        <div className="anim-fade-in-up" style={{ display: 'flex', gap: 8, marginBottom: 28, animationDelay: '0.2s' }}>
          {trailingCards.map((c, i) => (
            <PlayingCard key={i} suit={c.suit} value={c.value} state="winner" size="md" />
          ))}
        </div>
      )}

      <div className="anim-fade-in-up" style={{
        width: '100%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 24,
        animationDelay: '0.3s',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: '#A9B0B7', fontSize: 12, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.08em' }}>
            RÉSULTAT DU ROUND
          </span>
        </div>
        {payoutLines.map((p, i) => {
          const isBanked = bankedPlayerIndexes.includes(p.playerIndex)
          return (
            <div key={p.playerIndex} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: i < payoutLines.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              background: p.playerIndex === HUMAN_INDEX ? 'rgba(255,255,255,0.02)' : 'transparent',
            }}>
              <span style={{ fontSize: 20, marginRight: 12 }}>{SEAT_AVATARS[p.playerIndex]}</span>
              <span className="font-display" style={{ flex: 1, color: '#fff', fontSize: 15, fontWeight: 600 }}>
                {SEAT_NAMES[p.playerIndex]}
                {isBanked && (
                  <span style={{ color: '#A9B0B7', fontSize: 11, fontWeight: 500, marginLeft: 6 }}>🏦 banque</span>
                )}
              </span>
              <span className="font-display" style={{
                color: p.amount > 0 ? '#4CAF76' : '#C94B4B',
                fontSize: 16,
                fontWeight: 700,
              }}>
                {p.amount > 0 ? '+' : ''}
                {p.amount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          )
        })}
      </div>

      <div className="anim-fade-in-up" style={{
        width: '100%',
        background: 'rgba(18,60,50,0.3)',
        border: '1px solid rgba(23,107,80,0.3)',
        borderRadius: 16,
        padding: '14px 16px',
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        animationDelay: '0.4s',
      }}>
        <span style={{ color: '#A9B0B7', fontSize: 13 }}>Votre capital</span>
        <div style={{ textAlign: 'right' }}>
          <span className="font-display" style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>
            {players[HUMAN_INDEX].capital.toLocaleString('fr-FR')}
          </span>
          <span style={{ color: humanDelta >= 0 ? '#4CAF76' : '#C94B4B', fontSize: 13, marginLeft: 6 }}>
            {humanDelta >= 0 ? '+' : ''}
            {humanDelta.toLocaleString('fr-FR')}
          </span>
          <span style={{ color: '#A9B0B7', fontSize: 13 }}> FCFA</span>
        </div>
      </div>
      <p style={{ color: '#5b636b', fontSize: 11, margin: '-16px 0 24px', width: '100%' }}>
        (précédemment {previousCapital.toLocaleString('fr-FR')} FCFA)
      </p>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          className="btn-primary glow-gold anim-fade-in-up"
          onClick={handleContinue}
          style={{ padding: '18px', fontSize: 15, borderRadius: 18, letterSpacing: '0.1em', animationDelay: '0.5s' }}
        >
          CONTINUER →
        </button>
        <button
          className="btn-secondary anim-fade-in-up"
          onClick={() => onNavigate('home')}
          style={{ padding: '14px', fontSize: 14, borderRadius: 14, animationDelay: '0.6s' }}
        >
          Quitter la partie
        </button>
      </div>
    </div>
  )
}
