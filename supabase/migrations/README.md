# Hano Insider Supabase Migrations

Run these files in order in the Supabase SQL Editor for a fresh Hano Insider project:

1. `001_core_profiles.sql`
2. `002_cms_content.sql`
3. `003_likes_comments.sql`
4. `004_chat.sql`
5. `005_notifications_support.sql`
6. `006_affiliates_referrals.sql`
7. `007_stripe_subscriptions.sql`

These migrations are adapted from the Crypteum schema, but renamed and tightened for Hano Insider. They use `pgcrypto`/`gen_random_uuid()`, profile auto-creation from `auth.users`, RLS on all app tables, admin helper functions to avoid recursive profile policies, and Stripe-first subscription fields.

Payment storage is Stripe-first. Use the Stripe columns on `profiles` and `subscriptions.provider = 'stripe'`.

After running the migrations, create your first user through the app. The first profile created is automatically assigned `admin`.
