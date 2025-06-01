import { type NextRequest, NextResponse } from "next/server"
import { sendEventCreationConfirmation } from "@/app/actions"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Отправляем тестовое письмо
    await sendEventCreationConfirmation({
      title: "Test Event - Email Configuration",
      date: new Date().toISOString().split("T")[0],
      startTime: "12:00",
      reminderMinutes: 15,
      userEmail: email,
      description: "This is a test email to verify your email notification setup is working correctly.",
      location: "Test Location",
    })

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
    })
  } catch (error) {
    console.error("Failed to send test email:", error)
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 })
  }
}
