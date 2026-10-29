# Bot Access System — Cyberpunk Edition

## Important separation
Deploy this folder as a NEW Vercel project with Root Directory set to `bot-access-cyberpunk`.
Keep the old Vercel project and its old Supabase project unchanged. Do not replace files at the repository root or modify the old project's environment variables.

## 1. New Supabase project
1. Create a new Supabase project.
2. Open SQL Editor and run the complete `schema.sql` file from this folder. It creates `public.bot_access` and `public.user_roles` in the NEW database.
3. In Project Settings / API (or API Keys), copy the Project URL and the publishable/anon public key for frontend configuration. Never use a service-role/secret key in HTML.
4. In Authentication settings, configure the Site URL to the NEW Vercel deployment URL after first deployment. Configure email/SMTP if admin invitation emails should be delivered reliably.

## 2. Frontend config
In `index.html`, replace `SET_SUPABASE_URL` with the new Supabase Project URL and `SET_SUPABASE_ANON_KEY` with the new publishable/anon public key. These are the only Supabase values allowed in the HTML.

## 3. New Vercel project
Import the existing GitHub repository as a NEW Vercel project. Set Root Directory to `bot-access-cyberpunk` and Framework Preset to Other if prompted. Add Production environment variables:
- `SUPABASE_URL` = new Supabase Project URL
- `SUPABASE_SERVICE_ROLE_KEY` = new Supabase service-role/secret key (server only)
- `BOT_API_KEY` = the exact same API key currently configured in the Mona SC hosting environment
- `OWNER_SETUP_TOKEN` = a long, random, one-time token you create

Never put `SUPABASE_SERVICE_ROLE_KEY`, `BOT_API_KEY`, or `OWNER_SETUP_TOKEN` in `index.html` or GitHub.

## 4. First Owner account
1. Deploy the new Vercel project.
2. Open the new deployment URL, choose OWNER SETUP, and enter the one-time token, Owner email, and a password of at least 12 characters.
3. Sign in with the Owner account.
4. Remove `OWNER_SETUP_TOKEN` from the new Vercel project's environment variables and redeploy. Do not remove it from the old project because it should not exist there.

## 5. Admins and bot numbers
The Owner can use Admin Accounts to invite admin email addresses. Supabase email delivery/SMTP must be configured for invites. Use the Bots page to add, enable, disable, or delete numbers in this NEW database.

## Mona SC API compatibility
The endpoint is `POST /api/check` with JSON `{ "number": "628..." }` and header `x-api-key: <BOT_API_KEY>`. It returns `{ "success": true, "registered": true|false }`.

**Important:** Mona SC will keep using the old endpoint unless you deliberately change its URL. This new project uses a new database, so its bot number list is separate. Do not switch Mona to the new endpoint unless you intentionally want it to use this new database and have tested it.
