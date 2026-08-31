#!/usr/bin/env node
// ==========================================================================
// scripts/test-online-match.mjs
//
// Simule une TABLE CASH GAME Garam Paparas EN LIGNE de bout en bout, contre
// la vraie Edge Function `kora-game-engine` (aucun mock) :
//
//   1. Crée 4 comptes de test (Supabase Auth, confirmés directement),
//      chacun avec un buy-in individuel (STARTING_CAPITAL par défaut,
//      dans [min_buy_in, max_buy_in] de la table).
//   2. Chacun, via SA PROPRE session (pas la service role), crée/rejoint
//      la table et se déclare prêt — ça exerce réellement les policies
//      RLS de kora_tables / kora_table_players, pas seulement le moteur.
//   3. Un des 4 démarre la table (action start_table).
//   4. Boucle : à chaque tour, le bot dont c'est le tour essaie ses cartes
//      une par une jusqu'à ce que le serveur en accepte une — on ne
//      réimplémente PAS les règles ici, on laisse le serveur les faire
//      respecter.
//   5. Dès qu'un siège est signalé éliminé (`eliminatedSeats` dans la
//      réponse), un NOUVEAU joueur de test est créé et prend immédiatement
//      ce siège avec un buy-in choisi au hasard dans la fourchette de la
//      table — c'est la démonstration du "principe de table en ligne"
//      (un siège libéré peut être repris par un autre joueur, la table
//      continue de tourner).
//   6. Après CHAQUE round, vérifie que le paiement de ce round est à somme
//      nulle (gains des gagnants == pertes des perdants, au FCFA près) —
//      c'est l'invariant qui reste valide même avec des buy-ins et des
//      arrivées/départs dynamiques (un total global sur toute la session
//      n'a plus de sens dans ce modèle, contrairement à l'ancien modèle
//      "4 joueurs fixes, un seul survivant").
//   7. S'arrête après --max-rounds (filet de sécurité) ou si la table
//      tombe sous 2 joueurs actifs.
//   8. Affiche capital final + statistiques cumulées de chaque siège encore
//      occupé, et nettoie (table + TOUS les comptes de test créés, y
//      compris les remplaçants) sauf si --keep est passé.
//
// Prérequis (variables d'environnement, JAMAIS committées) :
//   SUPABASE_URL              ex: https://acqxiwedxproqjffnerb.supabase.co
//   SUPABASE_ANON_KEY          clé anon/publishable (voir .env.example)
//   SUPABASE_SERVICE_ROLE_KEY  clé service role (Project Settings > API)
//                              — ne JAMAIS exposer cette clé côté client.
//
// Ce script charge automatiquement un fichier .env à la racine du projet
// s'il existe — pas besoin de redéfinir les variables à chaque session de
// terminal. Une variable déjà présente dans l'environnement reste
// prioritaire et n'est jamais écrasée par le contenu du .env.
//
// Usage (avec un fichier .env en place) :
//   node scripts/test-online-match.mjs [--keep] [--base-stake=500] \
//     [--starting-capital=5000] [--min-buy-in=5000] [--max-buy-in=15000] \
//     [--variant=as] [--max-rounds=50]
// ==========================================================================

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// --------------------------------------------------------------------------
// Chargement optionnel d'un fichier .env à la racine du projet.
// --------------------------------------------------------------------------
function loadDotEnvIfPresent() {
  const scriptDir = dirname(fileURLToPath(import.meta.url))
  const envPath = join(scriptDir, '..', '.env')
  if (!existsSync(envPath)) return

  const content = readFileSync(envPath, 'utf-8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIndex = line.indexOf('=')
    if (eqIndex === -1) continue
    const key = line.slice(0, eqIndex).trim()
    let value = line.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

loadDotEnvIfPresent()

const args = process.argv.slice(2)
const KEEP = args.includes('--keep')
const getArg = (name, fallback) => {
  const match = args.find(a => a.startsWith(`--${name}=`))
  return match ? match.split('=')[1] : fallback
}

const BASE_STAKE = Number(getArg('base-stake', 500))
const STARTING_CAPITAL = Number(getArg('starting-capital', 5000)) // buy-in par défaut des 4 premiers joueurs
const MIN_BUY_IN = Number(getArg('min-buy-in', STARTING_CAPITAL))
const MAX_BUY_IN = Number(getArg('max-buy-in', STARTING_CAPITAL * 3))
const DECK_VARIANT = getArg('variant', 'as')
const MAX_ROUNDS = Number(getArg('max-rounds', 50)) // filet de sécurité anti-boucle infinie

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
  const missing = [
    !SUPABASE_URL && 'SUPABASE_URL',
    !SUPABASE_ANON_KEY && 'SUPABASE_ANON_KEY',
    !SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean)
  console.error(
    `❌ Variable(s) manquante(s) : ${missing.join(', ')}.\n\n` +
      '   Deux façons de les fournir :\n' +
      '   1) Créer un fichier .env à la racine du projet (voir .env.example) —\n' +
      '      ce script le charge automatiquement, y compris sous Windows.\n' +
      '   2) Les définir dans le terminal AVANT la commande, dans la même session :\n' +
      '        PowerShell : $env:SUPABASE_URL="..."\n' +
      '        cmd.exe    : set SUPABASE_URL=...\n\n' +
      '   La SUPABASE_SERVICE_ROLE_KEY se trouve dans le dashboard Supabase,\n' +
      '   Project Settings > API > service_role key. Ne jamais la committer.',
  )
  process.exit(1)
}

if (MIN_BUY_IN > MAX_BUY_IN) {
  console.error(`❌ --min-buy-in (${MIN_BUY_IN}) ne peut pas dépasser --max-buy-in (${MAX_BUY_IN}).`)
  process.exit(1)
}

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/kora-game-engine`

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

function log(...args) {
  console.log(...args)
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}\n${title}\n${'─'.repeat(60)}`)
}

