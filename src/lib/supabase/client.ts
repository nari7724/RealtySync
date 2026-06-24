import { createClient } from "@supabase/supabase-js";

// Access environment variables defensively
const supabaseUrl = 
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof import.meta !== "undefined" && (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  "https://uprykiqtdklubvhmrsai.supabase.co";

const supabaseAnonKey = 
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof import.meta !== "undefined" && (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  "sb_publishable_JNlbM9HDsTj6ihBjoNbFWg_PdhU7aNN";

if (!supabaseUrl) {
  console.warn("[Supabase] NEXT_PUBLIC_SUPABASE_URL is not set.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
