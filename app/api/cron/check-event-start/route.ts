// app/api/cron/check-event-start/route.ts
import { NextResponse } from "next/server";
//import { createServerClient } from "@/lib/supabase-server";
import { formatInTimeZone } from 'date-fns-tz'; // Импортируем функцию
import { createServiceRoleClient } from "@/lib/supabase-server"; 

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Проверка секрета (если вы ее добавили)
  const CRON_SECRET = process.env.CRON_SECRET;
  const providedSecret = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (CRON_SECRET && providedSecret !== CRON_SECRET) {
    console.warn("Cron job: Unauthorized access attempt.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    console.log("🔄 Checking for events starting now (target timezone: UTC+2)...");

    const targetTimeZone = 'Europe/Berlin'; // Пример для UTC+2 (Центральноевропейское время)
                                          // Выберите наиболее подходящую IANA таймзону для UTC+2,
                                          // например, 'Europe/Paris', 'Europe/Warsaw', 'Africa/Cairo'
                                          // или используйте 'Etc/GMT-2' (обратите внимание на инверсию знака для Etc/GMT)

    // Получаем текущую дату и время на сервере (это будет UTC)
    const nowUtc = new Date();

    // Конвертируем текущее UTC время в целевой часовой пояс UTC+2
    // и форматируем его для сравнения с базой данных
    const currentTimeInTargetTZ = formatInTimeZone(nowUtc, targetTimeZone, 'HH:mm');
    const currentDateInTargetTZ = formatInTimeZone(nowUtc, targetTimeZone, 'yyyy-MM-dd');

    console.log(`Current time in ${targetTimeZone} (UTC+2 equivalent): ${currentDateInTargetTZ} ${currentTimeInTargetTZ}`);
    console.log(`(Server UTC time was: ${nowUtc.toISOString()})`);


    const { data: events, error } = await supabase
        .from("events")
        .select(`
        *,
        users!inner(telegram_chat_id, reminder_notifications_enabled)
      `)
        .eq("event_date", currentDateInTargetTZ) // Сравниваем с датой в UTC+2
        .eq("start_time", currentTimeInTargetTZ) // Сравниваем со временем в UTC+2
        .eq("users.reminder_notifications_enabled", true)
        .not("users.telegram_chat_id", "is", null);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 });
    }

    console.log(`Found ${events?.length || 0} events starting now in ${targetTimeZone}`);

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No events starting at this time in ${targetTimeZone}`,
        count: 0,
        currentTime: `${currentDateInTargetTZ} ${currentTimeInTargetTZ}`,
      });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const event of events) {
      const telegramChatId = event.users?.telegram_chat_id;

      if (!telegramChatId) {
        console.log(`⚠️ Skipping event ${event.id}: no Telegram chat ID or user relation`);
        errorCount++;
        continue;
      }

      // Форматирование даты события для сообщения пользователю
      // Используем event.event_date, которое должно быть в формате YYYY-MM-DD
      // и предполагается, что это дата в целевом часовом поясе (UTC+2)
      const eventDateForDisplay = new Date(`${event.event_date}T00:00:00`); // Создаем дату без учета TZ, чтобы toLocaleDateString сработало правильно для отображения
      
      const message = `
🚀 <b>Event Starting Now!</b>

📅 <b>${event.title}</b>

⏰ <b>Time:</b> ${event.start_time}${event.end_time ? ` - ${event.end_time}` : ""} (UTC+2)
🗓 <b>Date:</b> ${eventDateForDisplay.toLocaleDateString("en-US", { // или "de-DE", "fr-FR" и т.д. для нужного формата
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}${event.location ? `\n📍 <b>Location:</b> ${event.location}` : ""}${event.description ? `\n\n📝 <b>Description:</b> ${event.description}` : ""}

🎯 <i>Your event is starting right now!</i>
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
          },
      );

      if (telegramResponse.ok) {
        console.log(`✅ Start notification sent for event: ${event.title}`);
        successCount++;
      } else {
        const errorText = await telegramResponse.text();
        console.error(`❌ Failed to send Telegram notification for event ${event.id}:`, errorText);
        errorCount++;
      }
    }

    console.log(`✅ Check completed: ${successCount} notifications sent, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: `Processed ${events.length} events starting now in ${targetTimeZone}`,
      successCount,
      errorCount,
      currentTime: `${currentDateInTargetTZ} ${currentTimeInTargetTZ}`,
      events: events.map((e: any) => ({ id: e.id, title: e.title, start_time: e.start_time })),
    });
  } catch (error: any) {
    console.error("❌ Event start check error:", error);
    return NextResponse.json(
        { error: "Internal server error", details: error.message || "Unknown error" },
        { status: 500 },
    );
  }
}
