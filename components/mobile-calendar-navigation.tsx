"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

interface MobileCalendarNavigationProps {
  currentDate: Date
  onDateChange: (date: Date) => void
}

export function MobileCalendarNavigation({ currentDate, onDateChange }: MobileCalendarNavigationProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationDirection, setAnimationDirection] = useState<"left" | "right">("right")

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const fullMonthNames = [
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

  return (
    <div className="flex items-center justify-between p-3 py-4 bg-background border-b border-border md:hidden">
      {/* Previous month button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigateMonth("prev")}
        disabled={isAnimating}
        className="h-9 w-9 hover:bg-muted/50 active:scale-95 transition-all duration-200"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {/* Month/Year display and Today button */}
      <div className="flex items-center gap-3 flex-1 justify-center">
        <div className="relative overflow-hidden">
          <h2
            className={`font-semibold transition-transform duration-300 ease-out ${
              isAnimating
                ? animationDirection === "right"
                  ? "-translate-x-full opacity-0"
                  : "translate-x-full opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            {/* Show full month name on larger mobile screens */}
            <span className="hidden xs:inline text-lg">
              {fullMonthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            {/* Show abbreviated month name on very small screens */}
            <span className="xs:hidden text-base">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
          </h2>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          disabled={isAnimating}
          className="text-xs px-3 h-7 hover:bg-muted/50 active:scale-95 transition-all duration-200"
        >
          <Calendar className="h-3 w-3 mr-1" />
          Today
        </Button>
      </div>

      {/* Next month button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigateMonth("next")}
        disabled={isAnimating}
        className="h-9 w-9 hover:bg-muted/50 active:scale-95 transition-all duration-200"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}
