"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Settings, User, LogOut } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { useAuth } from "./auth-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DesktopHeaderProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  onCreateEvent: () => void
  onOpenSettings: () => void
  onOpenAuth: () => void
}

export function DesktopHeader({
  currentDate,
  onDateChange,
  onCreateEvent,
  onOpenSettings,
  onOpenAuth,
}: DesktopHeaderProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationDirection, setAnimationDirection] = useState<"left" | "right">("right")
  const { user, signOut } = useAuth()

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const navigateMonth = (direction: "prev" | "next") => {
    if (isAnimating) return

    setIsAnimating(true)
    setAnimationDirection(direction === "prev" ? "left" : "right")

    const newDate = new Date(currentDate)
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }

    setTimeout(() => {
      onDateChange(newDate)
      setTimeout(() => setIsAnimating(false), 50)
    }, 150)
  }

  const goToToday = () => {
    if (isAnimating) return
    onDateChange(new Date())
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <div className="hidden md:flex items-center justify-between mb-8 px-6 pt-8 pb-4">
      <div className="flex items-center gap-4">
        <div className="relative overflow-hidden">
          <h1
            className={`text-2xl lg:text-3xl font-bold text-foreground transition-transform duration-300 ease-out ${
              isAnimating
                ? animationDirection === "right"
                  ? "-translate-x-full opacity-0"
                  : "translate-x-full opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth("prev")}
            disabled={isAnimating}
            className="h-9 w-9 hover:scale-105 transition-transform duration-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth("next")}
            disabled={isAnimating}
            className="h-9 w-9 hover:scale-105 transition-transform duration-200"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          onClick={goToToday}
          disabled={isAnimating}
          className="text-sm px-4 hover:scale-105 transition-transform duration-200"
        >
          Today
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden lg:inline">{user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onOpenSettings}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" onClick={onOpenAuth}>
            <User className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        )}

        <Button
          className="bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-200 shadow-lg"
          onClick={onCreateEvent}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>
    </div>
  )
}