/** Entier aléatoire dans [min, max] — buy-in des joueurs remplaçants (pas de besoin cryptographique ici, c'est un script de test). */
function randomBuyIn(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

// ----------------------------------------------------------------------------
// 1. Comptes de test
// ----------------------------------------------------------------------------

async function createTestPlayer(seatIndex, tableId, buyIn) {
  const email = `kora-bot-${seatIndex}-${randomUUID().slice(0, 8)}@example.test`
  const password = randomUUID()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError || !created.user) {
    throw new Error(`Échec création utilisateur test (siège ${seatIndex}) : ${createError?.message}`)
  }

  // Client "comme un vrai joueur" : clé anon, PAS service role — pour que
  // toutes ses actions passent réellement par RLS, exactement comme le
  // client React le ferait.
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: signIn, error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError || !signIn.session) {
    throw new Error(`Échec connexion utilisateur test (siège ${seatIndex}) : ${signInError?.message}`)
  }

  return { seatIndex, tableId, userId: created.user.id, email, buyIn, client, accessToken: signIn.session.access_token }
}

/** Prend un siège vacant : simple INSERT direct gouverné par RLS (voir migration kora_cash_table_dynamic_seats) — PAS une action de l'Edge Function. */
async function joinTable(seatIndex, tableId, buyIn) {
  const player = await createTestPlayer(seatIndex, tableId, buyIn)
  const { error } = await player.client.from('kora_table_players').insert({
    table_id: tableId,
    user_id: player.userId,
    seat_index: seatIndex,
    capital: buyIn,
    is_ready: true,
  })
  if (error) throw new Error(`Échec pour prendre le siège ${seatIndex} : ${error.message}`)
  return player
}

// ----------------------------------------------------------------------------
// 2. Appel de l'Edge Function
// ----------------------------------------------------------------------------

