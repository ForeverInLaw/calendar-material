import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server"; // Import the function

export const dynamic = 'force-dynamic'; // Ensures the route is not statically generated

export async function GET(request: Request) { // Add request parameter
  try {
    const supabase = createServerClient(); // Call it HERE
    console.log("🔄 Checking for events starting now...");

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD format

    console.log(`Current time: ${currentDate} ${currentTime}`);

    const { data: events, error } = await supabase // Use the locally created client
        .from("events")
        .select(`
        *,
        users!inner(telegram_chat_id, reminder_notifications_enabled)
      `)
        .eq("event_date", currentDate)
        .eq("start_time", currentTime)
        .eq("users.reminder_notifications_enabled", true)
        .not("users.telegram_chat_id", "is", null);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 });
    }

    console.log(`Found ${events?.length || 0} events starting now`);

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No events starting at this time",
        count: 0,
        currentTime: `${currentDate} ${currentTime}`,
      });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const event of events) {
      // ... (rest of your Telegram logic) ...
      // Ensure 'event.users' exists before trying to access 'telegram_chat_id'
      const telegramChatId = event.users?.telegram_chat_id;

      if (!telegramChatId) {
        console.log(`⚠️ Skipping event ${event.id}: no Telegram chat ID or user relation`);
        errorCount++; // Count as an error or a skip
        continue;
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
      `.trim();

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
      message: `Processed ${events.length} events starting now`,
      successCount,
      errorCount,
      currentTime: `${currentDate} ${currentTime}`,
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