#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"
import fs from "fs"

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local")
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
} else {
  console.error("Error: .env.local file not found")
  process.exit(1)
}

// Validate required environment variables
const requiredEnvVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "TELEGRAM_BOT_TOKEN"]

const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName])
if (missingEnvVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingEnvVars.join(", ")}`)
  process.exit(1)
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Function to send Telegram message
async function sendTelegramMessage(chatId: string, message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error sending Telegram message:", error)
    return null
  }
}

// Main function to check for starting events
async function checkStartingEvents() {
  console.log("Checking for events starting now...")

  // Get current date and time
  const now = new Date()
  const currentDate = now.toISOString().split("T")[0]
  const currentHour = now.getHours().toString().padStart(2, "0")
  const currentMinute = now.getMinutes().toString().padStart(2, "0")
  const currentTime = `${currentHour}:${currentMinute}`

  console.log(`Current date: ${currentDate}, Current time: ${currentTime}`)

  try {
    // Query events that start now
    const { data: events, error } = await supabase
      .from("events")
      .select(`
        *,
        users:user_id (
          telegram_chat_id
        )
      `)
      .eq("event_date", currentDate)
      .eq("start_time", currentTime)

    if (error) {
      console.error("Error querying events:", error)
      return
    }

    console.log(`Found ${events?.length || 0} events starting now`)

    // Process each event
    for (const event of events || []) {
      const telegramChatId = event.users?.telegram_chat_id

      if (telegramChatId) {
        console.log(`Sending notification for event: ${event.title}`)

        const message = `
🔔 <b>Event Starting Now!</b>

<b>${event.title}</b>
${event.description ? `\n${event.description}` : ""}
${event.location ? `\n📍 ${event.location}` : ""}
⏰ ${event.start_time} - ${event.end_time}
`

        await sendTelegramMessage(telegramChatId, message)
        console.log(`Notification sent to chat ID: ${telegramChatId}`)
      } else {
        console.log(`No Telegram chat ID found for user: ${event.user_id}`)
      }
    }
  } catch (error) {
    console.error("Error in checkStartingEvents:", error)
  }
}

// Execute the check
checkStartingEvents()
  .then(() => {
    console.log("Event check completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
