CREATE TABLE public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mode text NOT NULL DEFAULT 'training',
  surah_number int NOT NULL,
  surah_name text NOT NULL,
  from_ayah int NOT NULL,
  to_ayah int NOT NULL,
  reciter_id text,
  score int NOT NULL DEFAULT 0,
  mistakes_count int NOT NULL DEFAULT 0,
  ayahs_total int NOT NULL DEFAULT 0,
  ayahs_correct int NOT NULL DEFAULT 0,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ts_select_own ON public.training_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ts_insert_own ON public.training_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ts_delete_own ON public.training_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_training_sessions_user ON public.training_sessions(user_id, created_at DESC);