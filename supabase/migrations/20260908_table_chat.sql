-- ==========================================================================
-- 20260908_table_chat.sql
-- Messages de discussion sur les tables online (Realtime).
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.kora_table_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL
    REFERENCES public.kora_tables (id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES auth.users (id) ON DELETE CASCADE,
  body text NOT NULL
    CHECK (char_length(body) >= 1 AND char_length(body) <= 280),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kora_table_messages_table_created_idx
  ON public.kora_table_messages (table_id, created_at DESC);

COMMENT ON TABLE public.kora_table_messages IS
  'Chat table : messages courts (280) pour joueurs et spectateurs.';

ALTER TABLE public.kora_table_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kora_table_messages_select" ON public.kora_table_messages;
CREATE POLICY "kora_table_messages_select"
  ON public.kora_table_messages
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "kora_table_messages_insert" ON public.kora_table_messages;
CREATE POLICY "kora_table_messages_insert"
  ON public.kora_table_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.kora_tables t
      WHERE t.id = table_id
        AND t.status IN ('lobby', 'playing')
    )
  );

REVOKE ALL ON public.kora_table_messages FROM anon;
GRANT SELECT, INSERT ON public.kora_table_messages TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.kora_table_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