async function callEngine(player, action, extra = {}, attempt = 1) {
  const MAX_ATTEMPTS = 4
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${player.accessToken}` },
      body: JSON.stringify({ action, tableId: player.tableId, ...extra }),
    })
    const body = await res.json()
    return { ok: res.ok, status: res.status, body }
  } catch (err) {
    if (attempt >= MAX_ATTEMPTS) throw err
    const delayMs = 500 * attempt
    console.warn(`  ⚠️  Erreur réseau (${err.message ?? err}) — nouvelle tentative dans ${delayMs}ms (essai ${attempt + 1}/${MAX_ATTEMPTS})...`)
    await new Promise(resolve => setTimeout(resolve, delayMs))
    return callEngine(player, action, extra, attempt + 1)
  }
}

/** Variante de callEngine qui EXIGE un succès et lève une erreur explicite (message réel du serveur) sinon. Non utilisée dans la boucle d'essai de cartes de playTurn (qui a besoin de voir des rejets). */
async function callEngineOrThrow(player, action, extra = {}) {
  const { ok, status, body } = await callEngine(player, action, extra)
  if (!ok) {
    throw new Error(
      `Action "${action}" refusée par le serveur (siège ${player.seatIndex}, HTTP ${status}) : ${body?.error ?? JSON.stringify(body)}`,
    )
  }
  return body
}

// ----------------------------------------------------------------------------
// 3. Aides de boucle de jeu
// ----------------------------------------------------------------------------

async function logCapitals(tableId) {
  const { data: seats } = await admin
    .from('kora_table_players')
    .select('seat_index, capital')
    .eq('table_id', tableId)
    .order('seat_index', { ascending: true })

  const line = seats.map(s => `siège ${s.seat_index}: ${s.capital} FCFA`).join('  |  ')
  log(`  💰 ${line || '(table vide)'}`)
}

/**
 * Vérifie que le paiement d'UN round est à somme nulle : ce qui a été
 * gagné == ce qui a été perdu, au FCFA près. C'est l'invariant qui reste
 * valide même quand des joueurs rejoignent/quittent avec des buy-ins
 * différents (contrairement à un total global sur toute la session).
 */
function checkRoundZeroSum(outcome) {
  const total = [...outcome.payout.winners, ...outcome.payout.losers].reduce((sum, line) => sum + line.amount, 0)
  if (total !== 0) {
    log(`  ❌ DÉSÉQUILIBRE sur ce round : somme des mouvements = ${total} FCFA (attendu 0) — à investiguer !`)
  } else {
    log(`  ✅ Round à somme nulle.`)
  }
  return total === 0
}

async function playTurn(player) {
  const stateBody = await callEngineOrThrow(player, 'get_state')
  const hand = stateBody.state.hands[player.seatIndex]

  for (const card of hand) {
    const { ok, body } = await callEngine(player, 'play_card', { card })
    if (ok) {
      log(`  🂠 Siège ${player.seatIndex} joue ${card.value}${card.suit}`)
      return body
    }
  }
  throw new Error(`Aucune carte jouable trouvée pour le siège ${player.seatIndex} — anomalie moteur.`)
}

/** Reproduit fidèlement engine/round.ts::getCurrentPlayerIndex — un siège vacant OU banni volontairement est sauté de la même façon. */
function getCurrentSeatIndex(state) {
  if (state.phase !== 'playing' || !state.currentTrick) return null
  const fullOrder = [0, 1, 2, 3].map(i => (state.currentTrick.starterIndex + i) % 4)
  const activeOrder = fullOrder.filter(seat => !state.bankedPlayers.includes(seat))
  return activeOrder[state.currentTrick.playedCards.length] ?? null
}

/**
 * Fait immédiatement arriver un nouveau joueur de test sur chaque siège
 * signalé éliminé, avec un buy-in choisi au hasard dans
 * [MIN_BUY_IN, MAX_BUY_IN] — c'est la démonstration du "principe de table
 * en ligne" : un siège libéré peut être repris par un autre joueur.
 */
async function replaceEliminatedSeats(eliminatedSeats, tableId, seatOccupants, allPlayersEverCreated) {
  for (const seatIdx of eliminatedSeats) {
    const oldOccupant = seatOccupants[seatIdx]
    log(`  💀 Siège ${seatIdx} éliminé${oldOccupant ? ` (${oldOccupant.email})` : ''} — le siège se libère.`)
    seatOccupants[seatIdx] = null

    const buyIn = randomBuyIn(MIN_BUY_IN, MAX_BUY_IN)
    const newPlayer = await joinTable(seatIdx, tableId, buyIn)
    seatOccupants[seatIdx] = newPlayer
    allPlayersEverCreated.push(newPlayer)
    log(`  🆕 Siège ${seatIdx} repris par ${newPlayer.email} avec un buy-in de ${buyIn} FCFA.`)
  }
}

// ----------------------------------------------------------------------------
// Boucle de jeu principale
// ----------------------------------------------------------------------------

async function runGame(tableId, seatOccupants, allPlayersEverCreated) {
  let roundsPlayed = 0

  while (roundsPlayed < MAX_ROUNDS) {
    const caller = seatOccupants.find(p => p !== null)
    if (!caller) {
      log('\n🚪 Table entièrement vide — fin du test.')
      break
    }

    const initial = await callEngineOrThrow(caller, 'get_state')
    let state = initial.state
    section(`Round ${initial.roundNumber} — phase initiale : ${state.phase}`)
    if (state.bankedPlayers.length > 0) {
      log(`  (sièges vacants ou bannis, sautés ce round : ${state.bankedPlayers.join(', ')})`)
    }
    if (state.phase === 'specialWin') {
      log('  ✨ Règle spéciale déclenchée dès la distribution.')
    }

    // La réponse qui contient eliminatedSeats pour CE round est soit
    // `initial` (victoire spéciale décidée dès la distribution, aucun pli
    // joué), soit la dernière réponse de resolve_trick (round normal).
    let lastActionWithElimination = initial

    while (state.phase === 'playing') {
      const currentSeat = getCurrentSeatIndex(state)
      const actingPlayer = seatOccupants[currentSeat]
      const result = await playTurn(actingPlayer)
      state = result.state

      if (state.phase === 'trickWon') {
        log(`  🏆 Pli remporté par le siège ${state.lastTrickWinnerIndex}`)
        const resolved = await callEngineOrThrow(actingPlayer, 'resolve_trick')
        state = resolved.state
        lastActionWithElimination = resolved
      }
    }

    if (state.outcome?.kind === 'normal') {
      log(`  ➡️  Round gagné par le siège ${state.outcome.roundWinnerIndex} — combo ${state.outcome.combo} (×${state.outcome.multiplier})`)
    } else if (state.outcome?.kind === 'specialWin') {
      log(`  ➡️  Victoire spéciale : ${state.outcome.winners.map(w => `siège ${w.playerIndex} (${w.rules.join(', ')})`).join(' & ')}`)
    }
    if (state.outcome) checkRoundZeroSum(state.outcome)

    roundsPlayed++
    await logCapitals(tableId)

    const eliminatedThisRound = lastActionWithElimination?.eliminatedSeats ?? []
    if (eliminatedThisRound.length > 0) {
      await replaceEliminatedSeats(eliminatedThisRound, tableId, seatOccupants, allPlayersEverCreated)
    }

    const stillOccupied = seatOccupants.filter(p => p !== null).length
    if (stillOccupied < 2) {
      log(`\n⏸️  Moins de 2 joueurs restants (${stillOccupied}) — fin du test.`)
      break
    }

    await callEngineOrThrow(caller, 'start_next_round')
  }

  if (roundsPlayed >= MAX_ROUNDS) {
    log(`\n⚠️  Arrêt après ${MAX_ROUNDS} rounds (filet de sécurité anti-boucle infinie).`)
  }

  return roundsPlayed
}

// ----------------------------------------------------------------------------
// 4. Vérification finale
// ----------------------------------------------------------------------------

async function printFinalState(tableId, allPlayersEverCreated) {
  section('Résultat final')

  const { data: table } = await admin.from('kora_tables').select('*').eq('id', tableId).single()
  log(`Statut de la table : ${table.status}`)

  const { data: seats } = await admin
    .from('kora_table_players')
    .select('*')
    .eq('table_id', tableId)
    .order('seat_index', { ascending: true })

  if (seats.length === 0) {
    log('(Aucun siège occupé à la fin du test.)')
  }

  for (const seat of seats) {
    const { data: stats } = await admin.from('kora_lifetime_stats').select('*').eq('user_id', seat.user_id).single()
    const specials = Object.entries(stats.special_rule_counts)
      .filter(([, count]) => count > 0)
      .map(([rule, count]) => `${rule}×${count}`)
      .join(', ')
    log(
      `Siège ${seat.seat_index} — capital: ${seat.capital} FCFA | rounds gagnés: ${stats.total_rounds_won} | ` +
        `plis gagnés: ${stats.total_tricks_won} | gain net (ce compte) : ${stats.net_gain_total} FCFA | ` +
        `meilleur combo: ${stats.best_combo ?? '—'}${specials ? ` | règles spéciales : ${specials}` : ''}`,
    )
  }

  log(`\nJoueurs de test créés au total sur cette session : ${allPlayersEverCreated.length} (4 initiaux + remplaçants).`)
}

// ----------------------------------------------------------------------------
// 5. Nettoyage
// ----------------------------------------------------------------------------

async function cleanup(tableId, allPlayersEverCreated) {
  section('Nettoyage')

  await admin.from('kora_tables').delete().eq('id', tableId)
  log('✓ Table supprimée (cascade : sièges, rounds, mains)')

  for (const player of allPlayersEverCreated) {
    await admin.auth.admin.deleteUser(player.userId)
  }
  log(`✓ ${allPlayersEverCreated.length} comptes de test supprimés (cascade : profils, statistiques)`)
}

// ----------------------------------------------------------------------------
// Orchestration
// ----------------------------------------------------------------------------

async function main() {
  section(`Création de la table (mise ${BASE_STAKE} FCFA, buy-in [${MIN_BUY_IN}, ${MAX_BUY_IN}] FCFA, variante ${DECK_VARIANT})`)

  // La table doit être créée par un joueur déjà authentifié (created_by
  // référence son compte) — on crée donc d'abord le compte du joueur 0
  // (sans tableId, pas encore connu), puis la table depuis SON client.
  const firstPlayer = await createTestPlayer(0, null, STARTING_CAPITAL)
  const { data: table, error: tableError } = await firstPlayer.client
    .from('kora_tables')
    .insert({
      base_stake: BASE_STAKE,
      starting_capital: STARTING_CAPITAL,
      min_buy_in: MIN_BUY_IN,
      max_buy_in: MAX_BUY_IN,
      deck_variant: DECK_VARIANT,
      created_by: firstPlayer.userId,
    })
    .select('*')
    .single()
  if (tableError) throw new Error(`Échec création table : ${tableError.message}`)
  firstPlayer.tableId = table.id
  log(`✓ Table créée : ${table.id}`)

  const allPlayersEverCreated = [firstPlayer]
  const seatOccupants = [null, null, null, null]

  section('Les 4 joueurs prennent place et se déclarent prêts')
  const { error: firstJoinError } = await firstPlayer.client.from('kora_table_players').insert({
    table_id: table.id,
    user_id: firstPlayer.userId,
    seat_index: 0,
    capital: STARTING_CAPITAL,
    is_ready: true,
  })
  if (firstJoinError) throw new Error(`Échec assise siège 0 : ${firstJoinError.message}`)
  seatOccupants[0] = firstPlayer
  log(`✓ Siège 0 assis et prêt (${firstPlayer.email}, buy-in ${STARTING_CAPITAL} FCFA)`)

  for (let i = 1; i < 4; i++) {
    const player = await joinTable(i, table.id, STARTING_CAPITAL)
    seatOccupants[i] = player
    allPlayersEverCreated.push(player)
    log(`✓ Siège ${i} assis et prêt (${player.email}, buy-in ${STARTING_CAPITAL} FCFA)`)
  }

  section('Démarrage de la table')
  const startBody = await callEngineOrThrow(firstPlayer, 'start_table')
  log(`✓ Table démarrée — phase initiale : ${startBody.state.phase}`)
  if (startBody.eliminatedSeats?.length) {
    await replaceEliminatedSeats(startBody.eliminatedSeats, table.id, seatOccupants, allPlayersEverCreated)
  }

  await runGame(table.id, seatOccupants, allPlayersEverCreated)
  await printFinalState(table.id, allPlayersEverCreated)

  if (KEEP) {
    log('\n(--keep passé : table et comptes de test conservés pour inspection manuelle)')
    log(`Table ID : ${table.id}`)
  } else {
    await cleanup(table.id, allPlayersEverCreated)
  }
}

main()
  .then(() => {
    log('\n✅ Script terminé sans erreur.')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ Échec du script :', err)
    process.exit(1)
  })
