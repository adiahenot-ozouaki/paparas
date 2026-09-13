// ==========================================================================
// index.ts — Edge Function `kora-game-engine` (router).
// ==========================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'
import type { Card } from './engine/types.ts'
import {
  authenticate,
  errorResponse,
  findCallerSeat,
  handleBankPlayer,
  handleClaimVictory,
  handleGetState,
  handleLeaveTable,
  handlePlayCard,
  handleResolveTrick,
  handleStartNextRound,
  handleStartTable,
  loadSeats,
} from './handlers.ts'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }})
  }
  if (req.method !== 'POST') {
    return errorResponse('Méthode non autorisée.', 405)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  try {
    const { userId } = await authenticate(req, admin)
    const body = (await req.json()) as Record<string, unknown>
    const action = String(body.action ?? '')
    const tableId = String(body.tableId ?? '')
    if (!tableId) return errorResponse('Champ "tableId" manquant.')

    const seats = await loadSeats(admin, tableId)
    const callerSeat = findCallerSeat(seats, userId)
    switch (action) {
      case 'start_table':
        return await handleStartTable(admin, tableId, callerSeat.seat_index)
      case 'get_state':
        return await handleGetState(admin, tableId, callerSeat.seat_index)
      case 'play_card': {
        if (!body.card) return errorResponse('Champ "card" manquant.')
        return await handlePlayCard(admin, tableId, callerSeat.seat_index, body.card as Card)
      }
      case 'resolve_trick':
        return await handleResolveTrick(admin, tableId, callerSeat.seat_index)
      case 'bank_player':
        return await handleBankPlayer(admin, tableId, callerSeat.seat_index)
      case 'claim_victory':
        return await handleClaimVictory(admin, tableId, callerSeat.seat_index)
      case 'start_next_round':
        return await handleStartNextRound(admin, tableId, callerSeat.seat_index)
      case 'leave_table':
        return await handleLeaveTable(admin, tableId, callerSeat.seat_index, userId)
      default:
        return errorResponse(`Action inconnue : "${action}".`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === 'UNAUTHENTICATED') return errorResponse('Authentification requise.', 401)
    return errorResponse(message, 400)
  }
})
