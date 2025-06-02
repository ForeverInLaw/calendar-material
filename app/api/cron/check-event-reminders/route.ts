// /app/api/cron/check-event-reminders/route.ts
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server"; // Убедитесь, что эта функция создана и экспортируется
import { formatInTimeZone, addMinutes, parseISO, toDate } from 'date-fns-tz';
// `parseISO` и `toDate` могут быть полезны для более гибкой работы с датами.
// `parse` из 'date-fns-tz' (как в предыдущем примере) тоже подойдет, если формат строки известен.

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const CRON_SECRET = process.env.CRON_SECRET;
  const providedSecret = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (CRON_SECRET && providedSecret !== CRON_SECRET) {
    console.warn("Event Reminders Cron: Unauthorized access attempt.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    const targetTimeZone = process.env.TARGET_TIMEZONE || 'Europe/Berlin'; // Можно вынести в ENV
    console.log(`🔄 [REMINDERS] Checking for event reminders (target timezone: ${targetTimeZone})...`);

    const nowUtc = new Date(); // Текущее время сервера (UTC)
    // Конвертируем текущее UTC время в объект Date, представляющий время в целевой таймзоне
    const currentDateTimeInTargetTZObject = toDate(nowUtc, { timeZone: targetTimeZone });

    console.log(`[REMINDERS] Current datetime in ${targetTimeZone}: ${formatInTimeZone(currentDateTimeInTargetTZObject, targetTimeZone, 'yyyy-MM-dd HH:mm:ssXXX')}`);
    console.log(`[REMINDERS] (Server UTC time was: ${nowUtc.toISOString()})`);

    const { data: events, error } = await supabase
      .from("events")
      .select(`
        id,
        title,
        description,
        event_date,
        start_time,
        end_time,
        location,
        reminder_minutes,
        users!inner(telegram_chat_id, reminder_notifications_enabled)
      `)
      .eq("reminder_sent", false)
      .gt("reminder_minutes", 0)
      .not("users.telegram_chat_id", "is", null);
      .eq("users.reminder_notifications_enabled", true);

    if (error) {
      console.error("[REMINDERS] Database error fetching events for reminders:", error);
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 });
    }

    if (!events || events.length === 0) {
      console.log("[REMINDERS] No pending reminders to check at this moment.");
      return NextResponse.json({ success: true, message: "No pending reminders." });
    }

    console.log(`[REMINDERS] Found ${events.length} events with pending reminders to evaluate.`);
    let successCount = 0;
    let errorCount = 0;
    const eventsToUpdateReminderSent = [];

    for (const event of events) {
      try {
        // event.event_date (YYYY-MM-DD), event.start_time (HH:MM или HH:MM:SS)
        // Эти значения предполагаются как дата/время в targetTimeZone
        const eventStartDateTimeStr = `${event.event_date}T${event.start_time}`;
        
        let eventStartDateTimeInTargetTZ: Date;
        try {
            // Пытаемся распарсить с секундами, потом без, если не вышло
            if (event.start_time.split(':').length === 3) {
                eventStartDateTimeInTargetTZ = toDate(parseISO(eventStartDateTimeStr), { timeZone: targetTimeZone });
            } else {
                 eventStartDateTimeInTargetTZ = toDate(parseISO(eventStartDateTimeStr + ":00"), { timeZone: targetTimeZone });
            }
           
            if (isNaN(eventStartDateTimeInTargetTZ.getTime())) throw new Error("Parsed date is NaN");

        } catch (parseError: any) {
            console.error(`[REMINDERS] Invalid date/time format for event ${event.id}: "${eventStartDateTimeStr}". Error: ${parseError.message}`);
            errorCount++;
            continue;
        }
        
        const reminderTimeInTargetTZ = addMinutes(eventStartDateTimeInTargetTZ, -event.reminder_minutes);

        // Округляем ОБА времени до начала минуты для сравнения, чтобы избежать проблем с секундами/миллисекундами
        const reminderTimeMinuteStart = new Date(
            reminderTimeInTargetTZ.getFullYear(),
            reminderTimeInTargetTZ.getMonth(),
            reminderTimeInTargetTZ.getDate(),
            reminderTimeInTargetTZ.getHours(),
            reminderTimeInTargetTZ.getMinutes(),
            0, 0 // обнуляем секунды и миллисекунды
        );
        const currentTimeMinuteStart = new Date(
            currentDateTimeInTargetTZObject.getFullYear(),
            currentDateTimeInTargetTZObject.getMonth(),
            currentDateTimeInTargetTZObject.getDate(),
            currentDateTimeInTargetTZObject.getHours(),
            currentDateTimeInTargetTZObject.getMinutes(),
            0, 0 // обнуляем секунды и миллисекунды
        );
        
        console.log(`[REMINDERS] Event: "${event.title}" (ID: ${event.id}), Start: ${formatInTimeZone(eventStartDateTimeInTargetTZ, targetTimeZone, 'yyyy-MM-dd HH:mm:ss')}, Reminder should be at: ${formatInTimeZone(reminderTimeMinuteStart, targetTimeZone, 'yyyy-MM-dd HH:mm:ss')}`);

        if (reminderTimeMinuteStart.getTime() === currentTimeMinuteStart.getTime()) {
          console.log(`[REMINDERS] Sending reminder for event: "${event.title}"`);
          const telegramChatId = event.users?.telegram_chat_id;

          if (!telegramChatId) {
            console.warn(`[REMINDERS] Skipping reminder for event ${event.id}: no Telegram chat ID.`);
            errorCount++;
            continue;
          }
          
          const eventDateForDisplay = toDate(parseISO(`${event.event_date}T00:00:00`), {timeZone: targetTimeZone});

          const message = `
🔔 <b>Event Reminder!</b>

📅 <b>${event.title}</b> is starting in ${event.reminder_minutes} minutes!

⏰ <b>Time:</b> ${event.start_time}${event.end_time ? ` - ${event.end_time}` : ""} (${targetTimeZone.split('/')[1] || targetTimeZone})
🗓 <b>Date:</b> ${formatInTimeZone(eventDateForDisplay, targetTimeZone, "eeee, MMMM d, yyyy")}${event.location ? `\n📍 <b>Location:</b> ${event.location}` : ""}${event.description ? `\n\n📝 <b>Description:</b> ${event.description}` : ""}

✨ <i>Get ready!</i>
          `.trim();

          const telegramResponse = await fetch(
              `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: telegramChatId,
                  text: message,
                  parse_mode: "HTML",
                }),
              }
          );

          if (telegramResponse.ok) {
            console.log(`[REMINDERS] ✅ Reminder sent for event: "${event.title}"`);
            eventsToUpdateReminderSent.push(event.id);
            successCount++;
          } else {
            const errorText = await telegramResponse.text();
            console.error(`[REMINDERS] ❌ Failed to send Telegram reminder for event ${event.id}:`, errorText);
            errorCount++;
          }
        }
      } catch (e: any) {
        console.error(`[REMINDERS] Error processing reminder for event ${event.id}:`, e.message, e.stack);
        errorCount++;
      }
    }

    if (eventsToUpdateReminderSent.length > 0) {
      const { error: updateError } = await supabase
        .from("events")
        .update({ reminder_sent: true, updated_at: new Date().toISOString() })
        .in("id", eventsToUpdateReminderSent);

      if (updateError) {
        console.error("[REMINDERS] Error updating reminder_sent flag:", updateError);
      } else {
        console.log(`[REMINDERS] Updated reminder_sent for ${eventsToUpdateReminderSent.length} events.`);
      }
    }

    console.log(`[REMINDERS] ✅ Reminder check completed: ${successCount} reminders sent, ${errorCount} errors during processing.`);
    return NextResponse.json({
      success: true,
      message: `Reminder check completed. Sent: ${successCount}, Errors: ${errorCount}.`,
      successCount,
      errorCount
    });

  } catch (error: any) {
    console.error("❌ [REMINDERS] Event reminder check fatal error:", error);
    return NextResponse.json(
        { error: "Internal server error", details: error.message || "Unknown error" },
        { status: 500 },
    );
  }
}
