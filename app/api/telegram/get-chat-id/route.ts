import { NextResponse } from "next/server"
import { getBotInfo } from "@/app/actions"

export async function GET() {
  try {
    const result = await getBotInfo()

    if (!result.success) {
      return NextResponse.json({ success: false, error: "Failed to get bot info" }, { status: 500 })
    }

    // Генерируем случайный токен для идентификации пользователя
    const token = Math.random().toString(36).substring(2, 15)

    return NextResponse.json({
      success: true,
      botUsername: result.bot.username,
      token: token,
    })
  } catch (error) {
    console.error("Failed to generate start link:", error)
    return NextResponse.json({ success: false, error: "Failed to generate start link" }, { status: 500 })
  }
}
