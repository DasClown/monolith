# Cloud accounts, Supabase, and Paddle

This is the production setup for optional login, cloud saves, and real-money
supporter purchases.

## Current safe defaults

- No Supabase env: cloud UI is hidden and the game stays local-only.
- No Paddle env: Vault shows `VAULT CLOSED`; nothing can be bought or unlocked for free.
- Development (`import.meta.env.DEV`): the mock adapter may still grant purchases locally.
- Production requires both Supabase and Paddle configuration before the live store opens.

## 1. Supabase

1. Create a project at https://supabase.com.
2. Copy the project URL and anon key into `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Run `supabase/migrations/001_cloud.sql` in the SQL editor, or use the Supabase CLI.
4. Enable the auth provider you want:
   - Email magic link (requires SMTP in production)
   - Google OAuth
5. In Authentication > URL Configuration, set:
   - Site URL: your deployed game URL
   - Redirect URL: the same URL, including `/monolith-defense/` for GitHub Pages
6. Deploy the webhook:
   ```bash
   supabase functions deploy paddle-webhook --no-verify-jwt
   ```
7. Add function secrets:
   ```bash
   supabase secrets set \
     PADDLE_WEBHOOK_SECRET=... \
     PADDLE_PRICE_SUPPORTER=pri_... \
     PADDLE_PRICE_COIN_DOUBLER=pri_... \
     PADDLE_PRICE_BATTLE_PASS=pri_...
   ```

The tables use Row Level Security. Players can read and write only their own save
and profile, can read only their own entitlements and purchases, and the webhook
uses the service-role key to write entitlements.

## 2. Paddle

1. Create a Paddle account and a sandbox first.
2. Create prices for:
   - Supporter Pack
   - Coin Doubler
   - Neon Pass
3. Add the client token and price IDs to `.env.local`:
   - `VITE_PADDLE_CLIENT_TOKEN`
   - `VITE_PADDLE_ENV=sandbox`
   - `VITE_PADDLE_PRICE_SUPPORTER`
   - `VITE_PADDLE_PRICE_COIN_DOUBLER`
   - `VITE_PADDLE_PRICE_BATTLE_PASS`
4. Create a webhook pointing to:
   `https://<project>.supabase.co/functions/v1/paddle-webhook`
5. Subscribe to `transaction.completed`.
6. Put the webhook secret into the Supabase function secret above.
7. Test with Paddle sandbox cards before switching `VITE_PADDLE_ENV` to `production`.

The client never grants an entitlement. It opens Paddle Checkout, and the signed
webhook writes the entitlement server-side. The client polls `entitlements` and
offers a `SYNC PURCHASES` button.

## 3. GitHub Pages secrets

Add these repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PADDLE_CLIENT_TOKEN`
- `VITE_PADDLE_ENV`
- `VITE_PADDLE_PRICE_SUPPORTER`
- `VITE_PADDLE_PRICE_COIN_DOUBLER`
- `VITE_PADDLE_PRICE_BATTLE_PASS`

The Pages workflow passes them into `npm run build:pages`.

## 4. Legal checklist

Before enabling live payments, prepare:

- Impressum
- Datenschutzerklärung
- AGB
- Widerrufsbelehrung for digital content
- Refund and support process
- Account deletion and data export
- VAT/tax handling and invoices
- Age and youth-protection review

Paddle or Stripe Managed Payments can act as merchant of record, but the game
still needs its own legal pages and support process. This is not legal advice.

## 5. Recommended product model

Keep the core game free. Sell:

- Supporter Pack (cosmetic badge, one-time)
- Optional permanent convenience (coin doubler)
- Seasonal cosmetic pass later

Do not sell exclusive damage, wave skips, or leaderboard power. Daily leaderboard
runs should normalize paid progression before a global board is launched.
