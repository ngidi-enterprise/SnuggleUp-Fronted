# Supabase JWT Configuration for Backend

## Where to find your Supabase JWT Secret

1. Go to your Supabase project dashboard
2. Navigate to: **Settings** → **API**
3. Scroll down to **JWT Settings**
4. Copy the **JWT Secret** value

## Add to Render Environment Variables

In your Render backend service:

1. Go to your service dashboard
2. Click **Environment** tab
3. Add this environment variable:
   - Key: `SUPABASE_JWT_SECRET`
   - Value: [paste the JWT Secret from Supabase]

## What this does

- Allows your backend to verify Supabase authentication tokens
- Users authenticated via Google/Facebook OAuth will be able to checkout
- The token is verified using Supabase's JWT secret, not your custom JWT

## Current Status

✅ Frontend sends token in Authorization header
✅ Backend middleware checks Supabase tokens
⚠️ You need to add SUPABASE_JWT_SECRET to Render environment variables

Without this env var set on Render, the backend will use a placeholder and token verification will fail.
