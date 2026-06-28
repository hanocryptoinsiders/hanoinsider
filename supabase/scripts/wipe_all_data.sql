-- =============================================================================
-- WIPE ALL DATA — keeps tables, views, RLS, functions, and storage bucket config
-- =============================================================================
-- ⚠️  IRREVERSIBLE. Run only in Supabase SQL Editor (postgres role) or via CLI.
--
-- Clears:
--   • All public app tables
--   • All auth users (login accounts)
--
-- Clear storage separately (SQL not allowed on storage.objects):
--   Dashboard → Storage → content-images → delete all files
--
-- Does NOT drop:
--   • Table/view/function definitions
--   • Migrations history
--   • Storage bucket configuration
-- =============================================================================

BEGIN;

-- 1) Public schema — truncate every base table (views are untouched)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname NOT IN ('schema_migrations')
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', r.tablename);
  END LOOP;
END $$;

-- 2) Re-seed default chat rooms (removed by truncate)
INSERT INTO public.chat_rooms (slug, name, description, icon, admin_only, position)
VALUES
  ('announcements', 'Announcements', 'Official updates from The Hano Insider team.', 'megaphone', true, 0),
  ('general', 'General', 'Premium member discussion.', 'message-circle', false, 1),
  ('signals', 'Signals', 'Market signals and trade ideas.', 'radio', false, 2),
  ('macro', 'Macro', 'Macro analysis, rates, liquidity, and markets.', 'globe', false, 3),
  ('on-chain', 'On-Chain', 'On-chain data, flows, and analytics.', 'link', false, 4)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  admin_only = EXCLUDED.admin_only,
  position = EXCLUDED.position;

-- 3) Remove all Supabase Auth users (login accounts)
DELETE FROM auth.users;

-- 4) Storage files — direct DELETE on storage.objects is blocked by Supabase.
--    Clear uploads manually after this script:
--    Dashboard → Storage → content-images → Select all → Delete
--    Or use: supabase storage rm ss:///content-images --recursive --experimental

COMMIT;

-- After running:
-- • Register a new account — the FIRST signup becomes admin (see handle_new_user).
-- • Or create a user in Authentication → Users, then:
--     UPDATE public.profiles SET role = 'admin', is_premium = true,
--       subscription_status = 'active', premium_source = 'manual'
--     WHERE email = 'your@email.com';
