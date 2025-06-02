// /app/api/cron/check-event-reminders/route.ts
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server"; // Убедитесь, что эта функция создана и экспортируется
import { formatInTimeZone, toDate, zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { parseISO, addMinutes, parse } from 'date-fns';
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
      .not("users.telegram_chat_id", "is", null)
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
      let eventStartDateTimeInTargetTZ: Date; // Это будет объект Date, чьи "локальные" компоненты соответствуют targetTimeZone
      let eventStartDateTimeUtc: Date;      // Это будет объект Date, представляющий тот же момент времени, но в UTC
      try {
            const dateTimeStringFromDb = `${event.event_date} ${event.start_time}`;
            let baseFormat = 'yyyy-MM-dd HH:mm';
            if (event.start_time && event.start_time.split(':').length === 3) {
                baseFormat = 'yyyy-MM-dd HH:mm:ss';
            }

            // Шаг 1: Парсим строку из БД, как будто это дата и время в targetTimeZone.
            // `parse` (из date-fns) создает объект Date. Этот объект будет иметь UTC-эквивалент,
            // основанный на системном часовом поясе сервера, ЕСЛИ мы не скажем ему иное.
            // Чтобы это работало правильно с `date-fns-tz`, мы должны создать объект Date,
            // который *представляет* нужный момент времени.
            
            // `zonedTimeToUtc` берет строку и часовой пояс и возвращает Date объект в UTC.
            // `utcToZonedTime` берет UTC Date объект и часовой пояс и возвращает Date объект в этой зоне.

            // Правильный способ:
            // 1. Собрать строку.
            // 2. Использовать функцию, которая парсит строку + таймзону и дает UTC объект Date.
            //    или парсит строку как "локальную для зоны" и дает объект Date, чьи компоненты в этой зоне.

            // Попробуем так:
            // Сначала создаем объект Date, как будто числа из event_date и start_time являются компонентами UTC даты
            const [year, month, day] = event.event_date.split('-').map(Number);
            const [hour, minute, second = 0] = event.start_time.split(':').map(Number);
            
            // Создаем UTC дату из этих компонентов. Month в JS Date с 0.
            const utcDateFromComponents = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
            console.log(`[REMINDERS] Step 0 - UTC Date from components: ${utcDateFromComponents.toISOString()}`);


            // Теперь, если мы считаем, что YYYY-MM-DD HH:MM:SS из базы - это УЖЕ время в targetTimeZone (UTC+2),
            // то utcDateFromComponents (03:57Z) НЕПРАВИЛЬНО. Нам нужно, чтобы 03:57 в UTC+2 стало 01:57Z.
            
            // Новый подход:
            const dateString = event.event_date;
            const timeString = event.start_time.split(':').length === 2 ? event.start_time + ':00' : event.start_time;

            // Создаем объект Date, который корректно представляет "настенное" время в указанной зоне.
            // `parse` из date-fns-tz (если бы она была) была бы идеальна.
            // Используем `parse` из `date-fns` и `toDate` из `date-fns-tz`
            
            const tempParsedDate = parse(`${dateString} ${timeString}`, 'yyyy-MM-dd HH:mm:ss', new Date());
            if (isNaN(tempParsedDate.getTime())) {
                console.error(`[REMINDERS] Initial parse failed for "${dateString} ${timeString}"`);
                throw new Error("Initial parse failed");
            }
            // tempParsedDate теперь объект Date, который JavaScript интерпретирует в системном TZ сервера.
            // Нам нужно "сказать", что эти цифры на самом деле относятся к targetTimeZone.
            
            // eventStartDateTimeInTargetTZ будет объектом Date, чьи .getHours() и т.д. будут в targetTimeZone
            eventStartDateTimeInTargetTZ = toDate(tempParsedDate, { timeZone: targetTimeZone });
            // НО! Если tempParsedDate было 03:57 (серверное UTC), то toDate(..., {timeZone: 'Europe/Berlin'})
            // даст нам объект, который при вызове getHours() вернет 5, если сервер в UTC.
            // Это не то, что нам нужно.

            // **Самый надежный способ, если event_date и start_time - это "настенное" время в targetTimeZone:**
            const ianaTimeZone = targetTimeZone; // 'Europe/Berlin'
            const dateTimeStrForZone = `${event.event_date}T${timeString}`; // "2025-06-02T03:57:00"
            
            // zonedTimeToUtc: берет "настенное" время и зону, возвращает эквивалентный UTC Date объект.
            // Например, "2025-06-02T03:57:00" в "Europe/Berlin" (UTC+2) станет 2025-06-02T01:57:00Z.
            eventStartDateTimeUtc = zonedTimeToUtc(dateTimeStrForZone, ianaTimeZone);
            
            // utcToZonedTime: берет UTC Date объект и зону, возвращает "настенное" время в этой зоне.
            // Это будет объект Date, у которого getHours() вернет 3 для нашего примера, если выводить в консоль
            // или форматировать с учетом этой зоны.
            eventStartDateTimeInTargetTZ = utcToZonedTime(eventStartDateTimeUtc, ianaTimeZone);


            if (isNaN(eventStartDateTimeInTargetTZ.getTime())) {
                console.error(`[REMINDERS] Final date conversion resulted in NaN for event ${event.id}`);
                throw new Error("Final date conversion resulted in NaN");
            }
            console.log(`[REMINDERS] Event: "${event.title}" (ID: ${event.id})`);
            console.log(`  DB Date: ${event.event_date}, DB Time: ${event.start_time}`);
            console.log(`  Interpreted as Zoned Time (${ianaTimeZone}): ${formatInTimeZone(eventStartDateTimeInTargetTZ, ianaTimeZone, 'yyyy-MM-dd HH:mm:ssXXX')}`);
            console.log(`  Equivalent UTC: ${eventStartDateTimeUtc.toISOString()}`);

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
