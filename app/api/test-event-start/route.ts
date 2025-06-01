import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server"; // Import the function

export const dynamic = 'force-dynamic'; // Ensures the route is not statically generated

export async function POST(request: Request) { // Add request parameter
  try {
    const supabase = createServerClient(); // Call it HERE
    console.log("🧪 Manual test: checking for events starting now...");

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

    // ... (rest of your logic, similar to the GET route, using the 'supabase' instance) ...
    let successCount = 0;
    let errorCount = 0;

    for (const event of events) {
      const telegramChatId = event.users?.telegram_chat_id;

      if (!telegramChatId) {
        console.log(`⚠️ Skipping event ${event.id}: no Telegram chat ID or user relation`);
        errorCount++;
        continue;
      }

      const message = `
🧪 <b>TEST: Event Starting Now!</b>

📅 <b>${event.title}</b>

⏰ <b>Time:</b> ${event.start_time}${event.end_time ? ` - ${event.end_time}` : ""}
🗓 <b>Date:</b> ${new Date(event.event_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}${event.location ? `\n📍 <b>Location:</b> ${event.location}` : ""}${event.description ? `\n\n📝 <b>Description:</b> ${event.description}` : ""}

🎯 <i>This is a test notification - your event is starting right now!</i>
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
        console.log(`✅ Test notification sent for event: ${event.title}`);
        successCount++;
      } else {
        const errorText = await telegramResponse.text();
        console.error(`❌ Failed to send test notification for event ${event.id}:`, errorText);
        errorCount++;
      }
    }


    return NextResponse.json({
      success: true,
      message: `Test completed: processed ${events?.length || 0} events starting now`,
      successCount,
      errorCount,
      currentTime: `${currentDate} ${currentTime}`,
      events: (events || []).map((e: any) => ({ id: e.id, title: e.title, start_time: e.start_time })),
    });
  } catch (error: any) {
    console.error("❌ Test event start check error:", error);
    return NextResponse.json(
        { error: "Internal server error", details: error.message || "Unknown error" },
        { status: 500 },
    );
  }
}