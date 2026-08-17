import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fails loudly at startup rather than silently returning empty data later.
  // Copy .env.example to .env and fill in your Supabase project values.
  console.warn(
    'Supabase env vars are missing. Copy .env.example to .env and set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(url, anonKey)
