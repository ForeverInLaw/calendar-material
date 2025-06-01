import { TelegramSettings } from "@/components/telegram-settings"

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your notification preferences</p>
      </div>

      <TelegramSettings />
    </div>
  )
}
