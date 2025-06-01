"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, ExternalLink, Copy, Bot, MessageCircle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function SetupGuide() {
  const [botInfo, setBotInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchBotInfo()
  }, [])

  const fetchBotInfo = async () => {
    try {
      const response = await fetch("/api/telegram/bot-info")
      const data = await response.json()
      if (data.success) {
        setBotInfo(data.bot)
      }
    } catch (error) {
      console.error("Failed to fetch bot info:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Bot username copied to clipboard.",
    })
  }

  const openBot = () => {
    if (botInfo?.username) {
      window.open(`https://t.me/${botInfo.username}`, "_blank")
    }
  }

  const setupWebhook = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/telegram/setup-webhook", { method: "POST" })
      const data = await response.json()

      if (data.success) {
        toast({
          title: "Webhook setup successful",
          description: "Your bot is now configured to respond to commands.",
        })
      } else {
        throw new Error(data.error || "Failed to setup webhook")
      }
    } catch (error) {
      toast({
        title: "Webhook setup failed",
        description: error.message || "Could not configure the bot webhook.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {botInfo && (
        <Alert>
          <Bot className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              🤖 Bot ready: <strong>@{botInfo.username}</strong>
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(botInfo.username)} className="h-6 px-2">
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={openBot} className="h-6 px-2">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Quick Setup Guide
          </CardTitle>
          <CardDescription>Get Telegram notifications in 3 easy steps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <p className="font-medium">Если команда /start не работает:</p>
              <p className="text-sm mt-1">Нажмите кнопку "Setup Webhook" ниже, чтобы настроить бота на ответы.</p>
              <Button size="sm" variant="outline" className="mt-2 w-full" onClick={setupWebhook} disabled={isLoading}>
                {isLoading ? "Setting up..." : "Setup Webhook"}
              </Button>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Start the bot</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Click the button below to open the bot and send /start
                </p>
                {botInfo && (
                  <Button size="sm" onClick={openBot} className="w-full">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Open @{botInfo.username}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Get your Chat ID</h4>
                <p className="text-sm text-muted-foreground">
                  The bot will automatically send you your Chat ID when you send /start
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Configure notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Copy your Chat ID and paste it in the Telegram settings above
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>You'll receive notifications for new events and reminders</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
