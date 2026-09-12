// deleteEmptyTable.ts — purge une table online vide
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

/** Supprime une table vide (aucun siège) et ses données associées. */
export async function deleteEmptyTable(admin: SupabaseClient, tableId: string): Promise<void> {
  const { data: rounds } = await admin.from('kora_rounds').select('id').eq('table_id', tableId)
  const roundIds = (rounds ?? []).map((r: { id: string }) => r.id)
  if (roundIds.length > 0) {
    const { error: handsErr } = await admin.from('kora_round_hands').delete().in('round_id', roundIds)
    if (handsErr) console.error('[leave_table] delete hands:', handsErr.message)
    const { error: roundsErr } = await admin.from('kora_rounds').delete().eq('table_id', tableId)
    if (roundsErr) console.error('[leave_table] delete rounds:', roundsErr.message)
  }
  // kora_table_messages a ON DELETE CASCADE sur table_id
  const { error: playersErr } = await admin.from('kora_table_players').delete().eq('table_id', tableId)
  if (playersErr) console.error('[leave_table] delete players:', playersErr.message)
  const { error: tableErr } = await admin.from('kora_tables').delete().eq('id', tableId)
  if (tableErr) console.error('[leave_table] delete table:', tableErr.message)
}
