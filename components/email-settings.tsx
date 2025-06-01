"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Mail, Bell, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function EmailSettings() {
  const [settings, setSettings] = useState({
    email: "",
    enableReminders: true,
    enableCreationConfirmations: true,
    defaultReminderTime: 15,
  })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Сохраняем настройки в localStorage (в реальном приложении - в БД)
      localStorage.setItem("email-settings", JSON.stringify(settings))

      toast({
        title: "Settings saved",
        description: "Your email notification preferences have been updated.",
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

  const testEmail = async () => {
    if (!settings.email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Отправляем тестовое письмо
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: settings.email }),
      })

      if (response.ok) {
        toast({
          title: "Test email sent",
          description: "Check your inbox for the test email.",
        })
      } else {
        throw new Error("Failed to send test email")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test email. Please check your email address.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>Configure your email notification preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={settings.email}
            onChange={(e) => setSettings((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="your@email.com"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Event Reminders</Label>
            <p className="text-sm text-muted-foreground">Receive reminders before events</p>
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

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isLoading} className="flex-1">
            <CheckCircle className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
          <Button variant="outline" onClick={testEmail} disabled={isLoading || !settings.email}>
            <Bell className="h-4 w-4 mr-2" />
            Test
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
