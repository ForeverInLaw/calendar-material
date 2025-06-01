"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageCircle, CheckCircle, AlertCircle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SetupGuide } from "./setup-guide"

export function TelegramSettings() {
  const [settings, setSettings] = useState({
    chatId: "",
    enableReminders: true,
    enableCreationConfirmations: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle")
  const { toast } = useToast()


  useEffect(() => {
    // Загружаем сохраненные настройки
    const savedSettings = localStorage.getItem("telegram-settings")
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      localStorage.setItem("telegram-settings", JSON.stringify(settings))
      toast({
        title: "Settings saved",
        description: "Your Telegram notification preferences have been updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testNotification = async () => {
    if (!settings.chatId) {
      toast({
        title: "Chat ID required",
        description: "Please enter your Telegram Chat ID first.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setTestStatus("idle")

    try {
      const response = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: settings.chatId }),
      })

      if (response.ok) {
        setTestStatus("success")
        toast({
          title: "Test message sent! 🎉",
          description: "Check your Telegram for the test message.",
        })
      } else {
        throw new Error("Failed to send test message")
      }
    } catch (error) {
      setTestStatus("error")
      toast({
        title: "Error",
        description: "Failed to send test message. Please check your Chat ID.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getChatId = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/telegram/get-chat-id")
      const data = await response.json()

      if (data.success) {
        // Открываем ссылку на бота с параметром start
        window.open(`https://t.me/${data.botUsername}?start=${data.token}`, "_blank")

        toast({
          title: "Opening Telegram bot",
          description: "Please send the /start command to the bot.",
        })
      } else {
        throw new Error("Failed to generate start link")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open Telegram bot. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <SetupGuide />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Telegram Settings
          </CardTitle>
          <CardDescription>Configure your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-2">Если команда /start не работает, используйте этот метод:</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm">
                <li>Откройте @userinfobot в Telegram</li>
                <li>Отправьте любое сообщение</li>
                <li>Бот пришлет ваш Chat ID</li>
                <li>Скопируйте и вставьте его ниже</li>
              </ol>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => window.open("https://t.me/userinfobot", "_blank")}
              >
                Открыть @userinfobot
              </Button>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="chatId">Telegram Chat ID</Label>
            <Input
              id="chatId"
              value={settings.chatId}
              onChange={(e) => setSettings((prev) => ({ ...prev, chatId: e.target.value }))}
              placeholder="Your Chat ID (e.g., 123456789)"
              className="font-mono"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Введите ваш Chat ID из Telegram</p>
              <Button variant="ghost" size="sm" onClick={getChatId} className="text-xs h-7">
                Получить Chat ID
              </Button>
            </div>
          </div>

          {testStatus === "success" && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                ✅ Test message sent successfully! Your Telegram notifications are working.
              </AlertDescription>
            </Alert>
          )}

          {testStatus === "error" && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-950">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                ❌ Failed to send test message. Please check your Chat ID and try again.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Event Reminders</Label>
              <p className="text-sm text-muted-foreground">Receive reminders before events start</p>
            </div>
            <Switch
              checked={settings.enableReminders}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enableReminders: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Creation Confirmations</Label>
              <p className="text-sm text-muted-foreground">Get notified when events are created</p>
            </div>
            <Switch
              checked={settings.enableCreationConfirmations}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enableCreationConfirmations: checked }))}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={isLoading} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
            <Button
              variant="outline"
              onClick={testNotification}
              disabled={isLoading || !settings.chatId}
              className="flex-1"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {isLoading ? "Sending..." : "Test"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
