import { type NextRequest, NextResponse } from "next/server"
import { sendEventCreationConfirmation } from "@/app/actions"

export async function POST(request: NextRequest) {
  try {
    const { chatId } = await request.json()

    if (!chatId) {
      return NextResponse.json({ error: "Chat ID is required" }, { status: 400 })
    }

    // Отправляем тестовое сообщение
    await sendEventCreationConfirmation({
      title: "🧪 Test Event - Telegram Setup",
      date: new Date().toISOString().split("T")[0],
      startTime: "12:00",
      reminderMinutes: 15,
      chatId: chatId,
      description: "This is a test message to verify your Telegram bot setup is working correctly.",
      location: "Test Location",
    })

    return NextResponse.json({
      success: true,
      message: "Test message sent successfully",
    })
  } catch (error) {
    console.error("Failed to send test message:", error)
    return NextResponse.json({ error: "Failed to send test message" }, { status: 500 })
  }
}
