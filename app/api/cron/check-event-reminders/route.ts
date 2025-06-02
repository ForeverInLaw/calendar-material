// /app/api/cron/check-event-reminders/route.ts
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { formatInTimeZone, toDate, zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { addMinutes, parse } from 'date-fns';

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
    const targetTimeZone = process.env.TARGET_TIMEZONE || 'Europe/Berlin';
    console.log(`🔄 [REMINDERS] Checking for event reminders (target timezone: ${targetTimeZone})...`);

    const nowUtc = new Date();
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
        color,
        reminder_minutes,
        users!inner(telegram_chat_id, reminder_notifications_enabled)
      `)
      .eq("reminder_sent", false)
      .gt("reminder_minutes", 0)
      .not("users.telegram_chat_id", "is", null)
      .eq("users.reminder_notifications_enabled", true);

    if (error) {
      console.error("[REMINDERS] Database error fetching events for reminders:", JSON.stringify(error, null, 2));
      return NextResponse.json({ error: "Database error", details: error.message, code: error.code }, { status: 500 });
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
      try { // ЕДИНСТВЕННЫЙ TRY ВНУТРИ ЦИКЛА ДЛЯ ВСЕЙ ЛОГИКИ ОБРАБОТКИ ОДНОГО СОБЫТИЯ
        let eventStartDateTimeInTargetTZ: Date;
        let eventStartDateTimeUtc: Date;

        const dateString = event.event_date; // YYYY-MM-DD
        // Обеспечиваем, чтобы timeString всегда был HH:MM:SS
        let timeString = event.start_time;
        if (event.start_time && event.start_time.split(':').length === 2) {
            timeString = event.start_time + ':00'; // Добавляем секунды, если их нет
        } else if (!event.start_time) { // Обработка случая, если start_time пустой (маловероятно, но для защиты)
            console.error(`[REMINDERS] Event ${event.id} has missing start_time.`);
            throw new Error(`Event ${event.id} has missing start_time.`);
        }
        
        const ianaTimeZone = targetTimeZone;
        const dateTimeStrForZone = `${dateString}T${timeString}`; // "YYYY-MM-DDTHH:MM:SS"

        eventStartDateTimeUtc = zonedTimeToUtc(dateTimeStrForZone, ianaTimeZone);
        eventStartDateTimeInTargetTZ = utcToZonedTime(eventStartDateTimeUtc, ianaTimeZone);

        if (isNaN(eventStartDateTimeInTargetTZ.getTime())) {
            console.error(`[REMINDERS] Final date conversion resulted in NaN for event ${event.id} using string "${dateTimeStrForZone}" and timezone "${ianaTimeZone}"`);
            throw new Error("Final date conversion resulted in NaN for event start time");
        }
        
        // Логирование для отладки дат
        // console.log(`[REMINDERS] Processing Event: "${event.title}" (ID: ${event.id})`);
        // console.log(`  DB Date: ${event.event_date}, DB Time: ${event.start_time}`);
        // console.log(`  Interpreted as Zoned Time (${ianaTimeZone}): ${formatInTimeZone(eventStartDateTimeInTargetTZ, ianaTimeZone, 'yyyy-MM-dd HH:mm:ssXXX')}`);
        // console.log(`  Equivalent UTC: ${eventStartDateTimeUtc.toISOString()}`);
        
        const reminderTimeInTargetTZ = addMinutes(eventStartDateTimeInTargetTZ, -event.reminder_minutes);

        const reminderTimeMinuteStart = new Date(
            reminderTimeInTargetTZ.getFullYear(),
            reminderTimeInTargetTZ.getMonth(),
            reminderTimeInTargetTZ.getDate(),
            reminderTimeInTargetTZ.getHours(),
            reminderTimeInTargetTZ.getMinutes(),
            0, 0
        );
        const currentTimeMinuteStart = new Date(
            currentDateTimeInTargetTZObject.getFullYear(),
            currentDateTimeInTargetTZObject.getMonth(),
            currentDateTimeInTargetTZObject.getDate(),
            currentDateTimeInTargetTZObject.getHours(),
            currentDateTimeInTargetTZObject.getMinutes(),
            0, 0
        );
        
        console.log(`[REMINDERS] Event: "${event.title}" (Eval), Actual Start in TZ: ${formatInTimeZone(eventStartDateTimeInTargetTZ, targetTimeZone, 'yyyy-MM-dd HH:mm:ss')}, Calculated Reminder Time in TZ: ${formatInTimeZone(reminderTimeMinuteStart, targetTimeZone, 'yyyy-MM-dd HH:mm:ss')}`);

        if (reminderTimeMinuteStart.getTime() === currentTimeMinuteStart.getTime()) {
          console.log(`[REMINDERS] Sending reminder for event: "${event.title}"`);
          const telegramChatId = event.users?.telegram_chat_id;

          if (!telegramChatId) {
            console.warn(`[REMINDERS] Skipping reminder for event ${event.id}: no Telegram chat ID.`);
            continue;
          }
          
          const eventDateForDisplay = parse(event.event_date, 'yyyy-MM-dd', new Date());

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
        console.error(`[REMINDERS] Error processing event ${event.id} ("${event.title}"):`, e.message, e.stack);
        errorCount++;
      }
    }

    if (eventsToUpdateReminderSent.length > 0) {
      const { error: updateError } = await supabase
        .from("events")
        .update({ reminder_sent: true, updated_at: new Date().toISOString() })
        .in("id", eventsToUpdateReminderSent);

      if (updateError) {
        console.error("[REMINDERS] Error updating reminder_sent flag:", JSON.stringify(updateError, null, 2));
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
        { error: "Internal server error", details: error.message || "Unknown error", stack: error.stack },
        { status: 500 },
    );
  }
}
