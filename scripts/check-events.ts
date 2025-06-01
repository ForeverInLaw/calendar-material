#!/usr/bin/env tsx

import { createClient } from "@supabase/supabase-js"

// Настройки Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkEventStart() {
  try {
    console.log("🔄 Checking for events starting now...")

    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
    const currentDate = now.toISOString().split("T")[0] // YYYY-MM-DD format

    console.log(`Current time: ${currentDate} ${currentTime}`)

    // Получаем события, которые начинаются прямо сейчас
    const { data: events, error } = await supabase
      .from("events")
      .select(`
        *,
        users!inner(telegram_chat_id, reminder_notifications_enabled)
      `)
      .eq("event_date", currentDate)
      .eq("start_time", currentTime)
      .eq("users.reminder_notifications_enabled", true)
      .not("users.telegram_chat_id", "is", null)

    if (error) {
      console.error("Database error:", error)
      process.exit(1)
    }

    console.log(`Found ${events?.length || 0} events starting now`)

    if (!events || events.length === 0) {
      console.log("✅ No events starting at this time")
      return
    }

    let successCount = 0
    let errorCount = 0

    // Отправляем уведомления о начале событий
    for (const event of events) {
      try {
        const telegramChatId = event.users.telegram_chat_id

        if (!telegramChatId) {
          console.log(`⚠️ Skipping event ${event.id}: no Telegram chat ID`)
          continue
        }

        const message = `
🚀 <b>Event Starting Now!</b>

📅 <b>${event.title}</b>

⏰ <b>Time:</b> ${event.start_time}${event.end_time ? ` - ${event.end_time}` : ""}
🗓 <b>Date:</b> ${new Date(event.event_date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}${event.location ? `\n📍 <b>Location:</b> ${event.location}` : ""}${event.description ? `\n\n📝 <b>Description:</b> ${event.description}` : ""}

🎯 <i>Your event is starting right now!</i>
        `.trim()

        // Отправляем уведомление в Telegram
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: message,
              parse_mode: "HTML",
            }),
          },
        )

        if (telegramResponse.ok) {
          console.log(`✅ Start notification sent for event: ${event.title}`)
          successCount++
        } else {
          const errorText = await telegramResponse.text()
          console.error(`❌ Failed to send Telegram notification for event ${event.id}:`, errorText)
          errorCount++
        }
      } catch (error) {
        console.error(`❌ Error processing event ${event.id}:`, error)
        errorCount++
      }
    }

    console.log(`✅ Check completed: ${successCount} notifications sent, ${errorCount} errors`)
  } catch (error) {
    console.error("❌ Event start check error:", error)
    process.exit(1)
  }
}

// Запускаем проверку
checkEventStart()
