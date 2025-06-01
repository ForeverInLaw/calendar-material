"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Plus, Settings, LogOut, User, Calendar } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { useAuth } from "./auth-provider"

interface MobileHeaderProps {
  onCreateEvent: () => void
  onOpenSettings: () => void
  onOpenAuth: () => void
}

export function MobileHeader({ onCreateEvent, onOpenSettings, onOpenAuth }: MobileHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsMenuOpen(false)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 pt-6 bg-background border-b border-border md:hidden safe-area-inset">
      {/* Left side - Menu */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 hover:bg-muted/50 active:scale-95 transition-all duration-200"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 sm:w-72">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar Menu
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 mt-6">
            {user ? (
              <>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Signed in</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="justify-start gap-3 h-12 text-base"
                  onClick={() => {
                    onCreateEvent()
                    setIsMenuOpen(false)
                  }}
                >
                  <Plus className="h-5 w-5" />
                  New Event
                </Button>

                <Button
                  variant="outline"
                  className="justify-start gap-3 h-12 text-base"
                  onClick={() => {
                    onOpenSettings()
                    setIsMenuOpen(false)
                  }}
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Button>

                <Button variant="outline" className="justify-start gap-3 h-12 text-base" onClick={handleSignOut}>
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-12 text-base"
                  onClick={() => {
                    onOpenAuth()
                    setIsMenuOpen(false)
                  }}
                >
                  <User className="h-5 w-5" />
                  Sign In
                </Button>

                <Button
                  variant="outline"
                  className="justify-start gap-3 h-12 text-base"
                  onClick={() => {
                    onCreateEvent()
                    setIsMenuOpen(false)
                  }}
                >
                  <Plus className="h-5 w-5" />
                  New Event
                </Button>
              </>
            )}

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Center - App Title */}
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        <span className="hidden xs:inline">Calendar</span>
      </h1>

      {/* Right side - Quick Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCreateEvent}
          className="h-10 w-10 hover:bg-muted/50 active:scale-95 transition-all duration-200"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
