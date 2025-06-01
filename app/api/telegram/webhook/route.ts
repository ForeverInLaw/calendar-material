import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()
    console.log("Received Telegram update:", JSON.stringify(update))

    // Обрабатываем входящие сообщения от Telegram
    if (update.message) {
      const chatId = update.message.chat.id
      const text = update.message.text
      const firstName = update.message.from.first_name

      console.log(`Received message from ${firstName} (${chatId}): ${text}`)

      // Отвечаем на команду /start
      if (text === "/start" || text?.startsWith("/start")) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        const welcomeMessage = `
👋 Hello ${firstName}!

Welcome to Calendar App Bot! 

🆔 Your Chat ID: <code>${chatId}</code>

📋 <b>How to use:</b>
1. Copy your Chat ID above
2. Go to the Calendar App settings
3. Paste your Chat ID in Telegram settings
4. Enable notifications

You'll receive notifications about:
• ✅ New events created
• 🔔 Event reminders

Type /help for more information.
        `.trim()

        // Отправляем ответ
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeMessage,
            parse_mode: "HTML",
          }),
        })

        console.log("Sent welcome message, response status:", response.status)
        if (!response.ok) {
          const errorText = await response.text()
          console.error("Failed to send welcome message:", errorText)
        }
      }

      // Отвечаем на команду /help
      if (text === "/help") {
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        const helpMessage = `
📚 <b>Calendar App Bot Help</b>

🆔 <b>Your Chat ID:</b> <code>${chatId}</code>

📋 <b>Available Commands:</b>
/start - Get your Chat ID and setup instructions
/help - Show this help message
/id - Get your Chat ID

🔔 <b>Notifications:</b>
This bot will send you notifications about your calendar events when properly configured in the Calendar App.

⚙️ <b>Setup:</b>
1. Copy your Chat ID
2. Open Calendar App settings
3. Enter your Chat ID in Telegram settings
4. Test the connection

Need help? Contact support in the Calendar App.
        `.trim()

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: helpMessage,
            parse_mode: "HTML",
          }),
        })
      }

      // Отвечаем на команду /id
      if (text === "/id") {
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        const idMessage = `🆔 Your Chat ID: <code>${chatId}</code>`

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: idMessage,
            parse_mode: "HTML",
          }),
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}
