import { createClient } from "@supabase/supabase-js"

// Get environment variables with fallbacks for development/preview
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"

// Check if we're in a browser environment and not in preview mode
const isBrowser = typeof window !== "undefined"
const isValidUrl = supabaseUrl && !supabaseUrl.includes("your_supabase_url_here")

// Create client only if we have valid credentials or create a mock client for preview
export const supabase = isValidUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : isBrowser
    ? createClient("https://placeholder-url.supabase.co", "placeholder-key")
    : (null as any) // This allows the app to load in preview mode

// Types for our database tables
export interface User {
  id: string
  email: string
  full_name?: string
  telegram_chat_id?: string
  telegram_notifications_enabled: boolean
  reminder_notifications_enabled: boolean
  creation_notifications_enabled: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseEvent {
  id: string
  user_id: string
  title: string
  description?: string
  event_date: string
  start_time: string
  end_time: string
  location?: string
  color: string
  reminder_minutes: number
  reminder_sent: boolean
  created_at: string
  updated_at: string
}
