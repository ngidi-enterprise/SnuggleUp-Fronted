# Supabase Auth & Database Setup

This project is configured to use Supabase for authentication on the frontend. Follow these steps to set up your Supabase project and connect it locally.

## 1) Create a Supabase Project
- Go to https://supabase.com and create a new project
- Copy your Project URL and anon public key

## 2) Configure environment variables (frontend)
- Copy `frontend/.env.example` to `frontend/.env`
- Fill in your values:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Note: Vite exposes only variables prefixed with `VITE_`.

## 3) Install dependencies
Run in the frontend folder:

```powershell
cd "c:\Users\MHlomuka\Downloads\Workspace\frontend"
npm install
```

This installs `@supabase/supabase-js` used by the app.

## 4) Configure auth email links and OAuth providers
In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: Your local or deployed URL (e.g., http://localhost:5173)
- Redirect URLs: Add the reset path used by the app: `http://localhost:5173/#/reset-password`

The app will send password reset emails that redirect to this route and then call `supabase.auth.updateUser({ password })`.

### Google (already done per your screenshot)
- In Google Cloud Console → Credentials → OAuth 2.0 Client IDs
- Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Copy Client ID and Secret into Supabase → Authentication → Providers → Google

### Facebook
- Go to https://developers.facebook.com → Create App → Type: Consumer
- Add product: Facebook Login → Settings → Valid OAuth Redirect URIs:
  - `https://<your-project-ref>.supabase.co/auth/v1/callback`
- App Domains: your site domain (or localhost for dev)
- In Supabase → Authentication → Providers → Facebook: paste App ID and App Secret and enable

### Apple
- Apple Developer → Identifiers → Keys: create a new key with Sign In with Apple enabled
- Create a Services ID (web) and associate it with your app
- Configure Web Domain and Return URL:
  - Return URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`
- In Supabase → Providers → Apple: enter Services ID, Team ID, Key ID, upload the private key (.p8)

### TikTok
- Note: TikTok is not universally available as a built‑in Supabase provider. If it appears in your Providers list, enable it and use the same redirect URL:
  - `https://<your-project-ref>.supabase.co/auth/v1/callback`
- If not available, options:
  1) Implement a custom OAuth flow on your backend with TikTok and then create/sign in the user in Supabase (e.g., via passwordless or linking by email).
  2) Use a third‑party auth broker that supports TikTok, then exchange sessions to Supabase. This is an advanced setup.

## 5) User profile data
On sign-up, the app stores `name` and `phone` in `user_metadata`. If you want richer profiles (addresses, avatars), create a `profiles` table and populate it via RLS policies.

Example SQL for a simple profiles table:

```sql
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  phone text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by owner"
  on profiles for select using ( auth.uid() = id );

create policy "Profiles are insertable by owner"
  on profiles for insert with check ( auth.uid() = id );

create policy "Profiles are updatable by owner"
  on profiles for update using ( auth.uid() = id );
```

You can insert a profile row on first login using a database trigger or client-side after sign-up.

## 6) Orders (optional, if moving orders to Supabase)
If you want to migrate orders from the custom backend DB to Supabase, you can start with this schema:

```sql
create table if not exists orders (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_number text unique not null,
  items jsonb not null,
  subtotal numeric not null,
  shipping numeric not null,
  discount numeric default 0,
  total numeric not null,
  status text default 'pending',
  payfast_payment_id text,
  payfast_signature text,
  customer_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table orders enable row level security;

create policy "Users can view own orders"
  on orders for select using ( auth.uid() = user_id );

create policy "Users can insert own orders"
  on orders for insert with check ( auth.uid() = user_id );
```

Then update the frontend to read/write orders via Supabase instead of the external backend. For PayFast webhooks, keep your Node backend for server-to-server notifications and write to Supabase using a service key.

## 7) Running locally
```powershell
cd "c:\Users\MHlomuka\Downloads\Workspace\frontend"
npm run dev
```

Open the shown URL. Register and login should work with Supabase. Password resets will send emails if you’ve configured SMTP (Supabase Auth → Email). For local testing without email, use the “Reset Password” flow with a manual link from Supabase auth logs.

## 8) Notes
- Supabase session is persisted automatically; `AuthContext` will reflect changes via `onAuthStateChange`.
- We map Supabase `user_metadata` to `{ name, phone }` in the app.
- Order history in `UserAccount` still points to the previous backend; migrate when ready using the schema above.
