import { NextResponse } from "next/server"

export async function POST() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      return NextResponse.json({ success: false, error: "Bot token not configured" }, { status: 500 })
    }

    // Получаем URL текущего приложения
    const host = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL

    if (!host) {
      return NextResponse.json(
        {
          success: false,
          error: "VERCEL_URL not available. Please deploy to Vercel or set NEXT_PUBLIC_VERCEL_URL manually.",
        },
        { status: 500 },
      )
    }

    const webhookUrl = `https://${host}/api/telegram/webhook`

    // Настраиваем webhook
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        {
          success: false,
          error: `Failed to set webhook: ${JSON.stringify(errorData)}`,
        },
        { status: 500 },
      )
    }

    // Получаем информацию о текущем webhook
    const webhookInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`)
    const webhookInfo = await webhookInfoResponse.json()

    return NextResponse.json({
      success: true,
      message: "Webhook setup successful",
      webhookUrl,
      webhookInfo: webhookInfo.result,
    })
  } catch (error) {
    console.error("Failed to setup webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to setup webhook",
      },
      { status: 500 },
    )
  }
}
