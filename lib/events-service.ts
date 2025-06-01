import { supabase } from "./supabase"
import type { DatabaseEvent } from "./supabase"
import type { Event } from "@/components/calendar-app"

// Convert database event to app event format
export function dbEventToAppEvent(dbEvent: DatabaseEvent): Event {
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description || undefined,
    date: new Date(dbEvent.event_date + "T12:00:00"), // Set to noon to avoid timezone issues
    startTime: dbEvent.start_time,
    endTime: dbEvent.end_time,
    location: dbEvent.location || undefined,
    color: dbEvent.color,
    reminder: dbEvent.reminder_minutes,
  }
}

// Convert app event to database format
export function appEventToDbEvent(
  event: Omit<Event, "id">,
  userId: string,
): Omit<DatabaseEvent, "id" | "created_at" | "updated_at"> {
  return {
    user_id: userId,
    title: event.title,
    description: event.description || null,
    event_date: event.date.toISOString().split("T")[0], // YYYY-MM-DD format
    start_time: event.startTime,
    end_time: event.endTime,
    location: event.location || null,
    color: event.color,
    reminder_minutes: event.reminder || 15,
    reminder_sent: false,
  }
}

export class EventsService {
  // Get all events for the current user
  static async getEvents(): Promise<Event[]> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`)
      }

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .order("event_date", { ascending: true })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return (data || []).map(dbEventToAppEvent)
    } catch (error) {
      console.error("Error in getEvents:", error)
      throw error
    }
  }

  // Create a new event
  static async createEvent(event: Omit<Event, "id">): Promise<Event> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`)
      }

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Check if user exists in the users table
      const { data: userData, error: userCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single()

      if (userCheckError || !userData) {
        console.log("User not found in users table, creating profile...")
        // Create user profile if it doesn't exist
        const { error: insertError } = await supabase.from("users").insert([
          {
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || "",
            telegram_notifications_enabled: true,
            reminder_notifications_enabled: true,
            creation_notifications_enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])

        if (insertError) {
          throw new Error(`Failed to create user profile: ${insertError.message}`)
        }
      }

      const dbEvent = appEventToDbEvent(event, user.id)

      const { data, error } = await supabase.from("events").insert([dbEvent]).select().single()

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      if (!data) {
        throw new Error("No data returned from database")
      }

      return dbEventToAppEvent(data)
    } catch (error) {
      console.error("Error in createEvent:", error)
      throw error
    }
  }

  // Update an existing event
  static async updateEvent(eventId: string, event: Omit<Event, "id">): Promise<Event> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`)
      }

      if (!user) {
        throw new Error("User not authenticated")
      }

      const dbEvent = appEventToDbEvent(event, user.id)

      const { data, error } = await supabase
        .from("events")
        .update({ ...dbEvent, updated_at: new Date().toISOString() })
        .eq("id", eventId)
        .eq("user_id", user.id) // Ensure user can only update their own events
        .select()
        .single()

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      if (!data) {
        throw new Error("No data returned from database")
      }

      return dbEventToAppEvent(data)
    } catch (error) {
      console.error("Error in updateEvent:", error)
      throw error
    }
  }

  // Delete an event
  static async deleteEvent(eventId: string): Promise<void> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`)
      }

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { error } = await supabase.from("events").delete().eq("id", eventId).eq("user_id", user.id) // Ensure user can only delete their own events

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }
    } catch (error) {
      console.error("Error in deleteEvent:", error)
      throw error
    }
  }
}
