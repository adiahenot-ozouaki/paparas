import { useEffect, useState } from 'react'
import type { Screen, Card as GameCard } from '../types'
import { playCard, resolveTrick, getCurrentPlayerIndex, canClaimVictory, claimVictory, type RoundState } from '../game/round'
import { getPlayableCards } from '../game/trick'
import { chooseAiCard } from '../game/ai'
import { useGame, HUMAN_INDEX, SEAT_NAMES } from '../game/GameContext'
import { COMBO_LABEL } from '../game/combo'
import { GameTableHud } from '../components/game/GameTableHud'
import { GameTableArea } from '../components/game/GameTableArea'
import { PlayerHand } from '../components/game/PlayerHand'
import { TrickWonOverlay } from '../components/game/TrickWonOverlay'
import { RoundEndBanner } from '../components/game/RoundEndBanner'
import { SpecialWinOverlayWrapper } from '../components/game/SpecialWinOverlayWrapper'
import { BankConfirmOverlay } from '../components/game/BankConfirmOverlay'
import { PauseOverlay } from '../components/game/PauseOverlay'

export default function GameTableScreen({
  onNavigate,
}: {
  onNavigate: (s: Screen) => void
}) {
  const {
    players,
    roundState,
    roundNumber,
    stakeConfig,
    setRoundState,
    ensureGameStarted,
    applyCurrentPayout,
    startNextRound,
    checkGameOverNow,
    bankPlayerAction,
    claimVictoryAction,
    recordGameResult,
  } = useGame()

  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [showSuitIndicator, setShowSuitIndicator] = useState(false)
  const [confirmingBank, setConfirmingBank] = useState(false)
  // Pause RÉELLE (voir components/game/PauseOverlay.tsx) : tant que true,
  // les useEffect qui font avancer le round (tour de l'IA, résolution
  // d'un pli) ne programment plus de timer — voir leurs gardes ci-dessous.
  const [isPaused, setIsPaused] = useState(false)
  // Masque les bulles nom/gains (adversaires + joueur) pour agrandir les
  // cartes du tapis. Purement un choix d'affichage local à cet écran.
  // Masque les bulles nom/gains (adversaires + joueur) pour agrandir les
  // cartes du tapis. Activé par défaut ; un appui sur l'icône du HUD les
  // révèle temporairement.
  const [compactMode, setCompactMode] = useState(true)

  const currentPlayerIndex = getCurrentPlayerIndex(roundState)

  const isHumanTurn =
    roundState.phase === 'playing' &&
    currentPlayerIndex === HUMAN_INDEX

  const requestedSuit =
    roundState.currentTrick?.requestedSuit ?? null

  const humanHand = roundState.hands[HUMAN_INDEX]

  const humanIsBanked =
    roundState.bankedPlayers.includes(HUMAN_INDEX)

  const isHumanLeader =
    roundState.currentTrick !== null &&
    roundState.currentTrick.requestedSuit !== null &&
    roundState.currentTrick.starterIndex === HUMAN_INDEX

  const playableCards = isHumanTurn
    ? getPlayableCards(humanHand, requestedSuit)
    : []

  const canBank =
    roundState.phase === 'playing' &&
    !!roundState.currentTrick &&
    roundState.currentTrick.trickNumber < 3 &&
    !humanIsBanked

  const canClaim =
    roundState.phase === 'playing' &&
    canClaimVictory(roundState, HUMAN_INDEX)

  const isCardPlayable = (card: GameCard) =>
    playableCards.some(
      c => c.suit === card.suit && c.value === card.value,
    )

  // ---------------------------------------------------------------------------
  // Garantit qu'une partie existe si l'écran est ouvert directement.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    ensureGameStarted()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // Indicateur de couleur demandée au début d'un pli.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (
      roundState.phase !== 'playing' ||
      !roundState.currentTrick
    ) {
      return
    }

    if (roundState.currentTrick.playedCards.length !== 1) {
      return
    }

    setShowSuitIndicator(true)

    const timer = setTimeout(() => {
      setShowSuitIndicator(false)
    }, 1200)

    return () => clearTimeout(timer)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    roundState.currentTrick?.trickNumber,
    roundState.currentTrick?.playedCards.length,
  ])

  // ---------------------------------------------------------------------------
  // Tour des IA.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (roundState.phase !== 'playing') {
      return
    }

    if (
      currentPlayerIndex === null ||
      currentPlayerIndex === HUMAN_INDEX
    ) {
      return
    }

    // En pause : on ne programme aucun timer. Le nettoyage ci-dessous
    // (return () => clearTimeout) annule aussi tout timer déjà en vol dès
    // que isPaused passe à true, puisque cet effet dépend de isPaused et
    // se relance donc à chaque bascule.
    if (isPaused) {
      return
    }

    const timer = setTimeout(() => {
      setRoundState((prev: RoundState) => {
        if (prev.phase !== 'playing') {
          return prev
        }

        const index = getCurrentPlayerIndex(prev)

        if (index === null || index === HUMAN_INDEX) {
          return prev
        }

        // Réclamer la victoire est toujours avantageux dès que c'est
        // possible (voir round.ts::canClaimVictory) : aucune raison pour
        // l'IA de ne pas le faire.
        if (canClaimVictory(prev, index)) {
          return claimVictory(prev, index, stakeConfig)
        }

        const hand = prev.hands[index]

        const card = chooseAiCard({
          hand,
          requestedSuit: prev.currentTrick?.requestedSuit ?? null,
          playedCardsThisTrick: prev.currentTrick?.playedCards ?? [],
        })

        return playCard(prev, index, card)
      })
    }, 900)

    return () => clearTimeout(timer)
  }, [
    roundState,
    currentPlayerIndex,
    setRoundState,
    stakeConfig,
    isPaused,
  ])

  // ---------------------------------------------------------------------------
  // Résolution du pli remporté.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (roundState.phase !== 'trickWon') {
      return
    }

    if (isPaused) {
      return
    }

    const timer = setTimeout(() => {
      setRoundState((prev: RoundState) =>
        prev.phase === 'trickWon'
          ? resolveTrick(prev, stakeConfig)
          : prev,
      )
    }, 1400)

    return () => clearTimeout(timer)
  }, [roundState, setRoundState, stakeConfig, isPaused])

  // ---------------------------------------------------------------------------
  // Fin de round : paiement.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (
      roundState.phase !== 'roundEnd' &&
      roundState.phase !== 'specialWin'
    ) {
      return
    }

    applyCurrentPayout()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundState.phase, roundState.outcome])

  // ---------------------------------------------------------------------------
  // Fin de round normal : PLUS de navigation automatique (retour utilisateur :
  // "les animations de fin de round normal sont trop rapides, on doit
  // pouvoir observer les cartes"). Un bandeau non bloquant avec un bouton
  // "Voir le résultat →" apparaît ; les piles de cartes du round restent
  // visibles et observables tant qu'on n'a pas cliqué.
  // ---------------------------------------------------------------------------

  // Ferme la confirmation banque si elle n'est plus valable (ex: pli 3 atteint).
  useEffect(() => {
    if (!canBank && confirmingBank) {
      setConfirmingBank(false)
    }
  }, [canBank, confirmingBank])

  // ---------------------------------------------------------------------------
  // Handlers.
  // ---------------------------------------------------------------------------

  function goToRoundResult() {
    onNavigate('roundResult')
  }

  function handleSpecialWinContinue() {
    const result = checkGameOverNow()

    if (
      result.isOver &&
      result.winnerIndex !== undefined
    ) {
      recordGameResult(result.winnerIndex === HUMAN_INDEX)
      onNavigate(
        result.winnerIndex === HUMAN_INDEX
          ? 'victory'
          : 'defeat',
      )

      return
    }

    startNextRound()
    setSelectedCardIndex(null)
  }

  function handleCardSelect(index: number) {
    if (!isHumanTurn) {
      return
    }

    if (!isCardPlayable(humanHand[index])) {
      return
    }

    setSelectedCardIndex(prev =>
      prev === index ? null : index,
    )
  }

  function playCardAtIndex(index: number) {
    const card = humanHand[index]
    setRoundState((prev: RoundState) =>
      playCard(prev, HUMAN_INDEX, card),
    )
    setSelectedCardIndex(null)
  }

  function handlePlayCard() {
    if (
      selectedCardIndex === null ||
      !isHumanTurn
    ) {
      return
    }

    playCardAtIndex(selectedCardIndex)
  }

  /** Double-tap OU glisser une carte vers le haut : la joue directement. */
  function attemptPlayCard(index: number) {
    if (!isHumanTurn) return
    if (!isCardPlayable(humanHand[index])) return
    playCardAtIndex(index)
  }

  function handleConfirmBank() {
    bankPlayerAction(HUMAN_INDEX)
    setConfirmingBank(false)
    setSelectedCardIndex(null)
  }

  function handleClaimVictory() {
    claimVictoryAction(HUMAN_INDEX)
  }

  const tricksWonThisRound = [0, 1, 2, 3].map(
    index =>
      roundState.trickWinners.filter(
        winner => winner === index,
      ).length,
  )

  return (
    <div
      className="felt-bg"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Texture de fond */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\'%3E%3Cpolygon points=\'16,0 32,16 16,32 0,16\' fill=\'none\' stroke=\'rgba(214,168,79,0.04)\' stroke-width=\'0.8\'/%3E%3C/svg%3E")',
          opacity: 0.8,
        }}
      />

      {/* Victoire spéciale */}
      {roundState.phase === 'specialWin' &&
        roundState.outcome?.kind === 'specialWin' && (
          <SpecialWinOverlayWrapper
            outcome={roundState.outcome}
            hands={roundState.hands}
            onContinue={handleSpecialWinContinue}
          />
        )}

      {/* Pli remporté */}
      {roundState.phase === 'trickWon' &&
        roundState.lastTrickWinnerIndex !== null && (
          <TrickWonOverlay
            winnerIndex={
              roundState.lastTrickWinnerIndex
            }
          />
        )}

      {/* Fin de round normal — bandeau non bloquant, les cartes restent visibles */}
      {roundState.phase === 'roundEnd' &&
        roundState.outcome?.kind === 'normal' && (
          <RoundEndBanner
            winnerName={SEAT_NAMES[roundState.outcome.roundWinnerIndex]}
            comboLabel={COMBO_LABEL[roundState.outcome.combo]}
            wonByClaim={roundState.outcome.wonByClaim}
            onContinue={goToRoundResult}
          />
        )}

      {/* Confirmation "aller en banque" */}
      {confirmingBank && (
        <BankConfirmOverlay
          baseStake={stakeConfig.baseStake}
          onConfirm={handleConfirmBank}
          onCancel={() => setConfirmingBank(false)}
        />
      )}

      {/* Pause — gèle réellement la partie (voir les useEffect gardés par
          isPaused plus haut), contrairement à l'ancien bouton qui ne
          faisait que naviguer vers l'accueil comme "Quitter". */}
      {isPaused && (
        <PauseOverlay
          onResume={() => setIsPaused(false)}
          onQuit={() => onNavigate('home')}
        />
      )}

      {/* HUD supérieur */}
      <GameTableHud
        roundNumber={roundNumber}
        tricksWonThisRound={tricksWonThisRound}
        compactMode={compactMode}
        canBank={canBank}
        onPause={() => setIsPaused(true)}
        onQuit={() => onNavigate('home')}
        onToggleCompact={() => setCompactMode(v => !v)}
        onOpenRules={() => onNavigate('rules')}
        onRequestBank={() => setConfirmingBank(true)}
      />

      {/* Zone principale */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <GameTableArea
          players={players}
          roundState={roundState}
          currentPlayerIndex={currentPlayerIndex}
          showSuitIndicator={showSuitIndicator}
          requestedSuit={requestedSuit}
          compactMode={compactMode}
        />

        {/* Main du joueur */}
        <PlayerHand
          players={players}
          hand={humanHand}
          isHumanTurn={isHumanTurn}
          humanIsBanked={humanIsBanked}
          isLeader={isHumanLeader}
          selectedCardIndex={selectedCardIndex}
          canClaim={canClaim}
          isCardPlayable={isCardPlayable}
          isPlaying={roundState.phase === 'playing'}
          compactMode={compactMode}
          onCardSelect={handleCardSelect}
          onAttemptPlay={attemptPlayCard}
          onPlayCard={handlePlayCard}
          onClaimVictory={handleClaimVictory}
        />
      </div>
    </div>
  )
}
