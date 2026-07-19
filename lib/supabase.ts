import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const disabled = process.env.NEXT_PUBLIC_DISABLE_SUPABASE === "true";

export const supabase: SupabaseClient | null = !disabled && url && anonKey ? createClient(url, anonKey) : null;
export const supabaseEnabled = Boolean(supabase);
